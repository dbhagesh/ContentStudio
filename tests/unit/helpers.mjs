// Shared test fixtures: temp folders and a studio config pointing at them.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadStudioConfig } from '../../studio/lib/config.mjs';

export function tmpDir(prefix = 'studio-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** the generic test workspace (one demo channel with a simple mascot), never your real channels */
export const FIXTURE_WORKSPACE = path.join(path.dirname(new URL(import.meta.url).pathname), '../fixtures/workspace');

/** the studio's own templates + a fresh temp copy of the fixture workspace (so tests can write to it) */
export function testConfig() {
  const ws = tmpDir('studio-workspace-');
  fs.cpSync(FIXTURE_WORKSPACE, ws, { recursive: true });
  return loadStudioConfig({ env: { STUDIO_WORKSPACE: ws } });
}

export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
