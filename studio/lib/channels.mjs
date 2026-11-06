// Channels: a brand with its own cast and defaults.
//   channels/<id>/channel.json  {
//     id, name, handle, url, about,
//     cast: ["sakumai", ...]                 character IDs that appear on this channel
//     defaults: { template, voice, speed, music, overrides: { captions, player, ... } }
//     publish:  { category, privacy, tags, footer }
//   }
// A project made with --channel gets the channel's template, voice, music, cast and look; the project's own
// overrides still win over the channel's.
import fs from 'node:fs';
import path from 'node:path';
import { readJson } from './config.mjs';
import { listTemplates } from './templates.mjs';
import { listCharacters, ID_RE } from './characters.mjs';

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

export function validateChannel(ch, cfg) {
  const m = ch.manifest, errs = [];
  if (!ID_RE.test(ch.id)) errs.push(`id "${ch.id}": lowercase letters, digits, dashes`);
  if (m.id !== ch.id) errs.push(`channel.json id "${m.id}" must match its folder "${ch.id}"`);
  if (!m.name) errs.push('needs a "name"');
  const chars = new Set(listCharacters(cfg).map((c) => c.id));
  for (const id of m.cast || []) if (!chars.has(id)) errs.push(`cast member "${id}" is not in characters/`);
  const t = m.defaults?.template;
  if (t && !listTemplates(cfg).some((x) => x.id === t)) errs.push(`default template "${t}" does not exist`);
  return errs;
}
