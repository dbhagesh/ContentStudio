import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexHtml, sheetHtml, fontFaces } from '../../studio/lib/pages.mjs';
import { startServer, projectRoutes } from '../../studio/render/server.mjs';
import { exampleProject } from '../../studio/lib/project.mjs';
import { loadTemplate } from '../../studio/lib/templates.mjs';
import { testConfig } from './helpers.mjs';

const rc2d = { title: 'A <b>', fonts: [{ family: 'Inter', weight: 900, file: 'fonts/Inter-Black.otf' }], player: { renderer: '2d' } };
const rc3d = { ...rc2d, player: { renderer: '3d' }, sheet: { canvases: [['gl', 1080, 1920]] } };

test('2D page: fonts, canvas, player, no WebGL', () => {
  const h = indexHtml(rc2d);
  assert.match(h, /@font-face \{ font-family: 'Inter'; font-weight: 900; src: url\('fonts\/Inter-Black.otf'\); \}/);
  assert.match(h, /<canvas id="cv" width="1080" height="1920">/);
  assert.match(h, /src="src\/main.js"/);
  assert.doesNotMatch(h, /importmap|id="gl"/);
  assert.match(h, /A &#60;b&#62;/);
});

test('3D page: hidden WebGL canvas + three.js import map', () => {
  const h = indexHtml(rc3d);
  assert.match(h, /<canvas id="gl"/);
  assert.match(h, /"three":".\/vendor\/three.module.js"/);
});

test('sheet page loads config, seeds randomness, then the template sheet', () => {
  const h = sheetHtml(rc3d);
  assert.match(h, /<canvas id="gl" class="off" width="1080" height="1920">/);
  assert.match(h, /loadConfig\(\)/);
  assert.match(h, /seedRandom/);
  assert.match(h, /import\('.\/src\/sheet.js'\)/);
  assert.equal(fontFaces([]), '');
});

test('server: generated routes + overlay files + 404s', async () => {
  const p = exampleProject(loadTemplate('deep-dive', testConfig()), testConfig());
  const srv = await startServer({ overlay: p.overlay, routes: projectRoutes(p) });
  const u = `http://127.0.0.1:${srv.address().port}`;
  try {
    const cfg = await (await fetch(`${u}/studio/config.json`)).json();
    assert.equal(cfg.id, 'deep-dive');
    assert.equal(cfg.player.renderer, '3d');
    assert.equal(cfg.captions.y, 1480);
    assert.match(await (await fetch(`${u}/`)).text(), /importmap/);
    const font = await fetch(`${u}/fonts/Inter-Black.otf`);
    assert.equal(font.status, 200);
    assert.equal(font.headers.get('content-type'), 'font/otf');
    assert.equal((await fetch(`${u}/vendor/three.module.js`)).status, 200);
    assert.equal((await fetch(`${u}/src/core/sets.js`)).status, 200);
    assert.equal((await fetch(`${u}/nope.js`)).status, 404);
    assert.equal((await fetch(`${u}/../package.json`)).status, 404);
  } finally { srv.close(); }
});
