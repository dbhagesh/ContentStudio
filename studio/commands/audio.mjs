// Narration, timing and sound: thin wrappers over python/studio_audio, run in the studio's own env.
import { loadProject } from '../lib/project.mjs';
import { runAudio } from '../lib/python.mjs';

const P = (ref, cfg) => loadProject(ref, cfg);

export const commands = [
  {
    name: 'voice', group: 'audio', summary: 'AI narration (local Kokoro): script.json → data/narration.wav + exact line times',
    usage: 'voice <project> [--voice am_michael] [--speed 1.05]',
    options: { voice: { type: 'string' }, speed: { type: 'string' } },
    run({ positionals: [ref], values, cfg }) {
      const p = P(ref, cfg);
      runAudio(cfg, ['voice', p.dir, ...(values.voice ? ['--voice', values.voice] : []), ...(values.speed ? ['--speed', values.speed] : [])], { project: p });
    },
  },
  {
    name: 'words', group: 'audio', summary: 'word timings (local Whisper); --audio uses your own recording instead of the AI voice',
    usage: 'words <project> [--audio my_voiceover.m4a]',
    options: { audio: { type: 'string' } },
    run({ positionals: [ref], values, cfg }) {
      const p = P(ref, cfg);
      runAudio(cfg, ['words', p.dir, ...(values.audio ? ['--audio', values.audio] : [])], { project: p });
    },
  },
  {
    name: 'estimate', group: 'audio', summary: 'estimated timing with no voice (captions-only videos, or previews)',
    usage: 'estimate <project> [--wps 2.8]',
    options: { wps: { type: 'string' } },
    run({ positionals: [ref], values, cfg }) {
      const p = P(ref, cfg);
      runAudio(cfg, ['estimate', p.dir, ...(values.wps ? ['--wps', values.wps] : [])], { project: p });
    },
  },
  {
    name: 'mix', group: 'audio', summary: 'soundtrack: narration + procedural effects (data/cues.json) + music → data/mix.wav',
    usage: 'mix <project>',
    run({ positionals: [ref], cfg }) { const p = P(ref, cfg); runAudio(cfg, ['mix', p.dir], { project: p }); },
  },
  {
    name: 'voices', group: 'audio', summary: 'list the narration voices',
    usage: 'voices',
    run({ cfg }) { runAudio(cfg, ['voice', '--list']); },
  },
  {
    name: 'effects', group: 'audio', summary: 'list the sound effects and music tracks (incl. plugins) for cue() and script.json "music"',
    usage: 'effects [<project>]',
    run({ positionals: [ref], cfg }) { runAudio(cfg, ['effects'], { project: ref ? P(ref, cfg) : undefined }); },
  },
];
