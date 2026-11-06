"""DSP building blocks for procedural sound, bound to an explicit context (sample rate + seeded rng).

Effects and music receive a ``Dsp`` instead of reading module globals, so a mix is reproducible (seed 11 by default)
and every generator can be unit-tested on its own.
"""
import numpy as np
from scipy import signal

SR = 48000
SEED = 11


class Dsp:
    def __init__(self, sr: int = SR, seed: int = SEED):
        self.sr = sr
        self.rng = np.random.default_rng(seed)

    # filters
    def lp(self, x, f, o=2):
        b, a = signal.butter(o, min(f, self.sr / 2 - 100) / (self.sr / 2), 'low'); return signal.lfilter(b, a, x)

    def hp(self, x, f, o=2):
        b, a = signal.butter(o, f / (self.sr / 2), 'high'); return signal.lfilter(b, a, x)

    def bp(self, x, f0, f1, o=2):
        b, a = signal.butter(o, [f0 / (self.sr / 2), f1 / (self.sr / 2)], 'band'); return signal.lfilter(b, a, x)

    # time / envelopes / sources
    def tt(self, d):
        return np.arange(int(d * self.sr)) / self.sr

    def env(self, n, a=0.005, r=None):
        """attack ``a`` seconds then exponential release over the rest"""
        e = np.ones(n); na = max(1, int(a * self.sr)); e[:na] = np.linspace(0, 1, na)
        rest = n - na; e[na:] = np.exp(-np.linspace(0, r or 5, rest)) if rest > 0 else 1
        return e

    def sweep(self, f0, f1, d, shape='exp'):
        t = self.tt(d); f = f0 * (f1 / f0) ** (t / d) if shape == 'exp' else f0 + (f1 - f0) * t / d
        return np.sin(2 * np.pi * np.cumsum(f) / self.sr)

    def noise(self, d):
        return self.rng.standard_normal(int(d * self.sr))


def db(x):
    return 10 ** (x / 20)


def normalize(x, peak=1.0):
    return x / (np.abs(x).max() + 1e-9) * peak
