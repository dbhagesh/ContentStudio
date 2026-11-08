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
    ['workspace', fs.existsSync(cfg.channelsDir), cfg.workspace, `no workspace at ${cfg.workspace}: run  studio workspace-init  (or set "workspace" in studio.config.local.json / $STUDIO_WORKSPACE)`],
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

/** optional tools: shown, never counted as problems */
async function optional(cfg) {
  const vsUrl = process.env.VOICESTUDIO_URL || 'http://127.0.0.1:3900';
  let vs = null;
  try { const r = await fetch(`${vsUrl}/health`, { signal: AbortSignal.timeout(1500) }); if (r.ok) vs = await r.json(); } catch { /* not running */ }
  const hf = path.join(cfg.root, 'third_party/hyperframes/packages/cli/bin/hyperframes.mjs');
  const hfBuilt = fs.existsSync(hf) && fs.existsSync(path.join(cfg.root, 'third_party/hyperframes/packages/cli/dist'));
  return [
    ['voicestudio', !!vs, vs ? `${vsUrl} (v${vs.version}, ${vs.device})` : 'not running (optional): cd third_party/VoiceStudio && bun run dev:api   (or open the app: bun run dev)'],
    ['hyperframes', hfBuilt, hfBuilt ? path.relative(cfg.root, hf) : 'not built (optional): cd third_party/hyperframes && bun install && bun run build'],
  ];
}

const WORKSPACE_README = `# Studio workspace

Your channels and videos, kept outside the studio code (the studio repo reads this folder through its "workspace"
setting). Keep it in its own private git repo or a synced folder.

- channels/<id>/    one folder per channel: channel.json, BIBLE.md, series.json, backlog.json, and its own
                    templates/, characters/ and audio/ (studio channel-new <id> --name "...")
- characters/<id>/  characters shared by several of your channels
- templates/<id>/   templates shared by several of your channels
- projects/<channel>/<episode>/   the videos (big generated files: data/*.wav, renders/, review/)
`;

const WORKSPACE_GITIGNORE = `# generated per video (rebuilt by studio build)
projects/*/*/data/*.wav
projects/*/*/renders/
projects/*/*/review/
projects/*/_voice-bakeoff/
.DS_Store
`;

export const commands = [
  {
    name: 'workspace-init', group: 'system', summary: 'create the workspace folder for your channels and videos (outside the studio code)',
    usage: 'workspace-init [path]   (default: the configured workspace)',
    run({ positionals: [where], cfg }) {
      const ws = where ? path.resolve(where) : cfg.workspace;
      for (const d of ['channels', 'characters', 'templates', 'projects']) fs.mkdirSync(path.join(ws, d), { recursive: true });
      for (const [f, body] of [['README.md', WORKSPACE_README], ['.gitignore', WORKSPACE_GITIGNORE]]) {
        if (!fs.existsSync(path.join(ws, f))) fs.writeFileSync(path.join(ws, f), body);
      }
      const hint = ws === cfg.workspace ? '' : `\nPoint the studio at it: studio.config.local.json → { "workspace": "${ws}" } (or $STUDIO_WORKSPACE)`;
      console.log(`${ws}${hint}`);
      return 0;
    },
  },
  {
    name: 'doctor', group: 'system', summary: 'check that everything the studio needs is installed',
    usage: 'doctor',
    async run({ cfg }) {
      let bad = 0;
      for (const [name, pass, info, fix] of checks(cfg)) { if (!pass) bad++; console.log(`${pass ? '✓' : '✗'} ${name.padEnd(12)} ${pass ? info : fix}`); }
      for (const [name, pass, info] of await optional(cfg)) console.log(`${pass ? '✓' : '·'} ${name.padEnd(12)} ${info}`);
      console.log(bad ? `${bad} problem(s)` : 'All set');
      return bad ? 1 : 0;
    },
  },
  {
    name: 'setup', group: 'system', summary: 'one-time: Python env + free local voice/Whisper models (~0.9 GB) inside .studio/',
    usage: 'setup',
    async run({ cfg }) {
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
      return await commands.find((c) => c.name === 'doctor').run({ cfg });
    },
  },
];
