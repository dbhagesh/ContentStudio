"""Procedural soundtrack: effects + music registries, DSP helpers, the mixer and plugin loading."""
from .registry import EFFECTS, TRACKS, Effect, effect, track
from . import effects, music  # noqa: F401  (register the built-ins)
from .dsp import Dsp, SR, db
from .plugins import load_plugins

__all__ = ['EFFECTS', 'TRACKS', 'Effect', 'effect', 'track', 'Dsp', 'SR', 'db', 'load_plugins']
