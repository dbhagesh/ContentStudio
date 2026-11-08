import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { listChannels, loadChannel, validateChannel, scaffoldChannel, channelTemplates } from '../../studio/lib/channels.mjs';
import { listTemplates, loadTemplate, duplicateTemplates } from '../../studio/lib/templates.mjs';
import { listCharacters, loadCharacter } from '../../studio/lib/characters.mjs';
import { createProject, loadProject, listProjects, resolveProjectDir } from '../../studio/lib/project.mjs';
import { testConfig, tmpDir, writeJson } from './helpers.mjs';

const real = testConfig();

/** two channels, each owning a template and a character copied from the shared library */
function world() {
  const cfg = { ...testConfig(), channelsDir: tmpDir('studio-channels-') };
  for (const ch of ['alpha', 'beta']) {
    scaffoldChannel({ id: ch, name: ch.toUpperCase(), handle: ch, cfg });
    const t = path.join(cfg.channelsDir, ch, 'templates', `${ch}-style`);
    fs.cpSync(loadTemplate('inside-out', real).dir, t, { recursive: true });
    writeJson(path.join(t, 'template.json'), { ...loadTemplate('inside-out', real).manifest, id: `${ch}-style` });
    const c = path.join(cfg.channelsDir, ch, 'characters', `${ch}-hero`);
    fs.cpSync(loadCharacter('mascot', real).dir, c, { recursive: true });
    writeJson(path.join(c, 'character.json'), { ...loadCharacter('mascot', real).manifest, id: `${ch}-hero`, channels: [] });
    const f = path.join(cfg.channelsDir, ch, 'channel.json'), m = JSON.parse(fs.readFileSync(f, 'utf8'));
    writeJson(f, { ...m, cast: [`${ch}-hero`], defaults: { ...m.defaults, template: `${ch}-style` } });
  }
  return cfg;
}

test('the shipped channels have a bible and are valid', () => {
  for (const ch of listChannels(real)) {
    assert.ok(fs.existsSync(path.join(ch.dir, 'BIBLE.md')), ch.id);
    assert.deepEqual(validateChannel(ch, real), [], ch.id);
  }
});

test('channel-new scaffolds a complete, valid, self-contained channel', () => {
  const cfg = { ...testConfig(), channelsDir: tmpDir() };
  const dir = scaffoldChannel({ id: 'odd-files', name: 'Odd Files', handle: 'OddFiles', cfg });
  for (const f of ['channel.json', 'BIBLE.md', 'series.json', 'backlog.json', 'templates', 'characters', 'audio']) assert.ok(fs.existsSync(path.join(dir, f)), f);
  const ch = loadChannel('odd-files', cfg);
  assert.equal(ch.manifest.handle, '@OddFiles');
  assert.equal(ch.manifest.publish.youtube.madeForKids, false);
  assert.deepEqual(validateChannel(ch, cfg), []);
  assert.throws(() => scaffoldChannel({ id: 'odd-files', name: 'x', cfg }), /already exists/);
  assert.throws(() => scaffoldChannel({ id: 'no-name', cfg }), /--name/);
  assert.throws(() => scaffoldChannel({ id: 'Bad Id', name: 'x', cfg }), /lowercase/);
});

test('channel-owned templates and characters are found, tagged with their owner, and validated', () => {
  const cfg = world();
  assert.equal(listTemplates(cfg).find((t) => t.id === 'alpha-style').owner, 'alpha');
  assert.equal(listTemplates(cfg).find((t) => t.id === 'inside-out').owner, null);
  assert.equal(listCharacters(cfg).find((c) => c.id === 'beta-hero').owner, 'beta');
  for (const id of ['alpha', 'beta']) assert.deepEqual(validateChannel(loadChannel(id, cfg), cfg), [], id);
  assert.ok(channelTemplates(loadChannel('alpha', cfg), cfg).some((t) => t.id === 'alpha-style'));
  assert.ok(!channelTemplates(loadChannel('alpha', cfg), cfg).some((t) => t.id === 'beta-style'));
  assert.deepEqual(duplicateTemplates(cfg), []);
});

test('no mixing: another channel\'s template or character is refused', () => {
  const cfg = world(), alpha = loadChannel('alpha', cfg);
  assert.throws(() => createProject({ template: loadTemplate('beta-style', cfg), name: 'x', cfg, channel: alpha }), /belongs to channel "beta"/);
  assert.throws(() => createProject({ template: loadTemplate('alpha-style', cfg), name: 'x', cfg }), /belongs to channel "alpha"/);
  const f = path.join(alpha.dir, 'channel.json'), m = JSON.parse(fs.readFileSync(f, 'utf8'));
  writeJson(f, { ...m, cast: ['beta-hero'], templates: ['beta-style'] });
  const errs = validateChannel(loadChannel('alpha', cfg), cfg).join('\n');
  assert.match(errs, /cast member "beta-hero" belongs to beta/);
  assert.match(errs, /template "beta-style" belongs to channel "beta"/);
  writeJson(f, m);
  const dir = createProject({ template: loadTemplate('alpha-style', cfg), name: 'steal', cfg, channel: loadChannel('alpha', cfg) });
  const pf = path.join(dir, 'project.json');
  writeJson(pf, { ...JSON.parse(fs.readFileSync(pf, 'utf8')), cast: { 'beta-hero': '1.0.0' } });
  assert.throws(() => loadProject(dir, cfg), /"beta-hero" belongs to beta/);
});

test('a shared template a channel does not list is refused; listed ones are fine', () => {
  const cfg = world(), alpha = loadChannel('alpha', cfg);
  const f = path.join(alpha.dir, 'channel.json'), m = JSON.parse(fs.readFileSync(f, 'utf8'));
  writeJson(f, { ...m, templates: ['inside-out'] });
  const ch = loadChannel('alpha', cfg);
  assert.throws(() => createProject({ template: loadTemplate('deep-dive', cfg), name: 'x', cfg, channel: ch }), /not "deep-dive"/);
  assert.ok(createProject({ template: loadTemplate('inside-out', cfg), name: 'ok', cfg, channel: ch }));
  writeJson(f, { ...m, templates: [] });
  const own = loadChannel('alpha', cfg);
  assert.deepEqual(channelTemplates(own, cfg).map((t) => t.id), ['alpha-style'], '[] = only its own templates');
  assert.throws(() => createProject({ template: loadTemplate('inside-out', cfg), name: 'y', cfg, channel: own }), /its own templates, not "inside-out"/);
});

test('only the video\'s own cast is served under /characters/', () => {
  const cfg = world();
  const dir = createProject({ template: loadTemplate('alpha-style', cfg), name: 'served', cfg, channel: loadChannel('alpha', cfg) });
  const p = loadProject(dir, cfg);
  assert.equal(p.overlay.resolve('/characters/alpha-hero/character.js'), path.join(cfg.channelsDir, 'alpha/characters/alpha-hero/character.js'));
  assert.equal(p.overlay.resolve('/characters/beta-hero/character.js'), null);
  assert.equal(p.overlay.resolve('/characters/someone-else/character.js'), null);
  assert.deepEqual(p.runtime.cast.map((c) => c.id), ['alpha-hero']);
});

test('channel videos live in projects/<channel>/ and are found by <channel>/<name> or a unique name', () => {
  const cfg = world();
  const a = createProject({ template: loadTemplate('alpha-style', cfg), name: 'pilot', cfg, channel: loadChannel('alpha', cfg) });
  const b = createProject({ template: loadTemplate('beta-style', cfg), name: 'pilot', cfg, channel: loadChannel('beta', cfg) });
  const solo = createProject({ template: loadTemplate('beta-style', cfg), name: 'only-beta', cfg, channel: loadChannel('beta', cfg) });
  assert.equal(a, path.join(cfg.projectsDir, 'alpha/pilot'));
  assert.equal(resolveProjectDir('alpha/pilot', cfg), a);
  assert.equal(resolveProjectDir('beta/pilot', cfg), b);
  assert.equal(resolveProjectDir('only-beta', cfg), solo);
  assert.throws(() => resolveProjectDir('pilot', cfg), /several channels: say which \(alpha\/pilot, beta\/pilot\)/);
  assert.deepEqual(listProjects(cfg, { channel: 'beta' }).map((p) => p.ref), ['beta/only-beta', 'beta/pilot']);
  assert.equal(loadProject('alpha/pilot', cfg).ref, 'alpha/pilot');
});
