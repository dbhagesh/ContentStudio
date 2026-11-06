import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { selectSteps, runPipeline, STEPS } from '../../studio/lib/pipeline.mjs';
import { loadCommands } from '../../studio/cli.mjs';
import { ROOT } from '../../studio/lib/paths.mjs';

const names = (s) => s.map((x) => x.name);

test('pipeline order and slicing', () => {
  assert.deepEqual(names(STEPS), ['timing', 'lint', 'check', 'cues', 'mix', 'sheet', 'render']);
  assert.deepEqual(names(selectSteps({ from: 'cues' })), ['cues', 'mix', 'sheet', 'render']);
  assert.deepEqual(names(selectSteps({ only: ['mix', 'check'] })), ['check', 'mix']);
  assert.deepEqual(names(selectSteps({ skip: ['sheet', 'render'] })), ['timing', 'lint', 'check', 'cues', 'mix']);
  assert.throws(() => selectSteps({ from: 'nope' }), /unknown step "nope"/);
});

test('runPipeline runs custom steps in order and collects results', async () => {
  const seen = [];
  const steps = [{ name: 'a', describe: '', run: () => (seen.push('a'), 1) }, { name: 'b', describe: '', run: async ({ opts }) => (seen.push('b'), opts.x) }];
  const r = await runPipeline({}, {}, { x: 42 }, { steps, log: () => {} });
  assert.deepEqual(seen, ['a', 'b']);
  assert.deepEqual(r, { a: 1, b: 42 });
});

test('commands are discovered from studio/commands, each documented, no duplicates', async () => {
  const cmds = await loadCommands();
  for (const n of ['templates', 'new', 'list', 'voice', 'words', 'estimate', 'mix', 'check', 'cues', 'sheet', 'frames', 'render', 'preview', 'stylesheet', 'build', 'selftest', 'doctor', 'setup', 'host', 'share', 'accounts', 'connect', 'disconnect', 'publish', 'characters', 'channels', 'character-sheet', 'channel-new', 'backlog', 'backlog-add', 'lint']) assert.ok(cmds.has(n), n);
  for (const c of cmds.values()) { assert.ok(c.summary, c.name); assert.ok(c.usage.startsWith(c.name), c.name); assert.equal(typeof c.run, 'function'); }
});

test('CLI: help, unknown command, bad flag, templates --validate', () => {
  const cli = (...a) => spawnSync(process.execPath, [path.join(ROOT, 'bin/studio.mjs'), ...a], { encoding: 'utf8' });
  assert.match(cli().stdout, /usage: studio <command>/);
  assert.equal(cli('nope').status, 2);
  assert.equal(cli('templates', '--bogus').status, 2);
  const v = cli('templates', '--validate');
  assert.equal(v.status, 0, v.stdout + v.stderr);
  assert.match(v.stdout, /templates valid/);
});
