// Layered file lookup: a URL path is looked up in each layer in order and the first hit wins.
// A project is served as  [project dir, template dir, engine dir]  so a template only ships what makes it different
// (its kit, its captions, its sheet), and a project can override any single file of its template or of the engine.
// Mounts are exclusive prefixes served from one folder, never layered: /characters/ comes only from the character
// library, so no project or template can change how a character looks.
import fs from 'node:fs';
import path from 'node:path';

function inside(root, rel) {
  const f = path.join(root, rel);
  if (f !== root && !f.startsWith(root + path.sep)) return null;
  try { return fs.statSync(f).isFile() ? f : null; } catch { return null; }
}

export function createOverlay(layers, { mounts = {} } = {}) {
  const roots = layers.filter(Boolean).map((d) => path.resolve(d));
  const mnt = Object.entries(mounts).map(([prefix, dir]) => [prefix.replace(/^\/+|\/+$/g, '') + '/', path.resolve(dir)]);
  return {
    layers: roots,
    /** absolute file for a URL path like "/src/core/kit.js", or null. Never escapes a layer. */
    resolve(urlPath) {
      let rel;
      try { rel = path.normalize(decodeURIComponent(String(urlPath).split('?')[0])).replace(/^([/\\]|\.\.([/\\]|$))+/, ''); } catch { return null; }
      if (rel.split(/[/\\]/).includes('..')) return null;
      for (const [prefix, dir] of mnt) if (rel.startsWith(prefix)) return inside(dir, rel.slice(prefix.length));
      for (const root of roots) { const f = inside(root, rel); if (f) return f; }
      return null;
    },
    /** which layer serves a URL path (0 = top), -1 if none, 'mount' for a mounted prefix */
    layerOf(urlPath) {
      const f = this.resolve(urlPath);
      if (!f) return -1;
      const i = roots.findIndex((r) => f.startsWith(r + path.sep));
      return i >= 0 ? i : 'mount';
    },
  };
}
