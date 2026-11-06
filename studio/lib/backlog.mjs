// A channel's episode pipeline: channels/<id>/backlog.json  { "episodes": [ { id, title, series, hook, twist, sources, notes } ] }
// and its recurring formats: channels/<id>/series.json  { "series": [ { id, name, format, hookFormula, example } ] }
// An episode's status is never stored; it is read from what exists, so it can't go stale:
//   idea (no project yet) → making (projects/<channel>/<id>/) → rendered (renders/<id>.mp4) → posted (publish history)
import fs from 'node:fs';
import path from 'node:path';
import { readJson } from './config.mjs';
import { NAME_RE } from './project.mjs';

export const STATUSES = ['idea', 'making', 'rendered', 'posted'];

const file = (ch, f) => path.join(ch.dir, f);
export const loadBacklog = (ch) => readJson(file(ch, 'backlog.json'), { episodes: [] });
export const loadSeries = (ch) => readJson(file(ch, 'series.json'), { series: [] });
const save = (ch, b) => fs.writeFileSync(file(ch, 'backlog.json'), JSON.stringify(b, null, 2) + '\n');

export function episodeStatus(ep, ch, cfg) {
  const dir = path.join(cfg.projectsDir, ch.id, ep.id);
  if (!fs.existsSync(path.join(dir, 'project.json'))) return { status: 'idea' };
  const m = readJson(path.join(dir, 'project.json'));
  const posted = (m.publish?.history || []).map((h) => h.platform || h.to).filter(Boolean);
  if (posted.length) return { status: 'posted', dir, posted };
  if (fs.existsSync(path.join(dir, 'renders', `${ep.id}.mp4`))) return { status: 'rendered', dir };
  return { status: 'making', dir };
}

export function getEpisode(ch, id) {
  const ep = loadBacklog(ch).episodes.find((e) => e.id === id);
  if (!ep) throw new Error(`no episode "${id}" in ${ch.id}'s backlog (studio backlog --channel ${ch.id})`);
  return ep;
}

/** problems with a backlog, as strings */
export function validateBacklog(ch) {
  const errs = [], seen = new Set(), series = new Set(loadSeries(ch).series.map((s) => s.id));
  for (const ep of loadBacklog(ch).episodes) {
    if (!NAME_RE.test(ep.id || '')) errs.push(`episode id "${ep.id}": lowercase letters, digits, dashes`);
    if (seen.has(ep.id)) errs.push(`episode "${ep.id}" listed twice`);
    seen.add(ep.id);
    if (!ep.title) errs.push(`episode "${ep.id}" has no title`);
    if (ep.series && series.size && !series.has(ep.series)) errs.push(`episode "${ep.id}": series "${ep.series}" is not in series.json`);
  }
  return errs;
}

export function addEpisode(ch, ep) {
  const b = loadBacklog(ch);
  if (!NAME_RE.test(ep.id || '')) throw new Error(`episode id "${ep.id}": lowercase letters, digits, dashes`);
  if (b.episodes.some((e) => e.id === ep.id)) throw new Error(`episode "${ep.id}" is already in the backlog`);
  if (!ep.title) throw new Error('an episode needs a --title');
  b.episodes.push(Object.fromEntries(Object.entries(ep).filter(([, v]) => v != null && v !== '')));
  save(ch, b);
  return ep;
}
