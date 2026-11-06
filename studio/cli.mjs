// `studio <command> ...`: every module in studio/commands/ exports `commands`, a list of
//   { name, summary, usage, options (node:util parseArgs options), run({ values, positionals, cfg }) }
// so a new command is a new file there, nothing else to wire up.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { COMMANDS_DIR } from './lib/paths.mjs';
import { loadStudioConfig } from './lib/config.mjs';

export async function loadCommands(dir = COMMANDS_DIR) {
  const all = new Map();
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort()) {
    const mod = await import(pathToFileURL(path.join(dir, f)).href);
    for (const c of mod.commands || []) {
      if (all.has(c.name)) throw new Error(`command "${c.name}" is defined twice (${f})`);
      all.set(c.name, { ...c, file: f });
    }
  }
  return all;
}

function help(cmds) {
  const groups = {};
  for (const c of cmds.values()) (groups[c.group || 'other'] ||= []).push(c);
  const lines = ['ContentStudio: template-driven video studio', '', 'usage: studio <command> [args]   (studio help <command> for details)', ''];
  for (const [g, list] of Object.entries(groups)) {
    lines.push(g.toUpperCase());
    for (const c of list) lines.push(`  ${c.name.padEnd(12)} ${c.summary}`);
    lines.push('');
  }
  return lines.join('\n');
}

export async function main(argv = process.argv.slice(2)) {
  const cmds = await loadCommands();
  const [name, ...rest] = argv;
  if (!name || name === 'help' || name === '--help' || name === '-h') {
    const c = cmds.get(rest[0]);
    console.log(c ? `studio ${c.usage}\n\n${c.summary}${c.details ? '\n\n' + c.details : ''}` : help(cmds));
    return 0;
  }
  const cmd = cmds.get(name);
  if (!cmd) { console.error(`unknown command "${name}"\n\n${help(cmds)}`); return 2; }
  let parsed;
  try { parsed = parseArgs({ args: rest, options: cmd.options || {}, allowPositionals: true, strict: true }); }
  catch (e) { console.error(`${e.message}\nusage: studio ${cmd.usage}`); return 2; }
  try {
    const code = await cmd.run({ ...parsed, cfg: loadStudioConfig() });
    return typeof code === 'number' ? code : 0;
  } catch (e) {
    console.error(`✗ ${e.message}`);
    if (process.env.STUDIO_DEBUG) console.error(e.stack);
    return 1;
  }
}
