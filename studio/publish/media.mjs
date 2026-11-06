// What a rendered file actually is (ffprobe), checked against a platform's specs before anything is uploaded.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

export function probe(file) {
  if (!fs.existsSync(file)) throw new Error(`no file ${file}`);
  const r = spawnSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file], { encoding: 'utf8' });
  if (r.status) throw new Error(`ffprobe failed on ${file}: ${r.stderr}`);
  const j = JSON.parse(r.stdout), v = j.streams.find((s) => s.codec_type === 'video'), a = j.streams.find((s) => s.codec_type === 'audio');
  const [fn, fd] = String(v?.avg_frame_rate || '0/1').split('/').map(Number);
  return {
    file, size: fs.statSync(file).size, duration: +j.format.duration, container: j.format.format_name,
    video: v && { codec: v.codec_name, width: v.width, height: v.height, fps: fd ? fn / fd : 0, pixFmt: v.pix_fmt },
    audio: a && { codec: a.codec_name, sampleRate: +a.sample_rate, channels: a.channels, bitrate: +a.bit_rate || 0 },
  };
}

/** specs: { minDuration, maxDuration, maxBytes, vertical, maxWidth, fps: [lo, hi], videoCodecs, audioCodecs, maxSampleRate, maxChannels } */
export function checkSpecs(info, specs) {
  const errors = [], v = info.video, a = info.audio;
  if (!v) errors.push('no video stream');
  if (specs.minDuration && info.duration < specs.minDuration) errors.push(`too short: ${info.duration.toFixed(1)} s (min ${specs.minDuration} s)`);
  if (specs.maxDuration && info.duration > specs.maxDuration) errors.push(`too long: ${info.duration.toFixed(1)} s (max ${specs.maxDuration} s)`);
  if (specs.maxBytes && info.size > specs.maxBytes) errors.push(`file too big: ${(info.size / 1e6).toFixed(0)} MB (max ${(specs.maxBytes / 1e6).toFixed(0)} MB)`);
  if (v) {
    if (specs.vertical && !(v.height > v.width)) errors.push(`not vertical: ${v.width}x${v.height}`);
    if (specs.maxWidth && v.width > specs.maxWidth) errors.push(`too wide: ${v.width} px (max ${specs.maxWidth})`);
    if (specs.fps && (v.fps < specs.fps[0] || v.fps > specs.fps[1])) errors.push(`frame rate ${v.fps.toFixed(2)} outside ${specs.fps[0]}-${specs.fps[1]} fps`);
    if (specs.videoCodecs && !specs.videoCodecs.includes(v.codec)) errors.push(`video codec ${v.codec} (needs ${specs.videoCodecs.join(' / ')})`);
  }
  if (specs.audioCodecs) {
    if (!a) errors.push('no audio stream');
    else {
      if (!specs.audioCodecs.includes(a.codec)) errors.push(`audio codec ${a.codec} (needs ${specs.audioCodecs.join(' / ')})`);
      if (specs.maxSampleRate && a.sampleRate > specs.maxSampleRate) errors.push(`audio sample rate ${a.sampleRate} Hz (max ${specs.maxSampleRate})`);
      if (specs.maxChannels && a.channels > specs.maxChannels) errors.push(`${a.channels} audio channels (max ${specs.maxChannels})`);
    }
  }
  return errors;
}

/** a copy with the audio re-encoded (video stream untouched), e.g. to meet a platform's audio bitrate */
export function reencodeAudio(src, out, { bitrate = '128k', sampleRate = 48000 } = {}) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-c:v', 'copy', '-c:a', 'aac', '-b:a', bitrate, '-ar', String(sampleRate), '-movflags', '+faststart', out], { encoding: 'utf8' });
  if (r.status) throw new Error(`ffmpeg failed: ${r.stderr}`);
  return out;
}
