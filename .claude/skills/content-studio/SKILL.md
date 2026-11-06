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

## Templates

`studio templates` lists them with what each is for. Today:

| template | for | look |
|---|---|---|
| `deep-dive` (3D) | body / health / science "what happens if…?" | sculpted 3D people, x-ray bodies, journeys through blood vessels |
| `inside-out` (2D) | the same topics, lighter and faster | flat 2D hero, x-ray cutaways, punchy cuts |
| `night-file` (3D) | mysteries, true crime, "this happened in 1971" | dark 3D rooms, one light, case-file inserts |
| `stick-story` (2D) | survival, life hacks, "here's what you do" | stick people, flat rooms, gold step cards |
| `paper-atlas` (2D) | a historical event, "how X happened" | cut paper, parchment maps, date ribbons |
| `tall-tale` (3D) | a funny or clever true story, a con, a loophole | flat cartoon people in a sunny 3D town, one-word captions |

If the topic doesn't point clearly at one, ask once.

## Channels and characters (consistency first)
`studio channels` and `studio characters` list them. A **channel** (`channels/<id>/channel.json`) is a brand: its
cast, default template, voice, music, caption look and publish defaults. A **character** (`characters/<id>/`) is a
permanent cast member with a stable ID; `character.js` is the only code that draws them.

- **When a video is for a channel** (the user names it, or the topic fits its niche), start it with
  `studio new <name> --channel <id>`. That applies the channel's template, voice and look, and pins the cast versions.
  Today: **sakumai** (@SakumaiShorts, cute anime explainers about feelings and the body), cast: **sakumai**.
- **Before planning,** read each cast member's `CHARACTER.md` and look at their `sheet.png`. Plan shots with the
  character's own expressions, poses, outfits and anchors.
- **In shots,** draw cast members only through `cast('<id>').draw({...})` (import `{ cast }` from
  `./core/cast.js`). Never draw a character by hand in shots.js, never copy their code into a project, and never
  change their colours. That's what keeps them identical across every Short.
- **Something a character can't do yet** (a new pose, expression or outfit): add it to `characters/<id>/character.js`
  in their style, then:
  1. Re-render the sheet (`studio character-sheet <id>`) and look at it.
  2. List the new item in `character.json`.
  3. Bump the minor version and add a changelog line.

  Every future video gets it. Changing a character's *look* is a major version bump, and only when the user asks.
- **New channel:** `channels/<id>/channel.json` (copy sakumai's). **New character:** read `references/new-character.md`. Each template folder has `STYLE.md` (the look rules + the kit's
component manual), `style-sheet.png` (the look in one picture) and `example/` (a finished video). **Read the chosen
template's STYLE.md in full and look at its style-sheet.png before planning**: shots can only use what its kit
draws, in its palette.

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
Show: title · the full narration, one line per cut, with its caption chunks (`WHAT IF *YOU | SWALLOW *GUM?`) · the
shot list, one line each (what we see, what moves, which word it lands on) · new kit components you'll add · facts
with their sources. Then ask **"Build it?"** and wait.

**Script rules.** Write the way a person talks to a friend: flowing sentences with connecting words ("well", "where",
"but", "so", "which means"), not caption-like fragments. ~90-110 words per 35 s. **A line is a CUT, not a sentence**:
split sentences into 1-3 lines at natural pauses so the picture changes every 1.5-3.5 s while the voice keeps flowing
(the voice reads each whole sentence in one pass, then finds the cuts). Shape: hook question → escalation → a myth or
surprise → a twist → a punchy last line that loops. Write numbers as spoken ("seven"). Original writing only: borrow a
format, never another creator's script, shots or frames. Check every fact against a reliable source and list them in
`script.json` "sources". Health topics: accurate, no gore, no scary misinformation.

## 3. Build
1. `studio new <template> <name> --title "…"` → `projects/<name>/` (a copy of the template's example, so it renders
   immediately). Only `script.json` and `src/shots.js` change per video.
2. Write `script.json` (lines + `caps` + gaps; format in STYLE.md).
3. Timing: `studio build <name> --only timing` (AI voice) · `--timing audio:their.m4a` (own recording) ·
   `--timing estimate` (captions only). It writes `data/lines.json` + `data/words.json`.
4. Rewrite `src/shots.js`: one shot per line (two for long lines), each starting at `cut(i)`, key moments on words
   with `Wd('word', line)`, sound with `cue(t, type)` (`studio effects` lists the types). Reuse the template kit
   (`templates/<t>/src/core/`); add new components there in the template's look, so later videos get them too.
5. `studio build <name> --from check` runs check (must say CHECK OK) → cues → mix → review sheet → MP4 in
   `renders/<name>.mp4`. While iterating on one shot: `studio frames <name> "4.2,4.6"` and look at the frames.
   `studio preview <name>` plays it in a browser with sound.

## 4. QA: never show a frame you haven't looked at
Read `review/all.jpg` (a time-stamped frame every 0.5 s), then key frames full size. For every frame:
- **Makes sense?** One visual mode per shot (an x-ray body is x-ray everywhere). Props move with whatever holds them.
  Nothing appears before its cause.
- **Matches the narration?** The picture changes just before its line; reveals land on their word.
- **Collisions?** Moving things never cross labels, the caption zone (y ≈ 1250-1550) or each other by accident.
- **Captions:** 1-3 words, one highlighted word, spelled right, on the word being said, readable on a phone.
- **Style:** only the template's palette and shapes (its STYLE.md).
- **Sound:** voice clear over the music; effects soft.
Fix, rebuild from the step that changed (`--from check` after shot edits, `--from mix` after cue-only edits), re-check.
Tell the user what you caught and fixed.

## 5. Deliver
Open the MP4 (`open projects/<name>/renders/<name>.mp4`). Also give: `studio share <name>` if it's over ~35 MB, the
best cover frame (`studio frames`), a title, a caption and 5-8 hashtags. Own-recording mode: give the script with each
line's timing to read against. Offer one round of precise changes and rebuild only from the step that changed.

## 6. Publish (YouTube, Instagram), only when the user asks
Read `references/publishing.md` and follow it exactly. In short:
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
- New sounds or music: drop a Python file in `templates/<t>/audio/` or `projects/<name>/audio/` (see
  `references/new-template.md` → Sound).

## Never
Generate images or video with AI; spend money or credits; upload or post without the user asking and confirming;
copy another creator's script, shots or frames; overwrite a project without asking; ship a frame you haven't looked at.
