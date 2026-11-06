// Character model sheet: every expression, pose and outfit of one cast member, drawn by its own code, so the sheet
// can never disagree with the videos. Used by character.html (studio character-sheet <id>). Sets window.SHEET_READY.
import { setCtx, ctx } from './lib.js';
import { cast, castIds } from './cast.js';

const W = 2400, H = 2000, BG = '#F4EFFA', INK = '#3A2342', SUB = '#8C7AA8', CARD = '#FFFFFF';

function label(text, x, y, size = 22, color = SUB, align = 'center') {
  ctx.font = `800 ${size}px Inter`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '1px';
  ctx.fillText(text.toUpperCase(), x, y); ctx.letterSpacing = '0px';
}
function card(x, y, w, h) { ctx.beginPath(); ctx.roundRect(x, y, w, h, 18); ctx.fillStyle = CARD; ctx.fill(); }
function clipped(x, y, w, h, fn) { ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 18); ctx.clip(); fn(); ctx.restore(); }

export function drawSheet(c, version) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  label(`${c.name || c.id} · model sheet`, 40, 62, 40, INK, 'left');
  label(`id: ${c.id} · v${version} · drawn by characters/${c.id}/character.js`, W - 40, 62, 20, SUB, 'right');
  // hero
  card(30, 100, 570, 1870);
  clipped(30, 100, 570, 1870, () => c.draw({ x: 315, y: 1880, s: 1.42, pose: 'stand', expression: 'neutral', t: 0.4, blink: false }));
  label('default · stand · neutral', 315, 1950);
  // expressions: head crops
  const ex = Object.keys(c.EXPRESSIONS || {}), cw = 244, ch = 236, perRow = 7;
  ex.forEach((name, i) => {
    const x = 630 + (i % perRow) * (cw + 8), y = 100 + Math.floor(i / perRow) * (ch + 10);
    card(x, y, cw, ch);
    clipped(x, y, cw, ch - 30, () => c.draw({ x: x + cw / 2, y: y + 660, s: 0.6, expression: name, t: 0.4, blink: false, shadow: false }));
    label(name, x + cw / 2, y + ch - 10, 18);
  });
  // poses
  const ps = Object.keys(c.POSES || {}), pw = 284, ph = 392;
  ps.forEach((name, i) => {
    const x = 630 + (i % 6) * (pw + 10), y = 600 + Math.floor(i / 6) * (ph + 10);
    card(x, y, pw, ph);
    clipped(x, y, pw, ph - 28, () => c.draw({ x: x + pw / 2, y: y + ph - 40, s: 0.36, pose: name, expression: 'smile', t: 0.9, blink: false }));
    label(name, x + pw / 2, y + ph - 8, 18);
  });
  // outfits + x-ray
  const looks = [...Object.keys(c.OUTFITS || {}).map((o) => ({ name: o, o: { outfit: o } })), { name: 'x-ray', o: { xray: true, expression: 'serious' } }];
  const ow = 284, oh = 560, oy = 1410;
  looks.forEach((l, i) => {
    const x = 630 + i * (ow + 10);
    card(x, oy, ow, oh);
    clipped(x, oy, ow, oh - 28, () => {
      if (l.o.xray) { ctx.fillStyle = '#1F1D45'; ctx.fillRect(x, oy, ow, oh); }
      c.draw({ x: x + ow / 2, y: oy + oh - 44, s: 0.5, t: 0.4, blink: false, expression: 'smile', ...l.o });
    });
    label(l.name, x + ow / 2, oy + oh - 8, 18);
  });
  // palette
  const pal = Object.entries(c.PALETTE || {}).filter(([, v]) => v.startsWith('#')).slice(0, 18), px = 630 + looks.length * (ow + 10) + 10;
  label('palette', px, oy + 30, 20, INK, 'left');
  pal.forEach(([k, v], i) => {
    const x = px + (i % 3) * 165, y = oy + 50 + Math.floor(i / 3) * 82;
    ctx.beginPath(); ctx.roundRect(x, y, 56, 56, 12); ctx.fillStyle = v; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#E2D8F0'; ctx.stroke();
    label(k, x + 64, y + 24, 14, INK, 'left'); label(v, x + 64, y + 46, 13, SUB, 'left');
  });
}

const id = new URLSearchParams(location.search).get('id') || castIds()[0];
setCtx(document.getElementById('cv').getContext('2d'));
const c = cast(id);
drawSheet(c, c.castVersion);
window.SHEET_READY = true;
