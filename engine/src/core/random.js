// Reproducible randomness. The player seeds Math.random before any shot or set is built, so every render of a project
// is identical frame for frame (and regression tests can compare frames). template.json / project.json "player.seed"
// picks the seed; change it to re-roll scattered details (particles, wood grain) without touching code.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedRandom(seed = 1) {
  Math.random = mulberry32(seed);
}
