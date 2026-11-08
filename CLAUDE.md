# ContentStudio

Local, template-driven video studio running many channels (see README.md for the architecture).

- Making or changing a video, or publishing one: use the `content-studio` skill in `.claude/skills/` (local to this
  folder). It drives `node bin/studio.mjs`.
- This repo is the generic studio: no channel names, real use cases or hard-coded values in code, tests or docs.
  Behaviour comes from configuration and templates. Tests use only `tests/fixtures/workspace/` (a demo channel).
- All channel content lives in the WORKSPACE, outside this repo (`studio doctor` shows the path; "workspace" in
  studio.config.local.json or $STUDIO_WORKSPACE). Channels never mix: each is one self-contained folder
  `<workspace>/channels/<id>/` (channel.json, BIBLE.md, series, backlog, its own templates/, characters/, audio/),
  with its videos in `<workspace>/projects/<id>/`. A new channel is `studio channel-new`;
  ask the user what to name it, never pick the name yourself.
- Quality is never compromised: every channel video passes `studio lint` and the rubric in
  `.claude/skills/content-studio/references/quality.md`, and every frame shown has been looked at.
- Changing the studio itself: keep templates free of engine copies (the overlay serves `engine/` underneath), keep
  every frame a pure function of time, and run `npm test`, `npm run test:py` and `npm run test:render` before calling
  a change done.
- Characters are permanent and must look identical everywhere: draw them only through `cast('<id>')`, never by hand,
  and change their look only when the user asks (bump the version).
- Never upload, post or host a video without the user asking and confirming.
