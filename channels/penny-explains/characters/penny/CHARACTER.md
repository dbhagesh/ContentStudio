# Penny: character bible

**ID:** `penny` (permanent, never reused) · **Channel:** Penny Explains (@PennyExplains) only
**Code:** `character.js` is the only thing that draws her. Videos call `cast('penny').draw({...})` and never redraw
her by hand, so she looks identical in every Short. **Model sheet:** `sheet.png` (`studio character-sheet penny`).
**Voice:** Kokoro `af_bella` x1.05 (bake-off: `projects/penny-explains/_voice-bakeoff/README.md`; the owner may
change it, which is a one-line edit in `character.json`).

## Who she is
A sly, charming calico cat who has figured out how money works and how companies make money from you, and is a little
smug about it. Witty, quick, never mean: the smugness is aimed at the business model, never at the viewer. She is on
your side ("It's not you. It's designed."). Cat habits are her comedy: counting on her paws, holding coins up to the
light, a slow wink when she reveals the trick.

## Look (do not change without a major version bump)
- **Body:** white fur `#FFFDF8`, chibi proportions (big head ≈ 1/3 of her height), short round body, stubby legs,
  thick ink outline `#2B2028`, flat colours.
- **Calico patches (fixed, never mirrored in close-ups):** ginger `#EE8A3C` patch over her **right ear and right eye**
  (viewer's left) with two darker forehead stripes; black `#2F2A33` patch on her **left ear and the top-left of her
  head** (viewer's right); a ginger patch on her chest (viewer's left), a black patch on her hip (viewer's right),
  a black sock on her right foot, a ginger patch on the other leg, and a white → ginger → black tail.
- **Face:** big green eyes `#56BC6C` with vertical pupils and two highlights, pink nose `#F0899A`, ":3" cat mouth,
  three whiskers per side, soft pink cheeks.
- **Signature accessory:** a gold coin pendant `#F5B83D` with an embossed **¢** on a teal collar `#1F8A8A`.
- **Outfits (data):** `classic` (teal collar + cent pendant, the default), `banker` (green collar, translucent green
  banker's visor, pencil behind her ear: The Math Of…), `fancy` (black collar, purple bow tie, gold monocle on her
  left eye, tiny top hat: Rich People Tricks).
- **X-ray mode** (`xray: true`): body navy with a mint outline and a stack of gold coins in her belly; head normal.
- **Size:** ~1075 units tall at `s: 1` (ear tips at y -1075, eyes at y -858). Full body on a 1080x1920 frame:
  `s` 0.9-1.0 with feet at y ≤ 1240. Presenter peek: `s` 0.74, `y` 2340. Close-up: `s` ≈ 1.85, `y` ≈ 2330.

## Acting
- **Expressions (13):** neutral, smile, smug (half lids + one brow up + crooked grin: her signature), grin (one sly
  fang), wink, happy, surprised, shock (tiny pupils, sweat, shock lines), suspicious (narrowed eyes), angry (ears back,
  anger mark), sad, thinking (eyes up), greedy ($ eyes, floating $).
- **Poses (12):** stand, wave, point (one toe extended), present (open palm to the side), coin (holds a coin up),
  count (paw up with `count: 0..5` toes raised), think (paw on chin), shrug (palms up), facepalm (head drops into the
  paw), hips, cheer, hold (both paws in front, for a prop drawn with `prop: (ctx, hands) => ...`).
- Blend poses with `poseFrom` + `poseK`; override paw targets with `hands: { r: [x, y] }` (model space) to aim a point.
- She blinks and breathes by herself and her tail swishes with `t` (`tail: 0..1` for an extra flick). Pass `talk:
  0.5` while she's speaking a line on screen, `look: [dx, dy]` to aim her eyes.
- Anchors: top, head, face, eyeL, eyeR, nose, mouth, neck, pendant, chest, belly, hips, handL, handR, tail, feet,
  bubble (`cast('penny').anchor(o, 'handR')`).
- `flip: -1` is fine for blocking (presenter peek), but it moves her patches; avoid it in close-ups and covers.

## Do
- Open on her reacting to the object (suspicious, shocked), return to her for the punchline (smug, wink).
- Keep her out of the caption zone (y ≈ 1350-1510): full body above it, or the peek below it.
- Pair her moods with the colour meaning: shock on red numbers, smug on the trap reveal, happy on green.

## Don't
- Don't redraw her in a video, change her colours or patches, or give her human hands.
- Don't make her give advice ("buy this"), shill a product, or mock the viewer.
- No kid-targeted styling: she is a clever adult character for an 18-35 audience.

## Changing her
Edit `character.js`, re-render the sheet (`studio character-sheet penny`), compare with the previous sheet, then bump
`version` in `character.json` and add a `changelog` entry: patch (fixes nobody would notice), minor (new expressions,
poses, outfits or props), major (her look changes; only when the owner asks).
