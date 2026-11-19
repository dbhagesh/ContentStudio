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

    def test_pitch_raises_the_voice_at_the_same_pace(self):
        class Spy(FakeTTS):
            speeds = []

            def synthesize(self, text, voice, speed):
                self.speeds.append(speed); return super().synthesize(text, voice, speed)

        tts = Spy()
        base, sr, _ = build_narration({**SCRIPT}, FakeTTS(), log=lambda s: None)
        up, sr2, _ = build_narration({**SCRIPT, 'speed': 1.0, 'pitch': 12}, tts, log=lambda s: None)
        self.assertEqual(sr, sr2)
        self.assertTrue(all(abs(v - 0.5) < 1e-9 for v in tts.speeds))     # asked for half speed: resampling doubles it back
        # the fake ignores speed, so resampling alone halves the audio; a real voice is slowed first and keeps its length
        self.assertLess(len(up), len(base) * 0.7)

    def test_lowcut_thins_the_bass(self):
        class Two(FakeTTS):          # a 150 Hz hum under a 2 kHz tone
            def synthesize(self, text, voice, speed):
                t = np.arange(int(0.25 * len(text.split()) * self.sr)) / self.sr
                return 0.4 * np.sin(2 * np.pi * 150 * t) + 0.4 * np.sin(2 * np.pi * 2000 * t), self.sr

        def bass_share(y, sr):
            f = np.fft.rfftfreq(len(y), 1 / sr); m = np.abs(np.fft.rfft(y)) ** 2
            return m[f < 300].sum() / m.sum()
        plain, sr, _ = build_narration({**SCRIPT}, Two(), log=lambda s: None)
        thin, _, _ = build_narration({**SCRIPT, 'lowcut': 600}, Two(), log=lambda s: None)
        self.assertLess(bass_share(thin, sr), bass_share(plain, sr) * 0.2)

    def test_speakers_get_their_own_voice_and_sentences(self):
        script = {**SCRIPT, 'lines': [
            {'text': 'Who took my lunch,'}, {'text': 'he asked.', 'speaker': 'kai'},
            {'text': 'Not me!', 'speaker': 'mira'}, {'text': 'Then silence.'},
        ]}
        self.assertEqual(sentence_groups(script['lines']), [[0], [1], [2], [3]])
        made = {}

        class Slow(FakeTTS):
            sr = 16000

        def provider_for(name, opts):
            made[name] = opts; return Slow()

        narrator = FakeTTS()
        y, sr, doc = build_narration(script, narrator, log=lambda s: None, provider_for=provider_for,
                                     speakers={'kai': {'tts': 'other', 'voice': 'k', 'url': 'x'}, 'mira': {'voice': 'af_bella'}})
        self.assertEqual(sr, 24000)                                    # 16 kHz voices resampled to the first one's rate
        self.assertEqual([l.get('speaker') for l in doc['lines']], [None, 'kai', 'mira', None])
        self.assertEqual(made['other'], {'url': 'x'})
        self.assertIn('Who took my lunch,', narrator.calls)
        self.assertNotIn('he asked.', narrator.calls)
        with self.assertRaises(SystemExit):
            build_narration({**SCRIPT, 'lines': [{'text': 'x', 'speaker': 'ghost'}]}, FakeTTS(), log=lambda s: None)

    def test_http_provider_posts_openai_speech_and_reads_wav(self):
        import io, os
        from studio_audio.tts.http import HttpSpeechProvider
        buf = io.BytesIO(); wavfile.write(buf, 22050, (np.ones(2205) * 8000).astype(np.int16)); seen = {}

        class Resp:
            def __enter__(self): return self
            def __exit__(self, *a): pass
            def read(self): return buf.getvalue()

        def opener(req, timeout):
            seen['url'] = req.full_url; seen['body'] = json.loads(req.data); seen['auth'] = req.get_header('Authorization'); return Resp()

        os.environ['TEST_TTS_KEY'] = 'k123'
        p = HttpSpeechProvider(url='http://127.0.0.1:3900/', model='omni', key_env='TEST_TTS_KEY', opener=opener)
        x, sr = p.synthesize('hello', 'mira', 1.1)
        self.assertEqual(seen['url'], 'http://127.0.0.1:3900/v1/audio/speech')
        self.assertEqual(seen['body'], {'model': 'omni', 'input': 'hello', 'voice': 'mira', 'speed': 1.1, 'response_format': 'wav'})
        self.assertEqual(seen['auth'], 'Bearer k123')
        self.assertEqual(sr, 22050); self.assertAlmostEqual(x.max(), 8000 / 32767, places=4)
        self.assertIn('voicestudio', names()); self.assertIn('http', names())
        p = HttpSpeechProvider(url='http://x', model='m', opener=opener, description='warm young voice', seed=7)
        p.synthesize('hi', 'v', 1.0)
        self.assertEqual((seen['body']['description'], seen['body']['seed']), ('warm young voice', 7))
        vs = get_provider('voicestudio')
        self.assertEqual((vs.url, vs.model, vs.key_env), ('http://127.0.0.1:3900', 'mlx-audio', 'OMNIVOICE_API_KEY'))
        self.assertEqual(get_provider('voicestudio', model='tts-1').model, 'mlx-audio')
        with self.assertRaises(SystemExit):
            get_provider('voicestudio', model='omnivoice')

    def test_registry(self):
        self.assertIn('kokoro', names())
        register('fake', FakeTTS); self.assertIsInstance(get_provider('fake'), FakeTTS)
        with self.assertRaises(SystemExit): get_provider('nope')


if __name__ == '__main__':
    unittest.main()
