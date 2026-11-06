"""Word timings with local Whisper (faster-whisper, MIT) -> data/words.json [{w, line, s, e}] + data/words.txt.

After ``voice``: uses data/narration.wav + data/lines.json. With ``--audio`` (the user's OWN recording): the file becomes
data/narration.wav and the line times are rebuilt from what was said.

Words keep the SCRIPT's spelling with the times Whisper heard. Words heard differently ("7" vs "seven") or missed share
the time between their matched neighbours, by length. No Whisper? After ``voice`` the line times are exact anyway, so
each line's words are spread inside it by length, with pauses at commas and full stops.
"""
import json
import re
import subprocess
from difflib import SequenceMatcher
from pathlib import Path

from .paths import whisper_dir, whisper_model_name
from .project import load_script, write_json, write_words_txt


def norm(w: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', w.lower())


def align(script_words, heard, t0, t1):
    """script_words: [str]; heard: [(word, s, e)] -> [(s, e)] per script word, inside [t0, t1]."""
    a = [norm(w) for w in script_words]; b = [norm(h[0]) for h in heard]
    times = [None] * len(a)
    for blk in SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        for k in range(blk.size): times[blk.a + k] = (heard[blk.b + k][1], heard[blk.b + k][2])
    # fill gaps between matched neighbours, split by word length
    i = 0
    while i < len(a):
        if times[i] is not None: i += 1; continue
        j = i
        while j < len(a) and times[j] is None: j += 1
        lo = times[i - 1][1] if i > 0 else t0; hi = times[j][0] if j < len(a) else t1
        if hi <= lo: hi = lo + 0.05 * (j - i)
        L = [max(1, len(a[k])) for k in range(i, j)]; tot = sum(L); c = lo
        for k, l in zip(range(i, j), L): d = (hi - lo) * l / tot; times[k] = (c, c + d * 0.9); c += d
        i = j
    return times


def spread_words(script: dict, line_times: list) -> list:
    """Fallback: spread each line's words inside its exact [start, end] by length, pausing at , and . ? !"""
    words = []
    for i, ln in enumerate(script['lines']):
        toks = [w for w in ln['text'].split() if norm(w)]
        wts = [len(norm(w)) + 2.5 + (2.5 if w.endswith(',') else 4.5 if re.search(r'[.?!]$', w) and k < len(toks) - 1 else 0)
               for k, w in enumerate(toks)]
        lo, hi = line_times[i]['start'], line_times[i]['end']; c = lo; tot = sum(wts)
        for w, wt in zip(toks, wts):
            d = (hi - lo) * wt / tot; speak = d - (hi - lo) * (wt - len(norm(w)) - 2.5) / tot
            words.append({'w': w, 'line': i, 's': round(c, 3), 'e': round(c + speak * 0.92, 3)}); c += d
    return words


def inline_fallback(P: Path, script: dict) -> list:
    L = json.loads((P / 'data/lines.json').read_text())['lines']
    words = spread_words(script, L)
    write_json(P / 'data/words.json', words)
    write_words_txt(P, words)
    print(f'data/words.json: {len(words)} words (spread inside the voice line times)')
    return words


def load_whisper():
    from faster_whisper import WhisperModel   # lazy: heavy import
    d = whisper_dir(); d.mkdir(parents=True, exist_ok=True)
    return WhisperModel(whisper_model_name(), device='cpu', compute_type='int8', download_root=str(d))


def transcribe(model, wav: Path):
    """Decode with ffmpeg ourselves (avoids PyAV version problems), 16 kHz mono float32 -> [(word, s, e)]."""
    import numpy as np
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(wav), '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    segs, _ = model.transcribe(np.frombuffer(raw, dtype=np.float32), word_timestamps=True, vad_filter=False)
    return [(w.word.strip(), w.start + 0.04, w.end) for s in segs for w in s.words]   # Whisper starts run a little early


def audio_duration(wav: Path) -> float:
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(wav)],
                                capture_output=True, text=True).stdout)


def run(project, audio=None) -> None:
    P = Path(project); S = load_script(P)
    has_lines = (P / 'data/lines.json').exists()
    try:
        model = load_whisper()
    except Exception as e:
        if audio or not has_lines:
            raise SystemExit(f'Whisper is needed for your own recording and could not load: {e}')
        print(f'Whisper unavailable ({type(e).__name__}); spreading words inside the exact line times instead')
        inline_fallback(P, S); return
    (P / 'data').mkdir(exist_ok=True)
    if audio:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(audio), '-ac', '1', '-ar', '24000', str(P / 'data/narration.wav')], check=True)
    try:
        heard = transcribe(model, P / 'data/narration.wav')
    except Exception as e:
        if audio or not has_lines:
            raise SystemExit(f'Whisper could not transcribe the recording: {e}')
        print(f'Whisper failed ({type(e).__name__}: {e}); spreading words inside the exact line times instead')
        inline_fallback(P, S); return
    toks = [(w, i) for i, ln in enumerate(S['lines']) for w in ln['text'].split() if norm(w)]
    dur_audio = audio_duration(P / 'data/narration.wav')
    times = align([w for w, _ in toks], heard, 0.0, dur_audio)
    words = [{'w': w, 'line': i, 's': round(s, 3), 'e': round(e, 3)} for (w, i), (s, e) in zip(toks, times)]
    if audio or not has_lines:
        lines = []
        for i, ln in enumerate(S['lines']):
            ws = [w for w in words if w['line'] == i]
            lines.append({'i': i, 'text': ln['text'], 'start': ws[0]['s'], 'end': ws[-1]['e']})
        write_json(P / 'data/lines.json', {'duration': round(dur_audio, 3), 'lines': lines})
    else:   # keep every word inside its line's exact TTS window
        L = json.loads((P / 'data/lines.json').read_text())['lines']
        for w in words:
            lo, hi = L[w['line']]['start'], L[w['line']]['end']
            w['s'] = round(min(max(w['s'], lo), hi), 3); w['e'] = round(min(max(w['e'], w['s']), hi), 3)
    write_json(P / 'data/words.json', words)
    write_words_txt(P, words)
    print(f'data/words.json: {len(words)} words (Whisper heard {len(heard)})')
