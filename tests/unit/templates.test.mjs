import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { listTemplates, loadTemplate, validateTemplate } from '../../studio/lib/templates.mjs';
import { testConfig, tmpDir, writeJson } from './helpers.mjs';

const cfg = testConfig();

test('the shipped templates are all valid', () => {
  const all = listTemplates(cfg);
  assert.ok(all.length >= 6);
  for (const t of all) assert.deepEqual(validateTemplate(t), [], t.id);
});

test('loadTemplate names the available templates when one is missing', () => {
  assert.throws(() => loadTemplate('no-such-style', cfg), /Available: .*inside-out/);
});

test('a template dropped into any templates dir is picked up and validated', () => {
  const extra = tmpDir();
  writeJson(path.join(extra, 'broken/template.json'), { id: 'wrong', player: { renderer: '4d' }, fonts: [{ family: 'X', weight: 400, file: 'fonts/missing.ttf' }] });
  const c = { ...cfg, templatesDirs: [...cfg.templatesDirs, extra] };
  const t = loadTemplate('broken', c);
  const errs = validateTemplate(t).join('\n');
  for (const m of ['must match its folder', 'needs a "title"', 'renderer must be', 'font file not found', 'missing STYLE.md', 'missing example/src/shots.js']) assert.match(errs, new RegExp(m));
});

test('every template ships what makes it different, not engine copies', () => {
  for (const t of listTemplates(cfg)) {
    for (const f of ['lib.js', 'timing.js', 'board.js', 'config.js', 'random.js']) assert.ok(!fs.existsSync(path.join(t.dir, 'src/core', f)), `${t.id} copies ${f}`);
    assert.ok(!fs.existsSync(path.join(t.dir, 'vendor')), `${t.id} copies three.js`);
  }
});
