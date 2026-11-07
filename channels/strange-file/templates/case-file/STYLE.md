# Case File: strange true history as an evidence file, 9:16 (The Strange File only)

Calm, intrigued, a little uncanny. Everything lies under ONE lamp: a dark walnut desk with manila folders, typed
sheets, red rubber stamps, redaction bars and sepia polaroids; a cork board with red string; lamp-lit parchment maps
with red routes; and the past itself as a sepia "old photograph" with grain and flicker. The channel's host, **the
Archivist**, opens and closes every file in his archive.
Example: `example/` = **THE DAY BOSTON DROWNED IN MOLASSES** (1919; Strange But True; 45 s, 17 shots; also the channel pilot). Sheet: `style-sheet.png`.
Channel rules (tone, sources, do / don't) are in `channels/strange-file/BIBLE.md`: read it first.

## 1. Rules
- **One lamp.** Every shot has one warm light source (`desk`, `archive`, `board` and `mapLight` all add it); the
  rest falls to near-black. Never a flat, evenly lit frame.
- **Red = evidence marks only:** stamps, string, pins, routes, X-marks, red circles, the caption's key word. Nothing
  else is red.
- **Amber = light only:** the lamp pool, the lantern, a lit window, the glow of a fire.
- **The past is sepia** (`P.s0..s5` + `oldPhoto(t)`): period scenes are old photographs, never full colour. The
  present (the desk, the board, the archive) is warm dark.
- **The Archivist** appears at the start (the hook or line 2) and in the last shot, only via `K.hostScene(t, {...})`
  or `cast('the-archivist').draw({...})`. Never inside a period scene, and never redrawn by hand.
- **No gore, no bodies, no weapons in use.** Tell it with objects, places, numbers and consequences.
- **Date stamp first:** a `dateStamp` (or date slip) appears by ~4 s: when, then where, then what.
- Captions: FreeMono on a label-tape strip, 1-3 words, ONE red word, typed on letter by letter, y 1570 (keep the
  zone y 1450-1700 clear of key objects).
- Narration: `bm_fable` x1.0 (channel default). Music `"tension"`. `gap` 0.28-0.3 for a measured pace.
- Facts: two reliable sources per claim in `script.json` "sources"; "reportedly" where sources disagree. Text on props
  (sheets, slips) paraphrases the record: no invented quotes.

## 2. Format
1080x1920, 30 fps, 30-45 s, 10-14 shots of 2-3.5 s. 2D renderer: the player adds a soft punch-in on every cut
(`punch 0.05`, no flash) and a slow push (`zoom`, default 0.05) around `shot.cam`. Fade from black 0.2 s, to black
0.5 s.

## 3. Engine and kit map
```
channels/strange-file/templates/case-file/
  template.json          fonts (Inter, FreeMono, Caladea), player, defaults (bm_fable x1.0, tension, category 24)
  src/core/kit.js        the component kit (below), import * as K from './core/kit.js'
  src/core/captions.js   label-tape typewriter captions (captionTape in kit.js)
  src/sheet.js           style-sheet board (studio stylesheet case-file)
  example/               a finished episode; every new project starts as a copy of it
engine/ (shared)         lib.js (ctx, math, rnd), timing.js (L, Le, Wd), cast.js (cast), board.js
```

## 4. Components (`K.*`)
| group | component | notes |
|---|---|---|
| light | `lightPool(x, y, r, a)`, `vignette(a, x, y, r0, r1)`, `grain(t, a)`, `dust(t, x, y, r, n)`, `filmLook(t, vign)`, `flick(t)` | finish every shot with `filmLook` (or `oldPhoto` for period scenes) |
| backgrounds | `desk(t, lx, ly, lamp)`, `archive(t, lx, ly, lamp)`, `board(t, seed)`, `mapPage(t, seed)` + `mapLight(t, lx, ly)` | the map's light goes ON TOP, after you draw on it |
| paper | `folder(x, y, s, rot, { label, no, stamp, open, sheet: [lines], redact: [[line, from, to]] })` | `open` 0..1 swings the cover open and types the sheet |
| | `sheet(x, y, w, h, rot, lines, p, size)`, `typed(text, x, y, size, p, color, align)` | typewriter text, `p` types it on |
| | `stamp(text, x, y, s, rot, p)` | slams down over p 0..0.25; pair with a `thud` cue |
| | `redact(x, y, w, h, p)`, `redCircle(x, y, rx, ry, p)`, `xMark(x, y, s, p)` | marks wipe or draw on with p |
| | `slip(text, x, y, sc, rot, size)`, `factCard(big, small, x, y, sc, rot)`, `dateStamp(date, place, p, x, y)` | numbers and names |
| | `polaroid(x, y, s, rot, photo(w, h), caption, p)` | `photo` draws a sepia picture in local coords; `p` drops it in |
| board | `pin(x, y)`, `string(a, b, p, sag)` | red string draws on from a to b |
| maps | `shape(pts, fill)`, `route(pts, p)`, `label(text, x, y, size)`, `compass(x, y, s)` | real places: draw a simplified outline in shots.js |
| period | `sepiaSky(y)`, `buildings(x0, x1, y, seed)`, `cobbles(y)`, `person({ x, y, h, dir, hat: bowler/cap/bonnet, walk, arm, color })`, `oldPhoto(t)` | silhouettes, no faces |
| host | `hostScene(t, { pose, poseFrom, poseK, expression, talk, x, y, s, glow })` | the archive + the Archivist, lantern-lit; returns `{ lantern, A, pose }` |

**The Archivist** (`channels/strange-file/characters/the-archivist/CHARACTER.md`): expressions neutral, intrigued,
knowing, surprised, grave, wry, hushed; poses stand, present, raise, file, point, hush, tip; outfits archive (default),
field, winter; `xray: true` = silhouette. He's ~1000 units tall: `s 1.05` with feet at `y 1660` is a full figure
above the caption zone. For a close-up, use `s 2.2-2.6` with feet off-screen (`y ≈ 2900`).

## 5. Shot anatomy
```js
import { ctx, W, H, clamp, lerp, seg, eo, eio, eob, rnd } from './core/lib.js';
import { L, Wd } from './core/timing.js';
import * as K from './core/kit.js';
const { P } = K;
export function buildShots() {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +t.toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);
  { const st = cut(1), w = Wd('january', 1) - st;              // key word, relative to the shot
    add({ id: 'S02', at: st, cam: [540, 900], zoom: 0.06, note: 'date stamp types on over the desk', draw(lt, d, t) {
      K.desk(t); K.dateStamp('JAN 15, 1919', 'BOSTON, MASS.', seg(lt, 0, 0.9)); K.filmLook(t, 0.5);
    } });
    cue(st, 'whoosh', { gain: 0.5 }); cue(st + 0.1, 'pop', { gain: 0.4 }); }
  return { shots: S, cues: CUES };
}
```
Shape: **hook** (the archive or the evidence, already moving) → **date stamp** → 3-5 **evidence steps** (map,
polaroids, period scene) → **the proof** (factCard / slip) → **the twist** (a quiet beat, then one hard sound) →
**the Archivist** returns, the stamp lands (TRUE / UNSOLVED / STILL LAW / FOUND), and a last line loops to the hook.

## 6. Cue types that fit
`whoosh` (soft, gain 0.4-0.6) on cuts · `pop` (gain 0.3-0.5) for slips and polaroids · `thud` for stamps · `slam` once,
for the event itself · `slide` for a folder or map sliding · `sizzle` (low gain) for a slow flood or fire. No
`boing`, no cartoon effects. `studio effects <project>` lists them all.

## 7. QA pitfalls
- A dark frame on a phone reads as empty: every shot needs one bright, readable thing in the lamp pool (paper, the
  lantern, a sepia sky). Check `review/all.jpg` at 25%.
- The Archivist's lantern sits low on the right. Keep the caption (y 1450-1700) clear of his face, and set `y ≤ 1660`
  for a full figure.
- Typed text under 30 px is unreadable on a phone: use it as texture only, and put the important words on a
  `slip`, `factCard` or `dateStamp`.
- Polaroids and slips dropping in at the same moment: stagger them by ≥ 0.2 s, each on its word.
- Red creeping into scenery (bricks, fire): use sepia or amber instead. Red is for evidence only.
