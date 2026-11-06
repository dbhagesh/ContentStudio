// The Money Desk style sheet, drawn with the template's own kit and Penny's own code (through the cast).
import { ctx } from './core/lib.js';
import { startBoard, panel, frame, cell, small, swatches, rules } from './core/board.js';
import { cast } from './core/cast.js';
import * as K from './core/kit.js';
const { P } = K;
const penny = cast('penny');

const cv = document.getElementById('cv');
await document.fonts.load('900 40px Inter'); await document.fonts.load('800 40px Inter');
startBoard(cv, { title: 'MONEY DESK: PENNY EXPLAINS STYLE SHEET', accent: P.capGold, author: 'PENNY EXPLAINS · CHANNEL TEMPLATE' });

const caption = (words, y = 1430) => {
  ctx.font = '900 138px Inter'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const ws = words.map(([w]) => ctx.measureText(w).width), sp = 34, tw = ws.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
  let x = 540 - tw / 2;
  words.forEach(([w, hi], i) => { ctx.lineWidth = 28; ctx.strokeStyle = P.ink; ctx.strokeText(w, x, y); ctx.fillStyle = hi ? P.capGold : P.white; ctx.fillText(w, x, y); x += ws[i] + sp; });
};

// 1 · hero frame
let b = panel(20, 80, 560, 520, 1, 'HERO FRAME');
frame(b.x + 6, b.y, 240, () => {
  K.paper();
  K.barChart({ x: 200, y: 330, w: 760, h: 680, max: 100, title: 'YOUR $85 PAYMENT', bars: [{ label: 'INTEREST', value: 55, color: P.red, text: (v) => K.fmtMoney(v) }, { label: 'YOUR DEBT', value: 30, color: P.green, text: (v) => K.fmtMoney(v) }], ticks: [0, 50, 100], fmt: (v) => K.fmtMoney(v) });
  penny.draw({ x: 830, y: 2330, s: 0.72, pose: 'point', expression: 'smug', flip: -1, t: 0.4, blink: false });
  caption([['ONLY', 0], ['$30', 1]]);
});
small('PENNY PRESENTS,\nTHE DATA PROVES', b.x + 270, b.y + 40, 'left', 17);
small('CHARTS ARE EXACT,\nLABELLED, SOURCED', b.x + 270, b.y + 130, 'left', 17);
small('GREEN = YOU KEEP\nRED = THEY TAKE', b.x + 270, b.y + 220, 'left', 17);
small('GOLD = THE ONE\nNUMBER TO REMEMBER', b.x + 270, b.y + 310, 'left', 17);

// 2 · palette + Penny's moods
b = panel(590, 80, 660, 520, 2, 'PALETTE');
const yy = swatches(b, [['PAPER', P.paper], ['INK', P.ink], ['MONEY', P.green], ['GOLD', P.gold], ['TRAP', P.red], ['DATA', P.teal], ['VAULT', P.vault], ['DESK', P.desk]]);
['GREEN = MONEY YOU KEEP. RED = MONEY THEY TAKE.', 'GOLD IS FOR THE ONE KEY NUMBER AND THE CAPTION WORD.', 'TEAL IS NEUTRAL DATA. NO DECORATIVE COLOUR.']
  .forEach((t, i) => small(t, b.x + 4, yy + 14 + i * 34, 'left', 16, '#E6E7EA'));
const sy = yy + 112;
ctx.fillStyle = P.paper; ctx.beginPath(); ctx.roundRect(b.x, sy, b.w, 170, 14); ctx.fill();
ctx.save(); ctx.beginPath(); ctx.roundRect(b.x, sy, b.w, 170, 14); ctx.clip();
['smug', 'grin', 'shock', 'suspicious', 'greedy', 'facepalm'].forEach((m, i) => {
  const o = m === 'facepalm' ? { pose: 'facepalm', expression: 'sad' } : { expression: m };
  cell(b.x + 54 + i * 104, sy + 70, 0.22, () => penny.draw({ x: 0, y: 830, s: 1, t: 0.4, blink: false, shadow: false, ...o }), null);
});
ctx.restore();
ctx.fillStyle = 'rgba(29,27,38,0.85)'; ctx.fillRect(b.x, sy + 140, b.w, 30);
['SMUG', 'GRIN', 'SHOCK', 'SUSPICIOUS', 'GREEDY', 'FACEPALM'].forEach((m, i) => small(m, b.x + 54 + i * 104, sy + 161, 'center', 13, '#F2F2F2'));

// 3 · components
b = panel(1260, 80, 640, 520, 3, 'COMPONENTS');
ctx.fillStyle = P.paper; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 14); ctx.fill();
const gx = (i) => b.x + 80 + i * 160, gy = (r) => b.y + 62 + r * 145;
cell(gx(0), gy(0), 0.45, () => { K.coinStack(-20, 60, 4, 60); K.coin(40, -10, 60, 0.15); }, 'COINS', 66);
cell(gx(1), gy(0), 0.4, () => { K.bill(0, -10, 1, -0.12, '20'); K.bill(20, 30, 1, 0.08, '100'); }, 'BILLS', 66);
cell(gx(2), gy(0), 0.34, () => K.creditCard(0, 0, 1, -0.1), 'CARD', 66);
cell(gx(3), gy(0), 0.3, () => K.priceTag(20, 0, 1, '$4.99', -0.1), 'PRICE TAG', 66);
cell(gx(0), gy(1), 0.14, () => K.receipt(0, -300, 1, { title: 'RECEIPT', rows: [['COFFEE', '$4.50'], ['FEE', '$34.00', P.red]], total: ['TOTAL', '$38.50', P.red] }), 'RECEIPT', 66);
cell(gx(1), gy(1), 0.15, () => K.calculator(0, 0, 1, '4,433'), 'CALCULATOR', 66);
cell(gx(2), gy(1), 0.27, () => K.pctBadge(0, 0, 1, '22%'), 'PERCENT', 66);
cell(gx(3), gy(1), 0.2, () => K.trap(0, 100, 1, 0.1), 'THE TRAP', 66);
cell(gx(0), gy(2), 0.26, () => K.stamp('TRAP', 0, 0, 1), 'STAMP', 66);
cell(gx(1) + 80, gy(2), 0.3, () => K.splitBar({ x: -400, y: -50, w: 800, h: 100, parts: [{ value: 55, color: P.red, label: '$55 INTEREST' }, { value: 30, color: P.green, label: '$30' }] }), 'SPLIT BAR', 66);
cell(gx(3), gy(2), 0.34, () => { K.check(-110, 0, 0.32); K.redX(110, 0, 0.3); }, 'VERDICTS', 66);

// 4 · scenes
b = panel(20, 610, 760, 456, 4, 'SCENES');
const sw = 200, sx = (i) => b.x + 20 + i * (sw + 45);
frame(sx(0), b.y, sw, () => { K.desk(0); penny.draw({ x: 540, y: 1180, s: 0.9, pose: 'coin', expression: 'grin', t: 0.4, blink: false }); K.coinStack(170, 1190, 5, 70); });
frame(sx(1), b.y, sw, () => {
  K.paper();
  const data = [3000, 2659, 2357, 2089, 1852, 1641, 1455, 1290, 1143, 1013, 898, 784, 643, 467, 249, 0].map((v, i) => [i, v]);   // $3,000 at 22%, minimum = interest + 1%
  K.lineChart({ x: 220, y: 380, w: 760, h: 680, xMin: 0, xMax: 15, yMin: 0, yMax: 3000, xTicks: [0, 5, 10, 15], yTicks: [0, 1500, 3000], fmtX: (v) => v + ' YR', fmtY: (v) => K.fmtMoney(v), yLabel: 'BALANCE', series: [{ data, color: P.red }] });
});
frame(sx(2), b.y, sw, () => { K.vault(1.2); K.trap(540, 1000, 1.5, 1, false); K.stamp('TRAP', 540, 520, 1.1, P.red, -0.15, 1); });
['(A) DESK', '(B) GRAPH PAPER', '(C) THE VAULT'].forEach((t, i) => small(t, sx(i) + sw / 2, b.y + sw * 16 / 9 + 26, 'center', 15));

// 5 · charts
b = panel(790, 610, 520, 456, 5, 'CHARTS');
ctx.fillStyle = P.paper; ctx.fillRect(b.x, b.y, b.w, b.h - 10);
cell(b.x + b.w / 2 + 24, b.y + 4, 0.34, () => K.barChart({ x: -400, y: 70, w: 800, h: 300, max: 8000, bars: [{ label: 'BORROWED', value: 3000, color: P.teal }, { label: 'INTEREST', value: 4433, color: P.red }, { label: 'TOTAL', value: 7433, color: P.ink }], ticks: [0, 4000, 8000], fmt: (v) => K.fmtMoney(v) }), null);
cell(b.x + b.w / 2 + 24, b.y + 190, 0.34, () => {
  const g = [], f = []; for (let y = 0; y <= 30; y++) { g.push([y, 1000 * Math.pow(1.07, y)]); f.push([y, 1000]); }
  K.lineChart({ x: -400, y: 40, w: 800, h: 300, xMin: 0, xMax: 30, yMin: 0, yMax: 8000, xTicks: [0, 10, 20, 30], yTicks: [0, 4000, 8000], fmtX: (v) => v + ' YR', fmtY: (v) => K.fmtMoney(v), series: [{ data: f, color: P.teal, width: 8 }, { data: g, color: P.green }] });
}, null);
small('DATA-DRIVEN · AXES + UNITS · A VALUE ON EVERY BAR', b.x + b.w / 2, b.y + b.h - 18, 'center', 13, '#5A5560');

// 6 · rules
b = panel(1320, 610, 580, 456, 6, 'RULES');
rules(b, ['DRAW PENNY ONLY WITH CAST(\'PENNY\').', 'EVERY NUMBER IS SOURCED OR COMPUTED.', 'ONE IDEA PER SHOT, CUT EVERY 1.5-3.5 S.', 'THE TRAP REVEAL IS RED, ON ITS WORD.', 'CAPTIONS: 1-3 WORDS, ONE GOLD WORD.', 'KEEP Y 1250-1580 CLEAR FOR CAPTIONS.', 'EDUCATION, NEVER ADVICE. NO TICKERS.'], b.y + 26, 16, 52);
window.SHEET_READY = true;
