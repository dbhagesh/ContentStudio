// Characters and channels: the permanent cast and the brands that use it.
import fs from 'node:fs';
import path from 'node:path';
import { listCharacters, loadCharacter, validateCharacter, castEntry, castMounts, characterChannels } from '../lib/characters.mjs';
import { listChannels, loadChannel, validateChannel, channelTemplates, scaffoldChannel } from '../lib/channels.mjs';
import { createOverlay } from '../lib/overlay.mjs';
import { ENGINE_DIR } from '../lib/paths.mjs';
import { withSession } from '../render/session.mjs';
import * as modes from '../render/modes.mjs';

/** a bare stage for drawing one character outside any video (model sheets, tests) */
export function characterStage(c, cfg) {
  return {
    dir: c.dir, name: c.id, isExample: true,
    overlay: createOverlay([ENGINE_DIR], { mounts: castMounts([c]) }),
    runtime: {
      id: 'character', title: c.manifest.name, format: {}, player: {}, captions: {}, engine3d: {}, sheet: {},
      fonts: [{ family: 'Inter', weight: 900, file: 'fonts/Inter-Black.otf' }, { family: 'Inter', weight: 800, file: 'fonts/Inter-ExtraBold.otf' }],
      cast: [castEntry(c)],
    },
  };
}

/** the stage for a channel's profile picture: its avatar settings, its cast, and its brand/ folder at /brand/ */
export function avatarStage(ch, cfg) {
  const a = ch.manifest.brand?.avatar;
  if (!a) throw new Error(`channel "${ch.id}" has no "brand": { "avatar": { … } } in channel.json (studio help avatar)`);
  if (a.character && !(ch.manifest.cast || []).includes(a.character)) throw new Error(`avatar character "${a.character}" is not in ${ch.id}'s cast`);
  const chars = a.character ? [loadCharacter(a.character, cfg)] : [];
  return {
    dir: ch.dir, name: `${ch.id}-avatar`, isExample: true,
    overlay: createOverlay([ENGINE_DIR], { mounts: { ...castMounts(chars), '/brand/': path.join(ch.dir, 'brand') } }),
    runtime: { id: 'avatar', title: ch.manifest.name, format: {}, player: {}, captions: {}, engine3d: {}, sheet: {}, avatar: a,
      fonts: [{ family: 'Inter', weight: 900, file: 'fonts/Inter-Black.otf' }], cast: chars.map(castEntry) },
  };
}

function report(items, validate, describe) {
  let bad = 0;
  for (const it of items) {
    console.log(describe(it));
    if (validate) { const errs = validate(it); bad += errs.length; for (const e of errs) console.log(`${' '.repeat(16)}✗ ${e}`); }
  }
  return bad;
}

export const commands = [
  {
    name: 'characters', group: 'cast', summary: 'list the permanent characters (--validate checks them)',
    usage: 'characters [--validate] [--json]',
    options: { validate: { type: 'boolean' }, json: { type: 'boolean' } },
    run({ values, cfg }) {
      const all = listCharacters(cfg);
      if (values.json) { console.log(JSON.stringify(all.map((c) => c.manifest), null, 2)); return 0; }
      if (!all.length) { console.log(`no characters yet in ${cfg.charactersDir}`); return 0; }
      const bad = report(all, values.validate && validateCharacter, (c) => {
        const m = c.manifest;
        return `${c.id.padEnd(14)} v${m.version}  ${m.name}  ·  channels: ${characterChannels(c).join(', ') || 'any'}\n${' '.repeat(16)}${m.description || ''}\n${' '.repeat(16)}${m.expressions?.length || 0} expressions · ${m.poses?.length || 0} poses · outfits: ${(m.outfits || []).join(', ')}`;
      });
      if (values.validate) console.log(bad ? `${bad} problem(s)` : `all ${all.length} characters valid`);
      return bad ? 1 : 0;
    },
  },
  {
    name: 'character-sheet', group: 'cast', summary: "render a character's model sheet from its code (default: characters/<id>/sheet.png)",
    usage: 'character-sheet <id> [out.png]',
    async run({ positionals: [id, out], cfg }) {
      if (!id) throw new Error('which character? (studio characters)');
      const c = loadCharacter(id, cfg), file = out ? path.resolve(out) : path.join(c.dir, 'sheet.png');
      await withSession(characterStage(c, cfg), cfg, (s) => modes.stylesheet(s, file), { page: 'character', query: `id=${encodeURIComponent(id)}` });
      console.log(file);
    },
  },
  {
    name: 'avatar', group: 'cast', summary: "render a channel's profile picture from code (channel.json brand.avatar) → brand/avatar.png",
    usage: 'avatar --channel <id> [--size 800]',
    details: 'Writes <channel>/brand/avatar.png (square, what you upload; every platform crops it to a circle) and brand/avatar-preview.png (that circle, to check the crop). Settings: engine/src/core/avatar.js. The mascot is drawn by its own character code, as in the videos.',
    options: { channel: { type: 'string' }, size: { type: 'string' } },
    async run({ values, cfg }) {
      if (!values.channel) throw new Error('which channel? --channel <id>');
      const ch = loadChannel(values.channel, cfg), stage = avatarStage(ch, cfg);
      if (values.size) stage.runtime.avatar = { ...stage.runtime.avatar, size: +values.size };
      const dir = path.join(ch.dir, 'brand'), files = [path.join(dir, 'avatar.png'), path.join(dir, 'avatar-preview.png')];
      fs.mkdirSync(dir, { recursive: true });
      for (const [f, q] of [[files[0], ''], [files[1], 'preview=1']]) {
        await withSession(stage, cfg, async (s) => { await modes.stylesheet(s, f); if (s.logs.length) throw new Error(s.logs.join('\n')); }, { page: 'avatar', query: q });
      }
      console.log(files.join('\n'));
    },
  },
  {
    name: 'channels', group: 'cast', summary: 'list the channels and their cast (--validate checks them)',
    usage: 'channels [--validate]',
    options: { validate: { type: 'boolean' } },
    run({ values, cfg }) {
      const all = listChannels(cfg);
      if (!all.length) { console.log(`no channels yet in ${cfg.channelsDir}`); return 0; }
      const bad = report(all, values.validate && ((ch) => validateChannel(ch, cfg)), (ch) => {
        const m = ch.manifest, d = m.defaults || {};
        return `${ch.id.padEnd(14)} ${m.name} ${m.handle || ''}  ·  cast: ${(m.cast || []).join(', ') || '-'}\n${' '.repeat(16)}templates ${channelTemplates(ch, cfg).map((t) => t.id + (t.id === d.template ? '*' : '')).join(', ') || '-'} · voice ${d.voice || '-'} · music ${d.music || '-'}${m.url ? ' · ' + m.url : ''}`;
      });
      if (values.validate) console.log(bad ? `${bad} problem(s)` : `all ${all.length} channels valid`);
      return bad ? 1 : 0;
    },
  },
  {
    name: 'channel-new', group: 'cast', summary: 'create a new channel folder (channel.json, BIBLE.md, series, backlog, own templates/characters)',
    usage: 'channel-new <id> --name "Channel Name" [--handle @Handle] [--about "..."]',
    options: { name: { type: 'string' }, handle: { type: 'string' }, about: { type: 'string' } },
    run({ positionals: [id], values, cfg }) {
      const dir = scaffoldChannel({ id, name: values.name, handle: values.handle, about: values.about, cfg });
      console.log(`${dir}\nnext: fill BIBLE.md, add its cast (channels/${id}/characters/) and templates (channels/${id}/templates/ or shared ones in "templates"), then studio channels --validate`);
      return 0;
    },
  },
];
