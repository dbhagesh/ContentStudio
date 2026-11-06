"""Effects, music, plugins and the mixer end to end (synthetic inputs)."""
import io
import json
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

import numpy as np
from scipy.io import wavfile

from studio_audio.cli import main
from studio_audio.mix import EFFECTS, TRACKS, Dsp, load_plugins
from studio_audio.mix.mixer import mix, run
from tests.helpers import temp_project

BUILTIN_FX = {'whoosh', 'slide', 'pop', 'plop', 'gulp', 'boing', 'bubbles', 'sizzle', 'sparkle', 'thud', 'slam', 'tock',
              'zip', 'alarm', 'inhale', 'heartbeat', 'ding', 'chirp', 'chug', 'stamp'}


class EffectsTest(unittest.TestCase):
    def test_all_builtins_registered(self):
        self.assertTrue(BUILTIN_FX <= set(EFFECTS)); self.assertTrue({'bed', 'tension', 'bounce'} <= set(TRACKS))

    def test_every_effect_renders(self):
        a = Dsp()
        for name, fx in EFFECTS.items():
            with self.subTest(name):
                x = np.asarray(fx.fn(a)); self.assertGreater(len(x), 0); self.assertTrue(np.all(np.isfinite(x)))
                self.assertGreater(np.abs(x).max(), 0)
                self.assertTrue(np.all(np.isfinite(fx.fn(a, d=0.7))))

    def test_every_track_has_right_length(self):
        a = Dsp(); dur = 6.0; n = int(dur * a.sr) + a.sr // 10
        for name, fn in TRACKS.items():
            with self.subTest(name):
                m = fn(a, n, dur); self.assertEqual(len(m), n); self.assertLessEqual(np.abs(m).max(), 1 + 1e-6)

    def test_reproducible(self):
        a, b = Dsp(), Dsp(); self.assertTrue(np.array_equal(EFFECTS['whoosh'].fn(a), EFFECTS['whoosh'].fn(b)))


class MixerTest(unittest.TestCase):
    def _project(self, music='bed'):
        P = temp_project(); s = json.loads((P / 'script.json').read_text()); s['music'] = music
        (P / 'script.json').write_text(json.dumps(s))
        sr = 24000; t = np.arange(int(3 * sr)) / sr
        wavfile.write(P / 'data/narration.wav', sr, (0.5 * np.sin(2 * np.pi * 200 * t) * 32767).astype(np.int16))
        (P / 'data/cues.json').write_text(json.dumps({'duration': 4.0, 'cues': [
            {'t': 0.5, 'type': 'whoosh'}, {'t': 1.0, 'type': 'pop', 'gain': 0.6, 'pan': 0.5},
            {'t': 2.0, 'type': 'bubbles', 'dur': 1.0}, {'t': 3.0, 'type': 'not-a-cue'}]}))
        return P

    def test_end_to_end(self):
        P = self._project()
        with redirect_stdout(io.StringIO()) as out: run(P)
        self.assertIn('unknown cue type, skipped: not-a-cue', out.getvalue())
        sr, w = wavfile.read(P / 'data/mix.wav')
        self.assertEqual(sr, 48000); self.assertEqual(w.ndim, 2); self.assertEqual(w.shape[1], 2)
        self.assertEqual(len(w), int(4.0 * 48000) + 4800)
        peak = 20 * np.log10(np.abs(w).max() / 32767); self.assertAlmostEqual(peak, -1, delta=0.05)

    def test_no_voice_no_music(self):
        y = mix({'duration': 1.0, 'cues': [{'t': 0.2, 'type': 'thud'}]}, 'none', None, log=lambda s: None)
        self.assertEqual(y.shape, (48000 + 4800, 2)); self.assertTrue(np.all(np.isfinite(y)))

    def test_bad_music_name(self):
        with self.assertRaises(SystemExit): mix({'duration': 1.0, 'cues': []}, 'nonexistent.mp3', None, project=Path(tempfile.mkdtemp()))


class PluginTest(unittest.TestCase):
    def test_plugin_registers_effect_and_track(self):
        d = Path(tempfile.mkdtemp())
        (d / 'extra.py').write_text(
            'import numpy as np\nfrom studio_audio.mix import effect, track\n'
            "@effect('testbeep', level=-20)\ndef testbeep(a, **_): return np.sin(np.arange(1000) / 10)\n"
            "@track('testpad')\ndef testpad(a, n, dur): return np.zeros(n)\n")
        self.assertEqual(len(load_plugins([d])), 1)
        self.assertEqual(EFFECTS['testbeep'].level, -20); self.assertIn('testpad', TRACKS)
        self.assertEqual(load_plugins([d]), [])   # loaded once


class CliTest(unittest.TestCase):
    def test_effects_command(self):
        with redirect_stdout(io.StringIO()) as out: rc = main(['effects'])
        self.assertEqual(rc, 0); self.assertIn('whoosh', out.getvalue()); self.assertIn('bounce', out.getvalue())

    def test_missing_project_is_clean_error(self):
        r = subprocess.run([sys.executable, '-m', 'studio_audio', 'estimate', '/nonexistent/project'],
                           capture_output=True, text=True, cwd=Path(__file__).parents[1])
        self.assertNotEqual(r.returncode, 0); self.assertIn('error:', r.stderr); self.assertNotIn('Traceback', r.stderr)


if __name__ == '__main__':
    unittest.main()
