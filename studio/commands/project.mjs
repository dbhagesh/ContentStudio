// Templates and projects: list, validate, create.
import path from 'node:path';
import { listTemplates, loadTemplate, validateTemplate } from '../lib/templates.mjs';
import { createProject, listProjects } from '../lib/project.mjs';
import { loadChannel } from '../lib/channels.mjs';

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
        console.log(`${t.id.padEnd(13)} ${(m.player?.renderer || '?').toUpperCase()}  ${m.title}  ·  ${m.format?.length || ''}\n${' '.repeat(18)}${m.description}`);
        if (values.validate) { const errs = validateTemplate(t); bad += errs.length; for (const e of errs) console.log(`${' '.repeat(18)}✗ ${e}`); }
      }
      if (values.validate) console.log(bad ? `${bad} problem(s)` : `all ${all.length} templates valid`);
      return bad ? 1 : 0;
    },
  },
  {
    name: 'new', group: 'projects', summary: "start a video from a template's example (renders immediately); --channel applies a channel's cast and defaults",
    usage: 'new <template> <name> | new <name> --channel <id> [--template t] [--title "..."] [--dir <parent>]',
    options: { title: { type: 'string' }, dir: { type: 'string' }, channel: { type: 'string' }, template: { type: 'string' } },
    run({ positionals, values, cfg }) {
      const channel = values.channel ? loadChannel(values.channel, cfg) : null;
      const name = positionals.length > 1 ? positionals[1] : positionals[0];
      const tid = positionals.length > 1 ? positionals[0] : values.template || channel?.manifest.defaults?.template;
      if (!tid || !name) throw new Error('usage: studio new <template> <name>   or   studio new <name> --channel <id>');
      const t = loadTemplate(tid, cfg);
      const dir = createProject({ template: t, name, title: values.title, cfg, parent: values.dir && path.resolve(values.dir), channel });
      const cast = channel ? ` · channel: ${channel.id} · cast: ${(channel.manifest.cast || []).join(', ') || '-'}` : '';
      console.log(`${dir}\ntemplate: ${tid}${cast}. Read ${path.relative(cfg.root, path.join(t.dir, 'STYLE.md'))}${channel ? ' and characters/<id>/CHARACTER.md' : ''}, then rewrite script.json + src/shots.js`);
      return 0;
    },
  },
  {
    name: 'list', group: 'projects', summary: 'list your projects',
    usage: 'list',
    run({ cfg }) {
      const ps = listProjects(cfg);
      if (!ps.length) console.log(`no projects yet in ${cfg.projectsDir}. Create one: studio new <template> <name>`);
      for (const p of ps) console.log(`${p.name.padEnd(28)} ${p.manifest.template.padEnd(13)} ${(p.manifest.channel || '-').padEnd(12)} ${p.manifest.title || ''}`);
      return 0;
    },
  },
];
