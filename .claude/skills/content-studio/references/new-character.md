# Adding a permanent character

A channel's own characters live in `channels/<channel>/characters/<id>/` (the default for a new character: only that
channel can cast them); shared ones in `characters/<id>/`. Either way they are served read-only at `/characters/<id>/` to every video, so a character
looks identical in every Short and on every channel that casts them. Use `channels/sakumai/characters/sakumai/` as the reference
implementation.

## The ID
Lowercase letters, digits and dashes, starting with a letter (`sakumai`, `kenji`, `professor-owl`). It is permanent:
every project that cast the character refers to it, so never rename or reuse an ID. Ask the user for the name if it
isn't obvious.

## Files
```
characters/<id>/
  character.json   { id, name, version: "1.0.0", kind: "canvas2d", module: "character.js", description,
                     channels: [...], voice: { id, speed }, palette, expressions: [...], poses: [...],
                     outfits: [...], anchors: [...], references: [...], changelog: [...] }
  character.js     export default { id, draw(opts), EXPRESSIONS, POSES, OUTFITS, PALETTE, ANCHORS, anchor, ... }
  CHARACTER.md     the bible: who they are, exact look with hex colours, acting notes, do / don't, how to change them
  sheet.png        studio character-sheet <id>
  refs/            the reference images the look came from
```

## The drawing contract (`character.js`)
- Import drawing state from the engine with absolute URLs: `import { ctx, clamp, lerp, TAU } from '/src/core/lib.js'`.
- `draw(o)` accepts at least: `x, y` (feet on screen), `s` (scale), `flip`, `t` (film time), `pose`, `poseFrom` +
  `poseK` (blend), `expression`, `outfit`, `look`, `blink`, `talk`, `alpha`, and draws everything inside
  `ctx.save()` / `ctx.restore()`.
- Everything is a pure function of the options and `t`: no state carried between frames, no `Date`, no unseeded
  randomness (`Math.random` is seeded by the player).
- Export `EXPRESSIONS`, `POSES`, `OUTFITS` as objects keyed by name. The model sheet and the unit test read them, and
  `character.json` must list the same keys in the same order.
- Export `ANCHORS` (named model-space points) and `anchor(o, name)` (point → screen), so shots can attach bubbles,
  props and effects to the character without guessing.
- Keep the look data-driven (palette and outfits as data), so a new outfit is data and not new drawing code.

## Workflow
1. Collect references (frames from the user's existing videos, or a description). Save them in `refs/`.
2. Write `character.js`, render `studio character-sheet <id>`, and compare the sheet with the references side by side
   (scale both to the same height with ffmpeg `hstack`). Iterate until the proportions, palette and signature
   details match.
3. Write `CHARACTER.md`, fill `character.json`, then run `studio characters --validate` and `npm test`.
4. Add the ID to the channel's `cast` in `channels/<channel>/channel.json`. `npm run test:render` renders the sheet
   and a cast video.
5. Show the user the sheet and one test frame before using the character in a real video.
