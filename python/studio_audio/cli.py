"""Command line: ``python -m studio_audio <command>``.

  voice <project> [--voice V] [--speed S]   script.json -> data/narration.wav + data/lines.json
  voice --list | --download                 voices that narrate well · fetch the TTS model once
  words <project> [--audio FILE]            data/words.json (+ lines.json rebuilt from your own recording)
  estimate <project> [--wps 2.8]            timing without any voice (captions-only / preview)
  mix <project>                             data/cues.json + narration + music -> data/mix.wav
  effects                                   registered sound effects and music tracks
"""
import argparse
import sys


def _voice(a):
    from .tts import get_provider
    from .tts.registry import DEFAULT
    provider = get_provider(a.tts or DEFAULT)
    if a.list:
        for k, v in provider.voices().items(): print(f'{k:12s} {v}')
        return
    provider.ensure_models()
    if a.download:
        return
    if not a.project:
        raise SystemExit('voice: project folder missing')
    from .tts.narrate import run
    run(a.project, a.voice, a.speed, provider if a.tts else None)


def _words(a):
    from .align import run
    run(a.project, a.audio)


def _estimate(a):
    from .estimate import run
    run(a.project, a.wps)


def _mix(a):
    from .mix.mixer import run
    run(a.project)


def _effects(a):
    from .mix import EFFECTS, TRACKS, load_plugins
    load_plugins()
    print('effects: ' + ' '.join(sorted(EFFECTS)))
    print('music:   ' + ' '.join(sorted(TRACKS)) + ' none <your-file>')


def build_parser():
    ap = argparse.ArgumentParser(prog='studio_audio', description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    v = sub.add_parser('voice', help='narration with a local TTS voice')
    v.add_argument('project', nargs='?'); v.add_argument('--list', action='store_true'); v.add_argument('--download', action='store_true')
    v.add_argument('--voice'); v.add_argument('--speed', type=float); v.add_argument('--tts', help='TTS provider (default: script.json "tts" or kokoro)')
    v.set_defaults(fn=_voice)
    w = sub.add_parser('words', help='word timings with local Whisper'); w.add_argument('project'); w.add_argument('--audio'); w.set_defaults(fn=_words)
    e = sub.add_parser('estimate', help='estimated timing, no voice'); e.add_argument('project'); e.add_argument('--wps', type=float, default=2.8); e.set_defaults(fn=_estimate)
    m = sub.add_parser('mix', help='render data/mix.wav'); m.add_argument('project'); m.set_defaults(fn=_mix)
    sub.add_parser('effects', help='list sound effects and music').set_defaults(fn=_effects)
    return ap


def main(argv=None) -> int:
    a = build_parser().parse_args(argv)
    try:
        a.fn(a)
    except SystemExit as e:
        if isinstance(e.code, str):
            print(f'error: {e.code}', file=sys.stderr); return 1
        return e.code or 0
    except FileNotFoundError as e:
        print(f'error: {e}', file=sys.stderr); return 1
    return 0
