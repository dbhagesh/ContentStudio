import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { toSpeaker, resolveSpeakers, missingSpeakers, writeVoices } from '../../studio/lib/voices.mjs';
import { createProject, loadProject } from '../../studio/lib/project.mjs';
import { loadChannel } from '../../studio/lib/channels.mjs';
import { loadTemplate } from '../../studio/lib/templates.mjs';
import { testConfig, writeJson } from './helpers.mjs';

test('character voices map to audio speakers; engine settings pass through', () => {
  assert.deepEqual(toSpeaker({ id: 'af_heart', speed: 1, note: 'x' }), { tts: 'kokoro', voice: 'af_heart', speed: 1 });
  assert.deepEqual(toSpeaker({ engine: 'voicestudio', id: 'mira-v2', model: 'omnivoice' }), { tts: 'voicestudio', voice: 'mira-v2', model: 'omnivoice' });
});

test('speakers: cast voices < channel voices; script speakers count as known', () => {
  const cfg = testConfig();
  const p = loadProject(createProject({ template: loadTemplate(loadChannel('demo', cfg).manifest.defaults.template, cfg), name: 'v', cfg, channel: loadChannel('demo', cfg) }), cfg);
  assert.equal(resolveSpeakers(p, cfg).mascot.voice, 'af_heart');
  p.channel.manifest.voices = { mascot: { engine: 'voicestudio', id: 'saku' }, narrator: { id: 'bf_emma' } };
  assert.deepEqual(resolveSpeakers(p, cfg).mascot, { tts: 'voicestudio', voice: 'saku' });
  assert.deepEqual(missingSpeakers({ lines: [{ speaker: 'mascot' }, { speaker: 'ghost' }, { speaker: 'x' }], speakers: { x: {} } }, { mascot: {} }), ['ghost']);
});

test('writeVoices writes data/voices.json and refuses voiceless speakers', () => {
  const cfg = testConfig();
  const dir = createProject({ template: loadTemplate(loadChannel('demo', cfg).manifest.defaults.template, cfg), name: 'w', cfg, channel: loadChannel('demo', cfg) });
  const p = loadProject(dir, cfg);
  writeVoices(p, cfg);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'data/voices.json'), 'utf8')).speakers.mascot.tts, 'kokoro');
  const sf = path.join(dir, 'script.json');
  writeJson(sf, { ...JSON.parse(fs.readFileSync(sf, 'utf8')), lines: [{ text: 'hi', speaker: 'ghost' }] });
  assert.throws(() => writeVoices(loadProject(dir, cfg), cfg), /no voice for speaker\(s\) ghost/);
});
