// Projects: one video each. A channel's videos live in config.projectsDir/<channel>/<name>/ (so channels never mix);
// a video without a channel in config.projectsDir/<name>/.
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
import { loadCharacter, castEntry, canAppearOn, characterChannels, castMounts } from './characters.mjs';
import { createOverlay } from './overlay.mjs';
import { ENGINE_DIR } from './paths.mjs';

export const NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const GENERATED = ['data/narration.wav', 'data/mix.wav'];

const isProject = (d) => fs.existsSync(path.join(d, 'project.json'));

/** a project as <channel>/<name>, a bare <name> (when only one channel has it), or a path → absolute folder */
export function resolveProjectDir(ref, cfg) {
  if (!ref) throw new Error('which project? give <channel>/<name>, its name, or a path');
  const asPath = path.resolve(ref);
  if (isProject(asPath)) return asPath;
  const named = path.join(cfg.projectsDir, ref);
  if (isProject(named)) return named;
  const hits = ref.includes('/') ? [] : listProjects(cfg).filter((p) => p.name === ref);
  if (hits.length === 1) return hits[0].dir;
  if (hits.length > 1) throw new Error(`"${ref}" exists in several channels: say which (${hits.map((p) => p.ref).join(', ')})`);
  throw new Error(`no project "${ref}" (looked in ${asPath} and ${named}). Create one: studio new <name> --channel <id>`);
}

/** the project's name as the CLI takes it: <channel>/<name> inside projectsDir, else the folder path */
export function projectRef(dir, cfg) {
  const rel = path.relative(cfg.projectsDir, dir);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel.split(path.sep).join('/') : dir;
}

/** only the video's own cast is served under /characters/ */
const overlayFor = (dir, template, chars) => createOverlay([dir, template.dir, ENGINE_DIR], { mounts: castMounts(chars) });

/**
 * the characters a project may draw: its pinned cast, else its channel's. A character appears only on its own
 * channels (characterChannels), so one channel can never borrow another's cast.
 */
function castFor(manifest, channel, cfg) {
  const ids = Object.keys(manifest.cast || {}).length ? Object.keys(manifest.cast) : (channel?.manifest.cast || []);
  return ids.map((id) => {
    const c = loadCharacter(id, cfg);
    if (!canAppearOn(c, channel?.id)) {
      throw new Error(`character "${id}" belongs to ${characterChannels(c).join(', ')}; it can't appear in a ${channel ? `"${channel.id}"` : 'channel-less'} video`);
    }
    return c;
  });
}

/**
 * a channel makes videos only with its own templates and the shared ones it lists in channel.json "templates";
 * another channel's template is never allowed. Without a channel, only shared templates.
 */
export function assertTemplateAllowed(channel, template) {
  if (template.owner && template.owner !== channel?.id) {
    throw new Error(`template "${template.id}" belongs to channel "${template.owner}"`);
  }
  const listed = channel?.manifest.templates;
  if (!template.owner && Array.isArray(listed) && listed.length && !listed.includes(template.id)) {
    throw new Error(`channel "${channel.id}" uses ${listed.join(', ')} (and its own templates), not "${template.id}" (channel.json "templates")`);
  }
}

function assemble(dir, manifest, template, channel, cfg) {
  const chars = castFor(manifest, channel, cfg);
  return {
    overlay: overlayFor(dir, template, chars),
    runtime: runtimeConfig(template, manifest, { channel, cast: chars.map(castEntry) }),
  };
}

export function loadProject(ref, cfg) {
  const dir = resolveProjectDir(ref, cfg);
  const manifest = readJson(path.join(dir, 'project.json'));
  if (!manifest.template) throw new Error(`${dir}/project.json has no "template"`);
  const template = loadTemplate(manifest.template, cfg);
  const channel = manifest.channel ? loadChannel(manifest.channel, cfg) : null;
  assertTemplateAllowed(channel, template);
  return {
    dir, manifest, template, channel,
    name: path.basename(dir),
    ref: projectRef(dir, cfg),
    ...assemble(dir, manifest, template, channel, cfg),
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
    ...assemble(dir, manifest, template, channel, cfg),
    script: () => readJson(path.join(dir, 'script.json')),
    audioPlugins: [path.join(template.dir, 'audio')].filter((d) => fs.existsSync(d)),
  };
}

/**
 * Start a new video from a template's example (so it renders straight away), then rewrite script.json + shots.js.
 * With a channel: it goes in projects/<channel>/, the template must be one the channel allows, its voice, speed and
 * music are applied, and its cast is pinned at today's versions.
 */
export function createProject({ template, name, title, cfg, parent, channel }) {
  if (!NAME_RE.test(name)) throw new Error(`project name "${name}": use lowercase letters, digits and dashes`);
  if (!template) throw new Error('which template? (studio templates)');
  assertTemplateAllowed(channel, template);
  const dir = path.join(parent || (channel ? path.join(cfg.projectsDir, channel.id) : cfg.projectsDir), name);
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

/** every project: projectsDir/<name>/ and projectsDir/<channel>/<name>/, optionally only one channel's */
export function listProjects(cfg, { channel } = {}) {
  const root = cfg.projectsDir, out = [];
  if (!fs.existsSync(root)) return out;
  const dirs = (d) => fs.readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => path.join(d, e.name)).sort();
  for (const d of dirs(root)) {
    if (isProject(d)) out.push(d);
    else for (const sub of dirs(d)) if (isProject(sub)) out.push(sub);
  }
  return out
    .map((dir) => ({ name: path.basename(dir), ref: projectRef(dir, cfg), dir, manifest: readJson(path.join(dir, 'project.json')) }))
    .filter((p) => !channel || p.manifest.channel === channel);
}
