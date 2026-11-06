// Who speaks with which voice. A line's "speaker" in script.json names a character (or any id the channel or the
// script defines); its voice comes from, later winning:
//   character.json "voice"  <  channel.json "voices"  <  script.json "speakers"
// A voice is { engine: "kokoro" | "voicestudio" | "http" | ..., id, speed, ...engine settings (url, model) }.
// Lines without a speaker use the narrator (script.json "voice"/"speed"). The timing step writes the result to
// data/voices.json for the audio side.
import fs from 'node:fs';
import path from 'node:path';
import { loadCharacter } from './characters.mjs';

/** character/channel voice { engine, id, speed, ... } → audio-side speaker { tts, voice, speed, ... } */
export function toSpeaker(v = {}) {
  const { engine, id, note, ...rest } = v;
  return { tts: engine || 'kokoro', ...(id && { voice: id }), ...rest };
}

export function resolveSpeakers(p, cfg) {
  const out = {};
  for (const c of p.runtime.cast || []) {
    const v = loadCharacter(c.id, cfg).manifest.voice;
    if (v?.id) out[c.id] = toSpeaker(v);
  }
  for (const [id, v] of Object.entries(p.channel?.manifest.voices || {})) out[id] = toSpeaker(v);
  return out;
}

/** the speakers script.json uses that nobody gave a voice */
export function missingSpeakers(script, speakers) {
  const known = new Set([...Object.keys(speakers), ...Object.keys(script.speakers || {})]);
  return [...new Set((script.lines || []).map((l) => l.speaker).filter((s) => s && !known.has(s)))];
}

export function writeVoices(p, cfg) {
  const speakers = resolveSpeakers(p, cfg), missing = missingSpeakers(p.script(), speakers);
  if (missing.length) throw new Error(`no voice for speaker(s) ${missing.join(', ')}: give the character a "voice", or add it to channel.json "voices" / script.json "speakers"`);
  const f = path.join(p.dir, 'data/voices.json');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify({ speakers }, null, 2) + '\n');
  return speakers;
}
