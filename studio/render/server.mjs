// A tiny static server over an overlay, plus generated routes (index.html, sheet.html, studio/config.json).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { indexHtml, sheetHtml, characterHtml } from '../lib/pages.mjs';

export const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.otf': 'font/otf',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
};

/** the generated routes for a project (or a template example) */
export function projectRoutes(project) {
  const rc = project.runtime;
  return {
    '/': () => ['text/html', indexHtml(rc)],
    '/index.html': () => ['text/html', indexHtml(rc)],
    '/sheet.html': () => ['text/html', sheetHtml(rc)],
    '/character.html': () => ['text/html', characterHtml(rc)],
    '/studio/config.json': () => ['application/json', JSON.stringify(rc)],
  };
}

export function startServer({ overlay, routes = {}, port = 0, host = '127.0.0.1' }) {
  return new Promise((res, rej) => {
    const srv = http.createServer((req, r) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      const gen = routes[u];
      if (gen) { const [type, body] = gen(); r.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }); r.end(body); return; }
      const f = overlay.resolve(u);
      if (!f) { r.writeHead(404); r.end(); return; }
      r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(f).pipe(r);
    });
    srv.on('error', rej);
    srv.listen(port, host, () => res(srv));
  });
}
