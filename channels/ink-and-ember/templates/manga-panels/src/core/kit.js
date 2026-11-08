// Manga Panels: the COMPONENT KIT for Ink & Ember. Black-and-white manga ink (paper, ink, screentone), panels that
// assemble and break, a camera that pans across the page, speed / focus lines, impact bursts, bubbles, SFX lettering,
// and the ember COLOUR BURST for key beats. Every function is a pure function of its arguments (and t): no state is
// carried between frames. Randomness comes from rnd(i) (deterministic), and "boiling" ink re-rolls at 12 fps via
// boil(t), the way hand-drawn speed lines flicker.
import { ctx, W, H, TAU, clamp, lerp, seg, eo, eio, eob, rnd } from './lib.js';

// ═════════════════════════ palette ═════════════════════════
export const P = {
  paper: '#F6F3EC', ink: '#111014', white: '#FFFFFF', grey: '#8E8B86', tone: '#C9C5BD',
  ember: '#FF4A1C', emberHot: '#FFB020', emberDeep: '#B3170D', glow: '#FFE6B0',
  blue: '#39B8FF', gold: '#FFC21A', jade: '#22C98A',
};
export const CAPTION_TOP = 1300;                 // keep faces and key action above this line (captions sit at y ≈ 1470)
/** the 12 fps "boil" frame index: hand-drawn effects re-roll on it */
export const boil = (t, fps = 12) => Math.floor(t * fps);

// ═════════════════════════ screentone ═════════════════════════
const PAT = new WeakMap();
/** a screentone pattern: 'dots' (light) · 'dots2' (mid) · 'dots3' (dense) · 'lines' (hatch) · 'cross' (cross-hatch) */
export function tone(kind = 'dots', scale = 1) {
  let m = PAT.get(ctx); if (!m) PAT.set(ctx, (m = {}));
  const key = kind + scale; if (m[key]) return m[key];
  const n = Math.round(14 * scale), c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'); g.fillStyle = P.paper; g.fillRect(0, 0, n, n); g.fillStyle = P.ink; g.strokeStyle = P.ink;
  if (kind.startsWith('dots')) {
    const r = n * (kind === 'dots3' ? 0.36 : kind === 'dots2' ? 0.27 : 0.17);
    for (const [x, y] of [[0, 0], [n, 0], [0, n], [n, n], [n / 2, n / 2]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  } else {
    g.lineWidth = n * 0.16; g.beginPath(); g.moveTo(0, n); g.lineTo(n, 0); g.moveTo(-n / 2, n / 2); g.lineTo(n / 2, -n / 2); g.moveTo(n / 2, n * 1.5); g.lineTo(n * 1.5, n / 2);
    if (kind === 'cross') { g.moveTo(0, 0); g.lineTo(n, n); g.moveTo(-n / 2, n / 2); g.lineTo(n / 2, n * 1.5); g.moveTo(n / 2, -n / 2); g.lineTo(n * 1.5, n / 2); }
    g.stroke();
  }
  const p = ctx.createPattern(c, 'repeat'); if (kind.startsWith('dots')) try { p.setTransform(new DOMMatrix().rotateSelf(45)); } catch (e) { /* ok */ }
  return (m[key] = p);
}
/** fill the current path region (or a rect) with a tone */
export function toneRect(x, y, w, h, kind = 'dots', scale = 1) { ctx.fillStyle = tone(kind, scale); ctx.fillRect(x, y, w, h); }
/**
 * gradient screentone: dots that grow from nothing to solid along a direction. (x0,y0)→(x1,y1) is the ramp,
 * clipped to the rect. step = dot spacing. Drawn as ONE path, so it is cheap.
 */
export function toneGrad(x, y, w, h, x0, y0, x1, y1, step = 16, maxK = 1) {
  const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.beginPath();
  for (let j = 0, yy = y; yy <= y + h + step; j++, yy += step * 0.866) {
    for (let xx = x + (j % 2 ? step / 2 : 0); xx <= x + w + step; xx += step) {
      const u = clamp(((xx - x0) * dx + (yy - y0) * dy) / L2) * maxK, r = step * 0.62 * Math.sqrt(u);
      if (r < 0.6) continue; ctx.moveTo(xx + r, yy); ctx.arc(xx, yy, r, 0, TAU);
    }
  }
  ctx.fillStyle = P.ink; ctx.fill(); ctx.restore();
}
/** radial gradient tone: dots grow away from (cx, cy) between r0 and r1 (a spotlight / vignette in ink) */
export function toneRadial(cx, cy, r0, r1, step = 18, x = -300, y = -300, w = W + 600, h = H + 600) {
  ctx.save(); ctx.beginPath();
  for (let j = 0, yy = y; yy <= y + h; j++, yy += step * 0.866) for (let xx = x + (j % 2 ? step / 2 : 0); xx <= x + w; xx += step) {
    const u = clamp((Math.hypot(xx - cx, yy - cy) - r0) / (r1 - r0)), r = step * 0.62 * Math.sqrt(u);
    if (r < 0.6) continue; ctx.moveTo(xx + r, yy); ctx.arc(xx, yy, r, 0, TAU);
  }
  ctx.fillStyle = P.ink; ctx.fill(); ctx.restore();
}
/** hand hatching inside a rect: parallel strokes at angle a (rad), slightly wobbly, boiling */
export function hatch(x, y, w, h, a = -0.8, gap = 16, lw = 3, t = 0) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const cx = x + w / 2, cy = y + h / 2, R = Math.hypot(w, h) / 2 + gap, c = Math.cos(a), s = Math.sin(a), b = boil(t, 6);
  ctx.beginPath();
  for (let d = -R; d <= R; d += gap) {
    const j = (rnd(d * 3.1 + b) - 0.5) * gap * 0.4;
    ctx.moveTo(cx + c * -R - s * (d + j), cy + s * -R + c * (d + j)); ctx.lineTo(cx + c * R - s * (d - j), cy + s * R + c * (d - j));
  }
  ctx.strokeStyle = P.ink; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
}

// ═════════════════════════ ink primitives ═════════════════════════
export function poly(pts, fill, lw = 0, color = P.ink) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.lineJoin = 'round'; ctx.stroke(); }
}
export function stroke(pts, lw = 4, color = P.ink) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}
export function fillAll(c) { ctx.fillStyle = c; ctx.fillRect(-400, -400, W + 800, H + 800); }
/** a brush stroke: thick in the middle, tapering at both ends, slight dry-brush gaps */
export function brush(x0, y0, x1, y1, w, color = P.ink, k = 1, seed = 1) {
  if (k <= 0) return;
  const xe = lerp(x0, x1, k), ye = lerp(y0, y1, k), dx = xe - x0, dy = ye - y0, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, N = 24;
  const top = [], bot = [];
  for (let i = 0; i <= N; i++) { const u = i / N, ww = w * Math.pow(Math.sin(Math.PI * clamp(u * 0.92 + 0.04)), 0.5) * (0.9 + 0.2 * rnd(seed + i)); top.push([x0 + dx * u + nx * ww / 2, y0 + dy * u + ny * ww / 2]); bot.push([x0 + dx * u - nx * ww / 2, y0 + dy * u - ny * ww / 2]); }
  poly([...top, ...bot.reverse()], color);
  for (let i = 0; i < 4; i++) { const u = 0.2 + rnd(seed * 7 + i) * 0.7, o = (rnd(seed * 11 + i) - 0.5) * w * 0.6; stroke([[x0 + dx * u + nx * o, y0 + dy * u + ny * o], [x0 + dx * (u + 0.12) + nx * o, y0 + dy * (u + 0.12) + ny * o]], 2.5, P.paper); }
}
/** an ink splatter (blot + droplets) */
export function splat(x, y, r, seed = 1, color = P.ink) {
  ctx.beginPath();
  for (let i = 0; i <= 18; i++) { const a = i / 18 * TAU, rr = r * (0.75 + rnd(seed + i) * 0.45); i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  for (let i = 0; i < 9; i++) { const a = rnd(seed * 3 + i) * TAU, d = r * (1.3 + rnd(seed * 5 + i) * 1.2), s = r * (0.05 + rnd(seed * 9 + i) * 0.12); ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, s, 0, TAU); ctx.fill(); }
}

// ═════════════════════════ camera + shake ═════════════════════════
/** keyframed camera: keys = [[time, x, y, zoom], ...] (eased between keys) → { x, y, z } */
export function camAt(keys, lt) {
  if (lt <= keys[0][0]) return { x: keys[0][1], y: keys[0][2], z: keys[0][3] };
  for (let i = 1; i < keys.length; i++) if (lt < keys[i][0]) {
    const [a, b] = [keys[i - 1], keys[i]], k = eio(seg(lt, a[0], b[0]));
    return { x: lerp(a[1], b[1], k), y: lerp(a[2], b[2], k), z: lerp(a[3], b[3], k) };
  }
  const l = keys[keys.length - 1]; return { x: l[1], y: l[2], z: l[3] };
}
/** draw fn with the page point (cam.x, cam.y) at the screen centre, zoomed by cam.z */
export function withCam(cam, fn) { ctx.save(); ctx.translate(540, 960); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y); fn(); ctx.restore(); }
/** impact shake offset that decays after time `at` (seconds, local) */
export function shake(lt, at, amp = 24, dur = 0.35) { if (lt < at || lt > at + dur) return [0, 0]; const k = 1 - (lt - at) / dur, b = boil(lt, 30); return [(rnd(b) - 0.5) * 2 * amp * k, (rnd(b + 50) - 0.5) * 2 * amp * k]; }

// ═════════════════════════ panels ═════════════════════════
/** page layouts: lists of panel polygons in screen space (1080x1920), slanted gutters like a manga page */
export const LAYOUT = {
  full: () => [[[0, 0], [W, 0], [W, H], [0, H]]],
  /** two rows split at y with a slant (px of rise across the page) */
  two: (y = 900, slant = 120, gap = 22) => [[[0, 0], [W, 0], [W, y - slant / 2 - gap / 2], [0, y + slant / 2 - gap / 2]], [[0, y + slant / 2 + gap / 2], [W, y - slant / 2 + gap / 2], [W, H], [0, H]]],
  /** three rows */
  three: (y1 = 620, y2 = 1220, s1 = 90, s2 = -90, gap = 22) => [
    [[0, 0], [W, 0], [W, y1 - s1 / 2 - gap / 2], [0, y1 + s1 / 2 - gap / 2]],
    [[0, y1 + s1 / 2 + gap / 2], [W, y1 - s1 / 2 + gap / 2], [W, y2 - s2 / 2 - gap / 2], [0, y2 + s2 / 2 - gap / 2]],
    [[0, y2 + s2 / 2 + gap / 2], [W, y2 - s2 / 2 + gap / 2], [W, H], [0, H]]],
  /** a top row split in two columns (slanted), then one big panel below */
  topSplit: (y = 760, x = 540, lean = 120, slant = 80, gap = 22) => [
    [[0, 0], [x + lean / 2 - gap / 2, 0], [x - lean / 2 - gap / 2, y + slant / 2 - gap / 2], [0, y + slant / 2 - gap / 2]],
    [[x + lean / 2 + gap / 2, 0], [W, 0], [W, y - slant / 2 - gap / 2], [x - lean / 2 + gap / 2, y - (x - lean / 2) / W * slant + slant / 2 - gap / 2]],
    [[0, y + slant / 2 + gap / 2], [W, y - slant / 2 + gap / 2], [W, H], [0, H]]],
};
function pathOf(pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
const centroid = (pts) => pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);
/** scale a polygon about its centroid */
export function inset(pts, k) { const c = centroid(pts); return pts.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]); }

/**
 * one panel: content clipped to poly, then an ink border.
 * o = { enter: 0..1 (assemble), from: 'left' | 'right' | 'top' | 'bottom' | 'pop', border: px (default 9),
 *       bg: fill before content, alpha, rot }
 * The content fn draws in SCREEN space (the panel is a window onto it), so a character can sit across a gutter
 * by being drawn in two panels.
 */
export function panel(pts, fn, o = {}) {
  const k = clamp(o.enter ?? 1); if (k <= 0) return;
  const e = eo(k), c = centroid(pts);
  let dx = 0, dy = 0, sc = 1;
  const f = o.from || 'pop';
  if (f === 'left') dx = -W * 0.9 * (1 - e); else if (f === 'right') dx = W * 0.9 * (1 - e);
  else if (f === 'top') dy = -H * 0.6 * (1 - e); else if (f === 'bottom') dy = H * 0.6 * (1 - e);
  else sc = lerp(0.6, 1, eob(k));
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  ctx.translate(c[0] + dx, c[1] + dy); ctx.rotate(o.rot || 0); ctx.scale(sc, sc); ctx.translate(-c[0], -c[1]);
  ctx.save(); pathOf(pts); ctx.clip();
  ctx.fillStyle = o.bg || P.paper; ctx.fillRect(-400, -400, W + 800, H + 800);
  fn();
  ctx.restore();
  const b = o.border ?? 9;
  if (b) { pathOf(pts); ctx.lineWidth = b; ctx.strokeStyle = P.ink; ctx.lineJoin = 'miter'; ctx.stroke(); }
  ctx.restore();
}
/** the page under the panels: paper (or ink for a dark page) */
export function page(dark = false) { fillAll(dark ? P.ink : P.paper); }

/**
 * a panel BREAKING: it cracks along shards from (cx, cy) and the pieces fly apart and spin away.
 * k: 0 (whole, cracks appear in the first 15 %) → 1 (gone). The content fn is drawn once per shard.
 */
export function shatter(pts, fn, k, cx, cy, seed = 3, o = {}) {
  if (k >= 1) return;
  const n = o.shards || 7, R = 2600, cracks = [];
  for (let i = 0; i < n; i++) cracks.push((i + 0.15 + rnd(seed + i) * 0.7) / n * TAU);
  const fly = eo(seg(k, 0.15, 1));
  for (let i = 0; i < n; i++) {
    const a0 = cracks[i], a1 = cracks[(i + 1) % n] + (i === n - 1 ? TAU : 0), am = (a0 + a1) / 2;
    const tri = [[cx, cy], [cx + Math.cos(a0) * R, cy + Math.sin(a0) * R], [cx + Math.cos(am) * R * 1.2, cy + Math.sin(am) * R * 1.2], [cx + Math.cos(a1) * R, cy + Math.sin(a1) * R]];
    const v = 900 * fly, rot = (rnd(seed * 3 + i) - 0.5) * 1.4 * fly;
    ctx.save();
    ctx.translate(Math.cos(am) * v, Math.sin(am) * v + 600 * fly * fly);
    ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-cx, -cy);
    ctx.globalAlpha = 1 - seg(k, 0.6, 1);
    ctx.save(); pathOf(pts); ctx.clip(); pathOf(tri); ctx.clip(); ctx.fillStyle = P.paper; ctx.fillRect(-400, -400, W + 800, H + 800); fn(); ctx.restore();
    ctx.save(); pathOf(pts); ctx.clip(); pathOf(tri); ctx.lineWidth = 8; ctx.strokeStyle = P.ink; ctx.stroke(); ctx.restore();
    ctx.restore();
  }
  // crack lines while it holds together
  if (k < 0.2) { ctx.save(); pathOf(pts); ctx.clip(); for (const a of cracks) { const L = 2400 * eo(seg(k, 0, 0.15)); stroke([[cx, cy], [cx + Math.cos(a) * L * 0.4 + 14, cy + Math.sin(a) * L * 0.4 - 10], [cx + Math.cos(a) * L, cy + Math.sin(a) * L]], 7); } ctx.restore(); }
}

// ═════════════════════════ speed lines, focus lines, impacts ═════════════════════════
/** radial focus lines toward (cx, cy): ink wedges from outside the frame in to radius `inner`, boiling at 12 fps */
export function focusLines(cx, cy, inner = 300, o = {}) {
  const n = o.n ?? 90, t = o.t ?? 0, b = boil(t), R = 2400, color = o.color || P.ink, a = o.alpha ?? 1;
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const ang = (i + rnd(i * 7 + b) * 0.8) / n * TAU, w = (0.004 + rnd(i * 13 + b) * 0.012) * TAU, r0 = inner * (0.85 + rnd(i * 3 + b) * 0.5);
    ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
    ctx.lineTo(cx + Math.cos(ang - w) * R, cy + Math.sin(ang - w) * R); ctx.lineTo(cx + Math.cos(ang + w) * R, cy + Math.sin(ang + w) * R); ctx.closePath();
  }
  ctx.fill(); ctx.restore();
}
/** parallel speed lines across the frame at angle a (rad): the background of a dash */
export function speedLines(a = 0, o = {}) {
  const n = o.n ?? 70, t = o.t ?? 0, b = boil(t), color = o.color || P.ink, c = Math.cos(a), s = Math.sin(a), cx = o.cx ?? 540, cy = o.cy ?? 960, gapC = o.clear ?? 0;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const d = (rnd(i * 17 + b) - 0.5) * 2400, L = 500 + rnd(i * 5 + b) * 1400, off = (rnd(i * 29 + b) - 0.5) * 2000, w = 2 + rnd(i * 41 + b) * 9;
    if (Math.abs(d) < gapC) continue;
    const x0 = cx - s * d + c * off, y0 = cy + c * d + s * off;
    ctx.moveTo(x0, y0); ctx.lineTo(x0 + c * L - s * w, y0 + s * L + c * w); ctx.lineTo(x0 + c * L + s * w * 0.2, y0 + s * L - c * w * 0.2); ctx.closePath();
  }
  ctx.fill(); ctx.restore();
}
/** an impact burst: a spiky star, white with an ink outline (or filled), scale k */
export function impact(x, y, r, k = 1, o = {}) {
  if (k <= 0) return;
  const n = o.spikes ?? 16, b = boil(o.t ?? 0), rr = r * eob(clamp(k));
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0); ctx.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU, q = i % 2 ? 0.45 + rnd(i + b) * 0.12 : 0.85 + rnd(i * 3 + b) * 0.3; ctx.lineTo(Math.cos(a) * rr * q, Math.sin(a) * rr * q); }
  ctx.closePath(); ctx.fillStyle = o.fill || P.white; ctx.fill(); ctx.lineWidth = o.lw ?? 10; ctx.strokeStyle = P.ink; ctx.lineJoin = 'miter'; ctx.stroke();
  if (o.inner !== false) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU + 0.1, q = i % 2 ? 0.3 : 0.55 + rnd(i * 5 + b) * 0.15; ctx.lineTo(Math.cos(a) * rr * q, Math.sin(a) * rr * q); } ctx.closePath(); ctx.lineWidth = 4; ctx.stroke(); }
  ctx.restore();
}
/** a white "impact frame": inverts the feeling of a hit for a few frames (draw it over everything) */
export function flash(a, color = P.white) { if (a <= 0) return; ctx.save(); ctx.globalAlpha = clamp(a); fillAll(color); ctx.restore(); }

// ═════════════════════════ lettering: bubbles, boxes, SFX ═════════════════════════
function wrap(text, font, maxW) {
  ctx.font = font; const out = []; let cur = '';
  for (const w of text.split(/\s+/)) { const tryS = cur ? cur + ' ' + w : w; if (ctx.measureText(tryS).width > maxW && cur) { out.push(cur); cur = w; } else cur = tryS; }
  if (cur) out.push(cur); return out;
}
/**
 * speech bubble with a tail. kind: 'speech' (ellipse) · 'shout' (jagged burst) · 'thought' (cloud + trail) · 'whisper' (dashed)
 * text is lettered in caps, centred; k 0..1 pops it in. tail = [x, y] the speaker's mouth.
 */
export function bubble(x, y, text, o = {}) {
  const k = clamp(o.k ?? 1); if (k <= 0) return;
  const kind = o.kind || 'speech', size = o.size || 46, font = `900 ${size}px Inter`, maxW = o.maxW || 420;
  const lines = wrap(text.toUpperCase(), font, maxW), lh = size * 1.12;
  const tw = Math.max(...lines.map((l) => (ctx.font = font, ctx.measureText(l).width))), th = lines.length * lh;
  const rx = Math.max(tw / 2 + size * 0.95, size * 1.6), ry = th / 2 + size * 0.8, sc = eob(k), b = boil(o.t ?? 0, 8);
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
  const tail = o.tail;
  const outline = () => {
    ctx.beginPath();
    if (kind === 'shout') {
      const n = 22; for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * TAU, q = i % 2 ? 1 : 1.22 + rnd(i + b) * 0.12; ctx.lineTo(x + Math.cos(a) * rx * q, y + Math.sin(a) * ry * q); }
    } else if (kind === 'thought') {
      const n = 11; for (let i = 0; i < n; i++) { const a = i / n * TAU, bx = x + Math.cos(a) * rx * 0.92, by = y + Math.sin(a) * ry * 0.9; ctx.moveTo(bx + rx * 0.3, by); ctx.ellipse(bx, by, rx * 0.3, ry * 0.36, 0, 0, TAU); }
      ctx.moveTo(x + rx * 0.95, y); ctx.ellipse(x, y, rx * 0.95, ry * 0.92, 0, 0, TAU);
    } else ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  };
  // tail first (outline), then the body over it, then the tail fill joins the body
  const tailPts = tail && kind !== 'thought' ? (() => { const a = Math.atan2(tail[1] - y, tail[0] - x), w = Math.min(rx, ry) * 0.32, bx = x + Math.cos(a) * rx * 0.7, by = y + Math.sin(a) * ry * 0.7; return [[bx - Math.sin(a) * w, by + Math.cos(a) * w], tail, [bx + Math.sin(a) * w, by - Math.cos(a) * w]]; })() : null;
  const fill = o.fill || P.white, lw = o.lw ?? 6;
  if (o.kind === 'whisper') ctx.setLineDash([14, 10]);
  if (tailPts) { poly(tailPts, fill, lw); }
  outline(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = P.ink; ctx.lineJoin = 'round'; ctx.stroke();
  if (tailPts) { poly(tailPts, fill, 0); }
  ctx.setLineDash([]);
  if (kind === 'thought' && tail) for (let i = 1; i <= 3; i++) { const u = i / 4, bx = lerp(x, tail[0], 0.45 + u * 0.55), by = lerp(y + ry, tail[1], u); ctx.beginPath(); ctx.ellipse(bx, by, 18 - i * 4, 14 - i * 3, 0, 0, TAU); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 5; ctx.stroke(); }
  ctx.fillStyle = o.color || P.ink; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, x, y - th / 2 + lh * (i + 0.5) + size * 0.05));
  ctx.restore();
}
/** a rectangular narration box (the manga "caption box"), serif lettering */
export function narrBox(x, y, text, o = {}) {
  const k = clamp(o.k ?? 1); if (k <= 0) return;
  const size = o.size || 40, font = `700 ${size}px Caladea`, lines = wrap(text, font, o.maxW || 520), lh = size * 1.18;
  const tw = Math.max(...lines.map((l) => (ctx.font = font, ctx.measureText(l).width))), w = tw + size * 1.2, h = lines.length * lh + size * 0.8;
  ctx.save(); ctx.globalAlpha *= eo(k); ctx.translate(0, (1 - eo(k)) * 20);
  poly([[x - w / 2 + 8, y - h / 2 + 8], [x + w / 2 + 8, y - h / 2 + 8], [x + w / 2 + 8, y + h / 2 + 8], [x - w / 2 + 8, y + h / 2 + 8]], P.ink);
  poly([[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]], o.dark ? P.ink : P.white, 5, o.dark ? P.white : P.ink);
  ctx.fillStyle = o.dark ? P.white : P.ink; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, x, y - (lines.length * lh) / 2 + lh * (i + 0.5)));
  ctx.restore();
}
/**
 * SFX lettering: big hand-lettered sound effect. Letters pop in one by one (k 0..1), each slightly rotated and scaled,
 * thick white halo + ink outline + fill. o = { rot, fill, size, skew, shake (px), t, spread }
 */
export function sfx(text, x, y, o = {}) {
  const k = clamp(o.k ?? 1); if (k <= 0) return;
  const size = o.size || 170, n = text.length, t = o.t ?? 0, b = boil(t, 10), sp = o.spread ?? 1.0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -0.12); ctx.transform(1, 0, o.skew ?? -0.18, 1, 0, 0);
  ctx.font = `900 ${size}px Inter`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const widths = [...text].map((c) => ctx.measureText(c).width * sp), total = widths.reduce((a, w) => a + w, 0);
  let cx = -total / 2;
  [...text].forEach((ch, i) => {
    const w = widths[i], li = clamp((k * (n + 2) - i) / 2.2); cx += w / 2;
    if (li > 0) {
      const sh = o.shake ? [(rnd(i + b) - 0.5) * o.shake, (rnd(i * 3 + b) - 0.5) * o.shake] : [0, 0];
      const grow = 1 + i / n * (o.grow ?? 0.35);
      ctx.save(); ctx.translate(cx + sh[0], sh[1] + Math.sin(i * 1.7) * size * 0.06); ctx.rotate((rnd(i * 11) - 0.5) * 0.18); ctx.scale(eob(li) * grow, eob(li) * grow);
      ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.2; ctx.strokeStyle = o.halo || P.white; ctx.strokeText(ch, 0, 0);
      ctx.lineWidth = size * 0.075; ctx.strokeStyle = P.ink; ctx.strokeText(ch, 0, 0);
      ctx.fillStyle = o.fill || P.ink; ctx.fillText(ch, 0, 0);
      ctx.restore();
    }
    cx += w / 2;
  });
  ctx.restore();
}

// ═════════════════════════ the COLOUR BURST (B&W → ember colour on a key beat) ═════════════════════════
function flameRing(cx, cy, r, t, jag = 0.09) {
  ctx.beginPath(); const n = 64, b = boil(t, 12);
  for (let i = 0; i <= n; i++) { const a = i / n * TAU, q = 1 + (i % 2 ? -jag : jag * (0.6 + rnd(i + b) * 1.2)); const x = cx + Math.cos(a) * r * q, y = cy + Math.sin(a) * r * q; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.closePath();
}
/** warm the page: a multiply wash, so paper turns to fire-light and ink stays black. hue: 'ember' | 'blue' | 'gold' | 'jade' */
export function wash(cx, cy, r, a = 1, hue = 'ember') {
  if (a <= 0) return;
  const H3 = { ember: ['#FFF1D6', '#FFA25A', '#E8381C', '#7A0E08'], blue: ['#E8F7FF', '#7FD0FF', '#2A7FE0', '#0D2A6A'], gold: ['#FFF7DA', '#FFD45A', '#E89A12', '#6A4206'], jade: ['#E6FFF4', '#7FE8B8', '#18A870', '#06402A'] }[hue];
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = clamp(a);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, H3[0]); g.addColorStop(0.35, H3[1]); g.addColorStop(0.75, H3[2]); g.addColorStop(1, H3[3]);
  ctx.fillStyle = g; ctx.fillRect(-400, -400, W + 800, H + 800); ctx.restore();
}
/**
 * The signature transition. draw(mode) draws the scene: mode 'mono' (B&W) or 'full' (colour; characters get
 * color: 'full'). k 0..1: a jagged ring of fire spreads from (cx, cy); inside it the scene is in colour and washed in
 * fire-light; the ring itself is ink with ember flames. k = 1: full colour moment. o = { hue, t, wash (0..1) }
 */
export function colorBurst(k, cx, cy, draw, o = {}) {
  const t = o.t ?? 0, hue = o.hue || 'ember';
  if (k < 1) draw('mono');
  if (k <= 0) return;
  const r = k >= 1 ? 4000 : 2600 * eo(k);
  ctx.save();
  if (k < 1) { flameRing(cx, cy, r, t); ctx.clip(); }
  draw('full');
  wash(cx, cy, Math.max(900, r * 1.1), o.wash ?? 0.9, hue);
  ctx.restore();
  if (k < 1) {
    const col = { ember: P.ember, blue: P.blue, gold: P.gold, jade: P.jade }[hue];
    flameRing(cx, cy, r, t); ctx.lineWidth = 14; ctx.strokeStyle = P.ink; ctx.stroke();
    const n = 26;
    for (let i = 0; i < n; i++) { const a = i / n * TAU + rnd(i) * 0.2, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2); flameTongue(0, 0, 26 + rnd(i * 3) * 18, 70 + rnd(i * 5 + boil(t)) * 60, t * 14 + i, col); ctx.restore(); }
  }
}
/** one flame tongue standing on (x, y), pointing up (-y) */
export function flameTongue(x, y, w, h, ph, fill = P.ember, lw = 4) {
  const k = Math.sin(ph) * 0.2;
  ctx.beginPath(); ctx.moveTo(x - w, y);
  ctx.bezierCurveTo(x - w * 1.1, y - h * 0.45, x - w * (0.2 - k), y - h * 0.55, x + w * k * 2, y - h);
  ctx.bezierCurveTo(x + w * (0.35 + k), y - h * 0.6, x + w * 1.1, y - h * 0.4, x + w, y);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = P.ink; ctx.stroke(); }
}
/** a wall of flames along y (colour or white-ink), height h */
export function flames(x0, x1, y, h, t, fill = P.ember, n = 14) {
  for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; flameTongue(lerp(x0, x1, u) + Math.sin(i * 2.3) * 20, y, (x1 - x0) / n * 0.8, h * (0.6 + 0.5 * rnd(i) + 0.15 * Math.sin(t * 12 + i)), t * 10 + i * 1.3, fill, 5); }
}
/** rising sparks (embers): colour ones in a colour moment, white-ink ones on the page */
export function sparks(t, n = 40, o = {}) {
  const color = o.color || P.ember, x0 = o.x ?? 0, w = o.w ?? W, y0 = o.y ?? H, h = o.h ?? H;
  for (let i = 0; i < n; i++) {
    const sp = 120 + rnd(i * 7) * 260, life = h / sp, ph = ((t + rnd(i) * life) % life) / life;
    const x = x0 + rnd(i * 3) * w + Math.sin(t * 2 + i) * 30, y = y0 - ph * h, r = (3 + rnd(i * 5) * 7) * (1 - ph * 0.6);
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 3 + i); ctx.fillStyle = color; ctx.fillRect(-r, -r, r * 2, r * 2);
    if (o.outline !== false) { ctx.lineWidth = 2; ctx.strokeStyle = P.ink; ctx.strokeRect(-r, -r, r * 2, r * 2); }
    ctx.restore();
  }
}

// ═════════════════════════ the world of Cinderhollow (sets, in ink) ═════════════════════════
/** falling ash: grey-white flakes drifting down (dark = drawn for an ink background) */
export function ash(t, n = 70, o = {}) {
  const dark = !!o.dark;
  for (let i = 0; i < n; i++) {
    const sp = 60 + rnd(i * 5) * 90, ph = (t * sp + rnd(i) * (H + 400)) % (H + 400), x = (rnd(i * 9) * (W + 400) - 200) + Math.sin(t * 0.8 + i) * 40, y = ph - 200;
    const r = 3 + rnd(i * 13) * 7 * (o.scale ?? 1);
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, i + t, 0, TAU);
    ctx.fillStyle = dark ? (i % 3 ? '#BDB9B0' : P.white) : (i % 3 ? '#A9A59D' : P.white); ctx.fill();
    if (!dark && i % 3 === 0) { ctx.lineWidth = 1.5; ctx.strokeStyle = P.ink; ctx.stroke(); }
  }
}
/** sky: 'day' (paper with a tone gradient from the top), 'night' (ink with white ash), 'storm' (hatch + clouds) */
export function sky(kind = 'day', t = 0) {
  if (kind === 'night') { fillAll(P.ink); for (let i = 0; i < 60; i++) { ctx.fillStyle = i % 4 ? '#5A5750' : P.white; ctx.fillRect(rnd(i) * W, rnd(i * 3) * 1100, 3, 3); } return; }
  fillAll(P.paper);
  toneGrad(-300, -300, W + 600, 1300, 0, 900, 0, -300, 18, 0.8);
  if (kind === 'storm') { for (let i = 0; i < 6; i++) cloud(rnd(i) * W, 150 + rnd(i * 3) * 400, 160 + rnd(i * 5) * 120, t, i); }
}
export function cloud(x, y, r, t, seed = 1) {
  ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI, bx = x + Math.cos(Math.PI - a) * r * 1.2 + Math.sin(t * 0.3 + seed) * 20, by = y - Math.sin(a) * r * 0.4; ctx.moveTo(bx + r * 0.5, by); ctx.arc(bx, by, r * (0.45 + rnd(seed + i) * 0.2), 0, TAU); }
  ctx.fillStyle = P.ink; ctx.fill();
}
/**
 * the Cinderhollow skyline: tiers of steep tiled roofs with up-turned eaves, chimneys and lantern-poles, the caldera
 * wall behind. y = ground line; depth 0 (near, solid ink) .. 1 (far, light tone). Deterministic per seed.
 */
export function skyline(y, depth = 0, seed = 1, o = {}) {
  const far = depth > 0.5, fill = far ? tone(depth > 0.8 ? 'dots' : 'dots2') : P.ink, x0 = o.x0 ?? -300, x1 = o.x1 ?? W + 300;
  ctx.save();
  let x = x0 + rnd(seed) * 60;
  ctx.beginPath(); ctx.moveTo(x0, y + 400);
  while (x < x1) {
    const w = 120 + rnd(seed + x) * 170, h = (160 + rnd(seed * 3 + x) * 340) * (1 - depth * 0.35), ex = 26, roof = 40 + rnd(x + seed * 7) * 30;
    ctx.lineTo(x, y); ctx.lineTo(x, y - h);
    // up-turned eave, steep roof, ridge
    ctx.lineTo(x - ex, y - h - 8); ctx.quadraticCurveTo(x + w * 0.15, y - h - 10, x + w * 0.3, y - h - roof); ctx.lineTo(x + w * 0.7, y - h - roof);
    ctx.quadraticCurveTo(x + w * 0.85, y - h - 10, x + w + ex, y - h - 8); ctx.lineTo(x + w, y - h);
    if (rnd(x * 1.3 + seed) > 0.55) { const cx = x + w * 0.62; ctx.lineTo(x + w, y - h); ctx.moveTo(cx, y - h - roof + 4); ctx.lineTo(cx, y - h - roof - 70); ctx.lineTo(cx + 26, y - h - roof - 70); ctx.lineTo(cx + 26, y - h - roof + 4); ctx.moveTo(x + w, y - h); }
    ctx.lineTo(x + w, y); x += w + 8 + rnd(x + 5) * 30;
  }
  ctx.lineTo(x1, y + 400); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  if (!far) { ctx.lineWidth = 3; ctx.strokeStyle = P.ink; ctx.stroke(); }
  // windows: small paper-lit squares on near rows (lanterns are banned, so only a few dim ones)
  if (!far && o.windows !== false) for (let i = 0; i < 26; i++) { const wx = x0 + rnd(seed * 11 + i) * (x1 - x0), wy = y - 40 - rnd(seed * 13 + i) * 160; ctx.fillStyle = o.lit ? P.emberHot : P.paper; ctx.fillRect(wx, wy, 14, 20); }
  ctx.restore();
}
/** the city wall + caldera rim far behind */
export function caldera(y, t = 0) {
  ctx.beginPath(); ctx.moveTo(-300, y); for (let x = -300; x <= W + 300; x += 60) ctx.lineTo(x, y - 220 - Math.sin(x * 0.004) * 120 - rnd(x) * 30); ctx.lineTo(W + 300, y + 300); ctx.lineTo(-300, y + 300); ctx.closePath();
  ctx.fillStyle = tone('dots'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = P.ink; ctx.stroke();
}
/** a market street in one-point perspective toward (vx, vy): stalls with striped awnings both sides, paving lines */
export function street(vx = 540, vy = 760, t = 0, o = {}) {
  fillAll(P.paper);
  // sky slit
  toneGrad(-300, -300, W + 600, vy + 300, 0, vy, 0, -200, 18, 0.7);
  skyline(vy + 20, 0.85, 4, { windows: false });
  // ground: perspective paving
  poly([[-300, vy], [W + 300, vy], [W + 300, H + 300], [-300, H + 300]], P.paper);
  for (let i = -12; i <= 12; i++) stroke([[vx + i * 6, vy], [vx + i * 260, H + 300]], 2.5);
  for (let j = 1; j < 9; j++) { const y = vy + Math.pow(j / 9, 2.2) * (H + 300 - vy); stroke([[-300, y], [W + 300, y]], 2); }
  toneGrad(-300, vy, W + 600, H + 300 - vy, 0, vy, 0, H + 300, 22, 0.55);
  // stalls receding on both sides
  for (const side of [-1, 1]) for (let i = 4; i >= 0; i--) {
    const d = Math.pow(0.62, i), xIn = vx + side * (70 + 560 * d), xOut = vx + side * (70 + 560 * d * 1.9), top = vy - 380 * d, bot = vy + 700 * d;
    poly([[xIn, top], [xOut, top - 40 * d], [xOut, bot + 60 * d], [xIn, bot]], i % 2 ? tone('dots2') : P.paper, 4);
    // awning stripes
    const aw = [[xIn, top], [xOut, top - 40 * d], [xOut + side * 40 * d, top + 70 * d], [xIn + side * 10 * d, top + 80 * d]];
    poly(aw, P.paper, 4);
    for (let s = 1; s < 5; s++) { const u = s / 5; stroke([[lerp(xIn, xOut, u), lerp(top, top - 40 * d, u)], [lerp(xIn + side * 10 * d, xOut + side * 40 * d, u), lerp(top + 80 * d, top + 70 * d, u)]], 9 * d + 2); }
    // crates on the counter
    poly([[xIn + side * 20 * d, bot - 150 * d], [xIn + side * 140 * d, bot - 160 * d], [xIn + side * 140 * d, bot - 40 * d], [xIn + side * 20 * d, bot - 30 * d]], P.paper, 3);
    stroke([[xIn + side * 20 * d, bot - 90 * d], [xIn + side * 140 * d, bot - 100 * d]], 2.5);
  }
  // grey ward banners hanging over the street (the Inkguard's sigil)
  for (let i = 0; i < 3; i++) { const d = Math.pow(0.62, i + 1), y = vy - 520 * d; stroke([[vx - 640 * d, y], [vx + 640 * d, y]], 3); for (const s of [-1, 1]) { const bx = vx + s * 260 * d; poly([[bx - 40 * d, y], [bx + 40 * d, y], [bx + 40 * d, y + 160 * d], [bx, y + 130 * d], [bx - 40 * d, y + 160 * d]], tone('dots2'), 3); ward(bx, y + 60 * d, 26 * d); } }
}
/** the Inkguard ward sigil: a circle split by a brush stroke (painted on walls and banners) */
export function ward(x, y, r, color = P.ink) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.lineWidth = Math.max(2, r * 0.18); ctx.strokeStyle = color; ctx.stroke();
  stroke([[x - r * 0.7, y + r * 0.5], [x + r * 0.7, y - r * 0.5]], Math.max(2, r * 0.22), color); ctx.restore();
}
/** a rooftop edge in the foreground (tiles hatched), top at y */
export function rooftop(y, t = 0, o = {}) {
  poly([[-300, y], [W + 300, y - (o.slope ?? 60)], [W + 300, H + 300], [-300, H + 300]], P.paper, 6);
  ctx.save(); ctx.beginPath(); ctx.moveTo(-300, y); ctx.lineTo(W + 300, y - (o.slope ?? 60)); ctx.lineTo(W + 300, H + 300); ctx.lineTo(-300, H + 300); ctx.closePath(); ctx.clip();
  for (let i = 0; i < 40; i++) { const yy = y + i * 34 - (o.slope ?? 60) * 0.5; stroke([[-300, yy], [W + 300, yy - (o.slope ?? 60)]], 3); for (let j = 0; j < 16; j++) { const xx = -300 + j * 100 + (i % 2) * 50; stroke([[xx, yy - (o.slope ?? 60) * (xx + 300) / (W + 600)], [xx, yy + 34 - (o.slope ?? 60) * (xx + 300) / (W + 600)]], 2); } }
  toneGrad(-300, y - 100, W + 600, H, 0, y, 0, y + 900, 18, 0.9);
  ctx.restore();
}
/**
 * a crowd of townsfolk silhouettes (not cast members: anonymous, faceless ink figures). y = feet line, s = scale.
 * stare 0..1: their heads turn and white eyes open (the "every face turns" beat). Deterministic per seed.
 */
export function crowd(y, n = 9, s = 1, t = 0, o = {}) {
  const stare = clamp(o.stare ?? 0), x0 = o.x0 ?? -60, x1 = o.x1 ?? W + 60;
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, (i + 0.5) / n) + (rnd(i + (o.seed || 0)) - 0.5) * 70, h = (380 + rnd(i * 3) * 120) * s, hr = 46 * s * (0.9 + rnd(i * 5) * 0.2), fill = o.fill || P.ink;
    const bob = Math.sin(t * 2 + i) * 4 * s;
    // body: a coat silhouette
    poly([[x - 70 * s, y], [x - 60 * s, y - h * 0.62], [x - 30 * s, y - h * 0.78], [x + 30 * s, y - h * 0.78], [x + 60 * s, y - h * 0.62], [x + 70 * s, y]], fill);
    ctx.beginPath(); ctx.arc(x, y - h * 0.86 + bob, hr, 0, TAU); ctx.fillStyle = fill; ctx.fill();
    if (rnd(i * 7) > 0.5) poly([[x - hr * 1.4, y - h * 0.86 - hr * 0.5 + bob], [x + hr * 1.4, y - h * 0.86 - hr * 0.5 + bob], [x + hr * 0.6, y - h * 0.86 - hr * 1.3 + bob], [x - hr * 0.6, y - h * 0.86 - hr * 1.3 + bob]], fill);
    if (stare > 0) { const dir = Math.sign((o.focus ?? 540) - x) * stare * hr * 0.25; for (const e of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + e * hr * 0.38 + dir, y - h * 0.86 + bob, hr * 0.2 * stare, hr * 0.14 * stare, 0, 0, TAU); ctx.fillStyle = P.white; ctx.fill(); } }
  }
}
/** the HUSH: a vast ink thing in the ash-clouds, many white eyes (k = how much has emerged) */
export function hush(x, y, s, t, k = 1) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * eo(k), s * eo(k));
  ctx.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, r = 300 + Math.sin(a * 5 + t * 1.3) * 40 + rnd(i) * 50; i ? ctx.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r * 1.3, Math.sin(a) * r); }
  ctx.closePath(); ctx.lineWidth = 22; ctx.strokeStyle = P.paper; ctx.stroke(); ctx.fillStyle = P.ink; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = P.ink; ctx.stroke();
  for (let i = 0; i < 9; i++) { const tx = -360 + i * 90, L = 300 + rnd(i * 3) * 400, pts = [[tx, 200], [tx + Math.sin(t * 2 + i) * 60, 200 + L * 0.5], [tx + Math.sin(t * 2.4 + i) * 90, 200 + L]]; stroke(pts, 30 - i % 3 * 8 + 12, P.paper); stroke(pts, 30 - i % 3 * 8); }
  ctx.save(); ctx.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, r = 280 + Math.sin(a * 5 + t * 1.3) * 40; i ? ctx.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r * 1.3, Math.sin(a) * r); } ctx.clip();
  for (let i = 0; i < 14; i++) { const a = -2.6 + i * 0.12; stroke([[Math.cos(a) * 200, Math.sin(a) * 160], [Math.cos(a) * 380, Math.sin(a) * 300]], 3, '#3A3742'); } ctx.restore();
  for (let i = 0; i < 7; i++) { const ex = (rnd(i * 5) - 0.5) * 600, ey = (rnd(i * 7) - 0.6) * 300, r = 18 + rnd(i * 9) * 26, open = clamp(Math.sin(t * 1.5 + i * 2) * 3 + 2); ctx.beginPath(); ctx.ellipse(ex, ey, r * 1.4, r * open * 0.5 + 1, 0, 0, TAU); ctx.fillStyle = P.white; ctx.fill(); ctx.beginPath(); ctx.arc(ex, ey, r * 0.35 * Math.min(open, 1), 0, TAU); ctx.fillStyle = P.ink; ctx.fill(); }
  ctx.restore();
}
/** a wooden handcart (wheels spin with `spin`), at x, y (ground), scale s, tilt rot */
export function cart(x, y, s = 1, spin = 0, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  poly([[-230, -250], [230, -250], [210, -110], [-210, -110]], P.paper, 7);
  for (let i = -3; i <= 3; i++) stroke([[i * 60, -246], [i * 56, -114]], 3);
  toneRect(-205, -150, 410, 36, 'dots2');
  stroke([[-230, -170], [-420, -230]], 12); stroke([[-230, -150], [-420, -210]], 6, P.paper);
  for (const wx of [-130, 130]) { ctx.beginPath(); ctx.arc(wx, -70, 70, 0, TAU); ctx.fillStyle = P.paper; ctx.fill(); ctx.lineWidth = 9; ctx.strokeStyle = P.ink; ctx.stroke(); for (let i = 0; i < 6; i++) { const a = spin + i * Math.PI / 3; stroke([[wx, -70], [wx + Math.cos(a) * 64, -70 + Math.sin(a) * 64]], 5); } ctx.beginPath(); ctx.arc(wx, -70, 12, 0, TAU); ctx.fillStyle = P.ink; ctx.fill(); }
  // sacks and crates piled on top
  for (const [cx, cy, r] of [[-120, -300, 70], [10, -320, 85], [140, -296, 64]]) { ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.75, 0, 0, TAU); ctx.fillStyle = P.paper; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = P.ink; ctx.stroke(); stroke([[cx - r * 0.4, cy - r * 0.4], [cx - r * 0.1, cy + r * 0.5]], 3); }
  ctx.restore();
}
/** a small child silhouette (anonymous townsfolk), frozen, with white eyes; s scale */
export function child(x, y, s = 1, t = 0, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.flip || 1), s);
  poly([[-70, 0], [-58, -230], [-36, -280], [36, -280], [58, -230], [70, 0]], P.ink);
  ctx.beginPath(); ctx.arc(0, -340, 70, 0, TAU); ctx.fillStyle = P.ink; ctx.fill();
  stroke([[-40, -250], [-110, -160 + Math.sin(t * 20) * 4]], 30); stroke([[40, -250], [110, -170]], 30);
  for (const e of [-1, 1]) { ctx.beginPath(); ctx.ellipse(e * 26, -340, 15, 18, 0, 0, TAU); ctx.fillStyle = P.white; ctx.fill(); ctx.beginPath(); ctx.arc(e * 26 + Math.sin(t * 50) * 2, -338, 5, 0, TAU); ctx.fillStyle = P.ink; ctx.fill(); }
  ctx.restore();
}
/** a pre-painted grey mural being painted over (the Inkguard at work): k 0..1 how far the grey has covered it */
export function mural(x, y, w, h, k, t = 0) {
  poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], P.paper, 6);
  // the forbidden painting: a sunrise in white and ink
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  for (let i = 0; i < 14; i++) { const a = Math.PI + i / 13 * Math.PI; stroke([[x + w / 2, y + h * 0.7], [x + w / 2 + Math.cos(a) * w, y + h * 0.7 + Math.sin(a) * w]], 6); }
  ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.7, w * 0.18, Math.PI, TAU); ctx.fillStyle = P.paper; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = P.ink; ctx.stroke();
  // the grey: a wide wet brush dragging across
  const ww = w * clamp(k);
  ctx.fillStyle = tone('dots2'); ctx.fillRect(x, y, ww, h);
  if (k > 0 && k < 1) brush(x + ww - 10, y - 20, x + ww + 10, y + h + 20, 60, P.ink, 1, 9);
  ctx.restore();
}

// ═════════════════════════ cards: "Part N" title card, "Part N →" end card ═════════════════════════
/** a brush-lettered episode title card. k 0..1 (in), out 0..1 (wipe away). title = the episode title */
export function partCard(n, title, k, o = {}) {
  if (k <= 0) return;
  const out = clamp(o.out ?? 0), t = o.t ?? 0, y = o.y ?? 760;
  ctx.save(); ctx.globalAlpha = 1 - out;
  // a black brush band sweeps across
  brush(-60, y, W + 60, y - 30, 330, P.ink, eo(seg(k, 0, 0.45)), 4);
  // PART n
  ctx.save(); ctx.translate(540, y - 40); ctx.rotate(-0.03);
  const s = eob(seg(k, 0.25, 0.6));
  if (s > 0) {
    ctx.scale(s, s); ctx.font = '900 54px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '14px';
    ctx.fillStyle = P.white; ctx.fillText(`PART ${n}`, 0, -70); ctx.letterSpacing = '0px';
    ctx.font = '700 76px Caladea'; ctx.fillText(title.toUpperCase(), 0, 20);
    ctx.fillStyle = P.ember; ctx.fillRect(-150, 84, 300 * eo(seg(k, 0.5, 0.9)), 8);
  }
  ctx.restore();
  // series stamp: INK & EMBER in a red hanko square
  const hs = eob(seg(k, 0.55, 0.85));
  if (hs > 0) { ctx.save(); ctx.translate(880, y + 150); ctx.rotate(0.08); ctx.scale(hs, hs); poly([[-74, -74], [74, -74], [74, 74], [-74, 74]], P.ember, 6); ctx.fillStyle = P.white; ctx.font = '900 40px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('INK', 0, -30); ctx.font = '900 30px Inter'; ctx.fillText('& EMBER', 0, 18); ctx.restore(); }
  ctx.restore();
}
/** the end card: "PART n →" + follow line; k 0..1. Drawn over a dark page with ember sparks */
export function endCard(n, k, t = 0, o = {}) {
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(k * 1.6);
  fillAll(P.ink);
  sparks(t, 30, { color: P.ember, outline: false });
  ctx.restore();
  const s = eob(seg(k, 0.1, 0.6));
  ctx.save(); ctx.translate(540, 820); ctx.rotate(-0.04); ctx.scale(s, s);
  ctx.font = '900 64px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '10px'; ctx.fillStyle = '#BDB9B0'; ctx.fillText(o.kicker || 'TO BE CONTINUED', 0, -170); ctx.letterSpacing = '0px';
  ctx.font = '900 210px Inter'; ctx.lineJoin = 'round'; ctx.lineWidth = 26; ctx.strokeStyle = P.ember; ctx.strokeText(`PART ${n}`, -40, 0); ctx.fillStyle = P.white; ctx.fillText(`PART ${n}`, -40, 0);
  // the arrow
  const ax = 400 + Math.sin(t * 6) * 14;
  poly([[ax - 40, -50], [ax + 40, 0], [ax - 40, 50], [ax - 40, 22], [ax - 110, 22], [ax - 110, -22], [ax - 40, -22]], P.ember, 0);
  ctx.restore();
  const s2 = eo(seg(k, 0.45, 0.85));
  if (s2 > 0) { ctx.save(); ctx.globalAlpha = s2; ctx.font = '700 52px Caladea'; ctx.textAlign = 'center'; ctx.fillStyle = P.white; ctx.fillText(o.line || 'Follow so you don’t miss it.', 540, 1030); ctx.font = '900 40px Inter'; ctx.fillStyle = P.ember; ctx.letterSpacing = '6px'; ctx.fillText('@INKANDEMBER', 540, 1110); ctx.letterSpacing = '0px'; ctx.restore(); }
}

// ═════════════════════════ caption look (used by captions.js) ═════════════════════════
export const CAPLOOK = { size: 112, y: 1470 };
