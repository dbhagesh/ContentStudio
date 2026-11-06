// A small HTTP helper for the exporters: JSON / form bodies, readable API errors, and tokens scrubbed from every
// message. `fetchImpl` is injectable so the exporters can be tested without the network.
export class HttpError extends Error {
  constructor(message, { status, data } = {}) { super(message); this.status = status; this.data = data; }
}

const SECRET_PARAMS = /([?&](access_token|client_secret|refresh_token|code)=)[^&\s"]+/g;
export const scrub = (s) => String(s).replace(SECRET_PARAMS, '$1•••').replace(/(Bearer|OAuth)\s+[A-Za-z0-9._\-~+/=]+/g, '$1 •••');

/**
 * request(fetch, url, { method, headers, json, form, body, expect }) → { status, headers, data }
 * json → JSON body · form → x-www-form-urlencoded body · body → raw (Buffer / Blob) · expect: accepted statuses
 */
export async function request(fetchImpl, url, { method = 'GET', headers = {}, json, form, body, expect = [200, 201] } = {}) {
  const h = { ...headers };
  let payload = body;
  if (json !== undefined) { payload = JSON.stringify(json); h['Content-Type'] ??= 'application/json; charset=UTF-8'; }
  if (form !== undefined) { payload = new URLSearchParams(Object.entries(form).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])).toString(); h['Content-Type'] = 'application/x-www-form-urlencoded'; }
  let res;
  try { res = await fetchImpl(url, { method, headers: h, body: payload }); }
  catch (e) { throw new HttpError(`${method} ${scrub(url.split('?')[0])}: network error (${e.message})`); }
  const text = await res.text();
  let data = text;
  try { data = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  if (!expect.includes(res.status)) {
    const msg = data?.error?.message || data?.error_description || data?.error?.error_user_msg || (typeof data === 'string' ? data.slice(0, 300) : JSON.stringify(data)?.slice(0, 300));
    throw new HttpError(`${method} ${scrub(url.split('?')[0])}: HTTP ${res.status} ${scrub(msg || '')}`, { status: res.status, data });
  }
  return { status: res.status, headers: res.headers, data };
}
