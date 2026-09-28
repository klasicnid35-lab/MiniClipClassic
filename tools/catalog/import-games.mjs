// Installs a whole folder of game files at once, matching each file to its
// catalogue record by title. ONLY use it for files you have the right to
// publish: everything in games/ goes live on the public website.
//
//   node tools/catalog/import-games.mjs <folder>            dry run: shows what would be installed
//   node tools/catalog/import-games.mjs <folder> --apply    copy the files and update data/games.json
//
// Options:
//   --replace-streams   also install games that are now streamed from their
//                       official host (a local copy then takes over)
//   --map <file>        extra "file name | game id" lines for files whose names
//                       don't match a title
//
// File names are matched like the catalogue matches titles: case, "&"/"and",
// apostrophes, dashes, underscores, spacing, CamelCase and "II"/"2" don't
// matter, and a "Miniclip Game" prefix is ignored ("Miniclip Game 3 Foot
// Ninja II.exe" style names, "3FootNinja2.swf" and "3-foot-ninja-ii.swf" all
// find 3 Foot Ninja II). Sequels are never mixed up. Only .swf files are
// imported; anything else is listed and left alone.
import fs from 'fs';
import path from 'path';
import {
  ROOT, GAMES_JSON, readJSON, writeGames, titleKey, compactKey, isRemote, swfSize, isSwfFile,
} from './lib.mjs';

const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); if (i < 0) return false; argv.splice(i, 1); return true; };
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv.splice(i, 2)[1] : undefined; };
const APPLY = flag('--apply');
const REPLACE_STREAMS = flag('--replace-streams');
const MAP = opt('--map');
const dir = argv[0];
if (!dir || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
  console.error('usage: node tools/catalog/import-games.mjs <folder with .swf files> [--apply] [--replace-streams] [--map names.txt]');
  process.exit(1);
}

const games = readJSON(GAMES_JSON, []);
const byId = new Map(games.map((g) => [g.id, g]));
const byKey = new Map();
const byCompact = new Map();
for (const g of games) {
  for (const t of [g.title, ...(g.aliases || [])]) {
    if (!byKey.has(titleKey(t))) byKey.set(titleKey(t), g);
    if (!byCompact.has(compactKey(t))) byCompact.set(compactKey(t), g);
  }
}
const manual = new Map();
if (MAP) {
  for (const line of fs.readFileSync(MAP, 'utf8').split(/\r?\n/)) {
    const [file, id] = line.split('|').map((s) => (s || '').trim());
    if (!file || file.startsWith('#')) continue;
    if (!byId.has(id)) { console.error(`--map: unknown game id "${id}" for ${file}`); process.exit(1); }
    manual.set(file.toLowerCase(), id);
  }
}

// "Miniclip Game 3FootNinja_II" -> "3 Foot Ninja II"
function nameOf(file) {
  return path.basename(file, path.extname(file))
    .replace(/^miniclip[\s_-]*game[\s_-]*/i, '')
    .replace(/[_.]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .trim();
}
function match(file) {
  const m = manual.get(path.basename(file).toLowerCase());
  if (m) return byId.get(m);
  const n = nameOf(file);
  return byKey.get(titleKey(n)) || byCompact.get(compactKey(n)) || byId.get(n.toLowerCase().replace(/\s+/g, '-')) || null;
}

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
})(path.resolve(dir));

const plan = [];
const skipped = [];
const unmatched = [];
const claimed = new Map();
for (const f of files.sort()) {
  if (path.extname(f).toLowerCase() !== '.swf') { skipped.push([f, 'not a .swf file']); continue; }
  if (!isSwfFile(f)) { skipped.push([f, 'not a Flash file inside']); continue; }
  const g = match(f);
  if (!g) { unmatched.push(f); continue; }
  if (claimed.has(g.id)) { skipped.push([f, `"${g.title}" already matched ${path.basename(claimed.get(g.id))}`]); continue; }
  const streamed = g.installed && isRemote(g.gameFile);
  if (g.installed && !streamed) { skipped.push([f, `"${g.title}" is already installed (${g.gameFile})`]); continue; }
  if (streamed && !REPLACE_STREAMS) { skipped.push([f, `"${g.title}" is already playable from its official host (use --replace-streams)`]); continue; }
  claimed.set(g.id, f);
  plan.push({ f, g });
}

const rel = (f) => path.relative(process.cwd(), f);
console.log(`${files.length} file${files.length === 1 ? '' : 's'} in ${rel(path.resolve(dir)) || '.'}: ${plan.length} to install, ${skipped.length} skipped, ${unmatched.length} not matched\n`);
for (const { f, g } of plan) console.log(`  install  ${rel(f)}  ->  ${g.title}  (games/${g.id}/${g.id}.swf)`);
for (const [f, why] of skipped) console.log(`  skip     ${rel(f)}  (${why})`);
for (const f of unmatched) console.log(`  ???      ${rel(f)}  (no game called "${nameOf(f)}" - rename the file or use --map)`);

if (!APPLY) {
  console.log('\nDry run - nothing was changed. Add --apply to install these files.');
  console.log('Only import files you have the right to publish: GitHub Pages makes everything in games/ public.');
  process.exit(0);
}
for (const { f, g } of plan) {
  const dest = path.join(ROOT, 'games', g.id);
  fs.mkdirSync(dest, { recursive: true });
  fs.copyFileSync(f, path.join(dest, `${g.id}.swf`));
  const size = swfSize(f);
  g.type = 'flash';
  g.gameFile = `games/${g.id}/${g.id}.swf`;
  g.installed = true;
  if (size) Object.assign(g, size);
}
writeGames(games);
console.log(`\nInstalled ${plan.length} game${plan.length === 1 ? '' : 's'}. Run node tools/catalog/validate.mjs to double-check.`);
