// A channel's profile picture (avatar.html; `studio avatar --channel <id>`): a square that every platform shows as a
// circle, so everything that matters sits inside the circle. Set in channel.json "brand": { "avatar": {
//   size (800), bg, bg2 (a disc behind the subject), rays (0 = none: a soft sunburst in bg2), ring, ringWidth,
//   character, pose, expression, outfit, x, y, s (where the character stands and its scale, in avatar pixels),
//   text, textColor, textSize (a monogram, when there is no character),
//   module (the channel's own mark: brand/<file>.js exporting default draw(ctx, size, avatar)) } }
// Characters are drawn only by their own code (cast), exactly as in the videos. ?preview=1 masks to the circle the
// platforms show, on dark grey, for checking the crop. Sets window.SHEET_READY.
import { setCtx, ctx } from './lib.js';
import { CFG } from './config.js';
import { cast } from './cast.js';

export async function drawAvatar(o, preview = false) {
  const N = o.size || 800, R = N / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = o.bg || '#1A1A1E'; ctx.fillRect(0, 0, N, N);
  if (o.bg2) {
    if (o.rays) {
      ctx.save(); ctx.translate(R, R); ctx.globalAlpha = 0.35; ctx.fillStyle = o.bg2;
      for (let i = 0; i < o.rays; i++) { const a = (i / o.rays) * Math.PI * 2, w = Math.PI / o.rays / 1.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, N, a - w, a + w); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(R, R, R * 0.74, 0, Math.PI * 2); ctx.fillStyle = o.bg2; ctx.fill();
  }
  if (o.module) (await import(`/brand/${o.module}`)).default(ctx, N, o);
  if (o.character) {
    // the character may overflow the disc but never the circle the platforms crop to
    ctx.save(); ctx.beginPath(); ctx.arc(R, R, R - (o.ring ? o.ringWidth || 18 : 0), 0, Math.PI * 2); ctx.clip();
    cast(o.character).draw({ x: o.x ?? R, y: o.y ?? N, s: o.s ?? 0.5, pose: o.pose, expression: o.expression, outfit: o.outfit, t: 0.4, blink: false, shadow: false });
    ctx.restore();
  }
  if (o.text && !o.character && !o.module) {
    ctx.font = `900 ${o.textSize || N * 0.42}px Inter`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = o.textColor || '#FFFFFF'; ctx.fillText(o.text, R, R + N * 0.02);
  }
  if (o.ring) { const w = o.ringWidth || 18; ctx.beginPath(); ctx.arc(R, R, R - w / 2, 0, Math.PI * 2); ctx.lineWidth = w; ctx.strokeStyle = o.ring; ctx.stroke(); }
  if (preview) {
    ctx.globalCompositeOperation = 'destination-in'; ctx.beginPath(); ctx.arc(R, R, R, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#2A2A2E'; ctx.fillRect(0, 0, N, N);
    ctx.globalCompositeOperation = 'source-over';
  }
}

setCtx(document.getElementById('cv').getContext('2d'));
await drawAvatar(CFG.avatar || {}, new URLSearchParams(location.search).has('preview'));
window.SHEET_READY = true;
