// Configuration, in layers (later wins):
//   studio:  DEFAULTS < studio.config.json < studio.config.local.json (git-ignored, per machine) < environment
// The studio is generic code. Everything about your channels lives in a separate WORKSPACE folder outside the repo
// ("workspace", default ../ContentStudio-workspace, or $STUDIO_WORKSPACE): channels/ (each with its own templates,
// characters, bible), characters/ and templates/ shared by your channels, and projects/ (the videos). Relative
// projectsDir / channelsDir / charactersDir are inside the workspace; workspace templates/ is searched after the
// studio's own templatesDirs.
//   runtime: ENGINE_DEFAULTS < template.json < channel.json defaults.overrides < project.json "overrides"
//            (what the browser engine sees), plus the cast: the characters the video may draw
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, resolveFrom } from './paths.mjs';

export const DEFAULTS = {
  workspace: '../ContentStudio-workspace',
  projectsDir: 'projects',
  studioHome: '.studio',
  templatesDirs: ['templates'],
  charactersDir: 'characters',
  channelsDir: 'channels',
  audioPlugins: [],
  render: { fps: 30, chrome: null, blender: null, softwareGL: false, quality: '', crf: 18, preset: 'veryfast', draftCrf: 28, draftPreset: 'ultrafast', bootTimeoutS: 120 },
  voice: { tts: 'kokoro', voice: 'am_michael', speed: 1.0, whisperModel: 'small.en' },
  review: { sheetStep: 0.5, sheetCols: 10 },
  publish: { host: 'litterbox', expiry: '1h' },
  quality: {},
};

/** the parts of template.json / project.json the browser engine reads */
export const RUNTIME_KEYS = ['player', 'captions', 'engine3d', 'sheet'];

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

/** recursive merge of plain objects; arrays and scalars are replaced, undefined is ignored */
export function deepMerge(...layers) {
  const out = {};
  for (const layer of layers) {
    if (!isObj(layer)) continue;
    for (const [k, v] of Object.entries(layer)) {
      if (v === undefined) continue;
      out[k] = isObj(v) && isObj(out[k]) ? deepMerge(out[k], v) : isObj(v) ? deepMerge(v) : v;
    }
  }
  return out;
}

export function readJson(file, fallback) {
  if (!fs.existsSync(file)) { if (fallback !== undefined) return fallback; throw new Error(`missing ${file}`); }
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { throw new Error(`${file}: invalid JSON (${e.message})`); }
}

function envLayer(env) {
  const num = (v) => (v == null || v === '' ? undefined : +v);
  return {
    render: { fps: num(env.FPS), chrome: env.CHROME || undefined, blender: env.BLENDER || undefined, softwareGL: env.SOFTWARE_GL ? env.SOFTWARE_GL !== '0' : undefined, quality: env.QS || undefined },
    voice: { whisperModel: env.STUDIO_WHISPER_MODEL || undefined },
    studioHome: env.STUDIO_HOME || undefined,
    workspace: env.STUDIO_WORKSPACE || undefined,
  };
}

/** the studio config with every path made absolute */
export function loadStudioConfig({ root = ROOT, env = process.env } = {}) {
  const cfg = deepMerge(DEFAULTS, readJson(path.join(root, 'studio.config.json'), {}), readJson(path.join(root, 'studio.config.local.json'), {}), envLayer(env));
  cfg.root = root;
  cfg.workspace = resolveFrom(root, cfg.workspace);
  cfg.projectsDir = resolveFrom(cfg.workspace, cfg.projectsDir);
  cfg.charactersDir = resolveFrom(cfg.workspace, cfg.charactersDir);
  cfg.channelsDir = resolveFrom(cfg.workspace, cfg.channelsDir);
  cfg.studioHome = resolveFrom(root, cfg.studioHome);
  cfg.templatesDirs = [...cfg.templatesDirs.map((d) => resolveFrom(root, d)), path.join(cfg.workspace, 'templates')];
  cfg.audioPlugins = cfg.audioPlugins.map((d) => resolveFrom(root, d));
  return cfg;
}

/** what the browser engine receives at studio/config.json */
export function runtimeConfig(template, projectManifest = {}, { channel, cast = [] } = {}) {
  const t = template.manifest, c = channel?.manifest?.defaults?.overrides || {}, o = projectManifest.overrides || {};
  const base = { id: t.id, title: t.title, fonts: t.fonts || [], format: t.format || {}, channel: channel?.id || null, cast };
  for (const k of RUNTIME_KEYS) base[k] = deepMerge(t[k], c[k], o[k]);
  if (c.fonts) base.fonts = c.fonts;
  if (o.fonts) base.fonts = o.fonts;
  return base;
}
