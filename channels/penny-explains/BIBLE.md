# Penny Explains: channel bible

Every video for this channel follows this file. Read it in full before planning an episode.

## Audience
18-35, mostly in the US (some UK, Canada, Australia). First jobs, first credit card, first apartment, a banking app
on the phone and a vague feeling that money is a game whose rules nobody explained. They are smart and busy, they
distrust "finance bros", and they hate being lectured. They watch on a phone, often with the sound on low, so the
picture and captions must carry the idea alone.

## Promise (what a viewer gets from every video, in one line)
In under 60 seconds, Penny shows you one way money really works, or one way a company makes money from you, so you
can never un-see it.

## Penny, the host
Penny is a calico cat (white, ginger and black patches, green eyes, a gold coin pendant on a teal collar). She is:
- **Sly:** she already knows how the trick works and enjoys the reveal ("Oh, they're good.").
- **Witty, a little smug:** half-lidded eyes, one raised brow, a slow grin before a punchline. Never mean to the viewer.
- **On the viewer's side:** the smugness points at the company, never at the person who fell for it. "It's not
  you. It's designed."
- **A cat:** she counts on her paws, bats coins off the desk, and treats money like a toy she has figured out.
Penny narrates every video in her own voice (character.json "voice"). She speaks to one person, as "you".

## Voice and tone
Talks like a clever friend at a kitchen table, not a teacher at a whiteboard. Short sentences, real numbers, one joke
per video at most, and the joke is always on the business model. Never fear-mongering, never preachy, never "you're
doing money wrong".

Example lines (tone, not script):
- "Fifty-five of your eighty-five dollars? That's just rent for the debt."
- "Zero percent interest. So who's paying? Oh, someone is always paying."
- "It's not a free trial. It's a bet that you'll forget."
- "Your brain reads four ninety-nine as four. The store knows that. Now so do you."
- "Same snack. Same price. Less snack."
- "The minimum isn't a plan. It's their business model."

Write numbers the way people say them ("twenty-two percent", "about fifteen years"). Round only when the source
rounds, and say "about" when you do.

## Hook formulas (the first 2 seconds)
1. **The suspicious kindness:** "Why does [company] WANT you to [thing that sounds good for you]?"
   "Why does your credit card want you to pay the minimum?"
2. **The who-pays:** "[Thing] is free / zero percent. So who's paying?"
   "Buy now, pay later charges zero interest. So who's paying?"
3. **The shock number:** "This [small thing] costs you [big number]."
   "This penny cost almost four cents to make."
4. **The myth stated as fact:** "Everyone thinks [belief]. [Contradiction]."
   "Everyone thinks banks lend out your savings. They don't even need them."
5. **The brain glitch:** "Your brain reads [X] as [Y]. Here's why stores love that."
   "Four ninety-nine is basically five. So why does your brain read it as four?"
6. **The counting-on-you:** "[Business] is counting on you to [not do something]."
   "Your gym is counting on you NOT coming."
7. **The magic number:** "There's one number that tells you [useful thing]."
   "There's one number that tells you when your money doubles."
8. **The impossible business:** "How does [company] make billions from [thing it gives away]?"
   "How does an airline earn billions from miles it gives away?"

The first frame already shows the thing (the card, the receipt, the price tag) moving, with Penny reacting. Never a
title card, never "Today we'll talk about".

## Story shape (every episode)
Hook (a question the viewer feels) → the setup with one concrete example (real numbers) → follow the money, step by
step, one picture per step → **the trap reveal** (red, the moment the mechanism clicks) → the number that hurts (a
precise, sourced chart or counter) → the twist or comparison (before / after) → Penny's last line, smug and short,
that loops back to the hook. 30-50 s, ~100-130 words, a cut every 1.5-3.5 s.

## Series
See `series.json`. Four recurring formats:
- **How They Make Money From You** (`how-they-make-money`): the hidden money machine behind an everyday product.
- **Money Myths** (`money-myths`): a common belief busted with one chart.
- **The Math Of…** (`the-math-of`): one number worked out on screen, calculator and counters.
- **Rich People Tricks, Explained** (`rich-tricks`): legal, well-known moves of the wealthy and big companies,
  explained neutrally. Penny wears her `fancy` outfit (monocle) in this series only.

Every episode belongs to exactly one series. Keep a ratio of roughly 2 : 1 : 1 : 1 (How They Make Money is the
flagship).

## Look (template, cast, palette, captions)
- **Template:** `money-desk` (this channel's own): flat 2D, graph-paper desk scenes, precise animated charts,
  counters, coins, bills, receipts, price tags, calculator, red trap reveals and before / after cards. Read
  `templates/money-desk/STYLE.md` before planning.
- **Cast:** `penny` only. Drawn only through `cast('penny')`. Her `banker` outfit (green visor) for The Math Of…,
  `fancy` (monocle) for Rich People Tricks, `classic` everywhere else.
- **Palette:** paper cream `#FBF5E9`, ink `#1D1B26`, money green `#1FA463`, coin gold `#F5B83D`, trap red
  `#E5483B`, data teal `#2A7F9E`. Green = money you keep, red = money they take, gold = the key number. One
  idea per colour, never decorative.
- **Charts are evidence:** every chart is drawn from data, labelled (axis, units, values) and readable at phone
  size. Never a decorative "line goes up". If a number is shown, it is the sourced or computed number, exactly.
- **Captions:** Inter Black, 1-3 words, white with ink outline, ONE gold word per chunk (`highlight #FFC93C`).
  Money amounts as numerals in caps ("$85", "22%"), spoken as words in the narration.

## Do
- Use one concrete example with real numbers per video ("$3,000 at 22%"), state the assumptions on screen (a small
  "assumes…" footnote label), and show the math.
- Verify every number against two reliable sources (central banks, government agencies such as the SEC, CFPB, FCA,
  BLS, the Fed, Bank of England; major outlets; textbooks; peer-reviewed papers). List them in `script.json` sources.
- Explain the mechanism (who earns what, when), not just the outcome.
- Keep Penny on the viewer's side: the punchline lands on the business model.
- Make it US-first, but say "in the US" when a rule is American, and prefer mechanisms that are true everywhere.
- Put the light disclaimer in every description (below) and, when a video compares choices, a 1-second on-screen
  label "for education, not advice" (`K.footnote`).

## Don't
- **No personal financial advice.** Never "you should buy / sell / invest in X", never a ticker, a fund, a coin or a
  product recommendation, never "do this with your money". Compare mechanisms and show math; let the viewer decide.
- No crypto shilling, no get-rich-quick, no "passive income" promises, no affiliate pitches inside the video.
- No fear-mongering ("the dollar is about to collapse"), no politics, no conspiracy framing. Neutral on parties.
- No made-up or rounded-for-drama numbers. If a source says 3.69 cents, it's "almost four cents", not "five".
- No naming-and-shaming of a company unless a regulator's public finding says so (e.g. an SEC order), and then cite it.
- No mocking people for being in debt.
- Never draw Penny any other way than `cast('penny')`; never change her colours.

### The light disclaimer
Every description ends with: "Penny explains how money works. This is education, not financial advice." (It is in
the channel footer.) In the video, never a disclaimer slide; a small footnote label only when two choices are
compared side by side.

## Thumbnails and titles
- **Title:** ≤ 55 characters, the question or the shocking number, in plain words. Curious, never a lie, no clickbait
  the video doesn't pay off. One emoji at most (usually none). Examples: "Why Your Card Wants You to Pay the Minimum",
  "Why Prices End in .99", "The Penny That Cost Almost 4 Cents".
- **Cover frame:** Penny's strongest expression (shock, smug grin or facepalm) next to the one object of the video
  (the card, the receipt, the red trap), plus one big number in gold. Pick it with `studio frames` and check it
  at thumbnail size.
- **Description:** line 1 = the hook in words; then 1-2 sentences of what you'll learn (no spoiler); then sources;
  then the footer.

## Monetization notes
- Finance has the highest ad RPM on YouTube; the channel's value depends on staying clearly educational and
  trustworthy. Category: Education. Not made for kids (18-35 audience). No synthetic-media disclosure (stylised
  animation; an AI voice narrating a cartoon doesn't require it).
- **Sponsors** (finance apps, budgeting tools, education platforms) must always be disclosed: YouTube's "includes paid
  promotion" box ticked, and "Sponsored by …" said in the video and written in the description's first lines. A
  sponsor never changes a fact, never gets a recommendation ("the best app"), and never appears in the Money Myths or
  How They Make Money episodes about its own industry.
- Affiliate links: only in `publish.links`, always labelled "affiliate link" (FTC + YouTube rules). None for now.
- Later income: a weekly "Penny's Receipt" newsletter, long-form compilations per series (higher RPM), Penny merch.
- Never post near-identical variants, never re-cut one video into two: every episode is a new idea and new writing
  (YouTube's "inauthentic content" policy).
