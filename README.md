# ContentStudio

A local, template-driven video studio. Narrated faceless videos (Shorts, TikToks, Reels, explainers) made entirely in
code on this computer: script → free local AI voice → word-synced captions → 2D/3D animation drawn in code → procedural
sound and music → MP4. No AI images or video, no API keys, no credits. Publishing to YouTube and Instagram is optional and uses their official APIs.

Migrated from the `faceless-shorts` Claude skill and refactored into a modular studio: one shared engine, plug-in
templates, layered configuration, a command-line tool and tests.

## Quick start

```bash
node bin/studio.mjs doctor                      # what's installed ("All set")
node bin/studio.mjs setup                       # once: Python env + free voice/Whisper models, all inside .studio/
node bin/studio.mjs channels                    # the channels (each one a self-contained folder)
node bin/studio.mjs status                      # every video: which stages are done, and the next command
node bin/studio.mjs backlog --channel <id>       # its episode ideas and where each one is
node bin/studio.mjs brief --channel <id> --episode <episode>   # what to know, and the files to read in order
node bin/studio.mjs new --channel <id> --from-backlog <episode>
#   …write <workspace>/projects/<id>/<episode>/script.json…
node bin/studio.mjs plan <id>/<episode>         # the plan screen: cuts, captions, shots, timing, script rules
#   …write src/shots.js…
node bin/studio.mjs build <id>/<episode>        # voice → timing → lint → check → cues → mix → review sheet → MP4
```

With Claude Code in this folder, just ask ("make a Deep Dive short about cracking your knuckles"). The project skill
`.claude/skills/content-studio/` (local to this folder only) runs the whole workflow, including QA and publishing.

Needs: Node.js 22+, ffmpeg, Google Chrome, Python 3.10+ (for the env). `npm link` makes `studio` a global command.

## Studio and workspace

The studio (this repo) is generic code: engine, CLI, shared template styles, the workflow skill and tests. Nothing in
it names a real channel; behaviour comes from configuration and templates. **Your channels live in a separate
workspace folder** that the studio reads:

- **Default location:** `../ContentStudio-workspace`, next to the studio.
- **Override:** set `"workspace": "/path"` in `studio.config.local.json`, or `STUDIO_WORKSPACE`.
- **Create one:** `studio workspace-init`. `studio doctor` shows the path in use.
- **Another computer:** clone the studio, copy or clone the workspace next to it, then run `studio setup`.

```
<workspace>/
  channels/<id>/     every channel (below)
  characters/<id>/   characters shared by several channels      templates/<id>/   templates shared by several channels
  projects/<channel>/<episode>/   the videos
```

## Channels (the unit the studio scales by)

A channel is one self-contained folder. Adding the n-th channel is `studio channel-new <id> --name "…"`; no shared
code changes, and nothing in one channel's folder is visible to another.

```
channels/<id>/
  channel.json     name, handle, cast, shared templates it may use, defaults (template, voice, music, caption look),
                   voices (per speaker), quality (lint thresholds), publish (targets, tags, footer, links, per platform)
  BIBLE.md         audience, promise, tone, hook formulas, series, look, do / don't, titles, monetization
  BRIEF.md         a ≤ 400-word digest of the bible for routine episodes (studio brief --compact)
  brand/           avatar.png, its profile picture (studio avatar; channel.json "brand.avatar")
  series.json      recurring formats        backlog.json   episode ideas (status is read from what exists)
  templates/<t>/   templates only this channel uses
  characters/<c>/  characters only this channel uses
  audio/           its own music and stings
projects/<id>/<episode>/   its videos
```

**No mixing, enforced:** a channel can't use another channel's template or character (refused when creating, loading
or validating), the renderer serves only the video's own cast, credentials are per channel, and the originality
check compares a script only with its own channel's videos.

## Characters

Characters are permanent, reusable cast members with stable IDs: shared ones in `characters/<id>/`, a channel's own in
`channels/<ch>/characters/<id>/`.

```
<id>/   character.json (id, version, palette, expressions, poses, outfits, voice) · character.js (the only
        drawing code) · CHARACTER.md (the bible) · sheet.png (model sheet, rendered from the code) · refs/
```

- `studio new <name> --channel <id>` makes a video with the channel's template, voice and look, and pins its
  cast versions in `project.json`.
- **Voices:** a script line's `"speaker"` speaks in that character's voice (character.json `voice` < channel.json
  `voices` < script.json `speakers`). Engines: `kokoro` (built in), `voicestudio` and `http` (any local server with
  the OpenAI-compatible speech API).
- Shots draw a character with `cast('<id>').draw({ x, y, s, pose, expression, outfit, xray, t, talk })`.
- Characters are served read-only from the library, so a project can't change how they look.
- Improving a character means editing it in the library and bumping its version. `studio check` notes when a project
  was made with an older version.
- `studio characters`, `studio channels` and `studio character-sheet <id>` list, validate and render them.

## Optional tools (`third_party/`, git-ignored, local to this folder)

Cloned from GitHub and built here; `studio doctor` shows whether they're ready.

**VoiceStudio** (AGPL-3.0, used only through its local API) gives higher-quality voices and voice design.
- **Start the backend:** `cd third_party/VoiceStudio && bun run dev:api` (headless, `http://127.0.0.1:3900`), or open
  the app with `bun run dev`.
- **Installed models (both Apache-2.0):** VoxCPM2 8-bit (active, 48 kHz, voice design and cloning) and Qwen3-TTS
  VoiceDesign. They run through the `mlx-audio` engine on the Apple GPU.
- **Licence warning:** don't use VoiceStudio's default engine **OmniVoice**. It is CC-BY-NC (non-commercial) and
  monetized channels can't use it. The studio's `voicestudio` provider always asks for `mlx-audio` and refuses
  `omnivoice`.
- **Giving a character a designed voice** (in `character.json`, or in a channel's `voices`):
  `"voice": { "engine": "voicestudio", "id": "default", "description": "young female, warm, bright, playful", "seed": 7 }`.
  The seed keeps the voice identical in every video.
- **Telemetry:** analytics consent is asked by the app on first launch; leave it off if you prefer.

**Hyperframes** (HeyGen, Apache-2.0) is HTML-to-video rendering with a catalog of transitions, charts and captions.
- **CLI:** `node third_party/hyperframes/packages/cli/bin/hyperframes.mjs` (`init`, `catalog`, `add`, `render`, `doctor`).
- **Telemetry:** disabled (`hyperframes telemetry status`).
- It renders separately from the studio's engine for now; integrating it as a second renderer is a planned step.

Tools installed for these: `bun` and `uv` (Homebrew).

**Blender plates (optional, opt-in per project).** For film-quality 3D (real rigged models, HDRI light, ocean, cloth,
depth of field, motion blur), a project can carry `blender/scene.py`. Only such projects get an extra `plate` step after
`timing`: Blender renders the film frames (`plate/frames/*.jpg` + `plate/plate.json`, timed to the narration), and the
template's `src/shots.js` draws them under the captions with `plateFilm()` from `engine/src/core/plate.js`. Every other
project runs exactly the usual steps.
- **Install:** `brew install --cask blender` (or set `render.blender` / `$BLENDER` to the binary).
- **Studio side:** `blender/boot.py` (entry, puts the template's and project's `blender/` folders on `sys.path`) and
  `blender/studio3d.py` (timing, actors with blended clips, paths, camera cuts/moves/shake, HDRI + sun, ocean, cloth
  baking, `render_plate`). Everything that moves is a pure function of film time.
- **More motion and sets:** `retarget()` bakes clips from an animation library rig (shared T-pose) onto a model's rig;
  `group()` + `stages()` build several sets (locations) in one scene and show one at a time, with `world_hdris()`
  switching the sky; `split_mesh()` cuts a part off a model to hinge it (a lid); `Spray` throws bits (sand, water).
- **2D actors in 3D sets (2.5D):** `s3.Anchor(name, height, shadow=r, proxy=True)` marks where a drawn character's
  feet stand (keyed like the camera); `render_plate` projects it every frame into plate.json `actors` (film px, px per
  metre, depth, depth-of-field blur; maths in `blender/projection.py`), and the template draws the character there with
  `actorAt(name, t)` from `plate.js`. `cam.focus(t, point)` keys a rack focus. Optional soft contact shadow and an
  invisible stand-in that casts the character's shadow into the set.
- **Look-dev:** run `boot.py` with `"stills": [t, …]` and `"draft": true` to render only a few times at half size;
  add `"view": [[x, y, z], [look x, y, z], lens]` to look from a free camera instead of the film's.
- **Assets:** downloaded models stay in the channel's workspace folder with their licences in `assets/SOURCES.md`.

## Commands (`studio help <command>` for details)

| group | commands |
|---|---|
| projects | `templates [--validate]` · `new <name> --channel <id>` · `new --channel <id> --from-backlog <ep>` · `new <template> <name>` · `list [--channel <id>]` |
| workflow | `status [--channel <id>] [--all]` · `brief --channel <id> [--episode <ep>] [--compact]` · `brief <project>` · `plan <project>` |
| channel | `backlog --channel <id>` · `backlog-add --channel <id> --id … --title …` · `lint <project> [--no-picture]` |
| cast | `channels [--validate]` · `channel-new <id> --name "…"` · `characters [--validate]` · `character-sheet <id>` · `avatar --channel <id>` |
| audio | `voice` · `words [--audio file]` · `estimate` · `mix` · `voices` · `effects` |
| render | `check` · `cues` · `sheet` · `frames <times>` · `render [--draft]` · `preview` · `stylesheet <template>` |
| pipeline | `build [--timing voice\|estimate\|audio:<file>\|keep] [--from step] [--only a,b] [--skip a,b] [--verbose]` · `selftest` |
| publish | `accounts` · `connect <youtube\|instagram> --channel <id>` · `disconnect` · `publish <project> --to youtube,instagram [--yes]` · `share` · `host` |
| system | `doctor` · `setup` |

`<project>` is `<channel>/<name>`, a bare name when only one channel has it, a path, or `@<template>` for that
template's own example.

## Layout

```
bin/studio.mjs              CLI entry
studio/                     Node orchestrator (no npm dependencies)
  cli.mjs                   loads every studio/commands/*.mjs: a new command is a new file
  commands/                 project · channel · workflow (brief/plan/status) · cast · audio · render · pipeline · publish · system
  lib/                      config (layers) · templates (registry + validation) · project · overlay · pages · pipeline · lint · workflow · python
  render/                   server (overlay + generated pages) · chrome (DevTools protocol) · modes (check/cues/sheet/frames/video/textLayout) · session
  publish/                  exporters/ (youtube, instagram: one file per platform) · secrets · metadata · media (spec checks) · http · hosts
engine/                     the browser runtime shared by every template
  src/main.js               the player: boots any template from its config, 2D or 3D
  src/core/                 lib (math, primitives) · timing · captions (configurable) · config · random (seeded) ·
                            board (style sheets) · engine (three.js film look, configurable) · human · sdf ·
                            avatar (channel profile pictures)
  fonts/  vendor/three/     stored once
templates/<id>/             generic video styles: template.json · STYLE.md · style-sheet.png · src/ (its kit) · example/
python/studio_audio/        voice (TTS provider registry, Kokoro) · align (Whisper) · estimate · mix (effect/music registries, plugins)
tests/                      unit/ (fast) · render/ (headless Chrome) · fixtures/workspace (a demo channel) · python/tests (audio)
.studio/                    venv + models (git-ignored, rebuilt by `studio setup`)
.claude/skills/content-studio/   the workflow skill (local to this folder)
```

## How it fits together

**Layered files.** The render server resolves every URL through three layers, first hit wins:
`project → template → engine`. A template ships only what makes it different (its kit, maybe its own captions); a
project is a few small files; any file can be overridden for one template or one video by placing a copy at the same
path. Existing relative imports (`./core/lib.js`, `three`) work unchanged.

**Layered configuration.**
- Studio: built-in defaults < `studio.config.json` < `studio.config.local.json` (per machine, git-ignored) < env
  (`FPS`, `CHROME`, `SOFTWARE_GL`, `QS`, `STUDIO_HOME`, `STUDIO_WHISPER_MODEL`).
- Runtime (what the browser engine sees): engine defaults < `template.json` < channel `defaults.overrides` <
  `project.json` → `overrides`.
  Keys: `player` (renderer, camera punch/push/flash, fades, seed; 3D: optional `motionBlur` sub-frames and `shutter`
  seconds), `captions` (position, size, colours, stroke), `engine3d` (tone mapping, far plane, grade), `fonts`, `sheet`.
- Final render (opt-in per template): `template.json` → `render` { `quality` (e.g. `res=2&aa=8`: supersampled 3D),
  `crf`, `preset`, `jpeg` (frame capture quality) } overrides the studio render settings for the MP4 only (not drafts).

**Generated pages.** `index.html` and `sheet.html` are generated from the config (fonts → `@font-face`, 3D → WebGL
canvas + import map), so templates carry no boilerplate.

**Pipeline as data.** `studio/lib/pipeline.mjs` holds the steps (`timing → lint → check → cues → mix → sheet →
render`); `build` runs all or a slice of them. `lint` is the quality gate (`studio/lib/lint.mjs`): it blocks a channel
video with no description, tags or sources, over-long captions, or phrasing that repeats the channel's other videos,
and (drawing every frame in headless Chrome) text cut off by the frame edge or lying over the captions or other text.
The engine marks what it is drawing (`OP.layer`: shot or caption) so lint can tell captions from the shot's own text.

**Plug-ins.**
- Channels: a folder in the workspace's `channels/` (`studio channel-new`).
- Templates: a folder in any `templatesDirs` entry, or in a channel's `templates/`.
- Commands: a file in `studio/commands/`.
- Sound effects and music: `@effect` / `@track` in a `.py` file in `templates/<id>/audio/` or `projects/<name>/audio/`.
- TTS engines: a provider in `python/studio_audio/tts/` (kokoro, voicestudio, http).
- Platforms to publish to: a file in `studio/publish/exporters/` (`{ id, needs, status, connect, plan, publish }`).
- Temporary hosts: an entry in `studio/publish/hosts.mjs`.

**Reproducible renders.** `Math.random` is seeded by the player, so the same project renders the same frames every
time (change `player.seed` to re-roll).

## Tests

```bash
npm test              # unit: config, overlay, templates, projects, pages/server, engine logic, pipeline, CLI, publish
npm run test:py       # audio: timing, alignment, narration, every effect/track, mixer, plugins, CLI
npm run test:render   # headless Chrome: every template boots + renders deterministically, overrides, full pipeline
node bin/studio.mjs selftest   # every template end to end with the real voice
```

Working from a git worktree (parallel work): link the one shared env first, `ln -s /path/to/ContentStudio/.studio .studio`.

## Migration notes (from faceless-shorts)
- **Deduplicated:** the six copies of capture/mix/lib/timing/board/engine/fonts/three.js now exist once (16 MB → 10 MB).
- **Verified:** 32 of 36 reference frames are pixel-identical to the original skill's renders. Of the other four:
  - Two are GPU float noise in tall-tale's 3D grade.
  - One (deep-dive) was random scatter that differed between the original's own runs too; renders are now seeded.
  - One is a fix: stick-story's first caption used to render in a fallback serif because a font loaded too late.
- **Audio output unchanged:** the mixer output is sample-identical to the original `mix.py`.
- **Paths moved:** models and the Python env live in `.studio/` here, not `~/.faceless-shorts`. Videos live in the
  workspace's `projects/`, not `~/faceless-shorts`.

## Licenses
Original code, stories, drawings and sounds are free to use in your videos. Inter: SIL Open Font License 1.1.
Caladea: Apache-2.0. FreeMono (GNU FreeFont): GPL with font exception. three.js: MIT. Installed by `studio setup`: Kokoro-82M (Apache-2.0) via kokoro-onnx
(MIT), faster-whisper + Whisper small.en (MIT), numpy, scipy (BSD).
