import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { lintScript, lintProject, similarity, captionChunks } from '../../studio/lib/lint.mjs';
import { scaffoldChannel, loadChannel } from '../../studio/lib/channels.mjs';
import { addEpisode, loadBacklog, episodeStatus, validateBacklog, getEpisode } from '../../studio/lib/backlog.mjs';
import { createProject, loadProject } from '../../studio/lib/project.mjs';
import { loadTemplate } from '../../studio/lib/templates.mjs';
import { testConfig, tmpDir, writeJson } from './helpers.mjs';

/** a scaffolded channel owns no templates yet: let it use shared ones */
function allowShared(cfg, id, templates) {
  const f = path.join(cfg.channelsDir, id, 'channel.json');
  writeJson(f, { ...JSON.parse(fs.readFileSync(f, 'utf8')), templates });
}

const good = {
  title: 'Why Do You Blush?', description: 'Your cheeks go red for a reason: here is what adrenaline does to your face.',
  tags: ['blushing', 'anime', 'science'], sources: ['a', 'b'],
  lines: [{ text: 'Why does your face turn red?', caps: 'WHY DOES YOUR | FACE TURN *RED?' }, { text: 'Adrenaline opens the vessels.', caps: '*ADRENALINE | OPENS THE *VESSELS' }],
};
const timed = { duration: 5, lines: [{ i: 0, text: good.lines[0].text, start: 0.4, end: 2.4 }, { i: 1, text: good.lines[1].text, start: 2.6, end: 4.2 }] };

test('a good script passes', () => {
  const r = lintScript({ script: good, lines: timed });
  assert.deepEqual(r.errors, []);
});

test('missing post metadata, bad captions and slow hooks are caught', () => {
  const bad = { title: 'x'.repeat(80), tags: [], sources: [], lines: [{ text: 'a b c d e', caps: 'ONE TWO THREE FOUR FIVE | *A *B' }, { text: 'no caps' }] };
  const r = lintScript({ script: bad, lines: { duration: 9, lines: [{ i: 0, text: 'a b c d e', start: 0, end: 6 }] } });
  const all = [...r.errors, ...r.warnings].join('\n');
  for (const m of ['title is 80', '"description"', '"tags"', '"sources"', 'has 5 words', 'highlights 2', 'no "caps"', 'hook', 'split it']) assert.match(all, new RegExp(m), m);
});

test('channel quality settings override the defaults (fiction needs no sources)', () => {
  const r = lintScript({ script: { ...good, sources: [] }, lines: timed, channel: { quality: { minSources: 0 } } });
  assert.deepEqual(r.errors, []);
});

test('originality: repeating another video of the channel is an error', () => {
  assert.equal(similarity('the cat sat on the mat today', 'the cat sat on the mat today'), 1);
  assert.equal(similarity('alpha beta gamma delta', 'one two three four'), 0);
  const others = [{ ref: 'ch/old', title: 'Old', text: good.lines.map((l) => l.text).join(' ') }];
  assert.match(lintScript({ script: good, lines: timed, others }).errors.join('\n'), /repeats ch\/old/);
  assert.match(lintScript({ script: good, lines: timed, others: [{ ref: 'ch/t', title: 'why do you blush?', text: 'unrelated words here entirely' }] }).errors.join('\n'), /same title/);
  assert.deepEqual(captionChunks('A *B | C').map((c) => c.highlights), [1, 0]);
});

test('backlog: add, status from reality, start a project from an episode', () => {
  const cfg = { ...testConfig(), channelsDir: tmpDir() };
  scaffoldChannel({ id: 'chan', name: 'Chan', cfg });
  allowShared(cfg, 'chan', ['inside-out']);
  const ch = loadChannel('chan', cfg);
  addEpisode(ch, { id: 'why-blush', title: 'Why Do You Blush?', sources: ['s1', 's2'] });
  assert.throws(() => addEpisode(ch, { id: 'why-blush', title: 'again' }), /already/);
  assert.throws(() => addEpisode(ch, { id: 'Bad', title: 'x' }), /lowercase/);
  assert.deepEqual(validateBacklog(ch), []);
  assert.equal(episodeStatus(getEpisode(ch, 'why-blush'), ch, cfg).status, 'idea');
  const dir = createProject({ template: loadTemplate('inside-out', cfg), name: 'why-blush', cfg, channel: ch });
  assert.equal(episodeStatus(loadBacklog(ch).episodes[0], ch, cfg).status, 'making');
  fs.writeFileSync(path.join(dir, 'renders/why-blush.mp4'), '');
  assert.equal(episodeStatus(loadBacklog(ch).episodes[0], ch, cfg).status, 'rendered');
  const pf = path.join(dir, 'project.json');
  writeJson(pf, { ...JSON.parse(fs.readFileSync(pf, 'utf8')), publish: { history: [{ platform: 'youtube' }] } });
  assert.deepEqual(episodeStatus(loadBacklog(ch).episodes[0], ch, cfg), { status: 'posted', dir, posted: ['youtube'] });
});

test('lintProject: errors block channel videos, scratch videos only get warnings', () => {
  const cfg = { ...testConfig(), channelsDir: tmpDir() };
  scaffoldChannel({ id: 'chan', name: 'Chan', cfg });
  allowShared(cfg, 'chan', ['inside-out']);
  const ch = loadChannel('chan', cfg), t = loadTemplate('inside-out', cfg);
  const a = loadProject(createProject({ template: t, name: 'a', cfg, channel: ch }), cfg);
  assert.ok(lintProject(a, cfg).errors.some((e) => /description/.test(e)));
  const b = loadProject(createProject({ template: t, name: 'scratch', cfg }), cfg);
  const r = lintProject(b, cfg);
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some((w) => /description/.test(w)));
});
