// The Case File style sheet, drawn with the style's own kit (and the Archivist through the cast).
import { ctx } from './core/lib.js';
import { startBoard, panel, frame, cell, small, swatches, rules } from './core/board.js';
import * as K from './core/kit.js';
const { P } = K;

const cv = document.getElementById('cv');
await document.fonts.load('900 40px Inter'); await document.fonts.load('700 40px FreeMono'); await document.fonts.load('700 40px Caladea');
startBoard(cv, { title: 'CASE FILE · THE STRANGE FILE · VIDEO STYLE SHEET', bg: '#100E0C', line: '#3D3228', head: '#EDE3CC', accent: P.amber, author: 'THE STRANGE FILE · 2026' });

const photoTank = (w, h) => { K.sepiaSky(h * 0.75, P.s2, P.s4); ctx.fillStyle = P.s1; ctx.fillRect(w * 0.2, h * 0.3, w * 0.45, h * 0.5); ctx.beginPath(); ctx.ellipse(w * 0.425, h * 0.3, w * 0.225, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = P.s0; ctx.fillRect(0, h * 0.78, w, h); };
const photoMan = (w, h) => { K.sepiaSky(h, P.s3, P.s4); K.person({ x: w / 2, y: h * 1.25, h: h * 1.05, hat: 'bowler' }); };

// 1 · hero frame
let b = panel(20, 80, 560, 520, 1, 'HERO FRAME');
frame(b.x + 6, b.y, 240, () => {
  K.desk(0.4, 540, 820);
  K.folder(560, 900, 1.05, -0.04, { label: 'BOSTON, 1919', no: 'FILE 014', open: 1, sheet: ['DATE: 15 JAN 1919', 'TIME: 12:40 P.M.', 'PLACE: NORTH END', 'CAUSE: ██████████'], redact: [[3, 140, 420]] });
  K.stamp('UNSOLVED', 620, 1230, 1, -0.14, 1);
  K.polaroid(250, 560, 0.85, -0.12, photoTank, 'the tank', 1);
  K.filmLook(0.4);
  K.captionTape([{ txt: 'A' }, { txt: 'wave' }, { txt: 'of' }, { txt: 'molasses.', hi: 1 }], 540, K.CAPLOOK.y, 0.95);
});
small('ONE LAMP,\nEVERYTHING ELSE DARK', b.x + 270, b.y + 40, 'left', 17);
small('EVIDENCE ON A DESK:\nFOLDERS, STAMPS,\nREDACTIONS', b.x + 270, b.y + 130, 'left', 17);
small('RED = EVIDENCE MARKS\nAMBER = LIGHT', b.x + 270, b.y + 245, 'left', 17);
small('THE ARCHIVIST OPENS\nAND CLOSES THE FILE', b.x + 270, b.y + 335, 'left', 17);

// 2 · palette
b = panel(590, 80, 660, 520, 2, 'PALETTE');
const yy = swatches(b, [['NIGHT', P.night], ['DESK', P.desk], ['AMBER', P.amber], ['MANILA', P.manila], ['PAPER', P.paper], ['RED', P.red], ['CORK', P.cork], ['SEPIA', P.s3]]);
['RED ONLY FOR STAMPS, STRING, ROUTES, X-MARKS, KEY WORD.', 'AMBER ONLY FOR LIGHT: THE LAMP, THE LANTERN, A WINDOW.', 'THE PAST IS SEPIA, LIKE AN OLD PHOTOGRAPH, WITH GRAIN.']
  .forEach((t, i) => small(t, b.x + 4, yy + 20 + i * 40, 'left', 15, '#EDE3CC'));
ctx.save(); ctx.beginPath(); ctx.roundRect(b.x, yy + 140, b.w, 150, 14); ctx.clip(); ctx.translate(b.x, yy + 140); ctx.scale(b.w / 1080, 150 / 300); K.desk(0, 540, 150); ctx.restore();
[['bowler', 0], ['cap', 0], ['bonnet', 0], ['bowler', 60]].forEach(([hat, arm], i) => cell(b.x + 110 + i * 140, yy + 275, 0.2, () => K.person({ x: 0, y: 0, h: 560, hat, arm, color: P.s4 }), null));

// 3 · components (on the desk)
b = panel(1260, 80, 640, 520, 3, 'COMPONENTS');
ctx.save(); ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 14); ctx.clip(); ctx.translate(b.x, b.y); ctx.scale(b.w / 1080, b.h / 760); K.desk(0, 540, 380); ctx.restore();
const gx = (i) => b.x + 90 + i * 150, gy = (r) => b.y + 95 + r * 210, L = '#EDE3CC';
cell(gx(0) + 10, gy(0), 0.18, () => K.folder(0, 0, 1, 0, { label: 'CASE 001', no: 'FILE 001', stamp: 'CLOSED' }), 'FOLDER', 100, L);
cell(gx(1) + 30, gy(0), 0.42, () => K.stamp('UNSOLVED', 0, 0, 1, -0.12, 1), 'STAMP', 100, L);
cell(gx(2) + 40, gy(0), 0.36, () => K.polaroid(0, 0, 1, 0.05, photoMan, 'witness', 1), 'POLAROID', 100, L);
cell(gx(3) + 30, gy(0), 0.4, () => K.xMark(0, 0, 1.4, 1), 'X MARK', 100, L);
cell(gx(0) + 30, gy(1) + 20, 0.3, () => K.sheet(0, 0, 420, 300, 0.02, ['NAME: ████', 'SEEN: 1872'], 1, 36), 'TYPED SHEET', 70, L);
cell(gx(1) + 70, gy(1) + 20, 0.35, () => { K.pin(-140, -40); K.string([-140, -40], [140, 30], 1, 50); }, 'PIN + STRING', 70, L);
cell(gx(2) + 50, gy(1) + 20, 0.28, () => K.slip('2.3 MILLION', 0, 0, 1, -0.03), 'SLIP', 70, L);
cell(gx(3) + 10, gy(1) + 20, 0.26, () => K.dateStamp('JAN 15, 1919', 'BOSTON, MASS.', 1, -190, -20), 'DATE STAMP', 70, L);

// 4 · scenes
b = panel(20, 610, 900, 456, 4, 'SCENES');
const sw = 196, sx = (i) => b.x + 14 + i * (sw + 22);
frame(sx(0), b.y, sw, () => { K.hostScene(0.6, { pose: 'present', expression: 'intrigued' }); K.filmLook(0.4); });
frame(sx(1), b.y, sw, () => {
  K.board(0.5); K.polaroid(300, 520, 0.9, -0.08, photoTank, 'the tank', 1); K.polaroid(780, 600, 0.9, 0.07, photoMan, 'the owner', 1);
  K.slip('JAN 15, 1919', 540, 1000, 1, 0.03); K.string([300, 330], [780, 410], 1); K.string([780, 410], [540, 960], 1); K.filmLook(0.4);
});
frame(sx(2), b.y, sw, () => {
  K.mapPage(0.5, 5); K.shape([[-50, 300], [700, 260], [820, 700], [600, 1100], [-50, 1250]], P.land); K.label('NORTH END', 330, 700, 44);
  K.route([[260, 980], [420, 860], [560, 780], [720, 600]], 0.85); K.xMark(260, 980, 1, 1); K.compass(860, 1350, 0.8); K.mapLight(0.5);
});
frame(sx(3), b.y, sw, () => { K.sepiaSky(1250); K.buildings(-100, 1200, 1250, 4); K.cobbles(1250); K.person({ x: 380, y: 1500, h: 520, hat: 'bowler', walk: 0.8 }); K.person({ x: 720, y: 1560, h: 560, hat: 'bonnet', dir: -1 }); K.oldPhoto(0.5); });
['(A) THE ARCHIVE', '(B) EVIDENCE BOARD', '(C) LAMP-LIT MAP', '(D) PERIOD SCENE'].forEach((t, i) => small(t, sx(i) + sw / 2, b.y + sw * 16 / 9 + 24, 'center', 13, '#E6DCC6'));

// 5 · captions
b = panel(930, 610, 400, 456, 5, 'CAPTIONS');
ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h - 10); ctx.clip(); ctx.translate(b.x, b.y); ctx.scale(b.w / 1080, (b.h - 10) / 1000); K.desk(0, 540, 500); ctx.restore();
[[[{ txt: 'In' }, { txt: '1919,', hi: 1 }], 70], [[{ txt: 'Boston' }, { txt: 'flooded.', hi: 1 }], 170], [[{ txt: 'With' }, { txt: 'molasses.', hi: 1 }], 270]]
  .forEach(([w, y]) => cell(b.x + b.w / 2, b.y + y, 0.4, () => K.captionTape(w, 0, 0), null));
small('TYPED ON LABEL TAPE\n1-3 WORDS · ONE RED WORD', b.x + b.w / 2, b.y + b.h - 50, 'center', 13, '#EDE3CC');

// 6 · rules
b = panel(1340, 610, 560, 456, 6, 'RULES');
rules(b, ['ONE LAMP: EVERYTHING ELSE FALLS TO BLACK.', 'THE ARCHIVIST OPENS AND CLOSES EVERY FILE.', 'DATE STAMP FIRST: WHEN, WHERE, THEN WHAT.', 'THE PAST IS AN OLD SEPIA PHOTOGRAPH.', 'NO GORE: OBJECTS, PLACES, CONSEQUENCES.', 'SLOW PUSH-INS, 2-3.5 S SHOTS, PAPER SOUNDS.', 'MOOD: CALM, INTRIGUED, A LITTLE UNCANNY.'], b.y + 26, 15, 52);
window.SHEET_READY = true;
