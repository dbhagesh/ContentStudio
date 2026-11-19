"""Kokoro-82M text-to-speech (Apache-2.0) via kokoro-onnx (MIT). Local, no account, no API."""
import urllib.request

import numpy as np

from ..paths import kokoro_dir

FILES = {
    'kokoro-v1.0.onnx': 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx',
    'voices-v1.0.bin': 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin',
}
GOOD = {
    'am_michael': 'US male, steady explainer (default)', 'am_puck': 'US male, lively, playful', 'am_fenrir': 'US male, deeper',
    'am_onyx': 'US male, low', 'af_heart': 'US female, warm (best overall)', 'af_bella': 'US female, bright',
    'af_nicole': 'US female, soft and close', 'bm_george': 'UK male, documentary', 'bm_fable': 'UK male, storyteller',
    'bf_emma': 'UK female, calm',
}


class KokoroProvider:
    name = 'kokoro'
    default_voice = 'am_michael'

    def __init__(self):
        self._model = None

    def voices(self) -> dict:
        return dict(GOOD)

    def ensure_models(self) -> None:
        d = kokoro_dir()
        d.mkdir(parents=True, exist_ok=True)
        for name, url in FILES.items():
            p = d / name
            if p.exists() and p.stat().st_size > 1_000_000:
                continue
            print(f'downloading {name} (once)...', flush=True)
            tmp = p.with_suffix('.part')
            urllib.request.urlretrieve(url, tmp)
            tmp.rename(p)

    def _load(self):
        if self._model is None:
            from kokoro_onnx import Kokoro   # lazy: heavy import, only when speaking
            self.ensure_models()
            d = kokoro_dir()
            self._model = Kokoro(str(d / 'kokoro-v1.0.onnx'), str(d / 'voices-v1.0.bin'))
        return self._model

    def synthesize(self, text, voice, speed):
        model = self._load()
        names = voice.split('+')                       # "a+b" blends voices equally; "a:0.7+b:0.3" weights them
        lang = 'en-gb' if names[0].startswith('b') else 'en-us'
        if len(names) > 1:
            parts = [(n.split(':')[0], float(n.split(':')[1]) if ':' in n else 1.0) for n in names]
            tot = sum(w for _, w in parts)
            voice = sum(model.get_voice_style(n) * (w / tot) for n, w in parts)
        samples, sr = model.create(text, voice=voice, speed=speed, lang=lang)
        return np.asarray(samples, dtype=np.float64), sr
