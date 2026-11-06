"""Load extra effects / music tracks from plugin folders.

Every ``*.py`` in each directory listed in ``STUDIO_AUDIO_PLUGINS`` (os.pathsep-separated), or passed explicitly,
is imported once; plugins register themselves with ``from studio_audio.mix import effect, track``.
"""
import importlib.util
import os
from pathlib import Path

_loaded: set[str] = set()


def plugin_dirs(extra=()) -> list[Path]:
    env = [p for p in os.environ.get('STUDIO_AUDIO_PLUGINS', '').split(os.pathsep) if p]
    return [Path(p) for p in (*env, *extra)]


def load_plugins(extra=()) -> list[str]:
    """Import plugin files; returns the paths newly loaded."""
    new = []
    for d in plugin_dirs(extra):
        if not d.is_dir():
            continue
        for f in sorted(d.glob('*.py')):
            key = str(f.resolve())
            if key in _loaded:
                continue
            spec = importlib.util.spec_from_file_location(f'studio_audio_plugin_{len(_loaded)}_{f.stem}', f)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            _loaded.add(key); new.append(key)
    return new
