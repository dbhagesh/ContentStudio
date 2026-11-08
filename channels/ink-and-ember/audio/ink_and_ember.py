"""Ink & Ember: the channel's own music and sound effects (procedural, original, soft-edged).

music:   "ember"  taiko-style pulse + low drone + a minor koto-like pluck motif, builds in the last third
effects: fwoom (an Ember ignites) · shing (a brush-blade is drawn) · impact (a hit / panel break) · whistle (the
         Inkguard's whistle) · rumble (dread, the Hush) · heartbeat2 (a single heavy beat) · riser (tension before a reveal)
         · ink (a wet brush stroke) · crack (a panel cracks)
All are rounded (low-passed, nothing harsh above ~5 kHz) and normalised by the mixer.
"""
import numpy as np

from studio_audio.mix import effect, track


def _fade(x, sr, a=0.01, r=0.05):
    n = len(x); e = np.ones(n); na, nr = max(1, int(a * sr)), max(1, int(r * sr))
    e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr); return x * e


@track('ember')
def ember(a, n, dur):
    """low drone (D minor), taiko pulse at 92 BPM, koto-ish pluck motif; the drums thicken in the last third"""
    s = a.sr; t = np.arange(n) / s; x = np.zeros(n)
    for f, g in [(36.7, 0.5), (73.4, 0.32), (110.0, 0.16), (146.8, 0.06)]:
        x += np.sin(2 * np.pi * f * t + 0.6 * np.sin(t * 0.21)) * g
    x *= 0.5 + 0.2 * np.sin(2 * np.pi * t / 6.5) ** 2
    beat = 60 / 92
    def drum(g, f0=95, d=0.55):
        tt = a.tt(d); body = np.sin(2 * np.pi * np.cumsum(f0 * (0.55 + 0.45 * np.exp(-tt * 9))) / s) * np.exp(-tt * 7)
        thump = a.lp(a.noise(d), 260) * np.exp(-tt * 22) * 0.6
        return (body + thump) * g
    pattern = [1.0, 0, 0.45, 0, 0.8, 0, 0.45, 0.3]                       # per eighth note
    for k in range(int(dur / (beat / 2)) + 1):
        i = int(k * beat / 2 * s); g = pattern[k % 8]
        late = i / max(1, n) > 0.66
        if late and k % 8 in (3, 7): g = max(g, 0.35)
        if not g: continue
        d = drum(g * (1.15 if late else 1.0))
        if i + len(d) < n: x[i:i + len(d)] += d * 0.55
    # pluck motif (D minor pentatonic), every two bars
    motif = [293.7, 349.2, 392.0, 440.0, 349.2, 293.7]
    def pluck(f, d=0.9):
        tt = a.tt(d); return (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(4 * np.pi * f * tt) + 0.2 * np.sin(6 * np.pi * f * tt)) * np.exp(-tt * 5) * a.env(len(tt), 0.002, 1)
    bar = beat * 4
    for b in range(int(dur / (bar * 2)) + 1):
        for j, f in enumerate(motif):
            i = int((b * bar * 2 + j * beat * 0.75 + bar) * s); p = pluck(f) * 0.16
            if i + len(p) < n: x[i:i + len(p)] += p
    x = a.lp(x, 3000)
    fade = np.ones(n); fo = int(1.4 * s); fade[-fo:] = np.linspace(1, 0, fo); fi = int(0.5 * s); fade[:fi] *= np.linspace(0, 1, fi)
    return x / (np.abs(x).max() + 1e-9) * fade


@effect('fwoom', level=-9)
def fwoom(a, d=1.1, **_):
    """an Ember igniting: a rushing roar that swells and blooms, with a low body"""
    s = a.sr; nz = a.noise(d); k = np.linspace(0, 1, len(nz))
    env = np.minimum(1, k / 0.12) * np.exp(-np.maximum(0, k - 0.12) * 3.2)
    roar = (a.lp(nz, 900) * 0.8 + a.bp(nz, 900, 3000) * 0.35 * (1 - k)) * env
    body = np.sin(2 * np.pi * np.cumsum(60 + 70 * np.exp(-k * 4)) / s) * env * 0.9
    return _fade((roar / (np.abs(roar).max() + 1e-9)) * 0.8 + body * 0.6, s)


@effect('shing', level=-15)
def shing(a, d=0.7, **_):
    """a brush-blade drawn: a bright scrape settling into a soft ring (low-passed to stay gentle)"""
    s = a.sr; tt = a.tt(d)
    scrape = a.bp(a.noise(0.18), 1800, 4200) * np.linspace(1, 0, int(0.18 * s)) ** 2
    ring = sum(np.sin(2 * np.pi * f * tt) * g for f, g in [(1318, 0.5), (1975, 0.25), (2637, 0.12)]) * np.exp(-tt * 5)
    x = ring * 0.5; x[:len(scrape)] += scrape / (np.abs(scrape).max() + 1e-9) * 0.6
    return _fade(a.lp(x, 4800), s)


@effect('impact', level=-9)
def impact(a, **_):
    """a heavy manga hit: low boom + short crunch"""
    s = a.sr; tt = a.tt(0.7)
    boom = np.sin(2 * np.pi * np.cumsum(48 + 90 * np.exp(-tt * 14)) / s) * np.exp(-tt * 5)
    crunch = a.lp(a.noise(0.7), 1600) * np.exp(-tt * 18)
    return _fade(boom * 0.9 + crunch * 0.5, s, 0.002)


@effect('whistle', level=-17)
def whistle(a, d=1.1, **_):
    """the Inkguard whistle: a breathy two-tone trill, softened"""
    s = a.sr; tt = a.tt(d); f = 1250 + 90 * np.sign(np.sin(2 * np.pi * 22 * tt))
    tone_ = np.sin(2 * np.pi * np.cumsum(f) / s) * 0.6 + a.bp(a.noise(d), 1100, 2600) * 0.25
    env = np.minimum(1, tt / 0.04) * np.minimum(1, (d - tt) / 0.25)
    return a.lp(tone_ * env, 4200)


@effect('rumble', level=-14)
def rumble(a, d=2.0, **_):
    """dread: a low rolling rumble"""
    s = a.sr; nz = a.lp(a.noise(d), 140); k = np.linspace(0, 1, len(nz)); e = np.sin(np.pi * k) ** 0.7
    return _fade(nz / (np.abs(nz).max() + 1e-9) * e + np.sin(2 * np.pi * 41 * a.tt(d)) * e * 0.4, s)


@effect('heartbeat2', level=-11)
def heartbeat2(a, **_):
    """one heavy heartbeat (lub-dub)"""
    s = a.sr
    def thump(f, d, g): tt = a.tt(d); return np.sin(2 * np.pi * f * tt) * np.exp(-tt * 18) * g
    x = np.zeros(int(0.6 * s)); l = thump(55, 0.25, 1.0); x[:len(l)] += l; j = int(0.2 * s); d2 = thump(48, 0.25, 0.7); x[j:j + len(d2)] += d2
    return a.lp(x, 400)


@effect('riser', level=-17)
def riser(a, d=1.2, **_):
    """tension before a reveal: filtered noise + a rising tone"""
    s = a.sr; k = np.linspace(0, 1, int(d * s))
    nz = a.bp(a.noise(d), 300, 2400) * k ** 2
    tone_ = a.sweep(110, 440, d) * k ** 2 * 0.4
    return _fade(nz / (np.abs(nz).max() + 1e-9) * 0.6 + tone_, s, 0.02, 0.02)


@effect('ink', level=-18)
def ink(a, d=0.5, **_):
    """a wet brush stroke"""
    s = a.sr; nz = a.lp(a.noise(d), 1400); k = np.linspace(0, 1, len(nz)); e = np.sin(np.pi * k) ** 1.5
    return _fade(nz * e * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * k)), s)


@effect('crack', level=-13)
def crack(a, **_):
    """a panel cracking: a dry splintering snap, rounded"""
    s = a.sr; x = np.zeros(int(0.35 * s))
    for j, g in [(0, 1.0), (0.03, 0.6), (0.07, 0.45), (0.12, 0.3)]:
        i = int(j * s); c = a.bp(a.noise(0.06), 600, 3200) * np.exp(-np.linspace(0, 8, int(0.06 * s))) * g; x[i:i + len(c)] += c
    return _fade(a.lp(x, 4000), s, 0.001)
