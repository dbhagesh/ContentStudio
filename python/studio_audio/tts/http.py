"""Any local voice server that speaks the OpenAI-compatible speech API (POST <url>/v1/audio/speech -> WAV bytes).

Used for higher-quality local engines running as their own app (e.g. VoiceStudio, Kokoro-FastAPI, Chatterbox
servers). Settings per speaker: {"tts": "http", "url": "http://127.0.0.1:8880", "model": "...", "voice": "..."};
an API key, if the server wants one, comes from the environment variable named by "key_env" (never from files).
"""
import io
import json
import os
import urllib.error
import urllib.request

import numpy as np
from scipy.io import wavfile


def wav_to_float(data: bytes) -> tuple[np.ndarray, int]:
    sr, w = wavfile.read(io.BytesIO(data))
    w = np.asarray(w)
    if w.ndim > 1:
        w = w.mean(axis=1)
    if np.issubdtype(w.dtype, np.integer):
        w = w.astype(np.float64) / np.iinfo(w.dtype).max
    return w.astype(np.float64), int(sr)


class HttpSpeechProvider:
    name = 'http'

    def __init__(self, url='http://127.0.0.1:8880', model='tts-1', key_env=None, default_voice='default', timeout=300, opener=None):
        self.url = url.rstrip('/')
        self.model = model
        self.key_env = key_env
        self.default_voice = default_voice
        self.timeout = timeout
        self._open = opener or urllib.request.urlopen

    def voices(self) -> dict:
        return {}

    def ensure_models(self) -> None:
        pass

    def synthesize(self, text, voice, speed):
        body = json.dumps({'model': self.model, 'input': text, 'voice': voice or self.default_voice,
                           'speed': speed, 'response_format': 'wav'}).encode()
        headers = {'Content-Type': 'application/json'}
        key = os.environ.get(self.key_env) if self.key_env else None
        if key:
            headers['Authorization'] = f'Bearer {key}'
        req = urllib.request.Request(f'{self.url}/v1/audio/speech', data=body, headers=headers, method='POST')
        try:
            with self._open(req, timeout=self.timeout) as r:
                return wav_to_float(r.read())
        except urllib.error.URLError as e:
            raise SystemExit(f'voice server at {self.url} did not answer ({e}). Is it running?')
