// The player: one boot for every template. config → fonts → script + timing → captions → (3D engine) → shots.
// draw(t) renders film time t as a pure function of t. window.OP is the API the studio renderer drives:
//   ready, bootError, config, duration(), draw(t), frame(t, q) (a promise when the template has prepare), shots(), captions(), cues(),
//   layer ('shot' | 'caption': what draw() is drawing right now, so the studio's text lint can tell captions apart).
// template.json "player" picks the renderer and the camera feel:
//   renderer "2d": the shot draws on the canvas; the player adds a punch-in on each cut, a slow push (shot.zoom) around
//                  shot.cam, and an optional white flash on cuts.
//   renderer "3d": the shot renders into the hidden WebGL canvas and calls blit() to copy it; it owns its camera.
import { W, H, setCtx, ctx, clamp, eo, eio } from './core/lib.js';
import { T, loadTiming } from './core/timing.js';
import { CFG, loadConfig, loadFonts } from './core/config.js';
import { buildCaptions, drawCaption, captionList } from './core/captions.js';
import { seedRandom } from './core/random.js';
import { loadCast } from './core/cast.js';

const PLAYER_DEFAULTS = { renderer: '2d', seed: 1, punch: 0.13, punchDur: 0.32, flash: 0.55, flashDur: 0.12, fadeIn: 0.25, fadeOut: 0.35, zoom: 0.06, cam: [540, 900], background: '#000', motionBlur: 1, shutter: 1 / 60 };
const cv = document.getElementById('cv'), GL = document.getElementById('gl');
setCtx(cv.getContext('2d'));
const OP = (window.OP = { ready: false });
let P = PLAYER_DEFAULTS;

function shotAt(t) {
  const S = OP._shots; let i = S.length - 1; while (i > 0 && S[i].at > t) i--;
  const sh = S[i], end = i < S.length - 1 ? S[i + 1].at : T.dur;
  return { i, sh, d: end - sh.at, lt: t - sh.at };
}

function drawShot2d(i, sh, lt, d, t) {
  ctx.fillStyle = P.background; ctx.fillRect(0, 0, W, H);
  // camera: punch-in on the cut + a slow push across the shot ("camera always moving")
  const punch = 1 + P.punch * (1 - eo(clamp(lt / P.punchDur)));
  const drift = 1 + (sh.zoom ?? P.zoom) * eio(clamp(lt / d));
  const [cx, cy] = sh.cam || P.cam;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(punch * drift, punch * drift); ctx.translate(-cx, -cy);
  sh.draw(lt, d, t);
  ctx.restore();
  ctx.globalAlpha = 1; ctx.letterSpacing = '0px';
  if (P.flash && i > 0 && lt < P.flashDur) { ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = P.flash * (1 - lt / P.flashDur); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}

// player.motionBlur n > 1 (opt-in): the shot is drawn at n sub-frame times spread over player.shutter seconds around t
// and averaged, never across a cut (sub-frames stay inside the shot). Still a pure function of t.
function drawShot3d(i, sh, lt, d, t) {
  const n = Math.max(1, Math.round(P.motionBlur || 1));
  let k = 0;
  const blit = () => { ctx.globalAlpha = 1 / (k + 1); ctx.drawImage(GL, 0, 0, W, H); ctx.globalAlpha = 1; };
  for (; k < n; k++) {
    const st = n > 1 ? clamp(t + P.shutter * ((k + 0.5) / n - 0.5), sh.at, sh.at + d - 1e-4) : t;
    ctx.save(); sh.draw(st - sh.at, d, st, blit); ctx.restore();
  }
  ctx.globalAlpha = 1; ctx.letterSpacing = '0px';
}

function draw(t) {
  t = clamp(t, 0, T.dur - 1e-4);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.letterSpacing = '0px';
  OP.layer = 'shot';
  const { i, sh, d, lt } = shotAt(t);
  (P.renderer === '3d' ? drawShot3d : drawShot2d)(i, sh, lt, d, t);
  // fade from / to black at the start and end
  const fade = Math.min(clamp(t / P.fadeIn), clamp((T.dur - t) / P.fadeOut));
  if (fade < 1) { ctx.fillStyle = '#000'; ctx.globalAlpha = 1 - fade; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  OP.layer = 'caption';
  drawCaption(t);
  OP.layer = 'shot';
}

async function makeEngine3d() {
  const { makeEngine, RES, AA } = await import('./core/engine.js');
  GL.width = Math.round(W * RES); GL.height = Math.round(H * RES);
  return makeEngine(GL, { w: GL.width, h: GL.height, samples: AA });
}

function startPreview() {
  const q = new URLSearchParams(location.search);
  if (q.has('capture')) return;
  if (q.has('t')) return draw(+q.get('t'));
  const audio = new Audio('data/mix.wav'); let t0 = null;
  const btn = document.getElementById('play'); btn.hidden = false;
  btn.onclick = () => { btn.hidden = true; t0 = performance.now(); audio.currentTime = 0; audio.play().catch(() => {}); };
  const loop = (now) => { const t = t0 == null ? 0 : (now - t0) / 1000; draw(t); if (t0 != null && t > T.dur) { t0 = null; btn.hidden = false; } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}

(async () => {
  try {
    await loadConfig();
    P = { ...PLAYER_DEFAULTS, ...CFG.player };
    seedRandom(P.seed);
    await loadFonts();
    await loadCast(CFG.cast);
    const script = await (await fetch('script.json', { cache: 'no-store' })).json();
    await loadTiming();
    buildCaptions(script);
    const E = P.renderer === '3d' ? await makeEngine3d() : null;
    const { buildShots } = await import('./shots.js');
    const { shots, cues, prepare } = buildShots(E);
    if (!shots.length) throw new Error('src/shots.js returned no shots');
    shots.sort((a, b) => a.at - b.at);
    OP._shots = shots; OP.script = script; OP.config = CFG;
    OP.duration = () => T.dur;
    OP.draw = draw;
    // a template may return prepare(t): an async loader (e.g. a pre-rendered plate frame) awaited before drawing t
    OP.frame = prepare
      ? async (t, q = 0.92) => { await prepare(clamp(t, 0, T.dur - 1e-4)); draw(t); return cv.toDataURL('image/jpeg', q); }
      : (t, q = 0.92) => { draw(t); return cv.toDataURL('image/jpeg', q); };
    OP.shots = () => shots.map((s, i) => ({ id: s.id, at: +s.at.toFixed(3), end: +(i < shots.length - 1 ? shots[i + 1].at : T.dur).toFixed(3), note: s.note || '' }));
    OP.captions = () => captionList().map((c) => ({ s: +c.s.toFixed(3), e: +c.e.toFixed(3), text: c.text ?? c.words.map((w) => (w.hi ? '*' : '') + w.txt).join(' ') }));
    OP.cues = () => cues.slice().sort((a, b) => a.t - b.t);
    OP.ready = true;
    startPreview();
  } catch (e) { OP.bootError = String(e && e.stack || e); console.error(e); }
})();
