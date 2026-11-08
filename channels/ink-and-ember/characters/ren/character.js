// REN SHIROGANE: the Inkguard prodigy who hunts Embers (and hides a blue flame).
// The ONLY code that draws this character: every video calls cast('ren').draw({...}), so they look identical in every
// episode. Read CHARACTER.md before changing anything, and bump "version" in character.json when the look changes.
// The body code below the character's own data is shared by the whole Ink & Ember cast (one line style for the
// whole manga): change it in all four character.js files together, and bump all four versions.
//
// Model space: origin between the feet, y up is negative, ~1010 units tall at s = 1 (crown at y ≈ -1050).
//   draw({ x, y, s, flip, t, pose, poseFrom, poseK, hands, lean, expression, outfit, color, look, blink, talk, ember,
//          aura, prop, extras, shadow, alpha })
//   color 'mono' (default: B&W ink) · 'accent' (signature accent only) · 'full' (a colour moment)
//   ember 0..1 glowing coal in the chest · aura 0..1 flames around the body · prop 'brush' | 'blade' | 'lantern' | 'cane' | fn
import { ctx, clamp, lerp, TAU } from '/src/core/lib.js';

/** outfits are data: the same body, different cloth (mono = the page, full = a colour moment) */
export const OUTFITS = {
  uniform: { coat: true, mono: {}, full: {} },
  plain: { coat: false, mono: { top: 'paper', sleeve: 'paper', bottom: 'ink' }, full: { top: '#ECEAF2', sleeve: '#ECEAF2', bottom: '#1C1E2A' } },
};

const SPEC = {
  id: 'ren', scale: 1.03, width: 0.98, blinkPhase: 2.1, lashFlick: 1, browWidth: 5,
  palette: { ink: '#111014', paper: '#FBFAF6', accent: '#39B8FF' },
  accentKeys: ['iris', 'sigil', 'ember', 'blade'],
  mono: { skin: 'paper', hair: 'ink', top: 'ink', sleeve: 'ink', bottom: 'ink', shoe: 'ink', iris: 'ink', mouth: 'ink', sigil: 'ink', trim: 'paper' },
  full: { skin: '#EFD9CC', hair: '#151827', top: '#1A1C27', sleeve: '#1A1C27', bottom: '#14151D', shoe: '#0E0F14', iris: '#39B8FF', mouth: '#7A2F38',
    sigil: '#39B8FF', ember: '#2EA8FF', blade: '#1E6FD9', trim: '#C9D3E6' },
  face: { cheek: 68, jaw: 46, chin: -800 },
  faceMark(ctx, mode, paint, h) {
    // the Inkguard sigil: a thin ink brand under his left eye that glows blue when his hidden flame stirs
    const c = paint('sigil', mode);
    h.ln([[-56, -866], [-40, -858], [-50, -848]], 3, c); h.ln([[-44, -872], [-36, -862]], 2.4, c);
  },
  hairBack(ctx, mode, sway, t, paint, h) {
    const hair = paint('hair', mode);
    // a long, straight curtain to the shoulder blades + a low tail swinging behind
    h.shape([[-84, -940], [-98, -1010], [-50, -1052], [10, -1056], [66, -1040], [100, -990], [96, -900], [104, -760], [86, -780], [80, -730], [56, -820], [-56, -820], [-76, -735], [-86, -790], [-106, -756], [-96, -860]], hair, 7);
    h.shape([[-20, -800], [20, -800], [26 + sway * 0.6, -620], [8 + sway, -540], [0 + sway, -560], [-8 + sway * 0.8, -610]], hair, 6);
  },
  hairFront(ctx, mode, sway, t, paint, h) {
    const hair = paint('hair', mode), ink = '#111014', shine = '#FBFAF6';
    // straight side curtains, cut sharp
    h.shape([[-72, -990], [-96, -920], [-96, -812], [-84, -830], [-78, -800], [-66, -900]], hair, 6);
    h.shape([[72, -990], [98, -920], [100, -806], [88, -826], [80, -792], [68, -900]], hair, 6);
    // the heavy fringe sweeps across and hides his right eye: his silhouette
    ctx.beginPath(); ctx.moveTo(-86, -945); ctx.bezierCurveTo(-104, -1046, -20, -1066, 14, -1062); ctx.bezierCurveTo(64, -1060, 112, -1030, 96, -930);
    for (const [x, y] of [[100, -868], [84, -884], [80, -846], [62, -872], [50, -848], [36, -890], [14, -916], [-6, -936], [-30, -928], [-46, -948], [-70, -940]]) ctx.lineTo(x, y);
    ctx.closePath(); ctx.fillStyle = hair; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = ink; ctx.lineJoin = 'round'; ctx.stroke();
    // white ink shine band and strands cut into the black
    const sh = mode === 'full' ? 'rgba(170,200,255,0.55)' : shine;
    for (const [a, c, b] of [[[-60, -1022], [-10, -1044], [44, -1030]], [[-50, -1008], [-4, -1028], [36, -1016]]]) h.qc(a, c, b, 3.2, sh);
    for (const [a, b] of [[[20, -1000], [70, -880]], [[0, -1004], [44, -900]], [[-20, -1004], [6, -930]]]) h.ln([a, b], 2.2, sh);
  },
  torsoDetail(ctx, of, mode, paint, h) {
    const trim = paint('trim', mode), coat = paint('top', mode);
    if (of.coat) {
      // long Inkguard coat: tails to the knees, split at the front
      for (const s of [-1, 1]) {
        const k = h.P.hip[1] * 0.5;
        h.shape([[s * 6, h.HIPS + 8], [s * (h.hw + 10), h.HIPS + 8], [s * (h.hw + 44 + Math.abs(h.P.lean) * 60), -200 + k], [s * 22, -214 + k]], coat, 6);
        h.ln([[s * (h.hw + 4), h.HIPS + 30], [s * (h.hw + 34), -216 + k]], 2.4, trim);
      }
      // high collar and the diagonal closure with white piping
      h.shape([[-40, -830], [40, -830], [52, -770], [-52, -770]], coat, 6);
      h.ln([[-36, -822], [-46, -778]], 2.4, trim); h.ln([[36, -822], [46, -778]], 2.4, trim);
      h.ln([[30, -770], [-26, -620], [-6, h.HIPS + 6]], 3, trim);
      for (const [x, y] of [[14, -730], [-6, -680], [-20, -630]]) h.ell(x, y, 5, 5, trim);
      h.shape([[-h.hw - 8, -526], [h.hw + 8, -526], [h.hw + 9, -500], [-h.hw - 9, -500]], mode === 'full' ? '#3A3F55' : 'paper' && '#FBFAF6', 4);
      h.ell(0, -513, 12, 12, '#111014');
    } else {
      h.ln([[-24, -786], [0, -740], [24, -786]], 3.2);
      for (const y of [-700, -640, -580]) h.ell(0, y, 4, 4, '#111014');
      h.ln([[-h.hw - 4, -520], [h.hw + 4, -520]], 4);
    }
  },
};

// ════════════════════ the Ink & Ember body (identical in every Ink & Ember character.js) ════════════════════
// Manga ink: white paper fills, black contours (heavy outside, thin inside), screentone dots for mid-tones.
// color: 'mono' (default, the page) · 'accent' (mono + this character's signature accent) · 'full' (a colour moment).


export const HEIGHT = 1010;
export const PALETTE = SPEC.palette;
let CUR = null;                                   // the outfit of the draw() call in progress (set at its start)

/** eyes: open | narrow | wide | rage | teary | closed | half | happy · brows: degrees (+ = angry, - = worried)
 *  mouth: line | smirk | grin | shout | grit | open | frown | wobble | soft · extras: vein sweat drops tears gloom blush shine shake */
export const EXPRESSIONS = {
  neutral: { eyes: 'open', brows: 0, mouth: 'line' },
  determined: { eyes: 'narrow', brows: 16, mouth: 'grit', extras: ['shine'] },
  smirk: { eyes: 'half', brows: 6, mouth: 'smirk' },
  grin: { eyes: 'happy', brows: -6, mouth: 'grin' },
  rage: { eyes: 'rage', brows: 30, mouth: 'shout', extras: ['vein', 'gloom'] },
  shock: { eyes: 'wide', brows: -20, mouth: 'open', extras: ['shake', 'drops', 'gloom'] },
  tears: { eyes: 'teary', brows: -18, mouth: 'wobble', extras: ['tears', 'blush'] },
  sweat: { eyes: 'open', brows: -10, mouth: 'soft', extras: ['sweat'] },
  cold: { eyes: 'half', brows: 10, mouth: 'line', extras: ['gloom'] },
  sad: { eyes: 'teary', brows: -16, mouth: 'frown' },
  shout: { eyes: 'narrow', brows: 22, mouth: 'shout', extras: ['shine'] },
  soft: { eyes: 'happy', brows: -4, mouth: 'soft', extras: ['blush'] },
};

/** poses: hand targets l/r, foot targets fl/fr (body space, feet at y 0), hip [dx, dy], lean (rad, + = toward viewer's
 *  right), lift (px off the ground), tilt (head, rad), fist: closed hands, open: open hands */
export const POSES = {
  stand: { l: [-118, -500], r: [118, -500], fl: [-48, 0], fr: [48, 0] },
  guard: { l: [-40, -720], r: [70, -690], fl: [-110, 0], fr: [110, 0], hip: [0, 40], lean: 0.04, fist: true },
  point: { l: [-118, -500], r: [300, -790], fl: [-60, 0], fr: [60, 0], lean: 0.05, point: 'r' },
  reach: { l: [-170, -620], r: [330, -700], fl: [-150, 0], fr: [150, 0], hip: [30, 50], lean: 0.32, tilt: 0.1, open: true },
  lunge: { l: [-230, -560], r: [200, -700], fl: [-230, -10], fr: [170, 0], hip: [20, 70], lean: 0.42, tilt: 0.12, fist: true },
  punch: { l: [-70, -560], r: [340, -720], fl: [-160, 0], fr: [140, 0], hip: [10, 60], lean: 0.18, fist: true },
  leap: { l: [-220, -880], r: [210, -900], fl: [-110, -170], fr: [90, -240], hip: [0, 0], lift: 170, lean: 0.08, open: true },
  crouch: { l: [-210, -40], r: [130, -470], fl: [-200, 0], fr: [160, 0], hip: [0, 230], lean: 0.12, tilt: -0.05, open: true },
  clutch: { l: [-12, -680], r: [24, -660], fl: [-40, 0], fr: [40, 0], lean: -0.03, tilt: 0.06 },
  cross: { l: [70, -620], r: [-70, -640], fl: [-60, 0], fr: [60, 0] },
  wield: { l: [150, -760], r: [190, -800], fl: [-130, 0], fr: [120, 0], hip: [0, 40], lean: -0.08, fist: true },
  kneel: { l: [-140, -260], r: [110, -330], fl: [-130, 0], fr: [140, -5], hip: [0, 250], lean: 0.1, tilt: 0.18, open: true, kneel: true },
};

/** named points (model space at s = 1, stand pose), for bubbles, glows and effects */
export const ANCHORS = {
  top: [0, -1035], head: [0, -905], face: [0, -890], eyes: [0, -893], mouth: [0, -840], neck: [0, -790], chest: [0, -700],
  heart: [-28, -700], hips: [0, -472], handL: [-118, -500], handR: [118, -500], knees: [0, -250], feet: [0, 0],
  bubble: [170, -1080],
};

const SC = SPEC.scale || 1, WD = SPEC.width || 1, LW = 7, LT = 3.2;           // contour and inner line widths
const SH = { l: [-80 * WD, -764], r: [80 * WD, -764] }, A1 = 132, A2 = 124, T1 = 240, T2 = 234;
const HIPS = -472, NECK = -790;

// ---------- paint: mono / accent / full ----------
const toneCache = new WeakMap();
function tone(kind) {
  let m = toneCache.get(ctx); if (!m) toneCache.set(ctx, (m = {}));
  if (m[kind]) return m[kind];
  const c = document.createElement('canvas'), n = 12; c.width = c.height = n;
  const g = c.getContext('2d'); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, n, n); g.fillStyle = PALETTE.ink;
  const r = kind === 'tone2' ? 3.6 : kind === 'tone3' ? 4.9 : 2.3;
  for (const [x, y] of [[0, 0], [n, 0], [0, n], [n, n], [n / 2, n / 2]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  const p = ctx.createPattern(c, 'repeat'); try { p.setTransform(new DOMMatrix().rotateSelf(45)); } catch (e) { /* older canvas */ }
  return (m[kind] = p);
}
/** a palette slot → fillStyle. Mono values may be 'paper', 'ink', 'tone' (light dots), 'tone2', 'tone3' (dense dots) */
function paint(key, mode) {
  const full = mode === 'full' || (mode === 'accent' && SPEC.accentKeys.includes(key));
  const v = full ? (CUR?.full?.[key] ?? SPEC.full[key] ?? CUR?.mono?.[key] ?? SPEC.mono[key]) : (CUR?.mono?.[key] ?? SPEC.mono[key]);
  if (v === 'paper') return PALETTE.paper;
  if (v === 'ink') return PALETTE.ink;
  if (v === 'tone' || v === 'tone2' || v === 'tone3') return tone(v);
  return v || PALETTE.paper;
}
const isFull = (key, mode) => mode === 'full' || (mode === 'accent' && SPEC.accentKeys.includes(key));

// ---------- helpers (model space) ----------
function path(pts, close = true) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); if (close) ctx.closePath(); }
function shape(pts, fill, lw = LW) { path(pts); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = PALETTE.ink; ctx.lineJoin = 'round'; ctx.stroke(); } }
function ell(x, y, rx, ry, fill, lw = 0, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = PALETTE.ink; ctx.stroke(); } }
function ln(pts, w = LT, color = PALETTE.ink, cap = 'round') { path(pts, false); ctx.lineWidth = w; ctx.strokeStyle = color; ctx.lineCap = cap; ctx.lineJoin = 'round'; ctx.stroke(); }
function qc(a, c, b, w = LT, color = PALETTE.ink) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(c[0], c[1], b[0], b[1]); ctx.lineWidth = w; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.stroke(); }
/** a limb: ink outline + fill (fill may be a tone pattern) */
/** a tapered limb a→b→c (widths w0 at a, w1 at b, w2 at c): ink outline under a flat fill, rounded joints */
function taper(pts, ws, fill, halo = false) {
  const quads = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    quads.push([[a[0] + nx * ws[i] / 2, a[1] + ny * ws[i] / 2], [b[0] + nx * ws[i + 1] / 2, b[1] + ny * ws[i + 1] / 2], [b[0] - nx * ws[i + 1] / 2, b[1] - ny * ws[i + 1] / 2], [a[0] - nx * ws[i] / 2, a[1] - ny * ws[i] / 2]]);
  }
  const joints = pts.slice(1, -1).map((p, i) => [p, ws[i + 1] / 2]);
  const pass = (lw, color, fillIt) => {
    for (const q of quads) { path(q); if (fillIt) { ctx.fillStyle = color; ctx.fill(); } else { ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.lineJoin = 'round'; ctx.stroke(); } }
    for (const [p, r] of joints) { ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); if (fillIt) { ctx.fillStyle = color; ctx.fill(); } else { ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.stroke(); } }
  };
  if (halo) pass(LW * 2 + 10, PALETTE.paper, false);
  pass(LW * 1.7, PALETTE.ink, false);
  pass(0, fill, true);
}
function limb(pts, w, fill, halo = false) { if (halo) ln(pts, w + LW * 1.6 + 9, PALETTE.paper); ln(pts, w + LW * 1.6, PALETTE.ink); ln(pts, w, fill); }
/** jagged flame tongue from (x, y) pointing up, h tall: for auras and embers */
function flame(x, y, w, h, ph, fill, lw = 4) {
  const k = Math.sin(ph) * 0.18;
  ctx.beginPath(); ctx.moveTo(x - w, y);
  ctx.bezierCurveTo(x - w * 1.1, y - h * 0.45, x - w * (0.2 - k), y - h * 0.55, x + w * k * 2, y - h);
  ctx.bezierCurveTo(x + w * (0.35 + k), y - h * 0.6, x + w * 1.1, y - h * 0.4, x + w, y);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = PALETTE.ink; ctx.stroke(); }
}
export { flame };

/** 2-bone IK; bend = +1 / -1 picks the elbow (knee) side */
function solve(a, target, l1, l2, bend) {
  let dx = target[0] - a[0], dy = target[1] - a[1], d = Math.hypot(dx, dy);
  const max = l1 + l2 - 0.5; if (d > max) { dx *= max / d; dy *= max / d; d = max; }
  const end = [a[0] + dx, a[1] + dy], ang = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * Math.max(d, 1e-3)), -1, 1)), base = Math.atan2(dy, dx);
  return { a, mid: [a[0] + Math.cos(base + ang * bend) * l1, a[1] + Math.sin(base + ang * bend) * l1], end };
}

function resolvePose(o) {
  const to = POSES[o.pose] || POSES.stand, from = o.poseFrom ? POSES[o.poseFrom] || POSES.stand : null, k = from ? clamp(o.poseK ?? 1) : 1;
  const mix = (key, def) => { const b = to[key] ?? def, a = from ? (from[key] ?? def) : b; return Array.isArray(b) ? [lerp(a[0], b[0], k), lerp(a[1], b[1], k)] : lerp(a, b, k); };
  const P = { l: mix('l'), r: mix('r'), fl: mix('fl'), fr: mix('fr'), hip: mix('hip', [0, 0]), lean: mix('lean', 0), lift: mix('lift', 0), tilt: mix('tilt', 0) };
  if (o.hands?.l) P.l = [...o.hands.l]; if (o.hands?.r) P.r = [...o.hands.r];
  if (o.lean != null) P.lean = o.lean;
  const dom = k > 0.5 ? to : from || to;
  return { ...P, fist: dom.fist, open: dom.open, point: dom.point, kneel: dom.kneel };
}

// ---------- head ----------
function blinkAmount(o, t) {
  if (o.blink === false) return 0;
  const period = SPEC.blinkPeriod || 3.9, ph = ((t + (SPEC.blinkPhase || 0)) % period + period) % period;
  return ph < 0.13 ? Math.sin(ph / 0.13 * Math.PI) : 0;
}

function faceShape(mode, onlyPath = false) {
  const f = SPEC.face || {}, jw = f.jaw ?? 54, cw = f.cheek ?? 72, chin = f.chin ?? -803;
  ctx.beginPath(); ctx.moveTo(-cw + 2, -985); ctx.lineTo(-cw, -890); ctx.quadraticCurveTo(-cw + 4, -852, -jw, -836);
  ctx.quadraticCurveTo(-18, chin + 6, 0, chin); ctx.quadraticCurveTo(18, chin + 6, jw, -836); ctx.quadraticCurveTo(cw - 4, -852, cw, -890); ctx.lineTo(cw - 2, -985); ctx.closePath();
  if (onlyPath) return;
  ctx.fillStyle = paint('skin', mode); ctx.fill(); ctx.lineWidth = LW * 0.9; ctx.strokeStyle = PALETTE.ink; ctx.lineJoin = 'round'; ctx.stroke();
  // ears
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * (cw + 4), -880, 9, 18, 0, 0, TAU); ctx.fillStyle = paint('skin', mode); ctx.fill(); ctx.lineWidth = LT; ctx.strokeStyle = PALETTE.ink; ctx.stroke(); }
  // neck shadow tone under the chin
  if (SPEC.face?.wrinkles) { ln([[-50, -860], [-40, -850]], 2.2); ln([[50, -860], [40, -850]], 2.2); ln([[-14, -812], [14, -812]], 2); }
}

function eye(side, kind, o, ex, t, mode) {
  const x = 37 * side, y = -893, close = blinkAmount(o, t), [lx, ly] = o.look || [0, 0];
  const ink = PALETTE.ink, iris = isFull('iris', mode) ? SPEC.full.iris : ink;
  if (close > 0.6 && ['open', 'narrow', 'teary', 'half', 'wide'].includes(kind)) kind = 'closed';
  if (kind === 'happy') { qc([x - 20, y + 4], [x, y - 16], [x + 20, y + 4], 6); return; }
  if (kind === 'closed') { qc([x - 21, y], [x, y + 9], [x + 21, y], 5.5); ln([[x + 20 * side, y], [x + 27 * side, y - 5]], 4); return; }
  const shape = { open: [28, 20, 0], narrow: [29, 13, 0.2], wide: [28, 24, 0], rage: [30, 13, 0.34], teary: [28, 22, 0], half: [28, 12, 0] }[kind] || [22, 15, 0];
  const [rx, ry0, slant] = shape, ry = ry0 * (1 - close * 0.5);
  ctx.save();
  // eye white: an almond, the outer corner lifted by slant (angry eyes tilt down to the nose)
  ctx.beginPath(); ctx.moveTo(x - rx * side, y + 2 - slant * 18); ctx.quadraticCurveTo(x, y - ry * 1.5 + (kind === 'half' ? 6 : 0), x + rx * side, y - 4);
  ctx.quadraticCurveTo(x + 2 * side, y + ry * 1.25, x - rx * side, y + 2 - slant * 18); ctx.closePath();
  ctx.fillStyle = PALETTE.paper; ctx.fill(); ctx.save(); ctx.clip();
  const shake = (ex.extras || []).includes('shake') && o.extras !== false ? Math.sin(t * 61 + side) * 3.2 : 0;
  const ix = x + lx * 7 + shake, iy = y + 2 + ly * 5;
  if (kind === 'wide' || kind === 'rage') {
    ell(ix, iy, 6.5, 7.5, kind === 'rage' && isFull('iris', mode) ? SPEC.full.iris : ink);          // tiny shaking pupil
  } else {
    ell(ix, iy, 17, 21, iris);
    if (iris === ink) { ctx.save(); ctx.beginPath(); ctx.ellipse(ix, iy, 17, 21, 0, 0, TAU); ctx.clip(); ctx.fillStyle = tone('tone'); ctx.fillRect(ix - 18, iy + 2, 36, 22); ctx.restore(); }
    ell(ix, iy + 1, 8, 10, ink);
    ell(ix + 6, iy - 8, 6.5, 7, PALETTE.paper);
    ell(ix - 6, iy + 9, 3, 3, PALETTE.paper);
    if (iris !== ink) { ctx.save(); ctx.globalAlpha *= 0.55; ell(ix, iy + 10, 12, 7, '#FFF4C8'); ctx.restore(); }
    if (kind === 'teary') { ell(ix - 4, iy - 2, 3.2, 3.2, PALETTE.paper); ell(ix + 2, iy + 9, 7, 3, 'rgba(255,255,255,0.85)'); }
  }
  ctx.restore();
  // lids: heavy upper lash with an outer flick, thin lower line
  ctx.beginPath(); ctx.moveTo(x - (rx + 2) * side, y + 2 - slant * 18); ctx.quadraticCurveTo(x, y - ry * 1.5 + (kind === 'half' ? 6 : 0), x + (rx + 4) * side, y - 4);
  ctx.lineWidth = kind === 'half' || kind === 'narrow' ? 7.5 : 6.5; ctx.strokeStyle = ink; ctx.lineCap = 'round'; ctx.stroke();
  ln([[x + (rx + 3) * side, y - 4], [x + (rx + 12) * side, y - 10 - (SPEC.lashFlick || 0)]], 5);
  if (kind !== 'half' && kind !== 'rage') ln([[x + (rx - 4) * side, y - ry * 1.05], [x + (rx + 6) * side, y - ry * 1.3 - (SPEC.lashFlick || 0)]], 3.5);
  qc([x - 10 * side, y + ry * 0.95], [x + 4 * side, y + ry * 1.15], [x + (rx - 2) * side, y + 2], 2.4);
  if (kind === 'teary') qc([x - 14 * side, y + ry + 4], [x, y + ry + 8], [x + 14 * side, y + ry + 3], 2, ink);
  ctx.restore();
}

function brows(ex, o) {
  const a = (ex.brows || 0) * Math.PI / 180, w = SPEC.browWidth || 5.5;
  for (const s of [-1, 1]) {
    const cx = 38 * s, cy = -928 - (ex.eyes === 'wide' ? 7 : 0), half = 22;
    const ix = cx - half * s, iy = cy + Math.sin(a) * half, ox = cx + half * s, oy = cy - Math.sin(a) * half;
    ctx.beginPath(); ctx.moveTo(ix, iy); ctx.quadraticCurveTo(cx, cy - 7, ox, oy); ctx.lineWidth = w; ctx.strokeStyle = PALETTE.ink; ctx.lineCap = 'round'; ctx.stroke();
  }
  if ((ex.brows || 0) > 14) { ln([[-8, -918], [-4, -906]], 2.4); ln([[8, -918], [4, -906]], 2.4); }   // knit brow creases
}

function mouth(ex, o, t, mode) {
  let m = ex.mouth; const y = -840, ink = PALETTE.ink;
  const talk = o.talk ? (0.5 + 0.5 * Math.sin(t * 23)) * o.talk : 0;
  if (talk > 0.3 && ['line', 'soft', 'smirk', 'frown', 'grit'].includes(m)) m = m === 'grit' ? 'shout' : 'open';
  const inner = isFull('mouth', mode) ? SPEC.full.mouth : ink;
  if (m === 'line') ln([[-10, y], [10, y]], 3.4);
  else if (m === 'soft') qc([-11, y - 2], [0, y + 5], [11, y - 2], 3.2);
  else if (m === 'frown') qc([-12, y + 4], [0, y - 4], [12, y + 4], 3.4);
  else if (m === 'smirk') { qc([-12, y + 1], [4, y + 3], [16, y - 7], 3.6); ln([[16, y - 7], [19, y - 5]], 2.4); }
  else if (m === 'wobble') { ctx.beginPath(); ctx.moveTo(-14, y + 2); for (let i = 1; i <= 7; i++) ctx.lineTo(-14 + i * 4, y + (i % 2 ? -3 : 3)); ctx.lineWidth = 3; ctx.strokeStyle = ink; ctx.stroke(); }
  else if (m === 'grit') {
    path([[-17, y - 7], [17, y - 7], [14, y + 7], [-14, y + 7]]); ctx.fillStyle = PALETTE.paper; ctx.fill(); ctx.lineWidth = 3.4; ctx.strokeStyle = ink; ctx.stroke();
    ln([[-16, y], [16, y]], 2); for (const x of [-8, 0, 8]) ln([[x, y - 7], [x, y + 7]], 1.8);
  } else if (m === 'grin') {
    ctx.beginPath(); ctx.moveTo(-18, y - 5); ctx.quadraticCurveTo(0, y + 22, 18, y - 5); ctx.closePath(); ctx.fillStyle = inner; ctx.fill(); ctx.lineWidth = 3.2; ctx.strokeStyle = ink; ctx.stroke();
    ctx.save(); ctx.clip(); ctx.fillStyle = PALETTE.paper; ctx.fillRect(-18, y - 6, 36, 7); ctx.restore();
  } else if (m === 'open') {
    const tr = Math.sin(t * 40) * 1.5, h = 15 + talk * 4;
    ctx.beginPath(); ctx.moveTo(-11, y - 4); ctx.quadraticCurveTo(0, y - 9 + tr, 11, y - 4); ctx.quadraticCurveTo(13, y + h, 0, y + h + 2); ctx.quadraticCurveTo(-13, y + h, -11, y - 4); ctx.closePath();
    ctx.fillStyle = inner; ctx.fill(); ctx.lineWidth = 3.4; ctx.strokeStyle = ink; ctx.stroke();
  } else {
    // shout: a jagged manga scream with teeth
    const big = m === 'shout' ? 1 : 0.6, h = (m === 'shout' ? 24 : 15) * (1 + talk * 0.25), w = 15 + big * 6;
    ctx.beginPath(); ctx.moveTo(-w, y - 6); ctx.lineTo(w, y - 6); ctx.quadraticCurveTo(w * 0.8, y + h, 0, y + h); ctx.quadraticCurveTo(-w * 0.8, y + h, -w, y - 6); ctx.closePath();
    ctx.fillStyle = inner; ctx.fill(); ctx.lineWidth = 3.4; ctx.strokeStyle = ink; ctx.stroke();
    if (m === 'shout') { ctx.save(); ctx.clip(); ctx.fillStyle = PALETTE.paper; ctx.fillRect(-w, y - 7, w * 2, 6); ctx.fillRect(-w * 0.6, y + h - 5, w * 1.2, 6); ctx.restore(); }
  }
}

function faceExtras(ex, o, t, mode) {
  const list = o.extras === false ? [] : ex.extras || [], ink = PALETTE.ink;
  if (list.includes('gloom')) { ctx.save(); faceShape(mode, true); ctx.clip(); for (let i = -6; i <= 6; i++) ln([[i * 11, -990], [i * 11, -935 - Math.abs(i) * 3]], 2.2); ctx.restore(); }
  if (list.includes('blush')) for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) ln([[s * 46 + i * 8 - 3, -857], [s * 46 + i * 8 + 3, -869]], 2, isFull('mouth', mode) ? SPEC.full.mouth : ink);
  if (list.includes('vein')) { ctx.save(); ctx.translate(48, -968); for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); qc([4, 3], [9, 9], [3, 15], 4.5, isFull('vein', mode) || mode === 'full' ? '#E0242C' : ink); } ctx.restore(); }
  if (list.includes('shine')) { ctx.save(); ctx.translate(-56, -902); ctx.rotate(t * 2); ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 3 : 11; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fillStyle = PALETTE.paper; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = ink; ctx.stroke(); ctx.restore(); }
  if (list.includes('tears')) for (const s of [-1, 1]) {
    const flow = (t * 1.3) % 1;
    ctx.beginPath(); ctx.moveTo(s * 24, -876); ctx.quadraticCurveTo(s * 30, -850, s * 26 + Math.sin(t * 3) * 3, -812 + flow * 6); ctx.lineTo(s * 38, -812); ctx.quadraticCurveTo(s * 42, -850, s * 44, -876); ctx.closePath();
    ctx.fillStyle = mode === 'full' ? 'rgba(170,220,255,0.85)' : PALETTE.paper; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = ink; ctx.stroke();
    ell(s * 33, -800 + flow * 40, 5, 7, mode === 'full' ? 'rgba(170,220,255,0.9)' : PALETTE.paper, 2);
  }
  if (list.includes('sweat')) {
    const bob = Math.sin(t * 4) * 3;
    ctx.beginPath(); ctx.moveTo(88, -985 + bob); ctx.quadraticCurveTo(112, -945 + bob, 100, -930 + bob); ctx.quadraticCurveTo(80, -925 + bob, 80, -948 + bob); ctx.closePath();
    ctx.fillStyle = mode === 'full' ? '#BFE6FF' : PALETTE.paper; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = ink; ctx.stroke(); ell(91, -945 + bob, 3, 6, PALETTE.paper);
  }
  if (list.includes('drops')) for (const [x, y, k] of [[-92, -960, 0], [96, -950, 1.3], [-100, -905, 2.4]]) {
    const d = (t * 1.7 + k) % 1;
    ctx.beginPath(); ctx.moveTo(x, y + d * 14); ctx.quadraticCurveTo(x + 7, y + 14 + d * 14, x, y + 18 + d * 14); ctx.quadraticCurveTo(x - 7, y + 14 + d * 14, x, y + d * 14);
    ctx.fillStyle = PALETTE.paper; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = ink; ctx.stroke();
  }
}

function head(o, ex, t, mode, sway) {
  faceShape(mode);
  if (SPEC.faceMark) SPEC.faceMark(ctx, mode, paint, { ln, ell, shape, qc });
  // nose: a single short ink tick, manga style
  ln([[3, -872], [-3, -858], [3, -856]], 2.6);
  const kind = ex.eyes;
  for (const s of [-1, 1]) eye(s, kind, o, ex, t, mode);
  brows(ex, o);
  mouth(ex, o, t, mode);
  faceExtras(ex, o, t, mode);
}

// ---------- body ----------
function legs(P, of, mode, o) {
  const hipY = HIPS + P.hip[1] - P.lift, hx = P.hip[0];
  const pants = paint('bottom', mode), shoe = paint('shoe', mode);
  const out = {};
  for (const side of [-1, 1]) {
    const key = side < 0 ? 'fl' : 'fr', hip = [hx + 42 * side * WD, hipY];
    let foot = [P[key][0], P[key][1] - P.lift];
    let bend = -side;                                                      // knees bend outward (front view)
    if (P.kneel && side < 0) { foot = [P[key][0], P[key][1]]; }
    // front view: a bent knee mostly foreshortens; push it a little outward (and up for a tuck)
    const dx = foot[0] - hip[0], dy = foot[1] - hip[1], d = Math.hypot(dx, dy) || 1, slack = Math.sqrt(Math.max(0, (T1 + T2) ** 2 - d * d)) / 2;
    const mid = [hip[0] + dx * 0.5 - (dy / d) * slack * 0.45 * bend * Math.sign(dy || 1), hip[1] + dy * 0.5 + (dx / d) * slack * 0.45 * bend * Math.sign(dy || 1)];
    if (Math.abs(mid[0] - hip[0]) < 6 && Math.abs(dx) < 30) mid[0] = hip[0] + dx * 0.5 + bend * slack * 0.25;
    const L = { a: hip, mid, end: foot };
    out[side] = L;
    const w = of.legW || 44;
    taper([L.a, L.mid, L.end], [w * 1.15, w * 0.82, w * 0.62], pants);
    if (of.cuff !== false) ln([[L.end[0] - 26, L.end[1] - 34], [L.end[0] + 26, L.end[1] - 34]], 3);
    // shoe: a wedge pointing outward
    const fx = L.end[0], fy = L.end[1];
    ctx.beginPath(); ctx.moveTo(fx - 26 + (side < 0 ? -22 : 0), fy); ctx.quadraticCurveTo(fx - 28, fy - 34, fx, fy - 34); ctx.quadraticCurveTo(fx + 30 + (side > 0 ? 22 : 0), fy - 26, fx + 30 + (side > 0 ? 22 : 0), fy); ctx.closePath();
    ctx.fillStyle = shoe; ctx.fill(); ctx.lineWidth = LW * 0.8; ctx.strokeStyle = PALETTE.ink; ctx.stroke();
  }
  return out;
}

function torso(P, of, mode) {
  const w = 88 * WD, hw = (of.waist || 62) * WD;
  const top = paint('top', mode);
  // neck
  shape([[-17, NECK - 30], [17, NECK - 30], [19, NECK + 14], [-19, NECK + 14]], paint('skin', mode), LT);
  ctx.save(); ctx.beginPath(); ctx.rect(-19, NECK - 30, 38, 28); ctx.clip(); ctx.fillStyle = tone('tone2'); ctx.fillRect(-19, NECK - 30, 38, 28); ctx.restore();
  // body block: shoulders → waist → hips
  ctx.beginPath(); ctx.moveTo(-24, -792); ctx.quadraticCurveTo(-w + 6, -790, -w - 2, -752);
  ctx.quadraticCurveTo(-w + 2, -660, -hw + 2, -585); ctx.quadraticCurveTo(-hw - 6, -540, -hw - 10, HIPS + 12); ctx.lineTo(hw + 10, HIPS + 12);
  ctx.quadraticCurveTo(hw + 6, -540, hw - 2, -585); ctx.quadraticCurveTo(w - 2, -660, w + 2, -752); ctx.quadraticCurveTo(w - 6, -790, 24, -792); ctx.closePath();
  ctx.fillStyle = top; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = PALETTE.ink; ctx.lineJoin = 'round'; ctx.stroke();
  if (SPEC.torsoDetail) SPEC.torsoDetail(ctx, of, mode, paint, { ln, shape, ell, qc, tone, w, hw, HIPS, NECK, P });
}

function arm(A, of, mode, hand) {
  const fill = paint('sleeve', mode), w = of.armW || 36;
  taper([A.a, A.mid, A.end], [w * 1.08, w * 0.86, w * 0.7], fill, true);
  if (of.sleeve === 'wide') {                                              // robe sleeve hanging from the forearm
    const dx = A.end[0] - A.mid[0], dy = A.end[1] - A.mid[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const m = [A.mid[0] + dx * 0.55, A.mid[1] + dy * 0.55];
    shape([[A.mid[0] - uy * 26, A.mid[1] + ux * 26], [m[0] - uy * 46, m[1] + ux * 46 + 50], [m[0] + uy * 46, m[1] - ux * 46 + 50], [A.mid[0] + uy * 26, A.mid[1] - ux * 26]], fill, LW * 0.8);
  }
  // hand
  const dx = A.end[0] - A.mid[0], dy = A.end[1] - A.mid[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  const hx = A.end[0] + ux * 14, hy = A.end[1] + uy * 14, skin = paint('skin', mode);
  if (hand === 'fist') { ell(hx, hy, 23, 21, skin, LW * 0.8, Math.atan2(uy, ux)); for (let i = -1; i <= 1; i++) ln([[hx + ux * 10 - uy * i * 8, hy + uy * 10 + ux * i * 8], [hx + ux * 20 - uy * i * 8, hy + uy * 20 + ux * i * 8]], 2); }
  else if (hand === 'open') { ell(hx + ux * 6, hy + uy * 6, 26, 18, skin, LW * 0.8, Math.atan2(uy, ux)); for (let i = -1; i <= 1; i++) ln([[hx + ux * 18 - uy * i * 7, hy + uy * 18 + ux * i * 7], [hx + ux * 34 - uy * i * 8, hy + uy * 34 + ux * i * 8]], 9, PALETTE.ink), ln([[hx + ux * 18 - uy * i * 7, hy + uy * 18 + ux * i * 7], [hx + ux * 33 - uy * i * 8, hy + uy * 33 + ux * i * 8]], 5, skin); }
  else if (hand === 'point') { ell(hx, hy, 21, 19, skin, LW * 0.8); ln([[hx + ux * 12, hy + uy * 12], [hx + ux * 44, hy + uy * 44]], 13); ln([[hx + ux * 12, hy + uy * 12], [hx + ux * 43, hy + uy * 43]], 7, skin); }
  else ell(hx, hy, 16, 19, skin, LW * 0.8);
  return [hx, hy];
}

function ember(o, t, mode) {
  const k = clamp(o.ember ?? 0); if (k <= 0) return;
  const [x, y] = [0, -700], pulse = 1 + Math.sin(t * 9) * 0.08, col = mode !== 'mono' ? SPEC.full.ember : null;
  ctx.save();
  if (col) { const g = ctx.createRadialGradient(x, y, 4, x, y, 230 * k * pulse); g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.18, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.globalAlpha *= 0.95; ctx.beginPath(); ctx.arc(x, y, 230 * k * pulse, 0, TAU); ctx.fill(); ctx.globalAlpha = o.alpha ?? 1; }
  // ink rays: a manga "glow" drawn with lines
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + t * 0.6, r0 = 40 * k, r1 = (110 + (i % 3) * 40) * k * pulse; ln([[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * r1, y + Math.sin(a) * r1]], i % 2 ? 2 : 3.5); }
  ell(x, y, 30 * k * pulse, 30 * k * pulse, col || PALETTE.paper, 4);
  ell(x, y, 13 * k, 13 * k, '#FFFFFF');
  ctx.restore();
}

function aura(o, t, mode, front) {
  const k = clamp(o.aura ?? 0); if (k <= 0) return;
  const fill = mode === 'mono' ? PALETTE.paper : SPEC.full.ember, n = front ? 7 : 11;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, x = lerp(-230, 230, u) + Math.sin(i * 2.1) * 30, base = front ? -40 : -60;
    const h = (front ? 260 : 520 + 260 * Math.sin(u * Math.PI)) * k * (0.8 + 0.25 * Math.sin(t * 13 + i * 1.7));
    flame(x, base - (front ? 0 : 100 * Math.sin(u * Math.PI)), (front ? 46 : 80) * k, h, t * 11 + i, fill, front ? 3.5 : 5);
  }
}

function drawProp(prop, hands, mode, t) {
  if (typeof prop === 'function') return prop(ctx, hands, mode);
  const [l, r] = [hands.l, hands.r];
  if (prop === 'brush') {                                                   // ink brush, held in the right hand, pointing up-out
    ctx.save(); ctx.translate(r[0], r[1]); ctx.rotate(-0.5);
    shape([[-7, 60], [7, 60], [7, -150], [-7, -150]], PALETTE.paper, 4); for (const y of [20, -40, -100]) ln([[-7, y], [7, y]], 2);
    ctx.beginPath(); ctx.moveTo(-10, -150); ctx.quadraticCurveTo(-16, -200, 0, -250); ctx.quadraticCurveTo(16, -200, 10, -150); ctx.closePath(); ctx.fillStyle = PALETTE.ink; ctx.fill();
    ctx.restore();
  } else if (prop === 'blade') {                                            // the Inkguard brush-blade: a brush whose tip is a long ink edge
    // held in the right hand, the ink edge always points up and away from the body (never across the face)
    ctx.save(); ctx.translate(r[0], r[1]); ctx.rotate(0.42);
    shape([[-8, 70], [8, 70], [8, -40], [-8, -40]], tone('tone2'), 4);
    shape([[-24, -40], [24, -40], [18, -56], [-18, -56]], PALETTE.ink, 3);
    ctx.beginPath(); ctx.moveTo(-14, -56); ctx.quadraticCurveTo(-26, -260, 6, -470); ctx.quadraticCurveTo(26, -250, 14, -56); ctx.closePath();
    ctx.fillStyle = isFull('blade', mode) ? SPEC.full.blade : PALETTE.ink; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = PALETTE.ink; ctx.stroke();
    ln([[-4, -80], [2, -420]], 3, PALETTE.paper);
    ctx.restore();
  } else if (prop === 'lantern') {
    const [x, y] = r; ln([[x, y], [x, y + 50]], 3);
    shape([[x - 40, y + 50], [x + 40, y + 50], [x + 48, y + 120], [x + 40, y + 190], [x - 40, y + 190], [x - 48, y + 120]], isFull('lantern', mode) ? SPEC.full.lantern : PALETTE.paper, 5);
    for (const yy of [85, 120, 155]) ln([[x - 46, y + yy], [x + 46, y + yy]], 2.4);
    shape([[x - 30, y + 40], [x + 30, y + 40], [x + 30, y + 52], [x - 30, y + 52]], PALETTE.ink, 0); shape([[x - 30, y + 188], [x + 30, y + 188], [x + 30, y + 200], [x - 30, y + 200]], PALETTE.ink, 0);
  } else if (prop === 'cane') {
    const [x, y] = r; ln([[x, y - 30], [x + 10, -2]], 14); ln([[x, y - 30], [x + 10, -2]], 8, PALETTE.paper); qc([x - 30, y - 40], [x - 10, y - 70], [x + 4, y - 30], 10);
  }
}

/** model-space point → screen point, for a given draw() call's options */
export function anchor(o, name) {
  const [mx, my] = Array.isArray(name) ? name : ANCHORS[name] || ANCHORS.head, s = (o.s ?? 1) * SC, f = o.flip ?? 1;
  const P = resolvePose(o);
  // follow the lean / crouch / lift of the pose for upper-body anchors
  let x = mx, y = my;
  if (my < HIPS + 5) { const dy = my - HIPS, c = Math.cos(P.lean), sn = Math.sin(P.lean); x = P.hip[0] + mx * c - dy * sn; y = HIPS + P.hip[1] - P.lift + mx * sn + dy * c; }
  return [(o.x ?? 540) + x * s * f, (o.y ?? 1600) + y * s];
}

/**
 * draw({ x, y, s, flip, t, pose, poseFrom, poseK, hands, lean, expression, outfit, color, look, blink, talk, ember, aura,
 *        prop, extras, shadow, alpha })
 *   color   'mono' (default, B&W ink) · 'accent' (only the signature accent in colour) · 'full' (a colour moment)
 *   ember   0..1 the glowing coal in the chest   aura 0..1 flames around the body (an Ember igniting)
 */
export function draw(o = {}) {
  const t = o.t ?? 0, s = (o.s ?? 1) * SC, mode = o.color || 'mono';
  const of = OUTFITS[o.outfit] || OUTFITS[Object.keys(OUTFITS)[0]], ex = EXPRESSIONS[o.expression] || EXPRESSIONS.neutral;
  CUR = of;
  const P = resolvePose(o), sway = Math.sin(t * 1.7) * 5 + (P.lean * 30);
  ctx.save();
  ctx.translate(o.x ?? 540, o.y ?? 1600); ctx.scale(s * (o.flip ?? 1), s);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (o.shadow !== false && P.lift < 300) { ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 170 * WD, 22, 0, 0, TAU); ctx.fillStyle = tone('tone2'); ctx.fill(); ctx.restore(); }
  aura(o, t, mode, false);
  // upper body frame: lean around the hips
  const upper = (fn) => { ctx.save(); ctx.translate(P.hip[0], HIPS + P.hip[1] - P.lift); ctx.rotate(P.lean); ctx.translate(0, -HIPS); fn(); ctx.restore(); };
  const breathe = Math.sin(t * 2.3) * 1.6;
  upper(() => { ctx.translate(0, breathe); ctx.save(); ctx.translate(0, NECK); ctx.rotate(P.tilt); ctx.translate(0, -NECK); SPEC.hairBack(ctx, mode, sway, t, paint, { ln, shape, ell, qc, tone, flame, o }); ctx.restore(); if (SPEC.behind) SPEC.behind(ctx, mode, sway, t, paint, { ln, shape, ell, qc, tone, flame, o, P }); });
  // legs in body space (feet stay planted; hips move)
  if (!of.longSkirt) legs(P, of, mode, o);
  // hands: targets are in body space; bring them into the leaned upper-body frame
  const c = Math.cos(-P.lean), sn = Math.sin(-P.lean), hy0 = HIPS + P.hip[1] - P.lift;
  const toUpper = (p) => { const dx = p[0] - P.hip[0], dy = p[1] - hy0; return [dx * c - dy * sn, HIPS + dx * sn + dy * c]; };
  const hl = toUpper(P.l), hr = toUpper(P.r);
  let hands = null;
  upper(() => {
    ctx.translate(0, breathe);
    const A = { l: solve(SH.l, hl, A1, A2, 1), r: solve(SH.r, hr, A1, A2, -1) };
    if (of.longSkirt) { ctx.save(); ctx.translate(0, -breathe); ctx.restore(); }
    torso(P, of, mode);
    if (of.longSkirt) SPEC.skirt(ctx, of, mode, paint, { ln, shape, ell, qc, tone, P, HIPS, hw: (of.waist || 72) * WD });
    ember(o, t, mode);
    ctx.save(); ctx.translate(0, NECK); ctx.rotate(P.tilt); ctx.translate(0, -NECK);
    head(o, ex, t, mode, sway);
    SPEC.hairFront(ctx, mode, sway, t, paint, { ln, shape, ell, qc, tone, flame, o });
    if (SPEC.headExtras) SPEC.headExtras(ctx, mode, sway, t, paint, { ln, shape, ell, qc, tone, o, ex });
    ctx.restore();
    const kindL = P.fist ? 'fist' : P.open ? 'open' : 'rest', kindR = P.point === 'r' ? 'point' : kindL;
    const pl = arm(A.l, of, mode, kindL), pr = arm(A.r, of, mode, kindR);
    hands = { l: pl, r: pr };
    if (SPEC.front) SPEC.front(ctx, mode, sway, t, paint, { ln, shape, ell, qc, tone, flame, o, P, hands });
    const prop = o.prop ?? null;
    if (prop) drawProp(prop, hands, mode, t);
  });
  aura(o, t, mode, true);
  ctx.restore();
}

export default { id: SPEC.id, HEIGHT, PALETTE, OUTFITS, EXPRESSIONS, POSES, ANCHORS, draw, anchor, flame };
