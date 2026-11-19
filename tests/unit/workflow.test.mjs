import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { lintText, overlapShare, quadsMeet } from '../../studio/lib/lint.mjs';
import { estimateTiming, untouched, timingFor, progress } from '../../studio/lib/workflow.mjs';
import { loadChannel } from '../../studio/lib/channels.mjs';
import { addEpisode } from '../../studio/lib/backlog.mjs';
import { createProject, loadProject } from '../../studio/lib/project.mjs';
import { loadTemplate } from '../../studio/lib/templates.mjs';
import { commands } from '../../studio/commands/workflow.mjs';
import { testConfig, writeJson } from './helpers.mjs';

/** a text layout sampled every 0.25 s: frames(n, t => texts) */
const layout = (n, at) => ({ width: 1080, height: 1920, duration: n * 0.25, step: 0.25, frames: Array.from({ length: n }, (_, i) => ({ t: i * 0.25, texts: at(i * 0.25) })) });
const shot = (text, box) => ({ text, layer: 'shot', box });
const cap = (text, box) => ({ text, layer: 'caption', box });

test('overlapShare: share of the smaller box', () => {
  assert.equal(overlapShare([0, 0, 10, 10], [20, 20, 30, 30]), 0);
  assert.equal(overlapShare([0, 0, 10, 10], [5, 0, 15, 10]), 0.5);
  assert.equal(overlapShare([0, 0, 100, 100], [10, 10, 20, 20]), 1);
});

test('lintText: clipped text is an error when it stays, a warning when brief, fine when it only slides in', () => {
  const off = (from, to) => layout(12, (t) => [shot('BIG LABEL', t >= from && t < to ? [800, 100, 1140, 180] : [600, 100, 940, 180])]);
  const long = lintText(off(0.5, 2));
  assert.equal(long.errors.length, 1);
  assert.match(long.errors[0], /"BIG LABEL" is cut off: it runs 60 px past the right edge at 0\.50–2\.00 s/);
  assert.match(lintText(off(0.5, 1)).warnings.join(), /cut off/);
  assert.deepEqual(lintText(off(0.5, 0.75)), { errors: [], warnings: [] });
  assert.deepEqual(lintText(layout(8, () => [shot('EDGE', [-3, 0, 100, 50])])), { errors: [], warnings: [] }, 'within textEdge');
  assert.match(lintText(layout(8, () => [cap('WORD', [400, 1880, 700, 1990])])).errors[0], /caption "WORD" is cut off.*bottom/);
});

test('lintText: text over the captions and over other text', () => {
  const r = lintText(layout(8, (t) => [shot('LABEL', [300, 1380, 700, 1460]), cap(t < 1 ? 'SWALLOW' : 'GUM', [350, 1400, 750, 1500]), shot('ONE', [100, 100, 300, 160]), shot('TWO', [150, 110, 350, 170])]));
  assert.equal(r.errors.length, 2, r.errors.join('\n'));
  assert.match(r.errors.join('\n'), /text "LABEL" overlaps the caption \("SWALLOW", "GUM"\) at 0\.00–2\.00 s/);
  assert.match(r.errors.join('\n'), /texts "ONE" and "TWO" overlap/);
});

test('lintText: one text drawn several times (outline, shadow, fill) is not an overlap; empty boxes are ignored', () => {
  const r = lintText(layout(8, () => [shot('POP', [100, 100, 300, 160]), shot('POP', [96, 96, 304, 174]), cap('A', [400, 1400, 450, 1450]), cap('B', [460, 1400, 520, 1450]), shot('0', [2000, 50, 2000, 50])]));
  assert.deepEqual(r, { errors: [], warnings: [] });
});

test('lintText: channel quality settings change the thresholds', () => {
  const l = layout(8, () => [shot('X', [1000, 0, 1100, 50])]);
  assert.equal(lintText(l).errors.length, 1);
  assert.equal(lintText(l, { channel: { quality: { textErrorS: 5, textWarnS: 5 } } }).errors.length, 0);
});

test('estimateTiming: lead, gaps, outro, pauses', () => {
  const t = estimateTiming({ lead: 0.5, gap: 0.3, outro: 1, lines: [{ text: 'one two three' }, { text: 'four, five. six seven' }] });
  assert.equal(t.lines[0].start, 0.5);
  assert.ok(Math.abs(t.lines[1].start - (t.lines[0].end + 0.3)) < 1e-3);
  assert.ok(t.lines[1].end - t.lines[1].start > 4 / 2.8 + 0.4, 'comma + full stop pauses');
  assert.ok(Math.abs(t.duration - (t.lines[1].end + 1)) < 1e-3);
});

/** a demo-channel project made from a backlog episode */
function demoProject(cfg, id = 'why-blush') {
  const ch = loadChannel('demo', cfg);
  addEpisode(ch, { id, title: 'Why Do You Blush?', sources: ['s1', 's2'] });
  return loadProject(createProject({ template: loadTemplate('inside-out', cfg), name: id, cfg, channel: ch }), cfg);
}

test('progress: a new project starts at the script, and each stage follows what it was made from', () => {
  const cfg = testConfig(), p = demoProject(cfg);
  let pr = progress(p, p.template);
  assert.equal(pr.stages.script, 'todo');
  assert.equal(pr.stages.shots, 'todo');
  assert.match(pr.next, /write script\.json/);
  const sf = path.join(p.dir, 'script.json'), script = JSON.parse(fs.readFileSync(sf, 'utf8'));
  script.lines = [{ text: 'Why does your face turn red?', caps: 'WHY DOES YOUR | FACE TURN *RED?' }];
  writeJson(sf, script);
  fs.utimesSync(sf, new Date(Date.now() + 5000), new Date(Date.now() + 5000));
  assert.equal(untouched(p.dir, p.template, p.manifest.created).script, false);
  assert.equal(timingFor(p.dir, script), null, 'old timing no longer fits the script');
  pr = progress(p, p.template);
  assert.equal(pr.stages.script, 'done');
  assert.equal(pr.stages.timing, 'stale');
  assert.match(pr.next, /--only timing/);
  writeJson(path.join(p.dir, 'data/lines.json'), { duration: 3, lines: [{ i: 0, text: script.lines[0].text, start: 0.4, end: 2.4 }] });
  assert.equal(progress(p, p.template).stages.timing, 'done');
  // a pilot whose script later became the example is not "untouched": it was written after studio new
  assert.equal(untouched(p.dir, p.template, '2000-01-01T00:00:00Z').script, false);
});

/** run a command, capturing what it prints */
async function run(name, args) {
  const out = [], log = console.log;
  console.log = (...a) => out.push(a.join(' '));
  try { return { code: await commands.find((c) => c.name === name).run(args), out: out.join('\n') }; } finally { console.log = log; }
}

test('brief: channel, episode, template, cast, rules and the files to read in order', async () => {
  const cfg = testConfig(), ch = loadChannel('demo', cfg);
  addEpisode(ch, { id: 'idea-one', title: 'An Idea', hook: 'A hook line', sources: ['Somewhere, 2020'] });
  const { code, out } = await run('brief', { positionals: [], values: { channel: 'demo', episode: 'idea-one' }, cfg });
  assert.equal(code, 0);
  for (const m of ['BRIEF  Demo Channel', 'episode:   idea-one  "An Idea"  ·  idea', 'hook: A hook line', 'template:  inside-out', 'cast:      mascot', 'no clipped or overlapping text', 'READ, IN THIS ORDER', 'from-backlog idea-one']) assert.ok(out.includes(m), m);
  const order = ['BIBLE.md', 'STYLE.md', 'CHARACTER.md', 'quality.md'].map((f) => out.indexOf(f));
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'bible → style → characters → quality');
  assert.ok(order.every((i) => i > 0));
  await assert.rejects(run('brief', { positionals: [], values: {}, cfg }), /which channel/);
});

test('plan: each cut with captions, shot notes and estimated timing; script rules decide the exit code', async () => {
  const cfg = testConfig(), p = demoProject(cfg);
  let r = await run('plan', { positionals: [p.ref], values: {}, cfg });
  assert.match(r.out, /still the template example/);
  const sf = path.join(p.dir, 'script.json'), script = JSON.parse(fs.readFileSync(sf, 'utf8'));
  Object.assign(script, {
    description: 'Your cheeks go red for a reason: here is what adrenaline does to your face.', tags: ['a', 'b', 'c'],
    lines: [{ text: 'Why does your face turn red?', caps: 'WHY DOES YOUR | FACE TURN *RED?', shot: 'hero blushes on "red"' }, { text: 'Adrenaline opens the vessels.', caps: '*ADRENALINE | OPENS THE *VESSELS' }],
  });
  writeJson(sf, script);
  r = await run('plan', { positionals: [p.ref], values: {}, cfg });
  assert.equal(r.code, 0, r.out);
  for (const m of ['PLAN  demo/why-blush', '≈', 'WHY DOES YOUR | FACE TURN *RED?', 'shot: hero blushes on "red"', 'shot: (none yet)', 'SOURCES (2)', 'SCRIPT RULES']) assert.ok(r.out.includes(m), m);
  writeJson(sf, { ...script, tags: [] });
  assert.equal((await run('plan', { positionals: [p.ref], values: {}, cfg })).code, 1);
});

test('status: every channel video with its stages and the next command', async () => {
  const cfg = testConfig(), p = demoProject(cfg);
  addEpisode(loadChannel('demo', cfg), { id: 'later', title: 'Later' });
  const { code, out } = await run('status', { positionals: [], values: {}, cfg });
  assert.equal(code, 0);
  assert.match(out, /demo  Demo Channel   1 idea · 1 making · 0 rendered · 0 posted/);
  assert.match(out, /making\s+why-blush\s+script ·  timing/);
  assert.match(out, new RegExp(`→ write script\\.json, then: studio plan ${p.ref}`));
  assert.match(out, /1 idea\(s\)/);
  assert.match((await run('status', { positionals: [], values: { all: true }, cfg })).out, /idea\s+later\s+Later/);
});

test('lintText: rotated texts are compared by their real outline, not their bounding boxes', () => {
  // two lines of a stamp rotated 20°: their bounding boxes overlap, the letters don't
  const rot = (cx, cy, w, h, a = -0.35) => [[-w, -h], [w, -h], [w, h], [-w, h]].map(([x, y]) => [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]);
  const text = (t, quad) => ({ text: t, layer: 'shot', quad, box: [Math.min(...quad.map((p) => p[0])), Math.min(...quad.map((p) => p[1])), Math.max(...quad.map((p) => p[0])), Math.max(...quad.map((p) => p[1]))] });
  const apart = layout(8, () => [text('RETURN TO', rot(540, 600, 260, 34)), text('SENDER', rot(540 - 30, 600 + 85, 180, 34))]);
  assert.ok(overlapShare(apart.frames[0].texts[0].box, apart.frames[0].texts[1].box) > 0.1, 'boxes do overlap');
  assert.deepEqual(lintText(apart), { errors: [], warnings: [] });
  const touching = layout(8, () => [text('RETURN TO', rot(540, 600, 260, 34)), text('SENDER', rot(540, 640, 180, 34))]);
  assert.match(lintText(touching).errors.join(), /"RETURN TO" and "SENDER" overlap/);
});

test('quadsMeet: separating axis test', () => {
  const sq = (x, y, s = 10) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];
  assert.equal(quadsMeet(sq(0, 0), sq(5, 5)), true);
  assert.equal(quadsMeet(sq(0, 0), sq(20, 0)), false);
  assert.equal(quadsMeet(sq(0, 0), sq(10, 0)), false, 'touching edges do not overlap');
  const diamond = [[15, 0], [20, 5], [15, 10], [10, 5]];
  assert.equal(quadsMeet(sq(0, 0, 9), diamond), false);
});

import { runPipeline } from '../../studio/lib/pipeline.mjs';

test('brief --compact: the digest in place of the bible, no images, no rubric', async () => {
  const cfg = testConfig(), ch = loadChannel('demo', cfg);
  let b = (await run('brief', { positionals: [], values: { channel: 'demo', compact: true }, cfg })).out;
  assert.match(b, /no BRIEF\.md yet/);
  assert.match(b, /1\. .*BIBLE\.md/);
  fs.writeFileSync(path.join(ch.dir, 'BRIEF.md'), '# Demo: brief\n- be brief');
  b = (await run('brief', { positionals: [], values: { channel: 'demo', compact: true }, cfg })).out;
  assert.match(b, /CHANNEL BRIEF .*\n# Demo: brief\n- be brief/);
  assert.doesNotMatch(b, /BIBLE\.md\n|quality\.md|sheet\.png|style-sheet/);
  assert.match(b, /1\. .*STYLE\.md[\s\S]*2\. .*CHARACTER\.md/);
  const later = new Date(Date.now() + 5000);
  fs.utimesSync(path.join(ch.dir, 'BIBLE.md'), later, later);
  assert.match((await run('brief', { positionals: [], values: { channel: 'demo', compact: true }, cfg })).out, /BRIEF\.md is older than BIBLE\.md/);
});

test('quiet pipeline: one line per step, extra lines only when they say something', async () => {
  const lines = [], steps = [
    { name: 'a', describe: 'first', run: ({ log }) => log('  data/x ✓') },
    { name: 'b', describe: 'second', run: ({ log }) => log('  LINT OK, 1 warning(s)') },
    { name: 'c', describe: 'third', run: ({ log }) => { log('  partial'); throw new Error('boom'); } },
  ];
  await assert.rejects(runPipeline({}, {}, { quiet: true }, { steps, log: (m) => lines.push(m) }), /^Error: c: boom/);
  assert.match(lines[0], /^✓ a +\d\.\d s$/);
  assert.match(lines[1], /^✓ b .*LINT OK, 1 warning/);
  assert.equal(lines[2], '  partial');
  assert.ok(!lines.join('\n').includes('first'));
});
