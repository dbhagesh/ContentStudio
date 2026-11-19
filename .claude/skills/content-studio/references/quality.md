# The quality bar

No video ships below this bar. `studio lint` checks what a program can check (metadata, sources, captions, pace,
hook length, originality, and in every frame: text cut off by the frame edge, text over the captions or over other
text). This rubric covers what it can't. Score every pilot and every first video of a new
series. Anything under 4/5 on a line gets fixed and rebuilt before the user sees it.

## 1. Hook (the first 2 seconds decide everything)
- The first line is a question or claim the viewer *feels* ("Why does your face turn red when…"), not a topic
  label ("Today: blushing").
- The first frame already shows something moving and readable, never a blank or title card.
- There is a reason to keep watching by 3 s: a mystery, a stake, a promise of a twist.

## 2. Story shape
Hook → escalation → surprise or myth-bust → twist → a last line that pays off and loops back to the hook. Every line
earns its place: cut any line that only restates. Fiction (manga): every episode ends on a cliffhanger, and every
arc on a payoff.

## 3. Truth
Every factual claim has a reliable source in `script.json` "sources" (journals, universities, government, major
encyclopedias, established outlets), checked for *that exact claim*. Numbers are spoken the way the source says
them. Health: no advice or diagnosis. Money: education, never personal advice. History: "reportedly" or "according
to" where sources disagree.

## 4. Picture
- One idea per shot, and the picture changes every 1.5-3.5 s.
- Key reveals land on their word.
- Characters stay on-model (only through `cast()`).
- Template palette only.
- No collisions with the caption zone, labels or each other (lint catches text against text and the frame edge;
  pictures against text are for your eyes).
- Readable at phone size: check the contact sheet at 25% zoom.

## 5. Captions
1-3 words, at most one highlight per chunk, on the word being spoken, spelled exactly as said, never covering a
face or the key object.

## 6. Sound
The voice is clear above the music (music ducks under speech), effects support the action and never startle, and
there's no clipping. A speaker change in dialogue is obvious from the voice alone.

## 7. Packaging
- Title ≤ 55 characters that makes the viewer curious without lying.
- Description: hook line, sources, footer.
- The cover frame shows the clearest emotion or the strangest object.
- The video belongs to a series in `series.json`.

## 8. Originality
- Our own writing, angle and visuals.
- Borrow only a *format*, never another creator's script, shots or frames.
- `lint` blocks repeats within a channel. Also never reuse a topic another of our channels covered the same month.

## Review routine (every build)
1. `studio build <channel>/<ep>`: `lint` must say LINT OK (script and picture rules), and `check` CHECK OK.
2. Read `review/all.jpg`, then key frames full size (`studio frames`).
3. Score sections 1-8. Fix anything under 4, then rebuild from the step that changed.
4. Tell the user what you caught and fixed.
