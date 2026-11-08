import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { deepMerge, loadStudioConfig, runtimeConfig, DEFAULTS } from '../../studio/lib/config.mjs';
import { tmpDir, writeJson } from './helpers.mjs';

test('deepMerge merges objects recursively, replaces arrays and scalars, skips undefined', () => {
  const out = deepMerge({ a: { b: 1, c: [1, 2] }, d: 1 }, { a: { c: [3], e: 2 }, d: undefined }, null);
  assert.deepEqual(out, { a: { b: 1, c: [3], e: 2 }, d: 1 });
});

test('deepMerge does not mutate its inputs', () => {
  const a = { x: { y: 1 } };
  deepMerge(a, { x: { y: 2 } });
  assert.equal(a.x.y, 1);
});

test('studio config layers: defaults < studio.config.json < local < env, with absolute paths', () => {
  const root = tmpDir();
  writeJson(path.join(root, 'studio.config.json'), { projectsDir: 'videos', render: { fps: 25 } });
  writeJson(path.join(root, 'studio.config.local.json'), { render: { crf: 20 } });
  const cfg = loadStudioConfig({ root, env: { FPS: '24', CHROME: '/x/chrome' } });
  assert.equal(cfg.workspace, path.resolve(root, '../ContentStudio-workspace'));
  assert.equal(cfg.projectsDir, path.join(cfg.workspace, 'videos'), 'content paths are inside the workspace');
  assert.equal(cfg.channelsDir, path.join(cfg.workspace, 'channels'));
  assert.deepEqual(cfg.templatesDirs, [path.join(root, 'templates'), path.join(cfg.workspace, 'templates')]);
  assert.equal(cfg.render.fps, 24);
  assert.equal(cfg.render.crf, 20);
  assert.equal(cfg.render.chrome, '/x/chrome');
  assert.equal(cfg.render.preset, DEFAULTS.render.preset);
  assert.equal(cfg.studioHome, path.join(root, '.studio'));
});

test('the workspace comes from the config or $STUDIO_WORKSPACE, never from the studio folder', () => {
  const root = tmpDir(), ws = tmpDir();
  writeJson(path.join(root, 'studio.config.local.json'), { workspace: '/elsewhere' });
  assert.equal(loadStudioConfig({ root, env: {} }).workspace, '/elsewhere');
  const cfg = loadStudioConfig({ root, env: { STUDIO_WORKSPACE: ws } });
  assert.equal(cfg.workspace, ws);
  assert.equal(cfg.projectsDir, path.join(ws, 'projects'));
  assert.equal(cfg.charactersDir, path.join(ws, 'characters'));
});

test('studio config works with no config files at all', () => {
  const cfg = loadStudioConfig({ root: tmpDir(), env: {} });
  assert.equal(cfg.render.fps, 30);
});

test('runtime config: template values, overridden per project', () => {
  const template = { manifest: { id: 't', title: 'T', fonts: [{ family: 'Inter', weight: 900, file: 'f.otf' }], player: { renderer: '2d', punch: 0.1 }, captions: { y: 1400, size: 150 } } };
  const rc = runtimeConfig(template, { overrides: { captions: { y: 1300 }, player: { seed: 7 } } });
  assert.deepEqual(rc.captions, { y: 1300, size: 150 });
  assert.deepEqual(rc.player, { renderer: '2d', punch: 0.1, seed: 7 });
  assert.equal(rc.fonts.length, 1);
  assert.deepEqual(rc.engine3d, {});
});
