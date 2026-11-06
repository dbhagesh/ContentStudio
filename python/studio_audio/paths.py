"""Where models and the private environment live.

STUDIO_HOME (env) overrides the default ``<repo>/.studio``. Models are kept inside it so nothing lands in ~/.cache.
"""
import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def studio_home() -> Path:
    return Path(os.environ.get('STUDIO_HOME') or REPO_ROOT / '.studio')


def models_dir() -> Path:
    return studio_home() / 'models'


def kokoro_dir() -> Path:
    return models_dir() / 'kokoro'


def whisper_dir() -> Path:
    return models_dir() / 'whisper'


def whisper_model_name() -> str:
    return os.environ.get('STUDIO_WHISPER_MODEL', 'small.en')
