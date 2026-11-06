// Templates and projects: list, validate, create.
import path from 'node:path';
import { listTemplates, loadTemplate, validateTemplate } from '../lib/templates.mjs';
import { createProject, listProjects } from '../lib/project.mjs';
import { loadChannel } from '../lib/channels.mjs';
import { getEpisode, episodeStatus } from '../lib/backlog.mjs';
import { readJson } from '../lib/config.mjs';
import fs from 'node:fs';

export const commands = [
  {
    name: 'templates', group: 'projects', summary: 'list the video templates (--validate checks them)',
    usage: 'templates [--validate] [--json]',
    options: { validate: { type: 'boolean' }, json: { type: 'boolean' } },
    run({ values, cfg }) {
      const all = listTemplates(cfg);
      if (values.json) { console.log(JSON.stringify(all.map((t) => ({ ...t.manifest, dir: t.dir })), null, 2)); return 0; }
      let bad = 0;
      for (const t of all) {
        const m = t.manifest;
        console.log(`${t.id.padEnd(13)} ${(m.player?.renderer || '?').toUpperCase()}  ${m.title}  ·  ${m.format?.length || ''}${t.owner ? `  ·  channel ${t.owner} only` : ''}\n${' '.repeat(18)}${m.description}`);
        if (values.validate) { const errs = validateTemplate(t); bad += errs.length; for (const e of errs) console.log(`${' '.repeat(18)}✗ ${e}`); }
      }
      if (values.validate) console.log(bad ? `${bad} problem(s)` : `all ${all.length} templates valid`);
      return bad ? 1 : 0;
    },
  },
  {
    name: 'new', group: 'projects', summary: "start a video from a template's example (renders immediately); --channel applies a channel's cast and defaults",
    usage: 'new <template> <name> | new <name> --channel <id> | new --channel <id> --from-backlog <episode> [--template t] [--title "..."] [--dir <parent>]',
    options: { title: { type: 'string' }, dir: { type: 'string' }, channel: { type: 'string' }, template: { type: 'string' }, 'from-backlog': { type: 'string' } },
    run({ positionals, values, cfg }) {
      const channel = values.channel ? loadChannel(values.channel, cfg) : null;
      const ep = values['from-backlog'] && (channel ? getEpisode(channel, values['from-backlog']) : (() => { throw new Error('--from-backlog needs --channel'); })());
      if (ep && episodeStatus(ep, channel, cfg).status !== 'idea') throw new Error(`episode "${ep.id}" already has a project (studio backlog --channel ${channel.id})`);
      const name = ep ? ep.id : positionals.length > 1 ? positionals[1] : positionals[0];
      if (ep) values.title ||= ep.title;
      const tid = !ep && positionals.length > 1 ? positionals[0] : values.template || channel?.manifest.defaults?.template;
      if (!tid || !name) throw new Error('usage: studio new <template> <name>   or   studio new <name> --channel <id>');
      const t = loadTemplate(tid, cfg);
      const dir = createProject({ template: t, name, title: values.title, cfg, parent: values.dir && path.resolve(values.dir), channel });
      if (ep) {
        const sf = path.join(dir, 'script.json'), script = readJson(sf);
        Object.assign(script, { title: ep.title, sources: ep.sources || [], episode: ep.id, ...(ep.series && { series: ep.series }) });
        fs.writeFileSync(sf, JSON.stringify(script, null, 2) + '\n');
      }
      const cast = channel ? ` · channel: ${channel.id} · cast: ${(channel.manifest.cast || []).join(', ') || '-'}` : '';
      const read = [channel && path.relative(cfg.root, path.join(channel.dir, 'BIBLE.md')), path.relative(cfg.root, path.join(t.dir, 'STYLE.md')), channel?.manifest.cast?.length && "each cast member's CHARACTER.md"].filter(Boolean);
      console.log(`${dir}\ntemplate: ${tid}${cast}. Read ${read.join(', ')}, then rewrite script.json + src/shots.js`);
      return 0;
    },
  },
  {
    name: 'list', group: 'projects', summary: "list your projects (--channel: one channel's only)",
    usage: 'list [--channel <id>]',
    options: { channel: { type: 'string' } },
    run({ values, cfg }) {
      const ps = listProjects(cfg, { channel: values.channel });
      if (!ps.length) console.log(`no projects yet${values.channel ? ` for ${values.channel}` : ''}. Create one: studio new <name> --channel <id>`);
      for (const p of ps) console.log(`${p.ref.padEnd(36)} ${p.manifest.template.padEnd(14)} ${p.manifest.title || ''}`);
      return 0;
    },
  },
];
