// The HTML pages are generated from the runtime config, so a template never ships boilerplate:
// fonts become @font-face rules, a 3D template gets its WebGL canvas and the three.js import map.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const THREE_MAP = '<script type="importmap">{"imports":{"three":"./vendor/three.module.js","three/addons/":"./vendor/addons/"}}</script>';

export function fontFaces(fonts = []) {
  return fonts.map((f) => `@font-face { font-family: '${f.family}'; font-weight: ${f.weight}; src: url('${f.file}'); }`).join('\n');
}

/** the film page: src/main.js (the player) boots against studio/config.json */
export function indexHtml(rc) {
  const is3d = rc.player?.renderer === '3d', w = rc.format?.width || 1080, h = rc.format?.height || 1920;
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(rc.title || 'ContentStudio')}</title>
<style>
${fontFaces(rc.fonts)}
html, body { margin: 0; background: #111; height: 100%; }
body { display: flex; align-items: center; justify-content: center; }
#cv { display: block; height: 100vh; width: auto; max-width: 100vw; object-fit: contain; }
body.capture #cv { height: auto; width: auto; } #gl { display: none; }
#play { position: fixed; font: 900 28px Inter, sans-serif; padding: 18px 36px; border: 0; border-radius: 40px; background: #FFD43B; color: #1A1A1E; cursor: pointer; }
</style></head>
<body>
<canvas id="cv" width="${w}" height="${h}"></canvas>${is3d ? `<canvas id="gl" width="${w}" height="${h}"></canvas>` : ''}
<button id="play" hidden>▶ PLAY</button>
<script>if (location.search.includes('capture')) document.body.className = 'capture';</script>
${is3d ? THREE_MAP + '\n' : ''}<script type="module" src="src/main.js"></script>
</body></html>
`;
}

/** a character model sheet (engine/src/core/charsheet.js; ?id=<character>) */
export function characterHtml(rc) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Character sheet</title>
<style>
${fontFaces(rc.fonts)}
html, body { margin: 0; background: #111; } canvas { display: block; max-width: 100vw; height: auto; }
</style></head>
<body><canvas id="cv" width="2400" height="2000"></canvas>
<script type="module">
import { loadConfig, loadFonts } from './src/core/config.js';
import { loadCast } from './src/core/cast.js';
try { const cfg = await loadConfig(); await loadFonts(40); await loadCast(cfg.cast); await import('./src/core/charsheet.js'); }
catch (e) { window.SHEET_ERROR = String(e && e.stack || e); console.error(e); }
</script></body></html>
`;
}

/** a channel profile picture (engine/src/core/avatar.js; rc.avatar) */
export function avatarHtml(rc) {
  const n = rc.avatar?.size || 800;
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Profile picture</title>
<style>
${fontFaces(rc.fonts)}
html, body { margin: 0; background: #111; } canvas { display: block; max-width: 100vw; height: auto; }
</style></head>
<body><canvas id="cv" width="${n}" height="${n}"></canvas>
<script type="module">
import { loadConfig, loadFonts } from './src/core/config.js';
import { loadCast } from './src/core/cast.js';
try { const cfg = await loadConfig(); await loadFonts(40); await loadCast(cfg.cast); await import('./src/core/avatar.js'); }
catch (e) { window.SHEET_ERROR = String(e && e.stack || e); console.error(e); }
</script></body></html>
`;
}

/** the style-sheet page (1920x1080 board drawn by the template's src/sheet.js; it sets window.SHEET_READY) */
export function sheetHtml(rc) {
  const canvases = rc.sheet?.canvases || [], uses3d = canvases.length > 0 || rc.player?.renderer === '3d';
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(rc.title || '')} style sheet</title>
<style>
${fontFaces(rc.fonts)}
html, body { margin: 0; background: #111; } canvas { display: block; max-width: 100vw; height: auto; } .off { display: none; }
</style></head>
<body><canvas id="cv" width="1920" height="1080"></canvas>${canvases.map(([id, w, h]) => `<canvas id="${esc(id)}" class="off" width="${w}" height="${h}"></canvas>`).join('')}
${uses3d ? THREE_MAP + '\n' : ''}<script type="module">
import { loadConfig } from './src/core/config.js';
import { seedRandom } from './src/core/random.js';
import { loadCast } from './src/core/cast.js';
try { const cfg = await loadConfig(); seedRandom(cfg.player?.seed ?? 1); await loadCast(cfg.cast); await import('./src/sheet.js'); } catch (e) { window.SHEET_ERROR = String(e && e.stack || e); console.error(e); }
</script></body></html>
`;
}
