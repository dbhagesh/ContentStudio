// The Sakumai Studio style sheet, drawn with the template's own kit and the real cast (so it always matches renders).
import { ctx } from './core/lib.js';
import { startBoard, panel, frame, cell, small, swatches, rules } from './core/board.js';
import { cast } from './core/cast.js';
import * as K from './core/kit.js';
const { P } = K;
const S = cast('sakumai');

const cv = document.getElementById('cv');
await document.fonts.load('900 40px Inter'); await document.fonts.load('800 40px Inter');
startBoard(cv, { title: 'SAKUMAI STUDIO: VIDEO STYLE SHEET', author: 'CHANNEL SAKUMAI ONLY · DRAWN BY KIT.JS + CAST', bg: '#2A1A3A', line: '#6B5384', head: '#FCE6EE', accent: P.yellow });
const LIGHT = '#F3E9FA';
const card = (b, c = P.pinkWall) => { ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 14); ctx.fill(); };
function capSample(words, x, y, size) {
  ctx.save(); ctx.font = `900 ${size}px Inter`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.letterSpacing = '-1px';
  const sp = size * 0.26, ws = words.map(([w]) => ctx.measureText(w).width), tw = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
  let cx = x - tw / 2;
  words.forEach(([w, hi], i) => { ctx.lineWidth = size * 0.2; ctx.strokeStyle = P.ink; ctx.strokeText(w, cx, y + size * 0.06); ctx.strokeText(w, cx, y); ctx.fillStyle = hi ? P.yellow : P.white; ctx.fillText(w, cx, y); cx += ws[i] + sp; });
  ctx.restore();
}

// 1 · hero frame
let b = panel(20, 80, 400, 520, 1, 'HERO FRAME');
frame(b.x + 2, b.y, 240, () => {
  K.bedroom(1.2);
  S.draw({ x: 540, y: 1730, s: 1.25, t: 1.2, outfit: 'casual', hands: { l: [-150, -768], r: [150, -768] }, prop: K.headphones, expression: 'starry' });
  K.notes(1.2, 540, 640, { w: 520 }); K.fx('!?', 790, 520, 120, P.yellow, 0.2);
  capSample([['GIVE', 0], ['YOU', 0]], 540, 1360, 140); capSample([['GOOSEBUMPS?', 1]], 540, 1500, 140);
});
small('SHE REACTS\nFIRST, THEN\nEXPLAINS', b.x + 256, b.y + 30, 'left', 13, LIGHT);
small('DRAWN ONLY\nBY CAST()', b.x + 256, b.y + 130, 'left', 13, LIGHT);
small('PASTEL SETS,\nCUTE\nCUTAWAYS', b.x + 256, b.y + 210, 'left', 13, LIGHT);
small('ONE YELLOW\nWORD PER\nCAPTION', b.x + 256, b.y + 310, 'left', 13, LIGHT);

// 2 · sets
b = panel(430, 80, 800, 520, 2, 'SETS');
const fw = 170, fx = (i) => b.x + 4 + i * (fw + 20);
frame(fx(0), b.y, fw, () => { K.classroom(2, { board: 'FEELINGS 101' }); S.draw({ x: 400, y: 1760, s: 1.25, t: 2, pose: 'point', expression: 'wink' }); });
frame(fx(1), b.y, fw, () => { K.bedroom(2, { night: true }); S.draw({ x: 640, y: 1740, s: 1.2, t: 2, outfit: 'pajamas', expression: 'sleepy' }); });
frame(fx(2), b.y, fw, () => { K.nightSky(2, { moonFace: true, shooting: 0.4 }); S.draw({ x: 540, y: 1740, s: 1.25, t: 2, outfit: 'pajamas', pose: 'cheer', expression: 'love' }); });
frame(fx(3), b.y, fw, () => { K.insideBody(2, { tint: 'pink' }); K.brain(540, 700, 1.7, { glow: 1, sparkT: 2, faceMood: 'wow' }); K.hormoneCloud('dopamine', 608, 717, 440, 2, 1, 16, 1.2); });
['(A) CLASSROOM', '(B) BEDROOM · NIGHT', '(C) NIGHT SKY', '(D) INSIDE THE BODY'].forEach((t, i) => small(t, fx(i) + fw / 2, b.y + fw * 16 / 9 + 26, 'center', 13, LIGHT));
small('ALSO: X-RAY BOARD · SUNSET STREET · REACTION RAYS · SOFT PASTEL', b.x + b.w / 2, b.y + fw * 16 / 9 + 62, 'center', 13, '#BCA8D6');
small('TRANSITIONS: HEART IRIS (SIGNATURE) · STAR / CIRCLE IRIS · PASTEL STRIPE WIPE', b.x + b.w / 2, b.y + fw * 16 / 9 + 90, 'center', 13, '#BCA8D6');

// 3 · palette
b = panel(1240, 80, 660, 520, 3, 'PALETTE');
let yy = swatches(b, [['PINK', P.pink], ['ROSE', P.rose], ['LAVENDER', P.lav], ['LILAC', P.lilac], ['BUTTER', P.butter], ['MINT', P.mint], ['SKY', P.sky], ['NIGHT', P.nightMid]]);
yy = swatches({ x: b.x, y: yy - 30, w: b.w }, [['INK', P.ink], ['LINE', P.line], ['YELLOW', P.yellow], ['ORGAN', P.organ], ['BRAIN', P.brain], ['X-RAY', P.navy], ['BLOOD', P.blood], ['RED', P.red]]);
['PINK = FEELINGS + THE HEART. LAVENDER / NAVY = INSIDE.', 'YELLOW = THE KEYWORD, DOPAMINE, "AHA" SPARKLES.', 'RED ONLY FOR HER BOW AND A REAL ALARM BEAT.', 'FLAT PASTEL FILLS, PLUM LINES, ONE SOFT HIGHLIGHT.']
  .forEach((t, i) => small(t, b.x + 4, yy - 10 + i * 30, 'left', 14, LIGHT));

// 4 · body kit
b = panel(20, 610, 900, 456, 4, 'BODY CUTAWAY KIT');
card(b, P.lavLight);
const gx = (i) => b.x + 90 + i * 172, r1 = b.y + 92, r2 = b.y + 262;
cell(gx(0), r1, 0.34, () => K.heart(0, 0, 1.6, 0.4, 'wow'), 'HEART', 86, P.ink);
cell(gx(1), r1, 0.34, () => K.brain(0, 0, 1.4, { glow: 0.8, spot: [40, 10], faceMood: 'happy', sparkT: 1 }), 'BRAIN + GLOW', 86, P.ink);
cell(gx(2), r1, 0.34, () => K.lungs(0, 0, 1.4, 0.5, 'calm'), 'LUNGS', 86, P.ink);
cell(gx(3), r1, 0.34, () => K.stomach(0, 0, 1.5, 0, 'happy'), 'STOMACH', 86, P.ink);
cell(gx(4), r1, 0.34, () => K.neuron(0, 0, 1.6, 1), 'NEURON', 86, P.ink);
cell(gx(0) + 40, r2, 0.42, () => K.nerve([[-220, 60], [-80, -50], [60, 40], [220, -40]], 1, { u: 0.6 }), 'NERVE SIGNAL', 80, P.ink);
cell(gx(1) + 80, r2, 0.42, () => K.vessel([[-220, 40], [-60, -40], [80, 30], [220, -30]], 1.3), 'BLOOD VESSEL', 80, P.ink);
cell(gx(3) - 10, r2 + 8, 0.21, () => K.skinCutaway(0, 0, 1, 1, 1, { hairLabel: 1, muscleLabel: 1 }), 'SKIN + GOOSEBUMP', 84, P.ink);
cell(gx(4) + 10, r2, 0.5, () => { K.songBar(0, 0, 300, 0.6, 0.8, 1, { sc: 0.8 }); }, 'SONG BAR', 80, P.ink);

// 5 · hormones + captions
b = panel(930, 610, 480, 456, 5, 'HORMONES · CAPS');
card(b, P.pinkWall);
Object.keys(K.HORMONES).forEach((k, i) => cell(b.x + 80 + (i % 3) * 145, b.y + 38 + Math.floor(i / 3) * 92, 0.85, () => K.hormone(k, 0, 0, 1), K.HORMONES[k].label, 44, P.ink));
[[[['WHY', 0], ['DOES', 0], ['YOUR', 0]], 222], [[['FAVORITE', 0], ['SONG', 1]], 262], [[['STRAIGHT', 0], ['UP', 1]], 302]]
  .forEach(([w, y]) => { B_cap(w, b.x + b.w / 2, b.y + y); });
function B_cap(w, x, y) { ctx.save(); ctx.translate(x, y); ctx.scale(0.21, 0.21); capSample(w, 0, 0, 140); ctx.restore(); }
small('1-3 WORDS · ONE YELLOW WORD', b.x + b.w / 2, b.y + b.h - 22, 'center', 13, P.ink);

// 6 · rules
b = panel(1420, 610, 480, 456, 6, 'RULES');
rules(b, ['SAKUMAI ONLY THROUGH CAST().', 'OPEN ON HER REACTING, END ON HER.', 'ONE IDEA PER SHOT, CUT EVERY 1.5-3.5 S.', 'REVEALS LAND ON THEIR WORD.', 'X-RAY = WHOLE BODY; HEAD STAYS NORMAL.', 'KEY ACTION ABOVE Y 1250 (CAPTIONS).', 'CUTE, TRUE, KIND. NEVER GORE.'], b.y + 26, 14, 52);
window.SHEET_READY = true;
