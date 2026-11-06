// The browser engine's pure logic, run in Node (no canvas needed for timing, captions chunking, randomness).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { T, L, Le, Wd, lineWords } from '../../engine/src/core/timing.js';
import { buildCaptions, autoChunks, CAP, DEFAULT_CAPTIONS } from '../../engine/src/core/captions.js';
import { CFG } from '../../engine/src/core/config.js';
import { mulberry32, seedRandom } from '../../engine/src/core/random.js';

function setTiming() {
  T.dur = 4;
  T.lines = [{ i: 0, text: 'What if you swallow gum?', start: 0.4, end: 1.9 }, { i: 1, text: 'It passes through.', start: 2.3, end: 3.4 }];
  T.words = [
    { w: 'What', line: 0, s: 0.4, e: 0.6 }, { w: 'if', line: 0, s: 0.62, e: 0.7 }, { w: 'you', line: 0, s: 0.72, e: 0.9 },
    { w: 'swallow', line: 0, s: 0.95, e: 1.4 }, { w: 'gum?', line: 0, s: 1.45, e: 1.9 },
    { w: 'It', line: 1, s: 2.3, e: 2.4 }, { w: 'passes', line: 1, s: 2.45, e: 2.9 }, { w: 'through.', line: 1, s: 2.95, e: 3.4 },
  ];
}

test('timing lookups: line start/end, word by prefix within a line, loud failure when missing', () => {
  setTiming();
  assert.equal(L(1), 2.3);
  assert.equal(Le(0), 1.9);
  assert.equal(Wd('swall', 0), 0.95);
  assert.equal(Wd('gum', 0, 'e'), 1.9);
  assert.equal(lineWords(1).length, 3);
  assert.throws(() => Wd('gum', 1), /not found in line 1/);
  assert.throws(() => L(9), /no line 9/);
});

test('autoChunks: 2-3 word chunks, longest word highlighted', () => {
  assert.deepEqual(autoChunks('what if you swallow gum'), ['*WHAT IF YOU', '*SWALLOW GUM']);
  // four words split 2 + 2 (never 3 + 1); a tie keeps the first word
  assert.deepEqual(autoChunks('one two three four'), ['*ONE TWO', '*THREE FOUR']);
});

test('captions follow "caps" chunks onto the spoken words and take the template look', () => {
  setTiming();
  CFG.captions = { y: 1234 };
  const caps = buildCaptions({ lines: [{ caps: 'WHAT IF *YOU | *SWALLOW GUM?' }, { caps: 'IT *PASSES' }] });
  assert.equal(caps.length, 3);
  assert.equal(caps[1].s, 0.95 - 0.05);
  assert.deepEqual(caps[1].words.map((w) => w.hi), [true, false]);
  assert.equal(caps[0].e, caps[1].s);
  assert.equal(caps.at(-1).e, T.dur);
  assert.equal(CAP.y, 1234);
  assert.equal(CAP.size, DEFAULT_CAPTIONS.size);
  CFG.captions = {};
});

test('seeded randomness is reproducible and seed-dependent', () => {
  const a = mulberry32(1), b = mulberry32(1), c = mulberry32(2);
  const sa = [a(), a(), a()], sb = [b(), b(), b()];
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, [c(), c(), c()]);
  for (const x of sa) assert.ok(x >= 0 && x < 1);
  const orig = Math.random;
  try { seedRandom(5); const x = Math.random(); seedRandom(5); assert.equal(Math.random(), x); } finally { Math.random = orig; }
});
