// The production pipeline as data: an ordered list of named steps over one project.
//   timing → lint → check → cues → mix → sheet → render
// `studio build` runs it; --from / --only pick a slice ("I changed only the shots": --from check).
// A step is { name, describe, run(ctx) } and can be added or replaced without touching the CLI.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runAudio } from './python.mjs';
import { lintAll, formatLint } from './lint.mjs';
import { writeVoices } from './voices.mjs';
import { withSession } from '../render/session.mjs';
import * as modes from '../render/modes.mjs';

const STUDIO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

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
    name: 'lint', describe: 'quality gate: title, description, sources, hook, pace, captions, originality, clipped / overlapping text',
    run: async ({ p, cfg, log }) => {
      const r = await lintAll(p, cfg);
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
      // opt-in: template.json "render" { quality: "res=2&aa=8", crf, preset, jpeg } for a heavier final render (not drafts)
      const tr = (!draft && p.template.manifest.render) || {};
      const res = await withSession(p, cfg, (s) => modes.video(s, opts.out || path.join(p.dir, `renders/${p.name}.mp4`), {
        projectDir: p.dir, start: opts.start ?? 0, end: opts.end, fps: r.fps,
        crf: draft ? r.draftCrf : tr.crf ?? r.crf, preset: draft ? r.draftPreset : tr.preset ?? r.preset, quality: draft ? 0.8 : tr.jpeg ?? 0.93,
      }), { query: tr.quality || '' });
      log(`  ${res.file} (${res.frames} frames, ${res.seconds.toFixed(0)} s)`);
      return res;
    },
  },
];

/**
 * Optional: a project with blender/scene.py gets a "plate" step after timing. Blender renders its 3D film frames
 * (plate/frames/*.jpg + plate/plate.json) timed to the narration; the template then draws them under the captions.
 * Every other project keeps exactly STEPS.
 */
export const PLATE = {
  name: 'plate', describe: 'Blender 3D frames → plate/ (projects with blender/scene.py)',
  run: ({ p, cfg, opts, log }) => {
    const bin = cfg.render.blender || 'blender';
    const args = {
      project: p.dir, out: path.join(p.dir, 'plate'), fps: cfg.render.fps, draft: !!opts.draft, frames: opts.plateFrames || null,
      paths: [path.join(p.template.dir, 'blender'), p.channel && path.join(p.channel.dir, 'blender'), path.join(p.dir, 'blender')].filter((d) => d && fs.existsSync(d)),
      assets: p.channel ? path.join(p.channel.dir, 'assets') : null,
    };
    const r = spawnSync(bin, ['-b', '--factory-startup', '--python', path.join(STUDIO_ROOT, 'blender/boot.py'), '--', JSON.stringify(args)],
      { encoding: 'utf8', stdio: opts.quiet ? 'pipe' : 'inherit', maxBuffer: 1 << 28 });
    if (r.error) throw new Error(`could not run Blender (${bin}): ${r.error.message}. Install it (brew install --cask blender) or set render.blender`);
    if (r.status) throw new Error(`Blender failed (exit ${r.status}):\n${(r.stdout || '').split('\n').slice(-40).join('\n')}\n${r.stderr || ''}`);
    const done = /PLATE (\S+) of (\d+)/.exec(r.stdout || '');
    log(`  plate ${done ? `frames ${done[1]} of ${done[2]}` : 'rendered'}`);
  },
};
export const hasPlate = (p) => fs.existsSync(path.join(p.dir, 'blender/scene.py'));
export const stepsFor = (p) => (hasPlate(p) ? [STEPS[0], PLATE, ...STEPS.slice(1)] : STEPS);

/** the steps to run: all, --from <step> onwards, or --only a,b */
export function selectSteps({ from, only, skip = [] } = {}, steps = STEPS) {
  const names = steps.map((s) => s.name);
  for (const n of [from, ...(only || []), ...skip].filter(Boolean)) if (!names.includes(n)) throw new Error(`unknown step "${n}" (steps: ${names.join(', ')})`);
  let out = steps;
  if (from) out = out.slice(names.indexOf(from));
  if (only?.length) out = out.filter((s) => only.includes(s.name));
  return out.filter((s) => !skip.includes(s.name));
}

export async function runPipeline(p, cfg, opts = {}, { steps = selectSteps(opts, stepsFor(p)), log = console.log } = {}) {
  const results = {};
  for (const step of steps) {
    const t0 = Date.now();
    if (!opts.quiet) log(`▸ ${step.name}: ${step.describe}`);
    // quiet: a step's own lines are kept only when they say more than "done" (warnings, counts, files)
    const said = [], stepLog = opts.quiet ? (m) => said.push(m) : log;
    try { results[step.name] = await step.run({ p, cfg, opts, log: stepLog }); } catch (e) {
      if (opts.quiet) { said.forEach((m) => log(m)); e.message = `${step.name}: ${e.message}`; }
      throw e;
    }
    const secs = `${((Date.now() - t0) / 1000).toFixed(1)} s`;
    if (!opts.quiet) log(`  (${secs})`);
    else log(`✓ ${step.name.padEnd(7)} ${secs.padStart(7)}  ${said.map((m) => m.trim()).filter((m) => !/^\S+ ✓$/.test(m)).join('\n')}`.trimEnd());
  }
  return results;
}
