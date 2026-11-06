// The quality gate: rules every channel video must pass before it is rendered for real. Run as the `lint` step of
// `studio build` (after timing, so the real voice timings are known) and by `studio lint`.
// Errors block a channel video; warnings are shown. Videos without a channel only get warnings (scratch work).
// Thresholds: config.quality < channel.json "quality" (e.g. fiction channels set minSources: 0).
import fs from 'node:fs';
import path from 'node:path';
import { readJson, deepMerge } from './config.mjs';
import { listProjects } from './project.mjs';

export const QUALITY_DEFAULTS = {
  titleMax: 70, titleWarn: 55, minDescription: 40, minTags: 3, minSources: 2,
  hookMaxS: 2.6, wpsMin: 2.4, wpsMax: 3.7, lineMaxS: 4.5, captionMaxWords: 3,
  maxSimilarity: 0.3, lengthS: null,
};

const words = (s) => (s.toLowerCase().match(/[a-z0-9']+/g) || []);
const shingles = (s, n = 3) => { const w = words(s), out = new Set(); for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' ')); return out; };

/** share of the smaller script's 3-word phrases that also appear in the other (0 = nothing shared, 1 = a copy) */
export function similarity(a, b) {
  const A = shingles(a), B = shingles(b);
  if (!A.size || !B.size) return 0;
  let common = 0;
  for (const x of A) if (B.has(x)) common++;
  return common / Math.min(A.size, B.size);
}

export const scriptText = (script) => (script.lines || []).map((l) => l.text).join(' ');

/** caption chunks of a line: "WHY DOES YOUR | FACE TURN *RED?" → [{ words: [...], highlights: n }] */
export function captionChunks(caps = '') {
  return caps.split('|').map((c) => c.trim()).filter(Boolean).map((c) => {
    const w = c.split(/\s+/);
    return { text: c, words: w, highlights: w.filter((x) => x.startsWith('*')).length };
  });
}

/**
 * lint one project. inputs: { script, lines (data/lines.json or null), channel (manifest or null), others: [{ ref, title, text }] }
 * → { errors: [], warnings: [] }
 */
export function lintScript({ script, lines, channel, others = [], quality = {} }) {
  const q = deepMerge(QUALITY_DEFAULTS, quality, channel?.quality);
  const errors = [], warnings = [];
  const title = script.title || '';
  if (!title) errors.push('no "title"');
  else if (title.length > q.titleMax) errors.push(`title is ${title.length} chars (max ${q.titleMax})`);
  else if (title.length > q.titleWarn) warnings.push(`title is ${title.length} chars: under ${q.titleWarn} reads better on a phone`);
  if ((script.description || '').length < q.minDescription) errors.push(`"description" missing or under ${q.minDescription} chars (what the viewer learns, no spoilers)`);
  if ((script.tags || []).length < q.minTags) errors.push(`needs at least ${q.minTags} "tags"`);
  if ((script.sources || []).length < q.minSources) errors.push(`needs at least ${q.minSources} "sources" (every fact checked)`);
  const ls = script.lines || [];
  if (!ls.length) errors.push('no "lines"');

  ls.forEach((l, i) => {
    if (!l.caps) { errors.push(`line ${i + 1}: no "caps"`); return; }
    for (const c of captionChunks(l.caps)) {
      if (c.words.length > q.captionMaxWords + 1) errors.push(`line ${i + 1}: caption "${c.text}" has ${c.words.length} words (max ${q.captionMaxWords})`);
      else if (c.words.length > q.captionMaxWords) warnings.push(`line ${i + 1}: caption "${c.text}" has ${c.words.length} words`);
      if (c.highlights > 1) errors.push(`line ${i + 1}: caption "${c.text}" highlights ${c.highlights} words (one at most)`);
    }
  });

  if (lines?.lines?.length) {
    const L = lines.lines, hook = L[0].end - L[0].start;
    if (hook > q.hookMaxS) warnings.push(`the hook (line 1) takes ${hook.toFixed(1)} s: aim for ≤ ${q.hookMaxS} s`);
    const speech = L.reduce((s, l) => s + (l.end - l.start), 0), n = L.reduce((s, l) => s + words(l.text).length, 0);
    const wps = speech > 0 ? n / speech : 0;
    if (wps && (wps < q.wpsMin || wps > q.wpsMax)) warnings.push(`speaking rate ${wps.toFixed(2)} words/s (aim ${q.wpsMin}-${q.wpsMax})`);
    for (const l of L) if (l.end - l.start > q.lineMaxS) warnings.push(`line ${l.i + 1} holds one picture for ${(l.end - l.start).toFixed(1)} s: split it into two cuts`);
    if (Array.isArray(q.lengthS) && lines.duration) {
      const [lo, hi] = q.lengthS;
      if (lines.duration < lo || lines.duration > hi) warnings.push(`length ${lines.duration.toFixed(1)} s (channel aims ${lo}-${hi} s)`);
    }
  } else warnings.push('no data/lines.json yet: timing rules skipped (run the timing step)');

  const mine = scriptText(script);
  for (const o of others) {
    if (o.title && title && o.title.trim().toLowerCase() === title.trim().toLowerCase()) errors.push(`same title as ${o.ref}`);
    const s = similarity(mine, o.text);
    if (s > q.maxSimilarity) errors.push(`${Math.round(s * 100)}% of its phrasing repeats ${o.ref}: rewrite it (YouTube demonetizes mass-produced, repetitive content)`);
  }
  return { errors, warnings };
}

/** lint a loaded project against its channel's other videos */
export function lintProject(p, cfg) {
  const script = p.script();
  const lf = path.join(p.dir, 'data/lines.json');
  const others = p.channel
    ? listProjects(cfg, { channel: p.channel.id }).filter((o) => o.dir !== p.dir).flatMap((o) => {
      const f = path.join(o.dir, 'script.json');
      if (!fs.existsSync(f)) return [];
      const s = readJson(f);
      return [{ ref: o.ref, title: s.title, text: scriptText(s) }];
    })
    : [];
  const r = lintScript({ script, lines: fs.existsSync(lf) ? readJson(lf) : null, channel: p.channel?.manifest, others, quality: cfg.quality });
  if (!p.channel) { r.warnings.unshift(...r.errors); r.errors = []; }
  return r;
}

export const formatLint = (r) => [...r.errors.map((e) => `  ✗ ${e}`), ...r.warnings.map((w) => `  ! ${w}`)].join('\n');
