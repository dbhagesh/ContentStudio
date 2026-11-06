"""Narration layout with a fake TTS provider: sentence grouping, cut placement, files written."""
import json
import unittest

import numpy as np
from scipy.io import wavfile

from studio_audio.tts import get_provider, names, register
from studio_audio.tts.narrate import build_narration, find_cuts, run, sentence_groups, silences, trim
from tests.helpers import SCRIPT, FakeTTS, temp_project


class NarrateTest(unittest.TestCase):
    def test_sentence_groups(self):
        self.assertEqual(sentence_groups(SCRIPT['lines']), [[0], [1, 2], [3]])
        self.assertEqual(sentence_groups([{'text': 'a,'}, {'text': 'b', 'break': True}, {'text': 'c'}]), [[0, 1], [2]])
        self.assertEqual(sentence_groups([{'text': 'He said "go."'}, {'text': 'ok'}]), [[0], [1]])

    def test_trim_and_silences(self):
        sr = 24000; tone = np.ones(sr // 10) * 0.5
        x = np.concatenate([np.zeros(sr), tone, np.zeros(sr // 5), tone, np.zeros(sr)])
        y = trim(x, sr); self.assertLess(len(y), len(x) - sr)
        p = silences(y, sr); self.assertEqual(len(p), 1); self.assertAlmostEqual(p[0][1] - p[0][0], 0.2, delta=0.03)

    def test_cut_snaps_to_pause(self):
        sr = 24000; tone = np.ones(sr // 2) * 0.5
        x = np.concatenate([tone, np.zeros(sr // 4), tone])
        cuts = find_cuts(x, sr, [sr // 2, sr // 2])
        self.assertEqual(cuts[0], 0.0); a, b = cuts[1]
        self.assertAlmostEqual(a, 0.5, delta=0.03); self.assertAlmostEqual(b, 0.75, delta=0.03)

    def test_build_narration_lines(self):
        tts = FakeTTS()
        y, sr, doc = build_narration(SCRIPT, tts, log=lambda s: None)
        self.assertEqual(sr, 24000); self.assertAlmostEqual(np.abs(y).max(), 0.9, places=3)
        L = doc['lines']; self.assertEqual([l['i'] for l in L], [0, 1, 2, 3])
        self.assertAlmostEqual(L[0]['start'], 0.4, delta=0.02)
        for a, b in zip(L, L[1:]): self.assertLessEqual(a['end'], b['start'] + 1e-9)
        self.assertAlmostEqual(doc['duration'], len(y) / sr, places=3)
        self.assertGreater(L[2]['start'] - L[1]['end'], 0.1)   # cut inside sentence 2 sits on the comma pause
        self.assertIn('Well, it slides down your throat, and lands right in your stomach.', tts.calls)

    def test_run_writes_files(self):
        P = temp_project(); run(P, provider=FakeTTS())
        sr, w = wavfile.read(P / 'data/narration.wav'); self.assertEqual(sr, 24000); self.assertEqual(w.dtype, np.int16)
        self.assertEqual(len(json.loads((P / 'data/lines.json').read_text())['lines']), 4)

    def test_registry(self):
        self.assertIn('kokoro', names())
        register('fake', FakeTTS); self.assertIsInstance(get_provider('fake'), FakeTTS)
        with self.assertRaises(SystemExit): get_provider('nope')


if __name__ == '__main__':
    unittest.main()
