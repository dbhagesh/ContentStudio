// Instagram exporter: Instagram API with Instagram Login (graph.instagram.com), publishing Reels.
//   per channel (after `studio connect`): .studio/secrets/channels/<id>/instagram.json
//     { access_token, user_id, username, account_type, expires_at, refreshed_at }
// With Instagram Login, a Reel is created from a PUBLIC video URL (direct upload is only for Facebook Login apps), so
// the file goes to a temporary host first (verified, expires by itself). Then:
//   POST /<ig-user-id>/media (media_type=REELS) → poll status_code until FINISHED → POST /<ig-user-id>/media_publish
// Limits: a professional (Business or Creator) account; 100 API posts per 24 h (checked first); captions ≤ 2200
// characters and ≤ 30 hashtags; Reels 3 s-15 min, ≤ 300 MB, H.264/HEVC, 23-60 fps, AAC ≤ 48 kHz at 128 kbps.
// Opt-in: a Facebook Page access token ("EAA…", Facebook Login) for a Page linked to the Instagram business account
// works too. The same calls then go to graph.facebook.com; the account is stored with api: 'facebook' and its
// token is not refreshed here (a Page token from a long-lived user token does not expire).
import fs from 'node:fs';
import path from 'node:path';
import { request } from '../http.mjs';
import { readSecret, writeSecret } from '../secrets.mjs';
import { probe, checkSpecs, reencodeAudio } from '../media.mjs';
import { postMetadata, captionText } from '../metadata.mjs';
import { hostFile } from '../hosts.mjs';

export const SPECS = { minDuration: 3, maxDuration: 900, maxBytes: 300e6, maxWidth: 1920, fps: [23, 60], videoCodecs: ['h264', 'hevc'], audioCodecs: ['aac'], maxSampleRate: 48000, maxChannels: 2 };
const AUDIO_BITRATE = 128_000;
const DAY = 86_400_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const base = (ctx, acc) => acc?.api === 'facebook'
  ? `https://graph.facebook.com/${ctx.cfg.publish?.instagram?.facebookApiVersion || 'v21.0'}`
  : `https://graph.instagram.com/${ctx.cfg.publish?.instagram?.apiVersion || 'v27.0'}`;
const isFacebookToken = (token) => /^EAA/.test(token);
const scope = (ctx) => `channels/${ctx.channel.id}/instagram`;
const normUser = (u) => String(u || '').trim().toLowerCase().replace(/^@/, '');

/** the stored account, refreshed if it's more than a week old (tokens live 60 days; refresh needs ≥ 24 h of age) */
export async function account(ctx, { now = Date.now() } = {}) {
  let acc = readSecret(ctx.cfg, scope(ctx));
  if (!acc?.access_token) throw new Error(`Instagram is not connected for channel "${ctx.channel.id}": studio connect instagram --channel ${ctx.channel.id} --token-file <file>`);
  if (acc.expires_at && Date.parse(acc.expires_at) <= now) throw new Error(`the Instagram token for "${ctx.channel.id}" expired on ${acc.expires_at}: generate a new one and connect again`);
  if (acc.api !== 'facebook' && now - Date.parse(acc.refreshed_at || acc.connected_at || 0) > 7 * DAY) {
    try {
      const { data } = await request(ctx.fetch, `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(acc.access_token)}`);
      acc = { ...acc, access_token: data.access_token, refreshed_at: new Date(now).toISOString(), expires_at: new Date(now + (data.expires_in || 60 * 86400) * 1000).toISOString() };
      writeSecret(ctx.cfg, scope(ctx), acc);
      ctx.log?.(`Instagram token refreshed (valid until ${acc.expires_at.slice(0, 10)})`);
    } catch (e) { ctx.log?.(`note: Instagram token refresh failed (${e.message}); using the current token`); }
  }
  return acc;
}

/** connect with a Facebook Page token: the Page's linked Instagram business account is the one posted to */
async function connectPage(ctx, token, anyAccount) {
  const api = base(ctx, { api: 'facebook' }), auth = `access_token=${encodeURIComponent(token)}`;
  const { data: page } = await request(ctx.fetch, `${api}/me?fields=id,name,instagram_business_account{id,username}&${auth}`);
  const ig = page?.instagram_business_account;
  if (!ig?.id) throw new Error(`the token is for "${page?.name || '?'}", which has no linked Instagram business account (use a Page access token, or an Instagram Login token)`);
  const want = ctx.channel.manifest.instagram && normUser(ctx.channel.manifest.instagram);
  if (want && normUser(ig.username) !== want && !anyAccount) throw new Error(`token is for @${ig.username}, but channel "${ctx.channel.id}" is @${want} (pass --any-account to use it anyway)`);
  let expires = null;
  try { expires = (await request(ctx.fetch, `${api}/debug_token?input_token=${encodeURIComponent(token)}&${auth}`)).data?.data?.expires_at || null; } catch { /* unknown expiry */ }
  const now = new Date();
  const acc = { api: 'facebook', access_token: token, page_id: String(page.id), user_id: String(ig.id), username: ig.username, account_type: 'BUSINESS', connected_at: now.toISOString(), expires_at: expires ? new Date(expires * 1000).toISOString() : null };
  writeSecret(ctx.cfg, scope(ctx), acc);
  if (expires && expires * 1000 - now.getTime() < 7 * DAY) ctx.log?.(`note: this token expires ${acc.expires_at}; a Page token from a long-lived user token does not`);
  return { id: acc.user_id, title: `@${ig.username}`, handle: `@${ig.username}` };
}

export default {
  id: 'instagram',
  title: 'Instagram',
  needs: [
    'An Instagram professional account (Business or Creator) for the channel',
    'A Meta developer app with the "Instagram" product → "API setup with Instagram login"',
    'Add the Instagram account there and "Generate token" (a long-lived access token, ~60 days, auto-refreshed here)',
    'Permissions on the token: instagram_business_basic, instagram_business_content_publish',
    'Then run: studio connect instagram --channel <id> --token-file <file with the token>',
  ],
  SPECS,

  status(ctx) {
    const acc = readSecret(ctx.cfg, scope(ctx));
    if (!acc?.access_token) return { connected: false, detail: 'no token yet' };
    const left = acc.expires_at ? Date.parse(acc.expires_at) - Date.now() : null, days = left != null ? Math.round(left / DAY) : null;
    const valid = left == null ? '' : left <= 0 ? ', token EXPIRED' : days > 0 ? `, token valid ${days} more days` : `, token valid ${Math.max(1, Math.round(left / 60_000))} more minutes`;
    return { connected: left == null || left > 0, detail: `@${acc.username} (${acc.account_type || '?'})${valid}`, since: acc.connected_at };
  },

  async connect(ctx, { token, anyAccount = false } = {}) {
    if (!token) throw new Error('give the access token: --token-file <file> (or the STUDIO_INSTAGRAM_TOKEN environment variable)');
    if (isFacebookToken(token)) return connectPage(ctx, token, anyAccount);
    const { data: me } = await request(ctx.fetch, `${base(ctx)}/me?fields=user_id,username,account_type&access_token=${encodeURIComponent(token)}`);
    if (!me?.user_id) throw new Error('the token works but returned no Instagram user id');
    if (me.account_type && !['BUSINESS', 'MEDIA_CREATOR'].includes(me.account_type)) throw new Error(`@${me.username} is a ${me.account_type} account; publishing needs a professional (Business or Creator) account`);
    const want = ctx.channel.manifest.instagram && normUser(ctx.channel.manifest.instagram);
    if (want && normUser(me.username) !== want && !anyAccount) throw new Error(`token is for @${me.username}, but channel "${ctx.channel.id}" is @${want} (pass --any-account to use it anyway)`);
    const now = new Date();
    const acc = { access_token: token, user_id: String(me.user_id), username: me.username, account_type: me.account_type, connected_at: now.toISOString(), refreshed_at: now.toISOString(), expires_at: new Date(now.getTime() + 60 * DAY).toISOString() };
    writeSecret(ctx.cfg, scope(ctx), acc);
    return { id: acc.user_id, title: `@${me.username}`, handle: `@${me.username}` };
  },

  plan(ctx) {
    const meta = postMetadata(ctx), ig = meta.platform('instagram'), info = probe(ctx.file), problems = checkSpecs(info, SPECS);
    const caption = captionText(meta, { withTitle: true, hashtags: ig.hashtags || [], maxHashtags: 30, maxChars: 2200 });
    if ((caption.match(/#[\p{L}\p{N}_]+/gu) || []).length > 30) problems.push('more than 30 hashtags');
    if ((caption.match(/@[\w.]+/g) || []).length > 20) problems.push('more than 20 @ mentions');
    const reencode = !!info.audio && (info.audio.bitrate > AUDIO_BITRATE * 1.05 || info.audio.sampleRate > 48000);
    const params = {
      media_type: 'REELS', caption, share_to_feed: ig.shareToFeed ?? true,
      thumb_offset: ig.thumbOffsetMs != null ? Math.round(ig.thumbOffsetMs) : undefined,
      ...(ig.audioName ? { audio_name: ig.audioName } : {}),
      ...(ig.collaborators?.length ? { collaborators: JSON.stringify(ig.collaborators.slice(0, 3)) } : {}),
    };
    return { exporter: 'instagram', file: ctx.file, media: info, params, reencode, problems,
      summary: `Reel · ${params.share_to_feed ? 'Reels + Feed' : 'Reels tab only'} · ${caption.length} chars${reencode ? ' · audio re-encoded to 128 kbps' : ''} · hosted temporarily (${ctx.cfg.publish?.host || 'litterbox'})` };
  },

  async publish(ctx, plan, { pollMs = 10_000, timeoutMs = 600_000 } = {}) {
    const acc = await account(ctx), api = base(ctx, acc), auth = `access_token=${encodeURIComponent(acc.access_token)}`;
    const { data: lim } = await request(ctx.fetch, `${api}/${acc.user_id}/content_publishing_limit?fields=quota_usage,config&${auth}`);
    const used = lim?.data?.[0]?.quota_usage, total = lim?.data?.[0]?.config?.quota_total;
    if (used != null && total != null && used >= total) throw new Error(`Instagram publishing limit reached (${used}/${total} posts in 24 h)`);
    let file = plan.file;
    if (plan.reencode) file = reencodeAudio(plan.file, path.join(path.dirname(plan.file), `${path.basename(plan.file, '.mp4')}-instagram.mp4`));
    const host = ctx.host || ((f) => hostFile(f, { host: ctx.cfg.publish?.host || 'litterbox', expiry: ctx.cfg.publish?.expiry || '1h' }));
    const { url: videoUrl } = await host(file);
    ctx.log(`video hosted temporarily for Instagram to fetch: ${videoUrl}`);
    const { data: c } = await request(ctx.fetch, `${api}/${acc.user_id}/media`, { method: 'POST', form: { ...plan.params, video_url: videoUrl, access_token: acc.access_token } });
    if (!c?.id) throw new Error('Instagram did not create a media container');
    const t0 = Date.now();
    for (;;) {
      const { data: st } = await request(ctx.fetch, `${api}/${c.id}?fields=status_code,status&${auth}`);
      if (st.status_code === 'FINISHED') break;
      if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') throw new Error(`Instagram could not process the video: ${st.status_code} ${st.status || ''}`.trim());
      if (Date.now() - t0 > timeoutMs) throw new Error(`Instagram is still processing after ${timeoutMs / 1000} s (container ${c.id}); try publishing again later`);
      ctx.log(`Instagram is processing the video (${st.status_code || 'IN_PROGRESS'})…`);
      await sleep(pollMs);
    }
    const { data: pub } = await request(ctx.fetch, `${api}/${acc.user_id}/media_publish`, { method: 'POST', form: { creation_id: c.id, access_token: acc.access_token } });
    let url = null;
    try { url = (await request(ctx.fetch, `${api}/${pub.id}?fields=permalink&${auth}`)).data?.permalink || null; } catch { /* the post exists; the link is a nicety */ }
    if (file !== plan.file) fs.rmSync(file, { force: true });
    return { id: pub.id, url: url || `https://www.instagram.com/${acc.username}/`, privacy: 'public' };
  },
};
