// MASCOT: a deliberately simple test character (a round blob with arms) that exercises the whole character contract:
// expressions, poses, outfits, x-ray, anchors and blinking, so the studio's tests never depend on a real channel.
//   draw({ x, y, s, flip, t, pose, expression, outfit, xray, blink, talk, alpha, shadow })
import { ctx, TAU } from '/src/core/lib.js';

export const HEIGHT = 600;

export const PALETTE = { body: '#7FC8F8', line: '#1F3A5F', eye: '#1F3A5F', cheek: '#F7A9CB', xray: '#24305E' };

export const OUTFITS = {
  plain: { band: null },
  scarf: { band: '#E2384A' },
};

export const EXPRESSIONS = {
  neutral: { mouth: 0, eyes: 1 },
  smile: { mouth: 0.6, eyes: 1 },
  happy: { mouth: 1, eyes: 0.6 },
  surprised: { mouth: -1, eyes: 1.3 },
  serious: { mouth: -0.2, eyes: 0.8 },
  love: { mouth: 0.8, eyes: 0.5 },
};

export const POSES = {
  stand: { l: [-260, -180], r: [260, -180] },
  wave: { l: [-260, -180], r: [250, -520] },
  cheer: { l: [-240, -520], r: [240, -520] },
  point: { l: [-260, -180], r: [330, -330] },
};

export const ANCHORS = { top: [0, -600], head: [0, -470], face: [0, -330], heart: [0, -250], belly: [0, -180], feet: [0, 0] };

/** model-space point → screen point, for a given draw() call's options */
export function anchor(o, name) {
  const [mx, my] = Array.isArray(name) ? name : ANCHORS[name] || ANCHORS.head, s = o.s ?? 1, f = o.flip ?? 1;
  return [(o.x ?? 540) + mx * s * f, (o.y ?? 1600) + my * s];
}

function circle(x, y, r, fill, stroke) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 8; ctx.stroke(); }
}

export function draw(o = {}) {
  const t = o.t ?? 0, s = o.s ?? 1, P = PALETTE;
  const ex = EXPRESSIONS[o.expression] || EXPRESSIONS.neutral, pose = POSES[o.pose] || POSES.stand;
  const outfit = OUTFITS[o.outfit] || OUTFITS.plain, xray = !!o.xray;
  ctx.save();
  ctx.translate(o.x ?? 540, o.y ?? 1600); ctx.scale(s * (o.flip ?? 1), s);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  if (o.shadow !== false) { ctx.beginPath(); ctx.ellipse(0, -4, 220, 26, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fill(); }
  const bob = Math.sin(t * 2.2) * 6;
  ctx.translate(0, bob);
  ctx.lineCap = 'round'; ctx.strokeStyle = P.line; ctx.lineWidth = 22;
  for (const [hx, hy] of [pose.l, pose.r]) { ctx.beginPath(); ctx.moveTo(Math.sign(hx) * 200, -260); ctx.lineTo(hx, hy); ctx.stroke(); circle(hx, hy, 26, P.body, P.line); }
  circle(0, -300, 290, xray ? P.xray : P.body, P.line);
  if (xray) circle(ANCHORS.heart[0], ANCHORS.heart[1], 50, P.cheek);
  if (outfit.band) { ctx.fillStyle = outfit.band; ctx.fillRect(-240, -130, 480, 44); }
  const shut = o.blink !== false && (t % 3.7) < 0.12;
  for (const ix of [-95, 95]) {
    if (shut) { ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(ix - 30, -360); ctx.lineTo(ix + 30, -360); ctx.stroke(); }
    else circle(ix, -360, 30 * ex.eyes, P.eye);
  }
  circle(-170, -280, 34, P.cheek); circle(170, -280, 34, P.cheek);
  const open = (o.talk ?? 0) * Math.abs(Math.sin(t * 18)) * 30;
  ctx.lineWidth = 10; ctx.beginPath();
  if (ex.mouth < 0) ctx.ellipse(0, -250, 34, 34 + open, 0, 0, TAU);
  else { ctx.moveTo(-70, -260); ctx.quadraticCurveTo(0, -260 + 80 * ex.mouth + open, 70, -260); }
  ctx.stroke();
  ctx.restore();
}

export default { id: 'mascot', HEIGHT, PALETTE, OUTFITS, EXPRESSIONS, POSES, ANCHORS, draw, anchor };
