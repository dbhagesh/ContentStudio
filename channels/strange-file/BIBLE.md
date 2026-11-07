# The Strange File: channel bible

**Channel:** The Strange File · **@TheStrangeFile** · YouTube Shorts + Instagram Reels · category Entertainment.
**Host:** the Archivist (`the-archivist`). **Template:** `case-file` (channel-owned). **Narrator:** `bm_fable` x1.0
(provisional, see `projects/strange-file/_voice-bakeoff/README.md`).
Every video for this channel follows this file. When a choice isn't covered here, pick whatever makes the file feel
more like a real, careful, slightly uncanny archive.

## Audience
Adults 18-45 who binge "strange history", unsolved-mystery and true-story Shorts on the commute or in bed. They're
curious rather than morbid. They love a fact they can repeat at dinner ("Boston was flooded with molasses"), they
distrust obvious clickbait, and they read the comments to argue theories. English-speaking, US/UK/Canada/Australia
first. They don't want gore, jump scares or a lecture.

## Promise (what a viewer gets from every video, in one line)
**One real, verified story so strange it sounds made up, opened like a case file and closed in under 45 seconds,
with a twist you'll want to repeat.**

## Voice and tone
- **The narrator is the Archivist.** A calm, intrigued record keeper reading you a file he finds quietly
  astonishing. Low, unhurried, a little dry. He never shouts, never says "insane" or "you won't believe", and never
  laughs at victims.
- **Intrigued, not spooky.** The strangeness does the work. Understatement beats hype: "It was, by every account,
  a very warm day for January" lands harder than "CRAZY weather".
- **Conversational, connected sentences** ("well", "but", "which meant", "and here's the thing"), one sentence split
  into 1-3 cuts. ~95-115 words per 35-40 s. Numbers spoken as the source gives them ("two point three million
  gallons").
- **Second person sparingly:** "Picture a street…", "You'd think…". Once per video at most.
- **Respect:** victims are people, not props. Name the dead only when the record does and it serves the story; give
  the number with weight; never make a death the punchline.
- **Uncertainty is spoken:** "reportedly", "according to the inquiry", "witnesses said", "one theory is…" wherever
  sources disagree or the claim is a legend.

## Hook formulas (the first 2 seconds)
The first line is ≤ 2.6 s, said over an image that is already moving. Pick one:
1. **The flat absurd fact.** State the impossible thing as plainly as a police report.
   "In nineteen nineteen, a wave of molasses swept through the streets of Boston."
2. **The impossible detail.** The one clue that breaks the simple explanation.
   "The ship was found sailing itself, with a meal still on the table."
3. **The number that shouldn't exist.** "Four hundred people danced for weeks, and nobody knew why."
4. **The law on the books.** "In Britain, it's illegal to handle a salmon suspiciously. That's the real wording."
5. **The lost-then-found.** "For five hundred years, a king was missing. Then they checked a car park."
6. **The official who got it wrong.** "Australia sent machine guns to fight birds, and the birds won."
7. **The quiet last line.** Start with the ending, then rewind. "The last entry in the logbook was perfectly
   ordinary. That's the problem."
8. **The object.** Open on one strange piece of evidence and name it. "This is a handwritten note found sewn
   inside a dead man's trouser pocket." (Show only the paper, never the body.)

Never open with "Did you know", "Today we're looking at", a channel intro, or a title card.

## Series
Defined in `series.json` (every video belongs to one):
- **Strange But True** (`strange-but-true`): one documented, absurd-sounding real event. Ends stamped TRUE.
- **Unsolved** (`unsolved`): an open case with no accepted answer. Theories are given fairly, and it ends stamped
  UNSOLVED with a question to the viewer.
- **Weird Laws** (`weird-laws`): a real (or famously fake) law and the story behind it. Statute or official source
  required. Ends stamped STILL LAW / REPEALED / MYTH.
- **Lost & Found** (`lost-and-found`): something lost for decades or centuries and found again. Ends stamped FOUND.

## Story shape (every episode)
1. **Hook** (0-2.5 s): the archive or the evidence, already moving; the hook line.
2. **Date stamp** (by 4 s): when and where, typed on.
3. **Escalation** (3-5 cuts): step by step, each step a piece of evidence, a map or a sepia period scene.
4. **The proof:** the number or document that shows it really happened.
5. **The twist:** the cause, the cover-up, the detail nobody expects.
6. **The close** (last 3-4 s): the Archivist returns, the stamp lands, and a last line that loops back to the hook.

## Look (template, cast, palette, captions)
- **Template:** `case-file` (`channels/strange-file/templates/case-file/STYLE.md`, `style-sheet.png`). Everything is
  under one lamp: a dark desk with manila folders, typed sheets, rubber stamps, redaction bars, sepia polaroids, a cork
  board with red string, lamp-lit parchment maps, and sepia "old photograph" period scenes with film grain.
- **Cast:** the Archivist opens and closes every file (`K.hostScene`, drawn only through `cast('the-archivist')`).
  He never appears inside the period scenes: he's the keeper, not a witness.
- **Palette:** night `#0C0B0A`, desk `#2B1E15`, amber light `#E8A33D`, manila `#C9A86A`, paper `#E6DCC3`, red
  `#B3261E`, cork `#6A4A2E`, sepia `#9E8463`. **Red only for evidence marks** (stamps, string, routes, X, key caption
  word). **Amber only for light.** The past is always sepia.
- **Captions:** FreeMono typed on a strip of label tape, ink with ONE red word, 1-3 words, y 1570.
- **Sound:** `tension` music bed, paper and typewriter-like ticks, soft thuds for stamps, silence before the twist.

## Do
- Verify every claim against two reliable sources (encyclopedias, museums, government and court records, universities,
  major newspapers, peer-reviewed work), checked for that exact claim, and list them in `script.json` "sources".
- Say "reportedly" or "according to …" when sources disagree, and use the conservative number.
- Show consequences through objects and places: a crushed tank, a flooded street map, an empty chair, a stamped file.
- Keep living people out of blame. Name institutions and companies only as the record does ("a court found the
  company liable").
- End every file with a stamp and a last line that makes the viewer replay or comment.
- Treat weird laws accurately: quote real wording, give the year, and say whether it's still in force.

## Don't
- **No gore**, no bodies, no injuries, no blood, no weapons in use. A death is a number, a date and a quiet beat.
- No jump scares, screams or harsh stingers. Uncanny, never frightening.
- No defamation: never accuse a living person, never present a theory as fact, never name private individuals tied to
  unsolved deaths as suspects.
- No invented quotes, no fake documents presented as real ones: our props are clearly stylised reconstructions, and
  their text only paraphrases the record.
- No "debunked" myths told as true (e.g. the "illegal to die in Parliament" law is a myth: if we tell it, the twist
  is that it's a myth).
- No copied scripts, shots or thumbnails from other channels (Simple History, Mystery Recapped and the like): borrow
  the case-file *format* only.
- No near-identical episodes: each file needs a new angle, new evidence and new shots.

## Thumbnails and titles
- **Title ≤ 55 characters**, a curiosity gap that stays honest: the strange fact plus a hint of the twist.
  Good: "Boston Was Flooded With Molasses (Really)", "The Ship That Sailed Itself", "Why It's Illegal to Handle a
  Salmon Suspiciously". Bad: "INSANE Mystery SOLVED?!", or "You Won't Believe…".
- No all-caps titles and at most one emoji (usually none).
- **Cover frame:** the single strangest object on the desk, lamp-lit, with a red stamp or X, and no caption covering it
  (e.g. the dark molasses wave on the map, the empty ship's table polaroid, the stamped law). Pick it with
  `studio frames` and set `thumbOffsetMs` for Reels.
- **Description:** line 1 is the hook in words, then "Sources:" with the two-plus sources, then the channel footer.
- **Hashtags:** 3-5 (#strangehistory #history #truestory plus one topical); `#shorts` is added automatically.

## Monetization notes
- **Ads:** entertainment category, medium-high Shorts RPM for strange-history and mystery content. YPP needs 1,000
  subscribers plus 10M valid Shorts views in 90 days (or 4,000 watch hours). Check the current numbers in YouTube's
  help before quoting them.
- **Stay "authentic":** each episode is an original, researched script with its own evidence and shots, hosted by
  a recurring character with a point of view. Never batch-post templated variants or re-cut an episode.
- **Long-form compilations** ("10 Strange Files from the 1800s", 8-12 min) raise RPM a lot and reuse our own
  research. Series playlists feed them.
- **Sponsorships:** history books, audiobooks, museum passes, documentary streaming. Always disclosed.
- **AI disclosure:** stylised 2D animation with an AI narrator doesn't need the "altered or synthetic" label
  (`syntheticMedia: false`). Revisit if we ever show a realistic depiction of a real person.
- **Made for kids: no.** Adult audience: comments and personalised ads matter.
