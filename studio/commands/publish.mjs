// Delivery: share copies, temporary hosting, and posting to the platforms through the exporters
// (studio/publish/exporters/). Credentials are per channel. `publish` only posts with --yes; without it, it shows
// exactly what would be sent.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadProject } from '../lib/project.mjs';
import { listChannels, loadChannel } from '../lib/channels.mjs';
import { readJson } from '../lib/config.mjs';
import { HOSTS, hostFile } from '../publish/hosts.mjs';
import { loadExporters, getExporter } from '../publish/exporters/index.mjs';
import { deleteSecret } from '../publish/secrets.mjs';

const list = (s) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []);
const openUrl = (u) => spawnSync(process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open', [u], { stdio: 'ignore' });
const baseCtx = (cfg, channel, extra = {}) => ({ cfg, channel, fetch: globalThis.fetch, log: (m) => console.log(m), ...extra });

/** past posts of a project, from project.json "publish.history" */
export const history = (manifest) => manifest.publish?.history || [];

export function recordPublish(projectDir, entry) {
  const f = path.join(projectDir, 'project.json'), m = readJson(f);
  m.publish = { ...(m.publish || {}), history: [...history(m), entry] };
  fs.writeFileSync(f, JSON.stringify(m, null, 2) + '\n');
}

/** files the render depends on that changed after it was made */
export function staleInputs(p, file) {
  const t = fs.statSync(file).mtimeMs;
  return ['script.json', 'src/shots.js', 'data/mix.wav', 'project.json'].filter((f) => f !== 'project.json' && fs.existsSync(path.join(p.dir, f)) && fs.statSync(path.join(p.dir, f)).mtimeMs > t);
}

export const commands = [
  {
    name: 'share', group: 'publish', summary: 'a smaller share copy of the render (for files over ~35 MB)',
    usage: 'share <project> [--crf 21]',
    options: { crf: { type: 'string' } },
    run({ positionals: [ref], values, cfg }) {
      const p = loadProject(ref, cfg), src = path.join(p.dir, `renders/${p.name}.mp4`), out = path.join(p.dir, `renders/${p.name}-share.mp4`);
      if (!fs.existsSync(src)) throw new Error(`render it first: studio render ${p.name}`);
      const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-c:v', 'libx264', '-crf', values.crf || '21', '-preset', 'slow', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out], { stdio: 'inherit' });
      if (r.status) throw new Error('ffmpeg failed');
      console.log(`${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
    },
  },
  {
    name: 'host', group: 'publish', summary: 'put a file on a temporary public host and verify the raw URL',
    usage: `host <file|project> [--host ${Object.keys(HOSTS).join('|')}] [--expiry 1h]`,
    details: Object.entries(HOSTS).map(([k, h]) => `${k}: expires ${h.expires}, up to ${h.maxMB} MB`).join('\n'),
    options: { host: { type: 'string' }, expiry: { type: 'string' } },
    async run({ positionals: [ref], values, cfg }) {
      let file = ref && path.resolve(ref);
      if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { const p = loadProject(ref, cfg); file = path.join(p.dir, `renders/${p.name}.mp4`); }
      const host = values.host || cfg.publish.host;
      if (HOSTS[host]?.permanent) console.log(`note: ${host} keeps the file public forever`);
      const r = await hostFile(file, { host, expiry: values.expiry || cfg.publish.expiry });
      console.log(`${r.url}\n(${r.host}, expires ${r.expires}; verified: serves the raw video)`);
    },
  },
  {
    name: 'accounts', group: 'publish', summary: 'which platforms each channel is connected to (no secrets shown)',
    usage: 'accounts [--channel id]',
    options: { channel: { type: 'string' } },
    async run({ values, cfg }) {
      const exps = await loadExporters(), chans = values.channel ? [loadChannel(values.channel, cfg)] : listChannels(cfg);
      for (const ch of chans) {
        console.log(`${ch.id} (${ch.manifest.name})`);
        for (const ex of exps.values()) { const s = ex.status(baseCtx(cfg, ch)); console.log(`  ${s.connected ? '✓' : '✗'} ${ex.title.padEnd(10)} ${s.detail}`); }
      }
      if (!chans.length) console.log('no channels yet');
    },
  },
  {
    name: 'connect', group: 'publish', summary: 'connect a channel to a platform (YouTube: browser sign-in · Instagram: access token)',
    usage: 'connect <youtube|instagram> --channel <id> [--client-secret file.json] [--token-file file] [--any-account] [--no-open]',
    details: 'Credentials are stored in .studio/secrets/ (this computer only, owner-readable only).',
    options: { channel: { type: 'string' }, 'client-secret': { type: 'string' }, 'token-file': { type: 'string' }, 'any-account': { type: 'boolean' }, 'no-open': { type: 'boolean' } },
    async run({ positionals: [id], values, cfg }) {
      if (!id || !values.channel) throw new Error('usage: studio connect <youtube|instagram> --channel <id>');
      const ex = await getExporter(id), ch = loadChannel(values.channel, cfg);
      const token = values['token-file'] ? fs.readFileSync(path.resolve(values['token-file']), 'utf8').trim() : process.env.STUDIO_INSTAGRAM_TOKEN;
      const acc = await ex.connect(baseCtx(cfg, ch, { open: values['no-open'] ? null : openUrl }), {
        clientSecret: values['client-secret'] && path.resolve(values['client-secret']), token, anyAccount: values['any-account'],
      });
      console.log(`✓ ${ex.title} connected for channel "${ch.id}": ${acc.title}${acc.handle && acc.handle !== acc.title ? ' ' + acc.handle : ''}`);
      if (values['token-file']) console.log(`(you can delete ${values['token-file']} now; the token is stored in .studio/secrets/)`);
    },
  },
  {
    name: 'disconnect', group: 'publish', summary: "forget a channel's credentials for a platform",
    usage: 'disconnect <youtube|instagram> --channel <id>',
    options: { channel: { type: 'string' } },
    async run({ positionals: [id], values, cfg }) {
      const ex = await getExporter(id), ch = loadChannel(values.channel, cfg);
      deleteSecret(cfg, `channels/${ch.id}/${ex.id}`);
      console.log(`${ex.title} disconnected for "${ch.id}" (also revoke access on the platform if you want it fully removed)`);
    },
  },
  {
    name: 'publish', group: 'publish', summary: 'post a rendered video (shows the plan; posts only with --yes)',
    usage: 'publish <project> --to youtube,instagram [--yes] [--privacy private|unlisted|public] [--publish-at ISO] [--file f.mp4] [--force]',
    details: 'Without --yes nothing is sent: it prints exactly what each platform would receive.\n--force allows posting again to a platform this project was already posted to.',
    options: { to: { type: 'string' }, yes: { type: 'boolean' }, privacy: { type: 'string' }, 'publish-at': { type: 'string' }, file: { type: 'string' }, force: { type: 'boolean' } },
    async run({ positionals: [ref], values, cfg }) {
      const p = loadProject(ref, cfg);
      if (!p.channel) throw new Error(`project "${p.name}" has no channel: publishing uses a channel's accounts (set "channel" in project.json)`);
      const file = path.resolve(values.file || path.join(p.dir, `renders/${p.name}.mp4`));
      if (!fs.existsSync(file)) throw new Error(`no render at ${file}: studio build ${p.name}`);
      const stale = staleInputs(p, file);
      if (stale.length) throw new Error(`the render is older than ${stale.join(', ')}: rebuild (studio build ${p.name} --from check) before publishing`);
      const targets = list(values.to).length ? list(values.to) : p.channel.manifest.publish?.targets || [];
      if (!targets.length) throw new Error('where to? --to youtube,instagram');
      const plans = [];
      let blocked = 0;
      for (const id of targets) {
        const ex = await getExporter(id);
        const ctx = baseCtx(cfg, p.channel, { project: p.manifest, script: p.script(), template: p.template, file, overrides: { privacy: values.privacy, publishAt: values['publish-at'] } });
        const plan = ex.plan(ctx), st = ex.status(ctx), prev = history(p.manifest).filter((h) => h.to === id);
        console.log(`\n── ${ex.title} → ${p.channel.manifest.name} (${st.connected ? st.detail : 'NOT CONNECTED'})`);
        console.log(`   ${plan.summary}`);
        console.log(JSON.stringify(plan.body || plan.params, null, 2).replace(/^/gm, '   '));
        const problems = [...plan.problems];
        if (!st.connected) problems.push(`not connected: ${ex.needs.join(' → ')}`);
        if (prev.length && !values.force) problems.push(`already posted: ${prev.map((h) => h.url).join(', ')} (--force to post again)`);
        for (const pr of problems) console.log(`   ✗ ${pr}`);
        blocked += problems.length;
        plans.push({ ex, ctx, plan, ok: !problems.length });
      }
      if (!values.yes) { console.log(`\nNothing was posted. ${blocked ? 'Fix the ✗ items, then r' : 'R'}e-run with --yes to publish.`); return blocked ? 1 : 0; }
      if (blocked) throw new Error('not publishing: fix the ✗ items above first');
      for (const { ex, ctx, plan } of plans) {
        const r = await ex.publish(ctx, plan);
        recordPublish(p.dir, { to: ex.id, id: r.id, url: r.url, privacy: r.privacy, at: new Date().toISOString(), file: path.relative(p.dir, file) });
        console.log(`✓ ${ex.title}: ${r.url} (${r.privacy})`);
      }
    },
  },
];
