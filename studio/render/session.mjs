// A render session = the overlay server for one project + headless Chrome on one of its pages.
//   await withSession(project, cfg, async (s) => modes.check(s))                       the film
//   await withSession(project, cfg, fn, { page: 'sheet' })                             the template style sheet
//   await withSession(stage, cfg, fn, { page: 'character', query: 'id=<character>' })      a character model sheet
import { startServer, projectRoutes } from './server.mjs';
import { openPage, READY } from './chrome.mjs';

export const PAGES = {
  film: { file: 'index.html', ready: READY.film },
  sheet: { file: 'sheet.html', ready: READY.sheet, width: 1920, height: 1080 },
  character: { file: 'character.html', ready: READY.sheet, width: 2400, height: 2000 },
  avatar: { file: 'avatar.html', ready: READY.sheet, width: 800, height: 800 },
};

export async function withSession(project, cfg, fn, { page = 'film', query = '' } = {}) {
  const pg = PAGES[page];
  if (!pg) throw new Error(`unknown page "${page}" (${Object.keys(PAGES).join(', ')})`);
  const srv = await startServer({ overlay: project.overlay, routes: projectRoutes(project) });
  const port = srv.address().port, r = cfg.render;
  const qs = (r.quality ? (r.quality.startsWith('&') ? r.quality : '&' + r.quality) : '') + (query ? '&' + query : '');
  let s;
  try {
    s = await openPage(`http://127.0.0.1:${port}/${pg.file}?capture=1${qs}`, {
      chrome: r.chrome, softwareGL: r.softwareGL, bootTimeoutS: r.bootTimeoutS, readyExpr: pg.ready,
      ...(pg.width ? { width: pg.width, height: pg.height } : {}),
    });
    return await fn(s);
  } finally { s?.close(); srv.close(); }
}
