// The cast: permanent characters from the library (characters/<id>/), loaded before the shots are built.
//   import { cast } from './core/cast.js';
//   const sakumai = cast('sakumai');
//   sakumai.draw({ x: 540, y: 1500, s: 1, pose: 'wave', expression: 'happy', t });
// A character module exports default { id, version, draw(opts), poses, expressions, outfits, ... }.
// Only characters listed in the project's cast (or its channel's) can be used, so every appearance is on record.
const REG = new Map();

export async function loadCast(entries = []) {
  REG.clear();
  for (const e of entries) {
    const mod = (await import(`/${e.module}`)).default;
    if (!mod || typeof mod.draw !== 'function') throw new Error(`character "${e.id}" (${e.module}) must export default { draw(opts) }`);
    REG.set(e.id, Object.assign(Object.create(mod), { castVersion: e.version }));
  }
  return REG;
}

export function cast(id) {
  const c = REG.get(id);
  if (!c) throw new Error(`character "${id}" is not in this video's cast (${[...REG.keys()].join(', ') || 'empty'}). Add it to the channel's cast or project.json "cast".`);
  return c;
}

export const castIds = () => [...REG.keys()];
