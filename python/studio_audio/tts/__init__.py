"""Text-to-speech providers (pluggable) and the provider-agnostic narration builder."""
from .base import TTSProvider
from .registry import get_provider, register, names

__all__ = ['TTSProvider', 'get_provider', 'register', 'names']
