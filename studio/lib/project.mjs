// Projects: one video each, in config.projectsDir/<name>/.
//   project.json  { "template": "inside-out", "channel": "sakumai", "cast": { "sakumai": "1.0.0" },
//                   "title": "...", "created": "...", "overrides": { "captions": {...}, ... }, "publish": {...} }
//   script.json   the narration (lines + caption chunks), sources, voice, music
//   src/shots.js  the shot list (the only code that changes per video)
//   data/         timings, cues, narration.wav, mix.wav (generated)  ·  renders/  ·  review/
// Everything else (engine, template kit, fonts, three.js) is served from the layers below the project, so a project
// stays a few small files. Any engine or template file can be overridden by putting a copy at the same path here.
// Characters are served from the library at /characters/<id>/ and can't be overridden (they stay consistent);
// "cast" pins the character versions the video was made with.
import fs from 'node:fs';
import path from 'node:path';
import { readJson, runtimeConfig } from './config.mjs';
import { loadTemplate } from './templates.mjs';
import { loadChannel } from './channels.mjs';
import { loadCharacter, castEntry } from './characters.mjs';
import { createOverlay } from './overlay.mjs';
import { ENGINE_DIR } from './paths.mjs';

export const NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const GENERATED = ['data/narration.wav', 'data/mix.wav'];

/** a project name (in projectsDir) or a path to a project folder → absolute folder */
export function resolveProjectDir(ref, cfg) {
  if (!ref) throw new Error('which project? give its name (in projects/) or a path');
  const asPath = path.resolve(ref);
  if (fs.existsSync(path.join(asPath, 'project.json'))) return asPath;
  const named = path.join(cfg.projectsDir, ref);
  if (fs.existsSync(path.join(named, 'project.json'))) return named;
  throw new Error(`no project "${ref}" (looked in ${asPath} and ${named}). Create one: studio new <template> <name>`);
}

const overlayFor = (dir, template, cfg) => createOverlay([dir, template.dir, ENGINE_DIR], { mounts: { '/characters/': cfg.charactersDir } });

/** the cast a project may draw: its pinned characters, else its channel's cast */
function castFor(manifest, channel, cfg) {
  const ids = Object.keys(manifest.cast || {}).length ? Object.keys(manifest.cast) : (channel?.manifest.cast || []);
  return ids.map((id) => castEntry(loadCharacter(id, cfg)));
}

export function loadProject(ref, cfg) {
  const dir = resolveProjectDir(ref, cfg);
  const manifest = readJson(path.join(dir, 'project.json'));
  if (!manifest.template) throw new Error(`${dir}/project.json has no "template"`);
  const template = loadTemplate(manifest.template, cfg);
  const channel = manifest.channel ? loadChannel(manifest.channel, cfg) : null;
  return {
    dir, manifest, template, channel,
    name: path.basename(dir),
    overlay: overlayFor(dir, template, cfg),
    runtime: runtimeConfig(template, manifest, { channel, cast: castFor(manifest, channel, cfg) }),
    script: () => readJson(path.join(dir, 'script.json')),
    /** directories whose *.py files register extra sound effects / music tracks */
    audioPlugins: [path.join(template.dir, 'audio'), channel && path.join(channel.dir, 'audio'), path.join(dir, 'audio'), ...cfg.audioPlugins]
      .filter((d) => d && fs.existsSync(d)),
  };
}

/** a template's own example, loaded as a project (used for its style sheet and the selftest) */
export function exampleProject(template, cfg) {
  const dir = path.join(template.dir, 'example');
  const manifest = fs.existsSync(path.join(dir, 'project.json')) ? readJson(path.join(dir, 'project.json')) : { template: template.id };
  const channel = manifest.channel ? loadChannel(manifest.channel, cfg) : null;
  return {
    dir, template, channel, name: `${template.id}-example`, manifest, isExample: true,
    overlay: overlayFor(dir, template, cfg),
    runtime: runtimeConfig(template, manifest, { channel, cast: castFor(manifest, channel, cfg) }),
    script: () => readJson(path.join(dir, 'script.json')),
    audioPlugins: [path.join(template.dir, 'audio')].filter((d) => fs.existsSync(d)),
  };
}

/**
 * Start a new video from a template's example (so it renders straight away), then rewrite script.json + shots.js.
 * With a channel: its default template, voice, speed and music are applied, and its cast is pinned at today's versions.
 */
export function createProject({ template, name, title, cfg, parent, channel }) {
  if (!NAME_RE.test(name)) throw new Error(`project name "${name}": use lowercase letters, digits and dashes`);
  if (!template) throw new Error('which template? (studio templates)');
  const dir = path.join(parent || cfg.projectsDir, name);
  if (fs.existsSync(dir)) throw new Error(`${dir} already exists: pick another name`);
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  fs.cpSync(path.join(template.dir, 'example'), dir, { recursive: true });
  for (const f of [...GENERATED, 'project.json']) fs.rmSync(path.join(dir, f), { force: true });
  for (const d of ['renders', 'review']) fs.mkdirSync(path.join(dir, d), { recursive: true });
  const manifest = { template: template.id, title: title || name, created: new Date().toISOString(), overrides: {} };
  if (channel) {
    const ch = channel.manifest;
    manifest.channel = channel.id;
    manifest.cast = Object.fromEntries((ch.cast || []).map((id) => [id, loadCharacter(id, cfg).manifest.version]));
    const sf = path.join(dir, 'script.json'), script = readJson(sf);
    for (const k of ['voice', 'speed', 'music']) if (ch.defaults?.[k] != null) script[k] = ch.defaults[k];
    fs.writeFileSync(sf, JSON.stringify(script, null, 2) + '\n');
  }
  fs.writeFileSync(path.join(dir, 'project.json'), JSON.stringify(manifest, null, 2) + '\n');
  return dir;
}

export function listProjects(cfg) {
  if (!fs.existsSync(cfg.projectsDir)) return [];
  return fs.readdirSync(cfg.projectsDir).sort()
    .filter((n) => fs.existsSync(path.join(cfg.projectsDir, n, 'project.json')))
    .map((n) => ({ name: n, dir: path.join(cfg.projectsDir, n), manifest: readJson(path.join(cfg.projectsDir, n, 'project.json')) }));
}
