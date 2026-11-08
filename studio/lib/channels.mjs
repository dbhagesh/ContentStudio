// Channels: a brand, and the unit the studio scales by. Each channel is one self-contained folder:
//   channels/<id>/channel.json   {
//     id, name, handle, url, instagram, about,
//     cast: ["<character id>", ...]     the characters that appear on this channel
//     templates: ["inside-out", ...]    shared templates it may use; [] = only its own templates/; no key = any
//     defaults: { template, voice, speed, music, overrides: { captions, player, ... } }
//     publish:  { targets, tags, footer, links, youtube: {...}, instagram: {...} }
//   }
//   channels/<id>/BIBLE.md       who it's for, its promise, tone, hook formulas, series, do / don't
//   channels/<id>/series.json    its recurring series        channels/<id>/backlog.json   episode ideas
//   channels/<id>/templates/     its own templates           channels/<id>/characters/   its own cast
//   channels/<id>/audio/         its own music and stings    projects/<id>/              its videos
// A project made with --channel gets the channel's template, voice, music, cast and look; the project's own
// overrides still win over the channel's. Nothing in one channel's folder is visible to another channel.
import fs from 'node:fs';
import path from 'node:path';
import { readJson } from './config.mjs';
import { listTemplates } from './templates.mjs';
import { listCharacters, ID_RE, canAppearOn, characterChannels } from './characters.mjs';

export const CHANNEL_FILES = ['channel.json', 'BIBLE.md', 'series.json', 'backlog.json'];

export function listChannels(cfg) {
  const dir = cfg.channelsDir;
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).sort()
    .filter((n) => fs.existsSync(path.join(dir, n, 'channel.json')))
    .map((n) => ({ id: n, dir: path.join(dir, n), manifest: readJson(path.join(dir, n, 'channel.json')) }));
}

export function loadChannel(id, cfg) {
  const all = listChannels(cfg), c = all.find((x) => x.id === id);
  if (!c) throw new Error(`no channel "${id}". Available: ${all.map((x) => x.id).join(', ') || '(none)'}`);
  return c;
}

/** the templates a channel can make videos with: its own, plus the shared ones it lists ([] = none, no key = all) */
export function channelTemplates(ch, cfg) {
  const listed = ch.manifest.templates;
  return listTemplates(cfg).filter((t) => (t.owner ? t.owner === ch.id : !Array.isArray(listed) || listed.includes(t.id)));
}

export function validateChannel(ch, cfg) {
  const m = ch.manifest, errs = [];
  if (!ID_RE.test(ch.id)) errs.push(`id "${ch.id}": lowercase letters, digits, dashes`);
  if (m.id !== ch.id) errs.push(`channel.json id "${m.id}" must match its folder "${ch.id}"`);
  if (!m.name) errs.push('needs a "name"');
  if (!fs.existsSync(path.join(ch.dir, 'BIBLE.md'))) errs.push('missing BIBLE.md (the channel bible: audience, promise, tone, hooks, series)');
  const chars = new Map(listCharacters(cfg).map((c) => [c.id, c]));
  for (const id of m.cast || []) {
    const c = chars.get(id);
    if (!c) errs.push(`cast member "${id}" is not in characters/ or channels/${ch.id}/characters/`);
    else if (!canAppearOn(c, ch.id)) errs.push(`cast member "${id}" belongs to ${characterChannels(c).join(', ')}`);
  }
  const all = listTemplates(cfg);
  for (const id of m.templates || []) {
    const t = all.find((x) => x.id === id);
    if (!t) errs.push(`template "${id}" does not exist`);
    else if (t.owner && t.owner !== ch.id) errs.push(`template "${id}" belongs to channel "${t.owner}"`);
  }
  const d = m.defaults?.template;
  if (d && !all.some((x) => x.id === d)) errs.push(`default template "${d}" does not exist`);
  else if (d && !channelTemplates(ch, cfg).some((x) => x.id === d)) errs.push(`default template "${d}" is not one this channel may use`);
  for (const f of ['series.json', 'backlog.json']) {
    const file = path.join(ch.dir, f);
    if (fs.existsSync(file)) { try { readJson(file); } catch (e) { errs.push(e.message); } }
  }
  return errs;
}

/** a new, empty channel folder with every file a channel needs, ready to fill in */
export function scaffoldChannel({ id, name, handle, about = '', cfg }) {
  if (!ID_RE.test(id)) throw new Error(`channel id "${id}": lowercase letters, digits, dashes (2-40 chars, starts with a letter)`);
  if (!name) throw new Error('a channel needs a --name (ask the owner what to call it)');
  const dir = path.join(cfg.channelsDir, id);
  if (fs.existsSync(dir)) throw new Error(`${dir} already exists`);
  for (const d of ['templates', 'characters', 'audio']) fs.mkdirSync(path.join(dir, d), { recursive: true });
  const json = (f, v) => fs.writeFileSync(path.join(dir, f), JSON.stringify(v, null, 2) + '\n');
  const h = handle ? (handle.startsWith('@') ? handle : `@${handle}`) : null;
  json('channel.json', {
    id, name, handle: h, url: h ? `https://www.youtube.com/${h}` : null, instagram: null, about,
    cast: [], templates: [],
    defaults: { template: null, voice: null, speed: 1.0, music: 'bed', overrides: {} },
    publish: {
      targets: ['youtube', 'instagram'], tags: [], footer: '', links: [],
      youtube: { category: 'education', privacy: 'private', madeForKids: false, syntheticMedia: false, language: 'en' },
      instagram: { shareToFeed: true, thumbOffsetMs: 1500, hashtags: [] },
    },
  });
  json('series.json', { series: [] });
  json('backlog.json', { episodes: [] });
  fs.writeFileSync(path.join(dir, 'BIBLE.md'), `# ${name}: channel bible

Fill every section before the first episode. Every video for this channel follows it.

## Audience
## Promise (what a viewer gets from every video, in one line)
## Voice and tone
## Hook formulas (the first 2 seconds)
## Series
## Look (template, cast, palette, captions)
## Do
## Don't
## Thumbnails and titles
## Monetization notes
`);
  for (const d of ['templates', 'characters', 'audio']) fs.writeFileSync(path.join(dir, d, '.gitkeep'), '');
  return dir;
}
