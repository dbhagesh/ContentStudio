// Credentials, stored only on this computer under <studioHome>/secrets/ (git-ignored), readable by this user only.
//   apps/<exporter>.json               app-level keys (e.g. the Google OAuth client)
//   channels/<channel>/<exporter>.json  one channel's account tokens
// Values are never printed; use redact() for anything shown to a person.
import fs from 'node:fs';
import path from 'node:path';

const SCOPE_RE = /^(apps\/[a-z0-9-]+|channels\/[a-z0-9-]+\/[a-z0-9-]+)$/;

export function secretFile(cfg, scope) {
  if (!SCOPE_RE.test(scope)) throw new Error(`bad secret scope "${scope}"`);
  return path.join(cfg.studioHome, 'secrets', `${scope}.json`);
}

export function readSecret(cfg, scope) {
  const f = secretFile(cfg, scope);
  if (!fs.existsSync(f)) return null;
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

export function writeSecret(cfg, scope, data) {
  const f = secretFile(cfg, scope), dir = path.dirname(f);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  for (let d = dir; d.startsWith(path.join(cfg.studioHome, 'secrets')); d = path.dirname(d)) fs.chmodSync(d, 0o700);
  const tmp = `${f}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(tmp, f);
  return f;
}

export function deleteSecret(cfg, scope) {
  fs.rmSync(secretFile(cfg, scope), { force: true });
}

export const redact = (s) => (!s ? '' : String(s).length <= 10 ? '••••' : `${String(s).slice(0, 4)}…${String(s).slice(-4)}`);
