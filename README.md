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
node bin/studio.mjs templates                   # the video types
node bin/studio.mjs new inside-out my-video     # a new project (a copy of the template's example)
#   …edit projects/my-video/script.json and src/shots.js…
node bin/studio.mjs build my-video              # voice → timing → check → cues → mix → review sheet → MP4
open projects/my-video/renders/my-video.mp4
```

With Claude Code in this folder, just ask ("make a Deep Dive short about cracking your knuckles"). The project skill
`.claude/skills/content-studio/` (local to this folder only) runs the whole workflow, including QA and publishing.

Needs: Node.js 22+, ffmpeg, Google Chrome, Python 3.10+ (for the env). `npm link` makes `studio` a global command.

## Channels and characters

Characters are permanent, reusable cast members with stable IDs; channels are brands that cast them.

```
characters/<id>/   character.json (id, version, palette, expressions, poses, outfits, voice) · character.js (the only
                   drawing code) · CHARACTER.md (the bible) · sheet.png (model sheet, rendered from the code) · refs/
channels/<id>/     channel.json: cast, default template / voice / music / caption look, publish defaults
```

- `studio new <name> --channel sakumai` makes a video with the channel's template, voice and look, and pins its
  cast versions in `project.json`.
- Shots draw a character with `cast('sakumai').draw({ x, y, s, pose, expression, outfit, xray, t, talk })`.
- Characters are served read-only from the library, so a project can't change how they look.
- Improving a character means editing it in the library and bumping its version. `studio check` notes when a project
  was made with an older version.
- `studio characters`, `studio channels` and `studio character-sheet <id>` list, validate and render them.

## Commands (`studio help <command>` for details)

| group | commands |
|---|---|
| projects | `templates [--validate]` · `new <template> <name>` · `new <name> --channel <id>` · `list` |
| cast | `characters [--validate]` · `character-sheet <id>` · `channels [--validate]` |
| audio | `voice` · `words [--audio file]` · `estimate` · `mix` · `voices` · `effects` |
| render | `check` · `cues` · `sheet` · `frames <times>` · `render [--draft]` · `preview` · `stylesheet <template>` |
| pipeline | `build [--timing voice\|estimate\|audio:<file>\|keep] [--from step] [--only a,b] [--skip a,b]` · `selftest` |
| publish | `accounts` · `connect <youtube\|instagram> --channel <id>` · `disconnect` · `publish <project> --to youtube,instagram [--yes]` · `share` · `host` |
| system | `doctor` · `setup` |

`<project>` is a name in `projects/`, a path, or `@<template>` for that template's own example.

## Layout

```
bin/studio.mjs              CLI entry
studio/                     Node orchestrator (no npm dependencies)
  cli.mjs                   loads every studio/commands/*.mjs: a new command is a new file
  commands/                 project · audio · render · pipeline · publish · system
  lib/                      config (layers) · templates (registry + validation) · project · overlay · pages · pipeline · python
  render/                   server (overlay + generated pages) · chrome (DevTools protocol) · modes (check/cues/sheet/frames/video) · session
  publish/                  exporters/ (youtube, instagram: one file per platform) · secrets · metadata · media (spec checks) · http · hosts
engine/                     the browser runtime shared by every template
  src/main.js               the player: boots any template from its config, 2D or 3D
  src/core/                 lib (math, primitives) · timing · captions (configurable) · config · random (seeded) ·
                            board (style sheets) · engine (three.js film look, configurable) · human · sdf
  fonts/  vendor/three/     stored once
characters/<id>/            permanent cast members (character.js, CHARACTER.md, sheet.png)
channels/<id>/              brands: cast + defaults
templates/<id>/             one video type: template.json · STYLE.md · style-sheet.png · src/ (its kit) · example/
python/studio_audio/        voice (TTS provider registry, Kokoro) · align (Whisper) · estimate · mix (effect/music registries, plugins)
projects/<name>/            your videos: project.json · script.json · src/shots.js · data/ · renders/ · review/
tests/                      unit/ (fast) · render/ (headless Chrome) · python/tests (audio)
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
- Runtime (what the browser engine sees): engine defaults < `template.json` < `project.json` → `overrides`.
  Keys: `player` (renderer, camera punch/push/flash, fades, seed), `captions` (position, size, colours, stroke),
  `engine3d` (tone mapping, far plane, grade), `fonts`, `sheet`.

**Generated pages.** `index.html` and `sheet.html` are generated from the config (fonts → `@font-face`, 3D → WebGL
canvas + import map), so templates carry no boilerplate.

**Pipeline as data.** `studio/lib/pipeline.mjs` holds the steps (`timing → check → cues → mix → sheet → render`);
`build` runs all or a slice of them.

**Plug-ins.**
- Templates: a folder in any `templatesDirs` entry.
- Commands: a file in `studio/commands/`.
- Sound effects and music: `@effect` / `@track` in a `.py` file in `templates/<id>/audio/` or `projects/<name>/audio/`.
- TTS engines: a provider in `python/studio_audio/tts/`.
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

## Migration notes (from faceless-shorts)
- **Deduplicated:** the six copies of capture/mix/lib/timing/board/engine/fonts/three.js now exist once (16 MB → 10 MB).
- **Verified:** 32 of 36 reference frames are pixel-identical to the original skill's renders. Of the other four:
  - Two are GPU float noise in tall-tale's 3D grade.
  - One (deep-dive) was random scatter that differed between the original's own runs too; renders are now seeded.
  - One is a fix: stick-story's first caption used to render in a fallback serif because a font loaded too late.
- **Audio output unchanged:** the mixer output is sample-identical to the original `mix.py`.
- **Paths moved:** models and the Python env live in `.studio/` here, not `~/.faceless-shorts`. Projects live in
  `projects/`, not `~/faceless-shorts`.

## Licenses
Original code, stories, drawings and sounds are free to use in your videos. Inter: SIL Open Font License 1.1.
Caladea: Apache-2.0. FreeMono (GNU FreeFont): GPL with font exception. three.js: MIT. Installed by `studio setup`: Kokoro-82M (Apache-2.0) via kokoro-onnx
(MIT), faster-whisper + Whisper small.en (MIT), numpy, scipy (BSD).
