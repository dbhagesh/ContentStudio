# Money Desk: Penny Explains finance shorts, 9:16

Sly, clear, a little smug, always on the viewer's side. Penny the calico cat presents; precise flat charts, ticking
counters and money objects prove the point; the trap reveal lands in red on its word. Channel: **penny-explains only**.
Example to study and copy: `example/` = **WHY YOUR CARD WANTS YOU TO PAY THE MINIMUM** (41 s, 15 shots).
Style sheet: `style-sheet.png` (`studio stylesheet money-desk`). Penny's model sheet:
`channels/penny-explains/characters/penny/sheet.png`.

## 1. The look (rules from the sheet: do not break them)
- **Flat shapes, ink outlines, flat offset shadows.** No gradients on objects (the vault's red glow is the one
  exception, for the trap beat). Depth = a darker tone of the same colour or the flat `P.shadow` offset.
- **Palette (`K.P`):** paper `#FBF5E9` · ink `#1D1B26` · money green `#1FA463` · coin gold `#F5B83D` · trap red
  `#E5483B` · data teal `#2A7F9E` · vault navy `#1C2238` · desk `#C98B57`, plus the light/dark shades in `kit.js`.
- **Colour has one meaning each:** green = money you keep · red = money they take (interest, fees, the trap) ·
  gold = the one key number (and the caption's highlighted word) · teal = neutral data. Never decorative colour.
- **Charts are evidence.** Every bar, line point and counter comes from data in `shots.js` (compute it there, as the
  example's `simulate()` does, and `throw` if it drifts from what the script says). Every chart has axis ticks with
  units, a value on every bar, and a footnote with the assumptions. Tick labels ≥ 40 px, values ≥ 60 px: they must read
  on a phone at 25% zoom.
- **Penny** is drawn only with `cast('penny').draw({...})`. She reacts on the beat (suspicious on the hook, shock on the
  number, smug on the reveal, wink at the end). Outfit `classic` by default; `banker` for The Math Of…, `fancy` for
  Rich People Tricks (see the channel BIBLE).
- Mood: clever, never preachy. Education, never advice: no tickers, products or "you should".

## 2. Format
- **1080x1920, 30 fps, 30-50 s.** Lead 0.4 s, outro 0.9 s. Voice: Penny's (`af_bella` x1.05 for now; see
  `projects/penny-explains/_voice-bakeoff/README.md`).
- **Story shape:** hook question with Penny + the object → one concrete example with real numbers → follow the money
  (one picture per step) → the number that hurts (chart / receipt) → before / after comparison → **the trap reveal**
  (vault, red, on its word) → the law / the rule → Penny's last line to camera (loops to the hook).
- **One line = one shot = one cut**, 1.5-3.5 s each. The player adds a gentle punch-in + light flash on each cut
  (`template.json` → `player`); add the `whoosh` cue yourself.

## 3. Captions
`script.json` line: `{ "text": "Only thirty actually pays down your debt.", "caps": "ONLY *$30 | PAYS DOWN | YOUR *DEBT" }`
- `|` splits caption chunks, `*` marks the ONE gold word (`#FFC93C`). 1-3 words per chunk. Inter Black 138 px, white,
  ink stroke 28, centred at y 1430 (zone ≈ 1350-1510).
- Money as numerals in caps ("$85", "22%"), spoken as words. **Start every chunk after the first with a word that is
  actually spoken** ("OWE *$3,000", not "*$3,000"): chunks are placed by matching their first word; a numeral-first
  chunk falls back to word-count placement and can land early or late. Avoid one-letter first words ("A") too.

## 4. Engine map
| file | gives you |
|---|---|
| `example/script.json` | title, description, tags, series, voice, speed, lead, outro, gap, music, sources, lines `{text, caps}` |
| `example/src/shots.js` | the per-video file: data + the shot list + sound cues |
| `src/core/kit.js` | the component kit (below), `import * as K`; palette `K.P` |
| `src/core/lib.js` (engine) | `W H`, `clamp lerp seg eo eio eob rnd`, `rr circle ell line fillAll bigText` |
| `src/core/timing.js` (engine) | `L(i)` line start, `Le(i)` line end, `Wd(word, line)` word start, `T.dur` |
| `src/core/cast.js` (engine) | `cast('penny')` → `{ draw(o), anchor(o, name), POSES, EXPRESSIONS, OUTFITS, coin }` |
| `src/sheet.js` | the style-sheet board |

## 5. The kit (`kit.js`)
**Numbers** `K.fmtNum(v, d)` → "1,234" · `K.fmtMoney(v, d)` → "$4,433" · `K.tick(a, b, p)` eased count ·
`K.counter(v, x, y, size, { prefix, suffix, d, color, stroke, align, sc })` · `K.label(str, x, y, size, color, { weight, align, spacing, maxW })`.
**Backgrounds** `K.paper(t)` graph paper (charts, math) · `K.desk(t, deskY = 1180)` Penny's office (character beats) ·
`K.vault(t, glow)` dark navy + red glow (the trap) · `K.field(color, stripe, t)` flat colour slam.
**Cards & labels** `K.card(x, y, w, h, { title, titleFill, fill, sc })` · `K.pill(text, x, y, size, bg, fg, sc)` ·
`K.tag(text, x, y, tx, ty, size, sc, bg)` · `K.footnote(text, x, y, a, color, size)` (`\n` = 2 lines; assumptions,
"for education, not advice") · `K.bubble(text, x, y, w, h, tailX, tailY, sc, size)` speech bubble.
**Money objects** `K.coin(x, y, r, spin, rot)` · `K.coinStack(x, y, n, r)` · `K.bill(x, y, s, rot, '100')` ·
`K.creditCard(x, y, s, rot, { color, dark, name, digits })` · `K.priceTag(x, y, s, '$4.99', rot, { fill, strike })` ·
`K.receipt(x, y, s, { title, rows: [[label, amount, color]], total, p, w })` (rows print as p → 1) ·
`K.calculator(x, y, s, display, pressIndex)` · `K.pctBadge(x, y, s, '22%', color, sc)` ·
`K.statement(x, y, w, { title, rows, hi, hiA, hiColor, p, s })` (a bill / statement, one row boxed).
**Charts** `K.barChart({ x, y, w, h, bars: [{ label, value, color, text }], max, ticks, fmt, p, stagger, title })` ·
`K.lineChart({ x, y, w, h, xMin, xMax, yMin, yMax, series: [{ data, color, width, area }], p, xTicks, yTicks, fmtX, fmtY, xLabel, yLabel, endLabel })` ·
`K.splitBar({ x, y, w, h, parts: [{ value, color, label }], p })` (where a payment goes).
**Verdicts** `K.trap(x, y, s, close, bait)` jaw trap, coin bait, `close` 0 → 1 snaps · `K.stamp('TRAP', x, y, s, color, rot, p)` ·
`K.redX` · `K.check` · `K.beforeAfter({ x, y, w, h, left: { title, color, draw(cx, cy) }, right, p, vsY })`.
**Effects** `K.arrow(x, y, len, ang, a, color)` · `K.burst(x, y, s, a, color)` · `K.coinRain(t, n)` ·
`K.coinFlow(ax, ay, bx, by, p, n, r, arc)` money flying between two points · `K.calendar(x, y, s, '15', 'YEARS')`.
New topic = new components: add them to `kit.js` in this look (flat fill, ink outline 5-6 px, offset shadow),
document them here, and look at them full size.

## 6. Penny on screen
- **Full body:** feet at y ≤ 1240, `s` 0.9-1.0 (she is ~1075 px tall at s = 1), so the caption zone stays clear.
- **Presenter peek** (charts and cards above): `penny.draw({ x: 880, y: 2340, s: 0.74, flip: -1, ... })` puts her head
  and paws in y ≈ 1600-1900, under the captions. `pose: 'point', hands: { r: [200, -900] }` points up at the chart.
- **Close-up** for the last line: `s` ≈ 1.85, `y` ≈ 2330 (face around y 760).
- Blend poses with `poseFrom` + `poseK: eio(seg(lt, a, a + 0.3))`; change expression on the word (`lt > Wd(...) - st`).
- Use `penny.anchor(o, 'handR')` to attach props or effects to her paw; `prop: 'coin' | 'bill' | 'card'`.

## 7. A shot
```js
const st = cut(9), mo = Wd('more', 9) - st;                    // cut just before line 9
add({ id: 'S10', at: st, cam: [540, 700], zoom: 0.1, note: 'bars: borrowed vs interest',
  draw(lt, d, t) {                                              // pure function of time
    K.paper();
    K.barChart({ x: 230, y: 360, w: 760, h: 640, max: 5000, ticks: [0, 2500, 5000], fmt: (v) => K.fmtMoney(v),
      p: eo(seg(lt, 0, 0.55)), bars: [{ label: 'BORROWED', value: 3000, color: P.teal }, { label: 'INTEREST', value: MIN.interest, color: P.red }] });
    cast('penny').draw({ x: 880, y: 2340, s: 0.74, flip: -1, t, expression: 'shock' });
  } });
cue(st, 'whoosh'); cue(st + mo, 'slam', { gain: 0.6 });
```
Keep everything important between y 250 and 1230; the camera pushes toward `cam`, so keep content ≥ 60 px inside the
frame edges (a 1060-px-wide card gets cropped).

**Sound cues** `whoosh` (every cut) · `pop` (a label appears) · `ding` (a number lands) · `tock` (a row prints / time
passes) · `slide` (dur, a bar grows or a counter runs) · `zip` (money leaves) · `stamp` (seal / stamp) · `slam` (the big
number, the trap) · `boing` (comic beat) · `sparkle` (dur, the wink) · `thud` · `chirp`. Keep them soft.

## 8. QA pitfalls we've hit (check these first)
- **Chart text too small:** 30 px tick labels vanish on a phone. Kit defaults are now 40 px ticks / 64 px values.
- **A numeral-first caption chunk** ("*$3,000") lands at the wrong time: start chunks with a spoken word.
- **Penny in the caption zone:** full body only with feet ≤ y 1240, otherwise use the peek.
- **A prop arm reaching into the trap / a chart:** give Penny her own lane (peek) when the object is centred.
- **Effects over the key number** (a burst on "$85.00"): put the burst somewhere else; the number must stay clean.
- **Wide cards cropped by the camera push:** cards ≤ 960 px wide.
- **Footnotes running off the card:** `\n` two lines, `maxW` 960.
- **A seal touching its label** (65% + pill): leave ≥ 40 px between components.
