// Character library. A character is a permanent, reusable cast member with a stable ID:
//   characters/<id>/character.json   manifest: id, name, version, palette, expressions, poses, outfits, voice
//   characters/<id>/character.js     the ONE drawing code every video uses (export default { draw, ... })
//   characters/<id>/CHARACTER.md     the bible: look rules, personality, do / don't
//   characters/<id>/sheet.png        model sheet rendered from the code (studio character-sheet <id>)
// Shared characters live in characters/<id>/; a channel's own cast in channels/<ch>/characters/<id>/ (see library.mjs).
// A character appears only on its channels: the owner, or the ones its character.json "channels" lists.
// A video's cast is served read-only at /characters/<id>/... (castMounts) and can't be overridden per project, so a
// character looks the same in every video. Improving one = editing it and bumping its version.
import fs from 'node:fs';
import path from 'node:path';
import { libraryRoots, scanLibrary, duplicateIds } from './library.mjs';

export const ID_RE = /^[a-z][a-z0-9-]{1,39}$/;
export const SEMVER_RE = /^\d+\.\d+\.\d+$/;

/** every character: { id, dir, owner (channel id, or null when shared), manifest } */
export function listCharacters(cfg) {
  return scanLibrary(libraryRoots(cfg, 'characters', [cfg.charactersDir]), 'character.json');
}

export const duplicateCharacters = (cfg) => duplicateIds(listCharacters(cfg));

/** the channels a character may appear on (empty = any) */
export function characterChannels(c) {
  const listed = Array.isArray(c.manifest.channels) ? c.manifest.channels : [];
  return c.owner ? [...new Set([c.owner, ...listed])] : listed;
}

export const canAppearOn = (c, channelId) => { const ok = characterChannels(c); return !ok.length || ok.includes(channelId); };

/** overlay mounts that serve exactly these characters at /characters/<id>/ and nothing else under /characters/ */
export function castMounts(chars) {
  const m = Object.fromEntries(chars.map((c) => [`/characters/${c.id}/`, c.dir]));
  m['/characters/'] = path.join(chars[0]?.dir || '/', '.not-in-cast');
  return m;
}

export function loadCharacter(id, cfg) {
  const all = listCharacters(cfg), c = all.find((x) => x.id === id);
  if (!c) throw new Error(`no character "${id}". Available: ${all.map((x) => x.id).join(', ') || '(none)'}`);
  return c;
}

export function validateCharacter(c) {
  const m = c.manifest, errs = [];
  if (!ID_RE.test(c.id)) errs.push(`id "${c.id}": lowercase letters, digits, dashes (2-40 chars, starts with a letter)`);
  if (m.id !== c.id) errs.push(`character.json id "${m.id}" must match its folder "${c.id}"`);
  if (!m.name) errs.push('needs a "name"');
  if (!SEMVER_RE.test(m.version || '')) errs.push(`version must look like 1.0.0 (got ${JSON.stringify(m.version)})`);
  if (m.kind !== 'canvas2d') errs.push(`kind must be "canvas2d" (got ${JSON.stringify(m.kind)})`);
  if (!fs.existsSync(path.join(c.dir, m.module || 'character.js'))) errs.push(`missing ${m.module || 'character.js'}`);
  if (!fs.existsSync(path.join(c.dir, 'CHARACTER.md'))) errs.push('missing CHARACTER.md (the character bible)');
  for (const k of ['expressions', 'poses', 'outfits']) if (!Array.isArray(m[k]) || !m[k].length) errs.push(`needs a non-empty "${k}" list`);
  return errs;
}

/** what the browser receives in config.cast: where to import each character from, and which version */
export function castEntry(c) {
  return { id: c.id, name: c.manifest.name, version: c.manifest.version, module: `characters/${c.id}/${c.manifest.module || 'character.js'}` };
}

/** a project's pinned cast versions vs the library now: [{ id, pinned, current, level: 'major' | 'minor' }] */
export function castDrift(pinned = {}, cfg) {
  const out = [];
  for (const [id, v] of Object.entries(pinned)) {
    const cur = loadCharacter(id, cfg).manifest.version;
    if (cur === v) continue;
    out.push({ id, pinned: v, current: cur, level: cur.split('.')[0] !== String(v).split('.')[0] ? 'major' : 'minor' });
  }
  return out;
}
