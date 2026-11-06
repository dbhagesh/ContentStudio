"""Built-in procedural music beds. script.json ``"music"``: a track name, ``"none"``, or a path to your own file.

Each track takes (Dsp, n samples, duration seconds) and returns n mono samples normalised to [-1, 1].
"""
import numpy as np

from .registry import track


@track('bed')
def bed(a, n, dur):
    """soft pad + plucked arpeggio, 100 BPM, I-vi-IV-V (the default)"""
    s = a.sr; bpm = 100; beat = 60 / bpm; bar = beat * 4
    chords = [[261.6, 329.6, 392.0], [220.0, 261.6, 329.6], [174.6, 220.0, 261.6], [196.0, 246.9, 293.7]]
    x = np.zeros(n)
    for b in range(int(np.ceil(dur / bar)) + 1):
        ch = chords[b % 4]; st = int(b * bar * s); bn = int(bar * s)
        if st >= n: break
        t = a.tt(bar); e = np.minimum(1, t / 0.4) * np.minimum(1, (bar - t) / 0.4)
        pad = sum(np.sin(2 * np.pi * f / 2 * t) + 0.25 * np.sin(2 * np.pi * f * t) for f in ch) * e * 0.10
        x[st:st + bn] += pad[:max(0, min(bn, n - st))]
        for k in range(8):                                                       # eighth-note pluck arpeggio
            f = ch[[0, 1, 2, 1, 2, 0, 1, 2][k]] * (2 if k % 4 == 2 else 1); ps = st + int(k * beat / 2 * s); pn = int(0.5 * s)
            if ps + pn >= n: continue
            pt = a.tt(0.5); pl = (np.sin(2 * np.pi * f * pt) + 0.35 * np.sin(4 * np.pi * f * pt)) * a.env(pn, 0.003, 7) * 0.12
            x[ps:ps + pn] += pl
    x = a.lp(x, 3200)
    fade = np.ones(n); fo = int(1.2 * s); fade[-fo:] = np.linspace(1, 0, fo)
    return x / (np.abs(x).max() + 1e-9) * fade


@track('tension')
def tension(a, n, dur):
    """low drone + slow minor pulse, for mysterious / tense stories"""
    s = a.sr; t = np.arange(n) / s; x = np.zeros(n)
    for f, g in [(55, 0.5), (82.4, 0.3), (110, 0.2), (130.8, 0.12)]: x += np.sin(2 * np.pi * f * t + np.sin(t * 0.3) * 0.5) * g
    x *= 0.55 + 0.45 * np.sin(2 * np.pi * t / 8) ** 2
    beat = 60 / 84
    ping = lambda f: (np.sin(2 * np.pi * f * a.tt(1.2)) + 0.3 * np.sin(4 * np.pi * f * a.tt(1.2))) * a.env(int(1.2 * s), 0.01, 5)
    seq = [220.0, 261.6, 196.0, 174.6]
    for k in range(int(dur / (beat * 2))):
        i = int(k * beat * 2 * s); pg = ping(seq[(k // 2) % 4]) * 0.35
        if i + len(pg) < n: x[i:i + len(pg)] += pg
    x = a.lp(x, 2200); fade = np.ones(n); fo = int(1.5 * s); fade[-fo:] = np.linspace(1, 0, fo); fi = int(0.8 * s); fade[:fi] *= np.linspace(0, 1, fi)
    return x / (np.abs(x).max() + 1e-9) * fade


@track('bounce')
def bounce(a, n, dur):
    """light comedy: oom-pah bass + staccato plucked melody, 118 BPM, major"""
    s = a.sr; bpm = 118; beat = 60 / bpm; x = np.zeros(n)
    prog = [(130.8, [261.6, 329.6, 392.0]), (174.6, [261.6, 349.2, 440.0]), (196.0, [246.9, 293.7, 392.0]), (130.8, [261.6, 329.6, 392.0])]
    mel = [0, 2, 1, 2, 0, 1, 2, 1]
    pl = lambda f, d, g: (np.sin(2 * np.pi * f * a.tt(d)) + 0.4 * np.sin(4 * np.pi * f * a.tt(d)) + 0.15 * np.sin(6 * np.pi * f * a.tt(d))) * a.env(int(d * s), 0.003, 9) * g
    for k in range(int(dur / beat) + 1):
        bass, ch = prog[(k // 8) % 4]; i = int(k * beat * s)
        b = pl(bass if k % 2 == 0 else bass * 1.5, 0.3, 0.35) if k % 2 == 0 else pl(ch[0] / 2 * 1.5, 0.22, 0.18)
        if i + len(b) < n: x[i:i + len(b)] += b
        if k % 2 == 1:
            c = sum(pl(f, 0.16, 0.07) for f in ch)
            if i + len(c) < n: x[i:i + len(c)] += c
        f = ch[mel[k % 8]] * 2; m = pl(f, 0.18, 0.09); j = i + int(beat / 2 * s) if k % 4 == 3 else i
        if j + len(m) < n and k % 8 not in (3, 7): x[j:j + len(m)] += m
    x = a.lp(x, 4200); fade = np.ones(n); fo = int(1.2 * s); fade[-fo:] = np.linspace(1, 0, fo)
    return x / (np.abs(x).max() + 1e-9) * fade
