"""How It Ticks: the channel's own sounds (every video of the channel gets them).

  click     a small metal click: a pin dropping into place, a tooth engaging, a latch (soft, short)
  clunk     a heavy metal stop: something jammed, a bolt hitting its end
  ratchet   a run of fine clicks (d = length): a key sliding over pins, a freewheel, a winding crown
  workshop  music: a curious, light mallet pattern over a soft pad with a quiet clock tick on every beat
"""
import numpy as np
from studio_audio.mix import effect, track


@effect('click', level=-19)
def click(a, **_):
    t = a.tt(0.07)
    ping = (np.sin(2 * np.pi * 2350 * t) + 0.5 * np.sin(2 * np.pi * 3470 * t)) * a.env(len(t), 0.0005, 70)
    tick = a.bp(a.noise(0.07), 1200, 4200) * a.env(len(t), 0.0003, 160)
    return (ping * 0.35 + tick / (np.abs(tick).max() + 1e-9) * 0.5) * 0.8


@effect('clunk', level=-15)
def clunk(a, **_):
    t = a.tt(0.35)
    body = (np.sin(2 * np.pi * 140 * t) + 0.6 * np.sin(2 * np.pi * 311 * t) + 0.25 * np.sin(2 * np.pi * 873 * t)) * a.env(len(t), 0.001, 16)
    hit = a.lp(a.noise(0.35), 1800) * a.env(len(t), 0.0005, 60)
    return body * 0.5 + hit / (np.abs(hit).max() + 1e-9) * 0.35


@effect('ratchet', level=-21)
def ratchet(a, d=0.8, rate=11.0, **_):
    s = a.sr; n = int(d * s); x = np.zeros(n); one = click(a)
    k = 0
    while True:
        st = int(k / rate * s)
        if st >= n: break
        m = min(len(one), n - st); x[st:st + m] += one[:m] * (0.7 + 0.3 * ((k * 7) % 5) / 4); k += 1
    return x


@track('workshop')
def workshop(a, n, dur):
    """curious mallet pattern + soft pad + a quiet clock tick on every beat, 96 BPM (Dm9 - Bbmaj7 - F - C)"""
    s = a.sr; bpm = 96; beat = 60 / bpm; bar = beat * 4
    chords = [[146.8, 174.6, 220.0, 261.6, 329.6], [116.5, 146.8, 174.6, 220.0, 293.7], [174.6, 220.0, 261.6, 349.2, 392.0], [130.8, 164.8, 196.0, 246.9, 293.7]]
    x = np.zeros(n)
    pattern = [0, 2, 4, 3, 1, 4, 2, 3]
    for b in range(int(np.ceil(dur / bar)) + 1):
        ch = chords[b % 4]; st = int(b * bar * s); bn = int(bar * s)
        if st >= n: break
        t = a.tt(bar); e = np.minimum(1, t / 0.6) * np.minimum(1, (bar - t) / 0.6)
        pad = sum(np.sin(2 * np.pi * f * t) * (0.6 if i else 1.0) for i, f in enumerate(ch[:3])) * e * 0.07
        bass = np.sin(2 * np.pi * ch[0] / 2 * t) * np.minimum(1, t / 0.02) * np.exp(-t * 1.2) * 0.22
        seg = (pad + bass)[:max(0, min(bn, n - st))]; x[st:st + len(seg)] += seg
        for k in range(8):                                                   # eighth-note mallet (marimba-like)
            f = ch[pattern[k]] * 2; ps = st + int(k * beat / 2 * s); pn = int(0.45 * s)
            if ps + pn >= n: continue
            pt = a.tt(0.45); m = (np.sin(2 * np.pi * f * pt) + 0.18 * np.sin(2 * np.pi * f * 3.9 * pt) * np.exp(-pt * 30)) * a.env(pn, 0.002, 9)
            x[ps:ps + pn] += m * (0.1 if k % 2 else 0.13)
        for k in range(4):                                                   # the clock tick
            ps = st + int(k * beat * s); tn = int(0.03 * s)
            if ps + tn >= n: continue
            tt = a.tt(0.03); tk = np.sin(2 * np.pi * (2100 if k % 2 else 1700) * tt) * np.exp(-tt * 260)
            x[ps:ps + tn] += tk * 0.05
    x = a.lp(x, 4200)
    fade = np.ones(n); fo = int(1.2 * s); fade[-fo:] = np.linspace(1, 0, fo)
    return x / (np.abs(x).max() + 1e-9) * fade
