// What the renderer can do with an open film page (session.ev drives window.OP in the browser).
// Each mode is a plain async function, so the CLI, the selftest and the tests all share them.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const jpg = (dataUrl) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
const frameExpr = (t, q, label) => `(async () => { const d = await OP.frame(${t}, ${q}); ${label
  ? `const cv = document.getElementById('cv'), c = cv.getContext('2d'); c.setTransform(1,0,0,1,0,0); c.fillStyle = '#000'; c.fillRect(0, 0, 250, 86); c.fillStyle = '#fff'; c.font = '700 60px sans-serif'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText('${(+t).toFixed(2)}', 14, 64); return cv.toDataURL('image/jpeg', ${q});`
  : 'return d;'} })()`;
export const grabFrame = async (s, t, q = 0.92, label = false) => jpg(await s.ev(frameExpr(t, q, label)));

/** boot report + draw every 0.25 s; ok = no errors */
export async function check(s) {
  const dur = await s.ev('OP.duration()'), out = [`duration ${dur.toFixed(2)} s`];
  for (const sh of await s.ev('OP.shots()')) out.push(`${sh.id.padEnd(5)} ${sh.at.toFixed(2).padStart(6)} → ${sh.end.toFixed(2).padStart(6)}  (${(sh.end - sh.at).toFixed(2)} s)  ${sh.note}`);
  out.push('captions:');
  for (const c of await s.ev('OP.captions()')) out.push(`  ${c.s.toFixed(2).padStart(6)}–${c.e.toFixed(2).padEnd(6)} ${c.text}`);
  let bad = 0;
  for (let t = 0; t < dur; t += 0.25) { try { await s.ev(`OP.draw(${t})`); } catch (e) { bad++; out.push(`ERROR at ${t.toFixed(2)}: ${e.message.split('\n')[0]}`); } }
  out.push(...s.logs);
  const ok = !bad && !s.logs.length;
  out.push(ok ? 'CHECK OK' : 'CHECK FAILED');
  return { ok, duration: dur, report: out.join('\n') };
}

// Records every fillText / strokeText on the film canvas while OP.draw runs: the text, its layer (shot or caption),
// its on-screen corners (quad: the canvas transform applied, so camera moves and rotation count) and their bounding box. Text drawn into offscreen canvases
// (3D textures) and nearly transparent text are left out.
const TEXT_PROBE = `(() => {
  if (window.__textProbe) return;
  const cv = document.getElementById('cv'), P = CanvasRenderingContext2D.prototype, rec = (window.__textProbe = { on: false, items: [] });
  for (const name of ['fillText', 'strokeText']) {
    const orig = P[name];
    P[name] = function (text, x, y, maxW) {
      const s = String(text);
      if (rec.on && this.canvas === cv && this.globalAlpha > 0.1 && s.trim()) {
        const m = this.measureText(s), t = this.getTransform(), w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
        const k = maxW != null && w > maxW ? maxW / w : 1, pad = name === 'strokeText' ? this.lineWidth / 2 : 0;
        const l = x - m.actualBoundingBoxLeft * k - pad, r = x + m.actualBoundingBoxRight * k + pad;
        const tp = y - m.actualBoundingBoxAscent - pad, b = y + m.actualBoundingBoxDescent + pad;
        const quad = [[l, tp], [r, tp], [r, b], [l, b]].map(([px, py]) => [Math.round(t.a * px + t.c * py + t.e), Math.round(t.b * px + t.d * py + t.f)]);
        const xs = quad.map((p) => p[0]), ys = quad.map((p) => p[1]);
        rec.items.push({ text: s, layer: OP.layer || 'shot', quad, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] });
      }
      return orig.apply(this, arguments);
    };
  }
})()`;

/** every piece of text drawn, sampled every `step` s → { width, height, duration, step, frames: [{ t, texts }] } */
export async function textLayout(s, { step = 0.25 } = {}) {
  await s.ev(TEXT_PROBE);
  const dur = await s.ev('OP.duration()'), [width, height] = await s.ev("[document.getElementById('cv').width, document.getElementById('cv').height]");
  const frames = [];
  for (let t = 0; t < dur; t += step) {
    // a frame that throws is check's to report; its text up to the error still counts
    const texts = await s.ev(`(() => { const r = window.__textProbe; r.items = []; r.on = true; try { OP.draw(${t}); } catch {} r.on = false; return r.items; })()`);
    frames.push({ t: +t.toFixed(3), texts });
  }
  return { width, height, duration: dur, step, frames };
}

/** data/cues.json: the sound cues the shots placed (for the mixer) */
export async function cues(s, projectDir) {
  const dur = await s.ev('OP.duration()'), list = await s.ev('OP.cues()');
  fs.mkdirSync(path.join(projectDir, 'data'), { recursive: true });
  const file = path.join(projectDir, 'data/cues.json');
  fs.writeFileSync(file, JSON.stringify({ duration: dur, cues: list }, null, 1));
  return { file, count: list.length, duration: dur };
}

/** full-size JPEGs at the given times */
export async function frames(s, dir, times) {
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  for (const t of times) { const f = path.join(dir, `t${t.toFixed(2)}.jpg`); fs.writeFileSync(f, await grabFrame(s, t)); files.push(f); }
  return files;
}

/** contact sheet: a time-stamped frame every `step` seconds, tiled `cols` wide */
export async function sheet(s, out, { step = 0.5, cols = 10 } = {}) {
  const dur = await s.ev('OP.duration()');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-sheet-')); let n = 0;
  try {
    for (let t = step / 2; t < dur; t += step) fs.writeFileSync(path.join(tmp, `f${String(n++).padStart(4, '0')}.jpg`), await grabFrame(s, t, 0.8, true));
    const rows = Math.ceil(n / cols); fs.mkdirSync(path.dirname(out), { recursive: true });
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', path.join(tmp, 'f%04d.jpg'), '-vf', `scale=216:384,tile=${cols}x${rows}:padding=4:color=black`, '-frames:v', '1', '-q:v', '3', out]);
    if (r.status) throw new Error('ffmpeg: ' + r.stderr);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  return { file: out, frames: n, step };
}

/** the film as MP4 (H.264 + AAC), muxed with data/mix.wav when it exists */
export async function video(s, out, { projectDir, start = 0, end, fps = 30, crf = 18, preset = 'veryfast', quality = 0.93, onProgress } = {}) {
  const dur = await s.ev('OP.duration()');
  const a0 = start, a1 = end != null ? Math.min(end, dur) : dur, n = Math.round((a1 - a0) * fps);
  const mix = path.join(projectDir, 'data/mix.wav'), hasMix = fs.existsSync(mix);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    ...(hasMix ? ['-ss', String(a0), '-t', String(a1 - a0), '-i', mix] : ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo']), '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', preset, '-crf', String(crf), '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((r) => ff.on('close', r));
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const b = await grabFrame(s, a0 + i / fps, quality);
    if (!ff.stdin.write(b)) await new Promise((r) => ff.stdin.once('drain', r));
    if (onProgress && i % 150 === 0) onProgress(i, n);
  }
  ff.stdin.end();
  const code = await done;
  if (code) throw new Error(`ffmpeg exited with ${code}`);
  return { file: out, frames: n, withMix: hasMix, seconds: (Date.now() - t0) / 1000 };
}

/** the template's style sheet board (sheet.html) as a PNG */
export async function stylesheet(s, out) {
  const data = await s.ev(`document.getElementById('cv').toDataURL('image/png')`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'));
  return { file: out };
}
