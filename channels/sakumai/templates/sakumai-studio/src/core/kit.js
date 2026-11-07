// SAKUMAI STUDIO kit: the pastel anime look of the Sakumai channel. Sets, a cute body-cutaway kit, hormones as
// particles, graphics and transitions. Sakumai herself is NEVER drawn here: shots draw her with cast('sakumai').
// Every function is a pure function of its arguments (film time t / shot time lt): nothing is carried between frames.
// Screen space is 1080x1920. Keep key action above y 1250: the caption sits at y 1250-1550.
import { ctx, W, H, clamp, lerp, seg, eo, eio, eob, rnd, TAU } from './lib.js';

// ---------- palette (only these appear on screen; Sakumai brings her own) ----------
export const P = {
  ink: '#2A1A3A', line: '#7A4258', white: '#FFFFFF', cream: '#FFF6EE',
  pink: '#F7A9CB', pinkLight: '#FCD9E6', pinkWall: '#FCE6EE', pinkDeep: '#E77FA8', rose: '#FF6F9C',
  lav: '#B79BE0', lavLight: '#E6DCF8', lavDeep: '#8E72BD', lilac: '#CDBDF5',
  peach: '#FFD9C2', butter: '#FFE7A8', yellow: '#FFD43B', mint: '#BDEBD9', mintDeep: '#6FB8A0',
  sky: '#C9E8F8', skyDeep: '#94CDEE', coral: '#FF8C7A', orange: '#FFA64D', red: '#E2384A',
  navy: '#1F1D45', navy2: '#2B2860', nightTop: '#1C1A44', nightMid: '#3F3485', nightLow: '#8E6CC0',
  xLine: '#A99BF0', blood: '#F0485C', bloodLight: '#FF9AA8',
  organ: '#FF8FB1', organDark: '#D9658F', organLight: '#FFC7DA',
  brain: '#FFB8CF', brainDark: '#D9789C', lung: '#FFA9BA', lungDark: '#D8708A', tummy: '#FFBE9C', tummyDark: '#DA8A66',
  skin: '#FFE7DA', skinShade: '#F7CDBB', dermis: '#FFC9C4', dermisDark: '#E89B97', muscle: '#F2788F',
  board: '#5E9C8F', boardDark: '#4C8579', wood: '#EBCBA9', woodDark: '#D3AE89', woodLine: '#B88E68',
  chalk: '#F4FFF9', glass: '#E8F6FF',
};

// ---------- small helpers ----------
const sp = (o) => ({ fill: null, line: null, lw: 4, ...o });
export function shape(path, o = {}) {
  const { fill, line, lw } = sp(o); ctx.beginPath(); path();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (line) { ctx.lineWidth = lw; ctx.strokeStyle = line; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
}
export const oval = (x, y, rx, ry, o, rot = 0) => shape(() => ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU), o);
export const disc = (x, y, r, fill, line, lw) => oval(x, y, r, r, { fill, line, lw });
export const box = (x, y, w, h, r, o) => shape(() => ctx.roundRect(x, y, w, h, r), o);
export function polyline(pts, color, w, cap = 'round') {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = cap; ctx.lineJoin = 'round'; ctx.stroke();
}
/** smooth curve through points (quadratic midpoints) */
export function smooth(pts) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
  const l = pts[pts.length - 1]; ctx.lineTo(l[0], l[1]);
}
export function smoothStroke(pts, color, w) { ctx.beginPath(); smooth(pts); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); }
/** point at u (0..1) along a polyline, by length */
export function along(pts, u) {
  const d = [0]; for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = d[d.length - 1] * clamp(u); let i = 1; while (i < d.length - 1 && d[i] < L) i++;
  const k = (L - d[i - 1]) / ((d[i] - d[i - 1]) || 1);
  return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k), Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])];
}
function vgrad(top, bottom, y0 = 0, y1 = H) { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, top); g.addColorStop(1, bottom); return g; }
export function sky(top, bottom) { ctx.fillStyle = vgrad(top, bottom); ctx.fillRect(-300, -300, W + 600, H + 600); }
const fill = (c) => { ctx.fillStyle = c; ctx.fillRect(-300, -300, W + 600, H + 600); };

// ---------- tiny shapes ----------
export function heartShape(x, y, r, fillC, line, lw = 4) {
  shape(() => {
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.8, y - r * 1.25, x, y - r * 0.45);
    ctx.bezierCurveTo(x + r * 0.8, y - r * 1.25, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
  }, { fill: fillC, line, lw });
}
/** 4-point anime sparkle */
export function sparkle(x, y, r, color = P.white, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * 0.22 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.restore();
}
export function star5(x, y, r, color, line, lw = 3, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  shape(() => { for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.48 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); }, { fill: color, line, lw });
  ctx.restore();
}
export function moonShape(x, y, r, color, bg) { disc(x, y, r, color); disc(x + r * 0.45, y - r * 0.25, r * 0.85, bg); }
export function bolt(x, y, s, color, line) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shape(() => { ctx.moveTo(4, -20); ctx.lineTo(-10, 3); ctx.lineTo(0, 3); ctx.lineTo(-5, 20); ctx.lineTo(11, -4); ctx.lineTo(1, -4); ctx.closePath(); }, { fill: color, line, lw: 2.5 / s });
  ctx.restore();
}
/** kawaii face for organs and particles: two dot eyes, a smile, blush. mood: 'happy' | 'calm' | 'wow' | 'sleep' | 'worry' */
export function face(x, y, s, mood = 'happy') {
  const e = 7 * s, gap = 16 * s;
  if (mood === 'sleep') for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(x + k * gap, y - 2 * s, e, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineWidth = 3 * s; ctx.strokeStyle = P.ink; ctx.lineCap = 'round'; ctx.stroke(); }
  else if (mood === 'happy') for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(x + k * gap, y + 2 * s, e, 1.15 * Math.PI, 1.85 * Math.PI); ctx.lineWidth = 3.4 * s; ctx.strokeStyle = P.ink; ctx.lineCap = 'round'; ctx.stroke(); }
  else for (const k of [-1, 1]) { disc(x + k * gap, y, (mood === 'wow' ? 7.5 : 6) * s, P.ink); disc(x + k * gap + 2 * s, y - 2.5 * s, 2.2 * s, P.white); }
  for (const k of [-1, 1]) oval(x + k * gap * 1.55, y + 9 * s, 7 * s, 4 * s, { fill: 'rgba(255,111,156,0.55)' });
  if (mood === 'wow') oval(x, y + 12 * s, 4.5 * s, 6 * s, { fill: P.ink });
  else if (mood === 'worry') { ctx.beginPath(); ctx.arc(x, y + 16 * s, 5 * s, 1.1 * Math.PI, 1.9 * Math.PI); ctx.lineWidth = 3 * s; ctx.strokeStyle = P.ink; ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(x, y + 8 * s, 5 * s, 0.1 * Math.PI, 0.9 * Math.PI); ctx.lineWidth = 3 * s; ctx.strokeStyle = P.ink; ctx.lineCap = 'round'; ctx.stroke(); }
}

// =====================================================================================================
// SETS (backgrounds). Each fills past the frame edges (the camera punches and pushes).
// =====================================================================================================
/** falling sakura petals, pure function of t */
export function petals(t, n = 14, color = '#FFC4DA', area = [0, 0, W, 1300]) {
  const [x0, y0, w, h] = area;
  for (let i = 0; i < n; i++) {
    const sp = 40 + rnd(i) * 50, ph = rnd(i + 9) * h, y = y0 + ((ph + t * sp) % h), x = x0 + rnd(i + 3) * w + Math.sin(t * 1.2 + i) * 30;
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * (0.8 + rnd(i + 5)) + i); oval(0, 0, 11, 6.5, { fill: color }); ctx.restore();
  }
}

/** A · CLASSROOM: pastel wall, chalkboard (chalk text or a doodle fn), window with sakura, desks, a clock */
export function classroom(t, { board = '', doodle = null, petalsOn = true } = {}) {
  fill(P.pinkWall);
  ctx.fillStyle = '#F8D3E0'; ctx.fillRect(-300, 1180, W + 600, 140);                    // wainscot
  ctx.fillStyle = '#EFBFD1'; ctx.fillRect(-300, 1176, W + 600, 10);
  ctx.fillStyle = P.wood; ctx.fillRect(-300, 1320, W + 600, 900);                      // floor
  for (let i = -2; i < 12; i++) polyline([[i * 130 - 40, 1320], [i * 170 - 200, 2100]], P.woodDark, 4);
  // window (left) with blue sky + a sakura branch
  box(-120, 250, 330, 470, 18, { fill: P.white });
  ctx.save(); box(-104, 266, 298, 438, 10, {}); ctx.clip();
  sky(P.sky, '#EAF6FF'); polyline([[-110, 520], [60, 470], [190, 380]], '#A97C66', 16);
  for (let i = 0; i < 9; i++) { const bx = -60 + rnd(i + 70) * 250, by = 360 + rnd(i + 80) * 170; disc(bx, by, 26 + rnd(i) * 10, i % 2 ? '#FFC4DA' : '#FFD6E5'); }
  ctx.restore(); polyline([[45, 262], [45, 708]], P.white, 12); polyline([[-110, 485], [200, 485]], P.white, 12);
  // chalkboard
  box(300, 230, 820, 470, 16, { fill: P.woodDark }); box(318, 248, 784, 434, 10, { fill: P.board });
  box(330, 690, 760, 18, 6, { fill: P.wood, line: P.woodLine, lw: 3 });
  for (const [x, c] of [[420, P.white], [470, P.pinkLight], [520, P.butter]]) box(x, 682, 34, 10, 4, { fill: c });
  if (board) { ctx.save(); ctx.font = '800 64px Inter'; ctx.fillStyle = P.chalk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 0.92; ctx.fillText(board, 700, 400); ctx.restore(); }
  if (doodle) { ctx.save(); doodle(t); ctx.restore(); }
  // clock
  disc(940, 150, 58, P.white, P.lavDeep, 6); polyline([[940, 150], [940, 112]], P.ink, 6); polyline([[940, 150], [966, 160]], P.ink, 5);
  // desks at the sides
  for (const [x, f] of [[-60, 1], [1010, -1]]) {
    box(x - 150, 1260, 300, 34, 10, { fill: P.wood, line: P.woodLine, lw: 4 });
    polyline([[x - 120 * f, 1294], [x - 120 * f, 1520]], P.woodLine, 12); polyline([[x + 110 * f, 1294], [x + 110 * f, 1520]], P.woodLine, 12);
  }
  if (petalsOn) petals(t, 10, '#FFC4DA', [-100, 200, 420, 1100]);
}

/** B · BEDROOM: lavender wall with tiny stars, a window, curtains, fairy lights, bed, rug. night: true = moonlit */
export function bedroom(t, { night = false, lights = 1 } = {}) {
  const wall = night ? '#3A3374' : P.lavLight, dots = night ? 'rgba(255,231,168,0.25)' : 'rgba(142,114,189,0.18)';
  fill(wall);
  for (let i = 0; i < 40; i++) star5((i % 8) * 150 + (Math.floor(i / 8) % 2) * 75 + 20, Math.floor(i / 8) * 260 + 60, 9, dots, null);
  ctx.fillStyle = night ? '#4A3F86' : '#D7C6F1'; ctx.fillRect(-300, 1300, W + 600, 900);           // floor
  ctx.fillStyle = night ? '#2E2860' : '#C6B2EA'; ctx.fillRect(-300, 1296, W + 600, 10);
  oval(540, 1640, 430, 110, { fill: night ? '#6B5AA8' : '#F8C9DC' }); oval(540, 1640, 330, 80, { fill: night ? '#7A68B6' : '#FCDCE8' });
  // window
  box(560, 220, 420, 520, 22, { fill: P.white });
  ctx.save(); box(578, 238, 384, 484, 12, {}); ctx.clip();
  if (night) { sky(P.nightTop, P.nightMid); for (let i = 0; i < 18; i++) sparkle(590 + rnd(i) * 370, 250 + rnd(i + 30) * 440, 5 + 5 * (0.5 + 0.5 * Math.sin(t * 3 + i)), P.butter); moonShape(860, 360, 58, '#FFF3C4', P.nightTop); }
  else { sky(P.skyDeep, '#EAF6FF'); for (const [x, y, s] of [[680, 400, 1], [880, 560, 0.75]]) cloud(x + Math.sin(t * 0.3 + x) * 12, y, s); }
  ctx.restore(); polyline([[770, 236], [770, 724]], P.white, 12); polyline([[576, 480], [964, 480]], P.white, 12);
  // curtains
  for (const [x, f] of [[540, 1], [1000, -1]]) shape(() => { ctx.moveTo(x, 200); ctx.lineTo(x + 90 * f, 200); ctx.quadraticCurveTo(x + 40 * f, 470, x + 70 * f, 780); ctx.lineTo(x, 780); ctx.closePath(); }, { fill: night ? '#B07AB8' : P.pink, line: night ? '#8A5A94' : P.pinkDeep, lw: 4 });
  polyline([[520, 196], [1020, 196]], P.woodLine, 10);
  // fairy lights along the top
  const pts = []; for (let i = 0; i <= 12; i++) pts.push([-40 + i * 100, 110 + Math.sin(i * 1.3) * 10 + (i % 2) * 34]);
  smoothStroke(pts, night ? '#7A6CB0' : '#A08CCB', 3);
  pts.forEach(([x, y], i) => { const on = lights * (0.65 + 0.35 * Math.sin(t * 4 + i * 1.7)); if (night) disc(x, y + 14, 26, `rgba(255,231,168,${0.18 * on})`); disc(x, y + 14, 10, i % 3 === 0 ? P.pink : i % 3 === 1 ? P.butter : P.mint, 'rgba(0,0,0,0.12)', 2); });
  // shelf with books + plush
  box(40, 520, 380, 22, 6, { fill: P.wood, line: P.woodLine, lw: 3 });
  [[70, P.pink], [110, P.mint], [146, P.butter], [182, P.lav]].forEach(([x, c], i) => box(x, 410 + (i % 2) * 14, 32, 110 - (i % 2) * 14, 5, { fill: c, line: 'rgba(42,26,58,0.35)', lw: 3 }));
  bunny(330, 470, 0.9);
  // bed (left)
  box(-160, 1080, 520, 300, 30, { fill: night ? '#8C7BC8' : P.white, line: night ? '#5E4F9A' : '#D8CBEF', lw: 5 });
  box(-160, 1150, 500, 230, 30, { fill: night ? '#C08BC9' : P.pink, line: night ? '#8A5A94' : P.pinkDeep, lw: 5 });
  oval(70, 1110, 120, 46, { fill: night ? '#E2D9FF' : P.cream, line: night ? '#8C7BC8' : '#E8D3DC', lw: 4 });
  for (let i = 0; i < 5; i++) heartShape(-90 + i * 90, 1250 + (i % 2) * 50, 14, night ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.7)');
}
export function bunny(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  for (const k of [-1, 1]) oval(k * 16, -62, 12, 32, { fill: P.white, line: '#D8C5D6', lw: 3 }, k * 0.15);
  oval(0, -14, 40, 34, { fill: P.white, line: '#D8C5D6', lw: 3 }); oval(0, 30, 34, 26, { fill: P.white, line: '#D8C5D6', lw: 3 });
  face(0, -14, 0.8, 'calm'); ctx.restore();
}
export function cloud(x, y, s = 1, color = P.white) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  for (const [dx, dy, r] of [[-70, 10, 46], [-20, -18, 62], [45, -4, 52], [90, 14, 38]]) disc(dx, dy, r, color);
  ctx.fillStyle = color; ctx.fillRect(-110, 10, 210, 44); ctx.restore();
}

/** C · NIGHT SKY: deep indigo to violet, twinkling stars, a crescent moon (optional sleepy face), soft clouds */
export function nightSky(t, { moon = true, moonFace = false, shooting = null, roofs = true } = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.nightTop); g.addColorStop(0.55, P.nightMid); g.addColorStop(1, P.nightLow);
  ctx.fillStyle = g; ctx.fillRect(-300, -300, W + 600, H + 600);
  for (let i = 0; i < 46; i++) { const x = rnd(i) * (W + 200) - 100, y = rnd(i + 100) * 1500 - 100, tw = 0.5 + 0.5 * Math.sin(t * (2 + rnd(i + 7) * 3) + i); sparkle(x, y, 4 + 9 * tw * rnd(i + 50), i % 5 ? P.white : P.butter); }
  if (moon) { disc(820, 300, 150, 'rgba(255,243,196,0.10)'); disc(820, 300, 110, 'rgba(255,243,196,0.12)'); moonShape(820, 300, 92, '#FFF3C4', P.nightTop); if (moonFace) face(790, 320, 1.2, 'sleep'); }
  if (shooting != null && shooting >= 0 && shooting < 1) { const x = lerp(1100, 200, eo(shooting)), y = lerp(80, 520, eo(shooting)); ctx.globalAlpha = 1 - shooting; polyline([[x, y], [x + 220, y - 120]], 'rgba(255,255,255,0.6)', 6); sparkle(x, y, 22, P.white); ctx.globalAlpha = 1; }
  for (let i = 0; i < 4; i++) cloud(((i * 330 + t * 14) % 1500) - 200, 1180 + (i % 2) * 70, 1.2, 'rgba(255,255,255,0.13)');
  if (roofs) {
    ctx.fillStyle = '#2B2558';
    ctx.beginPath(); ctx.moveTo(-300, 1500); for (const [x, y] of [[-40, 1500], [-40, 1330], [90, 1250], [220, 1330], [220, 1420], [420, 1420], [420, 1360], [560, 1290], [700, 1360], [700, 1460], [880, 1460], [880, 1300], [1010, 1220], [1140, 1300], [1400, 1300]]) ctx.lineTo(x, y); ctx.lineTo(1400, 2300); ctx.lineTo(-300, 2300); ctx.fill();
    for (const [x, y, on] of [[40, 1380, 1], [150, 1380, 0], [480, 1390, 1], [930, 1340, 1], [1060, 1340, 0]]) box(x, y, 40, 46, 6, { fill: on ? '#FFE7A8' : '#3E3678' });
  }
}

/** D · INSIDE THE BODY: soft pink (or tint) cave, drifting round cells, background vessels with flowing dots */
const TINTS = { pink: ['#FFD3DF', '#FF9DB7', '#FFE1E9'], lav: ['#E6D9FF', '#B39AF0', '#F1EBFF'], peach: ['#FFE0CC', '#FFB08F', '#FFEDE2'], night: ['#3B3373', '#25204F', '#4E4590'] };
export function insideBody(t, { tint = 'pink', vessels = true } = {}) {
  const [a, b, c] = TINTS[tint] || TINTS.pink;
  const g = ctx.createRadialGradient(540, 760, 120, 540, 900, 1300); g.addColorStop(0, a); g.addColorStop(1, b);
  ctx.fillStyle = g; ctx.fillRect(-300, -300, W + 600, H + 600);
  if (vessels) for (let k = 0; k < 3; k++) {
    const pts = []; for (let i = 0; i <= 8; i++) pts.push([-200 + i * 190, 260 + k * 560 + Math.sin(i * 0.9 + k * 2) * 90]);
    smoothStroke(pts, 'rgba(255,255,255,0.22)', 70); smoothStroke(pts, 'rgba(226,98,142,0.13)', 46);
    for (let i = 0; i < 6; i++) { const [x, y] = along(pts, ((t * 0.06 + i / 6 + k * 0.13) % 1)); disc(x, y, 12, 'rgba(240,72,92,0.35)'); }
  }
  for (let i = 0; i < 16; i++) {
    const x = (rnd(i) * (W + 300) - 150 + Math.sin(t * 0.5 + i) * 30), y = ((rnd(i + 20) * 2100 - t * (12 + rnd(i) * 18)) % 2100 + 2100) % 2100 - 100, r = 24 + rnd(i + 40) * 50;
    disc(x, y, r, c); disc(x - r * 0.3, y - r * 0.3, r * 0.28, 'rgba(255,255,255,0.55)');
  }
}

/** E · X-RAY BOARD: the channel's signature navy with a faint heart grid and a slow scan band (behind x-ray Sakumai) */
export function xrayBoard(t = 0) {
  fill(P.navy);
  for (let x = 40; x < W + 80; x += 90) for (let y = 40; y < H + 80; y += 90) heartShape(x, y, 6, 'rgba(169,155,240,0.16)');
  const y = ((t * 160) % 2400) - 300; ctx.fillStyle = 'rgba(169,155,240,0.10)'; ctx.fillRect(-300, y, W + 600, 80);
}

/** F · SUNSET STREET: the reference's walk-home look (lavender → pink sky, sun, houses, wires) */
export function sunsetStreet(t) {
  sky('#B79BE0', '#F7C2C9');
  disc(760, 1150, 210, 'rgba(255,227,196,0.5)'); disc(760, 1150, 170, '#FFE3C4');
  polyline([[-100, 330], [1180, 430]], 'rgba(90,70,130,0.5)', 3); polyline([[-100, 380], [1180, 470]], 'rgba(90,70,130,0.5)', 3);
  for (const [x, w, h, c] of [[-40, 260, 420, '#9C7FC9'], [210, 200, 330, '#A88BD3'], [600, 230, 380, '#9C7FC9'], [820, 300, 460, '#8E72BD']]) {
    ctx.fillStyle = c; ctx.fillRect(x, 1380 - h, w, h);
    ctx.fillStyle = '#FFE7A8'; for (let i = 0; i < 3; i++) ctx.fillRect(x + 40 + i * 60, 1380 - h + 60, 26, 34);
  }
  ctx.fillStyle = '#E9D7EE'; ctx.fillRect(-300, 1380, W + 600, 900);
  ctx.fillStyle = P.white; for (let x = 40; x < W; x += 220) ctx.fillRect(x, 1790, 120, 14);
  for (const [x, y, r, k] of [[150, 300, 16, 0], [930, 260, 12, 1], [520, 180, 10, 2]]) heartShape(x, y + Math.sin(t * 2 + k) * 10, r, 'rgba(255,111,156,0.55)');
}

/** G · REACTION RAYS: anime sunburst for big feelings (shock, love, "wait, what?") */
export function rays(t, a = P.pinkLight, b = P.pinkWall, cx = 540, cy = 760, n = 18) {
  fill(b); ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.25); ctx.fillStyle = a;
  for (let i = 0; i < n; i++) { const a0 = i / n * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 2400, a0, a0 + TAU / n / 2); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
/** H · SOFT PASTEL: a plain gradient + floating hearts (titles, cards, close-ups) */
export function pastel(t, top = '#FBD0E0', bottom = '#FFF0F5', hearts = true) {
  sky(top, bottom);
  if (hearts) for (let i = 0; i < 10; i++) heartShape(rnd(i) * W, ((rnd(i + 5) * 2000 - t * 40 * (0.6 + rnd(i + 2))) % 2000 + 2000) % 2000 - 40, 10 + rnd(i + 8) * 14, 'rgba(255,111,156,0.22)');
}

// =====================================================================================================
// BODY KIT. Screen space (x, y = centre, s = scale). Flat pastel fills, one darker line, one light highlight.
// face: a kawaii mood ('happy' | 'calm' | 'wow' | 'sleep' | 'worry') or null for none.
// They also work inside x-ray Sakumai: pass inside: (c, A) => K.heart(A.heart[0], A.heart[1], 0.5, beat)
// (inside() runs in her model space, where 1 unit ≈ 1 px at s: 1).
// =====================================================================================================
export function heart(x, y, s = 1, beat = 0, faceMood = null) {
  const k = s * (1 + 0.14 * beat);
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate(-0.12);
  for (const [dx, c] of [[-22, P.skyDeep], [16, P.organDark]]) box(dx - 14, -118, 28, 70, 14, { fill: c, line: P.line, lw: 4 });
  shape(() => { ctx.moveTo(-6, -84); ctx.quadraticCurveTo(40, -136, 70, -96); ctx.lineTo(56, -80); ctx.quadraticCurveTo(36, -106, 10, -72); ctx.closePath(); }, { fill: P.organDark, line: P.line, lw: 4 });
  shape(() => { ctx.moveTo(0, 92); ctx.bezierCurveTo(-120, 30, -100, -90, -30, -80); ctx.quadraticCurveTo(0, -76, 8, -54); ctx.quadraticCurveTo(20, -88, 54, -84); ctx.bezierCurveTo(118, -74, 110, 34, 0, 92); }, { fill: P.rose, line: P.line, lw: 5 });
  oval(-46, -36, 18, 26, { fill: 'rgba(255,255,255,0.45)' }, 0.5);
  polyline([[10, -50], [18, 10], [6, 60]], 'rgba(122,66,88,0.35)', 4);
  if (faceMood) face(0, 0, 1.4, faceMood);
  ctx.restore();
}
export function brain(x, y, s = 1, { glow = 0, spot = [40, 20], faceMood = null, sparkT = null } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shape(() => { ctx.moveTo(-10, 70); ctx.quadraticCurveTo(-4, 120, 10, 130); ctx.lineTo(38, 128); ctx.quadraticCurveTo(26, 100, 30, 66); ctx.closePath(); }, { fill: P.brainDark, line: P.line, lw: 4 });
  oval(70, 82, 46, 30, { fill: P.brainDark, line: P.line, lw: 4 }, -0.2);
  shape(() => {
    const b = [[-150, 10], [-140, -60], [-90, -112], [-20, -130], [50, -124], [118, -86], [152, -20], [140, 46], [84, 82], [10, 86], [-70, 80], [-128, 56]];
    ctx.moveTo(b[0][0], b[0][1]);
    for (let i = 0; i < b.length; i++) { const p = b[(i + 1) % b.length], q = b[i], mx = (q[0] + p[0]) / 2, my = (q[1] + p[1]) / 2, out = 1.18; ctx.quadraticCurveTo(mx * out, my * out, p[0], p[1]); }
    ctx.closePath();
  }, { fill: P.brain, line: P.line, lw: 5 });
  for (const pts of [[[-110, -40], [-70, -60], [-50, -20], [-90, 10]], [[-30, -100], [-10, -60], [30, -80], [60, -50]], [[80, -70], [100, -20], [70, 10]], [[-60, 40], [-10, 20], [30, 50], [80, 40]], [[0, -20], [20, 10]]]) smoothStroke(pts, P.brainDark, 5);
  oval(-60, -80, 28, 14, { fill: 'rgba(255,255,255,0.45)' }, -0.4);
  if (glow > 0) {
    const [gx, gy] = spot;
    for (const [r, a] of [[90, 0.18], [60, 0.3], [34, 0.6]]) disc(gx, gy, r * (0.7 + 0.3 * glow), `rgba(255,212,59,${a * glow})`);
    if (sparkT != null) for (let i = 0; i < 5; i++) { const an = i / 5 * TAU + sparkT * 2, r = 70 + 30 * Math.sin(sparkT * 5 + i); sparkle(gx + Math.cos(an) * r, gy + Math.sin(an) * r * 0.8, 12 * glow, P.white); }
  }
  if (faceMood) face(-20, 10, 1.5, faceMood);
  ctx.restore();
}
export function lungs(x, y, s = 1, breath = 0, faceMood = null) {
  const k = 1 + 0.1 * breath;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  box(-14, -150, 28, 90, 12, { fill: P.lavLight, line: P.line, lw: 4 });
  for (let i = 0; i < 4; i++) polyline([[-12, -140 + i * 20], [12, -140 + i * 20]], P.lilac, 4);
  polyline([[0, -64], [-40, -30]], P.lavLight, 18); polyline([[0, -64], [40, -30]], P.lavLight, 18);
  for (const sd of [-1, 1]) {
    ctx.save(); ctx.scale(sd * k, k);
    shape(() => { ctx.moveTo(20, -70); ctx.bezierCurveTo(70, -110, 130, -40, 128, 40); ctx.bezierCurveTo(126, 110, 60, 120, 26, 96); ctx.quadraticCurveTo(14, 20, 20, -70); }, { fill: P.lung, line: P.line, lw: 5 });
    oval(74, -10, 18, 30, { fill: 'rgba(255,255,255,0.4)' }, 0.3);
    smoothStroke([[30, -30], [62, 10], [90, 50]], P.lungDark, 4); ctx.restore();
  }
  if (faceMood) face(0, 50, 1.2, faceMood);
  ctx.restore();
}
export function stomach(x, y, s = 1, squeeze = 0, faceMood = null) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (1 - 0.06 * squeeze), s * (1 + 0.04 * squeeze));
  box(-58, -120, 30, 60, 14, { fill: P.tummy, line: P.line, lw: 4 });
  shape(() => { ctx.moveTo(-48, -70); ctx.bezierCurveTo(-120, -40, -110, 90, 10, 92); ctx.bezierCurveTo(90, 92, 120, 40, 100, 70); ctx.lineTo(118, 50); ctx.bezierCurveTo(140, -20, 60, 0, 20, -10); ctx.quadraticCurveTo(-10, -40, -26, -76); ctx.closePath(); }, { fill: P.tummy, line: P.line, lw: 5 });
  oval(-52, 8, 16, 26, { fill: 'rgba(255,255,255,0.45)' }, 0.4);
  smoothStroke([[-30, 40], [10, 56], [60, 46]], P.tummyDark, 4);
  if (faceMood) face(-6, 30, 1.2, faceMood);
  ctx.restore();
}
/** a nerve: a soft yellow line with sparks travelling along it. u = where the main spark is (0..1), or null for a loop */
export function nerve(pts, t, { u = null, color = P.butter, w = 10, sparks = 3, alpha = 1 } = {}) {
  ctx.save(); ctx.globalAlpha *= alpha;
  smoothStroke(pts, 'rgba(255,212,59,0.25)', w + 14); smoothStroke(pts, P.butter, w); smoothStroke(pts, P.white, w * 0.3);
  const list = u != null ? [u] : Array.from({ length: sparks }, (_, i) => (t * 0.7 + i / sparks) % 1);
  for (const v of list) { if (v < 0 || v > 1) continue; const [x, y] = along(pts, v); disc(x, y, w * 1.8, 'rgba(255,212,59,0.35)'); sparkle(x, y, w * 2.2, P.yellow); disc(x, y, w * 0.5, P.white); }
  ctx.restore();
}
/** a neuron cell: round body with branches; fire 0..1 lights it */
export function neuron(x, y, s = 1, fire = 0, t = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3; polyline([[0, 0], [Math.cos(a) * 70, Math.sin(a) * 70], [Math.cos(a + 0.3) * 100, Math.sin(a + 0.3) * 100]], fire > 0.5 ? P.yellow : P.lilac, 10); }
  if (fire > 0) disc(0, 0, 70 * fire, `rgba(255,212,59,${0.3 * fire})`);
  disc(0, 0, 40, fire > 0.5 ? P.butter : P.lavLight, P.line, 4); face(0, 2, 0.9, fire > 0.5 ? 'wow' : 'calm');
  ctx.restore();
}
/** a blood vessel tube along pts with blood cells flowing (flow = speed; width w) */
export function vessel(pts, t, { w = 40, flow = 1, color = P.blood, cells = 6 } = {}) {
  smoothStroke(pts, P.line, w + 8); smoothStroke(pts, '#FFB3BD', w); smoothStroke(pts, 'rgba(255,255,255,0.35)', w * 0.25);
  for (let i = 0; i < cells; i++) { const [x, y, a] = along(pts, ((t * 0.35 * flow + i / cells) % 1 + 1) % 1); bloodCell(x, y, w / 60, a); }
}
export function bloodCell(x, y, s = 1, rot = 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); oval(0, 0, 22 * s, 16 * s, { fill: P.blood, line: '#B32640', lw: 2.5 * s }); oval(0, 0, 9 * s, 6 * s, { fill: '#C93048' }); ctx.restore(); }

/** HORMONES as cute particles. kind: dopamine (yellow star) · serotonin (mint round) · oxytocin (pink heart) ·
 *  adrenaline (orange bolt) · cortisol (coral drop) · melatonin (lavender moon) */
export const HORMONES = {
  dopamine: { color: P.yellow, dark: '#D9A400', label: 'DOPAMINE' },
  serotonin: { color: P.mint, dark: P.mintDeep, label: 'SEROTONIN' },
  oxytocin: { color: P.rose, dark: '#C9406E', label: 'OXYTOCIN' },
  adrenaline: { color: P.orange, dark: '#D1761F', label: 'ADRENALINE' },
  cortisol: { color: P.coral, dark: '#C95A4C', label: 'CORTISOL' },
  melatonin: { color: P.lilac, dark: P.lavDeep, label: 'MELATONIN' },
};
export function hormone(kind, x, y, s = 1, rot = 0, faceOn = true) {
  const h = HORMONES[kind] || HORMONES.dopamine;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  if (kind === 'dopamine') star5(0, 0, 30, h.color, h.dark, 3);
  else if (kind === 'oxytocin') heartShape(0, 2, 24, h.color, h.dark, 3);
  else if (kind === 'adrenaline') bolt(0, 0, 1.6, h.color, h.dark);
  else if (kind === 'cortisol') shape(() => { ctx.moveTo(0, -30); ctx.quadraticCurveTo(26, 4, 20, 14); ctx.arc(0, 12, 20, 0, Math.PI); ctx.quadraticCurveTo(-26, 4, 0, -30); }, { fill: h.color, line: h.dark, lw: 3 });
  else if (kind === 'melatonin') { disc(0, 0, 26, h.color, h.dark, 3); moonShape(-2, 2, 15, '#FFF3C4', h.color); }
  else disc(0, 0, 24, h.color, h.dark, 3);
  if (faceOn && kind !== 'adrenaline' && kind !== 'melatonin') { ctx.rotate(-rot); face(0, 2, 0.55, 'happy'); }
  ctx.restore();
}
/** a cloud of hormone particles from (x, y) spreading over radius R; amount 0..1 = how many are out */
export function hormoneCloud(kind, x, y, R, t, amount = 1, n = 14, s = 1) {
  for (let i = 0; i < n; i++) {
    const born = rnd(i + 11); if (amount < born) continue;
    const k = clamp((amount - born) * 3), a = rnd(i) * TAU + t * 0.4 * (rnd(i + 3) - 0.5), r = R * (0.25 + 0.75 * rnd(i + 7)) * eo(k);
    hormone(kind, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8 + Math.sin(t * 3 + i) * 8, s * (0.7 + 0.5 * rnd(i + 21)) * eob(clamp(k * 1.4)), Math.sin(t * 2 + i) * 0.3);
  }
}
/** a stream of hormone particles along a path (e.g. brain → body); amount 0..1 */
export function hormoneStream(kind, pts, t, { n = 8, speed = 0.45, s = 0.8, amount = 1 } = {}) {
  for (let i = 0; i < n; i++) { if (i / n > amount) continue; const [x, y] = along(pts, (t * speed + i / n) % 1); hormone(kind, x, y, s, Math.sin(t * 3 + i) * 0.3); }
}

/** SKIN CUTAWAY: a slice of skin with one hair, its follicle and the tiny arrector pili muscle.
 *  goose 0..1: the muscle tightens, the hair stands up, a goosebump rises. 760x620 box centred at x, y (screen).
 *  hairLabel / muscleLabel 0..1 pop their tags in (animate them on their words). */
export function skinCutaway(x, y, s = 1, goose = 0, t = 0, { hairLabel = 0, muscleLabel = 0 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const w = 760, h = 620, top = -200;
  ctx.save(); box(-w / 2, -h / 2, w, h, 40, {}); ctx.clip();
  ctx.fillStyle = '#EAF6FF'; ctx.fillRect(-w / 2, -h / 2, w, h);                    // air
  const bump = 70 * eo(goose);
  const surf = (xx) => top - bump * Math.exp(-(xx * xx) / (2 * 90 * 90));
  shape(() => { ctx.moveTo(-w / 2, surf(-w / 2)); for (let xx = -w / 2; xx <= w / 2; xx += 10) ctx.lineTo(xx, surf(xx)); ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w / 2, h / 2); ctx.closePath(); }, { fill: P.dermis });
  shape(() => { ctx.moveTo(-w / 2, surf(-w / 2)); for (let xx = -w / 2; xx <= w / 2; xx += 10) ctx.lineTo(xx, surf(xx)); for (let xx = w / 2; xx >= -w / 2; xx -= 10) ctx.lineTo(xx, surf(xx) + 56); ctx.closePath(); }, { fill: P.skin });
  ctx.beginPath(); for (let xx = -w / 2; xx <= w / 2; xx += 10) ctx.lineTo(xx, surf(xx)); ctx.lineWidth = 5; ctx.strokeStyle = P.line; ctx.stroke();
  for (let i = 0; i < 7; i++) disc(-300 + i * 100 + (i % 2) * 30, 150 + (i % 3) * 40, 16, 'rgba(255,255,255,0.35)');
  // follicle (tilted) + hair
  const fx = 20, fy = 120, ang = lerp(-0.62, -0.06, eio(goose));                    // hair angle from vertical
  const base = [fx, fy], tip = [fx + Math.sin(ang) * 520, fy - Math.cos(ang) * 520];
  shape(() => { ctx.ellipse(fx + Math.sin(ang) * 140, fy - Math.cos(ang) * 140, 34, 170, ang, 0, TAU); }, { fill: '#F5B3B7', line: P.dermisDark, lw: 4 });
  oval(fx, fy, 30, 26, { fill: P.dermisDark, line: P.line, lw: 4 });
  polyline([base, tip], '#6B4A5C', 12);
  // arrector pili: from the follicle's side to under the surface; contracts (shorter, thicker) with goose
  const m0 = [fx + Math.sin(ang) * 90 + 26, fy - Math.cos(ang) * 90], m1 = [lerp(220, 170, eio(goose)), top + 70 - bump * 0.3];
  polyline([m0, m1], P.line, 30 + 14 * goose); polyline([m0, m1], P.muscle, 22 + 14 * goose);
  for (let i = 1; i < 4; i++) { const k = i / 4; polyline([[lerp(m0[0], m1[0], k) - 6, lerp(m0[1], m1[1], k) - 8], [lerp(m0[0], m1[0], k) + 6, lerp(m0[1], m1[1], k) + 8]], 'rgba(122,66,88,0.4)', 3); }
  if (goose > 0.3) for (const sd of [-1, 1]) for (let i = 0; i < 2; i++) polyline([[m1[0] + sd * (30 + i * 16), m1[1] - 20 + i * 30], [m1[0] + sd * (48 + i * 16), m1[1] - 26 + i * 30]], P.orange, 5);
  ctx.restore();
  box(-w / 2, -h / 2, w, h, 40, { line: P.ink, lw: 8 });
  const hm = along([base, tip], 0.62);
  tag('HAIR', -230, -250, hm[0], hm[1], 52, eob(clamp(hairLabel)));
  tag('TINY MUSCLE', 150, 235, (m0[0] + m1[0]) / 2, (m0[1] + m1[1]) / 2, 52, eob(clamp(muscleLabel)));
  ctx.restore();
}

// ---------- music + sound ----------
export function note(x, y, s = 1, color = P.lavDeep, kind = 0, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  if (kind === 1) { oval(-24, 24, 16, 12, { fill: color }, -0.4); oval(24, 14, 16, 12, { fill: color }, -0.4); polyline([[-10, 22], [-10, -36], [38, -46], [38, 12]], color, 7, 'butt'); polyline([[-10, -28], [38, -38]], color, 12, 'butt'); }
  else { oval(0, 24, 18, 13, { fill: color }, -0.4); polyline([[15, 20], [15, -40]], color, 7, 'butt'); shape(() => { ctx.moveTo(15, -40); ctx.quadraticCurveTo(40, -24, 34, 0); ctx.quadraticCurveTo(30, -20, 15, -24); ctx.closePath(); }, { fill: color }); }
  ctx.restore();
}
/** notes drifting up from (x, y) over width w; amount 0..1 */
export function notes(t, x, y, { w = 300, n = 7, amount = 1, colors = [P.lavDeep, P.rose, P.mintDeep] } = {}) {
  for (let i = 0; i < n; i++) {
    if (i / n >= amount) continue;
    const u = (t * 0.35 + rnd(i)) % 1, nx = x + (rnd(i + 5) - 0.5) * w + Math.sin(t * 2 + i) * 30, ny = y - u * 520;
    ctx.globalAlpha = Math.sin(u * Math.PI); note(nx, ny, 0.9 + rnd(i + 3) * 0.6, colors[i % colors.length], i % 2, Math.sin(t * 3 + i) * 0.25); ctx.globalAlpha = 1;
  }
}
export function soundWaves(x, y, r, t, color = P.lavDeep, side = 1) {
  for (let i = 0; i < 3; i++) { const u = (t * 1.4 + i / 3) % 1; ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.arc(x, y, r + u * r * 1.6, side > 0 ? -0.6 : Math.PI - 0.6, side > 0 ? 0.6 : Math.PI + 0.6); ctx.lineWidth = 9; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.stroke(); }
  ctx.globalAlpha = 1;
}
/** headphones prop for cast('sakumai').draw({ prop: K.headphones }): drawn in her body space, over her head */
export function headphones(c) {
  c.save();
  c.beginPath(); c.moveTo(-132, -716); c.bezierCurveTo(-150, -930, 150, -930, 132, -716);
  c.lineWidth = 22; c.strokeStyle = '#5E4F9A'; c.lineCap = 'round'; c.stroke(); c.lineWidth = 12; c.strokeStyle = P.lilac; c.stroke();
  for (const sd of [-1, 1]) {
    c.beginPath(); c.ellipse(sd * 134, -706, 30, 46, 0, 0, TAU); c.fillStyle = P.lilac; c.fill(); c.lineWidth = 5; c.strokeStyle = '#5E4F9A'; c.stroke();
    c.beginPath(); c.ellipse(sd * 140, -706, 14, 26, 0, 0, TAU); c.fillStyle = P.pink; c.fill();
    heartShape(sd * 140, -708, 7, P.white);
  }
  c.restore();
}

// =====================================================================================================
// GRAPHICS
// =====================================================================================================
export function pill(text, x, y, size = 54, bg = P.ink, fg = P.white, sc = 1) {
  if (sc <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.font = `900 ${size}px Inter`; const w = ctx.measureText(text).width + size * 1.1, h = size * 1.45;
  box(-w / 2, -h / 2 + 6, w, h, h / 2, { fill: 'rgba(42,26,58,0.25)' });
  box(-w / 2, -h / 2, w, h, h / 2, { fill: bg, line: P.ink, lw: 5 });
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 2);
  ctx.restore();
}
/** a label with a leader line to a target point (tx, ty) */
export function tag(text, x, y, tx, ty, size = 48, sc = 1, bg = P.white) {
  if (sc <= 0) return;
  ctx.save(); ctx.globalAlpha *= clamp(sc);
  polyline([[x, y], [lerp(x, tx, clamp(sc)), lerp(y, ty, clamp(sc))]], P.ink, 6); disc(tx, ty, 11 * clamp(sc), P.ink); disc(tx, ty, 6 * clamp(sc), P.yellow);
  ctx.restore(); pill(text, x, y, size, bg, P.ink, sc);
}
export function bubble(x, y, w, h, tx, ty, { fillC = P.white, text = null, size = 54, color = P.ink, sc = 1 } = {}) {
  if (sc <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  shape(() => { ctx.roundRect(-w / 2, -h / 2, w, h, 40); ctx.moveTo(-26, h / 2 - 2); ctx.lineTo((tx - x) / sc, (ty - y) / sc); ctx.lineTo(26, h / 2 - 2); }, { fill: fillC, line: P.ink, lw: 6 });
  box(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 36, { fill: fillC });
  if (text) { ctx.font = `900 ${size}px Inter`; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; text.split('\n').forEach((l, i, a) => ctx.fillText(l, 0, (i - (a.length - 1) / 2) * size * 1.1 + 2)); }
  ctx.restore();
}
export function thought(x, y, r, tx, ty, sc = 1, fillC = P.white) {
  if (sc <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  const puffs = [[-0.6, -0.1, 0.55], [-0.2, -0.45, 0.6], [0.3, -0.4, 0.55], [0.62, 0, 0.5], [0.25, 0.32, 0.55], [-0.3, 0.3, 0.55]];
  for (const [dx, dy, k] of puffs) disc(dx * r, dy * r, k * r + 6, P.ink);
  for (const [dx, dy, k] of puffs) disc(dx * r, dy * r, k * r, fillC);
  ctx.restore();
  for (let i = 1; i <= 2; i++) { const k = i / 3; disc(lerp(x, tx, 0.5 + k * 0.4), lerp(y + r * 0.6, ty, 0.5 + k * 0.4), (16 - i * 4) * sc, fillC, P.ink, 4); }
}
export function redX(x, y, s = 1, a = 1) {
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s);
  for (const r of [0.78, -0.78]) { ctx.save(); ctx.rotate(r); box(-150, -30, 300, 60, 30, { fill: P.red, line: P.ink, lw: 8 }); ctx.restore(); }
  ctx.restore();
}
export function check(x, y, s = 1, a = 1) {
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s);
  disc(0, 0, 120, P.mint, P.ink, 8); polyline([[-55, 0], [-12, 42], [60, -45]], P.ink, 30); polyline([[-55, 0], [-12, 42], [60, -45]], P.white, 16);
  ctx.restore();
}
export function arrow(x, y, len, ang = 0, a = 1, color = P.ink) {
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(ang);
  polyline([[0, 0], [len - 30, 0]], color, 18); shape(() => { ctx.moveTo(len, 0); ctx.lineTo(len - 50, -36); ctx.lineTo(len - 50, 36); ctx.closePath(); }, { fill: color, line: color, lw: 8 });
  ctx.restore();
}
/** anime impact lines around a point (shock, realisation) */
export function impact(x, y, r, a = 1, t = 0, color = P.ink) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  for (let i = 0; i < 12; i++) { const an = i / 12 * TAU + 0.13, j = 0.85 + 0.15 * Math.sin(t * 20 + i * 3); polyline([[x + Math.cos(an) * r * j, y + Math.sin(an) * r * j], [x + Math.cos(an) * (r * j + 60), y + Math.sin(an) * (r * j + 60)]], color, 9); }
  ctx.restore();
}
/** kira-kira: sparkles twinkling around a point */
export function sparkles(x, y, R, t, a = 1, n = 7, color = P.white) {
  if (a <= 0) return;
  for (let i = 0; i < n; i++) { const an = rnd(i) * TAU + t * 0.5, rr = R * (0.6 + 0.4 * rnd(i + 3)), tw = 0.5 + 0.5 * Math.sin(t * 6 + i * 2); sparkle(x + Math.cos(an) * rr, y + Math.sin(an) * rr, (10 + 16 * tw) * a, color, t); }
}
/** hearts floating up from (x, y) */
export function floatHearts(x, y, t, a = 1, n = 6, w = 260) {
  if (a <= 0) return;
  for (let i = 0; i < n; i++) { const u = (t * 0.5 + rnd(i)) % 1; ctx.globalAlpha = a * Math.sin(u * Math.PI); heartShape(x + (rnd(i + 4) - 0.5) * w + Math.sin(t * 2 + i) * 20, y - u * 380, 14 + rnd(i + 2) * 14, P.rose); }
  ctx.globalAlpha = 1;
}
/** cute SFX word ("BA-DUM!", "WAIT?!") with a plum outline */
export function fx(text, x, y, size, fillC = P.white, rot = 0, sc = 1) {
  if (sc <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
  ctx.font = `900 ${size}px Inter`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.22; ctx.strokeStyle = P.ink; ctx.strokeText(text, 0, size * 0.06); ctx.strokeText(text, 0, 0);
  ctx.fillStyle = fillC; ctx.fillText(text, 0, 0); ctx.restore();
}
/** a level meter (e.g. DOPAMINE): value 0..1, filled with the hormone's colour + particles at the tip */
export function meter(x, y, w, value, label, color = P.yellow, t = 0, sc = 1) {
  if (sc <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  const h = 70; box(-w / 2, -h / 2 + 6, w, h, h / 2, { fill: 'rgba(42,26,58,0.25)' });
  box(-w / 2, -h / 2, w, h, h / 2, { fill: P.white, line: P.ink, lw: 6 });
  const fw = Math.max(h - 16, (w - 16) * clamp(value)); box(-w / 2 + 8, -h / 2 + 8, fw, h - 16, (h - 16) / 2, { fill: color });
  for (let i = 0; i < 3; i++) sparkle(-w / 2 + 8 + fw - 20 - i * 40, -4 + Math.sin(t * 6 + i) * 6, 9, P.white);
  if (label) { ctx.font = '900 56px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineWidth = 14; ctx.strokeStyle = P.ink; ctx.lineJoin = 'round'; ctx.strokeText(label, 0, -h / 2 - 16); ctx.fillStyle = P.white; ctx.fillText(label, 0, -h / 2 - 16); }
  ctx.restore();
}
/** a phone screen card (texts from a crush, a timer…); content(ctx) draws inside a 300x520 screen at origin */
export function phone(x, y, s = 1, rot = 0, content = null) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  box(-170, -300, 340, 600, 50, { fill: P.ink }); box(-150, -270, 300, 540, 30, { fill: P.cream });
  box(-40, -288, 80, 10, 5, { fill: '#4A3A5A' });
  if (content) { ctx.save(); box(-150, -270, 300, 540, 30, {}); ctx.clip(); content(ctx); ctx.restore(); }
  ctx.restore();
}

// =====================================================================================================
// TRANSITIONS (signature: the heart iris). Use inside a shot's draw: K.iris(lt, () => { …the shot… }).
// The new shot is revealed through a growing heart over a pastel pink; 'circle' and 'star' work too.
// =====================================================================================================
export function iris(lt, drawFn, { shape: sh = 'heart', dur = 0.38, color = P.pink, cx = 540, cy = 860 } = {}) {
  if (lt >= dur) return drawFn();
  fill(color);
  for (let i = 0; i < 8; i++) heartShape(rnd(i) * W, rnd(i + 1) * H, 18 + rnd(i + 2) * 20, 'rgba(255,255,255,0.35)');
  const r = 40 + 1500 * eio(clamp(lt / dur));
  ctx.save(); ctx.beginPath();
  if (sh === 'heart') { ctx.moveTo(cx, cy + r * 0.9); ctx.bezierCurveTo(cx - r * 1.5, cy - r * 0.1, cx - r * 0.8, cy - r * 1.25, cx, cy - r * 0.45); ctx.bezierCurveTo(cx + r * 0.8, cy - r * 1.25, cx + r * 1.5, cy - r * 0.1, cx, cy + r * 0.9); }
  else if (sh === 'star') for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.5 : r; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  else ctx.arc(cx, cy, r, 0, TAU);
  ctx.closePath(); ctx.clip(); drawFn(); ctx.restore();
  heartOutline(sh, cx, cy, r);
}
function heartOutline(sh, cx, cy, r) {
  if (sh !== 'heart') return;
  ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.9); ctx.bezierCurveTo(cx - r * 1.5, cy - r * 0.1, cx - r * 0.8, cy - r * 1.25, cx, cy - r * 0.45); ctx.bezierCurveTo(cx + r * 0.8, cy - r * 1.25, cx + r * 1.5, cy - r * 0.1, cx, cy + r * 0.9);
  ctx.lineWidth = 14; ctx.strokeStyle = P.white; ctx.stroke();
}
/** diagonal pastel stripes sweep across and reveal the new shot */
export function wipe(lt, drawFn, { dur = 0.34, colors = [P.pink, P.lilac, P.butter] } = {}) {
  drawFn();
  if (lt >= dur) return;
  const k = eio(clamp(lt / dur));
  ctx.save(); ctx.translate(540, 960); ctx.rotate(-0.5);
  colors.forEach((c, i) => { const x = lerp(-1400, 1600, k) - i * 260; ctx.fillStyle = c; ctx.fillRect(x, -1600, 1400 - i * 120, 3200); });
  ctx.restore();
}

// ---------- everyday props ----------
/** strawberry shortcake slice (favourite food, treats) */
export function cake(x, y, s = 1, faceMood = 'happy') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shape(() => { ctx.moveTo(-110, 60); ctx.lineTo(110, 60); ctx.lineTo(110, -20); ctx.lineTo(-40, -70); ctx.lineTo(-110, -20); ctx.closePath(); }, { fill: P.cream, line: P.line, lw: 5 });
  polyline([[-108, 14], [108, 14]], P.pink, 14);
  shape(() => { ctx.moveTo(-110, -20); ctx.lineTo(-40, -70); ctx.lineTo(110, -20); ctx.closePath(); }, { fill: P.white, line: P.line, lw: 5 });
  heartShape(-30, -84, 26, P.red, '#A81F31', 3); polyline([[-30, -104], [-22, -118]], P.mintDeep, 6);
  if (faceMood) face(0, 34, 0.9, faceMood);
  ctx.restore();
}
/** a song's progress bar with a star at the "best part". progress 0..1 = playhead, peak = where the best part is */
export function songBar(x, y, w, progress, peak = 0.78, t = 0, { label = null, sc = 1, peakGlow = 0 } = {}) {
  if (sc <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  box(-w / 2 - 40, -120, w + 80, 220, 44, { fill: P.white, line: P.ink, lw: 6 });
  for (let i = 0; i < 34; i++) { const bx = -w / 2 + i * w / 33, hh = 14 + 44 * Math.abs(Math.sin(i * 1.7) * Math.sin(i * 0.43 + 1)) * (Math.abs(i / 33 - peak) < 0.12 ? 1.6 : 1); polyline([[bx, -38 - hh / 2], [bx, -38 + hh / 2]], i / 33 <= progress ? P.lavDeep : P.lavLight, 9); }
  box(-w / 2, 30, w, 18, 9, { fill: P.lavLight }); box(-w / 2, 30, w * clamp(progress), 18, 9, { fill: P.rose });
  const px = -w / 2 + w * peak;
  if (peakGlow > 0) disc(px, 39, 50 * peakGlow, `rgba(255,212,59,${0.45 * peakGlow})`);
  star5(px, 39, 30 + 4 * Math.sin(t * 6), P.yellow, P.ink, 4);
  disc(-w / 2 + w * clamp(progress), 39, 20, P.white, P.ink, 5);
  if (label) { ctx.font = '900 40px Inter'; ctx.fillStyle = P.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, Math.min(px, w / 2 - 70), 84); }
  ctx.restore();
}
