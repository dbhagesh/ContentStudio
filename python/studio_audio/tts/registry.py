"""Name -> TTS provider factory. script.json ``"tts": "<name>"`` picks one (default ``kokoro``)."""
from typing import Callable

_FACTORIES: dict[str, Callable] = {}
DEFAULT = 'kokoro'


def register(name: str, factory: Callable) -> None:
    _FACTORIES[name] = factory


def names() -> list[str]:
    return sorted(_FACTORIES)


def get_provider(name: str = DEFAULT):
    if name not in _FACTORIES:
        raise SystemExit(f"unknown TTS provider '{name}' (known: {', '.join(names())})")
    return _FACTORIES[name]()


def _kokoro():
    from .kokoro import KokoroProvider
    return KokoroProvider()


register('kokoro', _kokoro)
