// Runtime settings for the browser engine. The studio server merges engine defaults + template.json + project.json
// and serves the result at studio/config.json; loadConfig() fills CFG before anything is built.
// Modules read CFG at call time (never at import time), so a page without a config still runs on the defaults.
export const CFG = { id: '', title: '', player: {}, captions: {}, engine3d: {}, fonts: [] };

export async function loadConfig(url = 'studio/config.json') {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`missing ${url}: open this page through the studio server (studio preview)`);
  Object.assign(CFG, await r.json());
  return CFG;
}

/** wait until every font the template declares is loaded, so the first frame is measured with the right glyphs */
export async function loadFonts(size = 100) {
  await Promise.all((CFG.fonts || []).map((f) => document.fonts.load(`${f.weight} ${size}px ${f.family}`)));
}
