"""The built-in sound effects: soft and rounded, nothing above ~5 kHz, no ticks / hats / glitches / beeps.

Each takes a ``Dsp`` (``a``) and an optional duration ``d`` from the cue; the mixer normalises and sets the level.
"""
import numpy as np

from .registry import effect


@effect('whoosh', level=-17)
def whoosh(a, d=0.38, **_):
    n = a.noise(d); lo, hi = a.lp(n, 500), a.lp(n, 2200)
    k = np.sin(np.pi * np.linspace(0, 1, len(n))); x = (lo * (1 - k) + hi * k) * k ** 1.5
    return x / (np.abs(x).max() + 1e-9) * 0.5


@effect('slide', level=-19)
def slide(a, d=1.0, **_):
    n = a.lp(a.noise(d), 700); e = np.sin(np.pi * np.linspace(0, 1, len(n))) ** 2
    return n / (np.abs(n).max() + 1e-9) * e * 0.35 + a.sweep(260, 120, d) * e * 0.08


@effect('pop', level=-14)
def pop(a, **_):
    x = a.sweep(560, 240, 0.11) * a.env(int(0.11 * a.sr), 0.002, 6); return a.lp(x, 3000) * 0.7


@effect('plop', level=-15)
def plop(a, **_):
    x = a.sweep(700, 180, 0.14) * a.env(int(0.14 * a.sr), 0.002, 5); return a.lp(x, 2500) * 0.6


@effect('gulp', level=-11)
def gulp(a, **_):
    s = a.sr
    p = a.sweep(320, 140, 0.16) * a.env(int(0.16 * s), 0.01, 4); q = a.sweep(240, 90, 0.2) * a.env(int(0.2 * s), 0.01, 4)
    x = np.concatenate([p, np.zeros(int(0.04 * s)), q]); return a.lp(x, 1800) * 0.8


@effect('boing', level=-15)
def boing(a, **_):
    d = 0.42; t = a.tt(d); f = 200 * (1 + 0.6 * t / d) * (1 + 0.08 * np.sin(2 * np.pi * 18 * t))
    return a.lp(np.sin(2 * np.pi * np.cumsum(f) / a.sr) * a.env(len(t), 0.004, 4), 2000) * 0.55


@effect('bubbles', level=-21)
def bubbles(a, d=2.0, **_):
    s = a.sr; x = np.zeros(int(d * s))
    for _ in range(int(d * 7)):
        st = a.rng.integers(0, max(1, len(x) - int(0.08 * s))); f = a.rng.uniform(380, 900)
        b = a.sweep(f, f * 1.6, 0.06) * a.env(int(0.06 * s), 0.003, 5)
        x[st:st + len(b)] += b * a.rng.uniform(0.2, 0.5)
    return a.lp(x, 2500) * 0.5


@effect('sizzle', level=-18)
def sizzle(a, d=1.0, **_):
    n = a.bp(a.noise(d), 1800, 4500); crack = (a.rng.random(len(n)) < 0.002).astype(float); crack = a.lp(crack, 300) * 40
    e = np.minimum(1, np.linspace(0, 6, len(n))) * np.linspace(1, 0.2, len(n)); return n * (0.4 + crack) * e * 0.12


@effect('sparkle', level=-17)
def sparkle(a, d=1.2, **_):
    s = a.sr; notes = [784, 880, 1047, 1175, 1319, 1568]; x = np.zeros(int(d * s) + s // 2)
    for k, f in enumerate(notes):
        st = int(k * d / len(notes) * s); n = int(0.4 * s); t = a.tt(0.4)
        x[st:st + n] += (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * a.env(n, 0.004, 6) * 0.22
    return a.lp(x, 4500)


@effect('thud', level=-11)
def thud(a, **_):
    d = 0.35; t = a.tt(d); x = np.sin(2 * np.pi * (70 + 40 * np.exp(-t * 30)) * t) * a.env(len(t), 0.002, 7)
    return x * 0.9 + a.lp(a.noise(d), 220) * a.env(len(t), 0.001, 12) * 0.3


@effect('slam', level=-9)
def slam(a, **_):
    d = 0.5; t = a.tt(d); x = np.sin(2 * np.pi * (60 + 60 * np.exp(-t * 25)) * t) * a.env(len(t), 0.002, 6)
    return np.tanh(1.6 * (x + a.lp(a.noise(d), 1200) * a.env(len(t), 0.001, 10) * 0.6)) * 0.9


@effect('tock', level=-18)
def tock(a, **_):
    d = 0.09; t = a.tt(d)
    return (np.sin(2 * np.pi * 420 * t) + 0.3 * np.sin(2 * np.pi * 840 * t)) * a.env(len(t), 0.001, 9) * 0.35


@effect('zip', level=-14)
def zip_(a, **_):
    d = 0.32; n = a.bp(a.noise(d), 400, 3000); k = np.linspace(0, 1, len(n))
    return (n / (np.abs(n).max() + 1e-9) * 0.35 + a.sweep(300, 1100, d) * 0.12) * np.sin(np.pi * k) ** 1.2


@effect('alarm', level=-17)
def alarm(a, d=2.0, **_):
    s = a.sr; x = np.zeros(int(d * s)); one = np.sin(2 * np.pi * 150 * a.tt(0.22)) * a.env(int(0.22 * s), 0.02, 5)
    for st in np.arange(0, d - 0.25, 0.5): i = int(st * s); x[i:i + len(one)] += one
    return a.lp(x, 900) * 0.55


@effect('inhale', level=-15)
def inhale(a, d=1.0, **_):
    n = a.bp(a.noise(d), 300, 2600); k = np.linspace(0, 1, len(n)); e = np.sin(np.pi * np.minimum(1, k * 1.15)) ** 1.5 * (0.6 + 0.4 * k)
    return n / (np.abs(n).max() + 1e-9) * e * 0.5


@effect('heartbeat', level=-8)
def heartbeat(a, **_):
    one = lambda d, f: np.sin(2 * np.pi * f * a.tt(d)) * a.env(int(d * a.sr), 0.004, 7)
    x = np.concatenate([one(0.16, 58), np.zeros(int(0.09 * a.sr)), one(0.2, 52) * 0.75]); return a.lp(x, 300) * 1.0


@effect('ding', level=-17)
def ding(a, **_):
    t = a.tt(1.4)
    x = sum(np.sin(2 * np.pi * f * t) * g for f, g in [(1318, 1), (2637, 0.35), (3951, 0.12)]) * a.env(len(t), 0.002, 4)
    return x * 0.5


@effect('chirp', level=-19)
def chirp(a, d=1.0, **_):
    s = a.sr; x = np.zeros(int(d * s))
    for k, st in enumerate(np.arange(0, d - 0.12, 0.17)):
        i = int(st * s); c = a.sweep(3200 + (k % 3) * 300, 4400, 0.08) * a.env(int(0.08 * s), 0.004, 6)
        x[i:i + len(c)] += c[:len(x) - i] * (0.6 + 0.4 * a.rng.random())
    return x * 0.4


@effect('chug', level=-20)
def chug(a, d=2.0, **_):
    s = a.sr; x = np.zeros(int(d * s)); one = a.bp(a.noise(0.14), 200, 1600) * a.env(int(0.14 * s), 0.005, 6)
    for k, st in enumerate(np.arange(0, d - 0.15, 0.22)): i = int(st * s); x[i:i + len(one)] += one * (1 if k % 2 == 0 else 0.6)
    return x * 0.7


@effect('stamp', level=-12)
def stamp(a, **_):
    t = a.tt(0.18)
    x = np.sin(2 * np.pi * 95 * t) * a.env(len(t), 0.001, 10) + a.bp(a.noise(0.18), 1500, 5000) * a.env(len(t), 0.001, 14) * 0.6
    return x * 0.9
