# Ink & Ember: channel bible

An original serialized manga, told one 45-60 second part at a time. Black-and-white ink pages that move, and in the
one moment per episode when a heart catches fire, the page bursts into colour. Every video follows this bible.

## Audience
- **13-30, anime, manga and webtoon fans** who scroll Shorts for stories, not facts. They know the grammar (focus
  lines, sweat drops, the rival on the rooftop) and love it when it's done with conviction; they bounce off anything
  that feels like a slideshow.
- They binge. A viewer who finishes Part 1 must want Part 2 *right now*: every arc is a playlist, every end card names
  the next part.
- Watching on a phone, sound on or off: the story must read from the pictures and captions alone.

## Promise (what a viewer gets from every video, in one line)
**One minute of a manga you can't find anywhere else, ending on a cliffhanger you need to see resolved.**

## The world: Cinderhollow
- A walled city built inside the rim of a dead volcano. **Ash has fallen from the sky for a hundred years.** Nobody
  remembers colour: walls, clothes and faces are grey, because **colour is a crime**.
- **The Inkguard** keep it that way. They paint over every bright thing with grey ward-ink and carry brush-blades:
  calligraphy brushes whose tips are edges of hardened ink. Their sigil: a circle split by one brush stroke.
- **The Hush** live in the ash-clouds: vast ink-black things with many white eyes. They are drawn to colour and feeling,
  and they swallow both. The Inkguard say the grey keeps the Hush asleep.
- **Embers** are rare kids born with a coal of colour in their chest. When they feel too much, it **ignites**: their
  colour bursts out as fire only an Ember can control. The one rule every Ember is taught: *never burn on purpose*.
  The Inkguard hunt them. But an Ember's fire is the only thing a Hush fears.
- **Why this works on screen:** the B&W page IS the grey city, and the colour burst IS an Ember igniting. The look is
  the story. Colour on screen always means a feeling too big to hold.

## The cast (permanent, drawn only by `cast('<id>')`)
| id | who | silhouette in B&W | colour accent | voice |
|---|---|---|---|---|
| `akari` | **Akari Hino**, 16, the lead. An Ember who has hidden her flame all her life by trying to feel nothing. Fierce, funny, reckless when someone's in danger. | white flame-shaped ponytail, spiky bangs, long ragged scarf | **ember red** `#FF4A1C` (scarf, eyes, flame) | bake-off pick (bright, young, fierce) |
| `ren` | **Ren Shirogane**, 17, the rival. The Inkguard's youngest hunter, cold and precise, and secretly an Ember himself, his blue flame smothered by an ink brand under his eye. | solid-black straight hair, fringe hiding his right eye, long black coat | **ice blue** `#39B8FF` (sigil, eye, flame) | bake-off pick (low, cool) |
| `dai` | **Dai Okabe**, 16, the best friend. The lantern-maker's son, big, loud, kind, no powers at all and braver than everyone. Secretly builds coloured lanterns. | big round head, spiky crew-cut in grey tone, goggles on the forehead, apron | **lantern gold** `#FFC21A` (goggles, lantern) | bake-off pick (warm, playful) |
| `sumi` | **Grandmother Sumi**, the mentor. Runs the Last Lantern teahouse; teaches calligraphy; was once the Inkguard's captain, and carries the city's oldest secret. | tiny, round spectacles, a huge white bun pierced by two brush-pins, braid, black robe | **jade** `#22C98A` (sash, pins, eyes) | bake-off pick (calm, older, British) |

Look and acting rules for each live in `characters/<id>/CHARACTER.md`. Never redraw them by hand; never change their
look without the owner asking (major version bump).

## Character arcs across the three arcs
- **Akari:** hides her fire → *chooses* to burn to save someone (Arc 1) → loses herself to greying ink and is brought
  back by friendship (Arc 2) → burns for the whole city (Arc 3). Theme: your feelings are not the danger.
- **Ren:** hunter → exposed as an Ember (end of Arc 1) → ally who still competes with her (Arc 2) → learns to stop hiding
  and lets himself be saved (Arc 3).
- **Dai:** comic relief and heart → confronts the father who abandoned him (Arc 2) → the beacon: courage without
  powers (Arc 3).
- **Sumi:** mentor → secret → confession → sacrifice and redemption (Arc 3).

## Series (arcs) and storytelling rules
Each arc is a series in `series.json` (3-5 parts of 45-60 s). The backlog holds every part with its hook and
cliffhanger.
1. **Cold open on the most dramatic moment.** Frame 1 is the most intense image of the episode (a face mid-scream, a
   flame igniting, a blade at a throat), never a title, never a recap. The first line is a claim the viewer *feels*.
2. **"Part N" title card** comes AFTER the cold open (by ~4 s), over a wide establishing panel, for ~2 s.
3. **Escalate every 2-3 lines:** a new threat, a reveal, a reversal. No line only restates.
4. **One colour moment per episode** (two at most): the beat where a heart ignites. Build to it in B&W.
5. **A cliffhanger every episode:** end on a question the viewer must see answered (a reveal, a choice, a fall).
   Never resolve it in the same part.
6. **A payoff every arc:** the last part of an arc pays off its first part's hook (Arc 1 Part 1: "colour is a crime";
   Arc 1 Part 5: colour floods the market and she *chooses* it) and then opens the next arc with a new hook.
7. **"Part N+1 →" end card** on the last ~1.5 s, over the final beat's echo.
8. **Recap in one line** at most, and only inside an action shot ("She broke the one rule…").
9. **Dialogue is short and in character.** Lines with a `speaker` are spoken in that character's voice; one speaker
   per line; a speaker change starts a new sentence. The narrator (`bm_fable`, storyteller) carries the rest.

## Voice and tone
- **Genre mix:** dark-fantasy shonen action + found-family warmth + a mystery that deepens every arc. Rival
  energy (Akari vs Ren), friendship that saves the day (Dai), a mentor with a secret (Sumi).
- **Narration:** present tense, close on Akari, short and rhythmic, like a manga's narration boxes read aloud ("Then a
  whistle cuts through the ash."). No purple prose, no recaps, no "in this video".
- **Humour:** small and character-based (Dai's panic, Sumi's tea), never undercutting a colour moment.
- **Stakes are emotional first:** who could she lose, what would she have to feel.

## Hook formulas (the first 2 seconds)
- **The forbidden fact:** "In a city where colour is a crime, her heart just caught fire."
- **The broken rule:** "Every Ember is taught one rule. She just broke it."
- **The betrayal reveal:** "The old woman who saved her used to hunt girls like her."
- **The impossible stake:** "She forgot his name. He made her remember."
- **The countdown:** "She has until the ash stops falling to choose."

## Look (template, cast, palette, captions)
- **Template:** `manga-panels` (this channel's own). Read its `STYLE.md` before planning shots.
- **Ink:** black `#111014` on warm manga paper `#F6F3EC`. Heavy contours (7-10 px) outside, thin lines (2-3 px) inside.
  Panel borders 9 px, white gutters ~22 px, slanted cuts for action.
- **Screentone:** rotated dot tone in three densities (light `dots`, mid `dots2`, dense `dots3`), gradient dot ramps
  for skies and shadows, hatching for night and dread, cross-hatch for the darkest beats.
- **Panel grammar:** wide establishing panel → medium on the speaker → extreme close-up (eyes) on the turn. Panels
  assemble (slide/pop in) as a scene builds and **break** (shatter) on impacts. The camera pans and zooms across a
  page; it never sits still.
- **Effects:** focus lines toward a face on a reveal; parallel speed lines on dashes; impact bursts on hits; SFX
  lettering (FWOOM, SHING, FWEEEE) on every big sound.
- **Colour (the rule that defines the channel):** the page is B&W. Colour appears ONLY when a heart ignites: the colour
  burst spreads as a ring of fire from the source (a chest, an eye, a blade), the page goes to full colour washed in
  fire-light, then fades back to ink. Each character's flame/accent is their own colour (ember, ice blue, gold, jade).
  Outside those beats, the only colour allowed is a single accent flicker (`color: 'accent'`: an eye or a sigil) as
  foreshadowing.
- **Captions:** 1-3 words, Inter Black, white with an ink outline, tilted slightly like lettering. Narrator highlight:
  reversed ink. A character's line: highlight in their accent colour, so you can see who speaks.
- **Music:** `ember` (taiko pulse + low drone, channel audio). Effects: whoosh on cuts, `fwoom` on ignitions, `shing` on
  blades, `impact` on hits, `whistle` for the Inkguard.

## Do
- Open on the strongest image; title card second; end card last.
- Give every episode one colour moment that *means* something.
- Keep faces and key action above y 1300 (captions live at y ≈ 1470).
- Let the eyes act: shaking pupils for shock, gloom lines for dread, sweat drops for comedy.
- Keep continuity: scarf, fringe, goggles, bun are always on; the world's rules never bend.
- Name the next part on the end card and in the description.

## Don't
- **No sexual content**, fan-service framing or suggestive poses. The cast are teens: write and draw them as such.
- **Violence is stylised, never gory:** impacts are bursts and speed lines; a cut is a torn scarf or a crack in the
  panel, never blood. Nobody dies on screen in a graphic way.
- **No real people, real places, brands, or existing manga's characters, plots, powers or panels.** Every name, world
  rule and image here is ours. Borrow only the *grammar* of manga (panels, tone, focus lines).
- No colour outside a colour moment (except a single accent flicker). No AI images. No recaps longer than one line.
- No cliffhanger that's a cheat (a dream, a fake-out) more than once per arc.

## Thumbnails and titles
- **Title:** ≤ 55 characters: the hook as a statement + ` | Part N` (e.g. *"Colour Is Illegal. Her Heart Caught Fire | Part 1"*).
  No clickbait the episode doesn't pay off.
- **Cover frame:** the colour moment at full burst (a face lit red, flames, the B&W crowd behind), or the most extreme
  face of the episode. The cover always has colour in it: it's the brand.
- **Description:** line 1 the hook; line 2 "Part N of <arc name>. Part N+1: <next title> (coming soon)"; then the
  channel footer. Hashtags: #manga #anime #originalmanga (3-5 total).
- Playlists per arc (set by hand in YouTube Studio), named after the arc.

## Monetization notes
- Ads RPM low-medium (entertainment). The real value is **retention and binge**: series playlists, end cards, and
  "Part N" titles lift session time.
- Every episode is a new original script with recurring characters and a point of view: the opposite of mass-produced
  content (`lint` guards against repeats). Never re-cut or repost a part.
- Later income: channel memberships with early access to the next part; a webtoon/comic edition of each arc drawn
  from the same character code; sticker sets of the cast's expressions.
- `madeForKids: false` (13+ audience); `syntheticMedia: false` (clearly stylised drawings).
