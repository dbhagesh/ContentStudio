# The Archivist: character bible

**ID:** `the-archivist` (permanent, never reused) · **Channel:** The Strange File ([@TheStrangeFile](https://www.youtube.com/@TheStrangeFile))
**Code:** `character.js` is the only thing that draws him. Videos call `cast('the-archivist').draw({...})` (or the
template's `K.hostScene`, which calls it) and never redraw him by hand, so he looks identical in every Short.
**Model sheet:** `sheet.png` (`studio character-sheet the-archivist`). **Voice:** `bm_fable` x1.0 (provisional;
see `projects/strange-file/_voice-bakeoff/README.md`).

## Who he is
The keeper of the Strange File: an archive of true events too odd for the ordinary history books. Nobody knows his
name or has seen his face; we only see a tall figure in a greatcoat, his spectacles catching the light of the lantern
he carries between the shelves. He's calm, dry and quietly delighted by the strange. He never hurries, never
exaggerates, and treats the people in his files with respect. He opens each file for you, and at the end he stamps
it and puts it back, or leaves it open when it's unsolved.

## Look (do not change without bumping the version)
- **Silhouette first:** he must read as a shape in near-darkness. The three things that make him recognisable from
  across a room are the **wide flat-brimmed hat**, the **long flared greatcoat with a tall upturned collar**, and
  the **lantern hanging from his right hand** (viewer's right).
- **Hat:** near-black `#18191E`, brim 336 units wide (much wider than his shoulders), a low crown with a pinched top,
  an oxblood band `#6E2622`.
- **Face:** in shadow `#211B19`, no features except **two round brass-rimmed spectacles** `#B8904F` whose lamp-lit
  glints `#FFE9B8` are his eyes, and a faint lamp-lit mouth line `#7A5236`. Never draw eyes, a nose or hair.
- **Coat (outfit `archive`):** charcoal `#1F2129`, double-breasted with six brass buttons, a belt with a brass buckle,
  an oxblood lining `#3A1F1D` showing in the front split below the belt, rounded shoulder caps.
- **Lantern:** dark metal `#2C2721`, warm glass `#F0A640`, a flickering flame `#FFC764`, and a **small red file tag**
  `#B3261E` tied to the handle (the channel's mark). Its warm halo lights his coat and, when raised, his chin.
- **Other outfits:** `field` (olive raincoat with a shoulder cape, brown band) and `winter` (grey scarf). Same shape.
- **Silhouette mode:** `xray: true` turns him into a pure black cut-out with only the glints and the lantern lit
  (a figure at the end of a corridor).
- **Proportions:** ~1000 units tall at `s: 1` (hat crown at y -995, glints at y -826). Full figure on a 1080x1920
  frame: `s 1.0-1.1`, feet at `y ≤ 1660` so the caption zone stays clear of his face. Close-up: `s 2.2-2.6`, feet off
  the bottom of the frame.

## Acting
- **Expressions** (spectacle glints + head tilt + hat dip + mouth): `neutral`; `intrigued` (head tilts, one lens goes
  dark, a small "?" floats); `knowing` (glints narrow, wry mouth, hat dips); `surprised` (glints widen, hat lifts,
  dust); `grave` (hat dips low, glints dim, frown: for deaths and losses); `wry` (a small smile); `hushed` (narrowed
  glints, no mouth: for secrets and "nobody knows").
- **Poses:** `stand` (lantern low at his side), `present` (lantern lifted, open hand: "here's the file"), `raise`
  (lantern held high, searching the shelves), `file` (holds a manila case file at his chest), `point` (points off to
  the left of frame: "look at this"), `hush` (gloved finger to his lips), `tip` (touches his hat brim: the sign-off).
- Blend poses with `poseFrom` + `poseK` (0..1), e.g. `poseK: eio(seg(lt, 0.2, 0.7))`. The lantern follows the hand.
- He breathes, the lantern swings and flickers, and his glints blink every few seconds by themselves (`blink: false`
  stops it). `talk: 0.5` moves his mouth line while he narrates on screen. `glow: 0..1` dims or lights the lantern
  (blow it out at the very end of an unsolved file). `look: [dx, dy]` shifts the glints.
- `anchor(o, 'lantern')` returns the lantern's screen position for the same options, so the scene's light pool can
  sit exactly on it (that's what `K.hostScene` does). Also `handL`, `handR`, `file`, `face`, `hat`, `bubble`.

## Do
- Open and close every file with him: an intro in the archive (`present`, `file` or `raise`) and a sign-off (`tip`
  for a closed case, `hush` + `glow` fading for an unsolved one).
- Keep him lamp-lit in darkness: the archive set, a dark desk, a doorway. His lantern is the scene's light.
- Keep his face (the glints) above y ~1400 in frame, clear of the captions.

## Don't
- Don't redraw him, recolour him, give him a visible face or eyes, or take off his hat.
- Don't put him inside sepia period scenes (he keeps the record, he isn't in it), or near gore, weapons or victims.
- Don't make him spooky or menacing (no glowing red eyes, no jump scares). He's the calm guide, not the monster.
- Don't mirror him with `flip: -1` in close-ups: the lantern and its tag must stay on his right.

## Changing him
Edit `character.js`, re-render the sheet (`studio character-sheet the-archivist`) and compare it with the previous
sheet. Then bump `version` in `character.json`, add a `changelog` entry, and keep the `expressions` / `poses` /
`outfits` lists in the same order as the code's exports:
- **patch** (1.0.x): fixes nobody would notice.
- **minor** (1.x.0): new expressions, poses or outfits.
- **major** (x.0.0): his look changes (only when the owner asks).

Projects pin the version they were made with (`project.json` → `cast`), and `studio check` warns when a project would
now render a different version.
