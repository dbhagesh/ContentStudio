// The quality gate: rules every channel video must pass before it is rendered for real. Run as the `lint` step of
// `studio build` (after timing, so the real voice timings are known) and by `studio lint`.
// Errors block a channel video; warnings are shown. Videos without a channel only get warnings (scratch work).
// Thresholds: config.quality < channel.json "quality" (e.g. fiction channels set minSources: 0).
// Two passes: the script rules (lintScript, instant) and the picture rules (lintText over the text every frame draws,
// sampled in headless Chrome): text clipped by the frame edge, and text that overlaps the captions or other text.
import fs from 'node:fs';
import path from 'node:path';
import { readJson, deepMerge } from './config.mjs';
import { listProjects } from './project.mjs';
import { withSession } from '../render/session.mjs';
import { textLayout } from '../render/modes.mjs';

export const QUALITY_DEFAULTS = {
  titleMax: 70, titleWarn: 55, minDescription: 40, minTags: 3, minSources: 2,
  hookMaxS: 2.6, wpsMin: 2.4, wpsMax: 3.7, lineMaxS: 4.5, captionMaxWords: 3,
  maxSimilarity: 0.3, lengthS: null,
  // picture: sample every textStep s; a text problem that lasts textWarnS is a warning, textErrorS an error (text that
  // slides in from off-frame is clipped for a moment on purpose). textEdge: px of overshoot tolerated; textOverlap: the
  // share of the smaller box two texts may cover before they count as overlapping.
  textStep: 0.25, textWarnS: 0.5, textErrorS: 1.0, textEdge: 4, textOverlap: 0.1,
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
  } else warnings.push('no data/lines.json yet: timing and picture rules skipped (run the timing step)');

  const mine = scriptText(script);
  for (const o of others) {
    if (o.title && title && o.title.trim().toLowerCase() === title.trim().toLowerCase()) errors.push(`same title as ${o.ref}`);
    const s = similarity(mine, o.text);
    if (s > q.maxSimilarity) errors.push(`${Math.round(s * 100)}% of its phrasing repeats ${o.ref}: rewrite it (YouTube demonetizes mass-produced, repetitive content)`);
  }
  return { errors, warnings };
}

const area = (b) => Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);
/** the share of the smaller box that the two boxes [x0, y0, x1, y1] have in common */
export function overlapShare(a, b) {
  const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
  return w > 0 && h > 0 ? (w * h) / Math.max(1, Math.min(area(a), area(b))) : 0;
}

/** do two convex polygons [[x, y], ...] overlap by more than a pixel? (separating axis test) */
export function quadsMeet(a, b) {
  for (const poly of [a, b]) for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % poly.length], len = Math.hypot(x1 - x0, y1 - y0);
    if (!len) continue;
    const nx = (y0 - y1) / len, ny = (x1 - x0) / len, proj = (p) => p.map(([x, y]) => x * nx + y * ny);
    const pa = proj(a), pb = proj(b);
    if (Math.min(Math.max(...pa), Math.max(...pb)) - Math.max(Math.min(...pa), Math.min(...pb)) <= 1) return false;
  }
  return true;
}

const quadOf = (b) => [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];
/** two texts overlap: their boxes share enough area, and their actual (maybe rotated) outlines meet */
const overlaps = (a, b, share) => overlapShare(a.box, b.box) > share && a.quads.some((p) => b.quads.some((r) => quadsMeet(p, r)));

/** one text drawn several times (outline, shadow, fill) becomes one entry */
function mergeTexts(texts) {
  const out = [];
  for (const x of texts) {
    const m = out.find((o) => o.text === x.text && o.layer === x.layer && overlapShare(o.box, x.box) > 0);
    const quad = x.quad || quadOf(x.box);
    if (m) { m.box = [Math.min(m.box[0], x.box[0]), Math.min(m.box[1], x.box[1]), Math.max(m.box[2], x.box[2]), Math.max(m.box[3], x.box[3])]; m.quads.push(quad); }
    else out.push({ text: x.text, layer: x.layer, box: [...x.box], quads: [quad] });
  }
  return out;
}

const quote = (s) => `"${s.length > 40 ? s.slice(0, 39) + '…' : s}"`;

/**
 * the picture rules over a text layout (modes.textLayout: { width, height, duration, step, frames: [{ t, texts: [{ text, layer, box, quad }] }] }):
 * text clipped by the frame edge, shot text over the captions, and two shot texts over each other
 * → { errors: [], warnings: [] }
 */
export function lintText(layout, { channel, quality = {} } = {}) {
  const q = deepMerge(QUALITY_DEFAULTS, quality, channel?.quality);
  const { width: W, height: H, step, duration } = layout, found = new Map();
  const note = (key, t, make) => { const f = found.get(key) || found.set(key, { times: [], ...make() }).get(key); f.times.push(t); return f; };
  for (const { t, texts } of layout.frames) {
    const all = mergeTexts(texts.filter((x) => x.box[2] - x.box[0] >= 2 && x.box[3] - x.box[1] >= 2)), shot = all.filter((x) => x.layer !== 'caption'), caps = all.filter((x) => x.layer === 'caption');
    for (const x of all) {
      const [x0, y0, x1, y1] = x.box, off = { left: -x0, top: -y0, right: x1 - W, bottom: y1 - H };
      const [side, px] = Object.entries(off).sort((a, b) => b[1] - a[1])[0];
      if (px <= q.textEdge) continue;
      const f = note(`clip|${x.layer}|${x.text}`, t, () => ({ say: () => `${x.layer === 'caption' ? 'caption' : 'text'} ${quote(x.text)} is cut off: it runs ${f.px} px past the ${f.side} edge` }));
      if (!(f.px >= px)) Object.assign(f, { px: Math.round(px), side });
    }
    for (const x of shot) {
      const hit = caps.filter((c) => overlaps(x, c, q.textOverlap));
      if (hit.length) {
        const f = note(`cap|${x.text}`, t, () => ({ words: new Set(), say: () => `text ${quote(x.text)} overlaps the caption (${[...f.words].slice(0, 4).map(quote).join(', ')})` }));
        hit.forEach((c) => f.words.add(c.text));
      }
    }
    for (let i = 0; i < shot.length; i++) for (let j = i + 1; j < shot.length; j++) {
      const [a, b] = [shot[i], shot[j]].sort((m, n) => m.text.localeCompare(n.text));
      if (a.text !== b.text && overlaps(a, b, q.textOverlap)) note(`pair|${a.text}|${b.text}`, t, () => ({ say: () => `texts ${quote(a.text)} and ${quote(b.text)} overlap` }));
    }
  }
  const errors = [], warnings = [], out = [];
  for (const f of found.values()) {
    // consecutive samples form one span; a span that lasts long enough is reported
    let a = f.times[0], prev = a;
    const close = () => {
      const len = prev - a + step, at = `at ${a.toFixed(2)}–${Math.min(prev + step, duration).toFixed(2)} s`;
      if (len >= q.textErrorS - 1e-6) out.push({ t: a, list: errors, msg: `${f.say()} ${at}` });
      else if (len >= q.textWarnS - 1e-6) out.push({ t: a, list: warnings, msg: `${f.say()} ${at}` });
    };
    for (const t of f.times.slice(1)) { if (t - prev > step * 1.5) { close(); a = t; } prev = t; }
    close();
  }
  for (const o of out.sort((m, n) => m.t - n.t)) o.list.push(o.msg);
  return { errors, warnings };
}

/** a scratch video (no channel) only gets warnings */
const scratch = (p, r) => { if (!p.channel) { r.warnings.unshift(...r.errors); r.errors = []; } return r; };

/** the picture rules for a loaded project (headless Chrome; needs data/lines.json) */
export async function lintPicture(p, cfg) {
  const q = deepMerge(QUALITY_DEFAULTS, cfg.quality, p.channel?.manifest.quality);
  const layout = await withSession(p, cfg, (s) => textLayout(s, { step: q.textStep }));
  return scratch(p, lintText(layout, { quality: q }));
}

/** script rules, then picture rules (skipped without timing, or with picture: false) */
export async function lintAll(p, cfg, { picture = true } = {}) {
  const r = lintProject(p, cfg);
  if (picture && fs.existsSync(path.join(p.dir, 'data/lines.json'))) {
    const pic = await lintPicture(p, cfg);
    r.errors.push(...pic.errors); r.warnings.push(...pic.warnings);
  }
  return r;
}

/** lint a loaded project against its channel's other videos (the script rules) */
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
  return scratch(p, lintScript({ script, lines: fs.existsSync(lf) ? readJson(lf) : null, channel: p.channel?.manifest, others, quality: cfg.quality }));
}

export const formatLint = (r) => [...r.errors.map((e) => `  ✗ ${e}`), ...r.warnings.map((w) => `  ! ${w}`)].join('\n');
