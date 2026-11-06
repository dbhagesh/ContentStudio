# ContentStudio

Local, template-driven video studio (see README.md for the architecture).

- Making or changing a video, or publishing one: use the `content-studio` skill in `.claude/skills/` (local to this
  folder). It drives `node bin/studio.mjs`.
- Changing the studio itself: keep templates free of engine copies (the overlay serves `engine/` underneath), keep
  every frame a pure function of time, and run `npm test`, `npm run test:py` and `npm run test:render` before calling
  a change done.
- Characters (`characters/<id>/`) are permanent and must look identical everywhere: draw them only through
  `cast('<id>')`, never by hand, and change their look only when the user asks (bump the version).
- Never upload, post or host a video without the user asking and confirming.
