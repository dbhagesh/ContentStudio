# Sakumai: character bible

**ID:** `sakumai` (permanent, never reused) · **Channel:** Sakumai ([@SakumaiShorts](https://www.youtube.com/@SakumaiShorts))
**Code:** `character.js` is the only thing that draws her. Videos call `cast('sakumai').draw({...})` and never redraw
her by hand, so she looks identical in every Short. **Model sheet:** `sheet.png` (`studio character-sheet sakumai`).
**Source of the look:** the Short *Why Do You Get Butterflies Around Your Crush?* (frames in `refs/`).

## Who she is
A cute, curious anime schoolgirl who explains how feelings and the body work: crushes, nerves, sleep, why we blush.
She is warm, a little dramatic, easily flustered, and always on the viewer's side. She reacts big (heart eyes, shock,
shy blushing) and then calms down to explain. She speaks to the viewer as "you".

## Look (do not change without bumping the version)
- **Hair:** pastel pink `#F7A9CB`, long straight side tails reaching past her skirt with jagged tips, a spiky
  fringe down to her brows, a lighter pink hairband stripe across the crown, one curled **ahoge** on top.
- **Bow:** red `#E2384A` ribbon on the right side of her head (viewer's right), always.
- **Face:** pale `#FFE7DA`, small pointed chin, big violet eyes `#9A7BE6` with two white highlights and thick dark
  upper lashes with an outer flick, soft pink blush ovals, tiny nose, small mouth.
- **Outfit (default `uniform`):** butter-yellow cardigan `#F9E5AC` with a navy sailor collar `#2E3D7A` (white stripe)
  over a white shirt, two small buttons, pleated navy skirt `#34468A`, white socks, brown shoes `#77462C`.
- **Other outfits:** `casual` (pink hoodie, denim skirt), `pajamas` (lavender with yellow stars). Same body and hair.
- **Line:** thin plum outlines `#7A4258`, flat colours, no gradients except the eyes.
- **X-ray mode:** body navy `#25234F` with a lavender outline `#A99BF0` and red blood dots. Her head and hair stay in
  normal colours. Organs go on top via `inside(ctx, ANCHORS)`.
- **Proportions:** about 4.5 heads tall, big head, slim legs (≈ 1010 units tall at `s: 1`; ~1.2-1.5 for a full-body
  shot on a 1080×1920 frame, ~2.5-3 for a close-up cropped at the chest).

## Acting
- **Expressions:** neutral, smile, happy, love (heart eyes + floating hearts), surprised, serious, shy, sad, angry,
  shock, sleepy, wink, starry.
- **Poses:** stand, wave, cheek (hand on cheek, flustered), books (hugging books), think, point, cheer, shrug, hips,
  heart, phone, fists.
- Blend between poses with `poseFrom` + `poseK` (0..1) for movement, e.g. `poseK: eio(seg(lt, 0.2, 0.6))`.
- She blinks by herself (`blink: false` to stop), breathes, and her hair sways with `t`. Pass `talk: 0.6` while she is
  "speaking" a line, `look: [dx, dy]` to point her eyes.
- Mirror her with `flip: -1` only for blocking. Mirroring moves the bow to the other side, so avoid it in close-ups.

## Do
- Keep her the emotional anchor of every Short: open on her reacting, return to her for the punchline.
- Use her palette next to her: pastel lavender / pink skies, warm sunset streets, a soft navy for x-ray boards.
- Keep captions out of her face (the caption zone is the lower third: frame her higher, or close-up above it).

## Don't
- Don't redraw her in a video, change her colours, or swap the bow side in close-ups.
- Don't show gore: inside the body is the cute x-ray look only.
- Don't age her up, sexualise her, or put her in situations a young schoolgirl character shouldn't be in.

## Changing her
Edit `character.js`, re-render the sheet (`studio character-sheet sakumai`), compare with `refs/` and the previous
sheet, then bump `version` in `character.json` and add a `changelog` entry:
- **patch** (1.0.x): fixes nobody would notice.
- **minor** (1.x.0): new expressions, poses or outfits.
- **major** (x.0.0): her look changes.

Projects pin the version they were made with (`project.json` → `cast`), and `studio check` warns when a project would
now render a different version.
