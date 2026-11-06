import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createOverlay } from '../../studio/lib/overlay.mjs';
import { tmpDir } from './helpers.mjs';

function layers() {
  const top = tmpDir(), mid = tmpDir(), base = tmpDir();
  const put = (root, rel, txt) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), txt); };
  put(base, 'src/core/lib.js', 'base'); put(base, 'src/core/kit.js', 'base'); put(base, 'fonts/a.otf', 'base');
  put(mid, 'src/core/kit.js', 'mid');
  put(top, 'src/shots.js', 'top'); put(top, 'src/core/lib.js', 'top');
  fs.writeFileSync(path.join(path.dirname(base), 'secret.txt'), 'nope');
  return { top, mid, base, o: createOverlay([top, mid, base]) };
}
const read = (f) => fs.readFileSync(f, 'utf8');

test('first layer that has the file wins', () => {
  const { o } = layers();
  assert.equal(read(o.resolve('/src/shots.js')), 'top');
  assert.equal(read(o.resolve('/src/core/lib.js')), 'top');
  assert.equal(read(o.resolve('/src/core/kit.js')), 'mid');
  assert.equal(read(o.resolve('/fonts/a.otf')), 'base');
  assert.equal(o.layerOf('/src/core/kit.js'), 1);
});

test('missing files, directories and query strings', () => {
  const { o } = layers();
  assert.equal(o.resolve('/nope.js'), null);
  assert.equal(o.resolve('/src/core'), null);
  assert.equal(read(o.resolve('/src/shots.js?v=2')), 'top');
});

test('never escapes a layer', () => {
  const { o } = layers();
  for (const p of ['/../secret.txt', '../secret.txt', '/src/../../secret.txt', '/%2e%2e/secret.txt']) assert.equal(o.resolve(p), null, p);
});
