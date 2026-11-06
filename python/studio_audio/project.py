"""Small helpers for reading and writing a video project's files (script.json, data/*.json)."""
import json
from pathlib import Path


def load_script(project: Path) -> dict:
    f = Path(project) / 'script.json'
    if not f.exists():
        raise SystemExit(f'no script.json in {project}')
    return json.loads(f.read_text())


def data_dir(project: Path) -> Path:
    d = Path(project) / 'data'
    d.mkdir(exist_ok=True)
    return d


def write_json(path: Path, obj) -> None:
    Path(path).write_text(json.dumps(obj, indent=1))


def write_words_txt(project: Path, words: list) -> None:
    (Path(project) / 'data/words.txt').write_text(
        '\n'.join(f"{w['s']:7.2f} {w['e']:7.2f}  L{w['line']:<2d} {w['w']}" for w in words))
