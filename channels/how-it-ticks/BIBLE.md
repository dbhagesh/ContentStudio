# How It Ticks: channel bible

Every video for this channel follows this page. Read it in full before planning an episode.

## Audience
- Curious people of all ages, 13+ in practice (the core is 16-40): the person who has used a key, a zipper or a
  microwave ten thousand times and never once wondered how it works, until now.
- They watch Zack D. Films, Animagraffs, Lesics, Veritasium Shorts. They love a satisfying mechanism and hate being
  talked down to.
- Watching on a phone, sound on or off: every idea must read from the picture and the captions alone.
- Not made for kids (no nursery tone, no kid characters), but nothing a 10-year-old couldn't watch.

## Promise (what a viewer gets from every video, in one line)
**"In 45 seconds you'll finally get how [everyday thing] works, and see the part you never knew was there."**
One object, one mechanism, one "oh, *that's* how" moment, shown in clean 3D you could build from.

## Voice and tone
- **Curious, crisp, delighted.** A friendly engineer showing you something cool at the workbench, not a lecturer.
- Narrator: `bm_george` (UK male, documentary) at x1.08. Calm authority, never hype, never shouting.
- Plain words first, the real term second, once: "the seam where the plug meets the shell, the *shear line*."
  At most two technical terms per video, each shown as a label the moment it's said.
- Sentences flow ("so", "which means", "and that's why"); each line is one cut of 1.5-3.5 s.
- Every video has one **wow moment**: a slow-motion hero shot of the mechanism doing its one clever thing.
- Numbers spoken the way the source gives them ("about four thousand years"), never false precision.

## Hook formulas (the first 2 seconds)
The first frame is already the object, moving. The first line is ≤ 2.6 s and makes the viewer *feel* a question.
1. **Hidden identity:** "[Thing] is secretly a [surprising thing]." → *"Your house key is a password."*
2. **Myth flip:** "[Thing] doesn't [what everyone thinks]. It [what it really does]." → *"Your fridge doesn't make cold. It moves heat."*
3. **Huge number, tiny part:** "This [tiny part] [does X] [huge number] times a [day]." → *"This part inside a watch ticks about 691,000 times a day."*
4. **The scary what-if:** "What happens if [failure]?" → *"What happens if an elevator's cable snaps?"*
5. **Hidden thing inside:** "There's a [unexpected thing] inside your [object]." → *"There may be something radioactive on your ceiling right now."*
6. **The sound you know:** "That [sound] is [mechanism] [doing something]." → *"That ticking when you stop pedalling is a one-way door."*
7. **Impossible-sounding fact:** "[Small input] can [huge output] because of [one principle]." → *"Your foot can stop a two-ton car because of a liquid that refuses to squeeze."*

The last line loops to the hook (pilot: "…you're typing a four-thousand-year-old *password*.").

## Series
From `series.json`; every episode belongs to one.
| id | name | format | hook formula |
|---|---|---|---|
| `how-it-works` | How It Works | closed object → cut open → 3-4 parts named → mechanism runs once (hero slow-mo) → surprise | Hidden identity / myth flip |
| `whats-inside` | What's Inside | one big exploded view, then reassembly part by part; the reveal is the part nobody knew was there | Hidden thing inside |
| `why-it-doesnt-fail` | Why It Doesn't Fail | start on the feared failure, then the design that prevents it; calm and reassuring | The scary what-if |
| `tiny-machines` | Tiny Machines | a mechanism smaller than a fingertip, scaled up; end on the count | Huge number, tiny part |

## Look (template, cast, palette, captions)
- **Template:** `mechanism` (this channel only; see its `STYLE.md` and `style-sheet.png`). Premium product
  visualisation: real-looking machined parts on a seamless graphite studio cyclorama under a soft-box key light.
- **The four views, in this order of use:** whole object (beauty shot) → cutaway (hatched section) or x-ray (glass
  housing) → the mechanism moving, with labels → the hero slow-motion moment. Exploded views for "what's inside".
- **Palette:** graphite studio `#1D2128` / `#2A2F37`; metals: satin nickel `#C7CDD4`, steel `#B9C0C8`, brass
  `#D9AE5F`, dark steel `#5A616B`; **signal orange `#FF7A1A` only for the one thing that matters** (the shear
  line, the tooth that engages); x-ray cyan `#7FD8FF`; flows: air `#DDF3FF`, water `#2E9BFF`, current `#FFC93C`,
  heat `#FF5A36`. Cut faces are hatched at 45° (brass-cream for brass, pale grey for steel).
- **Labels:** dark-glass pills, white uppercase Inter, a white leader line with an orange dot on the part. Max three on
  screen; they appear on the word that names the part.
- **Captions:** sentence case, 1-3 words, white Inter Black with a near-black outline, one highlighted word in amber
  `#FF9A3C`, y ≈ 1500. Keep the mechanism above y 1250.
- **Cast: none (narration-only), by decision.** A 2D mascot ("Tick") was considered and rejected for now: the
  engine's cast is canvas-2D only, so a guide robot would be a flat cut-out in a photoreal 3D studio, breaking the
  one-visual-mode rule, and an intro/outro with a host costs the first two seconds the hook needs. Our recognisable
  "cast" is the studio itself: the graphite cyclorama, the orange signal line, the hatched cutaways, the clock-tick
  music bed and the narrator's voice. Revisit if the engine gains 3D cast members (see the pilot report).
- **Sound:** music `workshop` (channel's own: mallets + a quiet clock tick on every beat). Effects: `click` for pins
  and teeth, `ratchet` for runs of clicks, `clunk` for a jam, `whoosh` on big moves, `ding` (soft) for "it works".

## Do
- **Engineering accuracy first.** Gears mesh at the right ratio, pins line up exactly, pistons follow the true
  crank-slider path, flows go the right way. If the model can't be right, cut the shot.
- **Simplify without lying.** Leave parts out (the cam, the retaining clip), never invent one. Say "about", "usually",
  "in most [locks]" when designs vary. Name what we left out in the description if it matters.
- Show cause before effect: the key lifts the pins, *then* the plug turns.
- One idea per shot, the camera always moving (slow orbit, push-in, track along the part).
- Cite 2+ reliable sources per video in `script.json` (encyclopedias, universities, government agencies, standards,
  manufacturers' technical documents, patents) and check each claim against *that* source.
- Make every episode genuinely different: new object, new mechanism, new hook formula when possible.

## Don't
- No how-to-defeat content: no lock picking, bypass, disabling safety devices, or anything that teaches harm.
  (We explain why a wrong key fails, never how to open a lock without one.)
- No scare framing on safety topics (radiation, airbags, elevators): explain, reassure, cite.
- No health advice on body episodes; no gore (clean anatomical models only).
- No brand logos or real product replicas; generic, invented designs only. No AI images, ever.
- No "Today we'll look at…", no "Did you know…?", no "Like and subscribe" in the narration.
- No caption over the key part; no label without a leader to its part; no more than three labels at once.
- Never borrow another creator's script, shot list, models or frames, only the format.

## Thumbnails and titles
- **Title ≤ 55 characters**, curiosity without lies, the object named: "How Your Key Actually Opens a Lock",
  "Your Fridge Doesn't Make Cold", "Where Do Escalator Steps Go?". Questions and myth-flips beat labels.
- No clickbait the video doesn't pay off, no ALL CAPS titles, at most one emoji (none is fine).
- **Cover frame:** the hero moment or the cutaway with the orange signal line visible, the object large and centred,
  no more than 3 words on screen. Pick it with `studio frames` and set `publish.instagram.thumbOffsetMs` to it.
- Description: line 1 = the hook as a sentence; then what you'll see; then sources; then the channel footer.
- Tags: the object, its mechanism, "how it works", "engineering", the series name.

## Monetization notes
- Category **Education** (27). High-RPM niche: educational 3D explainers attract good ad rates and education
  sponsors (learning apps, engineering kits, tool brands, disclosed in the description).
- `madeForKids: false` (all-ages content, 13+ audience; "made for kids" would kill comments and personalised ads).
  `syntheticMedia: false`: clearly stylised 3D with an AI narrator needs no disclosure (references/monetization.md).
- Stay clear of "inauthentic content": original research, a recurring look and voice, a human approving every
  pilot and post, no near-duplicate re-cuts, every script passing `lint`'s originality check.
- Growth path: Shorts for reach → 8-12 min long-form compilations by series ("12 machines you use every day") for
  watch hours and higher RPM → playlists per series → sponsorships once views are steady.
- Instagram Reels: same video, for reach and brand deals; no revenue share expected.
