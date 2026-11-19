// Pre-rendered film frames (a "plate", e.g. from the studio's optional Blender step) as the picture under the captions.
// Only templates that import this use it:
//   import { plateFilm } from './core/plate.js';
//   export function buildShots() { return plateFilm({ over: (t) => { /* titles drawn on top */ } }); }
// plate/plate.json: { fps, frames, duration, shots: [{ id, at, note }], cues: [{ t, name, ... }] }
// plate/frames/000001.jpg … one per film frame (frame n shows time (n - 1) / fps).
// Optional 2D actors standing in the 3D set (studio3d.Anchor): plate.json "actors": { name: [[x, y, pxPerMetre, depth,
// blur] | null per frame] } in film pixels at "size"; actorAt(name, t) reads the sample of the frame shown at t, so a
// character drawn there stays locked to the plate:  const a = actorAt('hero', t); if (a) drawHero(a.x, a.y, a.ppm * 1.5 / HEIGHT_PX)
// plateFilm returns prepare(t): the player awaits it before drawing t, so captures always have their frame.
import { W, H, ctx } from './lib.js';

const META = await fetch('plate/plate.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const cache = new Map();
let current = null;

function load(n) {
  if (!cache.has(n)) {
    const img = new Image();
    img.src = `plate/frames/${String(n).padStart(6, '0')}.jpg`;
    cache.set(n, img.decode().then(() => img, () => null));
    if (cache.size > 90) cache.delete(cache.keys().next().value);
  }
  return cache.get(n);
}

export const plateMeta = () => META;
export const frameAt = (t) => Math.min(META?.frames || 1, 1 + Math.round(t * (META?.fps || 30)));

/** a plate's actor sample at frame index i (0-based) → { x, y, ppm, depth, blur } in film px (W×H), or null */
export function actorSample(meta, name, i) {
  const a = meta?.actors?.[name], v = a?.[Math.max(0, Math.min(a.length - 1, i))];
  if (!v) return null;
  const [sw, sh] = meta.size || [W, H], k = Math.max(W / sw, H / sh);   // the plate is cover-fitted like drawPlate
  return { x: W / 2 + (v[0] - sw / 2) * k, y: H / 2 + (v[1] - sh / 2) * k, ppm: v[2] * k, depth: v[3], blur: (v[4] || 0) * k };
}

/** where actor `name` stands on the frame shown at t (null when it is not in the set or the plate has no actors) */
export const actorAt = (name, t) => actorSample(META, name, frameAt(t) - 1);

/** draw the plate frame for t, cover-fitted to the film (black when it is missing) */
export function drawPlate() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (!current) return;
  const s = Math.max(W / current.width, H / current.height), w = current.width * s, h = current.height * s;
  ctx.drawImage(current, (W - w) / 2, (H - h) / 2, w, h);
}

export function plateFilm({ over } = {}) {
  if (!META) throw new Error('plate/plate.json is missing: run the plate step (studio build <project> --only plate)');
  const shots = (META.shots.length ? META.shots : [{ id: 'plate', at: 0 }]).map((s) => ({
    id: s.id, at: s.at, note: s.note || '',
    draw: (lt, d, t) => { load(frameAt(t)).then((img) => { if (img) current = img; }); drawPlate(); over?.(t); },   // the live preview catches up a frame later
  }));
  const prepare = async (t) => {
    const n = frameAt(t);
    current = await load(n);
    for (let k = 1; k <= 3; k++) load(Math.min(META.frames, n + k));   // read ahead while the frame is encoded
  };
  return { shots, cues: META.cues || [], prepare };
}
