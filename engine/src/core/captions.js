// Captions: 1-3 words, heavy sans with a thick outline, ONE highlighted word, centre lower third.
// Each script line has "caps": "WHAT IF *YOU | SWALLOW *GUM?"  ("|" = next caption, "*" = the highlighted word).
// Without "caps", the line is chunked automatically (2-3 words, the longest word is highlighted).
// A chunk appears 0.05 s before its first word and stays until the next chunk (or shortly after the line ends).
// The look comes from template.json "captions" (see DEFAULT_CAPTIONS). A template with a different caption look or
// chunking ships its own src/core/captions.js with the same exports, and the studio serves that one instead.
import { ctx, C, lerp, seg, eob } from './lib.js';
import { T, lineWords } from './timing.js';
import { CFG } from './config.js';

export const DEFAULT_CAPTIONS = {
  y: 1400, size: 150, maxW: 900, font: 'Inter', weight: 900, letterSpacing: -2,
  fill: C.white, highlight: C.yellow, stroke: C.ink, strokeWidth: 30, shadowOffset: 10, popFrom: 0.65, popDur: 0.2,
};
/** the live caption settings (defaults + template + project); kept as a mutable export for kits that read CAP.y */
export const CAP = { ...DEFAULT_CAPTIONS };
let caps = [];

export function autoChunks(text) {
  const ws = text.toUpperCase().split(/\s+/).filter(Boolean), out = [];
  for (let i = 0; i < ws.length;) { const n = ws.length - i === 4 ? 2 : Math.min(3, ws.length - i); out.push(ws.slice(i, i + n)); i += n; }
  return out.map((c) => { const k = c.reduce((b, w, j) => (w.replace(/[^A-Z]/g, '').length > c[b].replace(/[^A-Z]/g, '').length ? j : b), 0); return c.map((w, j) => (j === k ? '*' + w : w)).join(' '); });
}

export function buildCaptions(script) {
  Object.assign(CAP, DEFAULT_CAPTIONS, CFG.captions);
  caps = [];
  script.lines.forEach((ln, i) => {
    const chunks = (ln.caps ? ln.caps.split('|') : autoChunks(ln.text)).map((s) => s.trim()).filter(Boolean);
    const ws = lineWords(i); if (!ws.length) return;
    const counts = chunks.map((c) => c.split(/\s+/).length), N = counts.reduce((a, b) => a + b, 0);
    const nm = (w) => String(w).toLowerCase().replace(/[^a-z0-9']+/g, '');
    let acc = 0, from = 0;
    chunks.forEach((c, j) => {
      // find the chunk's first word in the spoken line (from where the last chunk started); else place it by word count
      const first = nm(c.split(/\s+/)[0]);
      let idx = j === 0 ? 0 : ws.findIndex((w, k) => k > from && first && (nm(w.w) === first || (first.length > 2 && nm(w.w).startsWith(first))));
      if (idx < 0) idx = Math.max(from + (j ? 1 : 0), Math.min(ws.length - 1, Math.round(acc * ws.length / N)));
      acc += counts[j]; from = idx;
      caps.push({ line: i, s: ws[idx].s - 0.05, words: c.split(/\s+/).map((w) => ({ txt: w.replace('*', ''), hi: w.startsWith('*') })) });
    });
  });
  caps.forEach((c, k) => {
    const next = caps[k + 1], lineEnd = T.lines[c.line].end;
    c.e = next ? (next.s - lineEnd > 0.7 && next.line !== c.line ? lineEnd + 0.35 : next.s) : T.dur;
  });
  return caps;
}
export const captionList = () => caps;

export function drawCaption(t) {
  const c = caps.find((c) => t >= c.s && t < c.e); if (!c) return;
  const lt = t - c.s, size = CAP.size;
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
  ctx.save(); ctx.translate(540, CAP.y); ctx.scale(sc, sc);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
  const lh = size, y0 = -(lines.length - 1) * lh / 2;
  lines.forEach((ln, li) => {
    let x = -width(ln) / 2; const y = y0 + li * lh;
    for (const w of ln) {
      ctx.lineWidth = CAP.strokeWidth; ctx.strokeStyle = CAP.stroke;
      if (CAP.shadowOffset) ctx.strokeText(w.txt, x, y + CAP.shadowOffset);
      ctx.strokeText(w.txt, x, y);
      ctx.fillStyle = w.hi ? CAP.highlight : CAP.fill; ctx.fillText(w.txt, x, y); x += w.w + sp;
    }
  });
  ctx.letterSpacing = '0px'; ctx.restore();
}
