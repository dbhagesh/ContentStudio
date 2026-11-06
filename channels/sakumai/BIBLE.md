# Sakumai: channel bible

**Channel:** Sakumai · [@SakumaiShorts](https://www.youtube.com/@SakumaiShorts) · YouTube Shorts + Instagram Reels
**Host:** Sakumai, the only cast member (`channels/sakumai/characters/sakumai/`, read its CHARACTER.md)
**Template:** `sakumai-studio` (this channel's own; read its STYLE.md and style-sheet.png before planning)

## 1. Audience
Teens and young adults, 13-25, mostly girls, who watch anime and cute art Shorts and wonder why their body and
feelings do weird things: chills from a song, going blank around a crush, crying at a movie, being wide awake at
midnight. They watch on a phone, often with the sound on, late at night. They want to feel *understood*, not
lectured. Not a kids' channel: no nursery tone, no babyish characters.

## 2. Promise
**In under 40 seconds, Sakumai explains one thing your body or heart just did, so you understand yourself a little
better and feel a little more normal.** One feeling, one mechanism, one surprise, one kind last line.

## 3. Voice and tone
Warm, playful, a little dramatic, never preachy. She talks to one friend ("you"), owns the embarrassment with you,
then explains like the smart friend who reads science for fun. Science-true but light. Always ends kind.

Example lines (her voice):
- "Okay, be honest. Has a song ever given you literal goosebumps?"
- "Your brain is kind of a drama queen, and honestly? Same."
- "Here's the wild part: it starts *before* the best bit even plays."
- "So no, you're not weird. Your body is just doing its job a little too well."
- "Going blank around your crush doesn't mean you're awkward. It means you care."
- "Next time it happens, just say hi to your dopamine for me."

Words to avoid: "guys", "smash that like", "doctors hate this", "you should", "fix", "cure", "normal people".
Speak numbers as words, the way the source says them ("about sixty percent").

## 4. Hook formulas (the first 2 seconds)
The first line is a moment the viewer has *felt*, on screen from frame one with Sakumai reacting. Never a topic label.
| # | formula | example |
|---|---|---|
| 1 | Why does your ___ when ___? | "Why does your favorite song give you goosebumps?" |
| 2 | Your brain does something weird when ___. | "Your brain does something weird when your crush says hi." |
| 3 | Try this right now: ___. | "Try tickling yourself right now. Nothing, right?" |
| 4 | That ___ feeling when ___? Here's what's really happening. | "That shaky feeling before a test? Here's what's really happening." |
| 5 | Every night, your body ___. On purpose. | "Every night, your body switches off your muscles. On purpose." |
| 6 | Your ___ gives you away when ___. | "Your eyes give you away when you see someone you like." |
| 7 | It's not ___, it's ___. | "It's not that you're lazy at midnight, it's your body clock." |
| 8 | If you've ever ___, this is for you. | "If you've ever cried at a movie and felt better after, this is for you." |

## 5. Series
Every episode belongs to one series in `series.json`:
- **Why does your body…** (`why-body`): everyday body reactions (chills, yawns, hiccups, brain freeze).
- **Feelings explained** (`feelings-explained`): one feeling as what the brain and body actually do, ending on a kind reframe.
- **Your crush's brain** (`crush-brain`): crush-level, innocent romance science; Sakumai gets flustered, then explains.
- **Night mode** (`night-mode`): sleep, dreams and the night-time body, in pajamas, calmer pace.

## 6. Story shape (30-40 s, ~2.6-3.2 words per second, ~90-110 words)
1. **Hook** (≤ 2.5 s): the felt moment, Sakumai reacting big.
2. **Escalation**: the first "inside you" beat, cut into the body cutaway.
3. **Mechanism**: the one clear cause, shown on the cutaway kit (heart, brain, nerves, hormones as particles).
4. **Surprise / myth-bust**: the thing they didn't know.
5. **Twist**: the turn that makes it worth sharing.
6. **Kind last line** that pays off and loops to the hook (she looks at the camera).
A line is a cut: the picture changes every 1.5-3.5 s. Cut any line that only restates.

## 7. Look
- **Template `sakumai-studio`** only (`channel.json` "templates": []). Pastel sets: classroom, bedroom, night sky and
  the cute "inside the body" set. Everything drawn in code; no AI images.
- **Cast:** Sakumai only, drawn only through `cast('sakumai').draw({...})`. Never by hand, never recoloured, bow
  always on her right in close-ups. New poses or expressions go into `character.js` with a minor version bump.
- **Body cutaway kit:** heart, brain, stomach, lungs, nerves, blood vessels, hormones as cute particles (dopamine
  sparkles, adrenaline zaps). Cute and clean, never gore, no realistic organs, no needles, no blood drips.
- **One visual mode per shot:** an x-ray shot is x-ray from head to toe (her head stays normal, per CHARACTER.md).
- **Captions:** Inter Black, white, ONE yellow `#FFD43B` word per chunk, plum stroke `#2A1A3A`, 1-3 words, in the
  lower third. Keep her face and the key organ above the caption zone.
- **Colour meaning:** pink = feelings and the heart, lavender/navy = inside the body, yellow = the keyword and
  "aha" sparkles, red only for the bow and a real alarm beat.

## 8. Do
- One topic and one mechanism per video. Show it on Sakumai (cutaway, anchors), then twist, then a kind loop line.
- Two reliable sources per video in `script.json` "sources", checked for the *exact* claim (journals, universities,
  NIH / NHS / government, major encyclopedias). Say "one study found" or "scientists think" when it's one study or a
  theory, and match numbers to the source.
- Make the viewer feel normal: frame every reaction as the body doing its job.
- Keep romance at crush level: liking someone, holding hands, getting flustered.

## 9. Don't
- No medical advice, diagnosis, treatments, supplements or "you should see a doctor if" lists. Explain, don't prescribe.
- No body shaming, weight, diet, calories, skin "fixes" or comparisons of bodies.
- No sexual content or innuendo. Never sexualise, age up, or put Sakumai in situations a young schoolgirl
  character shouldn't be in.
- No scary claims, gore, injury, self-harm or mental-illness labels on normal feelings.
- No mocking the viewer, no "cringe" jokes at someone's expense. Endings are kind.
- No copying other creators' scripts, shots or frames (borrow a format only). No repeats of our own topics.

## 10. Titles and covers
- **Title = the question the viewer has**, ≤ 50 characters, at most one emoji, no clickbait that the video doesn't
  answer. Good: "Why does music give you chills?" Bad: "You WON'T believe your brain!!"
- **Description:** line 1 the hook in words, then 1 sentence on what you learn (no spoiler of the twist), then the
  sources, then the channel footer. 5-8 tags, 3-5 hashtags.
- **Cover frame:** Sakumai's strongest expression (shock, love, starry) *plus* the cutaway (the glowing heart or
  brain) in one frame, readable at thumbnail size. Never a caption-only frame.

## 11. Voice
Voice: see `channel.json` defaults (and `character.json` "voice"); the owner picks the final one after the bake-off
in `projects/sakumai/_voice-bakeoff/`. Bright, warm, young-adult female; playful but clear; never baby talk.

## 12. Monetization notes
- **Category:** Education. **Made for kids:** no (audience 13+; comments, personalised ads and notifications stay on).
  **Synthetic media:** no (clearly stylised animation; an AI voice on a cartoon needs no disclosure).
- **Ads:** medium RPM. YPP needs 1,000 subscribers plus 10M valid Shorts views in 90 days (or 4,000 watch hours);
  the fan-funding tier unlocks at 500 subscribers. Check YouTube's current numbers before quoting them.
- **Other income:** Sakumai stickers and merch, a Patreon art pack (wallpapers, model sheet, expression stickers),
  and later longer compilations per series. Disclose any affiliate link in the description.
- **Stay authentic:** every script original, researched and sourced; a recurring host with a point of view; the owner
  approves topics and every post. Never batch-post near-identical variants or re-cut the same video ("inauthentic
  content" loses monetization).
