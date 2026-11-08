// WHY YOUR CARD WANTS YOU TO PAY THE MINIMUM: the shot list (with script.json, the only per-video files).
// A shot: { id, at, cam: [cx, cy], zoom, note, draw(lt, d, t) } · lt = time in shot, d = shot length, t = film time.
// Every number on screen comes from simulate() below (the same math as script.json "sources").
import { ctx, W, H, clamp, lerp, seg, eo, eio, eob } from './core/lib.js';
import { L, Le, Wd, T } from './core/timing.js';
import { cast } from './core/cast.js';
import * as K from './core/kit.js';
const { P } = K;

/** $B at APR a, paying `pay(balance, interest)` each month; → { months, interest, paid, hist: [balance at month m] } */
function simulate(B, apr, pay) {
  const r = apr / 12, hist = [B]; let m = 0, interest = 0, paid = 0;
  while (B > 0.005 && m < 1200) { const i = B * r; interest += i; const p = Math.min(pay(B, i), B + i); B = B + i - p; paid += p; m++; hist.push(Math.max(0, B)); }
  return { months: m, interest, paid, hist };
}
const BAL = 3000, APR = 0.22;
const MIN = simulate(BAL, APR, (b, i) => Math.max(i + b * 0.01, 25));     // minimum = interest + 1%, at least $25
const FLAT = simulate(BAL, APR, () => 150);
const FIRST_INT = BAL * APR / 12, FIRST_MIN = FIRST_INT + BAL * 0.01;       // $55 + $30 = $85
// the script's spoken numbers must match the math: 15 years, ~$4,400, just over 2 years, under $800
if (MIN.months !== 180 || Math.round(MIN.interest) !== 4433 || FLAT.months !== 26 || FLAT.interest >= 800 || Math.round(FIRST_MIN) !== 85) throw new Error('numbers drifted from the script');

export function buildShots() {
  const S = [], CUES = [];
  const add = (o) => (S.push(o), o);
  const cue = (t, type, o = {}) => CUES.push({ t: +t.toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);
  const penny = cast('penny');
  /** Penny peeking up from the bottom edge, below the captions (head ≈ y 1610-1900) */
  const peek = (o) => penny.draw({ x: 880, y: 2340, s: 0.74, flip: -1, ...o });
  const pop = (lt, at, dur = 0.3) => (lt > at ? eob(seg(lt, at, at + dur)) : 0);

  // ── 1 · HOOK: the card floats in, Penny eyes it; "minimum" turns her suspicious ─────────────
  {
    const st = cut(0), mn = Wd('minimum', 0) - st;
    add({ id: 'S01', at: st, cam: [540, 760], zoom: 0.08, note: 'desk, big card floats in, MINIMUM DUE tag on "minimum", Penny suspicious',
      draw(lt, d, t) {
        K.desk(t, 1180);
        const k = eob(seg(lt, 0, 0.45));
        K.creditCard(lerp(1300, 760, k), 330 + Math.sin(t * 2) * 12, 1.15, -0.12 + Math.sin(t * 1.6) * 0.03);
        K.pill('MINIMUM DUE', 790, 560, 50, P.gold, P.ink, pop(lt, mn));
        const sus = lt > mn;
        penny.draw({ x: 330, y: 1215, s: 0.92, t, pose: sus ? 'think' : 'stand', poseFrom: sus ? 'stand' : null, poseK: eio(seg(lt, mn, mn + 0.3)),
          expression: sus ? 'suspicious' : 'neutral', look: [1, -0.4], talk: 0 });
      } });
    cue(st + 0.05, 'whoosh'); cue(st + mn, 'pop'); cue(st + mn + 0.25, 'boing', { gain: 0.5 });
  }

  // ── 2 · "Say you owe three thousand dollars": the balance ticks up ──────────────────────────
  const balanceCard = (lt, v, extra) => {
    K.paper();
    K.card(110, 300, 860, 560, { title: 'YOUR CARD', titleFill: P.teal });
    K.label('BALANCE', 540, 470, 52, P.inkSoft, { weight: 900, spacing: 4 });
    K.counter(v, 540, 640, 190, { prefix: '$' });
    if (extra) extra();
  };
  {
    const st = cut(1), owe = Wd('owe', 1) - st, th = Wd('dollars', 1) - st;
    add({ id: 'S02', at: st, cam: [540, 600], note: 'balance counter ticks 0 → $3,000 from "owe" to "dollars"',
      draw(lt, d, t) {
        balanceCard(lt, Math.round(K.tick(0, BAL, seg(lt, owe, th + 0.2))));
        peek({ t, expression: 'neutral', look: [0.6, -1] });
      } });
    cue(st, 'whoosh'); cue(st + owe, 'slide', { dur: th + 0.2 - owe, gain: 0.5 }); cue(st + th + 0.2, 'ding', { gain: 0.6 });
  }

  // ── 3 · "at twenty-two percent": the APR seal slams on ───────────────────────────────────────
  {
    const st = cut(2), tw = Wd('twenty', 2) - st, avg = Wd('average', 2) - st;
    add({ id: 'S03', at: st, cam: [700, 520], zoom: 0.07, note: '22% APR seal slams on "twenty", Fed source footnote on "average"',
      draw(lt, d, t) {
        balanceCard(lt, BAL, () => {
          K.pctBadge(830, 330, 0.95, '22%', P.red, pop(lt, tw, 0.25));
          if (lt > tw) K.label('APR', 830, 470, 48, P.red, { weight: 900, spacing: 4 });
          K.pill('ABOUT THE US AVERAGE', 540, 960, 46, P.ink, P.white, pop(lt, avg));
          K.footnote('Federal Reserve G.19: ~22% on cards charged interest, 2025', 540, 1060, clamp((lt - avg) * 3));
        });
        peek({ t, expression: lt > tw ? 'surprised' : 'neutral', look: [0.3, -1] });
      } });
    cue(st, 'whoosh'); cue(st + tw, 'stamp'); cue(st + avg, 'pop', { gain: 0.6 });
  }

  // ── 4 · the statement: minimum due $85 ───────────────────────────────────────────────────────
  {
    const st = cut(3), ef = Wd('eighty', 3) - st;
    add({ id: 'S04', at: st, cam: [540, 700], note: 'statement prints, MINIMUM DUE $85.00 boxed in gold on "eighty-five"',
      draw(lt, d, t) {
        K.paper();
        K.statement(540, 380, 820, { s: 1.15, title: 'MONTHLY STATEMENT', p: clamp(lt / 0.6), hi: 2, hiA: clamp((lt - ef) * 4), hiColor: P.gold,
          rows: [['BALANCE', K.fmtMoney(BAL)], ['APR', '22%', P.red], ['MINIMUM DUE', K.fmtMoney(FIRST_MIN, 2)]] });
        K.burst(540, 1060, 1.4, lt > ef ? 1 - seg(lt, ef + 0.3, ef + 0.8) : 0);
        K.pill('DUE THIS MONTH', 540, 1060, 50, P.ink, P.white, pop(lt, ef));
        peek({ t, expression: lt > ef ? 'smile' : 'neutral', look: [0.2, -1] });
      } });
    cue(st, 'whoosh'); cue(st + 0.1, 'tock', { gain: 0.4 }); cue(st + 0.35, 'tock', { gain: 0.4 }); cue(st + ef, 'ding');
  }

  // ── 5 · "Easy, right? But watch where it goes." ─────────────────────────────────────────────
  {
    const st = cut(4), wt = Wd('watch', 4) - st, gs = Wd('goes', 4) - st;
    add({ id: 'S05', at: st, cam: [540, 700], zoom: 0.06, note: 'Penny shrugs "easy", then points: $85 in coins flies off on "goes"',
      draw(lt, d, t) {
        K.desk(t, 1180);
        const turn = lt > wt;
        const o = { x: 420, y: 1210, s: 0.95, t, pose: turn ? 'present' : 'shrug', poseFrom: turn ? 'shrug' : 'stand', poseK: turn ? eio(seg(lt, wt, wt + 0.3)) : eio(seg(lt, 0, 0.3)),
          expression: turn ? 'suspicious' : 'grin', look: turn ? [1, -0.2] : [0, 0] };
        penny.draw(o);
        if (!turn || lt < gs) K.pill('$85', 820, 520, 70, P.green, P.white, turn ? 1 : pop(lt, 0.25));
        K.coinFlow(820, 600, 1250, 250, seg(lt, gs, gs + 0.8), 7, 42, 160);
        if (lt > gs) K.arrow(900, 420, 260, -0.6, clamp((lt - gs) * 4), P.red);
      } });
    cue(st, 'whoosh'); cue(st + 0.25, 'pop', { gain: 0.6 }); cue(st + gs, 'zip');
  }

  // ── 6-7 · where the $85 goes: $55 interest, $30 debt ────────────────────────────────────────
  const split = (lt, pRed, pGreen, extra) => {
    K.paper();
    K.label('WHERE YOUR $85 GOES', 540, 360, 64, P.ink, { spacing: 1 });
    K.splitBar({ x: 90, y: 450, w: 900, h: 170, p: pGreen > 0 ? 0.5 + pGreen * 0.5 : pRed * 0.5, size: 54,
      parts: [{ value: FIRST_INT, color: P.red, label: '$55 INTEREST' }, { value: BAL * 0.01, color: P.green, label: '$30' }] });
    if (extra) extra();
  };
  {
    const st = cut(5), it = Wd('interest', 5) - st;
    add({ id: 'S06', at: st, cam: [540, 600], note: 'red $55 fills the bar, 65% seal + "THE BANK KEEPS IT" on "interest"',
      draw(lt, d, t) {
        split(lt, seg(lt, 0.15, it + 0.1), 0, () => {
          K.pctBadge(260, 880, 0.9, '65%', P.red, pop(lt, it, 0.25));
          if (lt > it) K.label('OF YOUR PAYMENT', 260, 1080, 42, P.red, { weight: 900 });
          K.pill('THE BANK KEEPS IT', 750, 880, 42, P.red, P.white, pop(lt, it + 0.15));
        });
        peek({ t, expression: lt > it ? 'angry' : 'suspicious', look: [-0.4, -1] });
      } });
    cue(st, 'whoosh'); cue(st + 0.15, 'slide', { dur: it - 0.05, gain: 0.5 }); cue(st + it, 'stamp');
  }
  {
    const st = cut(6), th = Wd('thirty', 6) - st, db = Wd('debt', 6) - st;
    add({ id: 'S07', at: st, cam: [540, 650], note: 'green $30 completes the bar on "thirty"; balance only drops to $2,970 on "debt"',
      draw(lt, d, t) {
        split(lt, 1, seg(lt, th - 0.1, th + 0.3), () => {
          K.card(190, 760, 700, 330, { title: 'BALANCE AFTER', titleFill: P.ink });
          K.counter(Math.round(K.tick(BAL, BAL - BAL * 0.01, seg(lt, db, db + 0.5))), 540, 980, 130, { prefix: '$', color: lt > db ? P.green : P.ink });
        });
        peek({ t, pose: 'facepalm', poseFrom: 'stand', poseK: eio(seg(lt, db, db + 0.3)), expression: lt > db ? 'sad' : 'neutral', look: [-0.4, -1] });
      } });
    cue(st, 'whoosh'); cue(st + th, 'pop'); cue(st + db, 'tock', { gain: 0.6 });
  }

  // ── 8 · the 15-year line ─────────────────────────────────────────────────────────────────────
  const data = MIN.hist.map((b, m) => [m / 12, b]);
  {
    const st = cut(7), yr = Wd('years', 7) - st, end = Le(7) - st + 0.1;
    add({ id: 'S08', at: st, cam: [560, 700], zoom: 0.04, note: 'balance line drawn month by month over 15 years; "15 YEARS" lands on "years"',
      draw(lt, d, t) {
        K.paper();
        const p = eio(seg(lt, 0.2, yr + 0.15));
        K.lineChart({ x: 220, y: 380, w: 760, h: 640, xMin: 0, xMax: 15, yMin: 0, yMax: 3000, xTicks: [0, 5, 10, 15], yTicks: [0, 1000, 2000, 3000],
          fmtX: (v) => String(v), fmtY: (v) => K.fmtMoney(v), xLabel: 'YEARS', yLabel: 'WHAT YOU OWE', p, series: [{ data, color: P.red, area: 'rgba(229,72,59,0.12)' }] });
        K.pill(`YEAR ${Math.max(1, Math.ceil(p * 15 - 1e-6))}`, 820, 300, 50, lt > yr ? P.red : P.ink, P.white, 1);
        K.footnote('assumes $3,000 at 22% APR, no new purchases\nminimum = interest + 1% of the balance (at least $25)', 540, 1170, 1);
      } });
    cue(st, 'whoosh'); cue(st + 0.2, 'slide', { dur: yr - 0.05, gain: 0.45 }); cue(st + yr + 0.15, 'thud');
  }

  // ── 9 · the receipt: $4,433 of interest ──────────────────────────────────────────────────────
  {
    const st = cut(8), fo = Wd('four', 8) - st, it = Wd('interest', 8) - st;
    add({ id: 'S09', at: st, cam: [540, 560], zoom: 0.06, note: 'receipt prints: borrowed, interest (red), total paid',
      draw(lt, d, t) {
        K.paper();
        K.receipt(540, 200, 1.3, { title: '15 YEARS OF MINIMUMS', w: 640, p: seg(lt, 0.1, it + 0.2) * 1.0,
          rows: [['BORROWED', K.fmtMoney(BAL)], ['INTEREST', K.fmtMoney(MIN.interest), P.red]], total: ['TOTAL PAID', K.fmtMoney(MIN.paid), P.red] });
        peek({ t, expression: lt > fo ? 'shock' : 'surprised', look: [-0.3, -1] });
      } });
    cue(st, 'whoosh'); cue(st + 0.25, 'tock', { gain: 0.4 }); cue(st + fo, 'ding'); cue(st + it + 0.15, 'tock', { gain: 0.5 });
  }

  // ── 10 · more than you borrowed ──────────────────────────────────────────────────────────────
  {
    const st = cut(9), mo = Wd('more', 9) - st;
    add({ id: 'S10', at: st, cam: [540, 700], zoom: 0.1, note: 'bars: borrowed $3,000 vs interest $4,433; Penny shocked',
      draw(lt, d, t) {
        K.paper();
        K.barChart({ x: 230, y: 360, w: 760, h: 640, max: 5000, ticks: [0, 2500, 5000], fmt: (v) => K.fmtMoney(v), p: eo(seg(lt, 0, 0.55)), stagger: 0.35,
          bars: [{ label: 'BORROWED', value: BAL, color: P.teal }, { label: 'INTEREST', value: MIN.interest, color: P.red }] });
        peek({ t, expression: 'shock', look: [-0.5, -1] });
      } });
    cue(st, 'whoosh'); cue(st + mo, 'slam', { gain: 0.6 });
  }

  // ── 11-12 · before / after: minimum vs a flat $150 ──────────────────────────────────────────
  const minYears = MIN.months / 12;
  const compare = (lt, pCards, res, resAt) => {
    K.paper();
    K.beforeAfter({ x: 40, y: 260, w: 1000, h: 860, p: pCards,
      left: { title: 'MINIMUM', color: P.red, draw(cx, cy) {
        K.label('PAY', cx, cy - 280, 40, P.inkSoft, { weight: 900, spacing: 3 });
        K.label('$85 → $25', cx, cy - 210, 64, P.ink);
        if (res > 0) {
          const k = seg(res, 0, 0.6);
          K.counter(Math.round(K.tick(0, minYears, k)), cx, cy - 40, 104, { suffix: ' YRS', color: P.red });
          K.counter(Math.round(K.tick(0, MIN.interest, seg(res, resAt, resAt + 0.6))), cx, cy + 150, 92, { prefix: '$', color: P.red, sc: res > resAt ? 1 : 0 });
          if (res > resAt) K.label('INTEREST', cx, cy + 240, 38, P.inkSoft, { weight: 900, spacing: 3 });
        }
      } },
      right: { title: '$150 FLAT', color: P.green, draw(cx, cy) {
        K.label('PAY', cx, cy - 280, 40, P.inkSoft, { weight: 900, spacing: 3 });
        K.label('$150', cx, cy - 210, 64, P.ink);
        if (res > 0) {
          const k = seg(res, 0, 0.6);
          K.counter(Math.round(K.tick(0, FLAT.months, k)), cx, cy - 40, 104, { suffix: ' MOS', color: P.green });
          K.counter(Math.round(K.tick(0, FLAT.interest, seg(res, resAt, resAt + 0.6))), cx, cy + 150, 92, { prefix: '$', color: P.green, sc: res > resAt ? 1 : 0 });
          if (res > resAt) K.label('INTEREST', cx, cy + 240, 38, P.inkSoft, { weight: 900, spacing: 3 });
        }
      } } });
    K.footnote('same $3,000 at 22% APR · for education, not advice', 540, 1190, 1);
  };
  {
    const st = cut(10), fl = Wd('hundred', 10) - st;
    add({ id: 'S11', at: st, cam: [540, 690], note: 'two cards: MINIMUM vs $150 FLAT (right card pops on "hundred")',
      draw(lt) { compare(lt, clamp(seg(lt, 0, 0.35) * 0.5 + seg(lt, fl - 0.1, fl + 0.25) * 0.5 + (lt > fl + 0.25 ? 0.5 : 0)), 0, 0); } });
    cue(st, 'whoosh'); cue(st + 0.1, 'pop', { gain: 0.5 }); cue(st + fl, 'pop');
  }
  {
    const st = cut(11), go = Wd('gone', 11) - st, un = Wd('under', 11) - st;
    add({ id: 'S12', at: st, cam: [540, 690], zoom: 0.04, note: 'results tick in: 15 YRS / $4,433 vs 26 MOS / $771; green check',
      draw(lt) {
        compare(lt, 1, Math.max(0, lt - go + 0.1), un - go);
        K.check(905, 1065, 0.2, lt > un + 0.7 ? eob(seg(lt, un + 0.7, un + 1.0)) : 0);
      } });
    cue(st, 'whoosh'); cue(st + go, 'slide', { dur: 0.6, gain: 0.4 }); cue(st + un, 'slide', { dur: 0.6, gain: 0.4 }); cue(st + un + 0.7, 'ding');
  }

  // ── 13 · THE TRAP: the minimum is the bait ───────────────────────────────────────────────────
  {
    const st = cut(12), pl = Wd('plan', 12) - st, bz = Wd('business', 12) - st, md = Wd('model', 12) - st;
    add({ id: 'S13', at: st, cam: [600, 820], zoom: 0.1, note: 'vault: trap baited with MINIMUM DUE, snaps on "business", TRAP stamp on "model"',
      draw(lt, d, t) {
        K.vault(t, lt > bz ? 1 : 0.35);
        const snap = seg(lt, bz, bz + 0.16), shake = lt > bz ? Math.sin(lt * 80) * 10 * Math.max(0, 1 - (lt - bz) * 3) : 0;
        K.trap(540 + shake, 1000, 1.5, snap, true);
        if (snap < 0.5) K.pill('MINIMUM DUE', 540, 760, 48, P.gold, P.ink, 1);
        K.stamp('TRAP', 540, 420, 1.2, P.red, -0.14, seg(lt, md, md + 0.25));
        peek({ t, expression: lt > md ? 'smug' : 'suspicious', look: [-0.6, -1] });
      } });
    cue(st, 'whoosh'); cue(st + pl, 'tock', { gain: 0.5 }); cue(st + bz, 'slam'); cue(st + md, 'stamp');
  }

  // ── 14 · the minimum payment warning on your statement, by law ──────────────────────────────
  {
    const st = cut(13), stt = Wd('statement', 13) - st, law = Wd('law', 13) - st;
    add({ id: 'S14', at: st, cam: [540, 640], note: 'the statement warning box (time + total at the minimum); "REQUIRED BY LAW" on "law"',
      draw(lt, d, t) {
        K.paper();
        K.card(70, 300, 940, 640, { title: 'MINIMUM PAYMENT WARNING', titleFill: P.red });
        const k = clamp((lt - 0.2) * 3);
        ctx.save(); ctx.globalAlpha *= k;
        K.label('IF YOU PAY ONLY THE MINIMUM:', 540, 470, 44, P.ink, { weight: 900 });
        K.label('PAID OFF IN', 300, 590, 40, P.inkSoft, { weight: 900, spacing: 2 });
        K.label('TOTAL YOU PAY', 780, 590, 40, P.inkSoft, { weight: 900, spacing: 2 });
        K.label('15 YEARS', 300, 690, 84, P.red); K.label(K.fmtMoney(MIN.paid), 780, 690, 84, P.red);
        K.footnote('every US card statement shows this box\n(numbers here: our $3,000 example)', 540, 830, 1, P.inkSoft, 30);
        ctx.restore();
        K.pill('REQUIRED BY LAW · CARD ACT 2009', 540, 1060, 42, P.ink, P.white, pop(lt, law));
        peek({ t, x: 880, pose: 'point', hands: { r: [200, -900] }, expression: 'smug', look: [-0.5, -1] });
      } });
    cue(st, 'whoosh'); cue(st + stt, 'pop', { gain: 0.5 }); cue(st + law, 'stamp');
  }

  // ── 15 · "Go look." Penny winks ──────────────────────────────────────────────────────────────
  {
    const st = cut(14), lk = Wd('look', 14) - st;
    add({ id: 'S15', at: st, cam: [540, 760], zoom: 0.06, note: 'close-up: Penny winks at camera, holding her cent pendant up',
      draw(lt, d, t) {
        K.desk(t, 1180);
        penny.draw({ x: 540, y: 2330, s: 1.85, t, pose: 'coin', poseFrom: 'stand', poseK: eio(seg(lt, 0, 0.3)), expression: lt > lk ? 'wink' : 'smug', look: [0, 0.2] });
      } });
    cue(st, 'whoosh'); cue(st + lk, 'sparkle', { dur: 0.6, gain: 0.5 });
  }

  return { shots: S, cues: CUES };
}
