// Mechanism 2D layer (drawn over the 3D frame): part labels with leader lines, tags, the slow-mo badge, letterbox,
// verdict marks and the channel wordmark.
// Look: technical and calm. Dark glass pills, white uppercase Inter, one orange dot where the leader touches the part.
import { ctx, clamp, eo } from './lib.js';

const ORANGE = '#FF7A1A', GLASS = 'rgba(14,16,19,0.84)';
const pillPath = (x, y, w, h) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); };

/**
 * a part label: the leader line grows from the part (ax, ay) to the label (lx, ly), then the pill pops in.
 * k 0..1 (animate it: eo(seg(lt, a, a + 0.5))). side: which side of the label point the pill hangs ('l' │ 'r' │ 'c').
 */
export function label(text, lx, ly, ax, ay, k = 1, { side = 'c', color = ORANGE, size = 46 } = {}) {
  if (k <= 0) return;
  ctx.save();
  const kl = clamp(k / 0.45), kp = eo(clamp((k - 0.3) / 0.7));
  // leader: dot on the part, a thin line, a short horizontal tail into the pill
  ctx.globalAlpha = Math.min(1, k * 3);
  ctx.beginPath(); ctx.arc(ax, ay, 11, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();
  ctx.beginPath(); ctx.arc(ax, ay, 7, 0, 7); ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + (lx - ax) * kl, ay + (ly - ay) * kl); ctx.stroke();
  if (kp > 0) {
    ctx.font = `800 ${size}px Inter`; ctx.letterSpacing = '3px';
    const tw = ctx.measureText(text).width, w = tw + size * 1.1, h = size * 1.75;
    const x0 = side === 'l' ? lx - w : side === 'r' ? lx : lx - w / 2;
    ctx.translate(lx, ly); ctx.scale(0.6 + 0.4 * kp, 0.6 + 0.4 * kp); ctx.translate(-lx, -ly); ctx.globalAlpha = kp;
    pillPath(x0, ly - h / 2, w, h); ctx.fillStyle = GLASS; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.stroke();
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(text, x0 + size * 0.55 + 1, ly + 2);
  }
  ctx.restore(); ctx.letterSpacing = '0px';
}

/** a floating tag (a fact, a count, a ratio). col = text colour */
export function tag(text, x, y, k = 1, { col = '#FFFFFF', size = 58, bg = GLASS } = {}) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); const s = 0.55 + 0.45 * eo(clamp(k)); ctx.scale(s, s); ctx.globalAlpha = clamp(k * 2);
  ctx.font = `900 ${size}px Inter`; ctx.letterSpacing = '1px';
  const w = ctx.measureText(text).width + size * 1.2, h = size * 1.6;
  pillPath(-w / 2, -h / 2, w, h); ctx.fillStyle = bg; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.stroke();
  ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, size * 0.05);
  ctx.restore(); ctx.letterSpacing = '0px';
}

/** the slow-motion badge (top left): a pulsing orange dot and the speed, e.g. slowBadge('0.1×', k, t) */
export function slowBadge(text, k, t) {
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(k * 2); ctx.font = '800 40px Inter'; ctx.letterSpacing = '4px';
  const label = `SLOW-MO ${text}`, w = ctx.measureText(label).width + 100;
  pillPath(60, 170, w, 72); ctx.fillStyle = GLASS; ctx.fill();
  ctx.beginPath(); ctx.arc(100, 206, 12, 0, 7); ctx.fillStyle = ORANGE; ctx.globalAlpha = clamp(k * 2) * (0.55 + 0.45 * Math.cos(t * 6)); ctx.fill();
  ctx.globalAlpha = clamp(k * 2); ctx.fillStyle = '#FFFFFF'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(label, 128, 208);
  ctx.restore(); ctx.letterSpacing = '0px';
}

/** cinematic bars for a hero moment (k 0..1) */
export function letterbox(k, h = 150) {
  if (k <= 0) return; const b = h * eo(clamp(k));
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1080, b); ctx.fillRect(0, 1920 - b, 1080, b);
}

/** a red / green verdict mark next to something: ok = true → ✓, false → ✕ */
export function verdict(ok, x, y, k = 1, s = 1) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); const sc = s * (0.5 + 0.5 * eo(clamp(k))); ctx.scale(sc, sc); ctx.globalAlpha = clamp(k * 2);
  ctx.beginPath(); ctx.arc(0, 0, 62, 0, 7); ctx.fillStyle = ok ? '#2FBF6E' : '#E8453C'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.stroke();
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
  if (ok) { ctx.moveTo(-26, 2); ctx.lineTo(-6, 22); ctx.lineTo(28, -20); } else { ctx.moveTo(-22, -22); ctx.lineTo(22, 22); ctx.moveTo(22, -22); ctx.lineTo(-22, 22); }
  ctx.stroke(); ctx.restore();
}

/** the channel's small wordmark (end card / cover) */
export function wordmark(x, y, k = 1, s = 1) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = clamp(k);
  ctx.font = '900 64px Inter'; ctx.letterSpacing = '6px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText('HOW IT TICKS').width;
  ctx.fillStyle = '#FFFFFF'; ctx.fillText('HOW IT TICKS', 0, 0);
  ctx.fillStyle = ORANGE; ctx.fillRect(-w / 2, 46, w * 0.22, 8);
  ctx.restore(); ctx.letterSpacing = '0px';
}
