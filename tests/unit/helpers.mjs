// Shared test fixtures: temp folders and a studio config pointing at them.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadStudioConfig } from '../../studio/lib/config.mjs';

export function tmpDir(prefix = 'studio-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** the real config (real templates), with projects going to a temp folder */
export function testConfig() {
  const cfg = loadStudioConfig({ env: {} });
  cfg.projectsDir = tmpDir('studio-projects-');
  return cfg;
}

export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
