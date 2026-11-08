// PENNY: the Penny Explains host, a sly calico cat with a gold cent pendant. The ONLY code that draws her: every video
// imports this through the cast (cast('penny').draw({...})), so she looks the same everywhere. Read CHARACTER.md before
// changing anything, and bump "version" in character.json when the look changes.
//
// Model space: origin between her feet, y up is negative, ~1075 units tall at s = 1 (ear tips at y -1075).
//   draw({ x, y, s, flip, pose, poseFrom, poseK, hands, expression, outfit, xray, t, look, blink, talk, count,
//          prop, extras, shadow, alpha, tail })
//   x, y       screen position of her feet            s      scale (1 ≈ 1075 px tall)      flip  -1 mirrors her
//   pose       a POSES key; poseFrom + poseK (0..1) blends from another pose; hands = { l:[x,y], r:[x,y] } overrides
//              the paw targets (model space, like ANCHORS)
//   expression an EXPRESSIONS key                    outfit an OUTFITS key                  t     film time (blink, tail)
//   look       [dx, dy] eye direction, -1..1         blink  true = automatic blinking       talk  0..1 mouth flap
//   count      0..5 raised toes on the counting paw (pose 'count'; default 3)
//   prop       'coin' | 'bill' | 'card' | (ctx, hands) => {} drawn in model space in front of her paws
//   xray       true = x-ray body (navy, mint outline, a stack of coins in her belly); her head stays normal
//   (a pose may tilt the head: POSES[p].head = [dx, dy, rotation] around the neck)
//   extras     false hides expression extras          shadow false hides the floor shadow    tail  0..1 extra swish
import { ctx, clamp, lerp, TAU } from '/src/core/lib.js';

export const HEIGHT = 1075;

export const PALETTE = {
  line: '#2B2028', fur: '#FFFDF8', furShade: '#EFE5D8', ginger: '#EE8A3C', gingerShade: '#D06C22', patch: '#2F2A33',
  iris: '#56BC6C', irisDark: '#2B7A47', irisLight: '#B4E99A', pupil: '#14211A', nose: '#F0899A', innerEar: '#F7B4C1',
  mouth: '#8E2F45', tongue: '#F59AAA', blush: '#FFB0BE', pad: '#F49FB0', gold: '#F5B83D', goldDark: '#C3861A',
  goldLight: '#FFE28E', white: '#FFFFFF', sweat: '#9ED8FF', anger: '#E5483B', xBody: '#1E2A4A', xLine: '#7FE0D0',
  shadow: 'rgba(40,30,20,0.16)',
};

/** outfits are data: collar colour, pendant, and head / face accessories */
export const OUTFITS = {
  classic: { collar: '#1F8A8A', collarDark: '#146565', pendant: true },
  banker: { collar: '#2E9E5B', collarDark: '#1E7341', pendant: true, visor: '#2E9E5B', visorDark: '#1E7341', pencil: true },
  fancy: { collar: '#2B2028', collarDark: '#16101A', pendant: true, bowtie: '#5B3FA0', bowtieDark: '#3D2872', monocle: true, hat: '#2B2028', hatBand: '#F5B83D' },
};

/** eyes: open | half | happy | closed | wide | wink | narrow | sad | dollar · brows: degrees (+ = angry, - = worried)
 *  mouth: cat | smug | grin | open | o | frown | flat | wavy | shout · ears: 1 perked … -1 flat · extras: list */
export const EXPRESSIONS = {
  neutral: { eyes: 'open', brows: 0, mouth: 'cat', ears: 0 },
  smile: { eyes: 'open', brows: -4, mouth: 'open', ears: 0.3, blush: 0.5 },
  smug: { eyes: 'half', brows: 8, browTilt: true, mouth: 'smug', ears: 0.2, blush: 0.2 },
  grin: { eyes: 'half', brows: -2, mouth: 'grin', ears: 0.4, blush: 0.4, extras: ['sparkles'] },
  wink: { eyes: 'wink', brows: -4, mouth: 'smug', ears: 0.3, blush: 0.4, extras: ['sparkles'] },
  happy: { eyes: 'happy', brows: -6, mouth: 'open', ears: 0.5, blush: 0.8 },
  surprised: { eyes: 'wide', brows: -12, mouth: 'o', ears: 0.8 },
  shock: { eyes: 'wide', brows: -18, mouth: 'shout', ears: 1, small: true, extras: ['sweat', 'shock'] },
  suspicious: { eyes: 'narrow', brows: 14, mouth: 'flat', ears: -0.3, look: [0.6, 0] },
  angry: { eyes: 'open', brows: 24, mouth: 'shout', ears: -1, extras: ['anger'] },
  sad: { eyes: 'sad', brows: -16, mouth: 'frown', ears: -0.8 },
  thinking: { eyes: 'open', brows: 6, mouth: 'wavy', ears: 0, look: [0.5, -0.7] },
  greedy: { eyes: 'dollar', brows: -6, mouth: 'grin', ears: 0.6, blush: 0.5, extras: ['dollars'] },
};

/** poses are paw targets in model space (r = viewer's right, her left); the arms solve themselves (2-bone IK)
 *  paw kinds: fist (default) | open (palm to viewer) | point (one toe out) | count (o.count toes up) */
export const POSES = {
  stand: { l: [-130, -448], r: [130, -448] },
  wave: { l: [-130, -448], r: [178, -800], wave: 'r', paw: { r: 'open' } },
  point: { l: [-130, -448], r: [278, -690], paw: { r: 'point' } },
  present: { l: [-130, -448], r: [272, -560], paw: { r: 'open' } },
  coin: { l: [-130, -448], r: [150, -790], prop: 'coin' },
  count: { l: [-140, -500], r: [140, -810], paw: { r: 'count' } },
  think: { l: [-20, -560], r: [40, -712], head: [0, 0, -0.06] },
  shrug: { l: [-212, -690], r: [212, -690], paw: { l: 'open', r: 'open' } },
  facepalm: { l: [-130, -448], r: [56, -806], paw: { r: 'open' }, front: true, head: [10, 42, 0.12] },
  hips: { l: [-150, -490], r: [150, -490], elbowsOut: true },
  cheer: { l: [-170, -800], r: [170, -800], paw: { l: 'open', r: 'open' } },
  hold: { l: [-66, -520], r: [66, -520] },
};

/** named points in model space, for placing things on her (bubbles, props, effects) */
export const ANCHORS = {
  top: [0, -1075], head: [0, -850], face: [0, -830], eyeL: [-70, -858], eyeR: [70, -858], nose: [0, -810],
  mouth: [0, -786], neck: [0, -700], pendant: [0, -664], chest: [0, -600], belly: [0, -450], hips: [0, -300],
  handL: [-130, -448], handR: [130, -448], tail: [226, -680], feet: [0, 0], bubble: [200, -1010],
};

const SH = { l: [-92, -628], r: [92, -628] }, L1 = 98, L2 = 92;
const LW = 5.5;
const P = PALETTE;

// ---------- small drawing helpers (model space) ----------
function ellipse(x, y, rx, ry, fill, stroke, lw = LW, rot = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function stroke(pts, color, lw, cap = 'round') {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.lineCap = cap; ctx.lineJoin = 'round'; ctx.stroke();
}
function curve(a, c, b, color, lw) {
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(c[0], c[1], b[0], b[1]);
  ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.stroke();
}
function fillPath(build, fill, line = P.line, lw = LW) {
  ctx.beginPath(); build(); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (line) { ctx.lineWidth = lw; ctx.strokeStyle = line; ctx.lineJoin = 'round'; ctx.stroke(); }
}
function star4(x, y, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, rr = i % 2 ? r * 0.3 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
/** a "¢" drawn as shapes (no font needed), centred at x, y, height ~ 2r */
function centSign(x, y, r, color, lw) {
  ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0.3 * Math.PI, 1.7 * Math.PI, false);
  ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.stroke();
  stroke([[x + r * 0.08, y - r], [x - r * 0.08, y + r]], color, lw * 0.8);
}

/** a gold coin with a cent sign, centred at x, y (radius r); spin 0..1 squashes it like a flip */
export function coin(x, y, r = 34, spin = 0) {
  const sx = Math.max(0.08, Math.abs(Math.cos(spin * Math.PI)));
  ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1);
  ellipse(0, 0, r, r, P.gold, P.line, LW * 0.9);
  ellipse(0, 0, r * 0.74, r * 0.74, null, P.goldDark, LW * 0.6);
  if (sx > 0.35) centSign(0, 0, r * 0.5, P.goldDark, r * 0.17);
  ellipse(-r * 0.42, -r * 0.42, r * 0.16, r * 0.1, P.goldLight, null, 0, -0.8);
  ctx.restore();
}

/** 2-bone IK: shoulder → paw target; the elbow bends outward (away from the body) */
export function solveArm(sh, target, side, elbowsOut = false) {
  let dx = target[0] - sh[0], dy = target[1] - sh[1], d = Math.hypot(dx, dy);
  const max = L1 + L2 - 0.5; if (d > max) { dx *= max / d; dy *= max / d; d = max; }
  const hand = [sh[0] + dx, sh[1] + dy];
  const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)), base = Math.atan2(dy, dx);
  const e1 = [sh[0] + Math.cos(base + a) * L1, sh[1] + Math.sin(base + a) * L1], e2 = [sh[0] + Math.cos(base - a) * L1, sh[1] + Math.sin(base - a) * L1];
  const out = (e) => e[0] * side + (elbowsOut ? 0 : 0.0001 * e[1]);
  return { sh, elbow: out(e1) >= out(e2) ? e1 : e2, hand };
}

function resolveHands(o) {
  const to = POSES[o.pose] || POSES.stand, from = o.poseFrom ? POSES[o.poseFrom] || POSES.stand : null, k = from ? clamp(o.poseK ?? 1) : 1;
  const mix = (side) => (from ? [lerp(from[side][0], to[side][0], k), lerp(from[side][1], to[side][1], k)] : [...to[side]]);
  const hands = { l: o.hands?.l ? [...o.hands.l] : mix('l'), r: o.hands?.r ? [...o.hands.r] : mix('r') };
  if (to.wave && k > 0.6) hands[to.wave][0] += Math.sin((o.t || 0) * 11) * 26;
  const pawOf = (p, side) => (p && p.paw && p.paw[side]) || 'fist';
  const paws = { l: k > 0.6 ? pawOf(to, 'l') : pawOf(from, 'l'), r: k > 0.6 ? pawOf(to, 'r') : pawOf(from, 'r') };
  return { hands, pose: to, k, paws };
}

// ---------- body parts ----------
function tailPts(t, swish) {
  const w = Math.sin(t * 2.4) * 16 + swish * 40;
  return [[110, -290], [280, -290], [330 + w * 0.4, -540], [226 + w, -680]];
}
function bez(p, u) {
  const v = 1 - u;
  return [v * v * v * p[0][0] + 3 * v * v * u * p[1][0] + 3 * v * u * u * p[2][0] + u * u * u * p[3][0],
    v * v * v * p[0][1] + 3 * v * v * u * p[1][1] + 3 * v * u * u * p[2][1] + u * u * u * p[3][1]];
}
function tail(t, swish, xray) {
  const p = tailPts(t, swish), seg = (a, b) => { const pts = []; for (let i = 0; i <= 24; i++) pts.push(bez(p, lerp(a, b, i / 24))); return pts; };
  stroke(seg(0, 1), xray ? P.xLine : P.line, 50 + LW * 2);
  if (xray) { stroke(seg(0, 1), P.xBody, 50); return; }
  stroke(seg(0, 1), P.fur, 50);
  stroke(seg(0.42, 1), P.ginger, 50);
  stroke(seg(0.62, 0.74), P.gingerShade, 50, 'butt');
  stroke(seg(0.8, 1), P.patch, 50);
}

function legs(xray) {
  for (const side of [-1, 1]) {
    const x = 58 * side;
    fillPath(() => ctx.roundRect(x - 48, -300, 96, 284, 44), xray ? P.xBody : P.fur, xray ? P.xLine : P.line);
  }
  if (!xray) { // a black sock patch on her right leg (viewer's left) and a ginger one on the other leg
    ctx.save(); ctx.beginPath(); ctx.roundRect(-106, -300, 96, 284, 44); ctx.clip();
    ellipse(-58, -50, 70, 50, P.patch); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.roundRect(10, -300, 96, 284, 44); ctx.clip();
    ellipse(96, -150, 46, 60, P.ginger); ctx.restore();
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.roundRect(58 * side - 48, -300, 96, 284, 44); ctx.lineWidth = LW; ctx.strokeStyle = P.line; ctx.stroke(); }
  }
  for (const side of [-1, 1]) {
    const x = 64 * side;
    ellipse(x, -26, 64, 30, xray ? P.xBody : (side < 0 ? P.patch : P.fur), xray ? P.xLine : P.line);
    if (!xray) for (const k of [-16, 16]) stroke([[x + k, -44], [x + k, -30]], side < 0 ? P.fur : P.line, 3.5);
  }
}

function torsoPath() {
  ctx.moveTo(-74, -700);
  ctx.bezierCurveTo(-132, -690, -168, -560, -168, -430);
  ctx.bezierCurveTo(-168, -300, -116, -250, 0, -250);
  ctx.bezierCurveTo(116, -250, 168, -300, 168, -430);
  ctx.bezierCurveTo(168, -560, 132, -690, 74, -700);
}
function torso(xray) {
  fillPath(torsoPath, xray ? P.xBody : P.fur, xray ? P.xLine : P.line);
  if (xray) {
    // what's inside a money cat: a stack of coins
    for (let i = 0; i < 6; i++) { const y = -360 - i * 26; ellipse(0, y, 62, 18, P.gold, P.goldDark, 3); ellipse(0, y - 5, 62, 16, P.gold); ellipse(0, y - 5, 44, 10, null, P.goldDark, 2.5); }
    return;
  }
  ctx.save(); ctx.beginPath(); torsoPath(); ctx.closePath(); ctx.clip();
  fillPath(() => { ctx.moveTo(-190, -650); ctx.bezierCurveTo(-70, -650, -16, -570, -40, -480); ctx.bezierCurveTo(-60, -400, -140, -380, -190, -400); }, P.ginger, null);
  for (const y of [-600, -560]) curve([-150, y], [-110, y + 6], [-80, y + 22], P.gingerShade, 7);
  fillPath(() => { ctx.moveTo(190, -420); ctx.bezierCurveTo(120, -430, 96, -360, 118, -300); ctx.bezierCurveTo(134, -262, 170, -262, 190, -280); }, P.patch, null);
  ctx.restore();
  fillPath(torsoPath, null, P.line);
  // belly fluff line
  curve([-40, -330], [0, -312], [40, -330], P.furShade, 5);
}

function collar(of) {
  ctx.beginPath(); ctx.ellipse(0, -694, 92, 24, 0, 0, TAU); ctx.fillStyle = of.collar; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = P.line; ctx.stroke();
  curve([-80, -686], [0, -668], [80, -686], of.collarDark, 5);
  if (of.bowtie) {
    for (const s of [-1, 1]) fillPath(() => { ctx.moveTo(0, -686); ctx.lineTo(48 * s, -712); ctx.lineTo(52 * s, -660); }, of.bowtie, P.line, 4.5);
    ellipse(0, -686, 13, 15, of.bowtieDark, P.line, 4);
  }
  if (of.pendant) { stroke([[0, -680], [0, -668]], P.goldDark, 5); coin(of.bowtie ? 0 : 0, of.bowtie ? -628 : -650, 30); }
}

function ear(side, lift, fill, xray) {
  ctx.save(); ctx.translate(112 * side, -940); ctx.rotate(side * (0.12 - lift * 0.32));
  fillPath(() => { ctx.moveTo(-62 * side, 30); ctx.quadraticCurveTo(-30 * side, -60, 34 * side, -130); ctx.quadraticCurveTo(70 * side, -40, 66 * side, 34); }, fill, P.line);
  fillPath(() => { ctx.moveTo(-30 * side, 22); ctx.quadraticCurveTo(-8 * side, -40, 30 * side, -88); ctx.quadraticCurveTo(48 * side, -30, 42 * side, 26); }, P.innerEar, null);
  ctx.restore();
}

function headPath() {
  ctx.moveTo(-170, -800);
  ctx.bezierCurveTo(-190, -930, -110, -990, 0, -990);
  ctx.bezierCurveTo(110, -990, 190, -930, 170, -800);
  ctx.lineTo(194, -772); ctx.lineTo(160, -764); ctx.lineTo(176, -738);           // cheek tufts
  ctx.bezierCurveTo(130, -690, 70, -682, 0, -682);
  ctx.bezierCurveTo(-70, -682, -130, -690, -176, -738);
  ctx.lineTo(-160, -764); ctx.lineTo(-194, -772);
}

function blinkAmount(o, t) {
  if (o.blink === false) return 0;
  const period = 3.9, ph = ((t + 0.9) % period + period) % period;
  return ph < 0.14 ? Math.sin(ph / 0.14 * Math.PI) : 0;
}

function eyes(o, ex, t) {
  const [lx, ly] = o.look || ex.look || [0, 0], close = blinkAmount(o, t);
  for (const side of [-1, 1]) {
    const x = 70 * side, y = -858, lid = side < 0 ? P.ginger : P.fur;
    let kind = ex.eyes;
    if (kind === 'wink') kind = side === 1 ? 'happy' : 'half';
    if (close > 0.65 && ['open', 'wide', 'sad', 'half', 'narrow', 'dollar'].includes(kind)) kind = 'closed';
    if (kind === 'happy') { curve([x - 32, y + 10], [x, y - 30], [x + 32, y + 10], P.line, 8); continue; }
    if (kind === 'closed') { curve([x - 32, y + 2], [x, y + 18], [x + 32, y + 2], P.line, 7.5); continue; }
    const wide = kind === 'wide', rx = wide ? 42 : 38, ry = (wide ? 48 : 44) * (1 - close * 0.6);
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fillStyle = P.iris; ctx.fill(); ctx.clip();
    ellipse(x, y + ry * 0.55, rx * 1.1, ry * 0.5, P.irisLight);
    ellipse(x, y - ry * 0.5, rx * 1.2, ry * 0.45, P.irisDark);
    const ix = x + lx * 12, iy = y + 4 + ly * 9;
    if (kind === 'dollar') {
      ctx.font = '900 64px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = P.gold;
      ctx.lineWidth = 6; ctx.strokeStyle = P.pupil; ctx.strokeText('$', ix, iy + 2); ctx.fillText('$', ix, iy + 2);
    } else {
      const pw = ex.small ? 7 : kind === 'half' ? 13 : 15, ph = ex.small ? 14 : 34;
      ellipse(ix, iy, pw, ph, P.pupil);
      ellipse(ix + 12, iy - 16, ex.small ? 6 : 10, ex.small ? 7 : 12, P.white);
      ellipse(ix - 10, iy + 16, 4.5, 4.5, P.white);
    }
    // lids (fur coloured, so the eye shape changes with the mood)
    if (kind === 'half' || kind === 'narrow') { ctx.fillStyle = lid; ctx.fillRect(x - 60, y - 70, 120, 70 - ry * (kind === 'half' ? 0.1 : 0.35)); }
    if (kind === 'narrow') { ctx.fillStyle = lid; ctx.fillRect(x - 60, y + ry * 0.45, 120, 60); }
    if (kind === 'sad') { ctx.save(); ctx.translate(x, y - ry * 0.35); ctx.rotate(-0.42 * side); ctx.fillStyle = lid; ctx.fillRect(-70, -80, 140, 80); ctx.restore(); }
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.lineWidth = LW; ctx.strokeStyle = P.line; ctx.stroke();
    if (kind === 'half') stroke([[x - rx - 4, y - ry * 0.12], [x + rx + 4, y - ry * 0.12]], P.line, 8);
    if (kind === 'narrow') { stroke([[x - rx - 2, y - ry * 0.38], [x + rx + 2, y - ry * 0.38]], P.line, 7); stroke([[x - rx + 4, y + ry * 0.45], [x + rx - 4, y + ry * 0.45]], P.line, 5); }
    if (kind === 'sad') { const a = -0.42 * side, c = [x, y - ry * 0.35]; stroke([[c[0] - Math.cos(a) * 46, c[1] - Math.sin(a) * 46], [c[0] + Math.cos(a) * 46, c[1] + Math.sin(a) * 46]], P.line, 7); }
  }
}

function brows(ex) {
  const a = (ex.brows || 0) * Math.PI / 180;
  for (const side of [-1, 1]) {
    // smug: one brow (viewer's right) up, the other level
    const tilt = ex.browTilt ? (side > 0 ? -16 : 4) : 0;
    const cx = 70 * side, cy = -930 + tilt - (ex.eyes === 'wide' ? 10 : 0), half = 26;
    const aa = ex.browTilt && side > 0 ? -a : a;
    const ix = cx - half * side, iy = cy + Math.sin(aa) * half, ox = cx + half * side, oy = cy - Math.sin(aa) * half;
    curve([ix, iy], [cx, cy - 8], [ox, oy], P.line, 8);
  }
}

function mouth(o, ex, t) {
  let m = ex.mouth;
  const talk = o.talk ? (0.5 + 0.5 * Math.sin((t || 0) * 22)) * o.talk : 0;
  if (talk > 0.35 && ['cat', 'flat', 'smug', 'wavy'].includes(m)) m = 'open';
  const y = -794;
  if (m === 'cat') { curve([0, y - 6], [-6, y + 10], [-24, y + 2], P.line, 5); curve([0, y - 6], [6, y + 10], [24, y + 2], P.line, 5); }
  else if (m === 'smug') { curve([0, y - 6], [-6, y + 8], [-20, y + 4], P.line, 5); curve([0, y - 6], [14, y + 8], [34, y - 10], P.line, 5.5); }
  else if (m === 'flat') stroke([[-18, y + 4], [18, y + 4]], P.line, 5);
  else if (m === 'frown') { curve([-24, y + 12], [0, y - 4], [24, y + 12], P.line, 5); }
  else if (m === 'wavy') { ctx.beginPath(); ctx.moveTo(-22, y + 4); for (let i = 1; i <= 6; i++) ctx.lineTo(-22 + i * 7.3, y + 4 + (i % 2 ? -5 : 5)); ctx.lineWidth = 4.5; ctx.strokeStyle = P.line; ctx.lineJoin = 'round'; ctx.stroke(); }
  else if (m === 'o') ellipse(0, y + 8, 11, 14 + talk * 4, P.mouth, P.line, 4);
  else {
    const w = m === 'grin' ? 36 : m === 'shout' ? 26 : 22, h = (m === 'shout' ? 34 : m === 'grin' ? 22 : 18) * (1 - talk * 0.3 + (m === 'open' ? talk * 0.3 : 0));
    ctx.beginPath();
    if (m === 'shout') ctx.ellipse(0, y + 14, w, h * 0.75, 0, 0, TAU);
    else { ctx.moveTo(-w, y - 2); ctx.quadraticCurveTo(0, y + h * 2, w, y - 2); ctx.quadraticCurveTo(0, y + 6, -w, y - 2); }
    ctx.fillStyle = P.mouth; ctx.fill(); ctx.lineWidth = 4.5; ctx.strokeStyle = P.line; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.save(); ctx.clip(); ellipse(0, y + h * (m === 'shout' ? 1.0 : 1.25), w * 0.6, h * 0.5, P.tongue);
    if (m === 'grin') fillPath(() => { ctx.moveTo(14, y); ctx.lineTo(24, y); ctx.lineTo(19, y + 12); }, P.white, null);   // one sly fang
    ctx.restore();
  }
}

function face(o, ex, of, t, xray) {
  const lift = ex.ears ?? 0;
  ear(-1, lift, P.ginger); ear(1, lift, P.patch);
  fillPath(headPath, P.fur, P.line);
  // calico patches, clipped to the head
  ctx.save(); ctx.beginPath(); headPath(); ctx.closePath(); ctx.clip();
  fillPath(() => { ctx.moveTo(-200, -1000); ctx.lineTo(-10, -1000); ctx.bezierCurveTo(-20, -930, 0, -900, -18, -850); ctx.bezierCurveTo(-30, -800, -80, -790, -130, -800); ctx.bezierCurveTo(-170, -805, -200, -790, -210, -780); }, P.ginger, null);
  fillPath(() => { ctx.moveTo(30, -1000); ctx.lineTo(200, -1000); ctx.lineTo(200, -930); ctx.bezierCurveTo(150, -935, 120, -920, 100, -945); ctx.bezierCurveTo(80, -965, 50, -950, 34, -930); ctx.bezierCurveTo(20, -955, 30, -985, 30, -1000); }, P.patch, null);
  // forehead stripes on the ginger patch
  for (const dx of [-70, -46]) stroke([[dx, -985], [dx + 4, -955]], P.gingerShade, 7);
  ctx.restore();
  fillPath(headPath, null, P.line);
  const b = o.blush ?? ex.blush ?? 0.25;
  if (b > 0) { const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * (0.35 + 0.5 * b); for (const s of [-1, 1]) ellipse(118 * s, -790, 26, 14, P.blush); ctx.globalAlpha = a0; }
  eyes(o, ex, t); brows(ex);
  // nose + mouth + whiskers
  fillPath(() => { ctx.moveTo(-14, -818); ctx.quadraticCurveTo(0, -824, 14, -818); ctx.quadraticCurveTo(10, -806, 0, -800); ctx.quadraticCurveTo(-10, -806, -14, -818); }, P.nose, P.line, 3.5);
  stroke([[0, -800], [0, -796]], P.line, 4);
  mouth(o, ex, t);
  for (const side of [-1, 1]) for (const [dy, ey] of [[-8, -26], [4, 0], [16, 24]]) curve([96 * side, -800 + dy], [150 * side, -802 + dy], [206 * side, -800 + ey], P.line, 3.2);
  // outfit accessories on the head
  if (of.visor) {
    ctx.save(); ctx.globalAlpha *= 0.82;
    fillPath(() => { ctx.moveTo(-150, -950); ctx.quadraticCurveTo(0, -1000, 150, -950); ctx.lineTo(176, -900); ctx.quadraticCurveTo(0, -940, -176, -900); }, of.visor, P.line);
    ctx.restore(); curve([-160, -944], [0, -992], [160, -944], of.visorDark, 8);
  }
  if (of.pencil) { ctx.save(); ctx.translate(-150, -930); ctx.rotate(-0.9); fillPath(() => ctx.rect(-12, -70, 24, 130), '#F5B83D', P.line, 4); fillPath(() => { ctx.moveTo(-12, 60); ctx.lineTo(12, 60); ctx.lineTo(0, 88); }, '#F4D9B0', P.line, 4); ctx.restore(); }
  if (of.hat) {
    ctx.save(); ctx.translate(40, -985); ctx.rotate(0.16);
    fillPath(() => ctx.roundRect(-112, -12, 224, 30, 14), of.hat, P.line);
    fillPath(() => ctx.roundRect(-74, -150, 148, 146, 10), of.hat, P.line);
    ctx.fillStyle = of.hatBand; ctx.fillRect(-71, -46, 142, 26); ctx.restore();
  }
  if (of.monocle) {
    ellipse(70, -858, 56, 56, null, P.gold, 8); ellipse(70, -858, 56, 56, null, P.line, 2.5);
    ellipse(52, -878, 16, 8, 'rgba(255,255,255,0.45)', null, 0, -0.7);
    ctx.beginPath(); ctx.moveTo(120, -836); ctx.bezierCurveTo(160, -760, 120, -700, 70, -690); ctx.lineWidth = 3.5; ctx.strokeStyle = P.goldDark; ctx.stroke();
  }
}

function arm(a, xray, paw, count, side) {
  const fill = xray ? P.xBody : P.fur, line = xray ? P.xLine : P.line;
  stroke([a.sh, a.elbow, a.hand], line, 52 + LW * 2);
  stroke([a.sh, a.elbow, a.hand], fill, 52);
  const dx = a.hand[0] - a.elbow[0], dy = a.hand[1] - a.elbow[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  const hx = a.hand[0] + ux * 8, hy = a.hand[1] + uy * 8;
  const toe = (ang, len) => { const c = Math.cos(ang), s = Math.sin(ang); stroke([[hx + c * 18, hy + s * 18], [hx + c * (24 + len), hy + s * (24 + len)]], line, 26 + LW * 2); stroke([[hx + c * 18, hy + s * 18], [hx + c * (24 + len), hy + s * (24 + len)]], fill, 26); };
  const base = Math.atan2(uy, ux);
  if (paw === 'point') toe(base, 30);
  if (paw === 'count') { const n = clamp(Math.round(count ?? 3), 0, 5); for (let i = 0; i < n; i++) toe(base + (i - (n - 1) / 2) * 0.42, 26); }
  ellipse(hx, hy, 30, 30, fill, line);
  if (xray) return;
  if (paw === 'open' || paw === 'count') {
    ellipse(hx - ux * 4, hy - uy * 4, 13, 11, P.pad);
    for (const k of [-1, 0, 1]) { const an = base + k * 0.62; ellipse(hx + Math.cos(an) * 17, hy + Math.sin(an) * 17, 5.5, 5.5, P.pad); }
  } else {
    for (const k of [-0.4, 0.4]) { const an = base + k; stroke([[hx + Math.cos(an) * 20, hy + Math.sin(an) * 20], [hx + Math.cos(an) * 29, hy + Math.sin(an) * 29]], P.line, 3.5); }
  }
}

function extras(o, ex, t) {
  const list = o.extras === false ? [] : ex.extras || [];
  const bob = (k) => Math.sin((t || 0) * 3 + k) * 6;
  if (list.includes('sparkles')) for (const [x, y, r, k] of [[-200, -960, 16, 0.5], [214, -900, 12, 1.7], [-150, -1050, 10, 2.9]]) star4(x, y + bob(k) * 0.5, r * (0.8 + 0.2 * Math.sin((t || 0) * 6 + k)), P.gold);
  if (list.includes('dollars')) {
    ctx.font = '900 54px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 7; ctx.strokeStyle = P.line;
    for (const [x, y, k] of [[-210, -980, 0], [220, -1010, 1.3], [-150, -1080, 2.2]]) { ctx.fillStyle = '#1FA463'; ctx.strokeText('$', x, y + bob(k)); ctx.fillText('$', x, y + bob(k)); }
  }
  if (list.includes('sweat')) fillPath(() => { ctx.moveTo(176, -960); ctx.quadraticCurveTo(196, -920, 176, -908); ctx.quadraticCurveTo(156, -920, 176, -960); }, P.sweat, '#5FA8D8', 3);
  if (list.includes('shock')) for (const an of [-2.5, -2.0, -1.1, -0.6]) stroke([[Math.cos(an) * 230, -850 + Math.sin(an) * 230], [Math.cos(an) * 290, -850 + Math.sin(an) * 290]], P.line, 9);
  if (list.includes('anger')) { ctx.save(); ctx.translate(-170, -990); for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); curve([8, 5], [13, 13], [5, 20], P.anger, 7); } ctx.restore(); }
}

function drawProp(prop, hands) {
  if (typeof prop === 'function') return prop(ctx, hands);
  const h = hands.r;
  if (prop === 'coin') coin(h[0] + 4, h[1] - 52, 40);
  else if (prop === 'bill') { ctx.save(); ctx.translate(h[0], h[1] - 40); ctx.rotate(-0.25); fillPath(() => ctx.roundRect(-70, -36, 140, 72, 8), '#9ED9A8', P.line, 4.5); ellipse(0, 0, 20, 24, null, '#2E8B57', 4); ctx.font = '900 30px Inter'; ctx.fillStyle = '#2E8B57'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, 2); ctx.restore(); }
  else if (prop === 'card') { ctx.save(); ctx.translate(h[0], h[1] - 40); ctx.rotate(-0.2); fillPath(() => ctx.roundRect(-64, -40, 128, 80, 10), '#2A7F9E', P.line, 4.5); ctx.fillStyle = P.gold; ctx.fillRect(-46, -14, 24, 18); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-46, 18, 80, 6); ctx.restore(); }
}

/** model-space point → screen point, for a given draw() call's options */
export function anchor(o, name) {
  const [mx, my] = Array.isArray(name) ? name : ANCHORS[name] || ANCHORS.head, s = o.s ?? 1, f = o.flip ?? 1;
  return [(o.x ?? 540) + mx * s * f, (o.y ?? 1600) + my * s];
}

export function draw(o = {}) {
  const t = o.t ?? 0, s = o.s ?? 1, of = OUTFITS[o.outfit] || OUTFITS.classic, ex = EXPRESSIONS[o.expression] || EXPRESSIONS.neutral;
  const xray = !!o.xray, { hands, pose, k, paws } = resolveHands(o);
  ctx.save();
  ctx.translate(o.x ?? 540, o.y ?? 1600); ctx.scale(s * (o.flip ?? 1), s);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (o.shadow !== false) ellipse(0, -8, 150, 22, P.shadow);
  tail(t, o.tail || 0, xray);
  legs(xray);
  const breathe = Math.sin(t * 2.2) * 2;
  ctx.translate(0, breathe);
  torso(xray);
  const arms = { l: solveArm(SH.l, hands.l, -1, pose.elbowsOut), r: solveArm(SH.r, hands.r, 1, pose.elbowsOut) };
  const front = pose.front && k > 0.5;
  if (!front) { arm(arms.l, xray, paws.l, o.count, -1); arm(arms.r, xray, paws.r, o.count, 1); }
  collar(of);
  const hd = (p) => (p && p.head) || [0, 0, 0], h0 = hd(o.poseFrom ? POSES[o.poseFrom] : null), h1 = hd(pose), hk = o.poseFrom ? k : 1;
  const [hx, hy, hr] = [0, 1, 2].map((i) => lerp(h0[i], h1[i], hk));
  ctx.save(); ctx.translate(hx, hy - 690); ctx.rotate(hr); ctx.translate(0, 690);
  face(o, ex, of, t, xray);
  ctx.restore();
  if (front) { arm(arms.l, xray, paws.l, o.count, -1); arm(arms.r, xray, paws.r, o.count, 1); }
  else { // paws raised above the shoulders read in front of the head
    for (const sd of ['l', 'r']) if (arms[sd].hand[1] < -700) arm(arms[sd], xray, paws[sd], o.count, sd === 'l' ? -1 : 1);
  }
  const prop = o.prop ?? (k > 0.6 ? pose.prop : null);
  if (prop) drawProp(prop, { l: arms.l.hand, r: arms.r.hand });
  extras(o, ex, t);
  ctx.restore();
}

export default { id: 'penny', HEIGHT, PALETTE, OUTFITS, EXPRESSIONS, POSES, ANCHORS, draw, anchor, solveArm, coin };
