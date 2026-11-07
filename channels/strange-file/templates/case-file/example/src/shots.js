// BOSTON WAS FLOODED WITH MOLASSES: the shot list (Case File example · Strange But True).
// One lamp per shot, the past in sepia, red only for evidence marks; the Archivist opens and closes the file.
import { ctx, W, H, TAU, clamp, lerp, seg, eo, eio, eob, rnd } from './core/lib.js';
import { L, Le, Wd } from './core/timing.js';
import * as K from './core/kit.js';
const { P } = K;

// ── set pieces for this story (sepia, like old photographs) ──
const MOL = '#160E08', MOLHI = 'rgba(232,190,130,0.8)';
/** the storage tank: x = centre, gy = ground, w, h. o = { drip 0..1, paint 0..1, crack 0..1 } */
function tank(x, gy, w, h, o = {}) {
  const top = gy - h, g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, P.s2); g.addColorStop(0.35, P.s3); g.addColorStop(1, P.s1);
  ctx.fillStyle = g; ctx.fillRect(x - w / 2, top, w, h);
  ctx.beginPath(); ctx.moveTo(x - w / 2 - 6, top + 4); ctx.lineTo(x, top - w * 0.16); ctx.lineTo(x + w / 2 + 6, top + 4); ctx.closePath(); ctx.fillStyle = P.s1; ctx.fill();
  ctx.fillStyle = 'rgba(30,24,18,0.55)';
  for (let r = 1; r < 7; r++) { const y = top + r * h / 7; ctx.fillRect(x - w / 2, y - 2, w, 4); for (let i = 0; i < 18; i++) ctx.fillRect(x - w / 2 + 8 + i * (w - 16) / 17, y + 5, 4, 4); }
  // leaks: dark streaks running down from the seams
  if (o.drip) for (let i = 0; i < 9; i++) { const sx = x - w / 2 + 30 + rnd(i * 3) * (w - 60), sy = top + (1 + Math.floor(rnd(i) * 5)) * h / 7, len = (60 + rnd(i + 5) * 160) * clamp(o.drip * 1.4 - rnd(i + 9) * 0.4); if (len <= 0) continue; ctx.fillStyle = 'rgba(22,14,8,0.85)'; ctx.beginPath(); ctx.moveTo(sx - 4, sy); ctx.lineTo(sx + 4, sy); ctx.lineTo(sx + 3, sy + len); ctx.arc(sx, sy + len, 5, 0, Math.PI); ctx.closePath(); ctx.fill(); }
  // the brown paint, rolled on from the top
  if (o.paint) { const ph = h * eio(clamp(o.paint)); ctx.fillStyle = 'rgba(58,38,22,0.93)'; ctx.fillRect(x - w / 2, top, w, ph); ctx.fillStyle = 'rgba(90,62,36,0.6)'; ctx.fillRect(x - w / 2, top + ph - 8, w, 8); }
  if (o.crack) { ctx.strokeStyle = MOL; ctx.lineWidth = 10 * o.crack; ctx.beginPath(); ctx.moveTo(x - 20, gy); for (let i = 1; i <= 8; i++) ctx.lineTo(x - 20 + (rnd(i) - 0.5) * 40, gy - i * h / 8 * clamp(o.crack * 1.5)); ctx.stroke(); }
}
/** the elevated railway: deck at y between x0 and x1, posts to the ground gy; bend 0..1 buckles the middle */
function trestle(x0, x1, y, gy, bend = 0, col = P.s0) {
  const mid = (x0 + x1) / 2, dip = (x) => bend * 150 * Math.max(0, 1 - Math.abs(x - mid) / 260);
  ctx.strokeStyle = col; ctx.lineWidth = 14; ctx.beginPath(); for (let x = x0; x <= x1; x += 20) ctx.lineTo(x, y + dip(x)); ctx.stroke();
  ctx.beginPath(); for (let x = x0; x <= x1; x += 20) ctx.lineTo(x, y + 40 + dip(x)); ctx.stroke();
  ctx.lineWidth = 5; for (let x = x0; x < x1; x += 60) { ctx.beginPath(); ctx.moveTo(x, y + dip(x)); ctx.lineTo(x + 60, y + 40 + dip(x + 60)); ctx.stroke(); }
  ctx.lineWidth = 16; for (let x = x0 + 40; x < x1; x += 180) { const lean = bend * Math.max(0, 1 - Math.abs(x - mid) / 260) * 0.5; ctx.beginPath(); ctx.moveTo(x, y + 40 + dip(x)); ctx.lineTo(x + lean * 180, gy); ctx.stroke(); }
}
/** the molasses wave: front at fx, crest height h above the ground gy, rolling in from the left */
function wave(fx, gy, h, t) {
  if (h <= 0) return;
  ctx.fillStyle = MOL; ctx.beginPath(); ctx.moveTo(-400, gy + 400); ctx.lineTo(-400, gy - h * 0.8);
  for (let x = -400; x <= fx - 160; x += 30) ctx.lineTo(x, gy - h * (0.78 + 0.06 * Math.sin(x * 0.012 + t * 3)));
  ctx.quadraticCurveTo(fx - 40, gy - h * 1.08, fx + 30, gy - h * 0.82); ctx.quadraticCurveTo(fx + 70, gy - h * 0.62, fx + 20, gy - h * 0.6);
  ctx.quadraticCurveTo(fx + 120, gy - h * 0.3, fx + 160, gy); ctx.lineTo(fx + 160, gy + 400); ctx.closePath(); ctx.fill();
  // a glossy rim along the crest: it reads as thick liquid, not a shadow
  ctx.strokeStyle = 'rgba(150,100,55,0.9)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-400, gy - h * 0.8);
  for (let x = -400; x <= fx - 160; x += 30) ctx.lineTo(x, gy - h * (0.78 + 0.06 * Math.sin(x * 0.012 + t * 3)));
  ctx.quadraticCurveTo(fx - 40, gy - h * 1.08, fx + 30, gy - h * 0.82); ctx.stroke();
  ctx.strokeStyle = MOLHI; ctx.lineWidth = 6; ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) { const x = fx - 120 - i * 170; ctx.beginPath(); ctx.moveTo(x, gy - h * 0.72 + i * 18); ctx.quadraticCurveTo(x + 60, gy - h * 0.82 + i * 18, x + 120, gy - h * 0.7 + i * 18); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(fx - 60, gy - h * 0.98); ctx.quadraticCurveTo(fx + 10, gy - h * 0.98, fx + 30, gy - h * 0.82); ctx.stroke();
}
/** a North End street in 1919 (sepia): buildings, the El, cobbles */
function street(seed = 2, gy = 1300) { K.sepiaSky(gy, P.s2, P.s5); K.buildings(-200, 1300, gy, seed, P.s1, P.s3); K.cobbles(gy, P.s2, P.s1); }
/** a pocket-watch style clock on the desk */
function clock(x, y, r, hh, mm) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(10, 16, r, 0, TAU); ctx.fill();
  ctx.fillStyle = P.brass; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.fillStyle = P.paper; ctx.beginPath(); ctx.arc(0, 0, r * 0.86, 0, TAU); ctx.fill();
  ctx.fillStyle = P.typed; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.fillRect(Math.sin(a) * r * 0.72 - 3, -Math.cos(a) * r * 0.72 - 3, 6, 6); }
  const hand = (a, l, w) => { ctx.strokeStyle = P.typed; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(a) * l, -Math.cos(a) * l); ctx.stroke(); };
  hand((hh % 12 + mm / 60) / 12 * TAU, r * 0.45, 10); hand(mm / 60 * TAU, r * 0.68, 6); ctx.restore();
}
/** a thermometer prop: level 0..1 */
function thermometer(x, y, h, level) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(14, 14, 70, h);
  ctx.fillStyle = P.paper; ctx.beginPath(); ctx.roundRect(0, 0, 70, h, 35); ctx.fill();
  ctx.fillStyle = P.typed; for (let i = 1; i < 9; i++) ctx.fillRect(48, i * (h - 90) / 9 + 10, 14, 4);
  ctx.fillStyle = P.amber; const top = 20 + (h - 110) * (1 - level); ctx.fillRect(26, top, 18, h - 60 - top); ctx.beginPath(); ctx.arc(35, h - 40, 26, 0, TAU); ctx.fill(); ctx.restore();
}
/** the North End, simplified, as a lamp-lit map. flood 0..1 spreads the molasses from the tank */
const TANK_AT = [470, 1040];
function northEndMap(t, flood, seed = 6) {
  K.mapPage(t, seed);
  K.shape([[-60, 380], [380, 330], [700, 420], [880, 640], [930, 900], [780, 1080], [520, 1130], [260, 1240], [-60, 1300]], P.land);
  K.shape([[-60, 1300], [260, 1240], [520, 1130], [780, 1080], [930, 900], [1140, 860], [1140, 2000], [-60, 2000]], P.sea, 'rgba(30,40,40,0.6)');
  ctx.strokeStyle = 'rgba(40,28,16,0.55)'; ctx.lineWidth = 3;
  for (const [a, b] of [[[60, 520], [820, 760]], [[120, 760], [860, 860]], [[40, 960], [600, 620]], [[300, 420], [380, 1180]], [[560, 450], [640, 1100]]]) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  // Commercial Street along the waterfront
  ctx.strokeStyle = P.ink; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-60, 1210); ctx.quadraticCurveTo(300, 1150, 520, 1070); ctx.quadraticCurveTo(700, 1010, 900, 860); ctx.stroke();
  if (flood > 0) {
    ctx.save(); ctx.beginPath(); ctx.moveTo(-60, 380); [[380, 330], [700, 420], [880, 640], [930, 900], [780, 1080], [520, 1130], [260, 1240], [-60, 1300]].forEach((p) => ctx.lineTo(p[0], p[1])); ctx.closePath(); ctx.clip();
    const r = 40 + 380 * eo(clamp(flood));
    ctx.fillStyle = 'rgba(22,14,8,0.88)'; ctx.beginPath();
    for (let i = 0; i <= 48; i++) { const a = i / 48 * TAU, k = 1 + 0.22 * Math.sin(a * 5 + 1) + 0.12 * Math.sin(a * 9); ctx.lineTo(TANK_AT[0] + Math.cos(a) * r * k * 1.15, TANK_AT[1] + Math.sin(a) * r * k * 0.8); }
    ctx.fill(); ctx.restore();
  }
  K.label('NORTH END', 330, 560, 48); K.label('BOSTON HARBOR', 760, 1420, 40, '#2A3533'); K.label('COMMERCIAL ST.', 250, 1150, 28, P.ink, -0.2);
  K.compass(900, 520, 0.6);
}
const photoTank = (o) => (w, h) => { K.sepiaSky(h * 0.82, P.s2, P.s5); tank(w * 0.5, h * 0.86, w * 0.5, h * 0.62, o); ctx.fillStyle = P.s0; ctx.fillRect(0, h * 0.86, w, h); };
const photoEl = (w, h) => { K.sepiaSky(h * 0.8, P.s2, P.s5); ctx.save(); ctx.scale(w / 1080, w / 1080); trestle(-100, 1200, 420, 1000, 1, P.s0); ctx.restore(); ctx.fillStyle = MOL; ctx.fillRect(0, h * 0.8, w, h); };
const photoStreet = (w, h) => { K.sepiaSky(h * 0.7, P.s2, P.s5); ctx.save(); ctx.scale(w / 1080, w / 1080); K.buildings(-100, 1200, 760, 5, P.s1, P.s3); ctx.restore(); ctx.fillStyle = MOL; ctx.fillRect(0, h * 0.7, w, h); ctx.strokeStyle = MOLHI; ctx.lineWidth = 3; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(20 + i * 70, h * 0.78 + i * 12); ctx.lineTo(90 + i * 70, h * 0.78 + i * 12); ctx.stroke(); } };

export function buildShots() {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +t.toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);
  /** a word's start relative to shot start st (falls back to a fraction of the line if Whisper spelled it differently) */
  const at = (word, line, st, frac = 0.5) => { try { return Wd(word, line) - st; } catch { return L(line) + (Le(line) - L(line)) * frac - st; } };

  // 1 · "In nineteen nineteen," : the Archivist lifts his lantern in the archive, 1919 types on
  { const st = 0;
    add({ id: 'S01', at: st, cam: [600, 700], zoom: 0.07, note: 'the Archivist raises his lantern; 1919 slip', draw(lt, d, t) {
      K.hostScene(t, { pose: 'present', poseFrom: 'stand', poseK: eio(seg(lt, 0.0, 0.6)), expression: 'knowing', x: 600, y: 1990, s: 1.55 });
      K.slip('1919', 270, 330, eob(seg(lt, 0.3, 0.6)), -0.05, 110);
      K.filmLook(t, 0.4);
    } });
    cue(0.05, 'whoosh', { gain: 0.4 }); cue(0.4, 'pop', { gain: 0.45 }); }

  // 2 · "Boston was flooded with molasses." : a dark wave rolls down a 1919 street
  { const st = cut(1), m = at('molasses', 1, st, 0.7);
    add({ id: 'S02', at: st, cam: [540, 1100], zoom: 0.05, note: 'sepia street; the molasses wave rolls in from the left', draw(lt, d, t) {
      street(3, 1320); trestle(-100, 1200, 820, 1320, 0);
      K.person({ x: 760, y: 1380, h: 300, hat: 'bowler', dir: -1, walk: lt * 6 }); K.person({ x: 900, y: 1400, h: 290, hat: 'bonnet', dir: -1 });
      const p = eio(clamp(lt / (m + 0.6))); wave(lerp(-300, 560, p), 1420, lerp(150, 560, p), t);
      K.oldPhoto(t);
    } });
    cue(st, 'whoosh', { gain: 0.5 }); cue(st + 0.1, 'sizzle', { dur: 2.2, gain: 0.35 }); }

  // 3 · "a strangely warm day in January, just after noon" : desk, date stamp, thermometer, clock
  { const st = cut(2), wm = at('warm', 2, st, 0.3), jan = at('january', 2, st, 0.55), nn = at('noon', 2, st, 0.9);
    add({ id: 'S03', at: st, cam: [540, 900], zoom: 0.06, note: 'date stamp JAN 15, 1919; thermometer rises; clock just after noon', draw(lt, d, t) {
      K.desk(t, 540, 820);
      ctx.save(); ctx.translate(90, 300); ctx.scale(1.45, 1.45); K.dateStamp('JAN 15, 1919', 'BOSTON, MASS.', seg(lt, jan - 0.3, jan + 0.6), 0, 0); ctx.restore();
      thermometer(150, 600, 640, lerp(0.15, 0.62, eio(seg(lt, wm - 0.1, wm + 0.9))));
      K.slip('UNUSUALLY WARM', 610, 700, eob(seg(lt, wm, wm + 0.3)), 0.04, 56);
      clock(640, 1080, 190, 12, 30 + 10 * eio(seg(lt, nn - 0.4, nn + 0.3)));
      K.filmLook(t, 0.45);
    } });
    cue(st, 'whoosh', { gain: 0.4 }); cue(st + wm, 'pop', { gain: 0.4 }); cue(st + jan - 0.2, 'pop', { gain: 0.35 }); cue(st + nn, 'thud', { gain: 0.3 }); }

  // 4 · "On Commercial Street stood a steel tank, fifty feet tall," : the tank towers over the street
  { const st = cut(3), tk = at('tank', 3, st, 0.6), ff = at('fifty', 3, st, 0.75);
    add({ id: 'S04', at: st, cam: [540, 800], zoom: 0.08, note: 'sepia: the giant tank over the North End, 50 FT slip', draw(lt, d, t) {
      K.sepiaSky(1300, P.s2, P.s5); K.buildings(-200, 260, 1300, 8, P.s1, P.s3); K.buildings(820, 1300, 1300, 11, P.s1, P.s3);
      tank(540, 1300, 560, lerp(560, 760, eio(seg(lt, 0, tk + 0.4))));
      trestle(-100, 1200, 1060, 1300, 0); K.cobbles(1300, P.s2, P.s1);
      K.person({ x: 250, y: 1420, h: 200, hat: 'cap' }); K.person({ x: 330, y: 1430, h: 190, hat: 'bowler', dir: -1 });
      K.oldPhoto(t, 0.7);
      K.slip('50 FT TALL', 760, 360, eob(seg(lt, ff, ff + 0.3)), 0.05, 72);
    } });
    cue(st, 'whoosh', { gain: 0.5 }); cue(st + tk, 'thud', { gain: 0.35 }); cue(st + ff, 'pop', { gain: 0.45 }); }

  // 5 · "holding over two million gallons of molasses." : the number, on the desk
  { const st = cut(4), mi = at('million', 4, st, 0.4);
    add({ id: 'S05', at: st, cam: [540, 860], zoom: 0.06, note: 'fact card 2.3 MILLION GALLONS beside a polaroid of the tank', draw(lt, d, t) {
      K.desk(t, 540, 760);
      K.polaroid(300, 470, 1.05, -0.1, photoTank({}), 'Commercial St.', seg(lt, 0, 0.35));
      K.factCard('2,300,000', 'GALLONS OF MOLASSES', 560, 1000, eob(seg(lt, mi - 0.15, mi + 0.2)), -0.03);
      K.filmLook(t, 0.45);
    } });
    cue(st, 'whoosh', { gain: 0.4 }); cue(st + 0.05, 'pop', { gain: 0.35 }); cue(st + mi - 0.1, 'thud', { gain: 0.45 }); }

  // 6 · "It leaked so badly," : the polaroid close-up, drips run, red circle
  { const st = cut(5), lk = at('leaked', 5, st, 0.3);
    add({ id: 'S06', at: st, cam: [540, 820], zoom: 0.08, note: 'close polaroid: the tank streaked with leaks, red circle', draw(lt, d, t) {
      K.desk(t, 540, 760);
      K.polaroid(540, 820, 2.0, -0.03, photoTank({ drip: eio(seg(lt, lk - 0.2, d)) }), 'it leaked', 1);
      K.redCircle(560, 760, 250, 200, seg(lt, lk + 0.2, lk + 0.9));
      K.filmLook(t, 0.45);
    } });
    cue(st, 'whoosh', { gain: 0.4 }); cue(st + lk + 0.2, 'slide', { dur: 0.6, gain: 0.35 }); }

  // 7 · "the company reportedly painted it brown, to hide the drips." : paint rolls down; the leak report is redacted
  { const st = cut(6), br = at('brown', 6, st, 0.55), hd = at('hide', 6, st, 0.8);
    add({ id: 'S07', at: st, cam: [540, 900], zoom: 0.06, note: 'paint covers the leaks in the polaroid; the LEAKS line is redacted', draw(lt, d, t) {
      K.desk(t, 540, 760);
      K.sheet(600, 1130, 760, 420, 0.03, ['TANK NO. 1, COMMERCIAL ST.', 'COLOUR: BROWN', 'LEAKS: ONTO THE STREET'], clamp(lt / 0.9), 36);
      K.redact(355, 1188, 520, 46, seg(lt, hd - 0.1, hd + 0.4));
      K.polaroid(470, 560, 1.4, -0.06, photoTank({ drip: 1, paint: seg(lt, br - 0.5, br + 0.4) }), 'painted brown', 1);
      K.filmLook(t, 0.45);
    } });
    cue(st, 'whoosh', { gain: 0.4 }); cue(st + br - 0.4, 'slide', { dur: 0.9, gain: 0.35 }); cue(st + hd, 'thud', { gain: 0.35 }); }

  // 8 · "Then, without warning, the tank split open." : the riveted seam, rivets fly, the crack opens
  { const st = cut(7), bu = at('split', 7, st, 0.75), gf = at('tank', 7, st, 0.55) - 0.25;
    add({ id: 'S08', at: st, cam: [540, 900], zoom: 0.1, note: 'close on the riveted steel; rivets pop, the seam splits open on "split"', draw(lt, d, t) {
      const shake = lt > bu ? Math.sin(lt * 70) * 14 * Math.max(0, 1 - (lt - bu) * 2) : 0;
      ctx.save(); ctx.translate(shake, shake * 0.6);
      const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, P.s2); g.addColorStop(0.5, P.s3); g.addColorStop(1, P.s1); ctx.fillStyle = g; ctx.fillRect(-300, -300, W + 600, H + 600);
      ctx.fillStyle = 'rgba(30,24,18,0.6)'; for (let r = 0; r < 5; r++) { const y = 260 + r * 300; ctx.fillRect(-300, y, W + 600, 14); }
      const open = lt > bu ? eo(clamp((lt - bu) / 0.6)) : 0;
      ctx.fillStyle = MOL; ctx.beginPath(); ctx.moveTo(540 - 30 * open, -300); for (let i = 0; i <= 10; i++) ctx.lineTo(540 + (rnd(i) - 0.5) * 60 - 160 * open, i * 230); ctx.lineTo(540 + 160 * open, H + 300); for (let i = 10; i >= 0; i--) ctx.lineTo(540 + (rnd(i) - 0.5) * 60 + 160 * open, i * 230); ctx.closePath(); if (open > 0) ctx.fill();
      for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) {
        const x = 80 + c * 115, y = 300 + r * 300, k = r * 9 + c, pop = gf + rnd(k) * (bu - gf + 0.2), fly = lt > pop ? (lt - pop) : 0;
        const fx = x + (x - 540) * fly * 4 + (rnd(k + 2) - 0.5) * fly * 600, fy = y + fly * fly * 900 - fly * 300;
        if (fly > 1.2) continue;
        ctx.fillStyle = P.s1; ctx.beginPath(); ctx.arc(fx, fy, 16, 0, TAU); ctx.fill(); ctx.fillStyle = P.s4; ctx.beginPath(); ctx.arc(fx - 5, fy - 5, 6, 0, TAU); ctx.fill();
      }
      ctx.restore();
      K.oldPhoto(t, 0.75);
    } });
    cue(st, 'whoosh', { gain: 0.4 }); for (let i = 0; i < 6; i++) cue(st + gf + i * 0.12, 'pop', { gain: 0.3 }); cue(st + bu, 'slam', { gain: 0.8 }); }

  // 9 · "A wave, reportedly twenty-five feet high," : the wave towers over the street, measured in red
  { const st = cut(8), tw = at('twenty', 8, st, 0.45);
    add({ id: 'S09', at: st, cam: [540, 1000], zoom: 0.08, note: 'sepia: the dark wave towers over a building; red 25 FT measure', draw(lt, d, t) {
      street(12, 1320);
      wave(lerp(820, 940, eio(clamp(lt / d))), 1440, 760, t);
      const k = seg(lt, tw - 0.1, tw + 0.5); if (k > 0) {
        ctx.strokeStyle = P.red; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(940, 1420); ctx.lineTo(940, 1420 - 780 * eo(k)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(910, 1420); ctx.lineTo(970, 1420); if (k > 0.9) { ctx.moveTo(910, 640); ctx.lineTo(970, 640); } ctx.stroke(); }
      K.oldPhoto(t, 0.75);
      K.slip('~25 FT HIGH', 700, 420, eob(seg(lt, tw + 0.2, tw + 0.5)), 0.05, 72);
    } });
    cue(st, 'whoosh', { gain: 0.4 }); cue(st + 0.05, 'sizzle', { dur: 2, gain: 0.35 }); cue(st + tw + 0.2, 'pop', { gain: 0.45 }); }

  // 9b · "raced through the streets." : the lamp-lit map of the North End floods
  { const st = cut(9), tw = -1, ne = at('streets', 9, st, 0.6);
    add({ id: 'S09b', at: st, cam: [540, 950], zoom: 0.06, note: 'map of the North End; the dark flood spreads from the tank X', draw(lt, d, t) {
      northEndMap(t, seg(lt, 0, d * 1.1));
      K.xMark(TANK_AT[0], TANK_AT[1], 0.9, seg(lt, 0, 0.25));
      K.slip('35 MPH', 700, 280, eob(seg(lt, 0.3, 0.6)), -0.04, 72);
      K.redCircle(330, 560, 230, 80, seg(lt, ne - 0.1, ne + 0.6), 7);
      K.mapLight(t, 540, 900);
    } });
    cue(st, 'whoosh', { gain: 0.4 }); cue(st + 0.1, 'sizzle', { dur: 2.6, gain: 0.35 }); cue(st + 0.3, 'pop', { gain: 0.45 }); }

  // 10 · "It bent the elevated railway," : the El bends as the wave passes
  { const st = cut(10), bk = at('bent', 10, st, 0.15);
    add({ id: 'S10', at: st, cam: [540, 1000], zoom: 0.05, note: 'sepia: the elevated railway buckles over a street of molasses', draw(lt, d, t) {
      K.sepiaSky(1300, P.s3, P.s5); K.buildings(-200, 1300, 1300, 7, P.s2, P.s4); K.cobbles(1300, P.s2, P.s1);
      ctx.save(); ctx.translate(0, 0); trestle(-100, 1200, 640, 1300, eio(seg(lt, bk, bk + 0.8)), P.s0); ctx.restore();
      ctx.fillStyle = MOL; ctx.fillRect(-300, 1300 - 40 * eio(seg(lt, 0, 0.6)), W + 600, 900);
      wave(lerp(1300, 1700, eio(seg(lt, 0, 1))), 1300, 300, t);
      K.oldPhoto(t, 0.75);
    } });
    cue(st, 'whoosh', { gain: 0.4 }); cue(st + bk + 0.15, 'thud', { gain: 0.6 });
    // 10b · "and twenty-one people lost their lives." : a quiet evidence board, the number
    const st2 = cut(11);
    add({ id: 'S10b', at: st2, cam: [540, 860], zoom: 0.04, note: 'evidence board: polaroids of the El and the street; 21 LIVES LOST', draw(lt, d, t) {
      K.board(t, 3);
      K.polaroid(300, 470, 0.95, -0.07, photoEl, 'the El', 1);
      K.polaroid(780, 540, 0.95, 0.06, photoStreet, 'Commercial St.', 1);
      K.string([300, 270], [780, 340], seg(lt, 0.1, 0.6));
      K.string([780, 340], [540, 920], seg(lt, 0.4, 0.9));
      K.slip('21 LIVES LOST', 540, 960, eob(seg(lt, 0.3, 0.6)), 0.02, 64);
      K.slip('ABOUT 150 HURT', 540, 1150, eob(seg(lt, 0.9, 1.2)), -0.03, 44);
      K.filmLook(t, 0.55);
    } });
    cue(st2, 'whoosh', { gain: 0.3 }); cue(st2 + 0.3, 'thud', { gain: 0.35 }); }

  // 11 · "The strange part? As it cooled, it thickened like glue," : thermometer falls, the drip slows
  { const st = cut(12), co = at('cooled', 12, st, 0.45), th = at('thickened', 12, st, 0.7);
    add({ id: 'S11', at: st, cam: [540, 860], zoom: 0.07, note: 'desk: thermometer drops; a molasses drip slows and thickens', draw(lt, d, t) {
      K.desk(t, 540, 760);
      thermometer(150, 520, 640, lerp(0.62, 0.22, eio(seg(lt, co - 0.2, co + 0.8))));
      const k = eio(seg(lt, th - 0.4, th + 0.6)), y0 = 420;
      ctx.fillStyle = MOL; ctx.beginPath(); ctx.ellipse(620, y0, 200, 50, 0, 0, TAU); ctx.fill();
      const len = lerp(120 + (lt * 260) % 360, 380, k), wdt = lerp(26, 70, k);
      ctx.beginPath(); ctx.moveTo(620 - wdt, y0); ctx.quadraticCurveTo(620 - wdt * 0.5, y0 + len * 0.6, 620 - wdt * 0.7, y0 + len); ctx.arc(620, y0 + len, wdt * 0.7, Math.PI, 0, true); ctx.quadraticCurveTo(620 + wdt * 0.5, y0 + len * 0.6, 620 + wdt, y0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = MOLHI; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(620 - wdt * 0.3, y0 + 30); ctx.lineTo(620 - wdt * 0.35, y0 + len * 0.8); ctx.stroke();
      K.slip('THICK AS GLUE', 640, 1060, eob(seg(lt, th, th + 0.3)), 0.04, 54);
      K.filmLook(t, 0.45);
    } });
    cue(st, 'whoosh', { gain: 0.4 }); cue(st + co, 'slide', { dur: 0.8, gain: 0.3 }); cue(st + th, 'pop', { gain: 0.4 }); }

  // 12 · "trapping people and slowing the rescue." : rescuers wade slowly through the street
  { const st = cut(13);
    add({ id: 'S12', at: st, cam: [540, 1150], zoom: 0.05, note: 'sepia: rescuers wade through knee-deep molasses with lanterns', draw(lt, d, t) {
      K.sepiaSky(1260, P.s3, P.s5); K.buildings(-200, 1300, 1260, 9, P.s3, P.s4); K.cobbles(1260, P.s2, P.s1);
      for (const [x, h, hat, ph] of [[260, 420, 'cap', 0], [520, 450, 'bowler', 1.3], [800, 400, 'cap', 2.1]]) {
        const bob = Math.sin(t * 1.4 + ph) * 6; K.person({ x: x + lt * 18, y: 1500 + bob, h, hat, walk: t * 1.2 + ph, arm: 40 });
      }
      ctx.fillStyle = MOL; ctx.fillRect(-300, 1380, W + 600, 900);
      ctx.strokeStyle = MOLHI; ctx.lineWidth = 4; for (let i = 0; i < 7; i++) { const x = (i * 170 + t * 10) % 1200 - 60; ctx.beginPath(); ctx.moveTo(x, 1410 + i * 9); ctx.lineTo(x + 90, 1410 + i * 9); ctx.stroke(); }
      K.oldPhoto(t, 0.75);
    } });
    cue(st, 'whoosh', { gain: 0.35 }); }

  // 13 · "Years later, the company was found responsible." : the file closes, LIABLE is stamped
  { const st = cut(14), rs = at('responsible', 14, st, 0.85);
    add({ id: 'S13', at: st, cam: [540, 860], zoom: 0.06, note: 'the case folder on the desk; LIABLE stamp slams down', draw(lt, d, t) {
      K.desk(t, 540, 760);
      K.folder(540, 880, 1.1, -0.03, { label: 'MOLASSES, 1919', no: 'FILE 001' });
      K.stamp('LIABLE', 560, 1010, 1.15, -0.14, seg(lt, rs - 0.05, rs + 1.2));
      K.filmLook(t, 0.45);
    } });
    cue(st, 'whoosh', { gain: 0.4 }); cue(st + rs + 0.15, 'thud', { gain: 0.7 }); }

  // 14 · "Locals say, on hot days, the North End still smells sweet." : the Archivist tips his hat; stamped TRUE
  { const st = cut(15), sw = at('sweet', 15, st, 0.9);
    add({ id: 'S14', at: st, cam: [600, 700], zoom: 0.06, note: 'the Archivist with the file, tips his hat; TRUE stamp', draw(lt, d, t) {
      const tip = seg(lt, sw - 0.6, sw);
      K.hostScene(t, { pose: tip > 0 ? 'tip' : 'file', poseFrom: 'file', poseK: eio(tip), expression: 'wry', x: 600, y: 1990, s: 1.55 });
      K.stamp('TRUE', 300, 300, 1.7, -0.14, seg(lt, sw + 0.1, sw + 1.4));
      K.filmLook(t, 0.4);
    } });
    cue(st, 'whoosh', { gain: 0.4 }); cue(st + sw + 0.25, 'thud', { gain: 0.6 }); }

  return { shots: S, cues: CUES };
}
