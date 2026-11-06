# Adding a new video type (template)

A template is a folder in `templates/` (or any folder listed in `studio.config.json` → `templatesDirs`). Drop it in and
`studio templates` picks it up; nothing else is registered anywhere. The studio serves every page from three layers,
first hit wins:

```
projects/<name>/        script.json, src/shots.js, data/, project.json   (one video)
templates/<template>/   template.json, src/core/kit.js + its own modules, src/sheet.js, audio/*.py, example/
engine/                 src/main.js (player), src/core/{lib,timing,captions,config,random,board,engine,human,sdf}.js,
                        fonts/, vendor/three.js
```

So a template only contains what makes it different, and relative imports like `./core/lib.js` or `three` keep
working. To change a shared engine file for one template, put a file with the same path in the template (e.g.
`templates/x/src/core/captions.js`); for one video, put it in the project.

## Steps
1. Pick the closest existing template to start from: 2D (`inside-out`, `stick-story`, `paper-atlas`) or 3D
   (`deep-dive`, `night-file`, `tall-tale`). Copy it: `cp -R templates/inside-out templates/<new-id>`.
2. Edit `template.json` (all keys except id/title/description/fonts/player.renderer are optional):
   ```json
   {
     "id": "<new-id>", "title": "Human Name", "description": "what it makes",
     "useFor": ["which topics should pick it"],
     "format": { "aspect": "9:16", "width": 1080, "height": 1920, "length": "30-45 s" },
     "fonts": [{ "family": "Inter", "weight": 900, "file": "fonts/Inter-Black.otf" }],
     "player": { "renderer": "2d", "punch": 0.13, "punchDur": 0.32, "flash": 0.55, "fadeIn": 0.25, "fadeOut": 0.35, "zoom": 0.06, "seed": 1 },
     "captions": { "y": 1400, "size": 150, "maxW": 900, "font": "Inter", "weight": 900, "letterSpacing": -2,
                   "fill": "#FFFFFF", "highlight": "#FFD43B", "stroke": "#1A1A1E", "strokeWidth": 30, "shadowOffset": 10 },
     "engine3d": { "toneMapping": "aces | neutral", "far": 120, "grade": { "vignette": 0.35, "grain": 0.02, "warm": 0.03, "sat": 1 } },
     "sheet": { "canvases": [["gl", 1080, 1920]] },
     "defaults": { "voice": "am_michael", "music": "bed", "youtubeCategory": "27" }
   }
   ```
   Fonts are looked up in the template first, then `engine/fonts/` (Inter Black/ExtraBold, FreeMono Bold, Caladea Bold).
   New fonts must be free to use (OFL, Apache): put them in `templates/<id>/fonts/`.
   `player.renderer`: `2d` = the player handles camera punch/push/flash around `shot.cam`; `3d` = shots render with
   three.js into the hidden `#gl` canvas and call `blit()`.
3. Build the look in `src/core/kit.js` (+ any modules): palette, characters, props, backgrounds, as functions of time.
   Everything must be a pure function of `t` (no state carried between frames), so any frame renders on its own.
   `Math.random` is seeded by the player, so randomness is reproducible; use `rnd(i)` from lib.js for per-item noise.
4. A different caption look or chunking: ship `src/core/captions.js` exporting `buildCaptions(script)`,
   `drawCaption(t)`, `captionList()` (see night-file / tall-tale for examples). Same look with other numbers: just
   use `template.json` → `captions`.
5. `src/sheet.js`: draws the 1920x1080 style-sheet board with the kit (see `engine/src/core/board.js`), ends with
   `window.SHEET_READY = true`. `studio stylesheet <id>` writes `style-sheet.png`.
6. `example/`: a complete short in the new look. Make it as a normal project (`studio new <new-id> demo`, write it,
   `studio build demo`), then copy its `script.json`, `src/shots.js` and `data/{lines,words,cues}.json` into
   `templates/<new-id>/example/`. Every new project of this template starts from it.
7. `STYLE.md`: same sections as `templates/inside-out/STYLE.md` (look rules, palette, format, engine/kit map,
   components, shot anatomy, cue types, QA pitfalls). This is what future videos are planned from, so make it complete.
8. Verify: `studio templates --validate`, `studio check @<id>`, `npm test`, `npm run test:render` (renders every
   template, including the new one), `studio selftest --templates <id>`. Add a row to the template table in
   `.claude/skills/content-studio/SKILL.md`.

## Sound
Effects and music are registries in `python/studio_audio/mix/`. To add your own without touching the package, drop a
Python file in `templates/<id>/audio/` (every video of that template) or `projects/<name>/audio/` (one video):

```python
import numpy as np
from studio_audio.mix import effect, track

@effect('swoosh2', level=-17)          # use it in shots.js: cue(t, 'swoosh2', { gain: 0.8, dur: 0.5 })
def swoosh2(dsp, d=0.4, **_):
    n = dsp.noise(d)
    return dsp.lp(n, 1500) * np.sin(np.pi * np.linspace(0, 1, len(n)))

@track('lofi')                          # use it in script.json: "music": "lofi"
def lofi(dsp, n_samples, duration):
    ...                                 # return a mono float array of n_samples
```

Check the exact signatures in `python/studio_audio/mix/effects.py` and `music.py` before writing one, and run
`studio effects <project>` to see it registered. Keep effects soft (nothing harsh above ~5 kHz).
