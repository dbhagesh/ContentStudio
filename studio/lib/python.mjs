// Bridge to the Python audio package (python/studio_audio): voice, word timing, estimate, mix.
// It runs in the studio's own env at <studioHome>/venv, so nothing is installed system-wide.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { PYTHON_DIR } from './paths.mjs';

export function venvPython(cfg) {
  for (const p of ['venv/bin/python', 'venv/Scripts/python.exe']) { const f = path.join(cfg.studioHome, p); if (fs.existsSync(f)) return f; }
  return null;
}

export function audioEnv(cfg, project) {
  return {
    ...process.env,
    PYTHONPATH: [PYTHON_DIR, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
    STUDIO_HOME: cfg.studioHome,
    STUDIO_WHISPER_MODEL: cfg.voice.whisperModel,
    STUDIO_AUDIO_PLUGINS: (project?.audioPlugins || cfg.audioPlugins || []).join(path.delimiter),
  };
}

/** run `python -m studio_audio <args>`; throws on failure (output streams to the terminal unless quiet) */
export function runAudio(cfg, args, { project, quiet = false } = {}) {
  const py = venvPython(cfg);
  if (!py) throw new Error(`no Python env at ${cfg.studioHome}/venv: run  studio setup`);
  const r = spawnSync(py, ['-m', 'studio_audio', ...args], { env: audioEnv(cfg, project), stdio: quiet ? 'pipe' : 'inherit', encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`studio_audio ${args[0]} failed${quiet ? ':\n' + (r.stderr || r.stdout) : ''}`);
  return r.stdout || '';
}
