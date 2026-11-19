// The working loop around one video, read from what exists (nothing is stored, so it can't go stale):
//   brief   what to know and read before planning (channel, episode, template, cast, rules)
//   plan    the plan screen from script.json (narration per cut, caption chunks, shot notes, timing, sources)
//   status  where each video is in the pipeline, and the next command to run
import fs from 'node:fs';
import path from 'node:path';
import { readJson, deepMerge } from './config.mjs';
import { QUALITY_DEFAULTS, scriptText } from './lint.mjs';

const mtime = (f) => (fs.existsSync(f) ? fs.statSync(f).mtimeMs : 0);
const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null);

/** the quality thresholds a channel's videos are held to */
export const qualityFor = (cfg, channel) => deepMerge(QUALITY_DEFAULTS, cfg.quality, channel?.manifest.quality);

/**
 * Timing without a voice, the same model as python/studio_audio/estimate.py (each word's length from its letters,
 * pauses after commas and mid-line full stops) → { duration, lines: [{ i, text, start, end }] }
 */
export function estimateTiming(script, wps = 2.8) {
  const speed = script.speed ?? 1;
  let t = script.lead ?? 0.4;
  const lines = (script.lines || []).map((ln, i) => {
    const toks = ln.text.split(/\s+/).filter(Boolean), letters = toks.map((w) => w.replace(/[^A-Za-z0-9]/g, '').length || 1);
    const unit = toks.length / (wps * speed) / letters.reduce((a, l) => a + l + 2.5, 0), start = t;
    toks.forEach((w, k) => { t += (letters[k] + 2.5) * unit; if (w.endsWith(',')) t += 0.16; else if (/[.?!]$/.test(w) && k < toks.length - 1) t += 0.32; });
    const out = { i, text: ln.text, start: +start.toFixed(3), end: +t.toFixed(3) };
    t += ln.gap ?? script.gap ?? 0.32;
    return out;
  });
  return { duration: lines.length ? +(lines.at(-1).end + (script.outro ?? 0.9)).toFixed(3) : 0, estimated: true, lines };
}

/**
 * still the template's example? A file counts as untouched when it equals the example's AND hasn't been written since
 * `studio new` (a pilot whose files later became the template's example is not untouched).
 */
export function untouched(dir, template, created) {
  const ex = path.join(template.dir, 'example'), since = created ? Date.parse(created) + 2000 : Infinity;
  const fresh = (rel) => mtime(path.join(dir, rel)) <= since;
  const scriptOf = (d) => { const f = path.join(d, 'script.json'); return fs.existsSync(f) ? scriptText(readJson(f)) : null; };
  const shots = read(path.join(dir, 'src/shots.js'));
  return {
    script: scriptOf(dir) === scriptOf(ex) && fresh('script.json'),
    shots: shots != null && shots === read(path.join(ex, 'src/shots.js')) && fresh('src/shots.js'),
  };
}

/** data/lines.json, when it times exactly this script's lines (real voice or estimate), else null */
export function timingFor(dir, script) {
  const f = path.join(dir, 'data/lines.json'), lines = script.lines || [];
  const t = fs.existsSync(f) ? readJson(f) : null;
  return t?.lines?.length === lines.length && t.lines.every((l, i) => l.text === lines[i].text) ? t : null;
}

export const STAGES = ['script', 'timing', 'shots', 'cues', 'mix', 'sheet', 'render'];

/**
 * each stage of a project as done | stale (older than what it was made from) | todo, and the next thing to do.
 * project: { dir, name, ref, manifest }, template: its loaded template
 */
export function progress(project, template) {
  const f = (rel) => path.join(project.dir, rel), ex = untouched(project.dir, template, project.manifest?.created);
  const script = readJson(f('script.json'));
  const m = {
    lines: mtime(f('data/lines.json')), shots: mtime(f('src/shots.js')), cues: mtime(f('data/cues.json')),
    mix: mtime(f('data/mix.wav')), sheet: mtime(f('review/all.jpg')), render: mtime(f(`renders/${project.name}.mp4`)),
  };
  const made = (own, ...from) => (!own ? 'todo' : own + 1 < Math.max(...from) ? 'stale' : 'done');   // 1 ms: same write
  const st = {
    script: ex.script ? 'todo' : 'done',
    timing: !m.lines ? 'todo' : timingFor(project.dir, script) ? 'done' : 'stale',
    shots: ex.shots ? 'todo' : 'done',
    cues: made(m.cues, m.shots, m.lines),
    mix: made(m.mix, m.cues, m.lines),
    sheet: made(m.sheet, m.shots, m.lines),
    render: made(m.render, m.mix, m.shots, m.lines),
  };
  const ref = project.ref, first = STAGES.find((s) => st[s] !== 'done');
  const next = {
    script: `write script.json, then: studio plan ${ref}`,
    timing: `studio build ${ref} --only timing`,
    shots: 'write src/shots.js',
    cues: `studio build ${ref} --from lint`,
    mix: `studio build ${ref} --from mix`,
    sheet: `studio build ${ref} --from sheet`,
    render: `studio build ${ref} --only render`,
  }[first] || 'look at review/all.jpg and score it (quality.md); publish only when asked';
  return { stages: st, next };
}

export const MARK = { done: '✓', stale: '~', todo: '·' };
export const formatStages = (st) => STAGES.map((s) => `${s} ${MARK[st[s]]}`).join('  ');
