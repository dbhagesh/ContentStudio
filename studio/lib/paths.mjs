// Where things live. Everything the studio needs is inside this folder (models and the Python env in .studio/).
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const ENGINE_DIR = path.join(ROOT, 'engine');
export const PYTHON_DIR = path.join(ROOT, 'python');
export const COMMANDS_DIR = path.join(ROOT, 'studio/commands');

/** resolve p against base unless it is already absolute; expands a leading ~ */
export function resolveFrom(base, p) {
  if (p == null) return p;
  if (p.startsWith('~')) p = path.join(process.env.HOME || '', p.slice(1));
  return path.isAbsolute(p) ? p : path.resolve(base, p);
}
