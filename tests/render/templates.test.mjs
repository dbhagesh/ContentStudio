// Real renders in headless Chrome (slow: run with `npm run test:render`). Needs Chrome + ffmpeg; the pipeline test
// also needs the Python env (`studio setup`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { listTemplates } from '../../studio/lib/templates.mjs';
import { exampleProject, createProject, loadProject } from '../../studio/lib/project.mjs';
import { withSession } from '../../studio/render/session.mjs';
import { runPipeline } from '../../studio/lib/pipeline.mjs';
import { venvPython } from '../../studio/lib/python.mjs';
import { meanVolume } from '../../studio/commands/pipeline.mjs';
import * as modes from '../../studio/render/modes.mjs';
import { lintText, lintAll } from '../../studio/lib/lint.mjs';
import { testConfig } from '../unit/helpers.mjs';

const cfg = testConfig();

for (const t of listTemplates(cfg)) {
  test(`${t.id}: boots, draws every frame, renders deterministically, no clipped or overlapping text`, async () => {
    const p = exampleProject(t, cfg);
    await withSession(p, cfg, async (s) => {
      const r = await modes.check(s);
      assert.ok(r.ok, r.report);
      assert.ok(r.duration > 10);
      const mid = r.duration / 2, a = await modes.grabFrame(s, mid), b = await modes.grabFrame(s, mid);
      assert.ok(a.length > 20_000, 'frame is not blank');
      assert.ok(a.equals(b), 'same time → same frame');
      const layout = await modes.textLayout(s);
      assert.ok(layout.frames.some((f) => f.texts.some((x) => x.layer === 'caption')), 'captions are seen');
      assert.deepEqual(lintText(layout).errors, []);
      assert.ok(b.equals(await modes.grabFrame(s, mid)), 'the text probe leaves the picture unchanged');
    });
  });
}

test('a project override changes the picture (caption position)', async () => {
  const dir = createProject({ template: listTemplates(cfg).find((x) => x.id === 'inside-out'), name: 'override', cfg });
  const at = 1.5;
  const before = await withSession(loadProject(dir, cfg), cfg, (s) => modes.grabFrame(s, at));
  const mf = path.join(dir, 'project.json'), m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  m.overrides = { captions: { y: 600 } };
  fs.writeFileSync(mf, JSON.stringify(m));
  const after = await withSession(loadProject(dir, cfg), cfg, (s) => modes.grabFrame(s, at));
  assert.ok(!before.equals(after));
});

test('full pipeline (estimated timing): cues → mix → sheet → MP4 with sound', { skip: !venvPython(cfg) && 'no Python env (studio setup)' }, async () => {
  const dir = createProject({ template: listTemplates(cfg).find((x) => x.id === 'stick-story'), name: 'pipeline', cfg });
  const out = path.join(dir, 'renders/clip.mp4');
  await runPipeline(loadProject(dir, cfg), cfg, { timing: 'estimate', draft: true, start: 1, end: 3, out, quiet: true }, { log: () => {} });
  for (const f of ['data/lines.json', 'data/words.json', 'data/cues.json', 'data/mix.wav', 'review/all.jpg']) assert.ok(fs.existsSync(path.join(dir, f)), f);
  assert.ok(fs.statSync(out).size > 10_000);
  assert.ok(meanVolume(out) > -50, 'clip has sound');
});

test('character model sheet renders every expression / pose / outfit without errors', async () => {
  const { characterStage } = await import('../../studio/commands/cast.mjs');
  const { loadCharacter } = await import('../../studio/lib/characters.mjs');
  const c = loadCharacter('mascot', cfg), out = path.join(cfg.projectsDir, 'sheet.png');
  await withSession(characterStage(c, cfg), cfg, async (s) => { await modes.stylesheet(s, out); assert.deepEqual(s.logs, []); }, { page: 'character', query: 'id=mascot' });
  assert.ok(fs.statSync(out).size > 50_000);
});

test('a channel video draws its cast, and the character renders deterministically', async () => {
  const { loadChannel } = await import('../../studio/lib/channels.mjs');
  const ch = loadChannel('demo', cfg);
  const dir = createProject({ template: listTemplates(cfg).find((x) => x.id === ch.manifest.defaults.template), name: 'cast-video', cfg, channel: ch });
  fs.writeFileSync(path.join(dir, 'src/shots.js'), `import { cast } from './core/cast.js';
export function buildShots() {
  const s = cast('mascot');
  return { shots: [{ id: 'S1', at: 0, draw(lt, d, t) { s.draw({ x: 540, y: 1700, s: 1.2, t, pose: 'wave', expression: 'love' }); } }], cues: [] };
}
`);
  await withSession(loadProject(dir, cfg), cfg, async (s) => {
    const r = await modes.check(s);
    assert.ok(r.ok, r.report);
    const a = await modes.grabFrame(s, 2), b = await modes.grabFrame(s, 2);
    assert.ok(a.equals(b));
    assert.equal(await s.ev("(async () => { try { (await import('/src/core/cast.js')).cast('nobody'); return 'no error'; } catch (e) { return e.message; } })()").then((m) => /not in this video's cast/.test(m)), true);
  });
});

test('lint catches text cut off by the frame and text over the captions', async () => {
  const { loadChannel } = await import('../../studio/lib/channels.mjs');
  const ch = loadChannel('demo', cfg);
  const dir = createProject({ template: listTemplates(cfg).find((x) => x.id === 'inside-out'), name: 'bad-text', cfg, channel: ch });
  fs.writeFileSync(path.join(dir, 'src/shots.js'), `import { ctx, C, bigText } from './core/lib.js';
import { CAP } from './core/captions.js';
export function buildShots() {
  return { shots: [{ id: 'S1', at: 0, draw() {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 1080, 1920);
    bigText('FAR TOO WIDE A LABEL', 760, 400, 120);
    bigText('LABEL', 540, CAP.y, 110);
  } }], cues: [] };
}
`);
  const r = await lintAll(loadProject(dir, cfg), cfg);
  const all = r.errors.join('\n');
  assert.match(all, /text "FAR TOO WIDE A LABEL" is cut off: it runs \d+ px past the right edge/);
  assert.match(all, /text "LABEL" overlaps the caption/);
});

test('a channel profile picture renders from code: its mascot by its own code, or a monogram', async () => {
  const { loadChannel } = await import('../../studio/lib/channels.mjs');
  const { avatarStage } = await import('../../studio/commands/cast.mjs');
  const f = path.join(cfg.channelsDir, 'demo/channel.json'), base = JSON.parse(fs.readFileSync(f, 'utf8'));
  const render = async (avatar, query = '') => {
    fs.writeFileSync(f, JSON.stringify({ ...base, brand: { avatar } }));
    const out = path.join(cfg.projectsDir, `avatar-${query || 'square'}-${avatar.character || 'text'}.png`);
    await withSession(avatarStage(loadChannel('demo', cfg), cfg), cfg, async (s) => { await modes.stylesheet(s, out); assert.deepEqual(s.logs, []); }, { page: 'avatar', query });
    return fs.readFileSync(out);
  };
  const a = await render({ bg: '#1F3A5F', bg2: '#FFD43B', rays: 12, character: 'mascot', x: 400, y: 1100, s: 1, ring: '#FFFFFF' });
  assert.ok(a.length > 20_000);
  assert.ok(a.equals(await render({ bg: '#1F3A5F', bg2: '#FFD43B', rays: 12, character: 'mascot', x: 400, y: 1100, s: 1, ring: '#FFFFFF' })), 'deterministic');
  assert.ok(!a.equals(await render({ bg: '#1F3A5F', bg2: '#FFD43B', rays: 12, character: 'mascot', x: 400, y: 1100, s: 1, ring: '#FFFFFF' }, 'preview=1')), 'the preview is masked');
  assert.ok((await render({ bg: '#1F3A5F', text: 'D' })).length > 5_000);
  fs.writeFileSync(f, JSON.stringify({ ...base, brand: { avatar: { character: 'nobody' } } }));
  assert.throws(() => avatarStage(loadChannel('demo', cfg), cfg), /not in demo's cast/);
  fs.writeFileSync(f, JSON.stringify(base));
});
