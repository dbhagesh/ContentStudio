// The working loop: brief (before planning) → plan (before building) → status (where every video is).
import fs from 'node:fs';
import path from 'node:path';
import { readJson } from '../lib/config.mjs';
import { listChannels, loadChannel, channelTemplates } from '../lib/channels.mjs';
import { loadCharacter } from '../lib/characters.mjs';
import { loadTemplate } from '../lib/templates.mjs';
import { loadProject, listProjects } from '../lib/project.mjs';
import { loadBacklog, loadSeries, getEpisode, episodeStatus, STATUSES } from '../lib/backlog.mjs';
import { lintScript, lintProject, captionChunks, formatLint } from '../lib/lint.mjs';
import { qualityFor, estimateTiming, untouched, timingFor, progress, formatStages } from '../lib/workflow.mjs';

const SKILL_REFS = '.claude/skills/content-studio/references';
const words = (s) => (s.match(/[A-Za-z0-9']+/g) || []).length;

/** the thresholds worth knowing while writing, in one line */
function rules(q) {
  return [`title ≤ ${q.titleWarn} chars`, `hook ≤ ${q.hookMaxS} s`, `${q.wpsMin}-${q.wpsMax} words/s`, `a cut every ≤ ${q.lineMaxS} s`,
    `captions ≤ ${q.captionMaxWords} words, one *highlight`, `≥ ${q.minTags} tags`, `≥ ${q.minSources} sources`,
    Array.isArray(q.lengthS) && `length ${q.lengthS[0]}-${q.lengthS[1]} s`, 'no clipped or overlapping text'].filter(Boolean).join(' · ');
}

export const commands = [
  {
    name: 'brief', group: 'workflow', summary: 'everything to know before planning a video, and what to read, in order',
    usage: 'brief --channel <id> [--episode <id>] [--template <t>] [--compact]   |   brief <project> [--compact]',
    details: 'Run it first for every video: it names the channel, episode, series, template, cast, voice and the quality rules, then lists the files to read in full before writing the plan.\n--compact (routine episodes of an established series): prints the channel\'s BRIEF.md digest inline in place of BIBLE.md, and skips the style sheets, model sheets and quality.md, so reading drops to the template\'s STYLE.md and the cast. Use the full brief for a pilot, a new series, a new template or kit work.',
    options: { channel: { type: 'string' }, episode: { type: 'string' }, template: { type: 'string' }, compact: { type: 'boolean' } },
    run({ positionals: [ref], values, cfg }) {
      const p = ref ? loadProject(ref, cfg) : null;
      const ch = p ? p.channel : values.channel ? loadChannel(values.channel, cfg) : null;
      if (!ch) throw new Error(p ? `${p.ref} has no channel: a brief is for channel videos` : 'which channel? --channel <id> (studio channels)');
      const m = ch.manifest, script = p?.script();
      const epId = values.episode || script?.episode || (p && loadBacklog(ch).episodes.some((e) => e.id === p.name) ? p.name : null);
      const ep = epId ? getEpisode(ch, epId) : null;
      const series = loadSeries(ch).series.find((s) => s.id === (ep?.series || script?.series));
      const tid = p?.template.id || values.template || m.defaults?.template;
      const t = tid ? loadTemplate(tid, cfg) : null;
      const cast = (m.cast || []).map((id) => loadCharacter(id, cfg));
      const out = [`BRIEF  ${m.name}${m.handle ? ` (${m.handle})` : ''}  ·  channel ${ch.id}`];
      if (m.about) out.push(`about:     ${m.about}`);
      if (ep) {
        const st = episodeStatus(ep, ch, cfg);
        out.push(`episode:   ${ep.id}  "${ep.title}"  ·  ${st.status}${st.posted ? ` on ${st.posted.join(', ')}` : ''}`);
        for (const k of ['hook', 'twist', 'notes']) if (ep[k]) out.push(`  ${k}: ${ep[k]}`);
        if (ep.sources?.length) out.push(`  sources: ${ep.sources.length} to check (${ep.sources.map((s) => s.split(/[,(]/)[0].trim()).join('; ')})`);
      } else if (!p) out.push(`episode:   none picked (studio backlog --channel ${ch.id} --status idea)`);
      if (series) out.push(`series:    ${series.name}${series.format ? `: ${series.format}` : ''}${series.hookFormula ? `\n  hook formula: ${series.hookFormula}` : ''}`);
      if (t) out.push(`template:  ${t.id} (${(t.manifest.player?.renderer || '?').toUpperCase()})  ${t.manifest.title || ''}`);
      else out.push(`template:  no default; this channel may use ${channelTemplates(ch, cfg).map((x) => x.id).join(', ') || '(none yet)'} (--template)`);
      out.push(`cast:      ${cast.map((c) => `${c.id} v${c.manifest.version}${c.manifest.name ? ` (${c.manifest.name})` : ''}`).join(', ') || 'none'}`);
      const d = m.defaults || {};
      out.push(`sound:     voice ${script?.voice || d.voice || t?.manifest.voice || cfg.voice.voice} · speed ${script?.speed ?? d.speed ?? 1} · music ${script?.music || d.music || '-'}`);
      out.push(`rules:     ${rules(qualityFor(cfg, ch))}`);
      if (p) out.push(`project:   ${p.ref}  (${progress(p, p.template).next})`);
      const others = listProjects(cfg, { channel: ch.id }).filter((o) => o.dir !== p?.dir && (!series || readJson(path.join(o.dir, 'script.json'), {}).series === series.id));
      if (others.length) out.push(`made:      ${others.length} other ${series ? `${series.name} ` : ''}video(s); never repeat their phrasing: ${others.slice(-5).map((o) => `"${o.manifest.title}"`).join(', ')}`);

      const bible = path.join(ch.dir, 'BIBLE.md'), digest = path.join(ch.dir, 'BRIEF.md');
      const docs = [];
      if (values.compact) {
        // the digest inline in place of the bible; no images, no rubric (the rules line covers writing)
        const fresh = fs.existsSync(digest) && fs.statSync(digest).mtimeMs >= fs.statSync(bible).mtimeMs;
        if (fresh) out.push('', `CHANNEL BRIEF (${digest}):`, fs.readFileSync(digest, 'utf8').trim());
        else {
          out.push('', fs.existsSync(digest) ? '! BRIEF.md is older than BIBLE.md: update the digest (≤ 400 words, every hard rule kept), then use it' : '! no BRIEF.md yet: read BIBLE.md, then write the digest next to it (≤ 400 words, every hard rule kept)');
          docs.push([bible, 'the channel bible']);
        }
        if (t) docs.push([path.join(t.dir, 'STYLE.md'), 'the template: kit, palette, script format']);
        for (const c of cast) docs.push([path.join(c.dir, 'CHARACTER.md'), `${c.id}: look rules, expressions, poses`]);
        if (p) docs.push([path.join(p.dir, 'script.json'), 'the script so far'], [path.join(p.dir, 'src/shots.js'), 'the shots so far']);
      } else {
        docs.push([bible, 'the channel bible: audience, promise, tone, hooks, do / don\'t']);
        if (t) docs.push([path.join(t.dir, 'STYLE.md'), 'the template: kit, palette, script format'], [path.join(t.dir, 'style-sheet.png'), 'look at it']);
        for (const c of cast) docs.push([path.join(c.dir, 'CHARACTER.md'), `${c.id}: look rules, expressions, poses`], [path.join(c.dir, 'sheet.png'), 'look at it']);
        docs.push([path.join(cfg.root, SKILL_REFS, 'quality.md'), 'the bar the video is scored against']);
        if (p) docs.push([path.join(p.dir, 'script.json'), 'the script so far'], [path.join(p.dir, 'src/shots.js'), 'the shots so far']);
      }
      const toRead = docs.filter(([f]) => fs.existsSync(f));
      out.push('', toRead.length ? 'READ, IN THIS ORDER (in full, before planning):' : 'Nothing else to read: plan from this brief.');
      toRead.forEach(([f, why], i) => out.push(`  ${String(i + 1).padStart(2)}. ${f}\n      ${why}`));
      out.push('', `next: ${p ? `studio plan ${p.ref}` : ep ? `studio new --channel ${ch.id} --from-backlog ${ep.id}, write script.json, then studio plan` : `pick an episode, then studio brief --channel ${ch.id} --episode <id>`}`);
      console.log(out.join('\n'));
      return 0;
    },
  },
  {
    name: 'plan', group: 'workflow', summary: 'the plan screen from script.json: each cut with its captions, shot note and timing, the sources, the script rules',
    usage: 'plan <project>',
    details: 'Show it to the user and wait for "build it". A script line may carry "shot": what we see, what moves, the word it lands on. Timings are real once data/lines.json matches the script, estimated (≈) before.',
    run({ positionals: [ref], cfg }) {
      const p = loadProject(ref, cfg), script = p.script(), q = qualityFor(cfg, p.channel), lines = script.lines || [];
      const real = timingFor(p.dir, script), timed = !!real && !real.estimated;
      const T = timed ? real : estimateTiming(script), est = timed ? '' : '≈';
      const series = p.channel && loadSeries(p.channel).series.find((s) => s.id === script.series);
      const n = lines.reduce((a, l) => a + words(l.text), 0);
      const out = [`PLAN  ${p.ref}  ·  ${p.channel ? `channel ${p.channel.id}` : 'no channel'}${series ? `  ·  series ${series.name}` : ''}  ·  template ${p.template.id}`];
      if (untouched(p.dir, p.template, p.manifest.created).script) out.push('', '! script.json is still the template example: write this video\'s script first');
      out.push(`title:  "${script.title || ''}" (${(script.title || '').length} chars)`);
      out.push(`length: ${est}${T.duration.toFixed(1)} s · ${lines.length} cuts · ${n} words${Array.isArray(q.lengthS) ? ` (channel aims ${q.lengthS[0]}-${q.lengthS[1]} s)` : ''}${timed ? '' : ' · estimated: no voice timing for this script yet'}`);
      const shots = lines.some((l) => l.shot);
      out.push('', `NARRATION (one line per cut)${shots ? '' : '. Add a "shot" to each line (what we see, what moves, the word it lands on) to show the shot list here'}:`);
      lines.forEach((l, i) => {
        const tl = T.lines[i], len = tl.end - tl.start, flag = len > q.lineMaxS ? '  ← long: split it' : i === 0 && len > q.hookMaxS ? '  ← slow hook' : '';
        out.push(`  ${String(i + 1).padStart(2)}  ${est}${tl.start.toFixed(2).padStart(5)}  ${len.toFixed(1).padStart(4)} s  ${l.speaker ? `[${l.speaker}] ` : ''}${l.text}${flag}`);
        if (l.caps) out.push(`${' '.repeat(22)}${captionChunks(l.caps).map((c) => c.text).join(' | ')}`);
        if (shots) out.push(`${' '.repeat(22)}shot: ${l.shot || '(none yet)'}`);
      });
      out.push('', `SOURCES (${(script.sources || []).length}):`, ...(script.sources || []).map((s) => `  - ${s}`));
      if (script.description) out.push('', `description: ${script.description}`);
      if (script.tags?.length) out.push(`tags: ${script.tags.join(', ')}`);
      const r = lintScript({ script, lines: T, channel: p.channel?.manifest, quality: cfg.quality });
      const orig = lintProject(p, cfg).errors.filter((e) => /repeats|same title/.test(e));
      r.errors.push(...orig);
      if (!p.channel) { r.warnings.unshift(...r.errors); r.errors = []; }
      out.push('', r.errors.length || r.warnings.length ? `SCRIPT RULES${timed ? '' : ' (on estimated timing)'}:\n${formatLint(r)}` : 'SCRIPT RULES: OK');
      out.push('', `approved? studio build ${p.ref} --only timing, then write src/shots.js and studio build ${p.ref} --from lint`);
      console.log(out.join('\n'));
      return r.errors.length ? 1 : 0;
    },
  },
  {
    name: 'status', group: 'workflow', summary: 'where every video is (script → timing → shots → cues → mix → sheet → render → posted) and the next command',
    usage: 'status [--channel <id>] [--all]',
    details: '✓ done · ~ stale (older than what it was made from) · · to do. Ideas are counted; --all lists them too.',
    options: { channel: { type: 'string' }, all: { type: 'boolean' } },
    run({ values, cfg }) {
      const chans = values.channel ? [loadChannel(values.channel, cfg)] : listChannels(cfg);
      const out = [], row = (status, id, rest) => `  ${status.padEnd(9)} ${id.padEnd(28)} ${rest}`;
      const describe = (dir, status) => {
        try {
          const p = loadProject(dir, cfg);
          if (status === 'posted') return 'done';
          const pr = progress(p, p.template), lint = lintProject(p, cfg).errors.length;
          return `${formatStages(pr.stages)}${lint ? `  lint ${lint}✗` : ''}\n${' '.repeat(40)}→ ${pr.next}`;
        } catch (e) { return `✗ ${e.message.split('\n')[0]}`; }
      };
      for (const ch of chans) {
        const eps = loadBacklog(ch).episodes.map((e) => ({ ...e, ...episodeStatus(e, ch, cfg) }));
        const counts = STATUSES.map((s) => `${eps.filter((e) => e.status === s).length} ${s}`).join(' · ');
        out.push(`${ch.id}  ${ch.manifest.name}   ${counts}`);
        for (const e of eps.filter((x) => x.status !== 'idea')) out.push(row(e.status, e.id, e.status === 'posted' ? `on ${e.posted.join(', ')}` : describe(e.dir, e.status)));
        const known = new Set(eps.map((e) => e.id));
        for (const o of listProjects(cfg, { channel: ch.id }).filter((x) => !known.has(x.name))) out.push(row('(no ep)', o.name, describe(o.dir)));
        const ideas = eps.filter((e) => e.status === 'idea');
        if (values.all) for (const e of ideas) out.push(row('idea', e.id, e.title));
        else if (ideas.length) out.push(`  ${ideas.length} idea(s): studio backlog --channel ${ch.id} --status idea`);
        out.push('');
      }
      if (!values.channel) {
        const loose = listProjects(cfg).filter((x) => !x.manifest.channel);
        if (loose.length) { out.push('(no channel: scratch)'); for (const o of loose) out.push(row('scratch', o.name, describe(o.dir))); out.push(''); }
      }
      console.log(out.join('\n').trimEnd() || `no channels yet: studio channel-new <id> --name "…"`);
      return 0;
    },
  },
];
