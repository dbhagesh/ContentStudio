// Working on one channel: its backlog of episodes and the quality gate.
import { loadChannel } from '../lib/channels.mjs';
import { loadProject } from '../lib/project.mjs';
import { loadBacklog, loadSeries, episodeStatus, addEpisode, STATUSES } from '../lib/backlog.mjs';
import { lintAll, formatLint } from '../lib/lint.mjs';

export const commands = [
  {
    name: 'backlog', group: 'channel', summary: "a channel's episodes and where each one is (idea → making → rendered → posted)",
    usage: 'backlog --channel <id> [--status idea|making|rendered|posted] [--series <id>]',
    options: { channel: { type: 'string' }, status: { type: 'string' }, series: { type: 'string' } },
    run({ values, cfg }) {
      if (!values.channel) throw new Error('which channel? --channel <id> (studio channels)');
      const ch = loadChannel(values.channel, cfg), series = new Map(loadSeries(ch).series.map((s) => [s.id, s.name]));
      if (values.status && !STATUSES.includes(values.status)) throw new Error(`--status is one of ${STATUSES.join(', ')}`);
      const eps = loadBacklog(ch).episodes.map((e) => ({ ...e, ...episodeStatus(e, ch, cfg) }))
        .filter((e) => (!values.status || e.status === values.status) && (!values.series || e.series === values.series));
      if (!eps.length) { console.log(`nothing in ${ch.id}'s backlog${values.status ? ` with status ${values.status}` : ''}`); return 0; }
      for (const e of eps) console.log(`${e.status.padEnd(9)} ${e.id.padEnd(30)} ${e.title}${e.series ? `  ·  ${series.get(e.series) || e.series}` : ''}${e.posted ? `  ·  on ${e.posted.join(', ')}` : ''}`);
      const counts = STATUSES.map((s) => `${eps.filter((e) => e.status === s).length} ${s}`).join(' · ');
      console.log(`\n${counts}\nstart one: studio new --channel ${ch.id} --from-backlog <id>`);
      return 0;
    },
  },
  {
    name: 'backlog-add', group: 'channel', summary: "add an episode idea to a channel's backlog",
    usage: 'backlog-add --channel <id> --id <episode-id> --title "..." [--series s] [--hook "..."] [--twist "..."] [--source "..."]...',
    options: { channel: { type: 'string' }, id: { type: 'string' }, title: { type: 'string' }, series: { type: 'string' }, hook: { type: 'string' }, twist: { type: 'string' }, source: { type: 'string', multiple: true } },
    run({ values, cfg }) {
      if (!values.channel) throw new Error('which channel? --channel <id>');
      const ch = loadChannel(values.channel, cfg);
      addEpisode(ch, { id: values.id, title: values.title, series: values.series, hook: values.hook, twist: values.twist, sources: values.source });
      console.log(`added ${values.id} to ${ch.id}'s backlog`);
      return 0;
    },
  },
  {
    name: 'lint', group: 'channel', summary: 'the quality gate: title, description, sources, hook, pace, captions, originality, clipped / overlapping text',
    usage: 'lint <project> [--no-picture]',
    details: 'The picture rules draw every frame in headless Chrome (every quality.textStep s) and catch text cut off by the frame edge, and text over the captions or over other text. --no-picture runs only the script rules (instant).',
    options: { 'no-picture': { type: 'boolean' } },
    async run({ positionals: [ref], values, cfg }) {
      const p = loadProject(ref, cfg), r = await lintAll(p, cfg, { picture: !values['no-picture'] });
      if (r.errors.length || r.warnings.length) console.log(formatLint(r));
      console.log(r.errors.length ? `${r.errors.length} error(s): fix before building` : `LINT OK${p.channel ? '' : ' (no channel: scratch rules)'}`);
      return r.errors.length ? 1 : 0;
    },
  },
];
