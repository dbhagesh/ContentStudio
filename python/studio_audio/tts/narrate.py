"""Build the narration track from script.json with any TTS provider.

One script line = one CUT, not one sentence: a sentence can run across several lines. Lines are grouped into whole
sentences and each sentence is spoken in ONE pass so the intonation flows; then every cut inside a sentence is found
in the audio (snapped to the nearest pause, else placed by length). ``"gap"`` on a sentence's last line = the pause
after it; ``"break": true`` forces a sentence to close.

Outputs data/narration.wav (16-bit, provider rate) and data/lines.json (exact line times).
"""
import re
from pathlib import Path

import numpy as np
from scipy.io import wavfile

from ..project import data_dir, load_script, write_json
from .registry import DEFAULT, get_provider


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
    """Group line indexes into sentences: a line ending in . ? ! (optionally quoted) or with "break" closes one."""
    groups, cur = [], []
    for i, ln in enumerate(lines):
        cur.append(i)
        if re.search(r'[.?!]["\')]*$', ln['text'].strip()) or ln.get('break') or i == len(lines) - 1:
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


def build_narration(script: dict, provider, voice=None, speed=None, log=print):
    """Pure-ish core: returns (samples float64 normalised to 0.9 peak, sr, lines_doc)."""
    voice = voice or script.get('voice', provider.default_voice)
    speed = speed or script.get('speed', 1.0)
    SL = script['lines']
    sr_box = {}

    def say(text):
        x, sr = provider.synthesize(text, voice, speed)
        sr_box['sr'] = sr
        return trim(np.asarray(x, dtype=np.float64), sr)

    groups = sentence_groups(SL)
    first = say(' '.join(SL[i]['text'] for i in groups[0]))   # learn the sample rate before laying out the lead
    sr = sr_box['sr']
    out = [np.zeros(int(script.get('lead', 0.4) * sr))]; t = len(out[0]) / sr; lines = [None] * len(SL)
    for gi, g in enumerate(groups):
        x = first if gi == 0 else say(' '.join(SL[i]['text'] for i in g))
        lens = [len(say(SL[i]['text'])) for i in g] if len(g) > 1 else [len(x)]
        cuts = find_cuts(x, sr, lens)
        n = len(x) / sr
        for j, i in enumerate(g):
            a = 0.0 if j == 0 else cuts[j][1]; b = n if j == len(g) - 1 else cuts[j + 1][0]
            lines[i] = {'i': i, 'text': SL[i]['text'], 'start': round(t + a, 3), 'end': round(t + b, 3)}
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
    y, sr, doc = build_narration(script, provider, voice, speed, log=lambda s: print(s, flush=True))
    d = data_dir(P)
    wavfile.write(d / 'narration.wav', sr, (y * 32767).astype(np.int16))
    write_json(d / 'lines.json', doc)
    print(f"data/narration.wav ({doc['duration']:.2f} s, {doc['voice']} x{doc['speed']}) + data/lines.json. Next: words")
