// Picture: check, cues, review sheets, frames, the final MP4, live preview, a template's style sheet.
// <project> is a project name / path, or @<template> for that template's own example.
import fs from 'node:fs';
import path from 'node:path';
import { loadProject, exampleProject } from '../lib/project.mjs';
import { loadTemplate } from '../lib/templates.mjs';
import { withSession } from '../render/session.mjs';
import { castDrift } from '../lib/characters.mjs';
import { startServer, projectRoutes } from '../render/server.mjs';
import * as modes from '../render/modes.mjs';

export function target(ref, cfg) {
  if (!ref) throw new Error('which project? (a name, a path, or @<template> for its example)');
  return ref.startsWith('@') ? exampleProject(loadTemplate(ref.slice(1), cfg), cfg) : loadProject(ref, cfg);
}
const inProject = (p, f) => path.resolve(p.dir, f);

export const commands = [
  {
    name: 'check', group: 'render', summary: 'boot the film, list shots + captions, draw every 0.25 s; prints CHECK OK',
    usage: 'check <project>',
    async run({ positionals: [ref], cfg }) {
      const p = target(ref, cfg);
      const r = await withSession(p, cfg, (s) => modes.check(s));
      console.log(r.report);
      for (const d of castDrift(p.manifest.cast, cfg)) {
        console.log(`note: made with ${d.id} v${d.pinned}, the library now has v${d.current}${d.level === 'major' ? ' (her LOOK changed: re-check every frame)' : ''}. Update project.json "cast" once reviewed.`);
      }
      if (!p.isExample) {
        fs.mkdirSync(path.join(p.dir, 'review'), { recursive: true });
        fs.writeFileSync(path.join(p.dir, 'review/check.txt'), r.report + '\n');
      }
      return r.ok ? 0 : 1;
    },
  },
  {
    name: 'cues', group: 'render', summary: 'write data/cues.json (the sound cues the shots placed, for the mixer)',
    usage: 'cues <project>',
    async run({ positionals: [ref], cfg }) {
      const p = target(ref, cfg);
      const r = await withSession(p, cfg, (s) => modes.cues(s, p.dir));
      console.log(`data/cues.json: ${r.count} cues, ${r.duration.toFixed(2)} s`);
    },
  },
  {
    name: 'sheet', group: 'render', summary: 'contact sheet for QA: a time-stamped frame every --step s',
    usage: 'sheet <project> [out=review/all.jpg] [--step 0.5] [--cols 10]',
    options: { step: { type: 'string' }, cols: { type: 'string' } },
    async run({ positionals: [ref, out], values, cfg }) {
      const p = target(ref, cfg);
      const r = await withSession(p, cfg, (s) => modes.sheet(s, inProject(p, out || 'review/all.jpg'), { step: +(values.step || cfg.review.sheetStep), cols: +(values.cols || cfg.review.sheetCols) }));
      console.log(`${r.file} (${r.frames} frames, every ${r.step} s)`);
    },
  },
  {
    name: 'frames', group: 'render', summary: 'full-size frames at given times, e.g. "1.2,4.6"',
    usage: 'frames <project> <times> [--out review/frames]',
    options: { out: { type: 'string' } },
    async run({ positionals: [ref, times], values, cfg }) {
      if (!times) throw new Error('give the times, e.g. studio frames my-video "1.2,4.6"');
      const p = target(ref, cfg);
      const ts = times.split(',').map(Number);
      if (ts.some(Number.isNaN)) throw new Error(`bad times "${times}"`);
      const files = await withSession(p, cfg, (s) => modes.frames(s, inProject(p, values.out || 'review/frames'), ts));
      console.log(files.join('\n'));
    },
  },
  {
    name: 'render', group: 'render', summary: 'the film as MP4 with data/mix.wav (--draft = fast, lower quality)',
    usage: 'render <project> [out=renders/<name>.mp4] [--start s] [--end s] [--draft]',
    options: { start: { type: 'string' }, end: { type: 'string' }, draft: { type: 'boolean' } },
    async run({ positionals: [ref, out], values, cfg }) {
      const p = target(ref, cfg), r = cfg.render, draft = !!values.draft;
      const file = inProject(p, out || `renders/${p.name}.mp4`);
      const res = await withSession(p, cfg, (s) => modes.video(s, file, {
        projectDir: p.dir, start: +(values.start || 0), end: values.end != null ? +values.end : undefined, fps: r.fps,
        crf: draft ? r.draftCrf : r.crf, preset: draft ? r.draftPreset : r.preset, quality: draft ? 0.8 : 0.93,
        onProgress: (i, n) => process.stdout.write(`\r${i}/${n} frames`),
      }));
      console.log(`\r${res.file} (${res.frames} frames, ${res.withMix ? 'with data/mix.wav' : 'SILENT: no data/mix.wav'}, ${res.seconds.toFixed(0)} s)`);
    },
  },
  {
    name: 'preview', group: 'render', summary: 'serve the project and print a URL to watch it in your browser',
    usage: 'preview <project> [--port 8765]',
    options: { port: { type: 'string' } },
    async run({ positionals: [ref], values, cfg }) {
      const p = target(ref, cfg);
      const srv = await startServer({ overlay: p.overlay, routes: projectRoutes(p), port: +(values.port || 8765) });
      const u = `http://127.0.0.1:${srv.address().port}`;
      console.log(`film:        ${u}/   (add ?t=12.3 to hold a frame)\nstyle sheet: ${u}/sheet.html\nCtrl+C to stop`);
      await new Promise(() => {});
    },
  },
  {
    name: 'stylesheet', group: 'render', summary: "render a template's style-sheet board to PNG (default: its style-sheet.png)",
    usage: 'stylesheet <template> [out]',
    async run({ positionals: [tid, out], cfg }) {
      const t = loadTemplate(tid, cfg), p = exampleProject(t, cfg);
      if (!p.overlay.resolve('/src/sheet.js')) throw new Error(`template "${tid}" has no src/sheet.js`);
      const file = out ? path.resolve(out) : path.join(t.dir, 'style-sheet.png');
      await withSession(p, cfg, (s) => modes.stylesheet(s, file), { page: 'sheet' });
      console.log(file);
    },
  },
];
