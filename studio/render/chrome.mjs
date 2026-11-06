// Headless Chrome over the DevTools protocol, with no npm packages (Node 22+ has fetch and WebSocket built in).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function findChrome(preferred) {
  return [preferred, ...CANDIDATES].find((p) => p && fs.existsSync(p)) || null;
}

/**
 * Open url in headless Chrome and wait until readyExpr evaluates to true (a string result is a boot error).
 * Returns { ev(expr) → value, logs: [errors seen], close() }.
 */
export async function openPage(url, { chrome, softwareGL = false, readyExpr, bootTimeoutS = 120, width = 1080, height = 1920 } = {}) {
  const bin = findChrome(chrome);
  if (!bin) throw new Error('Chrome not found: install Google Chrome or set render.chrome in studio.config.local.json');
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-chrome-'));
  const proc = spawn(bin, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${prof}`, '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', `--window-size=${width},${height}`, '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader',
    ...(softwareGL ? ['--use-angle=swiftshader'] : []), ...(process.getuid?.() === 0 ? ['--no-sandbox'] : []),
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });
  const cleanup = () => { try { proc.kill('SIGKILL'); } catch { /* gone */ } setTimeout(() => fs.rmSync(prof, { recursive: true, force: true }), 300); };
  try {
    let port;
    for (let i = 0; i < 200 && !port; i++) { try { port = fs.readFileSync(path.join(prof, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim(); } catch { await sleep(100); } }
    if (!port) throw new Error('Chrome did not start');
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0; const pend = new Map(), logs = [];
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
      else if (m.method === 'Runtime.exceptionThrown') logs.push('EXCEPTION ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
      else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push('ERROR ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
    };
    const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async (expr) => {
      const x = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (x.exceptionDetails) throw new Error(x.exceptionDetails.exception?.description || x.exceptionDetails.text);
      return x.result.value;
    };
    await send('Runtime.enable');
    for (let i = 0; ; i++) {
      const st = await ev(readyExpr).catch(() => false);
      if (st === true) break;
      if (typeof st === 'string') throw new Error('boot failed: ' + st + '\n' + logs.join('\n'));
      if (i > bootTimeoutS * 10) throw new Error('boot timeout\n' + logs.join('\n'));
      await sleep(100);
    }
    return { ev, logs, close: () => { try { ws.close(); } catch { /* closed */ } cleanup(); } };
  } catch (e) { cleanup(); throw e; }
}

export const READY = {
  film: 'window.OP ? (OP.bootError ? "ERR:" + OP.bootError : OP.ready) : false',
  sheet: 'window.SHEET_ERROR ? "ERR:" + SHEET_ERROR : window.SHEET_READY === true',
};
