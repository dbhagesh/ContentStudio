// Temporary public hosting for a rendered file, for platforms that fetch the video by URL (Instagram Reels).
// A host is { name, expires, upload(file, opts) → url }. Order of preference and the dead ones were verified on
// 2026-11-03: 0x0.st, tmpfiles.org, gofile.io, file.io, bashupload.com and temp.sh do NOT work for this.
import fs from 'node:fs';
import path from 'node:path';

async function postForm(url, fields) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v.file) form.append(k, await fs.openAsBlob(v.file), path.basename(v.file));
    else form.append(k, v); // a third argument is only allowed with a Blob (Node 22 throws otherwise)
  }
  const r = await fetch(url, { method: 'POST', body: form });
  const text = (await r.text()).trim();
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status} ${text.slice(0, 200)}`);
  return text;
}

export const HOSTS = {
  litterbox: {
    expires: '1h-72h (--expiry 1h|12h|24h|72h)', maxMB: 1000,
    upload: (file, { expiry = '1h' } = {}) => postForm('https://litterbox.catbox.moe/resources/internals/api.php', { reqtype: 'fileupload', time: expiry, fileToUpload: { file } }),
  },
  uguu: {
    expires: '~3h', maxMB: 128,
    upload: async (file) => { const j = JSON.parse(await postForm('https://uguu.se/upload', { 'files[]': { file } })); return j.files?.[0]?.url || Promise.reject(new Error('uguu: no url in reply')); },
  },
  catbox: {
    expires: 'never (public forever: only with the owner’s OK)', maxMB: 200, permanent: true,
    upload: (file) => postForm('https://catbox.moe/user/api.php', { reqtype: 'fileupload', fileToUpload: { file } }),
  },
};

/** a hosted URL is only usable if it serves the raw file: HTTP 200/206 and a video/* (or octet-stream) type */
export async function verifyUrl(url, { expect = /^(video\/|application\/octet-stream)/ } = {}) {
  const r = await fetch(url, { method: 'HEAD', redirect: 'follow' });
  const type = r.headers.get('content-type') || '';
  return { ok: (r.status === 200 || r.status === 206) && expect.test(type), status: r.status, type };
}

export async function hostFile(file, { host = 'litterbox', expiry } = {}) {
  const h = HOSTS[host];
  if (!h) throw new Error(`unknown host "${host}" (${Object.keys(HOSTS).join(', ')})`);
  if (!fs.existsSync(file)) throw new Error(`no file ${file}`);
  const mb = fs.statSync(file).size / 1e6;
  if (mb > h.maxMB) throw new Error(`${path.basename(file)} is ${mb.toFixed(0)} MB; ${host} takes up to ${h.maxMB} MB`);
  const url = await h.upload(file, { expiry });
  if (!/^https?:\/\//.test(url)) throw new Error(`${host} answered "${url.slice(0, 120)}" instead of a URL`);
  const v = await verifyUrl(url);
  if (!v.ok) throw new Error(`${url} does not serve the raw video (HTTP ${v.status}, ${v.type || 'no type'})`);
  return { url, host, expires: h.expires };
}
