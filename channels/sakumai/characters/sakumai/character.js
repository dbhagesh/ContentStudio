// SAKUMAI: the Sakumai channel's mascot. The ONLY code that draws her: every video imports this through the cast
// (cast('sakumai').draw({...})), so she looks the same everywhere. Read CHARACTER.md before changing anything, and
// bump "version" in character.json when the look changes.
//
// Model space: origin between her feet, y up is negative, ~1010 units tall at s = 1 (ahoge tip at y -1010).
// Poses and the upper body are drawn in "body space" (lifted by LEGS); ANCHORS are already in model space.
//   draw({ x, y, s, flip, pose, poseFrom, poseK, hands, expression, outfit, xray, inside, t, look, blink, talk,
//          prop, extras, shadow, alpha })
//   x, y      screen position of her feet          s     scale (1 ≈ 1010 px tall)      flip  -1 mirrors her
//   pose      a POSES key; poseFrom + poseK (0..1) blends from another pose; hands = { l:[x,y], r:[x,y] } overrides
//             (model space, like ANCHORS)
//   expression an EXPRESSIONS key                  outfit an OUTFITS key               t     film time (blink, sway)
//   look      [dx, dy] eye direction, -1..1        blink true = automatic blinking     talk  0..1 mouth flap amount
//   blush     0..1 overrides the expression's blush (animate it for a blushing moment)
//   xray      true = x-ray body (navy, lavender outline), head and hair stay normal; inside(ctx) draws organs in
//             model space on top (inside(ctx, ANCHORS)); without it, the default blood-dot pattern
//   prop      'books' | 'phone' | 'heart' | (ctx, hands) => {} drawn in model space in front of her
//   extras    false hides expression extras (hearts, sparkles, sweat, anger mark)   shadow false hides the floor shadow
import { ctx, clamp, lerp, TAU } from '/src/core/lib.js';

export const HEIGHT = 1010;
/** extra leg length: the upper body is drawn LEGS units higher than its body-space coordinates */
export const LEGS = 75;

export const PALETTE = {
  line: '#7A4258', skin: '#FFE7DA', skinShade: '#F7CDBB', blush: '#F79AAE',
  hair: '#F7A9CB', hairLight: '#FCC9DE', hairShade: '#E68AB4', hairLine: '#C8608C',
  iris: '#9A7BE6', irisDark: '#5C40AE', irisLight: '#C9B5FF', lash: '#3A2342', white: '#FFFFFF',
  mouth: '#B83A57', tongue: '#F28C9E', bow: '#E2384A', bowDark: '#A81F31',
  heart: '#FF6F9C', star: '#FFE07A', sweat: '#9ED8FF', anger: '#E2384A',
  xBody: '#25234F', xLine: '#A99BF0', xDot: '#F0485C', shadow: 'rgba(40,20,60,0.18)',
};

/** outfits are data: same body, different cloth colours and collar style */
export const OUTFITS = {
  uniform: { top: '#F9E5AC', topShade: '#EDD08C', topLine: '#A9824F', collar: 'sailor', collarColor: '#2E3D7A', shirt: '#FFFFFF', buttons: true,
    bottom: '#34468A', bottomShade: '#283872', bottomLine: '#1C2756', pleats: true, sock: '#FFFFFF', shoe: '#77462C' },
  casual: { top: '#FFB3CF', topShade: '#F49ABB', topLine: '#B9587F', collar: 'hood', collarColor: '#FFC9DD', shirt: '#FFFFFF', buttons: false,
    bottom: '#7C9BD6', bottomShade: '#6A88C4', bottomLine: '#3F5891', pleats: false, sock: '#FFFFFF', shoe: '#F2F2F7' },
  pajamas: { top: '#CDBDF5', topShade: '#B9A6EE', topLine: '#7A62B8', collar: 'round', collarColor: '#E9E1FF', shirt: '#E9E1FF', buttons: true, dots: '#FFF3B0',
    bottom: '#CDBDF5', bottomShade: '#B9A6EE', bottomLine: '#7A62B8', pleats: false, long: true, sock: '#E9E1FF', shoe: '#F5B8CF' },
};

/** eyes: open | happy | closed | heart | star | wide | wink | sad | aside · brows: degrees (+ = angry, - = worried)
 *  mouth: smile | open | o | grin | frown | flat | cat | wavy | shout · blush 0..1 · extras: list */
export const EXPRESSIONS = {
  neutral: { eyes: 'open', brows: 0, mouth: 'smile', blush: 0.45 },
  smile: { eyes: 'open', brows: -3, mouth: 'open', blush: 0.6 },
  happy: { eyes: 'happy', brows: -6, mouth: 'grin', blush: 0.8, extras: ['sparkles'] },
  love: { eyes: 'heart', brows: -6, mouth: 'open', blush: 1, extras: ['hearts', 'sparkles'] },
  surprised: { eyes: 'wide', brows: -12, mouth: 'o', blush: 0.35 },
  serious: { eyes: 'open', brows: 14, mouth: 'o', blush: 0.5 },
  shy: { eyes: 'aside', brows: -8, mouth: 'wavy', blush: 1, extras: ['blushLines'] },
  sad: { eyes: 'sad', brows: -16, mouth: 'frown', blush: 0.3, extras: ['tear'] },
  angry: { eyes: 'open', brows: 22, mouth: 'shout', blush: 0.4, extras: ['anger'] },
  shock: { eyes: 'wide', brows: -18, mouth: 'shout', blush: 0, extras: ['sweat'], small: true },
  sleepy: { eyes: 'closed', brows: -4, mouth: 'flat', blush: 0.4, extras: ['zzz'] },
  wink: { eyes: 'wink', brows: -4, mouth: 'cat', blush: 0.7, extras: ['sparkles'] },
  starry: { eyes: 'star', brows: -8, mouth: 'grin', blush: 0.7, extras: ['sparkles'] },
};

/** poses are hand targets in body space (r = viewer's right, her left); the arms solve themselves (2-bone IK) */
export const POSES = {
  stand: { l: [-132, -362], r: [132, -362] },
  wave: { l: [-132, -362], r: [215, -805], wave: 'r' },
  cheek: { l: [-132, -362], r: [72, -660] },
  books: { l: [-62, -470], r: [62, -470], prop: 'books' },
  think: { l: [-30, -488], r: [28, -628] },
  point: { l: [-132, -362], r: [255, -640], point: 'r' },
  cheer: { l: [-175, -860], r: [175, -860] },
  shrug: { l: [-200, -560], r: [200, -560] },
  hips: { l: [-112, -425], r: [112, -425], elbowsOut: true },
  heart: { l: [-22, -520], r: [22, -520], prop: 'heart' },
  phone: { l: [-132, -362], r: [40, -560], prop: 'phone' },
  fists: { l: [-70, -600], r: [70, -600] },
};

/** named points in model space, for placing things on her (organs in x-ray, props, speech bubbles) */
const BODY_ANCHORS = {
  top: [0, -935], head: [0, -735], face: [0, -700], mouth: [0, -650], neck: [0, -600], chest: [0, -520], heart: [-28, -520],
  stomach: [12, -455], belly: [0, -410], hips: [0, -375], handL: [-132, -362], handR: [132, -362], bubble: [150, -880],
};
export const ANCHORS = {
  ...Object.fromEntries(Object.entries(BODY_ANCHORS).map(([k, [x, y]]) => [k, [x, y - LEGS]])),
  knees: [0, -160], feet: [0, 0],
};

const SH = { l: [-106, -566], r: [106, -566] }, L1 = 108, L2 = 102;
const LW = 3.4;

// ---------- small drawing helpers (model space) ----------
const P = PALETTE;
function poly(pts, fill, stroke = P.line, lw = LW) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.stroke(); }
}
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
function heartShape(x, y, r, fill, line) {
  ctx.beginPath(); ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.8, y - r * 1.25, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.8, y - r * 1.25, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
  ctx.fillStyle = fill; ctx.fill(); if (line) { ctx.lineWidth = LW * 0.8; ctx.strokeStyle = line; ctx.stroke(); }
}
function starShape(x, y, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, rr = i % 2 ? r * 0.38 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}

/** 2-bone IK: shoulder → hand target; the elbow bends outward (away from the body) */
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
  const model = (h) => h && [h[0], h[1] + LEGS];                       // o.hands are in model space, like ANCHORS
  const hands = { l: model(o.hands?.l) || mix('l'), r: model(o.hands?.r) || mix('r') };
  if (to.wave && k > 0.6) { const w = Math.sin((o.t || 0) * 11) * 28; hands[to.wave][0] += w; }
  return { hands, pose: to, k };
}

// ---------- body parts ----------
function backHair(sway) {
  for (const side of [-1, 1]) {
    const sx = sway * side, m = (x, y) => [x * side, y];
    poly([m(-96, -812), m(-162, -780), m(-190, -660), m(-198 + sx, -470), m(-206 + sx, -318), m(-186 + sx, -340), m(-174 + sx, -298), m(-156 + sx, -336),
      m(-140 + sx, -302), m(-126 + sx, -340), m(-112 + sx, -318), m(-108, -400), m(-114, -540), m(-104, -650), m(-92, -720)], P.hair, P.hairLine);
    stroke([m(-166, -700), m(-176 + sx, -470), m(-176 + sx, -350)], P.hairShade, 3);
    stroke([m(-140, -690), m(-146 + sx, -480), m(-140 + sx, -360)], P.hairShade, 2.5);
  }
  ellipse(0, -772, 142, 128, P.hair, P.hairLine);
}

function legs(of, xray) {
  const top = -270 - LEGS;
  for (const side of [-1, 1]) {
    const x = 38 * side;
    if (of.long && !xray) { poly([[x - 19, top], [x + 19, top], [x + 17, -40], [x - 17, -40]], of.bottom, of.bottomLine); continue; }
    poly([[x - 15, top], [x + 15, top], [x + 14, -40], [x - 14, -40]], xray ? P.xBody : P.skin, xray ? P.xLine : P.line);
    if (!xray) poly([[x - 15.5, -128], [x + 15.5, -128], [x + 15, -36], [x - 15, -36]], of.sock, P.line);
  }
  for (const side of [-1, 1]) {
    const x = 42 * side;
    ellipse(x, -20, 40, 21, xray ? P.xBody : of.shoe, xray ? P.xLine : P.line);
    if (!xray) ellipse(x - 10 * side, -27, 13, 5, 'rgba(255,255,255,0.35)');
  }
}

function skirt(of, xray) {
  const fill = xray ? P.xBody : of.bottom, line = xray ? P.xLine : of.bottomLine;
  if (of.long && !xray) { poly([[-114, -385], [114, -385], [118, -262], [-118, -262]], fill, line); return; }
  poly([[-114, -385], [114, -385], [142, -262], [-142, -262]], fill, line);
  if (!xray && of.pleats) {
    for (let i = -3; i <= 3; i++) stroke([[i * 30, -380], [i * 37, -265]], of.bottomShade, 3);
    stroke([[-140, -270], [140, -270]], of.bottomShade, 5, 'butt');
  }
}

function torso(of, xray) {
  const fill = xray ? P.xBody : of.top, line = xray ? P.xLine : of.topLine;
  poly([[-26, -604], [26, -604], [24, -575], [-24, -575]], xray ? P.xBody : P.skin, xray ? P.xLine : P.line);
  if (!xray) poly([[-24, -592], [24, -592], [0, -578]], P.skinShade, null);
  ctx.beginPath();
  ctx.moveTo(-96, -586); ctx.quadraticCurveTo(-126, -580, -124, -548); ctx.lineTo(-122, -392); ctx.quadraticCurveTo(-122, -374, -102, -374);
  ctx.lineTo(102, -374); ctx.quadraticCurveTo(122, -374, 122, -392); ctx.lineTo(124, -548); ctx.quadraticCurveTo(126, -580, 96, -586); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = line; ctx.lineJoin = 'round'; ctx.stroke();
  if (xray) return;
  stroke([[-118, -400], [118, -400]], of.topShade, 5, 'butt');
  if (of.dots) for (const [x, y] of [[-70, -520], [60, -470], [-40, -430], [85, -540], [10, -505], [-90, -455]]) starShape(x, y, 9, of.dots);
  if (of.collar === 'sailor') {
    poly([[-46, -590], [46, -590], [0, -512]], of.shirt, null);
    for (const side of [-1, 1]) {
      stroke([[64 * side, -588], [0, -508]], of.collarColor, 11);
      stroke([[54 * side, -588], [0, -523]], P.white, 3);
    }
  } else if (of.collar === 'hood') {
    ctx.beginPath(); ctx.ellipse(0, -588, 70, 22, 0, 0, Math.PI); ctx.fillStyle = of.collarColor; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = of.topLine; ctx.stroke();
    for (const side of [-1, 1]) stroke([[18 * side, -572], [22 * side, -505]], of.topLine, 3);
    poly([[-60, -450], [60, -450], [52, -395], [-52, -395]], of.topShade, of.topLine);
  } else {
    ctx.beginPath(); ctx.ellipse(0, -588, 36, 16, 0, 0, Math.PI); ctx.fillStyle = of.collarColor; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = of.topLine; ctx.stroke();
  }
  if (of.buttons) for (const y of (of.collar === 'sailor' ? [-470, -430] : [-540, -490, -440])) ellipse(of.collar === 'sailor' ? 0 : 0, y, 4.5, 4.5, of.topLine);
}

function arm(a, of, xray, point) {
  const fill = xray ? P.xBody : of.top, line = xray ? P.xLine : of.topLine;
  stroke([a.sh, a.elbow, a.hand], line, 46);
  stroke([a.sh, a.elbow, a.hand], fill, 46 - LW * 2);
  const dx = a.hand[0] - a.elbow[0], dy = a.hand[1] - a.elbow[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  const cuff = [a.hand[0] - ux * 12, a.hand[1] - uy * 12];
  if (!xray) stroke([[cuff[0] - uy * 21, cuff[1] + ux * 21], [cuff[0] + uy * 21, cuff[1] - ux * 21]], of.topShade, 6, 'butt');
  ellipse(a.hand[0] + ux * 6, a.hand[1] + uy * 6, 17, 17, xray ? P.xBody : P.skin, xray ? P.xLine : P.line);
  if (point) stroke([[a.hand[0] + ux * 14, a.hand[1] + uy * 14], [a.hand[0] + ux * 38, a.hand[1] + uy * 38]], xray ? P.xLine : P.line, 13),
    stroke([[a.hand[0] + ux * 14, a.hand[1] + uy * 14], [a.hand[0] + ux * 37, a.hand[1] + uy * 37]], xray ? P.xBody : P.skin, 7);
}

function face(o, ex, t) {
  // face: soft cheeks, small pointed chin (top is hidden under the bangs)
  ctx.beginPath(); ctx.moveTo(-97, -800); ctx.lineTo(-99, -716); ctx.quadraticCurveTo(-92, -660, -48, -630); ctx.quadraticCurveTo(-12, -612, 0, -611);
  ctx.quadraticCurveTo(12, -612, 48, -630); ctx.quadraticCurveTo(92, -660, 99, -716); ctx.lineTo(97, -800); ctx.closePath();
  ctx.fillStyle = P.skin; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = P.line; ctx.stroke();
  const b = o.blush ?? ex.blush ?? 0.5;
  if (b > 0) { ctx.globalAlpha *= 0.55 * b + 0.15; for (const s of [-1, 1]) ellipse(66 * s, -672, 24, 12, P.blush); ctx.globalAlpha = o.alpha ?? 1; }
  if ((ex.extras || []).includes('blushLines')) for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) stroke([[66 * s + i * 11 - 4, -665], [66 * s + i * 11 + 4, -679]], P.mouth, 2.2);
  stroke([[0, -684], [-2, -679]], P.skinShade, 3);
  eyes(o, ex, t); brows(ex); mouth(o, ex, t);
}

function blinkAmount(o, t) {
  if (o.blink === false) return 0;
  const period = 3.7, ph = ((t + 1.3) % period + period) % period;
  return ph < 0.14 ? Math.sin(ph / 0.14 * Math.PI) : 0;
}

function eyes(o, ex, t) {
  const [lx, ly] = o.look || [0, 0], close = blinkAmount(o, t);
  for (const side of [-1, 1]) {
    const x = 50 * side, y = -716;
    let kind = ex.eyes;
    if (kind === 'wink') kind = side === 1 ? 'happy' : 'open';
    if (close > 0.65 && ['open', 'wide', 'sad', 'aside', 'heart', 'star'].includes(kind)) kind = 'closed';
    if (kind === 'happy') { curve([x - 26, y + 6], [x, y - 22], [x + 26, y + 6], P.lash, 6); continue; }
    if (kind === 'closed') { curve([x - 26, y + 2], [x, y + 14], [x + 26, y + 2], P.lash, 5.5); stroke([[x + 25 * side, y + 2], [x + 33 * side, y - 4]], P.lash, 4); continue; }
    const wide = kind === 'wide', sq = 1 - close * 0.6;
    const ry = (wide ? 39 : 36) * sq, rx = wide ? 33 : 31;
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fillStyle = P.white; ctx.fill(); ctx.clip();
    const ix = x + lx * 9 + (kind === 'aside' ? -12 : 0), iy = y + 4 + ly * 7 + (kind === 'aside' ? 6 : 0);
    if (kind === 'heart') { heartShape(ix, iy + 2, 26, P.heart); heartShape(ix - 7, iy - 6, 6, 'rgba(255,255,255,0.9)'); }
    else if (kind === 'star') { ellipse(ix, iy, 24, 30, P.iris); starShape(ix, iy, 19, P.star); }
    else {
      const ir = ex.small ? 0.55 : 1, g = ctx.createLinearGradient(0, iy - 30, 0, iy + 30);
      g.addColorStop(0, P.irisDark); g.addColorStop(0.55, P.iris); g.addColorStop(1, P.irisLight);
      ellipse(ix, iy, 26 * ir, 33 * ir, g);
      ellipse(ix, iy + 2, 13 * ir, 18 * ir, P.irisDark);
      ellipse(ix + 9 * ir, iy - 13 * ir, 8.5 * ir, 9.5 * ir, P.white);
      ellipse(ix - 8 * ir, iy + 13 * ir, 3.5 * ir, 3.5 * ir, P.white);
    }
    ctx.restore();
    // lashes: thick upper line with an outer flick, thin lower line
    const top = y - ry * 0.92;
    ctx.beginPath(); ctx.moveTo(x - rx * side - 2 * side, y - 4); ctx.quadraticCurveTo(x - 4 * side, top - 10, x + (rx + 6) * side, y - 10);
    ctx.lineWidth = kind === 'sad' ? 5 : 7; ctx.strokeStyle = P.lash; ctx.lineCap = 'round'; ctx.stroke();
    stroke([[x + (rx + 4) * side, y - 10], [x + (rx + 12) * side, y - 18]], P.lash, 4.5);
    curve([x - 12 * side, y + ry * 0.98], [x + 2 * side, y + ry + 2], [x + 14 * side, y + ry * 0.92], P.lash, 2.4);
    if (kind === 'sad') stroke([[x - 20 * side, y - ry - 4], [x + 18 * side, y - ry - 12]], P.lash, 3);
  }
}

function brows(ex) {
  const a = (ex.brows || 0) * Math.PI / 180;
  for (const side of [-1, 1]) {
    const cx = 52 * side, cy = -768 - (ex.eyes === 'wide' ? 8 : 0), half = 22;
    // + = angry: the inner end (toward the nose) goes down
    const ix = cx - half * side, iy = cy + Math.sin(a) * half, ox = cx + half * side, oy = cy - Math.sin(a) * half;
    curve([ix, iy], [cx, cy - 6], [ox, oy], P.lash, 4.2);
  }
}

function mouth(o, ex, t) {
  let m = ex.mouth;
  const talk = o.talk ? (0.5 + 0.5 * Math.sin((t || 0) * 22)) * o.talk : 0;
  if (talk > 0.35 && (m === 'smile' || m === 'flat' || m === 'cat')) m = 'open';
  const y = -648;
  if (m === 'smile') curve([-11, y - 2], [0, y + 7], [11, y - 2], P.mouth, 3.2);
  else if (m === 'flat') stroke([[-9, y], [9, y]], P.mouth, 3);
  else if (m === 'frown') curve([-11, y + 4], [0, y - 5], [11, y + 4], P.mouth, 3.2);
  else if (m === 'cat') { curve([-14, y - 3], [-7, y + 6], [0, y - 1], P.mouth, 3); curve([0, y - 1], [7, y + 6], [14, y - 3], P.mouth, 3); }
  else if (m === 'wavy') { ctx.beginPath(); ctx.moveTo(-12, y); for (let i = 1; i <= 6; i++) ctx.lineTo(-12 + i * 4, y + (i % 2 ? -3 : 3)); ctx.lineWidth = 2.6; ctx.strokeStyle = P.mouth; ctx.stroke(); }
  else if (m === 'o') ellipse(0, y, 7, 9 + talk * 3, P.mouth, P.line, 2.2);
  else {
    const w = m === 'grin' ? 18 : m === 'shout' ? 15 : 13, h = (m === 'shout' ? 18 : m === 'grin' ? 13 : 11) * (1 - talk * 0.35 + (m === 'open' ? talk * 0.2 : 0));
    ctx.beginPath(); ctx.moveTo(-w, y - 3); ctx.quadraticCurveTo(0, y + h * 1.9, w, y - 3); ctx.quadraticCurveTo(0, y + 1, -w, y - 3);
    if (m === 'shout') { ctx.closePath(); ctx.beginPath(); ctx.ellipse(0, y + 3, w, h * 0.8, 0, 0, TAU); }
    ctx.fillStyle = P.mouth; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = P.line; ctx.stroke();
    ctx.save(); ctx.clip(); ellipse(0, y + h * (m === 'shout' ? 0.9 : 1.15), w * 0.7, h * 0.55, P.tongue); ctx.restore();
  }
}

function frontHair(sway) {
  // side locks framing the face, in front of the cheeks and shoulders
  for (const side of [-1, 1]) {
    const m = (x, y) => [x * side, y], sx = sway * side * 0.6;
    poly([m(-84, -820), m(-112, -790), m(-120, -700), m(-122 + sx, -600), m(-114 + sx, -545), m(-106 + sx, -585), m(-100 + sx, -560), m(-96, -640), m(-90, -720), m(-74, -790)], P.hair, P.hairLine);
    stroke([m(-104, -760), m(-110 + sx, -600)], P.hairShade, 2.5);
  }
  // bangs: hair top + a spiky fringe over the forehead
  const tips = [[104, -742], [88, -768], [72, -738], [56, -790], [38, -748], [20, -786], [4, -752], [-14, -790], [-32, -746], [-50, -786], [-68, -740], [-84, -772], [-104, -744]];
  ctx.beginPath(); ctx.moveTo(-112, -792);
  ctx.bezierCurveTo(-126, -888, -44, -906, 0, -904); ctx.bezierCurveTo(44, -906, 126, -888, 112, -792);
  ctx.lineTo(tips[0][0], tips[0][1]); for (const [x, y] of tips.slice(1)) ctx.lineTo(x, y); ctx.closePath();
  ctx.fillStyle = P.hair; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = P.hairLine; ctx.lineJoin = 'round'; ctx.stroke();
  for (const [a, b] of [[[-60, -860], [-50, -790]], [[-20, -870], [-16, -792]], [[24, -868], [20, -790]], [[64, -858], [56, -792]]]) stroke([a, b], P.hairShade, 2.4);
  // the lighter hairband stripe across the crown
  ctx.beginPath(); ctx.moveTo(-104, -826); ctx.quadraticCurveTo(0, -884, 104, -826); ctx.lineWidth = 9; ctx.strokeStyle = P.hairLight; ctx.lineCap = 'round'; ctx.stroke();
  // ahoge: one curled strand on top
  ctx.beginPath(); ctx.moveTo(4, -896); ctx.bezierCurveTo(4, -930, 36, -948, 50, -926); ctx.bezierCurveTo(38, -936, 20, -926, 18, -896);
  ctx.closePath(); ctx.fillStyle = P.hair; ctx.fill(); ctx.lineWidth = LW * 0.9; ctx.strokeStyle = P.hairLine; ctx.stroke();
}

function bow() {
  ctx.save(); ctx.translate(98, -838); ctx.rotate(0.28);
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(16 * s, -26, 38 * s, -18, 34 * s, 0); ctx.bezierCurveTo(38 * s, 18, 16 * s, 24, 0, 0);
    ctx.fillStyle = P.bow; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = P.bowDark; ctx.stroke();
    stroke([[4 * s, 2], [12 * s, 30]], P.bow, 8); stroke([[4 * s, 2], [12 * s, 30]], P.bowDark, 2);
  }
  ellipse(0, 0, 8, 9, P.bow, P.bowDark, 3);
  ctx.restore();
}

function extras(o, ex, t) {
  const list = o.extras === false ? [] : ex.extras || [];
  const bob = (k) => Math.sin((t || 0) * 3 + k) * 6;
  if (list.includes('hearts')) for (const [x, y, r, k] of [[-150, -920, 13, 0], [150, -950, 10, 1.4], [-110, -980, 9, 2.2], [175, -880, 8, 3.1]]) heartShape(x, y + bob(k), r, P.heart);
  if (list.includes('sparkles')) for (const [x, y, r, k] of [[-125, -800, 10, 0.5], [128, -770, 8, 1.7], [-60, -880, 7, 2.9]]) starShape(x, y + bob(k) * 0.5, r * (0.8 + 0.2 * Math.sin((t || 0) * 6 + k)), P.white);
  if (list.includes('sweat')) { ctx.beginPath(); ctx.moveTo(118, -800); ctx.quadraticCurveTo(132, -770, 118, -762); ctx.quadraticCurveTo(104, -770, 118, -800); ctx.fillStyle = P.sweat; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#5FA8D8'; ctx.stroke(); }
  if (list.includes('tear')) ellipse(-48, -676 + ((t || 0) * 30 % 30), 5, 8, P.sweat);
  if (list.includes('anger')) { ctx.save(); ctx.translate(-118, -860); for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); curve([6, 4], [10, 10], [4, 16], P.anger, 5); } ctx.restore(); }
  if (list.includes('zzz')) { ctx.font = '800 34px Inter'; ctx.fillStyle = '#7A62B8'; ctx.fillText('z', 130, -860 + bob(0)); ctx.font = '800 24px Inter'; ctx.fillText('z', 160, -900 + bob(1)); }
}

function drawProp(prop, hands) {
  if (typeof prop === 'function') return prop(ctx, hands);
  const cx = (hands.l[0] + hands.r[0]) / 2, cy = (hands.l[1] + hands.r[1]) / 2;
  if (prop === 'books') {
    poly([[cx - 92, cy - 34], [cx + 92, cy - 34], [cx + 92, cy - 2], [cx - 92, cy - 2]], '#B9A6F2', '#5F4BA3');
    poly([[cx - 88, cy - 2], [cx + 88, cy - 2], [cx + 88, cy + 32], [cx - 88, cy + 32]], '#F48FB1', '#A8456D');
    stroke([[cx + 70, cy - 28], [cx + 70, cy - 8]], '#FFFFFF', 4); stroke([[cx + 66, cy + 4], [cx + 66, cy + 26]], '#FFFFFF', 4);
    for (const h of [hands.l, hands.r]) ellipse(h[0], h[1], 16, 16, P.skin, P.line);
  } else if (prop === 'heart') heartShape(cx, cy - 10, 34, P.heart, P.mouth);
  else if (prop === 'phone') { ctx.save(); ctx.translate(hands.r[0], hands.r[1] - 30); ctx.rotate(-0.15); poly([[-17, -32], [17, -32], [17, 32], [-17, 32]], '#2B2D42', P.lash); poly([[-13, -26], [13, -26], [13, 24], [-13, 24]], '#BFE6FF', null); ctx.restore(); ellipse(hands.r[0], hands.r[1], 16, 16, P.skin, P.line); }
}

function defaultInside() {
  // the x-ray look from the channel's videos: little red blood dots along the body
  const dots = [[-60, -615], [-30, -575], [55, -620], [70, -545], [-75, -505], [-20, -495], [40, -485], [-50, -405], [50, -395], [-95, -595], [95, -575], [0, -635],
    [-38, -300], [-38, -230], [-38, -160], [-38, -90], [38, -310], [38, -240], [38, -170], [38, -100]];
  for (const [x, y] of dots) ellipse(x, y, 6, 6, P.xDot);
}

/** model-space point → screen point, for a given draw() call's options */
export function anchor(o, name) {
  const [mx, my] = Array.isArray(name) ? name : ANCHORS[name] || ANCHORS.head, s = o.s ?? 1, f = o.flip ?? 1;
  return [(o.x ?? 540) + mx * s * f, (o.y ?? 1600) + my * s];
}

export function draw(o = {}) {
  const t = o.t ?? 0, s = o.s ?? 1, of = OUTFITS[o.outfit] || OUTFITS.uniform, ex = EXPRESSIONS[o.expression] || EXPRESSIONS.neutral;
  const xray = !!o.xray, { hands, pose, k } = resolveHands(o), sway = Math.sin(t * 1.6) * 4;
  ctx.save();
  ctx.translate(o.x ?? 540, o.y ?? 1600); ctx.scale(s * (o.flip ?? 1), s);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  if (o.shadow !== false) ellipse(0, -6, 125, 18, P.shadow);
  const breathe = Math.sin(t * 2.2) * 1.5;
  ctx.translate(0, -LEGS);
  backHair(sway);
  ctx.save(); ctx.translate(0, LEGS); legs(of, xray); ctx.restore();
  skirt(of, xray);
  ctx.translate(0, breathe);
  torso(of, xray);
  const arms = { l: solveArm(SH.l, hands.l, -1, pose.elbowsOut), r: solveArm(SH.r, hands.r, 1, pose.elbowsOut) };
  if (xray) { ctx.save(); ctx.translate(0, LEGS - breathe); (o.inside || defaultInside)(ctx, ANCHORS); ctx.restore(); }
  face(o, ex, t);
  frontHair(sway);
  bow();
  arm(arms.l, of, xray, pose.point === 'l' && k > 0.6);
  arm(arms.r, of, xray, pose.point === 'r' && k > 0.6);
  const prop = o.prop ?? (k > 0.6 ? pose.prop : null);
  if (prop) drawProp(prop, { l: arms.l.hand, r: arms.r.hand });
  extras(o, ex, t);
  ctx.restore();
}

export default { id: 'sakumai', HEIGHT, PALETTE, OUTFITS, EXPRESSIONS, POSES, ANCHORS, draw, anchor, solveArm };
