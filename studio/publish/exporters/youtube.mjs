// YouTube exporter: official YouTube Data API v3, OAuth 2.0 (installed-app flow with PKCE on a loopback port).
//   app keys (once, shared by all channels):  .studio/secrets/apps/youtube.json      { client_id, client_secret }
//   per channel (after `studio connect`):     .studio/secrets/channels/<id>/youtube.json { refresh_token, account }
// Upload = resumable videos.insert (1 unit of the separate "video uploads" quota, ~100 uploads/day by default).
// A vertical video of up to 3 minutes is published as a Short automatically; there is no Shorts flag.
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import { request } from '../http.mjs';
import { readSecret, writeSecret } from '../secrets.mjs';
import { probe, checkSpecs } from '../media.mjs';
import { postMetadata, captionText } from '../metadata.mjs';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/youtube/v3';
const UPLOAD = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'];
export const CATEGORIES = { film: '1', autos: '2', music: '10', 'pets-animals': '15', sports: '17', travel: '19', gaming: '20', people: '22', comedy: '23', entertainment: '24', news: '25', howto: '26', education: '27', 'science-tech': '28' };
const PRIVACY = ['private', 'unlisted', 'public'];

export const SPECS = { vertical: true, maxDuration: 180, maxBytes: 256e9, videoCodecs: ['h264', 'hevc', 'vp9', 'av1'] };

const b64url = (b) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const normHandle = (h) => String(h || '').trim().toLowerCase().replace(/^@?/, '@');

function appKeys(cfg) {
  const k = readSecret(cfg, 'apps/youtube');
  if (!k?.client_id || !k?.client_secret) throw new Error('YouTube app keys missing: studio connect youtube --channel <id> --client-secret <client_secret.json from Google Cloud>');
  return k;
}

/** read the JSON Google Cloud gives you for an OAuth client (Desktop app) */
export function parseClientSecret(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8')), c = j.installed || j.web || j;
  if (!c.client_id || !c.client_secret) throw new Error(`${file} is not a Google OAuth client file (needs client_id and client_secret)`);
  return { client_id: c.client_id, client_secret: c.client_secret, type: j.installed ? 'desktop' : j.web ? 'web' : 'unknown' };
}

async function accessToken(ctx) {
  const k = appKeys(ctx.cfg), acc = readSecret(ctx.cfg, `channels/${ctx.channel.id}/youtube`);
  if (!acc?.refresh_token) throw new Error(`YouTube is not connected for channel "${ctx.channel.id}": studio connect youtube --channel ${ctx.channel.id}`);
  const { data } = await request(ctx.fetch, TOKEN_URL, { method: 'POST', form: { client_id: k.client_id, client_secret: k.client_secret, refresh_token: acc.refresh_token, grant_type: 'refresh_token' } });
  return data.access_token;
}

async function myChannel(ctx, token) {
  const { data } = await request(ctx.fetch, `${API}/channels?part=snippet&mine=true`, { headers: { Authorization: `Bearer ${token}` } });
  const c = data.items?.[0];
  if (!c) throw new Error('this Google account has no YouTube channel');
  return { id: c.id, title: c.snippet.title, handle: c.snippet.customUrl ? normHandle(c.snippet.customUrl) : null, url: `https://www.youtube.com/channel/${c.id}` };
}

/** a one-shot server on 127.0.0.1 that receives Google's redirect: → { port, code: Promise<string> } */
export async function startLoopback(state, timeoutMs = 300_000) {
  let done;
  const code = new Promise((resolve, reject) => { done = { resolve, reject }; });
  code.catch(() => {});                       // a failed sign-in is reported to whoever awaits `code`, not as unhandled
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    if (u.pathname !== '/') { res.writeHead(404); res.end(); return; }
    const got = u.searchParams.get('code'), ok = got && u.searchParams.get('state') === state;
    const why = u.searchParams.get('error') || 'state mismatch';
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h2 style="font-family:sans-serif">${ok ? 'Connected. You can close this tab.' : 'Sign-in failed: ' + why}</h2>`);
    clearTimeout(timer); srv.close();
    ok ? done.resolve(got) : done.reject(new Error(`Google sign-in failed: ${why}`));
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const timer = setTimeout(() => { srv.close(); done.reject(new Error('timed out waiting for the Google sign-in')); }, timeoutMs);
  timer.unref();
  return { port: srv.address().port, code };
}

export default {
  id: 'youtube',
  title: 'YouTube',
  needs: [
    'A Google Cloud project with "YouTube Data API v3" enabled',
    'An OAuth client of type "Desktop app": download its client_secret_….json',
    'OAuth consent screen: add your Google account as a test user, or set it to "In production" (testing-mode sign-ins expire after 7 days)',
    'Then run: studio connect youtube --channel <id> --client-secret <file>  and sign in with the account that owns the channel',
  ],
  SPECS,

  status(ctx) {
    const acc = readSecret(ctx.cfg, `channels/${ctx.channel.id}/youtube`), app = readSecret(ctx.cfg, 'apps/youtube');
    if (!app) return { connected: false, detail: 'no app keys yet' };
    if (!acc?.refresh_token) return { connected: false, detail: 'app keys saved, channel not signed in' };
    return { connected: true, detail: `${acc.account?.title || '?'} ${acc.account?.handle || ''}`.trim(), since: acc.connected_at };
  },

  async connect(ctx, { clientSecret, timeoutMs = 300_000, anyAccount = false } = {}) {
    if (clientSecret) {
      const k = parseClientSecret(clientSecret);
      if (k.type === 'web') ctx.log('note: this is a "Web application" client; a "Desktop app" client is what works with this sign-in.');
      writeSecret(ctx.cfg, 'apps/youtube', { client_id: k.client_id, client_secret: k.client_secret, saved_at: new Date().toISOString() });
      ctx.log('YouTube app keys saved.');
    }
    const k = appKeys(ctx.cfg);
    const verifier = b64url(crypto.randomBytes(48)), challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    const state = b64url(crypto.randomBytes(16));
    const { port, code: waiting } = await startLoopback(state, timeoutMs);
    const redirect = `http://127.0.0.1:${port}`;
    const url = `${AUTH_URL}?${new URLSearchParams({ client_id: k.client_id, redirect_uri: redirect, response_type: 'code', scope: SCOPES.join(' '), access_type: 'offline', prompt: 'consent', code_challenge: challenge, code_challenge_method: 'S256', state })}`;
    ctx.log(`Sign in with the Google account that owns ${ctx.channel.manifest.handle || ctx.channel.id}:\n${url}`);
    ctx.open?.(url);
    const code = await waiting;
    const { data: tok } = await request(ctx.fetch, TOKEN_URL, { method: 'POST', form: { code, client_id: k.client_id, client_secret: k.client_secret, redirect_uri: redirect, grant_type: 'authorization_code', code_verifier: verifier } });
    if (!tok.refresh_token) throw new Error('Google returned no refresh token: remove the app at myaccount.google.com/permissions and connect again');
    const account = await myChannel(ctx, tok.access_token);
    const want = ctx.channel.manifest.handle && normHandle(ctx.channel.manifest.handle);
    if (want && account.handle && account.handle !== want && !anyAccount) {
      throw new Error(`signed in as ${account.title} (${account.handle}), but channel "${ctx.channel.id}" is ${want}. Sign in with the right account (or pass --any-account).`);
    }
    writeSecret(ctx.cfg, `channels/${ctx.channel.id}/youtube`, { refresh_token: tok.refresh_token, scope: tok.scope, account, connected_at: new Date().toISOString() });
    return account;
  },

  /** exactly what will be sent; nothing leaves the computer */
  plan(ctx) {
    const meta = postMetadata(ctx), yt = meta.platform('youtube'), info = probe(ctx.file), problems = checkSpecs(info, SPECS);
    const privacy = ctx.overrides?.privacy || yt.privacy || 'private';
    if (!PRIVACY.includes(privacy)) problems.push(`privacy must be ${PRIVACY.join(' | ')}`);
    if (!meta.title) problems.push('no title (script.json "title" or project.json publish.title)');
    if (meta.title.length > 100) problems.push(`title is ${meta.title.length} characters (max 100)`);
    const cat = String(yt.category || '27');
    let description = captionText(meta, { maxChars: 5000 });
    if (!/#shorts\b/i.test(description)) description = `${description}\n\n#shorts`.trim();
    const body = {
      snippet: { title: meta.title.slice(0, 100), description, tags: meta.tags.slice(0, 30), categoryId: CATEGORIES[cat] || cat, defaultLanguage: yt.language || 'en' },
      status: {
        privacyStatus: ctx.overrides?.publishAt ? 'private' : privacy, selfDeclaredMadeForKids: !!yt.madeForKids, embeddable: yt.embeddable ?? true,
        license: yt.license || 'youtube', containsSyntheticMedia: !!yt.syntheticMedia, ...(ctx.overrides?.publishAt ? { publishAt: ctx.overrides.publishAt } : {}),
      },
    };
    return { exporter: 'youtube', file: ctx.file, media: info, body, problems, summary: `${body.status.privacyStatus}${body.status.publishAt ? ' until ' + body.status.publishAt : ''} · category ${body.snippet.categoryId} · ${body.snippet.tags.length} tags` };
  },

  async publish(ctx, plan) {
    const token = await accessToken(ctx), size = fs.statSync(plan.file).size;
    const init = await request(ctx.fetch, UPLOAD, { method: 'POST', json: plan.body, headers: { Authorization: `Bearer ${token}`, 'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(size) } });
    const session = init.headers.get('location');
    if (!session) throw new Error('YouTube did not return an upload session');
    ctx.log(`uploading ${(size / 1e6).toFixed(1)} MB to YouTube…`);
    const { data } = await request(ctx.fetch, session, { method: 'PUT', body: fs.readFileSync(plan.file), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'video/mp4', 'Content-Length': String(size) } });
    if (!data?.id) throw new Error('upload finished without a video id');
    return { id: data.id, url: `https://www.youtube.com/shorts/${data.id}`, privacy: data.status?.privacyStatus || plan.body.status.privacyStatus };
  },
};
