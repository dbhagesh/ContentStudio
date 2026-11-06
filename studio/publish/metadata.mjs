// The words that go with a post, built once and shaped per platform.
// Precedence (first wins): project.json "publish" > script.json > channel.json "publish" > template defaults.
//   common:     title, description, tags (no '#'), footer
//   per platform: project/channel "publish.youtube" / "publish.instagram" (e.g. privacy, category, shareToFeed)
const clean = (t) => String(t).replace(/^#/, '').replace(/\s+/g, '').trim();
const uniq = (xs) => [...new Set(xs.filter(Boolean))];

export function postMetadata({ script = {}, project = {}, channel, template }) {
  const pub = project.publish || {}, ch = channel?.manifest?.publish || {};
  const title = (pub.title || script.title || project.title || '').trim();
  const description = (pub.description || script.description || '').trim();
  const tags = uniq((pub.tags || script.tags || ch.tags || []).map(clean));
  return {
    title, description, tags, footer: ch.footer || '',
    /** merged settings for one platform: template defaults < channel < project */
    platform: (id) => ({ ...(template?.manifest?.defaults?.[id] || {}), ...(ch[id] || {}), ...(pub[id] || {}) }),
  };
}

/** description block: text, then the channel footer, then hashtags (each only if present and not already there) */
export function captionText({ title, description, footer, tags }, { withTitle = false, hashtags = [], maxHashtags = 30, maxChars = 5000 } = {}) {
  const parts = [];
  if (withTitle && title) parts.push(title);
  if (description) parts.push(description);
  if (footer && !parts.join('\n').includes(footer)) parts.push(footer);
  let text = parts.join('\n\n');
  const have = new Set((text.match(/#[\p{L}\p{N}_]+/gu) || []).map((h) => h.slice(1).toLowerCase()));
  const extra = uniq([...hashtags, ...tags].map(clean)).filter((t) => !have.has(t.toLowerCase()));
  const room = Math.max(0, maxHashtags - have.size);
  if (extra.length && room) text = `${text}\n\n${extra.slice(0, room).map((t) => '#' + t).join(' ')}`.trim();
  return text.length > maxChars ? text.slice(0, maxChars - 1) + '…' : text;
}
