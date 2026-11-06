"""The TTS provider contract. A new engine (Piper, XTTS, ...) is one class implementing this, registered by name."""
from typing import Protocol, runtime_checkable

import numpy as np


@runtime_checkable
class TTSProvider(Protocol):
    name: str
    default_voice: str

    def voices(self) -> dict:
        """{voice_id: short description} of voices that narrate well."""

    def ensure_models(self) -> None:
        """Download model files once (no-op if present)."""

    def synthesize(self, text: str, voice: str, speed: float) -> tuple[np.ndarray, int]:
        """Speak ``text``; returns (mono float64 samples, sample rate)."""
