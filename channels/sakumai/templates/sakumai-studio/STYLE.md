# Sakumai Studio: cute pastel anime explainers, 9:16 (channel `sakumai` only)

Warm, cute, a little dramatic, always kind. Sakumai (the channel's permanent host) reacts to a feeling everyone has
had, then we cut inside the body to a kawaii cutaway (a glowing brain, a beating heart with a face, hormones as cute
particles) and back to her for the payoff. Pastel sets, flat fills with plum lines, a heart-iris transition, bold
1-3 word captions with one yellow word. Example to study and copy: `example/` = **WHY DOES MUSIC GIVE YOU CHILLS?**
(36 s, 16 shots, the channel pilot). Style sheet: `style-sheet.png` (`studio stylesheet sakumai-studio`).
Read the channel's `BIBLE.md` and Sakumai's `CHARACTER.md` before planning.

## 1. The look (rules from the sheet: do not break them)
- **Sakumai is drawn only through `cast('sakumai').draw({...})`.** Never redraw her, recolour her, or mirror her in a
  close-up. Props (e.g. `K.headphones`) go through her `prop` option; hands through `hands` (model space).
- **Flat pastel fills, plum lines** (`P.line #7A4258`, ink `P.ink #2A1A3A`), one light highlight per shape. Soft glows
  are allowed only for "magic" (a brain region lighting up, dopamine, fairy lights, the moon).
- **Palette** (`K.P`): pink `#F7A9CB` · rose `#FF6F9C` · lavender `#B79BE0` · lilac `#CDBDF5` · butter `#FFE7A8` ·
  mint `#BDEBD9` · sky `#C9E8F8` · night `#3F3485` · keyword yellow `#FFD43B` · x-ray navy `#1F1D45` · blood
  `#F0485C` · red `#E2384A`.
- **Colour meaning:** pink = feelings and the heart · lavender / navy = inside the body · yellow = the caption keyword,
  dopamine and "aha" sparkles · red only for her bow and a real alarm beat (the `redX`).
- **Cute, never gross:** organs are rounded pastel shapes, most with a kawaii face; no realistic anatomy, no gore, no
  needles, no blood drips. X-ray is the channel's navy look (whole body x-ray, head stays normal; `xray: true`).
- **One visual mode per shot.** She reacts big (expressions from CHARACTER.md), on the beat.

## 2. Format
- **1080x1920, 30 fps, 30-40 s.** Lead 0.4 s, outro 0.9 s, gap 0.3 (in `script.json`). Voice `af_heart` (channel
  default; owner confirms after the bake-off), speed 0.95-1.0 so the pace lands at ~2.6-3.2 words/s.
- **Story shape:** hook (Sakumai reacting to the felt moment, frame one already moving) → into the body (the
  mechanism on the cutaway kit) → the key fact → the felt result back on her → **twist** (wipe to the classroom,
  "PLOT TWIST!") → the twist explained → a kind last line on her that loops to the hook.
- **One line = one shot = one cut** (split a line over ~3.2 s into two shots, as the example does with line 6).
  The player adds a soft punch-in and a light flash on every cut (`template.json` → `player`); add the whoosh cue.
- **Transitions:** use `K.iris` (heart, the signature) when entering a new world (into the body, a reaction, the
  ending), `K.wipe` for the twist or a change of place. At most one transition every ~3 shots; plain cuts otherwise.

## 3. Captions
`script.json` line: `{ "text": "and tiny muscles in your skin pull each hair straight up.", "caps": "AND TINY *MUSCLES | IN YOUR *SKIN | PULL EACH *HAIR | STRAIGHT *UP" }`
- `|` splits caption chunks; `*` marks the ONE yellow word. 1-3 words, spelled exactly as spoken, and each chunk
  starts with the spoken word it lands on.
- The engine caption (no template copy): Inter Black 140 px, white, plum stroke `#2A1A3A` 28 px + 9 px drop, yellow
  `#FFD43B` keyword, centred at y 1420, pop-in 0.22 s (`template.json` → `captions`).
- Keep faces and the key object above y 1250. Captions may cross her skirt and legs, never her face or the organ.

## 4. Engine map (`example/`)
| file | gives you |
|---|---|
| `script.json` | title, description, tags, sources, voice, speed, lead, outro, gap, music, lines `{ text, caps }` |
| `src/shots.js` | **the per-video file**: the shot list + sound cues |
| `src/core/kit.js` | this template's kit (below), `import * as K from './core/kit.js'` |
| `src/core/cast.js` (engine) | `cast('sakumai')` → `draw(o)`, `anchor(o, name)`, `POSES`, `EXPRESSIONS`, `ANCHORS` |
| `src/core/lib.js` (engine) | `W H`, `clamp lerp seg eo eio eob rnd TAU`, `ctx` |
| `src/core/timing.js` (engine) | `L(i)` line start, `Le(i)` line end, `Wd(word, line)` word start (prefix match, throws if missing) |
| `src/sheet.js` | the style sheet board, drawn with the kit and the real cast |

## 5. The kit (`K.*`; screen space 1080x1920; everything a pure function of `t` / `lt`)
**Sets** (fill past the edges): `K.classroom(t, { board: 'TEXT', doodle, petalsOn })` (A) · `K.bedroom(t, { night, lights })` (B)
· `K.nightSky(t, { moon, moonFace, shooting: 0..1, roofs })` (C) · `K.insideBody(t, { tint: 'pink'|'lav'|'peach'|'night', vessels })` (D)
· `K.xrayBoard(t)` (behind x-ray Sakumai) · `K.sunsetStreet(t)` · `K.rays(t, a, b)` (anime sunburst for reactions)
· `K.pastel(t, top, bottom, hearts)` (soft gradient for close-ups and cutaway cards).
**Body kit** (`faceMood`: `'happy' | 'calm' | 'wow' | 'sleep' | 'worry'` or null):
`K.heart(x, y, s, beat 0..1, faceMood)` · `K.brain(x, y, s, { glow 0..1, spot: [dx, dy], faceMood, sparkT })` (a region lights up)
· `K.lungs(x, y, s, breath, faceMood)` · `K.stomach(x, y, s, squeeze, faceMood)` · `K.nerve(pts, t, { u, w, sparks })` (signal along a path)
· `K.neuron(x, y, s, fire, t)` · `K.vessel(pts, t, { w, flow, cells })` · `K.bloodCell(x, y, s, rot)`
· `K.skinCutaway(x, y, s, goose 0..1, t, { hairLabel, muscleLabel })` (hair, follicle, arrector pili, goosebump).
Inside x-ray Sakumai: `inside: (c, A) => K.heart(A.heart[0], A.heart[1], 0.5, beat, 'wow')` (model space, 1 unit ≈ 1 px at s 1).
**Hormones** (`K.HORMONES`): `dopamine` yellow star · `serotonin` mint round · `oxytocin` pink heart · `adrenaline`
orange bolt · `cortisol` coral drop · `melatonin` lilac moon. `K.hormone(kind, x, y, s, rot)` ·
`K.hormoneCloud(kind, x, y, R, t, amount 0..1, n, s)` (a burst) · `K.hormoneStream(kind, pts, t, { n, speed, s, amount })`.
**Music + props:** `K.note(x, y, s, color, kind)` · `K.notes(t, x, y, { w, n, amount })` · `K.soundWaves(x, y, r, t, color, side)`
· `K.headphones` (her `prop`) · `K.cake(x, y, s, faceMood)` · `K.phone(x, y, s, rot, content)` · `K.bunny(x, y, s)` · `K.cloud(x, y, s)`
· `K.songBar(x, y, w, progress, peak, t, { label, peakGlow })` · `K.meter(x, y, w, value, label, color, t)`.
**Graphics:** `K.pill(text, x, y, size, bg, fg, sc)` · `K.tag(text, x, y, tx, ty, size, sc)` (label + leader line) ·
`K.bubble(x, y, w, h, tx, ty, { text })` · `K.thought(x, y, r, tx, ty, sc)` · `K.fx(text, x, y, size, fill, rot, sc)` (SFX word) ·
`K.redX` · `K.check` · `K.arrow(x, y, len, ang, a, color)` · `K.impact(x, y, r, a, t)` · `K.sparkles(x, y, R, t, a, n, color)` ·
`K.floatHearts(x, y, t, a, n, w)` · `K.sparkle` · `K.heartShape` · `K.star5` · `K.face(x, y, s, mood)`.
**Transitions:** `K.iris(lt, drawFn, { shape: 'heart'|'star'|'circle', dur, color, cx, cy })` · `K.wipe(lt, drawFn, { dur, colors })`.
New topic = new components in the same look (flat pastel fill, plum line, one highlight, optional kawaii face): add
them to kit.js, list them here and on the sheet, and check them full size.

## 6. A shot
```js
const st = cut(7), pull = Wd('pull', 7) - st, up = Wd('up', 7) - st;        // cut just before line 7
add({ id: 'S09', at: st, cam: [540, 700], zoom: 0.08, note: 'skin cutaway: muscle pulls the hair up on "up"',
  draw(lt, d, t) {                                                          // pure function of time
    K.pastel(t, '#FCE6EE', '#FFF6EE', false);
    K.skinCutaway(540, 700, 1.15, eio(seg(lt, pull, up + 0.15)), t, { hairLabel: seg(lt, 0.8, 1.0) });
    if (lt > up) K.fx('BOING!', 820, 260, 70, K.P.yellow, 0.15, eob(seg(lt, up, up + 0.15)));
  } });
cue(st, 'whoosh'); cue(st + pull, 'slide', { dur: up - pull }); cue(st + up, 'boing', { gain: 0.5 });
```
Sakumai framing (feet at `y`, scale `s`): full body `s 1.15-1.3, y 1730-1790` (head top ≈ y - 1010·s) · medium
`s 1.5, y 2060` (face ≈ y 1010) · close-up `s 2.5, y 2690` (face ≈ y 940). Headphones on: `hands: { l: [-150, -768], r: [150, -768] }, prop: K.headphones`.

**Sound cues** `cue(t, type, { gain, dur })`: `whoosh` (every cut) · `pop` (a label or prop appears) · `sparkle`
(dur; dopamine, magic, love) · `boing` (comic beat, goosebump) · `ding` (realisation, the best part) · `heartbeat`
(each beat) · `slide` (dur; something travelling) · `zip` (fast wipe) · `chirp` (cute ending) · `thud` · `plop` ·
`tock` (time passing) · `alarm` (rare). Keep them soft. Music: `bed` (default).

## 7. QA pitfalls (check these first)
- Particles or SFX over her face → draw clouds *before* `S.draw` (behind her) and put SFX words beside or above her head.
- A big camera push (`zoom` ≥ 0.2) crops words near the frame edge → keep SFX text inside x 150-930.
- Close-ups cropping the headphones or ahoge → close-up at `y ≥ 2690` for `s 2.5`.
- Labels at phone size: tags ≥ 52 px, pills ≥ 60 px, meter labels 56 px. Check the contact sheet at 25%.
- A caption that differs from the spoken word ("DEEP IN" for "deep inside") → spell caps exactly as said.
- Pace: af_heart at 1.0 runs ~3.7 words/s on dense scripts; use speed 0.95 or cut words.
- The heart iris starts on a plain pink card for ~0.1 s: don't put the hook's key word inside it.
