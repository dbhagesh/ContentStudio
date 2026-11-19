// Publishing without the network: exporters run against a scripted fake fetch; secrets go to a temp folder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readSecret, writeSecret, secretFile, redact } from '../../studio/publish/secrets.mjs';
import { request, scrub } from '../../studio/publish/http.mjs';
import { probe, checkSpecs, contentCredentials } from '../../studio/publish/media.mjs';
import { postMetadata, captionText } from '../../studio/publish/metadata.mjs';
import { loadExporters } from '../../studio/publish/exporters/index.mjs';
import youtube, { parseClientSecret, startLoopback } from '../../studio/publish/exporters/youtube.mjs';
import instagram, { account as igAccount } from '../../studio/publish/exporters/instagram.mjs';
import { recordPublish, history, staleInputs } from '../../studio/commands/publish.mjs';
import { loadChannel } from '../../studio/lib/channels.mjs';
import { createProject, loadProject } from '../../studio/lib/project.mjs';
import { loadTemplate } from '../../studio/lib/templates.mjs';
import { testConfig, tmpDir } from './helpers.mjs';

const cfg = { ...testConfig(), studioHome: tmpDir('studio-home-') };
const channel = loadChannel('demo', cfg);

/** a 4 s 720x1280 H.264 + AAC 192k MP4, like a studio render */
function makeVideo(dir, seconds = 4, size = '720x1280') {
  const f = path.join(dir, `v${seconds}-${size}.mp4`);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `testsrc=size=${size}:rate=30:duration=${seconds}`, '-f', 'lavfi', '-i', `sine=frequency=440:sample_rate=48000:duration=${seconds}`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-shortest', '-movflags', '+faststart', f]);
  assert.equal(r.status, 0, String(r.stderr));
  return f;
}
const VIDEO = makeVideo(tmpDir());

/** fake fetch: routes = [[method, urlRegex, (url, opts) => ({ status, json, headers })], ...] in any order; records calls */
function fakeFetch(routes) {
  const calls = [];
  const fn = async (url, opts = {}) => {
    const method = opts.method || 'GET';
    calls.push({ method, url, opts });
    const r = routes.find(([m, re]) => m === method && re.test(url));
    if (!r) throw new Error(`unexpected ${method} ${url}`);
    const out = r[2](url, opts) || {};
    return new Response(out.json !== undefined ? JSON.stringify(out.json) : out.text || '', { status: out.status || 200, headers: out.headers || {} });
  };
  fn.calls = calls;
  return fn;
}
const ctxFor = (extra = {}) => ({ cfg, channel, log: () => {}, ...extra });

test('secrets: owner-only files, scoped paths, redaction', () => {
  const f = writeSecret(cfg, 'channels/demo/demo', { token: 'abcdefghijklmnop' });
  assert.equal(f, secretFile(cfg, 'channels/demo/demo'));
  assert.equal(fs.statSync(f).mode & 0o777, 0o600);
  assert.equal(fs.statSync(path.dirname(f)).mode & 0o777, 0o700);
  assert.deepEqual(readSecret(cfg, 'channels/demo/demo'), { token: 'abcdefghijklmnop' });
  assert.equal(readSecret(cfg, 'channels/demo/none'), null);
  assert.throws(() => secretFile(cfg, '../etc/passwd'), /bad secret scope/);
  assert.equal(redact('abcdefghijklmnop'), 'abcd…mnop');
});

test('http: API errors are readable and never contain tokens', async () => {
  assert.equal(scrub('https://x/y?access_token=SECRET&a=1 Bearer abc.def'), 'https://x/y?access_token=•••&a=1 Bearer •••');
  const f = fakeFetch([['GET', /x/, () => ({ status: 400, json: { error: { message: 'bad token SECRET?access_token=SECRET' } } })]]);
  await assert.rejects(request(f, 'https://api.example/x?access_token=SECRET'), (e) => e.status === 400 && !e.message.includes('SECRET=') && !/access_token=SECRET/.test(e.message));
});

test('media: probe + platform specs', () => {
  const info = probe(VIDEO);
  assert.equal(info.video.codec, 'h264');
  assert.equal(info.video.height, 1280);
  assert.ok(Math.abs(info.duration - 4) < 0.2);
  assert.deepEqual(checkSpecs(info, youtube.SPECS), []);
  assert.deepEqual(checkSpecs(info, instagram.SPECS), []);
  const short = probe(makeVideo(tmpDir(), 2));
  assert.match(checkSpecs(short, instagram.SPECS).join(), /too short/);
  const wide = probe(makeVideo(tmpDir(), 4, '1280x720'));
  assert.match(checkSpecs(wide, youtube.SPECS).join(), /not vertical/);
});

test('metadata: precedence and captions (footer once, hashtags deduped and capped)', () => {
  const m = postMetadata({ script: { title: 'Why?', tags: ['#blush', 'anime'] }, project: { publish: { title: 'Override' } }, channel, template: { manifest: { defaults: { youtube: { category: '23' } } } } });
  assert.equal(m.title, 'Override');
  assert.deepEqual(m.tags, ['blush', 'anime']);
  assert.equal(m.platform('youtube').category, 'education', 'channel beats template');
  const c = captionText({ ...m, description: 'Body #anime' }, { withTitle: true, hashtags: ['reels'] });
  assert.equal(c, `Override\n\nBody #anime\n\n${channel.manifest.publish.footer}\n\n#reels #blush`);
  const many = captionText({ title: '', description: '', footer: '', tags: Array.from({ length: 40 }, (_, i) => `t${i}`) }, { maxHashtags: 30 });
  assert.equal(many.match(/#/g).length, 30);
  assert.ok(captionText({ title: 'x'.repeat(3000), description: '', footer: '', tags: [] }, { withTitle: true, maxChars: 2200 }).length <= 2200);
});

test('exporters: discovered and complete', async () => {
  const all = await loadExporters();
  assert.deepEqual([...all.keys()].sort(), ['instagram', 'youtube']);
});

test('youtube: plan is exactly the Data API body; problems block publishing', () => {
  const plan = youtube.plan(ctxFor({ script: { title: 'Why Do You Blush?', tags: ['blush'] }, project: {}, file: VIDEO, overrides: {} }));
  assert.deepEqual(plan.problems, []);
  assert.equal(plan.body.snippet.title, 'Why Do You Blush?');
  assert.equal(plan.body.snippet.categoryId, '27');
  assert.match(plan.body.snippet.description, /#shorts$/);
  assert.deepEqual(plan.body.status, { privacyStatus: 'private', selfDeclaredMadeForKids: false, embeddable: true, license: 'youtube', containsSyntheticMedia: false });
  const sched = youtube.plan(ctxFor({ script: { title: 'T' }, project: {}, file: VIDEO, overrides: { privacy: 'public', publishAt: '2030-01-01T10:00:00Z' } }));
  assert.equal(sched.body.status.privacyStatus, 'private', 'scheduled videos must be private until publishAt');
  assert.equal(sched.body.status.publishAt, '2030-01-01T10:00:00Z');
  const bad = youtube.plan(ctxFor({ script: {}, project: {}, file: VIDEO, overrides: { privacy: 'friends' } }));
  assert.match(bad.problems.join(), /privacy must be/);
  assert.match(bad.problems.join(), /no title/);
});

test('youtube: client secret file + loopback sign-in receiver', async () => {
  const d = tmpDir(), f = path.join(d, 'c.json');
  fs.writeFileSync(f, JSON.stringify({ installed: { client_id: 'cid', client_secret: 'cs' } }));
  assert.deepEqual(parseClientSecret(f), { client_id: 'cid', client_secret: 'cs', type: 'desktop' });
  fs.writeFileSync(f, '{}');
  assert.throws(() => parseClientSecret(f), /not a Google OAuth client/);
  const ok = await startLoopback('S1', 5000);
  await fetch(`http://127.0.0.1:${ok.port}/?code=CODE&state=S1`);
  assert.equal(await ok.code, 'CODE');
  const bad = await startLoopback('S2', 5000);
  await fetch(`http://127.0.0.1:${bad.port}/?code=CODE&state=WRONG`);
  await assert.rejects(bad.code, /state mismatch/);
});

test('youtube: connect (PKCE sign-in, account check) then resumable upload', async () => {
  const d = tmpDir(), cs = path.join(d, 'c.json');
  fs.writeFileSync(cs, JSON.stringify({ installed: { client_id: 'cid', client_secret: 'csecret' } }));
  const routes = (handle) => [
    ['POST', /oauth2\.googleapis\.com\/token/, (u, o) => (String(o.body).includes('grant_type=authorization_code') ? { json: { access_token: 'AT', refresh_token: 'RT', scope: 's' } } : { json: { access_token: 'AT2' } })],
    ['GET', /youtube\/v3\/channels/, () => ({ json: { items: [{ id: 'UC1', snippet: { title: 'Demo', customUrl: handle } }] } })],
  ];
  const signIn = (url) => { const u = new URL(url); fetch(`${u.searchParams.get('redirect_uri')}/?code=C&state=${u.searchParams.get('state')}`); };
  await assert.rejects(youtube.connect(ctxFor({ fetch: fakeFetch(routes('@someoneelse')), open: signIn }), { clientSecret: cs }), /signed in as Demo \(@someoneelse\)/);
  const f = fakeFetch(routes('@demoshorts'));
  let authUrl;
  const acc = await youtube.connect(ctxFor({ fetch: f, open: (u) => { authUrl = new URL(u); signIn(u); } }), { clientSecret: cs });
  assert.equal(acc.id, 'UC1');
  assert.equal(authUrl.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(authUrl.searchParams.get('access_type'), 'offline');
  assert.match(authUrl.searchParams.get('scope'), /youtube\.upload/);
  assert.match(String(f.calls[0].opts.body), /code_verifier=/);
  assert.equal(readSecret(cfg, 'channels/demo/youtube').refresh_token, 'RT');
  assert.equal(youtube.status(ctxFor()).connected, true);

  const up = fakeFetch([
    routes()[0],
    ['POST', /upload\/youtube\/v3\/videos\?uploadType=resumable/, () => ({ headers: { location: 'https://upload.example/session1' } })],
    ['PUT', /upload\.example\/session1/, () => ({ json: { id: 'VID123', status: { privacyStatus: 'private' } } })],
  ]);
  const ctx = ctxFor({ fetch: up, script: { title: 'Blush' }, project: {}, file: VIDEO, overrides: {} });
  const r = await youtube.publish(ctx, youtube.plan(ctx));
  assert.deepEqual(r, { id: 'VID123', url: 'https://www.youtube.com/shorts/VID123', privacy: 'private' });
  const init = up.calls.find((c) => c.url.includes('uploadType=resumable'));
  assert.equal(init.opts.headers.Authorization, 'Bearer AT2');
  assert.equal(init.opts.headers['X-Upload-Content-Length'], String(fs.statSync(VIDEO).size));
  assert.equal(JSON.parse(init.opts.body).snippet.title, 'Blush');
  assert.equal(up.calls.find((c) => c.method === 'PUT').opts.body.length, fs.statSync(VIDEO).size);
});

test('instagram: connect checks the account type and handle', async () => {
  const me = (json) => fakeFetch([['GET', /graph\.instagram\.com\/v[\d.]+\/me\?/, () => ({ json })]]);
  await assert.rejects(instagram.connect(ctxFor({ fetch: me({ user_id: '1', username: 'x', account_type: 'PERSONAL' }) }), { token: 'T' }), /professional/);
  const ch2 = { ...channel, manifest: { ...channel.manifest, instagram: '@demo.channel' } };
  await assert.rejects(instagram.connect({ cfg, channel: ch2, log: () => {}, fetch: me({ user_id: '1', username: 'other', account_type: 'BUSINESS' }) }, { token: 'T' }), /token is for @other/);
  const acc = await instagram.connect(ctxFor({ fetch: me({ user_id: '1789', username: 'demo.channel', account_type: 'MEDIA_CREATOR' }) }), { token: 'IGTOKEN' });
  assert.equal(acc.id, '1789');
  assert.equal(readSecret(cfg, 'channels/demo/instagram').access_token, 'IGTOKEN');
  assert.match(instagram.status(ctxFor()).detail, /@demo\.channel .*valid (59|60) more days/);
});

test('instagram: token refresh after a week', async () => {
  const s = readSecret(cfg, 'channels/demo/instagram');
  writeSecret(cfg, 'channels/demo/instagram', { ...s, refreshed_at: new Date(Date.now() - 8 * 86400e3).toISOString() });
  const f = fakeFetch([['GET', /refresh_access_token\?grant_type=ig_refresh_token/, () => ({ json: { access_token: 'IGTOKEN2', expires_in: 5184000 } })]]);
  const acc = await igAccount(ctxFor({ fetch: f }));
  assert.equal(acc.access_token, 'IGTOKEN2');
  assert.equal(readSecret(cfg, 'channels/demo/instagram').access_token, 'IGTOKEN2');
  writeSecret(cfg, 'channels/demo/instagram', { ...acc, expires_at: new Date(Date.now() - 1000).toISOString() });
  await assert.rejects(igAccount(ctxFor({ fetch: f })), /expired/);
  writeSecret(cfg, 'channels/demo/instagram', acc);
});

test('instagram: plan (caption rules, audio re-encode) and the Reel publishing flow', async () => {
  const ctx0 = ctxFor({ script: { title: 'Why Do You Blush?', tags: ['blush'] }, project: {}, file: VIDEO });
  const plan = instagram.plan(ctx0);
  assert.deepEqual(plan.problems, []);
  assert.equal(plan.params.media_type, 'REELS');
  assert.equal(plan.params.share_to_feed, true);
  assert.equal(plan.params.thumb_offset, 1500);
  assert.equal(plan.reencode, true, '192k audio → 128k for Instagram');
  assert.match(plan.params.caption, /^Why Do You Blush\?\n\n/);
  let polls = 0;
  const f = fakeFetch([
    ['GET', /content_publishing_limit/, () => ({ json: { data: [{ quota_usage: 3, config: { quota_total: 100 } }] } })],
    ['POST', /\/1789\/media$/, (u, o) => { const b = new URLSearchParams(o.body); assert.equal(b.get('video_url'), 'https://host.example/v.mp4'); assert.equal(b.get('media_type'), 'REELS'); return { json: { id: 'CONT1' } }; }],
    ['GET', /\/CONT1\?fields=status_code/, () => ({ json: { status_code: ++polls < 2 ? 'IN_PROGRESS' : 'FINISHED' } })],
    ['POST', /\/1789\/media_publish$/, (u, o) => (assert.equal(new URLSearchParams(o.body).get('creation_id'), 'CONT1'), { json: { id: 'MEDIA9' } })],
    ['GET', /\/MEDIA9\?fields=permalink/, () => ({ json: { permalink: 'https://www.instagram.com/reel/abc/' } })],
  ]);
  let hosted;
  const ctx = { ...ctx0, fetch: f, host: async (file) => { hosted = probe(file); return { url: 'https://host.example/v.mp4' }; } };
  const r = await instagram.publish(ctx, plan, { pollMs: 1 });
  assert.deepEqual(r, { id: 'MEDIA9', url: 'https://www.instagram.com/reel/abc/', privacy: 'public' });
  assert.ok(hosted.audio.bitrate <= 135000, `hosted audio ${hosted.audio.bitrate}`);
  assert.equal(polls, 2);
  assert.ok(!fs.existsSync(VIDEO.replace('.mp4', '-instagram.mp4')), 'temporary re-encode removed');
  const full = fakeFetch([['GET', /content_publishing_limit/, () => ({ json: { data: [{ quota_usage: 100, config: { quota_total: 100 } }] } })]]);
  await assert.rejects(instagram.publish({ ...ctx, fetch: full }, plan), /limit reached/);
});

test('instagram: a Facebook Page token posts through graph.facebook.com and is never refreshed', async () => {
  const saved = readSecret(cfg, 'channels/demo/instagram');
  const ch2 = { ...channel, manifest: { ...channel.manifest, instagram: '@demo.channel' } };
  const page = (ig) => fakeFetch([
    ['GET', /graph\.facebook\.com\/v[\d.]+\/me\?fields=id,name,instagram_business_account/, () => ({ json: { id: 'P1', name: 'Demo', ...(ig ? { instagram_business_account: ig } : {}) } })],
    ['GET', /graph\.facebook\.com\/v[\d.]+\/debug_token/, () => ({ json: { data: { expires_at: 0 } } })],
  ]);
  await assert.rejects(instagram.connect(ctxFor({ fetch: page(null) }), { token: 'EAAPAGE' }), /no linked Instagram/);
  await assert.rejects(instagram.connect({ cfg, channel: ch2, log: () => {}, fetch: page({ id: '42', username: 'other' }) }, { token: 'EAAPAGE' }), /token is for @other/);
  const acc = await instagram.connect({ cfg, channel: ch2, log: () => {}, fetch: page({ id: '42', username: 'demo.channel' }) }, { token: 'EAAPAGE' });
  assert.equal(acc.id, '42');
  const s = readSecret(cfg, 'channels/demo/instagram');
  assert.equal(s.api, 'facebook');
  assert.equal(s.expires_at, null);
  writeSecret(cfg, 'channels/demo/instagram', { ...s, connected_at: new Date(Date.now() - 30 * 86400e3).toISOString() });
  assert.equal((await igAccount(ctxFor({ fetch: fakeFetch([]) }))).access_token, 'EAAPAGE', 'no refresh call');
  const plan = instagram.plan(ctxFor({ script: { title: 'Why Do You Blush?', tags: ['blush'] }, project: {}, file: VIDEO }));
  const f = fakeFetch([
    ['GET', /graph\.facebook\.com\/v[\d.]+\/42\/content_publishing_limit/, () => ({ json: { data: [{ quota_usage: 0, config: { quota_total: 100 } }] } })],
    ['POST', /graph\.facebook\.com\/v[\d.]+\/42\/media$/, () => ({ json: { id: 'C2' } })],
    ['GET', /graph\.facebook\.com\/v[\d.]+\/C2\?fields=status_code/, () => ({ json: { status_code: 'FINISHED' } })],
    ['POST', /graph\.facebook\.com\/v[\d.]+\/42\/media_publish$/, () => ({ json: { id: 'M2' } })],
    ['GET', /graph\.facebook\.com\/v[\d.]+\/M2\?fields=permalink/, () => ({ json: { permalink: 'https://www.instagram.com/reel/fb/' } })],
  ]);
  const r = await instagram.publish(ctxFor({ fetch: f, host: async () => ({ url: 'https://host.example/v.mp4' }) }), plan, { pollMs: 1 });
  assert.equal(r.url, 'https://www.instagram.com/reel/fb/');
  writeSecret(cfg, 'channels/demo/instagram', saved);
});

test('publish bookkeeping: history guards double posts; stale renders are caught', () => {
  const dir = createProject({ template: loadTemplate(channel.manifest.defaults.template, cfg), name: 'pub', cfg, channel });
  recordPublish(dir, { to: 'youtube', id: 'V', url: 'u', at: 'now' });
  assert.deepEqual(history(loadProject(dir, cfg).manifest).map((h) => h.to), ['youtube']);
  const render = path.join(dir, 'renders/pub.mp4');
  fs.copyFileSync(VIDEO, render);
  const past = new Date(Date.now() - 60_000);
  fs.utimesSync(render, past, past);
  assert.deepEqual(staleInputs(loadProject(dir, cfg), render).sort(), ['script.json', 'src/shots.js']);
  fs.utimesSync(render, new Date(), new Date(Date.now() + 60_000));
  assert.deepEqual(staleInputs(loadProject(dir, cfg), render), []);
});

test('content credentials: studio renders carry none; a C2PA box is detected', () => {
  const dir = tmpDir(), v = makeVideo(dir);
  assert.equal(contentCredentials(v), false);
  const tagged = path.join(dir, 'tagged.mp4');
  fs.writeFileSync(tagged, Buffer.concat([fs.readFileSync(v), Buffer.from('....jumbc2pa.manifest')]));
  assert.equal(contentCredentials(tagged), true);
});
