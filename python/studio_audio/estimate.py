"""Estimated timing with NO voice: script.json -> data/lines.json + data/words.json.

Use it for a captions-only video (the voiceover is recorded later, to the captions), or to preview a cut before the
real voice exists. Each word gets a length from its letters; commas and mid-line full stops add pauses.
When the real narration is ready, ``voice`` + ``words`` overwrite both files and everything re-times itself.
"""
import re
from pathlib import Path

from .project import data_dir, load_script, write_json

DEFAULT_WPS = 2.8   # Kokoro am_michael at 1.05 is ~2.8 words per second


def estimate_timing(script: dict, wps: float = DEFAULT_WPS):
    """Pure function: script dict -> (lines_doc, words)."""
    speed = script.get('speed', 1.0)
    t = float(script.get('lead', 0.4))
    lines, words = [], []
    for i, ln in enumerate(script['lines']):
        toks = ln['text'].split()
        letters = [len(re.sub(r'[^A-Za-z0-9]', '', w)) or 1 for w in toks]
        base = len(toks) / (wps * speed)                                  # seconds of pure speech for this line
        unit = base / sum(l + 2.5 for l in letters)
        start = t
        for w, l in zip(toks, letters):
            d = (l + 2.5) * unit
            words.append({'w': w, 'line': i, 's': round(t, 3), 'e': round(t + d * 0.92, 3)})
            t += d
            if w.endswith(','): t += 0.16
            elif re.search(r'[.?!]$', w) and w is not toks[-1]: t += 0.32
        lines.append({'i': i, 'text': ln['text'], 'start': round(start, 3), 'end': round(t, 3)})
        t += float(ln.get('gap', script.get('gap', 0.32)))
    dur = lines[-1]['end'] + float(script.get('outro', 0.9))
    return {'duration': round(dur, 3), 'estimated': True, 'lines': lines}, words


def run(project, wps: float = DEFAULT_WPS) -> None:
    P = Path(project)
    doc, words = estimate_timing(load_script(P), wps)
    d = data_dir(P)
    write_json(d / 'lines.json', doc)
    write_json(d / 'words.json', words)
    print(f"estimated timing: {len(doc['lines'])} lines, {len(words)} words, {doc['duration']:.2f} s → data/lines.json, data/words.json")
