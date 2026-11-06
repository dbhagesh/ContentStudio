"""Registries for sound effects and music tracks.

    from studio_audio.mix import effect, track

    @effect('whoosh', level=-17)          # level = dB the effect sits at in the mix
    def whoosh(a, d=0.38, **_): ...       # a: Dsp; d: optional duration from the cue; returns mono samples

    @track('bed')
    def bed(a, n, dur): ...               # returns n mono samples in [-1, 1]
"""
from dataclasses import dataclass
from typing import Callable


@dataclass(frozen=True)
class Effect:
    name: str
    fn: Callable
    level: float


EFFECTS: dict[str, Effect] = {}
TRACKS: dict[str, Callable] = {}


def effect(name: str, level: float = -17):
    def deco(fn):
        EFFECTS[name] = Effect(name, fn, level)
        return fn
    return deco


def track(name: str):
    def deco(fn):
        TRACKS[name] = fn
        return fn
    return deco
