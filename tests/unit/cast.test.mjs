import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { listCharacters, loadCharacter, validateCharacter, castEntry, castDrift } from '../../studio/lib/characters.mjs';
import { listChannels, loadChannel, validateChannel } from '../../studio/lib/channels.mjs';
import { createProject, loadProject } from '../../studio/lib/project.mjs';
import { loadTemplate } from '../../studio/lib/templates.mjs';
import { testConfig, tmpDir, writeJson } from './helpers.mjs';

const cfg = testConfig();

test('the shipped characters and channels are valid', () => {
  assert.ok(listCharacters(cfg).some((c) => c.id === 'sakumai'));
  for (const c of listCharacters(cfg)) assert.deepEqual(validateCharacter(c), [], c.id);
  for (const ch of listChannels(cfg)) assert.deepEqual(validateChannel(ch, cfg), [], ch.id);
});

test('character manifest lists match what character.js exports', () => {
  const c = loadCharacter('sakumai', cfg), src = fs.readFileSync(path.join(c.dir, 'character.js'), 'utf8');
  const block = (name) => src.slice(src.indexOf(`export const ${name} = {`), src.indexOf('\n};', src.indexOf(`export const ${name} = {`)));
  const keys = (name) => [...block(name).matchAll(/^\s{2}([a-z]+):/gm)].map((m) => m[1]);
  assert.deepEqual(keys('EXPRESSIONS'), c.manifest.expressions);
  assert.deepEqual(keys('POSES'), c.manifest.poses);
  assert.deepEqual(keys('OUTFITS'), c.manifest.outfits);
});

test('validation catches broken characters and channels', () => {
  const root = tmpDir();
  writeJson(path.join(root, 'characters/Bad_Id/character.json'), { id: 'other', version: '1', kind: 'svg' });
  writeJson(path.join(root, 'channels/chan/channel.json'), { id: 'chan', name: 'C', cast: ['ghost'], defaults: { template: 'nope' } });
  const c2 = { ...cfg, charactersDir: path.join(root, 'characters'), channelsDir: path.join(root, 'channels') };
  const errs = validateCharacter(loadCharacter('Bad_Id', c2)).join('\n');
  for (const m of ['lowercase', 'must match its folder', 'needs a "name"', 'version must', 'kind must', 'missing character.js', 'CHARACTER.md', '"expressions"']) assert.match(errs, new RegExp(m));
  const cerrs = validateChannel(loadChannel('chan', c2), c2).join('\n');
  assert.match(cerrs, /"ghost" is not in characters/);
  assert.match(cerrs, /template "nope" does not exist/);
});

test('a channel project: channel template + voice + music, cast pinned, look overrides layered', () => {
  const ch = loadChannel('sakumai', cfg);
  const dir = createProject({ template: loadTemplate(ch.manifest.defaults.template, cfg), name: 'chan-video', cfg, channel: ch });
  const m = JSON.parse(fs.readFileSync(path.join(dir, 'project.json'), 'utf8'));
  assert.equal(m.channel, 'sakumai');
  assert.deepEqual(m.cast, { sakumai: loadCharacter('sakumai', cfg).manifest.version });
  const script = JSON.parse(fs.readFileSync(path.join(dir, 'script.json'), 'utf8'));
  assert.equal(script.voice, ch.manifest.defaults.voice);
  const p = loadProject(dir, cfg);
  assert.deepEqual(p.runtime.cast, [castEntry(loadCharacter('sakumai', cfg))]);
  assert.equal(p.runtime.captions.stroke, ch.manifest.defaults.overrides.captions.stroke);
  m.overrides = { captions: { stroke: '#000' } };
  fs.writeFileSync(path.join(dir, 'project.json'), JSON.stringify(m));
  assert.equal(loadProject(dir, cfg).runtime.captions.stroke, '#000', 'project beats channel');
});

test('characters are served only from the library, never overridden by a project', () => {
  const ch = loadChannel('sakumai', cfg);
  const dir = createProject({ template: loadTemplate('inside-out', cfg), name: 'no-override', cfg, channel: ch });
  fs.mkdirSync(path.join(dir, 'characters/sakumai'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'characters/sakumai/character.js'), 'export default {}');
  const f = loadProject(dir, cfg).overlay.resolve('/characters/sakumai/character.js');
  assert.equal(f, path.join(loadCharacter('sakumai', cfg).dir, 'character.js'));
  assert.equal(loadProject(dir, cfg).overlay.resolve('/characters/../package.json'), null);
});

test('version drift: minor vs major', () => {
  const v = loadCharacter('sakumai', cfg).manifest.version, [maj] = v.split('.');
  assert.deepEqual(castDrift({ sakumai: v }, cfg), []);
  const sameMajor = v === `${maj}.0.0` ? `${maj}.0.1` : `${maj}.0.0`;
  assert.equal(castDrift({ sakumai: sameMajor }, cfg)[0].level, 'minor');
  assert.equal(castDrift({ sakumai: `${+maj + 1}.0.0` }, cfg)[0].level, 'major');
});
