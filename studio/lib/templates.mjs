// Template registry. A template is any folder with a template.json inside one of config.templatesDirs (shared) or a
// channel's own channels/<ch>/templates/ (only that channel can use it; see library.mjs):
//   template.json · STYLE.md · style-sheet.png · src/ (its kit, overrides of engine files) · example/ (a project that renders)
// Drop a folder in, and `studio templates` lists it; nothing else needs registering.
import fs from 'node:fs';
import path from 'node:path';
import { ENGINE_DIR } from './paths.mjs';
import { libraryRoots, scanLibrary, duplicateIds } from './library.mjs';

export const RENDERERS = ['2d', '3d'];

/** every template: { id, dir, owner (channel id, or null when shared), manifest } */
export function listTemplates(cfg) {
  return scanLibrary(libraryRoots(cfg, 'templates', cfg.templatesDirs), 'template.json');
}

/** template ids defined twice (a channel's template can't reuse a shared template's id) */
export const duplicateTemplates = (cfg) => duplicateIds(listTemplates(cfg));

export function loadTemplate(id, cfg) {
  const all = listTemplates(cfg), t = all.find((x) => x.id === id);
  if (!t) throw new Error(`no template "${id}". Available: ${all.map((x) => x.id).join(', ') || '(none)'}`);
  return t;
}

/** problems with a template, as readable strings (empty = valid) */
export function validateTemplate(t) {
  const m = t.manifest, errs = [], has = (rel) => fs.existsSync(path.join(t.dir, rel));
  if (m.id !== t.id) errs.push(`template.json id "${m.id}" must match its folder "${t.id}"`);
  if (!m.title) errs.push('template.json needs a "title"');
  if (!m.description) errs.push('template.json needs a "description"');
  const r = m.player?.renderer;
  if (!RENDERERS.includes(r)) errs.push(`player.renderer must be one of ${RENDERERS.join(' | ')} (got ${JSON.stringify(r)})`);
  if (!Array.isArray(m.fonts) || !m.fonts.length) errs.push('template.json needs a non-empty "fonts" list');
  for (const f of m.fonts || []) {
    if (!f.family || !f.weight || !f.file) errs.push(`font entry needs family, weight, file: ${JSON.stringify(f)}`);
    else if (!has(f.file) && !fs.existsSync(path.join(ENGINE_DIR, f.file))) errs.push(`font file not found in the template or engine: ${f.file}`);
  }
  for (const f of ['STYLE.md', 'example/script.json', 'example/src/shots.js']) if (!has(f)) errs.push(`missing ${f}`);
  return errs;
}
