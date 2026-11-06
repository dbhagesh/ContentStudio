// Where templates and characters are found. Two kinds of library, so the studio scales to any number of channels:
//   shared:         templates/<id>/, characters/<id>/            any channel may use them (if it lists them)
//   channel-owned:  channels/<ch>/templates/<id>/, channels/<ch>/characters/<id>/
//                   only channel <ch> can use them; a new channel is one self-contained folder
// IDs are global: two libraries can't both have a template (or character) with the same id.
import fs from 'node:fs';
import path from 'node:path';
import { readJson } from './config.mjs';

/** [{ dir, owner }] to scan for `kind` ('templates' | 'characters'): the shared dirs, then each channel's own */
export function libraryRoots(cfg, kind, shared) {
  const roots = shared.map((dir) => ({ dir, owner: null }));
  if (cfg.channelsDir && fs.existsSync(cfg.channelsDir)) {
    for (const ch of fs.readdirSync(cfg.channelsDir).sort()) {
      const dir = path.join(cfg.channelsDir, ch, kind);
      if (fs.existsSync(path.join(cfg.channelsDir, ch, 'channel.json')) && fs.existsSync(dir)) roots.push({ dir, owner: ch });
    }
  }
  return roots;
}

/** every <root>/<id>/<manifestName>, as { id, dir, owner, manifest } */
export function scanLibrary(roots, manifestName) {
  const out = [];
  for (const { dir, owner } of roots) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).sort()) {
      const d = path.join(dir, name), mf = path.join(d, manifestName);
      if (fs.existsSync(mf)) out.push({ id: name, dir: d, owner, manifest: readJson(mf) });
    }
  }
  return out;
}

/** ids found in more than one place */
export const duplicateIds = (items) => [...new Set(items.map((x) => x.id).filter((id, i, a) => a.indexOf(id) !== i))];
