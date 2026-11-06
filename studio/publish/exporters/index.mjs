// Exporter registry: every other module in this folder exports default
//   { id, title, needs: [setup steps], SPECS, status(ctx), connect(ctx, opts), plan(ctx), publish(ctx, plan) }
// ctx = { cfg, channel, project?, file?, script?, template?, overrides?, fetch, log, open?, host? }
// A new platform (TikTok, X, …) is one new file here.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const REQUIRED = ['id', 'title', 'needs', 'status', 'connect', 'plan', 'publish'];

export async function loadExporters(dir = DIR) {
  const out = new Map();
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.mjs') && f !== 'index.mjs').sort()) {
    const ex = (await import(pathToFileURL(path.join(dir, f)).href)).default;
    const missing = REQUIRED.filter((k) => ex?.[k] == null);
    if (missing.length) throw new Error(`exporter ${f} is missing: ${missing.join(', ')}`);
    out.set(ex.id, ex);
  }
  return out;
}

export async function getExporter(id) {
  const all = await loadExporters();
  if (!all.has(id)) throw new Error(`no exporter "${id}" (${[...all.keys()].join(', ')})`);
  return all.get(id);
}
