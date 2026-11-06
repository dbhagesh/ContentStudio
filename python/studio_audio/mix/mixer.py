"""The soundtrack: narration + procedural sound effects + a music bed -> data/mix.wav (48 kHz stereo, 16-bit).

Reads data/cues.json (written by the renderer: ``{duration, cues: [{t, type, gain?, dur?, pan?}]}``), data/narration.wav
if present, and script.json ``"music"``: a registered track (``bed`` default, ``tension``, ``bounce``, plugins),
``"none"``, or a path to your own royalty-free file relative to the project. The music ducks under the voice.
"""
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile

from . import effects as _effects, music as _music   # noqa: F401  (register the built-ins)
from .dsp import SR, Dsp, db
from .plugins import load_plugins
from .registry import EFFECTS, TRACKS

VOICE_DB = -19
MUSIC_DB_WITH_VOICE, MUSIC_DB_ALONE = -24, -20
FX_LOWPASS = 5000
PEAK_DB = -1


def load_audio(f, sr=SR):
    """Any file ffmpeg reads -> float64 (n, 2) at ``sr``."""
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(f), '-f', 'f32le', '-ac', '2', '-ar', str(sr), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def render_music(a: Dsp, name: str, n: int, dur: float, project: Path):
    if name in TRACKS:
        return TRACKS[name](a, n, dur)
    f = project / name
    if not f.exists():
        raise SystemExit(f"music '{name}' is neither a track ({', '.join(sorted(TRACKS))}) nor a file in the project")
    raw = load_audio(f, a.sr)[:n]; m = np.zeros(n); m[:len(raw)] = raw.mean(1)
    return m / (np.abs(m).max() + 1e-9)


def mix(cues_doc: dict, music: str, voice=None, project: Path = Path('.'), sr: int = SR, log=print):
    """Pure core: returns (n, 2) float mix. ``voice`` is (n', 2) float audio at ``sr`` or None."""
    a = Dsp(sr)
    dur = float(cues_doc['duration']); n = int(dur * sr) + sr // 10
    out = np.zeros((n, 2))
    v = None
    if voice is not None:
        v = np.zeros((n, 2)); vv = voice[:n]; v[:len(vv)] = vv
        v *= db(VOICE_DB) / np.sqrt(np.mean(v ** 2) + 1e-12)
        out += v
    if music and music != 'none':
        m = render_music(a, music, n, dur, project)
        m = np.stack([m, m], 1) * db(MUSIC_DB_WITH_VOICE if v is not None else MUSIC_DB_ALONE)
        if v is not None:                                                        # duck under the voice
            lev = np.abs(v.mean(1)); lev = signal.lfilter([1 - 0.9995], [1, -0.9995], lev); lev /= lev.max() + 1e-9
            m *= (1 - 0.55 * np.clip(lev * 3, 0, 1))[:, None]
        out += m
    for c in cues_doc['cues']:
        fx = EFFECTS.get(c['type'])
        if not fx:
            log(f"unknown cue type, skipped: {c['type']}"); continue
        x = fx.fn(a, **({'d': c['dur']} if c.get('dur') else {}))
        x = a.lp(x, FX_LOWPASS) * db(fx.level) * c.get('gain', 1.0) / (np.abs(x).max() + 1e-9) * 0.9
        i = int(c['t'] * sr); k = min(len(x), n - i)
        if k > 0 and i >= 0:
            pan = c.get('pan', 0.0)
            out[i:i + k, 0] += x[:k] * (1 - max(0, pan)); out[i:i + k, 1] += x[:k] * (1 + min(0, pan))
    out = np.tanh(out * 1.2) / 1.2                                                # master: gentle soft-clip
    return out * db(PEAK_DB) / (np.abs(out).max() + 1e-9)


def run(project) -> None:
    P = Path(project)
    load_plugins()
    cues_f = P / 'data/cues.json'
    if not cues_f.exists():
        raise SystemExit(f'missing {cues_f}: render the cues first')
    cues_doc = json.loads(cues_f.read_text())
    script = json.loads((P / 'script.json').read_text())
    vf = P / 'data/narration.wav'
    voice = load_audio(vf) if vf.exists() else None
    music = script.get('music', 'bed')
    y = mix(cues_doc, music, voice, P)
    wavfile.write(P / 'data/mix.wav', SR, (y * 32767).astype(np.int16))
    print(f"data/mix.wav: {float(cues_doc['duration']):.2f} s · voice: {'yes' if voice is not None else 'NO (captions-only)'} · "
          f"music: {music} · {len(cues_doc['cues'])} cues")
