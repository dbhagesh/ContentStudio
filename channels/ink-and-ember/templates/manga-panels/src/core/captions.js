// Manga Panels captions: 1-3 words, Inter Black, white with a thick ink outline, slightly tilted like hand lettering.
// The ONE highlighted word of each chunk ("*") is lettered in reverse (ink with a white halo) for the narrator, and in
// the SPEAKER's signature accent for a character's line (Akari ember, Ren ice blue, Dai gold, Sumi jade), so the
// viewer can see who is talking. Chunking and timing are the shared engine's rules (a chunk shows from its first word).
import { ctx, lerp, seg, eob } from './lib.js';
import { T, lineWords } from './timing.js';
import { CFG } from './config.js';
import { castIds, cast } from './cast.js';

export const CAP = { y: 1470, size: 112, maxW: 940, font: 'Inter', weight: 900, letterSpacing: -1, fill: '#FFFFFF', stroke: '#111014', strokeWidth: 24, popFrom: 0.6, popDur: 0.18 };
let caps = [];

export function autoChunks(text) {
  const ws = text.toUpperCase().split(/\s+/).filter(Boolean), out = [];
  for (let i = 0; i < ws.length;) { const n = ws.length - i === 4 ? 2 : Math.min(3, ws.length - i); out.push(ws.slice(i, i + n)); i += n; }
  return out.map((c) => { const k = c.reduce((b, w, j) => (w.replace(/[^A-Z]/g, '').length > c[b].replace(/[^A-Z]/g, '').length ? j : b), 0); return c.map((w, j) => (j === k ? '*' + w : w)).join(' '); });
}

const accentOf = (speaker) => { try { return speaker && castIds().includes(speaker) ? cast(speaker).PALETTE?.accent : null; } catch (e) { return null; } };

export function buildCaptions(script) {
  Object.assign(CAP, CFG.captions || {});
  caps = [];
  script.lines.forEach((ln, i) => {
    const chunks = (ln.caps ? ln.caps.split('|') : autoChunks(ln.text)).map((s) => s.trim()).filter(Boolean);
    const ws = lineWords(i); if (!ws.length) return;
    const counts = chunks.map((c) => c.split(/\s+/).length), N = counts.reduce((a, b) => a + b, 0);
    const nm = (w) => String(w).toLowerCase().replace(/[^a-z0-9']+/g, '');
    let acc = 0, from = 0;
    const accent = accentOf(ln.speaker);
    chunks.forEach((c, j) => {
      const first = nm(c.split(/\s+/)[0]);
      let idx = j === 0 ? 0 : ws.findIndex((w, k) => k > from && first && (nm(w.w) === first || (first.length > 2 && nm(w.w).startsWith(first))));
      if (idx < 0) idx = Math.max(from + (j ? 1 : 0), Math.min(ws.length - 1, Math.round(acc * ws.length / N)));
      acc += counts[j]; from = idx;
      caps.push({ line: i, s: ws[idx].s - 0.05, accent, words: c.split(/\s+/).map((w) => ({ txt: w.replace('*', ''), hi: w.startsWith('*') })) });
    });
  });
  caps.forEach((c, k) => {
    const next = caps[k + 1], lineEnd = T.lines[c.line].end;
    // the last chunk leaves 0.6 s after its line, so the end card has the screen to itself
    c.e = next ? (next.s - lineEnd > 0.7 && next.line !== c.line ? lineEnd + 0.35 : next.s) : Math.min(T.dur, lineEnd + 0.6);
  });
  return caps;
}
export const captionList = () => caps;

export function drawCaption(t) {
  const k = caps.findIndex((c) => t >= c.s && t < c.e); if (k < 0) return;
  const c = caps[k], lt = t - c.s, size = CAP.size;
  ctx.font = `${CAP.weight} ${size}px ${CAP.font}`; ctx.letterSpacing = `${CAP.letterSpacing}px`;
  const sp = size * 0.26;
  c.words.forEach((w) => (w.w = ctx.measureText(w.txt).width));
  const width = (ws) => ws.reduce((a, w) => a + w.w, 0) + sp * (ws.length - 1);
  let lines = [c.words];
  if (width(c.words) > CAP.maxW && c.words.length > 1) {
    let best = null;
    for (let i = 1; i < c.words.length; i++) { const a = c.words.slice(0, i), b = c.words.slice(i), m = Math.max(width(a), width(b)); if (!best || m < best.m) best = { m, l: [a, b] }; }
    lines = best.l;
  }
  const fit = Math.min(1, CAP.maxW / Math.max(...lines.map(width)));
  const sc = (lt < CAP.popDur ? lerp(CAP.popFrom, 1, eob(seg(lt, 0, CAP.popDur))) : 1) * fit;
  ctx.save(); ctx.translate(540, CAP.y); ctx.rotate(k % 2 ? 0.025 : -0.025); ctx.scale(sc, sc);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
  const lh = size * 1.02, y0 = -(lines.length - 1) * lh / 2;
  lines.forEach((ln, li) => {
    let x = -width(ln) / 2; const y = y0 + li * lh;
    for (const w of ln) {
      const hiInk = w.hi && !c.accent;
      // a hard drop shadow block, then the outline, then the letter
      ctx.lineWidth = CAP.strokeWidth; ctx.strokeStyle = CAP.stroke; ctx.strokeText(w.txt, x + 7, y + 8);
      if (hiInk) { ctx.lineWidth = CAP.strokeWidth; ctx.strokeStyle = '#FFFFFF'; ctx.strokeText(w.txt, x, y); ctx.lineWidth = 6; ctx.strokeStyle = CAP.stroke; ctx.strokeText(w.txt, x, y); ctx.fillStyle = CAP.stroke; }
      else { ctx.strokeText(w.txt, x, y); ctx.fillStyle = w.hi ? c.accent : CAP.fill; }
      ctx.fillText(w.txt, x, y); x += w.w + sp;
    }
  });
  ctx.letterSpacing = '0px'; ctx.restore();
}
