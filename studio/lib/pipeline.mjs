// The production pipeline as data: an ordered list of named steps over one project.
//   timing → lint → check → cues → mix → sheet → render
// `studio build` runs it; --from / --only pick a slice ("I changed only the shots": --from check).
// A step is { name, describe, run(ctx) } and can be added or replaced without touching the CLI.
import path from 'node:path';
import { runAudio } from './python.mjs';
import { lintProject, formatLint } from './lint.mjs';
import { writeVoices } from './voices.mjs';
import { withSession } from '../render/session.mjs';
import * as modes from '../render/modes.mjs';

/** timing source: "voice" (AI narration + Whisper), "estimate" (no audio), "audio:<file>" (your own recording), "keep" */
function timingArgs(timing) {
  if (timing === 'voice') return [['voice'], ['words']];
  if (timing === 'estimate') return [['estimate']];
  if (timing?.startsWith('audio:')) return [['words', '--audio', path.resolve(timing.slice(6))]];
  if (timing === 'keep') return [];
  throw new Error(`unknown timing "${timing}" (voice | estimate | audio:<file> | keep)`);
}

export const STEPS = [
  {
    name: 'timing', describe: 'narration + word timings (or an estimate)',
    run: ({ p, cfg, opts, log }) => {
      writeVoices(p, cfg);
      for (const [cmd, ...rest] of timingArgs(opts.timing || 'voice')) {
        const extra = cmd === 'voice' && opts.voice ? ['--voice', opts.voice] : [];
        runAudio(cfg, [cmd, p.dir, ...rest, ...extra], { project: p, quiet: opts.quiet });
        log(`  ${cmd} ✓`);
      }
    },
  },
  {
    name: 'lint', describe: 'quality gate: title, description, sources, hook, pace, captions, originality',
    run: ({ p, cfg, log }) => {
      const r = lintProject(p, cfg);
      if (r.errors.length) throw new Error(`lint failed (fix these, then build again):\n${formatLint(r)}`);
      log(`  LINT OK${r.warnings.length ? `, ${r.warnings.length} warning(s):\n${formatLint(r)}` : ''}`);
      return r;
    },
  },
  {
    name: 'check', describe: 'boot + draw every 0.25 s',
    run: async ({ p, cfg, log }) => {
      const r = await withSession(p, cfg, (s) => modes.check(s));
      if (!r.ok) throw new Error('check failed:\n' + r.report);
      log(`  CHECK OK (${r.duration.toFixed(2)} s)`);
    },
  },
  {
    name: 'cues', describe: 'sound cues from the shots',
    run: async ({ p, cfg, log }) => { const r = await withSession(p, cfg, (s) => modes.cues(s, p.dir)); log(`  ${r.count} cues`); },
  },
  {
    name: 'mix', describe: 'voice + effects + music → data/mix.wav',
    run: ({ p, cfg, opts, log }) => { runAudio(cfg, ['mix', p.dir], { project: p, quiet: opts.quiet }); log('  data/mix.wav ✓'); },
  },
  {
    name: 'sheet', describe: 'QA contact sheet → review/all.jpg',
    run: async ({ p, cfg, log }) => {
      const r = await withSession(p, cfg, (s) => modes.sheet(s, path.join(p.dir, 'review/all.jpg'), { step: cfg.review.sheetStep, cols: cfg.review.sheetCols }));
      log(`  ${r.file}`);
    },
  },
  {
    name: 'render', describe: 'final MP4 → renders/<name>.mp4',
    run: async ({ p, cfg, opts, log }) => {
      const r = cfg.render, draft = !!opts.draft;
      const res = await withSession(p, cfg, (s) => modes.video(s, opts.out || path.join(p.dir, `renders/${p.name}.mp4`), {
        projectDir: p.dir, start: opts.start ?? 0, end: opts.end, fps: r.fps,
        crf: draft ? r.draftCrf : r.crf, preset: draft ? r.draftPreset : r.preset, quality: draft ? 0.8 : 0.93,
      }));
      log(`  ${res.file} (${res.frames} frames, ${res.seconds.toFixed(0)} s)`);
      return res;
    },
  },
];

/** the steps to run: all, --from <step> onwards, or --only a,b */
export function selectSteps({ from, only, skip = [] } = {}, steps = STEPS) {
  const names = steps.map((s) => s.name);
  for (const n of [from, ...(only || []), ...skip].filter(Boolean)) if (!names.includes(n)) throw new Error(`unknown step "${n}" (steps: ${names.join(', ')})`);
  let out = steps;
  if (from) out = out.slice(names.indexOf(from));
  if (only?.length) out = out.filter((s) => only.includes(s.name));
  return out.filter((s) => !skip.includes(s.name));
}

export async function runPipeline(p, cfg, opts = {}, { steps = selectSteps(opts), log = console.log } = {}) {
  const results = {};
  for (const step of steps) {
    const t0 = Date.now();
    log(`▸ ${step.name}: ${step.describe}`);
    results[step.name] = await step.run({ p, cfg, opts, log });
    log(`  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  }
  return results;
}
