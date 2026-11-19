// End-to-end: build one project, or prove every template works on this computer.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadProject, createProject } from '../lib/project.mjs';
import { listTemplates } from '../lib/templates.mjs';
import { loadChannel } from '../lib/channels.mjs';
import { runPipeline, selectSteps, stepsFor, STEPS, PLATE } from '../lib/pipeline.mjs';

const list = (s) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : undefined);

/** mean loudness of a media file in dB (ffmpeg volumedetect), or -99 */
export function meanVolume(file) {
  const r = spawnSync('ffmpeg', ['-v', 'info', '-i', file, '-af', 'volumedetect', '-vn', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = /mean_volume:\s*(-?[\d.]+)/.exec(r.stderr || '');
  return m ? +m[1] : -99;
}

export const commands = [
  {
    name: 'build', group: 'pipeline', summary: 'the whole pipeline: timing → check → cues → mix → sheet → render',
    usage: 'build <project> [--timing voice|estimate|audio:<file>|keep] [--from step] [--only a,b] [--skip a,b] [--draft] [--voice id] [--verbose]',
    details: `steps: ${STEPS.map((s) => `${s.name} (${s.describe})`).join(' · ')}\nOptional: ${PLATE.name} (${PLATE.describe}), run after timing only for those projects.\nOutput is one line per step plus anything that needs attention (lint warnings, failures with their full log); --verbose streams every tool's output.`,
    options: { timing: { type: 'string' }, from: { type: 'string' }, only: { type: 'string' }, skip: { type: 'string' }, draft: { type: 'boolean' }, voice: { type: 'string' }, verbose: { type: 'boolean' } },
    async run({ positionals: [ref], values, cfg }) {
      const p = loadProject(ref, cfg);
      const opts = { timing: values.timing || 'voice', draft: values.draft, voice: values.voice, from: values.from, only: list(values.only), skip: list(values.skip), quiet: !values.verbose };
      await runPipeline(p, cfg, opts, { steps: selectSteps(opts, stepsFor(p)) });
      console.log(`done. Look at ${path.join(p.dir, 'review/all.jpg')} before sharing.`);
    },
  },
  {
    name: 'selftest', group: 'pipeline', summary: 'prove every template renders here (a 4 s clip with sound each); prints SELFTEST PASSED',
    usage: 'selftest [--no-voice] [--templates a,b]',
    options: { 'no-voice': { type: 'boolean' }, templates: { type: 'string' } },
    async run({ values, cfg }) {
      const only = list(values.templates);
      const tpls = listTemplates(cfg).filter((t) => !only || only.includes(t.id));
      const root = path.join(cfg.studioHome, 'selftest');
      fs.rmSync(root, { recursive: true, force: true });
      let fail = 0;
      for (const t of tpls) {
        const t0 = Date.now(), logs = [];
        try {
          const channel = t.owner ? loadChannel(t.owner, cfg) : null;   // a channel's own template renders with its cast
          const dir = createProject({ template: t, name: t.id, cfg, parent: root, channel });
          const p = loadProject(dir, cfg);
          const opts = { timing: values['no-voice'] ? 'estimate' : 'voice', draft: true, start: 2, end: 6, out: path.join(dir, 'renders/selftest.mp4'), quiet: true, skip: ['lint'] };
          await runPipeline(p, cfg, opts, { steps: selectSteps(opts, stepsFor(p)), log: (m) => logs.push(m) });
          const db = meanVolume(path.join(dir, 'renders/selftest.mp4'));
          if (db <= -50) throw new Error(`clip is silent (${db} dB)`);
          console.log(`${t.id.padEnd(13)} ok, ${((Date.now() - t0) / 1000).toFixed(0)} s · sheet: ${path.join(dir, 'review/all.jpg')}`);
        } catch (e) {
          fail++;
          console.log(`${t.id.padEnd(13)} FAILED: ${e.message.split('\n')[0]}`);
          fs.mkdirSync(root, { recursive: true });
          fs.writeFileSync(path.join(root, `${t.id}.log`), logs.join('\n') + '\n' + e.stack);
        }
      }
      console.log(fail ? `SELFTEST FAILED (logs in ${root})` : 'SELFTEST PASSED');
      return fail ? 1 : 0;
    },
  },
];
