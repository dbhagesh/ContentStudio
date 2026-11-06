// Environment: one-time setup (Python env + free local models, all inside .studio/) and a health check.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { findChrome } from '../render/chrome.mjs';
import { venvPython, audioEnv } from '../lib/python.mjs';
import { listTemplates, validateTemplate, duplicateTemplates } from '../lib/templates.mjs';
import { listCharacters, validateCharacter, duplicateCharacters } from '../lib/characters.mjs';
import { listChannels, validateChannel } from '../lib/channels.mjs';
import { PYTHON_DIR } from '../lib/paths.mjs';

const ok = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8' }).status === 0;
const PY_IMPORTS = 'import numpy, scipy, kokoro_onnx, faster_whisper';

/** a Python 3.10+ to build the env from: pyenv versions, Homebrew, then PATH */
export function findBasePython() {
  const pyenv = path.join(process.env.HOME || '', '.pyenv/versions');
  const fromPyenv = fs.existsSync(pyenv) ? fs.readdirSync(pyenv).filter((v) => /^3\.(1[0-3])\.\d+$/.test(v)).sort().reverse().map((v) => path.join(pyenv, v, 'bin/python')) : [];
  const cands = [...fromPyenv, '/opt/homebrew/bin/python3.12', '/opt/homebrew/bin/python3.11', '/opt/homebrew/bin/python3.10', 'python3.12', 'python3.11', 'python3.10', 'python3'];
  return cands.find((p) => ok(p, ['-c', 'import sys; assert sys.version_info >= (3, 10)'])) || null;
}

function checks(cfg) {
  const node = +process.versions.node.split('.')[0];
  const py = venvPython(cfg), env = audioEnv(cfg);
  const kokoro = path.join(cfg.studioHome, 'models/kokoro');
  const whisper = path.join(cfg.studioHome, 'models/whisper');
  const tplErrs = [...listTemplates(cfg).flatMap((t) => validateTemplate(t).map((e) => `${t.id}: ${e}`)), ...duplicateTemplates(cfg).map((id) => `template id "${id}" is defined twice`)];
  const chErrs = [...listCharacters(cfg).flatMap((c) => validateCharacter(c).map((e) => `${c.id}: ${e}`)), ...duplicateCharacters(cfg).map((id) => `character id "${id}" is defined twice`)];
  const chanErrs = listChannels(cfg).flatMap((c) => validateChannel(c, cfg).map((e) => `${c.id}: ${e}`));
  return [
    ['node', node >= 22, `v${process.versions.node}`, 'need Node.js 22+ (brew install node)'],
    ['ffmpeg', ok('ffmpeg', ['-version']) && ok('ffprobe', ['-version']), 'ffmpeg + ffprobe', 'brew install ffmpeg'],
    ['chrome', !!findChrome(cfg.render.chrome), findChrome(cfg.render.chrome) || '', 'install Google Chrome, or set render.chrome in studio.config.local.json'],
    ['python-env', !!py && spawnSync(py, ['-c', PY_IMPORTS], { env }).status === 0, py || '', 'run  studio setup'],
    ['voice-model', fs.existsSync(path.join(kokoro, 'kokoro-v1.0.onnx')) && fs.existsSync(path.join(kokoro, 'voices-v1.0.bin')), kokoro, 'run  studio setup'],
    ['whisper', fs.existsSync(whisper) && fs.readdirSync(whisper).length > 0, `${cfg.voice.whisperModel} in ${whisper}`, 'run  studio setup (without it, word times are spread inside each line)'],
    ['templates', tplErrs.length === 0, `${listTemplates(cfg).length} valid`, tplErrs.join('; ')],
    ['characters', chErrs.length === 0, `${listCharacters(cfg).length} valid`, chErrs.join('; ')],
    ['channels', chanErrs.length === 0, `${listChannels(cfg).length} valid`, chanErrs.join('; ')],
  ];
}

export const commands = [
  {
    name: 'doctor', group: 'system', summary: 'check that everything the studio needs is installed',
    usage: 'doctor',
    run({ cfg }) {
      let bad = 0;
      for (const [name, pass, info, fix] of checks(cfg)) { if (!pass) bad++; console.log(`${pass ? '✓' : '✗'} ${name.padEnd(12)} ${pass ? info : fix}`); }
      console.log(bad ? `${bad} problem(s)` : 'All set');
      return bad ? 1 : 0;
    },
  },
  {
    name: 'setup', group: 'system', summary: 'one-time: Python env + free local voice/Whisper models (~0.9 GB) inside .studio/',
    usage: 'setup',
    run({ cfg }) {
      fs.mkdirSync(cfg.studioHome, { recursive: true });
      let py = venvPython(cfg);
      if (!py) {
        const base = findBasePython();
        if (!base) throw new Error('need Python 3.10+ (brew install python@3.11, or pyenv install 3.11)');
        console.log(`building the Python env with ${base} ...`);
        if (!ok(base, ['-m', 'venv', path.join(cfg.studioHome, 'venv')])) throw new Error('python -m venv failed');
        py = venvPython(cfg);
      }
      const run = (args, what, env) => { console.log(what); const r = spawnSync(py, args, { stdio: 'inherit', env: env || process.env }); if (r.status) throw new Error(`${what} failed`); };
      if (spawnSync(py, ['-c', PY_IMPORTS]).status !== 0) {
        run(['-m', 'pip', 'install', '-q', '--upgrade', 'pip'], 'upgrading pip ...');
        run(['-m', 'pip', 'install', '-q', '-r', path.join(PYTHON_DIR, 'requirements.txt')], 'installing numpy, scipy, kokoro-onnx, faster-whisper ...');
      }
      const env = audioEnv(cfg);
      run(['-m', 'studio_audio', 'voice', '--download'], 'voice model (Kokoro, ~340 MB, once) ...', env);
      run(['-c', `from studio_audio.align import load_whisper; load_whisper()`], `Whisper ${cfg.voice.whisperModel} (~0.5 GB, once) ...`, env);
      return commands.find((c) => c.name === 'doctor').run({ cfg });
    },
  },
];
