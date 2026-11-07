// Case File: the COMPONENT KIT of The Strange File. History's strangest true stories told as an evidence file under
// one lamp: manila folders, typed sheets, rubber stamps, redaction bars, sepia polaroids, a cork board with red
// string, lamp-lit parchment maps, sepia "old photograph" period scenes, and the Archivist in his archive.
// Every function is a pure function of its arguments (and t): nothing is carried between frames.
import { ctx, W, H, TAU, lerp, clamp, rnd, eo, eob, seg } from './lib.js';
import { cast } from './cast.js';

export const P = {
  night: '#0C0B0A', ink: '#1C1A17', desk: '#2B1E15', deskDark: '#1A120C', deskLine: '#3A291C',
  amber: '#E8A33D', amberHi: '#FFD38A', brass: '#B8904F',
  manila: '#C9A86A', manilaDark: '#A88848', manilaEdge: '#DCC089', paper: '#E6DCC3', paperDim: '#C7BB9E', typed: '#26221D',
  red: '#B3261E', redDark: '#7E1A15', string: '#C0302A',
  cork: '#6A4A2E', corkDark: '#4B3320', polaroid: '#ECE6D6',
  parch: '#CDB991', parchDark: '#A8946B', sea: '#5E6E6A', seaDark: '#4A5855', land: '#C2AC80',
  s0: '#1E1812', s1: '#3D3024', s2: '#6B5640', s3: '#9E8463', s4: '#CDB48C', s5: '#E6D3AE',
};
export const MONO = 'FreeMono', SERIF = 'Caladea';
const rad = (d) => d * Math.PI / 180;

// ═════════════════════════ LIGHT, FILM, ATMOSPHERE ═════════════════════════
/** flicker of a flame or old bulb, 0.85..1.05, a pure function of t */
export const flick = (t) => 0.92 + 0.06 * Math.sin(t * 11.3) + 0.04 * Math.sin(t * 23.7 + 1.3);
/** warm pool of lamp light at x, y */
export function lightPool(x, y, r = 700, a = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,205,130,${a})`); g.addColorStop(0.35, `rgba(232,163,61,${a * 0.45})`); g.addColorStop(1, 'rgba(232,163,61,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
/** darken everything outside a lit circle (the "one lamp" look) */
export function vignette(a = 0.8, x = 540, y = 900, r0 = 380, r1 = 1250) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(-300, -300, W + 600, H + 600);
}
/** film grain (changes 24x a second) + the odd vertical scratch: the old-footage feel */
export function grain(t, a = 1) {
  const f = Math.floor(t * 24);
  for (let i = 0; i < 700; i++) { ctx.fillStyle = rnd(i + f * 13) > 0.5 ? `rgba(255,240,210,${0.05 * a})` : `rgba(0,0,0,${0.13 * a})`; ctx.fillRect(rnd(i * 3 + f) * W, rnd(i * 7 + f * 2) * H, 3, 3); }
  if (rnd(f * 0.37) > 0.6) { ctx.fillStyle = `rgba(255,240,210,${0.07 * a})`; ctx.fillRect(rnd(f + 3) * W, 0, 2, H); }
}
/** dust motes drifting through the lamp light around (x, y) */
export function dust(t, x = 540, y = 800, r = 520, n = 40) {
  for (let i = 0; i < n; i++) {
    const a = rnd(i) * TAU, d = Math.sqrt(rnd(i + 9)) * r, px = x + Math.cos(a) * d + Math.sin(t * 0.3 + i) * 30, py = y + Math.sin(a) * d - ((t * 18 + i * 37) % 160) + 80;
    ctx.fillStyle = `rgba(255,226,170,${0.35 * (1 - d / r)})`; ctx.beginPath(); ctx.arc(px, py, 1.5 + rnd(i + 4) * 2.5, 0, TAU); ctx.fill();
  }
}
/** the full film finish for any shot: vignette + grain */
export function filmLook(t, vign = 0.7) { vignette(vign); grain(t); }

// ═════════════════════════ BACKGROUNDS ═════════════════════════
/** the desk the evidence lies on (seen from above): dark walnut, lit by a lamp at (lx, ly) */
export function desk(t = 0, lx = 540, ly = 760, lamp = 1) {
  ctx.fillStyle = P.deskDark; ctx.fillRect(-300, -300, W + 600, H + 600);
  for (let i = 0; i < 26; i++) { const y = i * 90 - 120 + rnd(i) * 30; ctx.fillStyle = i % 2 ? P.desk : '#24190F'; ctx.fillRect(-300, y, W + 600, 90); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-300, y); ctx.lineTo(W + 300, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(80,55,35,0.35)'; ctx.lineWidth = 2;
  for (let i = 0; i < 60; i++) { const y = rnd(i * 5) * H, x = rnd(i * 7) * W; ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 120, y + 8, x + 240, y - 8, x + 380, y + 4); ctx.stroke(); }
  lightPool(lx, ly, 980, 0.42 * lamp * flick(t)); vignette(0.82, lx, ly, 300, 1300);
}
/** the archive: shelves of file boxes receding into darkness; a lantern-lit pool at (lx, ly) */
export function archive(t = 0, lx = 640, ly = 1150, lamp = 1) {
  ctx.fillStyle = P.night; ctx.fillRect(-300, -300, W + 600, H + 600);
  for (let row = 0; row < 9; row++) {
    const y = 120 + row * 175;
    ctx.fillStyle = '#1A1511'; ctx.fillRect(-300, y + 150, W + 600, 16);                         // shelf plank
    for (let i = 0; i < 9; i++) {
      const x = -80 + i * 150 + (row % 2) * 40 + rnd(row * 9 + i) * 20, w = 120 + rnd(row * 3 + i) * 12, h = 120 + rnd(row + i * 5) * 28;
      const d = Math.hypot(x + w / 2 - lx, y + 150 - h / 2 - ly), lit = clamp(1 - d / 900) * lamp;
      ctx.fillStyle = `rgb(${30 + lit * 70 | 0},${24 + lit * 50 | 0},${18 + lit * 30 | 0})`; ctx.fillRect(x, y + 150 - h, w, h);
      ctx.fillStyle = `rgba(230,220,195,${0.08 + lit * 0.55})`; ctx.fillRect(x + w / 2 - 26, y + 150 - h * 0.62, 52, 30);  // label card
      ctx.fillStyle = `rgba(28,26,23,${lit * 0.7})`; ctx.fillRect(x + w / 2 - 18, y + 150 - h * 0.62 + 12, 36, 5);
    }
  }
  for (let i = 0; i < 5; i++) { const x = -60 + i * 300; ctx.fillStyle = '#0F0D0B'; ctx.fillRect(x, -300, 34, 1960); }        // shelving uprights
  ctx.fillStyle = '#0E0C0A'; ctx.fillRect(-300, 1640, W + 600, 600);                                // floor
  lightPool(lx, ly, 820, 0.38 * lamp * flick(t)); vignette(0.86, lx, ly, 260, 1200); dust(t, lx, ly - 100, 480, 36);
}
/** a cork evidence board filling the frame, lit from above */
export function board(t = 0, seed = 1) {
  ctx.fillStyle = P.cork; ctx.fillRect(-300, -300, W + 600, H + 600);
  for (let i = 0; i < 2200; i++) { ctx.fillStyle = rnd(i + seed) > 0.5 ? 'rgba(40,25,12,0.35)' : 'rgba(150,110,70,0.25)'; ctx.fillRect(rnd(i * 3 + seed) * (W + 200) - 100, rnd(i * 7 + seed) * (H + 200) - 100, 4, 4); }
  ctx.strokeStyle = '#3A2614'; ctx.lineWidth = 34; ctx.strokeRect(-10, -10, W + 20, H + 20);
  lightPool(540, 700, 1100, 0.3 * flick(t)); vignette(0.75, 540, 760, 400, 1250);
}

// ═════════════════════════ PAPER EVIDENCE ═════════════════════════
function paperShadow(fn, blur = 26, oy = 14) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = blur; ctx.shadowOffsetY = oy; ctx.shadowOffsetX = 6; fn(); ctx.restore(); }
/** typewriter text: p 0..1 types it on letter by letter */
export function typed(text, x, y, size = 40, p = 1, color = P.typed, align = 'left', font = MONO) {
  const s = String(text), n = Math.floor(clamp(p) * s.length + 1e-6); if (n <= 0) return;
  ctx.font = `700 ${size}px ${font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(s.slice(0, n), x, y);
}
/** a manila case folder. o = { label, no, stamp, open (0..1 cover swings open), sheet: [lines], redact: [[line, from, to]] } */
export function folder(x, y, s = 1, rot = 0, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  const w = 620, h = 800, open = clamp(o.open || 0);
  paperShadow(() => { ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 10); ctx.fillStyle = P.manilaDark; ctx.fill(); });
  // the typed sheet inside
  if (open > 0) {
    ctx.fillStyle = P.paper; ctx.fillRect(-w / 2 + 24, -h / 2 + 24, w - 48, h - 48);
    (o.sheet || []).forEach((ln, i) => typed(ln, -w / 2 + 60, -h / 2 + 110 + i * 62, 34, clamp(open * 1.6 - 0.3 - i * 0.08)));
    (o.redact || []).forEach(([i, a, b]) => redact(-w / 2 + 60 + a, -h / 2 + 88 + i * 62, b - a, 44, clamp(open * 2 - 1)));
  }
  // the cover, hinged on its left edge
  const cw = Math.cos(open * Math.PI * 0.92);
  if (cw > -0.98) {
    ctx.save(); ctx.translate(-w / 2, 0); ctx.scale(cw, 1); ctx.translate(w / 2, 0);
    ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(-w / 2 + 40, -h / 2); ctx.lineTo(-w / 2 + 70, -h / 2 - 50); ctx.lineTo(-w / 2 + 300, -h / 2 - 50); ctx.lineTo(-w / 2 + 330, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w / 2, h / 2); ctx.closePath();
    ctx.fillStyle = cw > 0 ? P.manila : P.manilaDark; ctx.fill(); ctx.strokeStyle = P.manilaEdge; ctx.lineWidth = 3; ctx.stroke();
    if (cw > 0.2) {
      if (o.no) typed(o.no, -w / 2 + 185, -h / 2 - 22, 30, 1, P.typed, 'center');
      ctx.fillStyle = P.paper; ctx.fillRect(-220, -230, 440, 120); ctx.strokeStyle = P.typed; ctx.lineWidth = 3; ctx.strokeRect(-220, -230, 440, 120);
      if (o.label) { ctx.font = `700 46px ${MONO}`; const fit = Math.min(1, 400 / ctx.measureText(o.label).width); ctx.save(); ctx.translate(0, -170); ctx.scale(fit, 1); typed(o.label, 0, 0, 46, 1, P.typed, 'center'); ctx.restore(); }
      if (o.stamp) stamp(o.stamp, 40, 160, 1, -0.16, 1);
    }
    ctx.restore();
  }
  ctx.restore();
}
/** a single typed sheet. lines types on with p (line by line) */
export function sheet(x, y, w, h, rot = 0, lines = [], p = 1, size = 36) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  paperShadow(() => { ctx.fillStyle = P.paper; ctx.fillRect(-w / 2, -h / 2, w, h); });
  ctx.strokeStyle = 'rgba(150,40,30,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-w / 2 + 70, -h / 2); ctx.lineTo(-w / 2 + 70, h / 2); ctx.stroke();
  const n = lines.length || 1; lines.forEach((ln, i) => typed(ln, -w / 2 + 95, -h / 2 + 70 + i * size * 1.7, size, clamp(p * n - i)));
  ctx.restore();
}
/** red rubber stamp. p 0..1: it slams down (big → normal) on p ~0.25 */
export function stamp(text, x, y, s = 1, rot = -0.12, p = 1, color = P.red) {
  if (p <= 0) return; const k = eo(clamp(p / 0.25)), sc = lerp(1.9, 1, k);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * sc, s * sc); ctx.globalAlpha *= clamp(k * 1.4);
  ctx.font = `700 76px ${MONO}`; const w = ctx.measureText(text).width + 70, h = 116;
  ctx.strokeStyle = color; ctx.lineWidth = 9; ctx.strokeRect(-w / 2, -h / 2, w, h); ctx.lineWidth = 3; ctx.strokeRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24);
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 4);
  // worn ink: speckles of paper
  ctx.fillStyle = 'rgba(230,220,195,0.55)'; for (let i = 0; i < 70; i++) ctx.fillRect(-w / 2 + rnd(i * 3 + text.length) * w, -h / 2 + rnd(i * 5 + 1) * h, 3, 2);
  ctx.restore();
}
/** black redaction bar: p 0..1 wipes it on, left to right */
export function redact(x, y, w, h = 44, p = 1) {
  if (p <= 0) return; ctx.fillStyle = '#0B0A09'; ctx.beginPath();
  const ww = w * eo(clamp(p)); ctx.moveTo(x, y + 3); for (let i = 0; i <= 8; i++) ctx.lineTo(x + ww * i / 8, y + (rnd(i + w) - 0.5) * 6); ctx.lineTo(x + ww, y + h); for (let i = 8; i >= 0; i--) ctx.lineTo(x + ww * i / 8, y + h + (rnd(i + w + 3) - 0.5) * 6); ctx.closePath(); ctx.fill();
}
/** date + place typed on a paper tape (top-left by default). p 0..1 types it on */
export function dateStamp(date, place, p = 1, x = 70, y = 250) {
  if (p <= 0) return; ctx.save(); ctx.translate(x, y); ctx.rotate(-0.02);
  ctx.font = `700 54px ${MONO}`; const w = Math.max(ctx.measureText(date).width, (place ? ctx.measureText(place).width * 0.6 : 0)) + 60;
  paperShadow(() => { ctx.fillStyle = P.paper; ctx.fillRect(0, -50, w * clamp(p * 3), place ? 150 : 100); }, 16, 8);
  typed(date, 30, 0, 54, clamp(p * 1.5), P.typed); if (place) typed(place, 30, 64, 32, clamp(p * 1.5 - 0.5), P.red);
  ctx.restore();
}
/** a pinned paper slip with a few typed words (a name, a number, a place) */
export function slip(text, x, y, sc = 1, rot = -0.03, size = 52) {
  if (sc <= 0) return; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); ctx.font = `700 ${size}px ${MONO}`;
  const w = ctx.measureText(text).width + 70; paperShadow(() => { ctx.fillStyle = P.paper; ctx.fillRect(-w / 2, -size * 0.85, w, size * 1.7); }, 14, 8);
  typed(text, 0, 4, size, 1, P.typed, 'center'); pin(0, -size * 0.85 + 10); ctx.restore();
}
/** a red pushpin */
export function pin(x, y, c = P.red) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc(x + 4, y + 6, 12, 0, TAU); ctx.fill(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.arc(x - 4, y - 4, 4, 0, TAU); ctx.fill(); }
/** red string between pins: p 0..1 draws it from a to b, sagging */
export function string(a, b, p = 1, sag = 40) {
  if (p <= 0) return; const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag], k = clamp(p);
  ctx.strokeStyle = P.string; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a[0], a[1]);
  for (let i = 1; i <= 24 * k; i++) { const u = i / 24, x = (1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * m[0] + u * u * b[0], y = (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * m[1] + u * u * b[1]; ctx.lineTo(x, y); }
  ctx.stroke(); pin(a[0], a[1]); if (k >= 1) pin(b[0], b[1]);
}
/** hand-drawn red marker circle around (x, y), p draws it on */
export function redCircle(x, y, rx, ry, p = 1, w = 8) {
  if (p <= 0) return; ctx.strokeStyle = P.red; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath();
  for (let i = 0; i <= 60 * clamp(p) * 1.12; i++) { const a = -2.2 + i / 60 * TAU, r = 1 + 0.04 * Math.sin(i * 0.7); ctx.lineTo(x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r * (1 + i / 900)); }
  ctx.stroke();
}
/** a sepia polaroid. photo(w, h) draws the picture in local coords (0..w, 0..h); p 0..1 drops it in; caption is handwritten */
export function polaroid(x, y, s = 1, rot = 0, photo = null, caption = '', p = 1) {
  if (p <= 0) return; const k = eob(clamp(p)), w = 360, h = 430, pw = 316, ph = 316;
  ctx.save(); ctx.translate(x, y - (1 - k) * 120); ctx.rotate(rot + (1 - k) * 0.25); ctx.scale(s, s); ctx.globalAlpha *= clamp(p * 3);
  paperShadow(() => { ctx.fillStyle = P.polaroid; ctx.fillRect(-w / 2, -h / 2, w, h); });
  ctx.save(); ctx.beginPath(); ctx.rect(-pw / 2, -h / 2 + 22, pw, ph); ctx.clip(); ctx.translate(-pw / 2, -h / 2 + 22);
  ctx.fillStyle = P.s1; ctx.fillRect(0, 0, pw, ph); if (photo) photo(pw, ph);
  const g = ctx.createRadialGradient(pw / 2, ph / 2, pw * 0.25, pw / 2, ph / 2, pw * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,12,4,0.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, pw, ph);
  ctx.restore();
  if (caption) { ctx.font = `italic 700 38px ${SERIF}`; ctx.fillStyle = '#3A3027'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const f = Math.min(1, 320 / ctx.measureText(caption).width); ctx.save(); ctx.translate(0, h / 2 - 50); ctx.scale(f, 1); ctx.fillText(caption, 0, 0); ctx.restore(); }
  ctx.restore();
}
/** a big typed number or fact card (e.g. "2,300,000 GALLONS") on paper, popping in with sc */
export function factCard(big, small, x, y, sc = 1, rot = -0.02) {
  if (sc <= 0) return; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
  ctx.font = `700 120px ${MONO}`; const w = Math.max(ctx.measureText(big).width, 300) + 100;
  paperShadow(() => { ctx.fillStyle = P.paper; ctx.fillRect(-w / 2, -120, w, small ? 260 : 200); });
  typed(big, 0, -20, 120, 1, P.typed, 'center'); if (small) typed(small, 0, 90, 44, 1, P.red, 'center');
  ctx.restore();
}

// ═════════════════════════ MAPS ═════════════════════════
/** lamp-lit parchment map page (fills the frame); draw coasts and routes on top */
export function mapPage(t = 0, seed = 3, lx = 540, ly = 820) {
  ctx.fillStyle = P.parch; ctx.fillRect(-300, -300, W + 600, H + 600);
  for (let i = 0; i < 16; i++) { ctx.save(); ctx.translate(rnd(i + seed) * W, rnd(i + 30 + seed) * H); ctx.scale(160 + rnd(i + 5) * 260, 120 + rnd(i + 9) * 200); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, 'rgba(110,80,40,0.16)'); g.addColorStop(1, 'rgba(110,80,40,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore(); }
  ctx.strokeStyle = 'rgba(60,40,20,0.14)'; ctx.lineWidth = 2; for (let x = 0; x <= W; x += 135) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y <= H; y += 135) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}
/** finish a map page: the lamp (light pool + heavy vignette), call AFTER drawing on the map */
export function mapLight(t = 0, lx = 540, ly = 820) { lightPool(lx, ly, 900, 0.18 * flick(t)); vignette(0.85, lx, ly, 330, 1150); }
/** fill a polygon (a coast, a district) */
export function shape(pts, fill, line = 'rgba(40,28,16,0.75)', lw = 4) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (line) { ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.stroke(); } }
/** red dashed route through pts; p 0..1 draws it on; returns the head [x, y, angle] */
export function route(pts, p = 1, color = P.red, w = 9) {
  const L = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(l); tot += l; }
  let left = tot * clamp(p); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); let head = [...pts[0], 0];
  for (let i = 1; i < pts.length && left > 0; i++) { const k = Math.min(1, left / L[i - 1]), x = lerp(pts[i - 1][0], pts[i][0], k), y = lerp(pts[i - 1][1], pts[i][1], k); ctx.lineTo(x, y); head = [x, y, Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])]; left -= L[i - 1]; }
  ctx.setLineDash([24, 16]); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke(); ctx.setLineDash([]);
  return head;
}
/** small-caps map label */
export function label(text, x, y, size = 36, color = P.ink, rot = 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.font = `700 ${size}px ${SERIF}`; ctx.letterSpacing = '5px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(text, 0, 0); ctx.letterSpacing = '0px'; ctx.restore(); }
/** red X marks the spot (p pops it) */
export function xMark(x, y, s = 1, p = 1) { if (p <= 0) return; const k = eob(clamp(p)); ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k); ctx.strokeStyle = P.red; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-34, -34); ctx.lineTo(34, 34); ctx.moveTo(34, -34); ctx.lineTo(-34, 34); ctx.stroke(); ctx.restore(); }
export function compass(x, y, s = 1) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = P.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 90, 0, TAU); ctx.stroke(); for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, -82); ctx.lineTo(14, 0); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fillStyle = i ? P.ink : P.red; ctx.fill(); ctx.restore(); } label('N', 0, -112, 40); ctx.restore(); }

// ═════════════════════════ PERIOD SCENES (sepia, like an old photograph) ═════════════════════════
/** sepia sky + haze, horizon at y */
export function sepiaSky(y = 1200, top = P.s2, bottom = P.s4) { const g = ctx.createLinearGradient(0, -300, 0, y); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(-300, -300, W + 600, y + 300); }
/** a row of period buildings (brick fronts with windows, cornices) between x0 and x1, ground at y */
export function buildings(x0, x1, y, seed = 1, color = P.s1, win = P.s3) {
  let x = x0, i = 0;
  while (x < x1) { const w = 150 + rnd(seed + i) * 110, h = 330 + rnd(seed + i * 3) * 330;
    ctx.fillStyle = color; ctx.fillRect(x, y - h, w - 6, h); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y - h, w - 6, 18);
    ctx.fillStyle = win; for (let r = 0; r < Math.floor(h / 110); r++) for (let c = 0; c < Math.floor(w / 70); c++) if (rnd(seed + i * 17 + r * 5 + c) > 0.25) ctx.fillRect(x + 22 + c * 64, y - h + 50 + r * 105, 28, 48);
    x += w; i++; }
}
/** a sepia period figure: a silhouette with hat or cap. o = { x, y, h, dir, hat: 'bowler'|'cap'|'bonnet'|'none', walk, arm, color } */
export function person(o) {
  const h = o.h || 420, s = h / 640, d = o.dir || 1, wk = o.walk != null ? Math.sin(o.walk) : 0, c = o.color || P.s0;
  ctx.save(); ctx.translate(o.x, o.y); ctx.scale(s * d, s); ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineCap = 'round';
  if (o.hat === 'bonnet' || o.skirt) { ctx.beginPath(); ctx.moveTo(-60, -440); ctx.lineTo(60, -440); ctx.lineTo(115, 0); ctx.lineTo(-115, 0); ctx.closePath(); ctx.fill(); }
  else { ctx.lineWidth = 46; for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(k * 24, -250); ctx.lineTo(k * 24 + k * wk * 36, -10); ctx.stroke(); } ctx.beginPath(); ctx.roundRect(-72, -470, 144, 250, 36); ctx.fill(); }
  ctx.lineWidth = 38; ctx.beginPath(); ctx.moveTo(-50, -440); ctx.lineTo(-62 - wk * 20, -250); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(50, -440); const a = rad(-(o.arm || 0) - 8 + wk * 14); ctx.lineTo(50 + Math.sin(-a) * -190, -440 + Math.cos(a) * 190); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -530, 62, 0, TAU); ctx.fill();
  if (o.hat === 'bowler') { ctx.beginPath(); ctx.ellipse(0, -576, 92, 16, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(0, -585, 58, Math.PI, TAU); ctx.fill(); }
  if (o.hat === 'cap') { ctx.beginPath(); ctx.ellipse(10, -580, 76, 26, -0.1, Math.PI, TAU); ctx.fill(); ctx.fillRect(20, -585, 70, 14); }
  if (o.hat === 'bonnet') { ctx.beginPath(); ctx.arc(-8, -545, 78, Math.PI * 0.85, Math.PI * 2.1); ctx.fill(); }
  ctx.restore();
}
/** cobbled street from y down */
export function cobbles(y, color = P.s2, line = P.s1) { ctx.fillStyle = color; ctx.fillRect(-300, y, W + 600, H - y + 300); ctx.strokeStyle = line; ctx.lineWidth = 3; for (let r = 0; r < 14; r++) { const yy = y + 20 + r * r * 6 + r * 18; ctx.beginPath(); ctx.moveTo(-300, yy); ctx.lineTo(W + 300, yy); ctx.stroke(); for (let c = 0; c < 18; c++) { const x = c * 80 + (r % 2) * 40 - 40; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x, yy + 12 + r * 4); ctx.stroke(); } } }
/** finish a period scene so it reads as an old photograph: sepia wash, flicker, heavy vignette, grain */
export function oldPhoto(t, vign = 0.75) {
  ctx.fillStyle = `rgba(90,60,25,${0.12 + 0.03 * Math.sin(t * 9)})`; ctx.fillRect(-300, -300, W + 600, H + 600);
  vignette(vign, 540, 900, 300, 1150); grain(t, 1.2);
}

// ═════════════════════════ THE HOST ═════════════════════════
/** the Archivist in his archive (drawn ONLY through the cast). o = { pose, poseFrom, poseK, expression, talk, x, y, s, glow, back (backlight 0..1) }.
 *  Full figure: s 1.05, y 1660. Close (waist up, the hook / sign-off): s 1.55, y 1980. */
export function hostScene(t, o = {}) {
  const A = cast('the-archivist'), x = o.x ?? 560, y = o.y ?? 1660, s = o.s ?? 1.05;
  const pose = { x, y, s, t, pose: o.pose || 'stand', poseFrom: o.poseFrom, poseK: o.poseK, expression: o.expression || 'neutral', talk: o.talk || 0, glow: o.glow ?? 1, flip: o.flip };
  const lp = A.anchor(pose, 'lantern');
  archive(t, lp[0], lp[1], o.glow ?? 1);
  // a soft backlight behind his head and shoulders (the aisle's far lamp), so the silhouette always reads
  const hb = A.anchor(pose, [0, -760]), r = 520 * s, g = ctx.createRadialGradient(hb[0], hb[1], 0, hb[0], hb[1], r);
  g.addColorStop(0, `rgba(214,170,110,${0.42 * (o.back ?? 1)})`); g.addColorStop(0.5, `rgba(150,105,60,${0.16 * (o.back ?? 1)})`); g.addColorStop(1, 'rgba(120,80,40,0)');
  ctx.fillStyle = g; ctx.fillRect(hb[0] - r, hb[1] - r, r * 2, r * 2);
  A.draw(pose);
  return { lantern: lp, A, pose };
}

// ═════════════════════════ CAPTION LOOK ═════════════════════════
export const CAPLOOK = { font: `700 82px ${MONO}`, y: 1570, maxW: 960, fg: P.typed, hi: P.red, bg: P.paper };
/** caption: typed on a strip of label tape (FreeMono, ink with ONE red word) */
export function captionTape(words, x, y, sc = 1, look = CAPLOOK, full = null) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.font = look.font; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const sp = 34, all = full || words, ws = all.map((w) => ctx.measureText(w.txt).width), tw = ws.reduce((a, b) => a + b, 0) + sp * (all.length - 1);
  const fit = Math.min(1, (look.maxW || 960) / (tw + 80)); ctx.scale(fit, fit);
  const hw = tw / 2 + 40;
  paperShadow(() => { ctx.beginPath(); ctx.moveTo(-hw, -62); for (let x = -hw; x <= hw; x += 30) ctx.lineTo(x, -62 + (rnd(x) - 0.5) * 6); ctx.lineTo(hw + 8, 0); ctx.lineTo(hw, 62); for (let x = hw; x >= -hw; x -= 30) ctx.lineTo(x, 62 + (rnd(x + 7) - 0.5) * 6); ctx.lineTo(-hw - 8, 0); ctx.closePath(); ctx.fillStyle = look.bg; ctx.fill(); }, 18, 8);
  let cx = -tw / 2; words.forEach((w, i) => { ctx.fillStyle = w.hi ? look.hi : look.fg; ctx.fillText(w.txt, cx, 4); cx += ws[i] + sp; });
  ctx.restore();
}
