// WHY DOES MUSIC GIVE YOU CHILLS? (Sakumai · why-body). The shot list: one shot per line (line 5 gets two).
// Sakumai is drawn only through cast('sakumai'); everything else comes from the sakumai-studio kit.
// A shot: { id, at, cam: [cx, cy], zoom, note, draw(lt, d, t) } · cut(i) = line i start - 0.08.
import { ctx, W, H, clamp, lerp, seg, eo, eio, eob, rnd, TAU } from './core/lib.js';
import { L, Le, Wd, T } from './core/timing.js';
import { cast } from './core/cast.js';
import * as K from './core/kit.js';

const S = cast('sakumai');
const STAND = { l: [-132, -437], r: [132, -437] }, EARS = { l: [-150, -768], r: [150, -768] };
const handsTo = (a, b, k) => ({ l: [lerp(a.l[0], b.l[0], k), lerp(a.l[1], b.l[1], k)], r: [lerp(a.r[0], b.r[0], k), lerp(a.r[1], b.r[1], k)] });
/** a speeding-up heartbeat: phase of a beat whose rate goes from f0 to f1 Hz over dur seconds */
const beatAt = (lt, f0, f1, dur) => { const k = (f1 - f0) / dur, u = Math.min(lt, dur), ph = f0 * u + 0.5 * k * u * u + (lt > dur ? f1 * (lt - dur) : 0); return Math.pow(Math.max(0, Math.sin(ph * TAU)), 6); };
/** goosebump marks: little lines bristling off her arms */
function goosebumps(o, a, t) {
  if (a <= 0) return;
  for (const side of ['handL', 'handR']) {
    const [hx, hy] = S.anchor(o, side), [sx, sy] = S.anchor(o, [side === 'handL' ? -106 : 106, -641]), dir = side === 'handL' ? -1 : 1;
    for (let i = 0; i < 4; i++) {
      const u = 0.2 + i * 0.22, x = lerp(sx, hx, u) + dir * 30 * (o.s || 1), y = lerp(sy, hy, u), j = Math.sin(t * 30 + i) * 4;
      ctx.globalAlpha = a; K.polyline([[x + j, y], [x + dir * 26 + j, y - 14]], K.P.ink, 6); ctx.globalAlpha = 1;
    }
  }
}

export function buildShots() {
  const SH = [], CUES = [];
  const add = (o) => (SH.push(o), o);
  const cue = (t, type, o = {}) => CUES.push({ t: +t.toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);

  // 1 · HOOK: vibing to her song in her room, then the goosebumps hit on "goosebumps"
  {
    const st = cut(0), song = Wd('song', 0) - st, goose = Wd('goosebumps', 0) - st;
    add({ id: 'S01', at: st, cam: [540, 820], zoom: 0.06, note: 'bedroom, headphones on, notes; shiver + goosebump marks on "goosebumps"',
      draw(lt, d, t) {
        K.bedroom(t);
        const k = eio(seg(lt, 0, 0.35)), hit = lt > goose, shake = hit ? Math.sin(lt * 70) * 7 * Math.max(0, 1 - (lt - goose) * 1.6) : 0;
        const o = { x: 540 + shake, y: 1730, s: 1.25, t, outfit: 'casual', hands: handsTo(STAND, EARS, k), prop: K.headphones,
          expression: hit ? 'surprised' : lt > song ? 'happy' : 'smile', talk: hit ? 0 : 0.45 };
        K.notes(t, 540, 640, { w: 520, amount: clamp(lt / 0.6) });
        S.draw(o);
        goosebumps(o, hit ? clamp((lt - goose) * 6) : 0, t);
        if (hit) K.fx('!?', 790, 520, 120, K.P.yellow, 0.2, eob(seg(lt, goose, goose + 0.18)));
      } });
    cue(st + 0.15, 'pop', { gain: 0.5 }); cue(st + goose, 'boing', { gain: 0.55 });
  }

  // 2 · close-up: music doesn't just go into your ears (sound waves at the cups, notes flow in)
  {
    const st = cut(1), ears = Wd('ears', 1) - st;
    add({ id: 'S02', at: st, cam: [540, 700], zoom: 0.08, note: 'close-up with headphones, sound waves; EARS tag on "ears"',
      draw(lt, d, t) {
        K.pastel(t, '#E6DCF8', '#FCE6EE');
        const o = { x: 540, y: 2690, s: 2.5, t, outfit: 'casual', hands: EARS, prop: K.headphones, expression: 'smile', talk: 0.5, look: [0.3, -0.2] };
        S.draw(o);
        for (const sd of [-1, 1]) K.soundWaves(540 + sd * 375, 905, 70, t, K.P.lavDeep, sd);
        K.notes(t, 540, 520, { w: 800, n: 6 });
        const [ex, ey] = S.anchor(o, [134, -781]);
        K.tag('EARS', 840, 250, ex + 30, ey - 40, 70, lt > ears - 0.05 ? eob(seg(lt, ears - 0.05, ears + 0.2)) : 0);
      } });
    cue(st, 'whoosh'); cue(st + ears, 'pop', { gain: 0.6 });
  }

  // 3 · into the brain: notes stream in, the reward spot lights up on "reward"
  {
    const st = cut(2), rew = Wd('reward', 2) - st, sys = Wd('system', 2) - st, brain = Wd('brain', 2) - st;
    add({ id: 'S03', at: st, cam: [540, 720], zoom: 0.07, note: 'heart iris into the body; brain, notes stream in; reward spot glows on "reward"',
      draw(lt, d, t) {
        K.iris(lt, () => {
          K.insideBody(t, { tint: 'lav' });
          const g = eo(seg(lt, rew - 0.1, rew + 0.35));
          K.brain(540, 760, 2.0, { glow: g, spot: [40, 10], faceMood: g > 0.5 ? 'happy' : 'calm', sparkT: t });
          for (let i = 0; i < 6; i++) { const u = ((lt * 0.55 + i / 6) % 1); const x = lerp(-60, 560, eio(u)), y = lerp(1120, 790, eio(u)) + Math.sin(u * 7 + i) * 40; ctx.globalAlpha = Math.sin(u * Math.PI); K.note(x, y, 1.3, [K.P.lavDeep, K.P.rose, K.P.mintDeep][i % 3], i % 2); ctx.globalAlpha = 1; }
          K.tag('REWARD SYSTEM', 540, 300, 620, 760, 72, lt > sys - 0.05 ? eob(seg(lt, sys - 0.05, sys + 0.25)) : 0);
        }, { cx: 540, cy: 760 });
      } });
    cue(st, 'whoosh'); cue(st + 0.2, 'slide', { dur: 1.2, gain: 0.5 }); cue(st + rew, 'sparkle', { gain: 0.7 });
  }

  // 4 · the same part that loves your favorite food: note and cake both point to the glowing spot
  {
    const st = cut(3), same = Wd('same', 3) - st, food = Wd('food', 3) - st;
    add({ id: 'S04', at: st, cam: [540, 760], zoom: 0.05, note: 'brain on top glowing; music note left, cake pops in right on "food"; arrows up',
      draw(lt, d, t) {
        K.insideBody(t + 2, { tint: 'lav' });
        K.brain(540, 470, 1.6, { glow: 1, spot: [40, 10], faceMood: lt > food ? 'happy' : 'calm', sparkT: t });
        const bob = Math.sin(t * 3) * 10;
        K.note(260, 1010 + bob, 3.6, K.P.lavDeep, 1);
        K.arrow(300, 820, 170, -1.05, clamp((lt - same) * 4));
        const c = lt > food - 0.08 ? eob(seg(lt, food - 0.08, food + 0.2)) : 0;
        if (c > 0) { ctx.save(); ctx.translate(810, 1010 - bob); ctx.scale(c, c); K.cake(0, 0, 1.9); ctx.restore(); K.arrow(760, 820, 170, -2.09, c); }
        K.fx('=', 540, 1000, 170, K.P.white, 0, c);
        K.floatHearts(540, 640, t, c, 5, 300);
      } });
    cue(st, 'whoosh'); cue(st + food, 'pop'); cue(st + food + 0.1, 'sparkle', { gain: 0.5, dur: 0.6 });
  }

  // 5 · back in her room: the playhead reaches the star ("the best part") on "best"
  {
    const st = cut(4), best = Wd('best', 4) - st;
    add({ id: 'S05', at: st, cam: [540, 700], zoom: 0.05, note: 'bedroom; song bar on top, playhead reaches the BEST PART star on "best"; she lights up',
      draw(lt, d, t) {
        K.wipe(lt, () => {
          K.bedroom(t);
          const p = lerp(0.5, 0.78, eio(seg(lt, 0, best + 0.05))) + Math.max(0, lt - best - 0.05) * 0.02, on = lt > best;
          const o = { x: 540, y: 1790, s: 1.15, t, outfit: 'casual', hands: EARS, prop: K.headphones, expression: on ? 'starry' : 'surprised', talk: on ? 0 : 0.4 };
          S.draw(o);
          K.songBar(540, 330, 860, p, 0.78, t, { label: 'BEST PART', peakGlow: on ? 1 : 0.3 });
          K.sparkles(540, 760, 360, t, on ? eo(seg(lt, best, best + 0.3)) : 0, 8, K.P.yellow);
        });
      } });
    cue(st, 'whoosh'); cue(st + best, 'ding', { gain: 0.6 });
  }

  // 6a · the dopamine burst (inside the brain)
  {
    const st = cut(5), burst = Wd('burst', 5) - st, dop = Wd('dopamine', 5) - st;
    add({ id: 'S06', at: st, cam: [540, 700], zoom: 0.1, note: 'brain glows max, dopamine stars burst out on "burst", DOPAMINE pill on "dopamine"',
      draw(lt, d, t) {
        K.insideBody(t, { tint: 'pink' });
        const amt = clamp((lt - burst + 0.1) / 0.9);
        K.brain(540, 700, 1.7, { glow: 1, spot: [40, 10], faceMood: amt > 0 ? 'wow' : 'happy', sparkT: t });
        K.hormoneCloud('dopamine', 540 + 68, 717, 460, t, amt, 18, 1.3);
      } });
    cue(st, 'whoosh'); cue(st + burst, 'sparkle', { dur: 1.0 }); cue(st + dop, 'pop', { gain: 0.6 });
  }

  // 6b · "a feel-good chemical": she feels it (love eyes), the meter fills
  {
    const st = Wd('feel', 5) - 0.22;
    add({ id: 'S07', at: st, cam: [540, 760], zoom: 0.06, note: 'rays, Sakumai love eyes with dopamine stars around her; FEEL-GOOD meter fills',
      draw(lt, d, t) {
        K.rays(t, '#FFE9A8', '#FFF6D6');
        const o = { x: 540, y: 2060, s: 1.5, t, pose: 'heart', poseFrom: 'stand', poseK: eio(seg(lt, 0, 0.35)), expression: 'love', talk: 0.35 };
        K.hormoneCloud('dopamine', 540, 900, 520, t, 1, 14, 1.1);
        S.draw(o);
        K.meter(540, 330, 760, eo(seg(lt, 0.1, 1.2)), 'FEEL-GOOD', K.P.yellow, t);
      } });
    cue(st, 'whoosh', { gain: 0.6 }); cue(st + 0.2, 'slide', { dur: 1.0, gain: 0.5 });
  }

  // 7 · x-ray: the heart speeds up
  {
    const st = cut(6), sp = Wd('speeds', 6) - st;
    add({ id: 'S08', at: st, cam: [520, 960], zoom: 0.22, note: 'x-ray Sakumai, cute heart beating faster, BA-DUM on "speeds"',
      draw(lt, d, t) {
        K.xrayBoard(t);
        const beat = beatAt(lt, 1.3, 2.6, d);
        S.draw({ x: 540, y: 1760, s: 1.3, t, xray: true, expression: 'surprised', blush: 0.8,
          inside: (c, A) => { K.heart(A.heart[0] + 6, A.heart[1] + 14, 0.55, beat, 'wow'); } });
        if (lt > sp) K.fx('BA-DUM!', 690, 430, 96, K.P.rose, -0.15, eob(seg(lt, sp, sp + 0.18)) * (1 + 0.08 * beat));
      } });
    cue(st, 'whoosh'); [0.15, 0.62, 1.02].forEach((k) => cue(st + k, 'heartbeat', { gain: 0.7 }));
  }

  // 8 · the skin cutaway: the tiny muscle pulls the hair straight up
  {
    const st = cut(7), mus = Wd('muscles', 7) - st, pull = Wd('pull', 7) - st, hair = Wd('hair', 7) - st, up = Wd('up', 7) - st;
    add({ id: 'S09', at: st, cam: [540, 700], zoom: 0.08, note: 'skin cutaway; TINY MUSCLE tag on "muscles", contracts on "pull", HAIR tag on "hair", upright on "up"',
      draw(lt, d, t) {
        K.pastel(t, '#FCE6EE', '#FFF6EE', false);
        const goose = eio(seg(lt, pull, up + 0.15));
        K.skinCutaway(540, 700, 1.15, goose, t, { muscleLabel: seg(lt, mus - 0.05, mus + 0.2), hairLabel: seg(lt, hair - 0.05, hair + 0.2) });
        if (lt > up) K.fx('BOING!', 820, 260, 70, K.P.yellow, 0.15, eob(seg(lt, up, up + 0.15)));
      } });
    cue(st, 'whoosh'); cue(st + mus, 'pop', { gain: 0.5 }); cue(st + pull, 'slide', { dur: up - pull, gain: 0.5 }); cue(st + up, 'boing', { gain: 0.5 });
  }

  // 9 · "That's the shiver you feel!": the full-body shiver, starry eyes
  {
    const st = cut(8), shiver = Wd('shiver', 8) - st;
    add({ id: 'S10', at: st, cam: [540, 800], zoom: 0.07, note: 'heart iris; rays, Sakumai shivers with starry eyes, goosebump marks, SHIVER~ on "shiver"',
      draw(lt, d, t) {
        K.iris(lt, () => {
          K.rays(t, '#FCD9E6', '#FCE6EE');
          const on = lt > shiver, shake = on ? Math.sin(lt * 60) * 6 : 0;
          const o = { x: 540 + shake, y: 2060, s: 1.5, t, outfit: 'casual', pose: 'fists', expression: 'starry', talk: 0.4 };
          S.draw(o);
          goosebumps(o, on ? 1 : 0.3, t);
          K.fx('SHIVER~', 540, 330, 120, K.P.white, -0.06, on ? eob(seg(lt, shiver, shiver + 0.2)) : 0);
        }, { cx: 540, cy: 900 });
      } });
    cue(st, 'whoosh'); cue(st + shiver, 'sparkle', { dur: 0.8 });
  }

  // 10 · "But here's the twist.": classroom, she points to the board
  {
    const st = cut(9), tw = Wd('twist', 9) - st;
    add({ id: 'S11', at: st, cam: [600, 760], zoom: 0.06, note: 'wipe; classroom, board says TWIST, she points + wink on "twist"',
      draw(lt, d, t) {
        K.wipe(lt, () => {
          K.classroom(t, { board: lt > tw ? 'PLOT TWIST!' : '' });
          const on = lt > tw;
          S.draw({ x: 380, y: 1760, s: 1.25, t, pose: 'point', poseFrom: 'stand', poseK: eio(seg(lt, 0.1, 0.45)), expression: on ? 'wink' : 'serious', talk: on ? 0 : 0.5 });
          K.impact(700, 420, 330, on ? clamp((lt - tw) * 5) * (1 - clamp((lt - tw - 0.5) * 2)) : 0, t);
        }, { colors: [K.P.lilac, K.P.butter, K.P.pink] });
      } });
    cue(st, 'zip', { gain: 0.6 }); cue(st + tw, 'ding', { gain: 0.6 });
  }

  // 11 · dopamine starts early: playhead far from the star, but the brain is already sparkling
  {
    const st = cut(10), starts = Wd('starts', 10) - st, dop = Wd('dopamine', 10) - st;
    add({ id: 'S12', at: st, cam: [540, 700], zoom: 0.07, note: 'song bar (playhead far from the star) over the brain; dopamine begins on "starts"',
      draw(lt, d, t) {
        K.insideBody(t, { tint: 'lav' });
        K.songBar(540, 300, 860, lerp(0.4, 0.46, lt / d), 0.82, t, { label: 'BEST PART' });
        const amt = clamp((lt - starts) / 1.2);
        K.brain(540, 800, 1.5, { glow: amt, spot: [-20, -20], faceMood: amt > 0 ? 'wow' : 'calm', sparkT: t });
        K.hormoneCloud('dopamine', 510, 770, 380, t, amt, 12, 1.1);
        if (lt > dop) K.fx('ALREADY?!', 540, 1140, 84, K.P.yellow, -0.05, eob(seg(lt, dop, dop + 0.2)));
      } });
    cue(st, 'whoosh'); cue(st + starts, 'sparkle', { dur: 0.9, gain: 0.7 });
  }

  // 12 · "before the best part even arrives": NOT YET on the song bar, the meter is already high
  {
    const st = cut(11), arr = Wd('arrives', 11) - st;
    add({ id: 'S13', at: st, cam: [540, 650], zoom: 0.06, note: 'big song bar, NOT YET arrow from playhead to the star; DOPAMINE meter already rising',
      draw(lt, d, t) {
        K.pastel(t, '#E6DCF8', '#FCE6EE');
        const p = lerp(0.46, 0.56, lt / d);
        K.songBar(540, 560, 860, p, 0.86, t, { label: 'BEST PART', peakGlow: lt > arr ? 0.7 + 0.3 * Math.sin(t * 8) : 0.3 });
        const px = 540 - 430 + 860 * p, sx = 540 - 430 + 860 * 0.86;
        K.arrow(px + 40, 410, (sx - px - 80) * eo(seg(lt, 0.2, 0.6)), 0, 1, K.P.lavDeep);
        K.pill('NOT YET!', (px + sx) / 2, 300, 64, K.P.white, K.P.ink, eob(seg(lt, 0.25, 0.5)));
        K.meter(540, 940, 760, lerp(0.15, 0.75, eio(seg(lt, 0, d))), 'DOPAMINE', K.P.yellow, t);
      } });
    cue(st, 'whoosh'); cue(st + 0.3, 'pop', { gain: 0.5 }); cue(st + 0.3, 'slide', { dur: 1.6, gain: 0.45 });
  }

  // 13 · "because it can tell what's coming": the brain dreams of the star
  {
    const st = cut(12), tell = Wd('tell', 12) - st, com = Wd('coming', 12) - st;
    add({ id: 'S14', at: st, cam: [540, 750], zoom: 0.08, note: 'brain with a happy face; thought bubble with the star pops on "tell", sparkles on "coming"',
      draw(lt, d, t) {
        K.insideBody(t + 4, { tint: 'lav' });
        K.brain(500, 930, 1.4, { glow: 0.6, spot: [-20, -20], faceMood: 'happy', sparkT: t });
        const b = lt > tell - 0.1 ? eob(seg(lt, tell - 0.1, tell + 0.2)) : 0;
        K.thought(680, 430, 190, 600, 760, b);
        if (b > 0) { K.star5(680, 420, 80 * b * (1 + 0.06 * Math.sin(t * 7)), K.P.yellow, K.P.ink, 5); K.note(570, 400, 0.9 * b, K.P.lavDeep, 0); K.note(800, 470, 0.8 * b, K.P.rose, 1); }
        K.sparkles(680, 420, 200, t, lt > com ? 1 : 0, 6, K.P.yellow);
      } });
    cue(st, 'whoosh'); cue(st + tell, 'pop'); cue(st + com, 'sparkle', { gain: 0.6, dur: 0.6 });
  }

  // 14 · night sky, pajamas + headphones: the chills, softly
  {
    const st = cut(13), ch = Wd('chills', 13) - st;
    add({ id: 'S15', at: st, cam: [540, 820], zoom: 0.05, note: 'night sky, Sakumai in pajamas with headphones, notes; gentle shiver + sparkles on "chills"',
      draw(lt, d, t) {
        K.iris(lt, () => {
          K.nightSky(t, { shooting: seg(lt, 0.3, 1.3) });
          const on = lt > ch, shake = on ? Math.sin(lt * 50) * 4 * Math.max(0, 1 - (lt - ch) * 2) : 0;
          const o = { x: 540 + shake, y: 1740, s: 1.25, t, outfit: 'pajamas', hands: EARS, prop: K.headphones, expression: on ? 'starry' : 'happy', talk: 0.35 };
          K.notes(t, 540, 600, { w: 600, colors: [K.P.butter, K.P.pink, K.P.mint] });
          S.draw(o);
          goosebumps(o, on ? 1 : 0, t);
          K.sparkles(540, 700, 330, t, on ? 1 : 0.3, 8, K.P.butter);
        }, { shape: 'star', color: K.P.lavDeep, cx: 540, cy: 760 });
      } });
    cue(st, 'whoosh'); cue(st + ch, 'sparkle', { dur: 0.8 });
  }

  // 15 · the payoff: her brain cheers with her (loops back to the hook)
  {
    const st = cut(14), br = Wd('brain', 14) - st, cheer = Wd('cheering', 14) - st, you = Wd('with', 14) - st + 0.2;
    add({ id: 'S16', at: st, cam: [540, 780], zoom: 0.06, note: 'night sky; a tiny happy brain pops up on "brain"; she cheers on "cheering", love eyes on "you"',
      draw(lt, d, t) {
        K.nightSky(t + 2);
        const k = eio(seg(lt, cheer - 0.15, cheer + 0.25));
        const o = { x: 540, y: 1740, s: 1.25, t, outfit: 'pajamas', pose: 'cheer', poseFrom: 'stand', poseK: k, expression: lt > you ? 'love' : 'happy', talk: lt > you ? 0 : 0.4 };
        S.draw(o);
        const b = lt > br - 0.05 ? eob(seg(lt, br - 0.05, br + 0.25)) : 0, hop = Math.abs(Math.sin(t * 6)) * 24 * k;
        if (b > 0) { K.brain(540, 330 - hop, 0.8 * b, { glow: 0.8, spot: [40, 10], faceMood: 'happy', sparkT: t }); K.sparkles(540, 330 - hop, 190, t, b, 5, K.P.butter); }
        K.floatHearts(540, 640, t, lt > you ? 1 : 0, 6, 420);
      } });
    cue(st, 'whoosh'); cue(st + br, 'pop'); cue(st + cheer, 'sparkle', { dur: 1.0 }); cue(st + you, 'chirp', { gain: 0.5 });
  }

  return { shots: SH, cues: CUES };
}
