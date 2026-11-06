import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createProject, loadProject, listProjects, resolveProjectDir } from '../../studio/lib/project.mjs';
import { loadTemplate } from '../../studio/lib/templates.mjs';
import { testConfig } from './helpers.mjs';

const cfg = testConfig();
const tpl = loadTemplate('inside-out', cfg);

test('new project = the example (renders immediately) + project.json, without generated audio', () => {
  const dir = createProject({ template: tpl, name: 'gum', title: 'Gum', cfg });
  for (const f of ['project.json', 'script.json', 'src/shots.js', 'data/lines.json', 'data/words.json']) assert.ok(fs.existsSync(path.join(dir, f)), f);
  for (const f of ['data/narration.wav', 'data/mix.wav']) assert.ok(!fs.existsSync(path.join(dir, f)), f);
  assert.ok(fs.statSync(path.join(dir, 'renders')).isDirectory());
  const m = JSON.parse(fs.readFileSync(path.join(dir, 'project.json'), 'utf8'));
  assert.equal(m.template, 'inside-out');
  assert.equal(m.title, 'Gum');
});

test('project names are validated and never overwritten', () => {
  assert.throws(() => createProject({ template: tpl, name: 'Bad Name', cfg }), /lowercase/);
  createProject({ template: tpl, name: 'twice', cfg });
  assert.throws(() => createProject({ template: tpl, name: 'twice', cfg }), /already exists/);
});

test('loadProject: by name or path; files resolve project → template → engine', () => {
  const dir = createProject({ template: tpl, name: 'layers', cfg });
  const p = loadProject('layers', cfg);
  assert.equal(p.dir, dir);
  assert.equal(loadProject(dir, cfg).dir, dir);
  assert.equal(p.overlay.resolve('/src/shots.js'), path.join(dir, 'src/shots.js'));
  assert.equal(p.overlay.resolve('/src/core/kit.js'), path.join(tpl.dir, 'src/core/kit.js'));
  assert.match(p.overlay.resolve('/src/core/lib.js'), /engine\/src\/core\/lib\.js$/);
  assert.match(p.overlay.resolve('/fonts/Inter-Black.otf'), /engine\/fonts\/Inter-Black\.otf$/);
  assert.equal(p.overlay.resolve('/src/main.js').endsWith('engine/src/main.js'), true);
});

test('project overrides reach the runtime config', () => {
  const dir = createProject({ template: tpl, name: 'over', cfg });
  const mf = path.join(dir, 'project.json'), m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  m.overrides = { captions: { y: 1200 } };
  fs.writeFileSync(mf, JSON.stringify(m));
  assert.equal(loadProject('over', cfg).runtime.captions.y, 1200);
  assert.equal(loadProject('over', cfg).runtime.player.renderer, '2d');
});

test('unknown projects give a helpful error; list shows created ones', () => {
  assert.throws(() => resolveProjectDir('ghost', cfg), /studio new/);
  assert.ok(listProjects(cfg).some((p) => p.name === 'gum'));
});
