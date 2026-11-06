"""Shared test fixtures: temp projects and a fake TTS provider (no model downloads)."""
import json
import tempfile
from pathlib import Path

import numpy as np

SCRIPT = {
    'title': 'Test', 'voice': 'am_michael', 'speed': 1.0, 'lead': 0.4, 'outro': 0.9, 'gap': 0.28, 'music': 'bed',
    'lines': [
        {'text': 'What happens if you swallow your gum?'},
        {'text': 'Well, it slides down your throat,'},
        {'text': 'and lands right in your stomach.', 'gap': 0.3},
        {'text': 'So maybe, just spit it out.'},
    ],
}


def temp_project(script=None) -> Path:
    d = Path(tempfile.mkdtemp(prefix='studio-test-'))
    (d / 'script.json').write_text(json.dumps(script or SCRIPT))
    (d / 'data').mkdir()
    return d


class FakeTTS:
    """Speaks each word as a 0.25 s tone; ', ' becomes a 0.2 s pause. Deterministic, 24 kHz."""
    name = 'fake'
    default_voice = 'fake'
    sr = 24000

    def __init__(self):
        self.calls = []

    def voices(self):
        return {'fake': 'test tone'}

    def ensure_models(self):
        pass

    def synthesize(self, text, voice, speed):
        self.calls.append(text)
        parts = []
        for w in text.split():
            parts.append(0.5 * np.sin(2 * np.pi * 220 * np.arange(int(0.25 * self.sr)) / self.sr))
            parts.append(np.zeros(int((0.2 if w.endswith(',') else 0.03) * self.sr)))
        return np.concatenate(parts), self.sr
