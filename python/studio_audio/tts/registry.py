"""Name -> TTS provider factory. A speaker's ``"tts": "<name>"`` picks one (default ``kokoro``); the speaker's other
settings (url, model, key_env, ...) are passed to the factory."""
from typing import Callable

_FACTORIES: dict[str, Callable] = {}
DEFAULT = 'kokoro'


def register(name: str, factory: Callable) -> None:
    _FACTORIES[name] = factory


def names() -> list[str]:
    return sorted(_FACTORIES)


def get_provider(name: str = DEFAULT, **opts):
    if name not in _FACTORIES:
        raise SystemExit(f"unknown TTS provider '{name}' (known: {', '.join(names())})")
    return _FACTORIES[name](**opts) if opts else _FACTORIES[name]()


def _kokoro():
    from .kokoro import KokoroProvider
    return KokoroProvider()


register('kokoro', _kokoro)


def _http(**opts):
    from .http import HttpSpeechProvider
    return HttpSpeechProvider(**opts)


def _voicestudio(**opts):
    """VoiceStudio's local backend (default port 3900); key from OMNIVOICE_API_KEY when it is set."""
    import os
    from .http import HttpSpeechProvider
    url = opts.pop('url', None) or os.environ.get('VOICESTUDIO_URL') or 'http://127.0.0.1:3900'
    return HttpSpeechProvider(url=url, key_env=opts.pop('key_env', 'OMNIVOICE_API_KEY'), **opts)


register('http', _http)
register('voicestudio', _voicestudio)
