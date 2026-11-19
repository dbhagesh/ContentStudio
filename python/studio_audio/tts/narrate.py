"""Build the narration track from script.json with any TTS provider.

One script line = one CUT, not one sentence: a sentence can run across several lines. Lines are grouped into whole
sentences and each sentence is spoken in ONE pass so the intonation flows; then every cut inside a sentence is found
in the audio (snapped to the nearest pause, else placed by length). ``"gap"`` on a sentence's last line = the pause
after it; ``"break": true`` forces a sentence to close.

Several voices: a line's ``"speaker"`` picks a voice from ``speakers`` ({id: {"tts", "voice", "speed", ...}}, built by
the studio from the cast's character voices, the channel and script.json, in data/voices.json). Lines without one use
the narrator (script "voice"/"speed"). ``pitch`` (semitones), ``lowcut`` and ``lowpass`` (Hz) shape any voice, per speaker too. A sentence never spans two speakers; other sample rates are resampled.

Outputs data/narration.wav (16-bit, provider rate) and data/lines.json (exact line times).
"""
import json
import re
from pathlib import Path

import numpy as np
from scipy.io import wavfile

from ..project import data_dir, load_script, write_json
from .registry import DEFAULT, get_provider
from scipy.signal import butter, resample_poly, sosfilt


def trim(x, sr, thr=0.008):
    """Cut leading/trailing silence so line start/end times are exact."""
    idx = np.where(np.abs(x) > thr)[0]
    if not len(idx): return x
    a = max(0, idx[0] - int(0.01 * sr)); b = min(len(x), idx[-1] + int(0.03 * sr))
    return x[a:b]


def silences(x, sr, thr=0.012, min_len=0.06):
    """Pauses inside speech: [(start_s, end_s)] where the 10 ms RMS stays under thr for >= min_len."""
    hop = int(0.01 * sr); n = len(x) // hop
    rms = np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1)); quiet = rms < thr * np.abs(x).max()
    out, st = [], None
    for f, q in enumerate(quiet):
        if q and st is None: st = f
        if (not q or f == n - 1) and st is not None:
            if (f - st) * 0.01 >= min_len: out.append((st * 0.01, f * 0.01))
            st = None
    return out


def sentence_groups(lines: list) -> list[list[int]]:
    """Group line indexes into sentences: a line ending in . ? ! (optionally quoted) or with "break" closes one,
    and so does a change of speaker."""
    groups, cur = [], []
    for i, ln in enumerate(lines):
        cur.append(i)
        nxt = lines[i + 1] if i + 1 < len(lines) else None
        if (re.search(r'[.?!]["\')]*$', ln['text'].strip()) or ln.get('break') or nxt is None
                or nxt.get('speaker') != ln.get('speaker')):
            groups.append(cur); cur = []
    return groups


def find_cuts(x, sr, lens):
    """Cut points inside one sentence's audio ``x`` given each line's solo length (samples).
    Returns [0.0, (a, b), ...]: per cut the pause it snaps to, or (c, c) placed by length."""
    cuts = [0.0]
    if len(lens) > 1:
        lens = np.asarray(lens, dtype=float)
        pauses = silences(x, sr)
        for c in np.cumsum(lens)[:-1] / lens.sum() * len(x) / sr:
            near = [p for p in pauses if abs((p[0] + p[1]) / 2 - c) < 0.4]
            if near:
                p = min(near, key=lambda p: abs((p[0] + p[1]) / 2 - c)); cuts.append((p[0], p[1]))
            else:
                cuts.append((c, c))
    return cuts


def build_narration(script: dict, provider, voice=None, speed=None, log=print, speakers=None, provider_for=None):
    """Pure-ish core: returns (samples float64 normalised to 0.9 peak, sr, lines_doc).
    ``provider`` speaks the narrator; ``provider_for(name, opts)`` makes the providers other speakers ask for."""
    voice = voice or script.get('voice', provider.default_voice)
    speed = speed or script.get('speed', 1.0)
    pitch = float(script.get('pitch', 0) or 0)
    tone = (float(script.get('lowcut', 0) or 0), float(script.get('lowpass', 0) or 0))
    SL = script['lines']
    speakers = speakers or {}
    cache = {}
    sr_box = {}

    def voice_of(i):
        """(provider, voice, speed, pitch in semitones, tone (lowcut Hz, lowpass Hz)) for line i"""
        sp = SL[i].get('speaker')
        if not sp or sp not in speakers:
            if sp: raise SystemExit(f'line {i + 1}: speaker "{sp}" has no voice (known: {", ".join(sorted(speakers)) or "none"})')
            return provider, voice, speed, pitch, tone
        spec = dict(speakers[sp]); tts = spec.pop('tts', DEFAULT)
        v = spec.pop('voice', None); s = spec.pop('speed', 1.0); st = float(spec.pop('pitch', 0) or 0); spec.pop('note', None)
        tn = (float(spec.pop('lowcut', 0) or 0), float(spec.pop('lowpass', 0) or 0))
        key = (tts, json.dumps(spec, sort_keys=True))
        if key not in cache: cache[key] = (provider_for or (lambda n, o: get_provider(n, **o)))(tts, spec)
        return cache[key], v or cache[key].default_voice, s, st, tn

    def say(text, i):
        p, v, s, st, (lo, hi) = voice_of(i)
        if st:
            # pitch up/down by `st` semitones at the same pace: speak slower/faster, then resample (pitch and tempo move together)
            k = 2 ** (st / 12)
            x, sr = p.synthesize(text, v, min(2.0, max(0.5, s / k)))
            r = 1000; x = resample_poly(np.asarray(x, dtype=np.float64), r, int(round(r * k)))
        else:
            x, sr = p.synthesize(text, v, s)
        x = np.asarray(x, dtype=np.float64)
        if lo: x = sosfilt(butter(2, lo, 'hp', fs=sr, output='sos'), x)    # thin out the bass (a softer, lighter voice)
        if hi: x = sosfilt(butter(2, hi, 'lp', fs=sr, output='sos'), x)    # take the edge off the highs
        x = trim(x, sr)
        target = sr_box.setdefault('sr', sr)
        if sr != target:
            g = np.gcd(int(sr), int(target)); x = resample_poly(x, target // g, sr // g)
        return x

    groups = sentence_groups(SL)
    first = say(' '.join(SL[i]['text'] for i in groups[0]), groups[0][0])   # learn the sample rate before laying out the lead
    sr = sr_box['sr']
    out = [np.zeros(int(script.get('lead', 0.4) * sr))]; t = len(out[0]) / sr; lines = [None] * len(SL)
    for gi, g in enumerate(groups):
        x = first if gi == 0 else say(' '.join(SL[i]['text'] for i in g), g[0])
        lens = [len(say(SL[i]['text'], i)) for i in g] if len(g) > 1 else [len(x)]
        cuts = find_cuts(x, sr, lens)
        n = len(x) / sr
        for j, i in enumerate(g):
            a = 0.0 if j == 0 else cuts[j][1]; b = n if j == len(g) - 1 else cuts[j + 1][0]
            lines[i] = {'i': i, 'text': SL[i]['text'], 'start': round(t + a, 3), 'end': round(t + b, 3)}
            if SL[i].get('speaker'): lines[i]['speaker'] = SL[i]['speaker']
            log(f'{i:2d} {lines[i]["start"]:6.2f}-{lines[i]["end"]:6.2f}  {SL[i]["text"]}')
        gap = np.zeros(int(float(SL[g[-1]].get('gap', script.get('gap', 0.3))) * sr))
        out += [x, gap]; t += (len(x) + len(gap)) / sr
    out.append(np.zeros(int(float(script.get('outro', 0.9)) * sr)))
    y = np.concatenate(out); y = y / (np.abs(y).max() + 1e-9) * 0.9
    doc = {'duration': round(len(y) / sr, 3), 'voice': voice, 'speed': speed, 'lines': lines}
    return y, sr, doc


def run(project, voice=None, speed=None, provider=None) -> None:
    P = Path(project)
    script = load_script(P)
    provider = provider or get_provider(script.get('tts', DEFAULT))
    vf = data_dir(P) / 'voices.json'
    speakers = {**(json.loads(vf.read_text()).get('speakers', {}) if vf.exists() else {}), **script.get('speakers', {})}
    y, sr, doc = build_narration(script, provider, voice, speed, log=lambda s: print(s, flush=True), speakers=speakers)
    d = data_dir(P)
    wavfile.write(d / 'narration.wav', sr, (y * 32767).astype(np.int16))
    write_json(d / 'lines.json', doc)
    print(f"data/narration.wav ({doc['duration']:.2f} s, {doc['voice']} x{doc['speed']}) + data/lines.json. Next: words")
