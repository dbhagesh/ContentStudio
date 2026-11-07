// THE ARCHIVIST: host of The Strange File. The ONLY code that draws him: every video imports this through the cast
// (cast('the-archivist').draw({...})), so he looks the same everywhere. Read CHARACTER.md before changing anything,
// and bump "version" in character.json when the look changes.
//
// The look in one line: a tall, lamp-lit silhouette in a long greatcoat with an upturned collar, a wide flat-brimmed
// hat, two round spectacles that catch the light (his only "face"), and a brass lantern with a red file tag.
//
// Model space: origin between his boots, y up is negative, ~1000 units tall at s = 1 (hat crown at y -995).
//   draw({ x, y, s, flip, t, pose, poseFrom, poseK, expression, outfit, look, blink, talk, glow, lantern, xray,
//          shadow, extras, alpha })
//   x, y      screen position of his boots       s     scale (1 ≈ 1000 px tall)     flip  -1 mirrors him
//   pose      a POSES key; poseFrom + poseK (0..1) blends from another pose (hands move, the lantern follows)
//   expression an EXPRESSIONS key (spectacle glints, head tilt, hat dip, a lamp-lit mouth line)
//   outfit    an OUTFITS key                      t     film time (lantern flicker and swing, breathing, glint blinks)
//   look      [dx, dy] -1..1 moves the glints    blink true (default) = the glints flicker off now and then
//   talk      0..1 mouth movement                 glow  0..1 lantern brightness (0 = unlit; default 1)
//   lantern   false = no lantern                  xray  true = SILHOUETTE mode: pure black cut-out, only the glints
//             and the lantern are lit (a figure in a doorway). (The studio's model sheet calls this flag "x-ray".)
//   extras    false hides expression extras (the "?" of intrigued, dust of surprised)    shadow false hides the floor shadow
import { ctx, clamp, lerp, TAU } from '/src/core/lib.js';

export const HEIGHT = 1000;

export const PALETTE = {
  line: '#0A0A0D', coat: '#1F2129', coatShade: '#15161B', coatLining: '#3A1F1D', hat: '#18191E', hatBand: '#6E2622',
  face: '#211B19', faceLit: '#7A5236', brass: '#B8904F', brassDark: '#7C5E30', glint: '#FFE9B8', lens: '#0E0E12',
  glove: '#2B221C', boot: '#121215', trousers: '#191A20', lanternMetal: '#2C2721', glass: '#F0A640', flame: '#FFC764',
  flameCore: '#FFF4D2', amber: '#E8A33D', tag: '#B3261E', paper: '#C9A86A', paperDark: '#A88848', ink: '#1C1A17',
  scarf: '#4E525C', shadow: 'rgba(0,0,0,0.45)',
};

/** outfits are data: the same silhouette, different cloth */
export const OUTFITS = {
  archive: { coat: '#1F2129', coatShade: '#15161B', lining: '#3A1F1D', hat: '#18191E', band: '#6E2622', scarf: null, buttons: '#B8904F' },
  field: { coat: '#23271F', coatShade: '#191C16', lining: '#2E2A1C', hat: '#1C1E18', band: '#4A3A22', scarf: null, buttons: '#7C5E30', cape: true },
  winter: { coat: '#1C1F27', coatShade: '#13151B', lining: '#3A1F1D', hat: '#17181D', band: '#6E2622', scarf: '#4E525C', buttons: '#B8904F' },
};

/** glints: round | narrow | wide | dim | one · tilt: head tilt (rad) · dip: hat brim lowered (units) ·
 *  mouth: none | line | smile | wry | o | frown · extras: list */
export const EXPRESSIONS = {
  neutral: { glints: 'round', tilt: 0, dip: 0, mouth: 'line' },
  intrigued: { glints: 'one', tilt: 0.12, dip: -4, mouth: 'line', extras: ['question'] },
  knowing: { glints: 'narrow', tilt: -0.05, dip: 8, mouth: 'wry' },
  surprised: { glints: 'wide', tilt: 0, dip: -16, mouth: 'o', extras: ['dust'] },
  grave: { glints: 'dim', tilt: 0, dip: 16, mouth: 'frown' },
  wry: { glints: 'round', tilt: -0.1, dip: 4, mouth: 'smile' },
  hushed: { glints: 'narrow', tilt: 0.06, dip: 10, mouth: 'none' },
};

/** poses are hand targets in model space (l = viewer's left, r = viewer's right); the arms solve themselves.
 *  The lantern always hangs from the RIGHT hand; "prop" is what the left hand holds. */
export const POSES = {
  stand: { l: [-165, -440], r: [172, -440] },
  present: { l: [-200, -590], r: [175, -600], open: 'l' },
  raise: { l: [-165, -440], r: [190, -930] },
  file: { l: [-40, -560], r: [172, -440], prop: 'file' },
  point: { l: [-300, -700], r: [172, -440], point: 'l' },
  hush: { l: [-6, -800], r: [172, -440], finger: 'l' },
  tip: { l: [-128, -900], r: [172, -440], tip: true },
};

/** named points in model space (head-relative points are for the default stand pose) */
export const ANCHORS = {
  top: [0, -995], hat: [0, -930], head: [0, -835], face: [0, -828], mouth: [0, -792], neck: [0, -760], chest: [0, -640],
  belt: [0, -500], knees: [0, -230], feet: [0, 0], handL: [-165, -440], handR: [172, -440], lantern: [172, -348],
  bubble: [190, -1000],
};

const SH = { l: [-108, -718], r: [108, -718] }, L1 = 150, L2 = 142, LW = 4;
const P = PALETTE;

// ---------- helpers (model space) ----------
function path(pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
function fillStroke(fill, line, lw = LW) { if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (line) { ctx.lineWidth = lw; ctx.strokeStyle = line; ctx.lineJoin = 'round'; ctx.stroke(); } }
function ell(x, y, rx, ry, fill, line, lw = LW, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); fillStroke(fill, line, lw); }
function seg2(a, b, w, fill, line) {
  ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
  if (line) { ctx.strokeStyle = line; ctx.lineWidth = w + LW * 2; ctx.stroke(); }
  ctx.strokeStyle = fill; ctx.lineWidth = w; ctx.stroke();
}
const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
/** small deterministic flicker, a pure function of t */
const flick = (t) => 0.88 + 0.07 * Math.sin(t * 11.3) + 0.05 * Math.sin(t * 23.7 + 1.3);

/** 2-bone IK: shoulder → hand target; the elbow bends outward */
export function solveArm(sh, target, side) {
  let dx = target[0] - sh[0], dy = target[1] - sh[1], d = Math.hypot(dx, dy);
  const max = L1 + L2 - 0.5; if (d > max) { dx *= max / d; dy *= max / d; d = max; }
  const hand = [sh[0] + dx, sh[1] + dy];
  const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * Math.max(d, 1e-3)), -1, 1)), base = Math.atan2(dy, dx);
  const e1 = [sh[0] + Math.cos(base + a) * L1, sh[1] + Math.sin(base + a) * L1], e2 = [sh[0] + Math.cos(base - a) * L1, sh[1] + Math.sin(base - a) * L1];
  // hanging arms bend outward; raised arms pick the lower elbow, so raised arms never wing upward
  const lower = (dy > 150 || Math.abs(e1[1] - e2[1]) < 6) ? (e1[0] * side > e2[0] * side ? e1 : e2) : (e1[1] > e2[1] ? e1 : e2);
  return { sh, elbow: lower, hand };
}

function resolve(o) {
  const to = POSES[o.pose] || POSES.stand, from = POSES[o.poseFrom] || to, k = o.poseFrom ? clamp(o.poseK ?? 1) : 1;
  return { pose: k > 0.5 ? to : from, k, hands: { l: mix(from.l, to.l, k), r: mix(from.r, to.r, k) } };
}

/** where the lantern hangs (its glass centre) for a hand position, swinging gently with t */
function lanternPoint(hand, t) { const sw = Math.sin(t * 1.3) * 0.05; return [hand[0] + Math.sin(sw) * 92, hand[1] + Math.cos(sw) * 92]; }

// ---------- the parts ----------
function coatPath(of) {
  // long greatcoat: shoulders → flared hem, slight asymmetry so it reads as cloth
  ctx.beginPath();
  ctx.moveTo(-60, -770); ctx.lineTo(-118, -738);
  ctx.quadraticCurveTo(-138, -700, -132, -560);
  ctx.lineTo(-150, -300); ctx.lineTo(-178, -132);
  ctx.quadraticCurveTo(-90, -118, 0, -124); ctx.quadraticCurveTo(90, -118, 180, -134);
  ctx.lineTo(150, -300); ctx.lineTo(132, -560);
  ctx.quadraticCurveTo(138, -700, 118, -738); ctx.lineTo(60, -770); ctx.closePath();
}

function lightOn(clipPath, lp, r, a) {
  // warm lantern light falling on a shape (clip to it, radial amber)
  if (a <= 0) return;
  ctx.save(); clipPath(); ctx.clip();
  const g = ctx.createRadialGradient(lp[0], lp[1], 10, lp[0], lp[1], r);
  g.addColorStop(0, `rgba(232,163,61,${0.42 * a})`); g.addColorStop(0.4, `rgba(200,120,50,${0.14 * a})`); g.addColorStop(1, 'rgba(200,120,50,0)');
  ctx.fillStyle = g; ctx.fillRect(-400, -1200, 800, 1300); ctx.restore();
}

function boots(sil) {
  for (const k of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(k * 18, -150); ctx.lineTo(k * 62, -150); ctx.lineTo(k * 60, -40); ctx.lineTo(k * 16, -40); ctx.closePath(); fillStroke(sil ? P.line : P.trousers, P.line);
    ctx.beginPath(); ctx.moveTo(k * 14, -62); ctx.lineTo(k * 64, -62); ctx.quadraticCurveTo(k * 96, -36, k * 92, -4); ctx.lineTo(k * 12, -4); ctx.closePath(); fillStroke(sil ? P.line : P.boot, P.line);
  }
}

function coat(of, sil, lp, glow) {
  const c = sil ? P.line : of.coat, cs = sil ? P.line : of.coatShade;
  coatPath(of); fillStroke(c, P.line, LW + 1);
  if (!sil) {
    // front opening below the belt, the lining showing
    path([[-6, -480], [8, -480], [34, -128], [-40, -126]]); fillStroke(of.lining, P.line, 3);
    // folds and shade
    ctx.strokeStyle = cs; ctx.lineWidth = 10; ctx.lineCap = 'round';
    for (const [a, b] of [[[-80, -440], [-110, -150]], [[84, -430], [118, -150]], [[-40, -300], [-60, -140]]]) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    // belt + buckle
    path([[-136, -512], [136, -512], [138, -482], [-138, -482]]); fillStroke(cs, P.line, 3);
    ctx.beginPath(); ctx.rect(-16, -516, 32, 38); fillStroke(null, of.buttons, 5);
    // double-breasted buttons
    for (const y of [-690, -630, -570]) for (const x of [-42, 42]) ell(x, y, 7, 7, of.buttons, P.line, 2);
    if (of.cape) { // shoulder cape (field coat)
      ctx.beginPath(); ctx.moveTo(-122, -740); ctx.quadraticCurveTo(-170, -640, -150, -585); ctx.quadraticCurveTo(0, -560, 150, -585); ctx.quadraticCurveTo(170, -640, 122, -740); ctx.closePath(); fillStroke(cs, P.line, 3);
    }
  }
  lightOn(() => coatPath(of), lp, 430, glow * (sil ? 0.25 : 1));
  // upturned collar: two tall points framing the face
  for (const k of [-1, 1]) { path([[k * 18, -742], [k * 92, -760], [k * 104, -832], [k * 58, -790]]); fillStroke(sil ? P.line : cs, P.line, 3); }
  if (of.scarf && !sil) { ctx.beginPath(); ctx.ellipse(0, -748, 70, 24, 0, 0, TAU); fillStroke(of.scarf, P.line, 3); path([[20, -740], [52, -740], [60, -600], [30, -604]]); fillStroke(of.scarf, P.line, 3); }
}

function head(of, ex, sil, lp, glow, o, t) {
  ctx.save(); ctx.translate(0, -770); ctx.rotate(ex.tilt || 0); ctx.translate(0, 770);
  // face: an oval in shadow, the lantern catches the chin when it is raised
  ell(0, -826, 50, 62, sil ? P.line : P.face, P.line, 3);
  if (!sil) lightOn(() => { ctx.beginPath(); ctx.ellipse(0, -826, 50, 62, 0, 0, TAU); }, lp, 360, glow * 0.9);
  // spectacles: the only lit features
  const g = ex.glints, look = o.look || [0, 0], bl = o.blink !== false && (t % 4.7) < 0.11;
  for (const k of [-1, 1]) {
    const cx = k * 23, cy = -826, r = g === 'wide' ? 17 : 15;
    ell(cx, cy, r, r, P.lens, sil ? '#3A3226' : P.brass, 3);
    if (bl || (g === 'one' && k < 0)) continue;
    const a = (g === 'dim' ? 0.35 : 1) * clamp(0.55 + 0.45 * glow), gx = cx + look[0] * 5 - 3, gy = cy + look[1] * 4 - 4;
    ctx.globalAlpha *= a;
    if (g === 'narrow') ell(gx + 3, gy + 5, 10, 2.6, P.glint);
    else ell(gx, gy, g === 'wide' ? 8 : 6, g === 'wide' ? 8 : 5, P.glint);
    if (g !== 'narrow') ell(gx + 7, gy + 8, 2.2, 2.2, P.glint);
    ctx.globalAlpha /= a;
  }
  ctx.beginPath(); ctx.moveTo(-8, -828); ctx.quadraticCurveTo(0, -834, 8, -828); ctx.strokeStyle = sil ? '#3A3226' : P.brass; ctx.lineWidth = 3; ctx.stroke();
  // mouth: a thin lamp-lit line
  if (!sil && ex.mouth !== 'none') {
    const m = ex.mouth, tk = (o.talk || 0) * (0.5 + 0.5 * Math.sin(t * 17)), my = -790;
    ctx.strokeStyle = P.faceLit; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath();
    if (m === 'o' || tk > 0.15) ell(0, my, 7, 5 + tk * 6, P.line, P.faceLit, 2.5);
    else {
      if (m === 'line') { ctx.moveTo(-14, my); ctx.lineTo(14, my); }
      if (m === 'smile') { ctx.moveTo(-15, my - 3); ctx.quadraticCurveTo(0, my + 7, 15, my - 3); }
      if (m === 'wry') { ctx.moveTo(-13, my + 1); ctx.quadraticCurveTo(4, my + 3, 16, my - 5); }
      if (m === 'frown') { ctx.moveTo(-14, my + 3); ctx.quadraticCurveTo(0, my - 4, 14, my + 3); }
      ctx.stroke();
    }
  }
  // hat: wide flat brim + low rounded crown with a pinched top and an oxblood band
  const dip = ex.dip || 0;
  ctx.save(); ctx.translate(0, dip);
  ctx.beginPath(); ctx.moveTo(-70, -868); ctx.lineTo(-74, -955); ctx.quadraticCurveTo(-60, -996, -18, -984); ctx.quadraticCurveTo(0, -972, 18, -984);
  ctx.quadraticCurveTo(60, -996, 74, -955); ctx.lineTo(70, -868); ctx.closePath(); fillStroke(sil ? P.line : of.hat, P.line, LW);
  if (!sil) { ctx.beginPath(); ctx.rect(-73, -900, 146, 22); fillStroke(of.band, P.line, 3); }
  ell(0, -868, 168, 24, sil ? P.line : of.hat, P.line, LW);
  if (!sil) { ctx.beginPath(); ctx.ellipse(0, -864, 160, 16, 0, 0.15, Math.PI - 0.15); ctx.strokeStyle = 'rgba(232,163,61,0.22)'; ctx.lineWidth = 3; ctx.stroke(); }
  ctx.restore();
  ctx.restore();
}

function arm(a, of, sil, side, pose, k) {
  const c = sil ? P.line : of.coat;
  seg2(a.sh, a.elbow, 52, c, P.line); seg2(a.elbow, a.hand, 44, c, P.line);
  // cuff
  const dx = a.hand[0] - a.elbow[0], dy = a.hand[1] - a.elbow[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  const cuff = [a.hand[0] - ux * 26, a.hand[1] - uy * 26];
  seg2([cuff[0] - ux * 8, cuff[1] - uy * 8], cuff, 50, sil ? P.line : of.coatShade, P.line);
  // gloved hand (+ finger for point / hush, open palm for present)
  const gl = sil ? P.line : P.glove, ang = Math.atan2(uy, ux);
  if (pose.point === side && k > 0.6) { ell(a.hand[0], a.hand[1], 21, 18, gl, P.line, 3, ang); seg2(a.hand, [a.hand[0] + ux * 40, a.hand[1] + uy * 40], 9, gl, P.line); }
  else if (pose.finger === side && k > 0.6) { ell(a.hand[0], a.hand[1] + 10, 18, 20, gl, P.line, 3); seg2([a.hand[0], a.hand[1] - 2], [a.hand[0], a.hand[1] - 42], 9, gl, P.line); }
  else if (pose.open === side && k > 0.6) { ell(a.hand[0], a.hand[1], 26, 16, gl, P.line, 3, ang - 0.4); }
  else ell(a.hand[0], a.hand[1], 20, 20, gl, P.line, 3);
}

function file(hand, sil) {
  ctx.save(); ctx.translate(hand[0] + 6, hand[1] - 10); ctx.rotate(-0.12);
  path([[-80, -110], [-20, -110], [-10, -124], [40, -124], [48, -110], [80, -110], [80, 100], [-80, 100]]); fillStroke(sil ? P.line : P.paperDark, P.line, 3);
  ctx.beginPath(); ctx.rect(-80, -100, 160, 200); fillStroke(sil ? P.line : P.paper, P.line, 3);
  if (!sil) {
    ctx.fillStyle = P.ink; for (let i = 0; i < 4; i++) ctx.fillRect(-60, -70 + i * 22, i === 3 ? 70 : 110, 6);
    ctx.save(); ctx.translate(10, 52); ctx.rotate(-0.2); ctx.strokeStyle = P.tag; ctx.lineWidth = 5; ctx.strokeRect(-48, -16, 96, 32); ctx.fillStyle = P.tag; ctx.fillRect(-36, -4, 72, 8); ctx.restore();
  }
  ctx.restore();
  ell(hand[0], hand[1], 20, 20, sil ? P.line : P.glove, P.line, 3);
}

function lanternBody(hand, t, glow) {
  const lp = lanternPoint(hand, t), sw = Math.atan2(lp[0] - hand[0], lp[1] - hand[1]);
  ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(-sw);
  // bail (the wire handle) from the hand to the cap
  ctx.beginPath(); ctx.moveTo(-26, 46); ctx.quadraticCurveTo(0, -14, 26, 46); ctx.strokeStyle = P.lanternMetal; ctx.lineWidth = 6; ctx.stroke();
  // red file tag tied to the bail (the channel's mark)
  ctx.save(); ctx.translate(18, 26); ctx.rotate(0.5 + Math.sin(t * 2.1) * 0.12); path([[0, 0], [16, 8], [16, 44], [-12, 44], [-12, 8]]); fillStroke(P.tag, P.line, 2.5); ell(2, 12, 3.5, 3.5, P.line); ctx.restore();
  // cap
  path([[-30, 54], [30, 54], [20, 34], [-20, 34]]); fillStroke(P.lanternMetal, P.line, 3);
  // glass + flame
  const f = flick(t) * glow;
  ctx.beginPath(); ctx.roundRect(-30, 54, 60, 78, 10); fillStroke(f > 0.02 ? `rgba(240,166,64,${0.35 + 0.6 * f})` : '#3A3328', P.line, 3);
  if (f > 0.02) {
    ctx.beginPath(); ctx.moveTo(0, 74 - 6 * f); ctx.quadraticCurveTo(13, 100, 0, 116); ctx.quadraticCurveTo(-13, 100, 0, 74 - 6 * f); ctx.fillStyle = P.flame; ctx.fill();
    ell(0, 104, 5, 9, P.flameCore);
  }
  for (const x of [-30, 30]) { ctx.beginPath(); ctx.moveTo(x, 54); ctx.lineTo(x, 132); ctx.strokeStyle = P.lanternMetal; ctx.lineWidth = 7; ctx.stroke(); }
  path([[-36, 132], [36, 132], [32, 148], [-32, 148]]); fillStroke(P.lanternMetal, P.line, 3);
  ctx.restore();
  ell(hand[0], hand[1], 20, 20, P.glove, P.line, 3);
}

function halo(lp, glow, t) {
  if (glow <= 0) return;
  const f = flick(t) * glow, g = ctx.createRadialGradient(lp[0], lp[1], 8, lp[0], lp[1], 470);
  g.addColorStop(0, `rgba(255,196,110,${0.5 * f})`); g.addColorStop(0.25, `rgba(232,163,61,${0.22 * f})`); g.addColorStop(1, 'rgba(232,163,61,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lp[0], lp[1], 470, 0, TAU); ctx.fill();
}

function extras(o, ex, t) {
  const list = o.extras === false ? [] : ex.extras || [];
  if (list.includes('question')) { ctx.save(); ctx.globalAlpha *= 0.85; ctx.font = '700 64px Caladea, serif'; ctx.fillStyle = P.glint; ctx.textAlign = 'center'; ctx.fillText('?', 150, -960 + Math.sin(t * 2.4) * 6); ctx.restore(); }
  if (list.includes('dust')) for (let i = 0; i < 6; i++) { const a = -2.6 + i * 0.32; ell(Math.cos(a) * 190, -880 + Math.sin(a) * 60 - 20, 3, 3, 'rgba(255,233,184,0.7)'); }
}

/** model-space point (or ANCHORS name) → screen point for a draw() call's options. "lantern", "handL", "handR" and
 *  "file" follow the pose, so a shot can hang light or props on them. */
export function anchor(o, name) {
  let m = Array.isArray(name) ? name : ANCHORS[name] || ANCHORS.head;
  if (name === 'handL' || name === 'handR' || name === 'lantern' || name === 'file') {
    const { hands } = resolve(o), side = name === 'handL' || name === 'file' ? 'l' : 'r';
    const a = solveArm(SH[side], hands[side], side === 'l' ? -1 : 1);
    m = name === 'lantern' ? lanternPoint(a.hand, o.t ?? 0) : a.hand;
  }
  const s = o.s ?? 1, f = o.flip ?? 1;
  return [(o.x ?? 540) + m[0] * s * f, (o.y ?? 1600) + m[1] * s];
}

export function draw(o = {}) {
  const t = o.t ?? 0, s = o.s ?? 1, of = OUTFITS[o.outfit] || OUTFITS.archive, ex = EXPRESSIONS[o.expression] || EXPRESSIONS.neutral;
  const sil = !!o.xray, glow = o.lantern === false ? 0 : clamp(o.glow ?? 1), { hands, pose, k } = resolve(o);
  const arms = { l: solveArm(SH.l, hands.l, -1), r: solveArm(SH.r, hands.r, 1) };
  const lp = o.lantern === false ? [0, -400] : lanternPoint(arms.r.hand, t);
  ctx.save();
  ctx.translate(o.x ?? 540, o.y ?? 1600); ctx.scale(s * (o.flip ?? 1), s);
  if (o.alpha != null) ctx.globalAlpha = clamp(o.alpha);
  if (o.lantern !== false) halo(lp, glow, t);
  if (o.shadow !== false) ell(0, -4, 170, 20, P.shadow);
  boots(sil);
  ctx.save(); ctx.translate(0, Math.sin(t * 1.9) * 2);
  coat(of, sil, lp, glow);
  head(of, ex, sil, lp, glow, o, t);
  arm(arms.l, of, sil, 'l', pose, k);
  arm(arms.r, of, sil, 'r', pose, k);
  for (const k2 of [-1, 1]) { ctx.beginPath(); ctx.ellipse(k2 * 104, -712, 31, 27, k2 * 0.5, 0, TAU); fillStroke(sil ? P.line : of.coat, P.line, 3); }
  const prop = o.prop ?? (k > 0.6 ? pose.prop : null);
  if (prop === 'file') file(arms.l.hand, sil);
  ctx.restore();
  if (o.lantern !== false) lanternBody(arms.r.hand, t, glow);
  extras(o, ex, t);
  ctx.restore();
}

export default { id: 'the-archivist', HEIGHT, PALETTE, OUTFITS, EXPRESSIONS, POSES, ANCHORS, draw, anchor, solveArm };
