// Money Desk: the COMPONENT KIT for Penny Explains. Every reusable thing on screen lives here.
// All functions draw immediately with the shared ctx, in 1080x1920 canvas pixels, and are pure functions of their
// arguments (pass progress values like p 0..1 computed from shot time; never keep state between frames).
// Penny herself is NOT drawn here: shots draw her with cast('penny').draw({...}).
import { ctx, W, H, TAU, lerp, clamp, seg, eo, eio, eob, rnd, rr, circle, ell, line, fillAll } from './lib.js';

// ═════════════════════════ PALETTE ═════════════════════════
// green = money you keep · red = money they take (the trap) · gold = the key number · teal = neutral data
export const P = {
  paper: '#FBF5E9', grid: '#ECE1CB', ink: '#1D1B26', inkSoft: '#5A5568', white: '#FFFFFF',
  green: '#1FA463', greenDark: '#157A49', greenLight: '#C4EBD3',
  gold: '#F5B83D', goldDark: '#C3861A', goldLight: '#FFE28E', capGold: '#FFC93C',
  red: '#E5483B', redDark: '#B32E24', redLight: '#F9CFC9',
  teal: '#2A7F9E', tealDark: '#1D5D75', tealLight: '#C3E2EC',
  wall: '#F4E7CF', wallLine: '#E6D3B1', desk: '#C98B57', deskDark: '#A56E3F', deskLight: '#DDA676',
  vault: '#1C2238', vaultLine: '#2B3352', bill: '#C9E8CC', billDark: '#4E9467', receipt: '#FFFEFA', shadow: 'rgba(29,27,38,0.16)',
};
const OUT = 6;                        // the one outline weight for objects (ink)

// ═════════════════════════ NUMBERS ═════════════════════════
/** 1234.5 → "1,234.50" (d decimals) */
export function fmtNum(v, d = 0) {
  const s = Math.abs(v).toFixed(d), [i, f] = s.split('.');
  return (v < 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (f ? '.' + f : '');
}
/** money: fmtMoney(4433.12) → "$4,433" · fmtMoney(85, 2) → "$85.00" */
export const fmtMoney = (v, d = 0) => (v < 0 ? '-$' : '$') + fmtNum(Math.abs(v), d);
/** an eased count from a to b as p goes 0 → 1 (ease-out, so the last digits settle) */
export const tick = (a, b, p) => lerp(a, b, eo(clamp(p)));

function text(str, x, y, size, color, { weight = 900, align = 'center', base = 'middle', spacing = 0, stroke = null, sw = 0, maxW } = {}) {
  ctx.font = `${weight} ${size}px Inter`; ctx.textAlign = align; ctx.textBaseline = base; ctx.letterSpacing = `${spacing}px`;
  if (maxW) { const w = ctx.measureText(str).width; if (w > maxW) { ctx.save(); ctx.translate(x, y); ctx.scale(maxW / w, 1); x = 0; y = 0; draw(); ctx.restore(); ctx.letterSpacing = '0px'; return; } }
  draw(); ctx.letterSpacing = '0px';
  function draw() {
    if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = sw; ctx.strokeStyle = stroke; ctx.strokeText(str, x, y); }
    ctx.fillStyle = color; ctx.fillText(str, x, y);
  }
}
export { text as label };

/** a big counter: counter(4433, 540, 700, 200, { prefix: '$', color: P.red }) */
export function counter(v, x, y, size, { prefix = '', suffix = '', d = 0, color = P.ink, stroke = null, align = 'center', sc = 1 } = {}) {
  if (sc <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  text(prefix + fmtNum(v, d) + suffix, 0, 0, size, color, { align, stroke, sw: size * 0.16, spacing: -size * 0.02 });
  ctx.restore();
}

// ═════════════════════════ BACKGROUNDS ═════════════════════════
/** (A) graph paper: cream with a faint grid (charts, math) */
export function paper(t = 0) {
  fillAll(P.paper);
  ctx.strokeStyle = P.grid; ctx.lineWidth = 2;
  for (let x = -300; x <= W + 300; x += 60) { ctx.beginPath(); ctx.moveTo(x, -300); ctx.lineTo(x, H + 300); ctx.stroke(); }
  for (let y = -300; y <= H + 300; y += 60) { ctx.beginPath(); ctx.moveTo(-300, y); ctx.lineTo(W + 300, y); ctx.stroke(); }
}
/** (B) Penny's desk: warm wall, a framed chart, a wooden desk top at deskY (props sit on it) */
export function desk(t = 0, deskY = 1180) {
  fillAll(P.wall);
  ctx.fillStyle = P.wallLine; for (let x = -300; x < W + 300; x += 120) ctx.fillRect(x, -300, 6, deskY + 300);
  // framed little chart on the wall
  rr(650, 200, 300, 230, 16); ctx.fillStyle = P.ink; ctx.fill(); rr(666, 216, 268, 198, 8); ctx.fillStyle = P.white; ctx.fill();
  [[0.35, P.teal], [0.55, P.teal], [0.85, P.green]].forEach(([h, c], i) => { ctx.fillStyle = c; ctx.fillRect(700 + i * 76, 394 - h * 150, 50, h * 150); });
  // desk
  ctx.fillStyle = P.deskDark; ctx.fillRect(-300, deskY, W + 600, 40);
  ctx.fillStyle = P.desk; ctx.fillRect(-300, deskY + 40, W + 600, H);
  ctx.fillStyle = P.deskLight; ctx.fillRect(-300, deskY + 40, W + 600, 12);
}
/** (C) the vault: dark navy, a slow red glow for trap reveals; red = what they take */
export function vault(t = 0, glow = 1) {
  fillAll(P.vault);
  ctx.strokeStyle = P.vaultLine; ctx.lineWidth = 3;
  for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(540, 820, 160 + i * 130, 0, TAU); ctx.stroke(); }
  if (glow > 0) { const g = ctx.createRadialGradient(540, 820, 50, 540, 820, 900); g.addColorStop(0, `rgba(229,72,59,${0.32 * glow * (0.85 + 0.15 * Math.sin(t * 4))})`); g.addColorStop(1, 'rgba(229,72,59,0)'); ctx.fillStyle = g; ctx.fillRect(-300, -300, W + 600, H + 600); }
}
/** (D) a flat colour field (green, red, gold...) with soft diagonal stripes, for a big number slam */
export function field(color, stripe = 'rgba(255,255,255,0.08)', t = 0) {
  fillAll(color); ctx.save(); ctx.fillStyle = stripe; ctx.rotate(-0.35);
  for (let x = -1400; x < 1800; x += 140) ctx.fillRect(x + (t * 40) % 140, -600, 60, 3200);
  ctx.restore();
}

// ═════════════════════════ CARDS & LABELS ═════════════════════════
/** a white card with ink outline and a flat offset shadow; returns nothing. title draws a header strip */
export function card(x, y, w, h, { fill = P.white, title = null, titleFill = P.ink, titleColor = P.white, r = 28, sc = 1 } = {}) {
  if (sc <= 0) return;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc); ctx.translate(-x - w / 2, -y - h / 2);
  rr(x + 12, y + 14, w, h, r); ctx.fillStyle = P.shadow; ctx.fill();
  rr(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = OUT; ctx.strokeStyle = P.ink; ctx.stroke();
  if (title) {
    rr(x, y, w, 92, [r, r, 0, 0]); ctx.fillStyle = titleFill; ctx.fill(); ctx.lineWidth = OUT; ctx.stroke();
    text(title, x + w / 2, y + 48, 50, titleColor, { spacing: 2, maxW: w - 40 });
  }
  ctx.restore();
}
/** a dark rounded label ("INTEREST"). sc animates the pop */
export function pill(str, x, y, size, bg = P.ink, fg = P.white, sc = 1) {
  if (sc <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.font = `900 ${size}px Inter`; ctx.letterSpacing = '2px';
  const w = ctx.measureText(str).width + size * 1.1, h = size * 1.6;
  rr(-w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = bg; ctx.fill();
  ctx.letterSpacing = '0px'; text(str, 0, size * 0.05, size, fg, { spacing: 2 });
  ctx.restore();
}
/** label with a pointer line to a target point */
export function tag(str, x, y, tx, ty, size = 52, sc = 1, bg = P.ink) {
  if (sc <= 0) return;
  ctx.save(); ctx.globalAlpha *= clamp(sc); line([[x, y], [tx, ty]], P.ink, 7); circle(tx, ty, 10, P.ink); ctx.restore();
  pill(str, x, y, size, bg, P.white, sc);
}
/** small footnote under a chart ("assumes: …" / "for education, not advice"); \n splits lines; fits 960 px */
export function footnote(str, x, y, a = 1, color = P.inkSoft, size = 32) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  str.split('\n').forEach((l, i) => text(l, x, y + i * size * 1.3, size, color, { weight: 800, spacing: 1, maxW: 960 }));
  ctx.restore();
}
/** a speech bubble for Penny (text centred, up to 2 lines split with \n), tail toward (tx, ty) */
export function bubble(str, x, y, w, h, tx, ty, sc = 1, size = 56) {
  if (sc <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.beginPath(); ctx.moveTo(-40, h / 2 - 6); ctx.lineTo(tx - x, ty - y); ctx.lineTo(30, h / 2 - 6); ctx.closePath();
  ctx.fillStyle = P.white; ctx.fill(); ctx.lineWidth = OUT; ctx.strokeStyle = P.ink; ctx.lineJoin = 'round'; ctx.stroke();
  rr(-w / 2, -h / 2, w, h, h / 2.4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = P.white; ctx.fillRect(-36, h / 2 - 12, 62, 14);
  str.split('\n').forEach((l, i, a) => text(l, 0, (i - (a.length - 1) / 2) * size * 1.1, size, P.ink, { maxW: w - 50 }));
  ctx.restore();
}

// ═════════════════════════ MONEY OBJECTS ═════════════════════════
/** a gold coin (radius r) with a cent sign; spin 0..1 flips it (pure: pass spin from time) */
export function coin(x, y, r = 60, spin = 0, rot = 0) {
  const sx = Math.max(0.06, Math.abs(Math.cos(spin * Math.PI)));
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sx, 1);
  circle(0, 0, r, P.gold); ctx.lineWidth = Math.max(3, r * 0.1); ctx.strokeStyle = P.ink; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.74, 0, TAU); ctx.lineWidth = r * 0.07; ctx.strokeStyle = P.goldDark; ctx.stroke();
  if (sx > 0.35) {
    ctx.beginPath(); ctx.arc(0, 0, r * 0.32, 0.3 * Math.PI, 1.7 * Math.PI); ctx.lineWidth = r * 0.11; ctx.lineCap = 'round'; ctx.strokeStyle = P.goldDark; ctx.stroke();
    line([[r * 0.04, -r * 0.5], [-r * 0.04, r * 0.5]], P.goldDark, r * 0.09);
  }
  ell(-r * 0.42, -r * 0.42, r * 0.16, r * 0.1, P.goldLight, -0.8);
  ctx.restore();
}
/** a stack of n coins seen from the side, bottom at y */
export function coinStack(x, y, n, r = 60) {
  for (let i = 0; i < n; i++) {
    const yy = y - i * r * 0.32;
    ctx.beginPath(); ctx.ellipse(x, yy, r, r * 0.34, 0, 0, TAU); ctx.fillStyle = P.goldDark; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, yy - r * 0.1, r, r * 0.3, 0, 0, TAU); ctx.fillStyle = P.gold; ctx.fill(); ctx.stroke();
  }
}
/** a banknote (240x120 at s = 1) with the amount */
export function bill(x, y, s = 1, rot = 0, denom = '100') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rr(-120, -60, 240, 120, 12); ctx.fillStyle = P.bill; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = P.ink; ctx.stroke();
  rr(-104, -44, 208, 88, 8); ctx.lineWidth = 4; ctx.strokeStyle = P.billDark; ctx.stroke();
  circle(0, 0, 30, P.billDark); circle(0, 0, 24, P.bill);
  text('$', 0, 2, 34, P.billDark);
  text(denom, -78, -24, 26, P.billDark); text(denom, 78, 26, 26, P.billDark);
  ctx.restore();
}
/** a credit card (360x228 at s = 1) */
export function creditCard(x, y, s = 1, rot = 0, { color = P.teal, dark = P.tealDark, name = 'PLATINUM', digits = '4021' } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rr(-172, -104, 360, 228, 26); ctx.fillStyle = P.shadow; ctx.fill();
  rr(-180, -114, 360, 228, 26); ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = P.ink; ctx.stroke();
  ctx.save(); rr(-180, -114, 360, 228, 26); ctx.clip(); ctx.beginPath(); ctx.arc(170, -130, 190, 0, TAU); ctx.fillStyle = dark; ctx.fill(); ctx.restore();
  rr(-142, -48, 62, 48, 8); ctx.fillStyle = P.gold; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = P.goldDark; ctx.stroke();
  line([[-142, -24], [-80, -24]], P.goldDark, 3); line([[-111, -48], [-111, 0]], P.goldDark, 3);
  text('••••  ••••  ••••  ' + digits, -142, 44, 28, P.white, { align: 'left', weight: 800, spacing: 2 });
  text(name, -142, 86, 22, 'rgba(255,255,255,0.8)', { align: 'left', weight: 900, spacing: 4 });
  circle(118, 78, 24, P.red); ctx.globalAlpha *= 0.85; circle(146, 78, 24, P.gold); ctx.globalAlpha = 1;
  ctx.restore();
}
/** a price tag (hole on the left, string), e.g. priceTag(540, 600, 1.4, '$4.99') · strike draws a red line through it */
export function priceTag(x, y, s, str, rot = 0, { fill = P.goldLight, color = P.ink, strike = 0 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(-170, 0); ctx.lineTo(-110, -80); ctx.lineTo(170, -80); ctx.lineTo(170, 80); ctx.lineTo(-110, 80); ctx.closePath();
  ctx.fillStyle = P.shadow; ctx.save(); ctx.translate(8, 10); ctx.fill(); ctx.restore();
  ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = OUT; ctx.strokeStyle = P.ink; ctx.lineJoin = 'round'; ctx.stroke();
  circle(-118, 0, 16, P.paper); ctx.lineWidth = 5; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-118, 0); ctx.bezierCurveTo(-180, -40, -220, -110, -260, -120); ctx.lineWidth = 4; ctx.strokeStyle = P.inkSoft; ctx.stroke();
  text(str, 30, 4, 96, color, { maxW: 250 });
  if (strike > 0) { ctx.save(); ctx.lineCap = 'round'; line([[-70, 30], [lerp(-70, 150, clamp(strike)), lerp(30, -30, clamp(strike))]], P.red, 16); ctx.restore(); }
  ctx.restore();
}
/** a receipt (w wide), rows print one by one as p goes 0 → 1; rows: [[label, amount, color?]], total: [label, amount, color?] */
export function receipt(x, y, s, { title = 'RECEIPT', rows = [], total = null, p = 1, w = 560 } = {}) {
  const n = rows.length + (total ? 2 : 0), rowH = 78, h = 150 + rows.length * rowH + (total ? 130 : 30);
  const shown = p * n;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const zig = (dy) => { ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.lineTo(w / 2, dy); for (let i = 0; i <= 14; i++) ctx.lineTo(w / 2 - (i + 0.5) * w / 15, dy + (i % 2 ? 0 : 20)); ctx.lineTo(-w / 2, dy); ctx.closePath(); };
  ctx.save(); ctx.translate(10, 12); zig(h); ctx.fillStyle = P.shadow; ctx.fill(); ctx.restore();
  zig(h); ctx.fillStyle = P.receipt; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = P.ink; ctx.lineJoin = 'round'; ctx.stroke();
  text(title, 0, 70, 50, P.ink, { spacing: 4, maxW: w - 60 });
  ctx.setLineDash([12, 10]); line([[-w / 2 + 30, 120], [w / 2 - 30, 120]], P.inkSoft, 4); ctx.setLineDash([]);
  rows.forEach(([l, a, c], i) => {
    const k = clamp(shown - i); if (k <= 0) return;
    ctx.save(); ctx.globalAlpha *= k; const yy = 168 + i * rowH;
    text(l, -w / 2 + 36, yy, 42, P.ink, { align: 'left', weight: 800, maxW: w * 0.55 });
    text(a, w / 2 - 36, yy, 46, c || P.ink, { align: 'right' });
    ctx.restore();
  });
  if (total) {
    const k = clamp(shown - rows.length - 1); if (k > 0) {
      const yy = 168 + rows.length * rowH + 40; ctx.save(); ctx.globalAlpha *= k;
      line([[-w / 2 + 30, yy - 46], [w / 2 - 30, yy - 46]], P.ink, 5);
      text(total[0], -w / 2 + 36, yy + 6, 50, P.ink, { align: 'left' });
      text(total[1], w / 2 - 36, yy + 6, 62, total[2] || P.ink, { align: 'right' });
      ctx.restore();
    }
  }
  ctx.restore();
}
/** a desk calculator (440x660 at s = 1). display = the number string; press = index (0..15) of the key pressed, or -1 */
export function calculator(x, y, s = 1, display = '0', press = -1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rr(-206, -316, 440, 660, 44); ctx.fillStyle = P.shadow; ctx.fill();
  rr(-220, -330, 440, 660, 44); ctx.fillStyle = P.tealDark; ctx.fill(); ctx.lineWidth = OUT; ctx.strokeStyle = P.ink; ctx.stroke();
  rr(-180, -290, 360, 150, 18); ctx.fillStyle = '#CFE3C9'; ctx.fill(); ctx.lineWidth = 5; ctx.stroke();
  text(display, 160, -212, 92, P.ink, { align: 'right', maxW: 330 });
  const keys = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '=', '+'];
  keys.forEach((k, i) => {
    const cx = -135 + (i % 4) * 90, cy = -70 + Math.floor(i / 4) * 92, down = i === press ? 6 : 0, op = i % 4 === 3 || k === '=';
    rr(cx - 38, cy - 36 + 8, 76, 72, 16); ctx.fillStyle = P.ink; ctx.fill();
    rr(cx - 38, cy - 36 + down, 76, 72, 16); ctx.fillStyle = op ? P.gold : P.white; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke();
    text(k, cx, cy + down + 2, 40, P.ink);
  });
  ctx.restore();
}
/** a percentage badge: a scalloped seal with the number ("22%") */
export function pctBadge(x, y, s, str, color = P.red, sc = 1, rot = -0.12) {
  if (sc <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * sc, s * sc);
  ctx.beginPath(); for (let i = 0; i <= 48; i++) { const a = i / 48 * TAU, r = i % 2 ? 150 : 168; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = OUT; ctx.strokeStyle = P.ink; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 124, 0, TAU); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.stroke();
  text(str, 0, 6, 104, P.white, { maxW: 220 });
  ctx.restore();
}
/** a monthly statement / bill card (w x h), lines: [[label, value, color?]], hi = index of a row to box in red */
export function statement(x, y, w, { title = 'STATEMENT', rows = [], hi = -1, hiA = 0, hiColor = P.red, p = 1, s = 1 } = {}) {
  if (s !== 1) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); statement(0, 0, w, { title, rows, hi, hiA, hiColor, p }); ctx.restore(); return; }
  const h = 130 + rows.length * 86 + 30;
  card(x - w / 2, y, w, h, { title, titleFill: P.teal });
  rows.forEach(([l, v, c], i) => {
    const k = clamp(p * rows.length - i); if (k <= 0) return;
    const yy = y + 150 + i * 86; ctx.save(); ctx.globalAlpha *= k;
    text(l, x - w / 2 + 40, yy, 40, P.inkSoft, { align: 'left', weight: 800, maxW: w * 0.58 });
    text(v, x + w / 2 - 40, yy, 50, c || P.ink, { align: 'right' });
    ctx.restore();
    if (i === hi && hiA > 0) { ctx.save(); ctx.globalAlpha *= hiA; rr(x - w / 2 + 18, yy - 40, w - 36, 80, 18); ctx.lineWidth = 9; ctx.strokeStyle = hiColor; ctx.stroke(); ctx.restore(); }
  });
}

// ═════════════════════════ CHARTS (data-driven, labelled) ═════════════════════════
/**
 * vertical bar chart. o = { x, y, w, h (plot box, y = top), bars: [{ label, value, color, text? }], max, p (0..1 grow),
 *   ticks: [values] (gridlines + axis labels), fmt (value → string), title, stagger (0..1) }
 * Bars grow from the baseline; each value label counts up with its bar and sits on top of it.
 */
export function barChart(o) {
  const { x, y, w, h, bars, max, p = 1, ticks = [], fmt = (v) => fmtNum(v), title = null, stagger = 0.25, labelSize = 46, valueSize = 64, tickSize = 40 } = o;
  if (title) text(title, x + w / 2, y - 70, 50, P.ink, { spacing: 1, maxW: w });
  ctx.save();
  for (const tv of ticks) { const yy = y + h - tv / max * h; line([[x, yy], [x + w, yy]], P.grid, 4); text(fmt(tv), x - 18, yy, tickSize, P.inkSoft, { align: 'right', weight: 800 }); }
  const n = bars.length, gap = w / n, bw = Math.min(200, gap * 0.62);
  bars.forEach((b, i) => {
    const k = eio(clamp((p - i * stagger / Math.max(1, n - 1)) / (1 - stagger))), v = b.value * k, bh = v / max * h, cx = x + gap * (i + 0.5);
    rr(cx - bw / 2 + 8, y + h - bh + 10, bw, bh, [16, 16, 0, 0]); ctx.fillStyle = P.shadow; ctx.fill();
    if (bh > 1) { rr(cx - bw / 2, y + h - bh, bw, bh, [16, 16, 0, 0]); ctx.fillStyle = b.color || P.teal; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = P.ink; ctx.stroke(); }
    if (k > 0) text(b.text ? b.text(v) : fmt(v), cx, y + h - bh - valueSize * 0.75, valueSize, b.color === P.red ? P.red : P.ink, { maxW: gap - 10 });
    text(b.label, cx, y + h + labelSize * 1.05, labelSize, P.ink, { weight: 900, maxW: gap - 10 });
  });
  line([[x - 6, y + h], [x + w + 6, y + h]], P.ink, 7);
  ctx.restore();
}
/**
 * line chart. o = { x, y, w, h, xMin, xMax, yMin, yMax, series: [{ data: [[x, y], ...], color, width, label, area }],
 *   p (0..1 draws left → right in data x), xTicks, yTicks, fmtX, fmtY, xLabel, yLabel, endDot (true), endLabel(fn) }
 * Every point comes from data; the head of each line carries a dot (and its value with endLabel).
 */
export function lineChart(o) {
  const { x, y, w, h, xMin, xMax, yMin, yMax, series, p = 1, xTicks = [], yTicks = [], fmtX = (v) => fmtNum(v), fmtY = (v) => fmtNum(v), xLabel = null, yLabel = null, endDot = true, endLabel = null, tickSize = 40 } = o;
  const X = (v) => x + (v - xMin) / (xMax - xMin) * w, Y = (v) => y + h - (v - yMin) / (yMax - yMin) * h;
  for (const tv of yTicks) { line([[x, Y(tv)], [x + w, Y(tv)]], P.grid, 4); text(fmtY(tv), x - 18, Y(tv), tickSize, P.inkSoft, { align: 'right', weight: 800 }); }
  for (const tv of xTicks) { line([[X(tv), y + h], [X(tv), y + h + 16]], P.ink, 6); text(fmtX(tv), X(tv), y + h + tickSize * 1.25, tickSize, P.inkSoft, { weight: 800 }); }
  if (xLabel) text(xLabel, x + w / 2, y + h + tickSize * 2.6, tickSize, P.ink, { weight: 900, spacing: 1 });
  if (yLabel) text(yLabel, x, y - tickSize * 1.3, tickSize, P.ink, { weight: 900, align: 'left', spacing: 1 });
  const xEnd = lerp(xMin, xMax, clamp(p));
  for (const s of series) {
    const pts = []; const d = s.data;
    for (let i = 0; i < d.length; i++) {
      if (d[i][0] <= xEnd) pts.push([X(d[i][0]), Y(d[i][1])]);
      else { if (i > 0) { const a = d[i - 1], b = d[i], k = (xEnd - a[0]) / ((b[0] - a[0]) || 1); pts.push([X(xEnd), Y(lerp(a[1], b[1], k))]); } break; }
    }
    if (pts.length < 2) continue;
    if (s.area) { ctx.beginPath(); ctx.moveTo(pts[0][0], Y(yMin)); for (const q of pts) ctx.lineTo(q[0], q[1]); ctx.lineTo(pts[pts.length - 1][0], Y(yMin)); ctx.closePath(); ctx.fillStyle = s.area; ctx.fill(); }
    line(pts, P.ink, (s.width || 12) + 8); line(pts, s.color || P.teal, s.width || 12);
    const hd = pts[pts.length - 1];
    if (endDot) { circle(hd[0], hd[1], 17, P.ink); circle(hd[0], hd[1], 11, s.color || P.teal); }
    if (endLabel) { const dv = yMin + (Y(yMin) - hd[1]) / h * (yMax - yMin); endLabel(hd[0], hd[1], dv, s); }
  }
  line([[x, y - 10], [x, y + h], [x + w + 10, y + h]], P.ink, 7);
}
/** a horizontal stacked bar: o = { x, y, w, h, parts: [{ value, color, label }], total, p } (labels inside each part) */
export function splitBar(o) {
  const { x, y, w, h, parts, total = parts.reduce((s, q) => s + q.value, 0), p = 1, size = 48 } = o;
  rr(x + 10, y + 12, w, h, h / 2.5); ctx.fillStyle = P.shadow; ctx.fill();
  rr(x, y, w, h, h / 2.5); ctx.fillStyle = P.white; ctx.fill();
  ctx.save(); rr(x, y, w, h, h / 2.5); ctx.clip();
  let acc = 0;
  parts.forEach((q, i) => {
    const k = eio(clamp(p * parts.length - i)), pw = q.value / total * w * k;
    ctx.fillStyle = q.color; ctx.fillRect(x + acc, y, pw + 1, h);
    if (k > 0.6 && q.label) text(q.label, x + acc + q.value / total * w / 2, y + h / 2 + 3, size, P.white, { maxW: q.value / total * w - 20 });
    acc += q.value / total * w;
    if (i < parts.length - 1 && k > 0.99) line([[x + acc, y], [x + acc, y + h]], P.ink, 5);
  });
  ctx.restore();
  rr(x, y, w, h, h / 2.5); ctx.lineWidth = OUT; ctx.strokeStyle = P.ink; ctx.stroke();
}

// ═════════════════════════ THE TRAP + VERDICTS ═════════════════════════
/** a cartoon jaw trap with a coin as bait. close 0 = open (jaws spread), 1 = snapped shut. s = 1 → ~560 wide */
export function trap(x, y, s = 1, close = 0, bait = true) {
  const R = 130;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ell(0, 34, 300, 36, P.shadow);
  rr(-250, 0, 500, 36, 14); ctx.fillStyle = '#6B6F80'; ctx.fill(); ctx.lineWidth = OUT; ctx.strokeStyle = P.ink; ctx.stroke();
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * 190, 4, 44, 22, 0, 0, TAU); ctx.fillStyle = '#9DA2B4'; ctx.fill(); ctx.lineWidth = 5; ctx.stroke(); }
  rr(-46, -22, 92, 26, 8); ctx.fillStyle = P.redDark; ctx.fill(); ctx.lineWidth = 5; ctx.stroke();
  if (bait && close < 0.4) coin(0, -64, 44, 0, 0);
  const th = lerp(0.95, 0, eob(clamp(close)));          // how far each jaw is tipped outward from upright
  for (const sd of [-1, 1]) {
    ctx.save(); ctx.translate(0, 0); ctx.rotate(sd * th);
    // the jaw: half of a ring (radius R) from the pivot up and over to the top, teeth pointing inward
    const half = () => { ctx.beginPath(); ctx.arc(0, -R, R, Math.PI / 2, 3 * Math.PI / 2, sd > 0); };
    half(); ctx.lineWidth = 30; ctx.strokeStyle = P.ink; ctx.lineCap = 'round'; ctx.stroke();
    half(); ctx.lineWidth = 18; ctx.strokeStyle = '#B9BDCB'; ctx.stroke();
    for (let i = 1; i < 8; i++) {
      const f = Math.PI / 2 + i * Math.PI / 8, py = -R + Math.sin(f) * R;
      const qx = sd < 0 ? Math.cos(f) * R : -Math.cos(f) * R, nx = -qx / R, ny = (-R - py) / R, tx = -ny, ty = nx;
      ctx.beginPath(); ctx.moveTo(qx + tx * 11, py + ty * 11); ctx.lineTo(qx + nx * 30, py + ny * 30); ctx.lineTo(qx - tx * 11, py - ty * 11); ctx.closePath();
      ctx.fillStyle = '#E3E6EE'; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = P.ink; ctx.lineJoin = 'round'; ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}
/** a rubber stamp ("TRAP", "MYTH", "PAID") that slams in: p 0..1 */
export function stamp(str, x, y, s = 1, color = P.red, rot = -0.18, p = 1) {
  if (p <= 0) return;
  const k = eo(clamp(p)), sc = lerp(2.2, 1, k);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * sc, s * sc); ctx.globalAlpha *= clamp(p * 3);
  ctx.font = '900 130px Inter'; ctx.letterSpacing = '8px'; const w = ctx.measureText(str).width + 90; ctx.letterSpacing = '0px';
  rr(-w / 2, -95, w, 190, 26); ctx.lineWidth = 16; ctx.strokeStyle = color; ctx.stroke();
  rr(-w / 2 + 16, -79, w - 32, 158, 16); ctx.lineWidth = 5; ctx.stroke();
  text(str, 0, 8, 130, color, { spacing: 8 });
  ctx.restore();
}
/** red X (a = alpha) and green check */
export function redX(x, y, s, a = 1) {
  if (a <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha *= a; ctx.lineCap = 'round';
  for (const [w, c] of [[96, P.ink], [70, P.red]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(-200, -200); ctx.lineTo(200, 200); ctx.moveTo(200, -200); ctx.lineTo(-200, 200); ctx.stroke(); }
  ctx.restore();
}
export function check(x, y, s, a = 1) {
  if (a <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha *= a; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [w, c] of [[96, P.ink], [70, P.green]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(-180, 0); ctx.lineTo(-60, 130); ctx.lineTo(200, -160); ctx.stroke(); }
  ctx.restore();
}
/**
 * before / after: two cards side by side with a "VS" seal. o = { x, y, w, h, left: { title, color, draw(cx, cy, k) },
 *   right: {...}, p (0..1: left card, then right card) }. draw() renders each card's content centred at (cx, cy).
 */
export function beforeAfter(o) {
  const { x = 40, y = 300, w = 1000, h = 820, left, right, p = 1, vs = 'VS', vsY = y + 46 } = o, cw = (w - 40) / 2;
  [[left, x, 0], [right, x + cw + 40, 1]].forEach(([c, cx, i]) => {
    const k = eob(clamp(p * 2 - i)); if (k <= 0) return;
    card(cx, y, cw, h, { title: c.title, titleFill: c.color || P.teal, sc: k });
    if (k > 0.5) c.draw(cx + cw / 2, y + 92 + (h - 92) / 2, clamp(p * 2 - i));
  });
  if (p > 0.5) { const k = eob(clamp((p - 0.5) * 4)); ctx.save(); ctx.translate(x + w / 2, vsY); ctx.scale(k, k); circle(0, 0, 66, P.ink); text(vs, 0, 4, 52, P.white); ctx.restore(); }
}

// ═════════════════════════ EFFECTS ═════════════════════════
/** flat arrow pointing along ang (radians). len in px */
export function arrow(x, y, len, ang = 0, a = 1, color = P.red) {
  if (a <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha *= a;
  ctx.beginPath(); ctx.moveTo(-len / 2, -26); ctx.lineTo(len / 2 - 100, -26); ctx.lineTo(len / 2 - 100, -74); ctx.lineTo(len / 2, 0);
  ctx.lineTo(len / 2 - 100, 74); ctx.lineTo(len / 2 - 100, 26); ctx.lineTo(-len / 2, 26); ctx.closePath();
  ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = P.ink; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}
/** impact burst (gold rays) */
export function burst(x, y, s, a, color = P.gold) {
  if (a <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= a; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineWidth = 12;
  for (let i = 0; i < 10; i++) { const an = i * TAU / 10; ctx.beginPath(); ctx.moveTo(Math.cos(an) * 34 * s, Math.sin(an) * 34 * s); ctx.lineTo(Math.cos(an) * 84 * s, Math.sin(an) * 84 * s); ctx.stroke(); }
  ctx.restore();
}
/** coins raining from y0 (deterministic: positions from rnd(i) and time) */
export function coinRain(t, n = 14, y0 = -100, speed = 900, r = 46) {
  for (let i = 0; i < n; i++) {
    const ph = (t * speed / (H + 300) + rnd(i)) % 1;
    coin(80 + rnd(i + 7) * 920, y0 + ph * (H + 300), r * (0.7 + rnd(i + 3) * 0.5), t * (1 + rnd(i)) + i, (rnd(i + 11) - 0.5));
  }
}
/** money flying from (ax, ay) to (bx, by): n coins along an arc, p 0..1 */
export function coinFlow(ax, ay, bx, by, p, n = 6, r = 40, arc = 220) {
  for (let i = 0; i < n; i++) {
    const k = clamp(p * 1.6 - i * 0.6 / n); if (k <= 0 || k >= 1) continue;
    const e = eio(k); coin(lerp(ax, bx, e), lerp(ay, by, e) - Math.sin(e * Math.PI) * arc, r, k * 2, 0);
  }
}
/** a tear-off calendar card: big number + word under it (600x680 at s = 1) */
export function calendar(x, y, s, big, small, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rr(-288, -326, 600, 680, 46); ctx.fillStyle = P.shadow; ctx.fill();
  rr(-300, -340, 600, 680, 46); ctx.fillStyle = P.white; ctx.fill(); ctx.lineWidth = 10; ctx.strokeStyle = P.ink; ctx.stroke();
  rr(-300, -340, 600, 170, [46, 46, 0, 0]); ctx.fillStyle = P.red; ctx.fill(); ctx.lineWidth = 10; ctx.stroke();
  for (const bx of [-150, 150]) { rr(bx - 18, -390, 36, 100, 18); ctx.fillStyle = P.ink; ctx.fill(); }
  text(big, 0, 60, 300, P.ink); text(small, 0, 240, 84, P.ink, { spacing: 4 });
  ctx.restore();
}
