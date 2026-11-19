---
name: content-studio
description: Make narrated faceless videos (YouTube Shorts, TikToks, Reels, explainers, animated stories) in this ContentStudio folder, fully in code on this Mac with a free local AI voice, word-synced captions and 2D/3D animation, rendered to MP4, and publish them to YouTube and Instagram on request. Use it whenever the user wants a short or video made, a what-if / what-happens-if explainer, a Zack D. Films style 3D short, a mystery or true-crime short, a stick-figure survival story, a history short, a funny true story, a new video type or animation template, changes to a video already in projects/, or an upload to YouTube, even when they only give a topic. Prefer this over the global faceless-shorts skill whenever the working directory is ContentStudio.
---

# ContentStudio

A local, template-driven video studio. A **template** is a video style (look, kit of animated components, caption
look, music); a **project** is one video made from a template. Everything renders from code with free local models:
Kokoro voice, Whisper word timing, three.js / canvas pictures in headless Chrome, numpy sound, ffmpeg. No AI images or
video, no API keys, no credits.

Run everything from the ContentStudio folder as `node bin/studio.mjs <command>` (written `studio` below).
`studio help <command>` explains any command. Architecture and file map: `README.md` (read it when changing the
engine or the CLI, not for an ordinary video).

## Lean by default (tokens are spent on judgment, not on reading or boilerplate)
- **One video per session.** Don't carry several videos or channels in one conversation; `studio status` tells a fresh
  session where things stand.
- **Routine episode** (an established series): `studio brief <…> --compact` prints the channel's BRIEF.md digest in
  place of the BIBLE and skips the images and the rubric, leaving the template's STYLE.md and the cast to read.
  **Pilot, new series, new template, kit or character work:** the full brief, and read everything it lists.
- **Shots in code, written lean:** draw with the template's kit; edit `src/shots.js` with targeted edits, never by
  rewriting the whole file; iterate on one shot with `studio frames` rather than full rebuilds.
- **Look at little, well:** lint already catches clipped and overlapping text. Read the contact sheet, then full-size
  frames only where lint, check or the sheet point at a problem. `studio build` prints one line per step; `--verbose`
  only to debug a tool.
- **Model per step:** writing a pilot, a new series, new kit components or characters needs the strongest model.
  Routine episodes of an established series can run on a mid-size model, and status, backlog, metadata and publishing on a small one.
  Never trade quality for tokens: if a cheaper model misses the bar, redo the step with a stronger one.

## Channels first (never mix them)
The studio is generic code; **all channel content lives in the workspace**, a separate folder outside the studio
(`studio doctor` prints its path; set by "workspace" in studio.config.local.json or $STUDIO_WORKSPACE). Paths below
like `channels/` and `projects/` are inside the workspace. Never put channel content in the studio folder.

The studio runs many channels. **Every video belongs to exactly one channel**, and each channel is a self-contained
folder: `channels/<id>/` holds `channel.json`, `BIBLE.md`, `series.json`, `backlog.json`, and its own `templates/`,
`characters/` and `audio/`. Its videos live in `projects/<id>/`. `studio channels` lists them.

0. **Where things stand:** `studio status` (or `--channel <id>`) shows every video's stages (script → timing → shots →
   cues → mix → sheet → render → posted) and the next command for each. Pick up unfinished work before starting new.
1. **Pick the channel.** Use the one the user names, or the one whose BIBLE fits the topic. If two fit, ask once.
2. **Brief, then read in its order.** `studio brief --channel <id> --episode <ep>` (or `studio brief <project>` for a
   video that exists; add `--compact` for a routine episode, see above) prints the episode, series, template, cast,
   voice and the quality rules, then the files to read. **Read every file it lists, in full, in that order, before
   planning.** The full brief lists:
   1. the channel's `BIBLE.md` (audience, promise, tone, hook formulas, series, do / don't: every choice follows it)
   2. the template's `STYLE.md`, and look at its `style-sheet.png`
   3. each cast member's `CHARACTER.md`, and look at their `sheet.png`
   4. `references/quality.md` (the bar the video is scored against)
   5. for an existing video: its `script.json` and `src/shots.js`
3. **Use only what the channel owns or lists.** Its own templates and the shared ones in `channel.json` "templates",
   and its own cast. The studio refuses anything else; never work around that.
4. **Start from the backlog.** `studio backlog --channel <id>` shows each episode as idea → making → rendered → posted.
   Begin with `studio new --channel <id> --from-backlog <episode>`. A new idea goes in first with `studio backlog-add`.
5. **A new channel:** ask the user what to name it (offer 3 options; never pick the name yourself). Then
   `studio channel-new <id> --name "…" --handle @…`, fill every section of its BIBLE before the first episode, then
   its BRIEF.md digest (≤ 400 words, every hard rule kept). Its profile picture: `"brand": { "avatar": {…} }` in
   channel.json (the mascot by its own code, or the channel's own `brand/avatar.js` mark), `studio avatar --channel
   <id>`, and look at `brand/avatar-preview.png` (the circle the platforms crop to) before giving it to the user.
   When BIBLE.md changes, update BRIEF.md too (the compact brief warns when it is older).

Shared templates (`studio templates`; a channel's own ones say "channel X only"):

| template | for | look |
|---|---|---|
| `deep-dive` (3D) | body / health / science "what happens if…?" | sculpted 3D people, x-ray bodies, journeys through blood vessels |
| `inside-out` (2D) | the same topics, lighter and faster | flat 2D hero, x-ray cutaways, punchy cuts |
| `night-file` (3D) | mysteries, true crime, "this happened in 1971" | dark 3D rooms, one light, case-file inserts |
| `stick-story` (2D) | survival, life hacks, "here's what you do" | stick people, flat rooms, gold step cards |
| `paper-atlas` (2D) | a historical event, "how X happened" | cut paper, parchment maps, date ribbons |
| `tall-tale` (3D) | a funny or clever true story, a con, a loophole | flat cartoon people in a sunny 3D town, one-word captions |

The brief's read list includes the chosen template's STYLE.md and style-sheet.png: shots can only use what its kit
draws, in its palette. Each template folder also has `example/` (a finished video).

**Blender plate templates (optional):** a template whose projects carry `blender/scene.py` renders its picture in
Blender (README → "Blender plates"). `studio build` adds a `plate` step after `timing` for those projects only.
Look-dev with draft stills before the full plate, check every still, and keep each frame a pure function of time
(`studio3d`). Channel set/cast libraries live in the template's `blender/` folder; models stay in the channel's
`assets/` with `SOURCES.md`.

## Characters (consistency first)
A **character** is a permanent cast member with a stable ID: shared in `characters/<id>/`, or a channel's own in
`channels/<ch>/characters/<id>/`. `character.js` is the only code that draws them.

- **Before planning** (they're in the brief's read list), read each cast member's `CHARACTER.md` and look at their
  `sheet.png`. Plan shots with the character's own expressions, poses, outfits and anchors.
- **In shots,** draw cast members only through `cast('<id>').draw({...})` (import `{ cast }` from
  `./core/cast.js`). Never draw a character by hand in shots.js, never copy their code into a project, and never
  change their colours. That's what keeps them identical across every video.
- **Voices:** a script line with `"speaker": "<character id>"` is spoken in that character's voice (from
  `character.json` "voice", overridable in channel.json "voices" or script.json "speakers"). Lines without a speaker
  use the narrator (script "voice"). Dialogue: one speaker per line, and a speaker change starts a new sentence.
- **Something a character can't do yet** (a new pose, expression or outfit): add it to their `character.js` in their
  style, then:
  1. Re-render the sheet (`studio character-sheet <id>`) and look at it.
  2. List the new item in `character.json`.
  3. Bump the minor version and add a changelog line.

  Every future video gets it. Changing a character's *look* is a major version bump, and only when the user asks.
- **New character:** read `references/new-character.md`. **New template:** read `references/new-template.md`.

## First use on this computer
`studio doctor` must print **All set**. If not, `studio setup` (Python env + ~0.9 GB of free models, all inside
`.studio/`; asks nothing that needs a password) and fix what doctor names. `studio selftest` proves every template
renders (≈ several minutes; `--no-voice` skips the models).

## 1. Intake (one message, defaults filled in)
Ask only what's unknown, all at once: topic (or "pick 3 ideas"), a short whose *format* they like (optional), length
(default ~30-40 s), voice (`studio voices`; the template's default otherwise), voiceover: **AI voice** (default) ·
**their own recording** (after they see the script) · **captions only**, music (template default · none · their own
royalty-free file), end line / handle. "Just go" means the defaults.

## 2. The plan (one screen, then wait for "build it")
1. `studio new --channel <id> --from-backlog <episode>` (or `studio new <name> --channel <id>`) →
   `projects/<id>/<name>/`, a copy of the template's example, so it renders immediately. Only `script.json` and
   `src/shots.js` change per video. Refer to it as `<id>/<name>` in every command.
2. Write `script.json`: lines + `caps` + gaps (format in STYLE.md), a `speaker` on dialogue lines, a `"shot"` on every
   line, and the post words: `title`, `description` (1-2 sentences on what the viewer learns, no spoilers), 5-8
   `tags`, and `sources`. The shot is a note: what we see, what moves, which word it lands on.
3. `studio plan <id>/<name>` prints the plan screen: channel + series · title · length · every cut with its timing
   (≈ estimated until the voice exists), caption chunks and shot · sources · the script rules. Fix every SCRIPT RULES
   error and re-run it.
4. Show the user that screen, plus any new kit components you'll add. Then ask **"Build it?"** and wait.

**Script rules.** Write the way a person talks to a friend: flowing sentences with connecting words ("well", "where",
"but", "so", "which means"), not caption-like fragments. ~90-110 words per 35 s. **A line is a CUT, not a sentence**:
split sentences into 1-3 lines at natural pauses so the picture changes every 1.5-3.5 s while the voice keeps flowing
(the voice reads each whole sentence in one pass, then finds the cuts). Shape: hook question → escalation → a myth or
surprise → a twist → a punchy last line that loops. Write numbers as spoken ("seven"). Original writing only: borrow a
format, never another creator's script, shots or frames. Check every fact against a reliable source and list them in
`script.json` "sources". Health topics: accurate, no gore, no scary misinformation.

## 3. Build
The project and its `script.json` already exist from the plan (changes the user asked for go into the script first).
1. Timing: `studio build <id>/<name> --only timing` (AI voice) · `--timing audio:their.m4a` (own recording) ·
   `--timing estimate` (captions only). It writes `data/lines.json` + `data/words.json`.
2. Rewrite `src/shots.js`: one shot per line (two for long lines), each starting at `cut(i)`, key moments on words
   with `Wd('word', line)`, sound with `cue(t, type)` (`studio effects` lists the types). Reuse the template kit
   (`templates/<t>/src/core/`); add new components there in the template's look, so later videos get them too.
3. `studio build <id>/<name> --from lint` runs the quality gate (must say LINT OK; read every warning too) → check
   (must say CHECK OK) → cues → mix → review sheet → MP4 in `renders/<name>.mp4`. While iterating on one shot: `studio frames <id>/<name> "4.2,4.6"` and look at the frames.
   `studio preview <id>/<name>` plays it in a browser with sound.
   The gate's picture rules draw every frame and stop the build on text cut off by the frame edge, or text over the
   captions or other text, lasting 1 s or more (0.5 s is a warning). `studio lint <id>/<name>` runs the gate alone, any
   time (`--no-picture`: the script rules only, instantly).

## 4. QA: never show a frame you haven't looked at
The bar is `references/quality.md`: score the video against it and fix anything under 4/5 before the user sees it.
Read `review/all.jpg` (a time-stamped frame every 0.5 s), then key frames full size. For every frame:
- **Makes sense?** One visual mode per shot (an x-ray body is x-ray everywhere). Props move with whatever holds them.
  Nothing appears before its cause.
- **Matches the narration?** The picture changes just before its line; reveals land on their word.
- **Collisions?** Moving things never cross labels, the caption zone (y ≈ 1250-1550) or each other by accident. Lint
  catches text cut off by the frame and text over text; you still look for pictures colliding with text or each other.
- **Captions:** 1-3 words, one highlighted word, spelled right, on the word being said, readable on a phone.
- **Style:** only the template's palette and shapes (its STYLE.md).
- **Sound:** voice clear over the music; effects soft.
Fix, rebuild from the step that changed (`--from check` after shot edits, `--from mix` after cue-only edits), re-check.
Tell the user what you caught and fixed.

## 5. Deliver
Open the MP4 (`open projects/<id>/<name>/renders/<name>.mp4`). Also give: `studio share <id>/<name>` if it's over ~35 MB, the
best cover frame (`studio frames`), a title, a caption and 5-8 hashtags. Own-recording mode: give the script with each
line's timing to read against. Offer one round of precise changes and rebuild only from the step that changed.

## 6. Publish (YouTube, Instagram), only when the user asks
Read `references/publishing.md` and follow it exactly (and `references/monetization.md` when setting up a channel's
publish settings or answering how a channel earns). In short:
1. `studio publish <project> --to youtube,instagram` is a dry run that shows exactly what would be posted.
2. Confirm the title, caption, visibility and category with the user.
3. Post with `--yes`.

It goes straight to the official APIs with the channel's own credentials (`studio accounts` / `studio connect`).
Never post or host anything without the user asking and confirming.

## Customising
- One video only: put overrides in its `project.json` → `"overrides"` (e.g. `{"captions": {"y": 1300}}`,
  `{"player": {"seed": 7}}` to re-roll random details), or copy any engine/template file into the project at the same
  path to change it for that video alone.
- A whole video type: edit the template (`templates/<t>/template.json`, its kit, its STYLE.md).
- A **new video type / animation style**: read `references/new-template.md`.
- New sounds or music: drop a Python file in `templates/<t>/audio/` or `channels/<id>/audio/` (the whole channel) or `projects/<id>/<name>/audio/` (see
  `references/new-template.md` → Sound).

## Never
Generate images or video with AI; spend money or credits; upload or post without the user asking and confirming;
copy another creator's script, shots or frames; overwrite a project without asking; ship a frame you haven't looked at;
use one channel's template, character or project for another channel; name a channel without asking the user;
post near-identical variants (YouTube demonetizes mass-produced content).
