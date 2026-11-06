"""Estimated timing and Whisper alignment (pure functions, no models)."""
import json
import unittest

from studio_audio.align import align, norm, spread_words, inline_fallback
from studio_audio.estimate import estimate_timing, run as estimate_run
from tests.helpers import SCRIPT, temp_project


class EstimateTest(unittest.TestCase):
    def test_shape_and_monotonic(self):
        doc, words = estimate_timing(SCRIPT)
        self.assertTrue(doc['estimated'])
        self.assertEqual(len(doc['lines']), len(SCRIPT['lines']))
        self.assertEqual(len(words), sum(len(l['text'].split()) for l in SCRIPT['lines']))
        starts = [w['s'] for w in words]
        self.assertEqual(starts, sorted(starts))
        for w in words: self.assertLess(w['s'], w['e'])
        for a, b in zip(doc['lines'], doc['lines'][1:]): self.assertLessEqual(a['end'], b['start'])
        self.assertAlmostEqual(doc['lines'][0]['start'], 0.4)
        self.assertAlmostEqual(doc['duration'], doc['lines'][-1]['end'] + 0.9, places=3)

    def test_faster_speech_is_shorter(self):
        slow, _ = estimate_timing(SCRIPT, wps=2.0); fast, _ = estimate_timing(SCRIPT, wps=4.0)
        self.assertLess(fast['duration'], slow['duration'])

    def test_run_writes_files(self):
        P = temp_project(); estimate_run(P)
        self.assertIn('lines', json.loads((P / 'data/lines.json').read_text()))
        self.assertTrue(json.loads((P / 'data/words.json').read_text()))


class AlignTest(unittest.TestCase):
    def test_norm(self):
        self.assertEqual(norm("It's,"), 'its')

    def test_exact_match(self):
        heard = [('hello', 0.1, 0.4), ('big', 0.5, 0.7), ('world', 0.8, 1.2)]
        self.assertEqual(align(['Hello,', 'big', 'world.'], heard, 0, 2), [(0.1, 0.4), (0.5, 0.7), (0.8, 1.2)])

    def test_gap_filled_between_neighbours(self):
        heard = [('swallow', 0.0, 0.5), ('7', 0.6, 0.9), ('years', 1.0, 1.4)]
        t = align(['swallow', 'seven', 'years'], heard, 0, 2)
        self.assertEqual(t[0], (0.0, 0.5)); self.assertEqual(t[2], (1.0, 1.4))
        self.assertGreaterEqual(t[1][0], 0.5); self.assertLessEqual(t[1][1], 1.0)

    def test_unmatched_tail_runs_to_end(self):
        t = align(['one', 'two', 'three'], [('one', 0.0, 0.3)], 0, 3.0)
        self.assertLessEqual(t[2][1], 3.0); self.assertGreater(t[2][0], t[1][0])

    def test_spread_and_inline_fallback(self):
        lines = [{'start': 1.0 + i, 'end': 1.8 + i} for i in range(len(SCRIPT['lines']))]
        words = spread_words(SCRIPT, lines)
        for w in words:
            self.assertGreaterEqual(w['s'], lines[w['line']]['start'] - 1e-9)
            self.assertLessEqual(w['e'], lines[w['line']]['end'] + 1e-9)
        P = temp_project(); (P / 'data/lines.json').write_text(json.dumps({'duration': 6, 'lines': lines}))
        inline_fallback(P, SCRIPT)
        self.assertEqual(len(json.loads((P / 'data/words.json').read_text())), len(words))
        self.assertTrue((P / 'data/words.txt').read_text())


if __name__ == '__main__':
    unittest.main()
