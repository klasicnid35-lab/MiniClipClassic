// Checks data/games.json and prints a report. Exits with code 1 on errors.
//
//   node tools/catalog/validate.mjs              full report
//   node tools/catalog/validate.mjs --find ninja look up ids by (part of) a title
//   node tools/catalog/validate.mjs --quiet      only print problems
import fs from 'fs';
import crypto from 'crypto';
import {
  GAMES_JSON, loadCategories, titleKey, byTitle, isRemote, localPath, letterOf,
  TYPES, HISTORICAL_TYPES, VERIFICATION, RELATIONSHIPS, SOURCE_TYPES, ROOT,
} from './lib.mjs';
import path from 'path';

const argv = process.argv.slice(2);
const quiet = argv.includes('--quiet');
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// ---------------------------------------------------------------- parse
let games;
try {
  games = JSON.parse(fs.readFileSync(GAMES_JSON, 'utf8'));
} catch (e) {
  console.error(`data/games.json is not valid JSON: ${e.message}`);
  process.exit(1);
}
if (!Array.isArray(games)) { console.error('data/games.json must be an array of game records'); process.exit(1); }

const findIdx = argv.indexOf('--find');
if (findIdx >= 0) {
  const q = titleKey(argv[findIdx + 1] || '');
  for (const g of games.filter((x) => [x.title, ...(x.aliases || [])].some((t) => titleKey(t).includes(q)))) {
    console.log(`${g.id.padEnd(36)} ${g.title}${g.installed ? '  [installed: ' + g.gameFile + ']' : ''}`);
  }
  process.exit(0);
}

const { cats, byName } = loadCategories();
const catOf = (v) => byName.get(String(v || '').toLowerCase());
const where = (g, i) => `#${i + 1} "${g && g.title ? g.title : '?'}" (${g && g.id ? g.id : 'no id'})`;

// ---------------------------------------------------------------- per record
const REQUIRED = {
  id: 'string', slug: 'string', title: 'string', aliases: 'array', category: 'string',
  secondaryCategories: 'array', type: 'string', gameFile: 'string', installed: 'boolean',
  featured: 'boolean', popular: 'boolean', new: 'boolean', nostalgiaPriority: 'number',
  rating: 'number', plays: 'number', verificationStatus: 'string', historicalType: 'string',
  relationship: 'string', sources: 'array',
};
const kind = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const seen = { id: new Map(), slug: new Map(), title: new Map(), thumb: new Map(), hash: new Map() };
let brokenFiles = 0, brokenImages = 0, needsReview = 0, placeholders = 0;

games.forEach((g, i) => {
  if (!g || typeof g !== 'object') { err(`record #${i + 1} is not an object`); return; }
  const w = where(g, i);
  for (const [k, t] of Object.entries(REQUIRED)) {
    if (!(k in g)) err(`${w}: missing field "${k}"`);
    else if (kind(g[k]) !== t) err(`${w}: "${k}" should be ${t}, is ${kind(g[k])}`);
  }
  if (typeof g.title === 'string' && !g.title.trim()) err(`${w}: empty title`);
  if (g.id && !SLUG.test(g.id)) err(`${w}: id "${g.id}" is not a URL-safe slug (a-z, 0-9 and single dashes)`);
  if (g.slug && !SLUG.test(g.slug)) err(`${w}: slug "${g.slug}" is not URL-safe`);
  if (g.id && g.slug && g.id !== g.slug) warn(`${w}: slug "${g.slug}" differs from id - links use the id`);
  for (const [k, map] of [['id', seen.id], ['slug', seen.slug]]) {
    if (!g[k]) continue;
    if (map.has(g[k])) err(`${w}: duplicate ${k} "${g[k]}" (also ${map.get(g[k])})`);
    else map.set(g[k], w);
  }
  // titles + aliases must be unique across the catalogue
  const names = [g.title, ...(Array.isArray(g.aliases) ? g.aliases : [])].filter((t) => typeof t === 'string' && t.trim());
  const own = new Set();
  const ownKeys = new Set();
  for (const t of names) {
    const exact = t.trim().toLowerCase();
    if (own.has(exact)) { err(`${w}: alias "${t}" repeats the title or another alias`); continue; }
    own.add(exact);
    const k = titleKey(t);
    if (ownKeys.has(k)) continue; // e.g. "The Black Knight" next to "Black Knight"
    ownKeys.add(k);
    if (seen.title.has(k)) err(`${w}: title/alias "${t}" duplicates ${seen.title.get(k)}`);
    else seen.title.set(k, w);
  }
  // categories
  const main = catOf(g.category);
  if (!main) err(`${w}: unknown category "${g.category}"`);
  else if (main.virtual) err(`${w}: "${g.category}" is a virtual section, not a category`);
  for (const c of g.secondaryCategories || []) {
    if (!catOf(c) || catOf(c).virtual) err(`${w}: unknown secondary category "${c}"`);
    else if (main && catOf(c).id === main.id) warn(`${w}: secondary category "${c}" repeats the main category`);
  }
  if (g.type && !TYPES.includes(g.type)) err(`${w}: unknown type "${g.type}" (use ${TYPES.join(', ')})`);
  if (g.historicalType && !HISTORICAL_TYPES.includes(g.historicalType)) err(`${w}: unknown historicalType "${g.historicalType}"`);
  if (g.verificationStatus && !VERIFICATION.includes(g.verificationStatus)) err(`${w}: unknown verificationStatus "${g.verificationStatus}"`);
  if (g.verificationStatus === 'needs-review') needsReview++;
  if (g.relationship && !RELATIONSHIPS.includes(g.relationship)) err(`${w}: unknown relationship "${g.relationship}" (use ${RELATIONSHIPS.join(', ')})`);
  if (Array.isArray(g.sources)) {
    if (!g.sources.length) err(`${w}: no sources - every game needs at least one source in tools/catalog/sources/`);
    for (const src of g.sources) {
      if (!src || typeof src.name !== 'string' || !src.name) err(`${w}: every source needs a name`);
      else if (!SOURCE_TYPES.includes(src.type)) err(`${w}: source "${src.name}" has unknown type "${src.type}"`);
    }
    if (g.verificationStatus === 'verified' && !g.sources.some((x) => x && (x.type === 'official' || x.type === 'screenshot'))) err(`${w}: "verified" needs an official or screenshot source`);
  }
  if (g.series !== undefined && g.series !== null && typeof g.series !== 'string') err(`${w}: series should be text or null`);
  if (g.seriesOrder !== undefined && g.seriesOrder !== null && !(Number.isInteger(g.seriesOrder) && g.seriesOrder > 0)) err(`${w}: seriesOrder should be a whole number or null`);
  if (typeof g.nostalgiaPriority === 'number' && ![0, 1, 2, 3].includes(g.nostalgiaPriority)) err(`${w}: nostalgiaPriority must be 0, 1, 2 or 3`);
  if (typeof g.rating === 'number' && (g.rating < 0 || g.rating > 5)) err(`${w}: rating must be between 0 and 5`);
  if (typeof g.plays === 'number' && g.plays < 0) err(`${w}: plays can't be negative`);
  if (g.year !== null && g.year !== undefined && !(Number.isInteger(g.year) && g.year >= 1990 && g.year <= 2030)) err(`${w}: year should be a number like 2006, or null when unknown`);
  for (const k of ['developer', 'publisher']) if (g[k] !== null && g[k] !== undefined && typeof g[k] !== 'string') err(`${w}: ${k} should be text or null`);
  for (const k of ['width', 'height']) if (g[k] !== undefined && g[k] !== null && !(Number(g[k]) > 0)) err(`${w}: ${k} should be a positive number`);

  // artwork
  for (const k of ['thumbnail', 'image']) {
    const p = g[k];
    if (!p) { if (k === 'thumbnail') placeholders++; continue; }
    if (isRemote(p)) continue;
    if (!fs.existsSync(localPath(p))) { err(`${w}: ${k} "${p}" does not exist`); brokenImages++; continue; }
    if (seen.thumb.has(p)) warn(`${w}: ${k} "${p}" is also used by ${seen.thumb.get(p)}`);
    else seen.thumb.set(p, w);
    const hash = crypto.createHash('md5').update(fs.readFileSync(localPath(p))).digest('hex');
    if (seen.hash.has(hash) && seen.hash.get(hash) !== w) warn(`${w}: ${k} "${p}" is the same picture as ${seen.hash.get(hash)}`);
    else seen.hash.set(hash, w);
  }

  // game files
  const f = g.gameFile;
  if (g.installed) {
    if (!f) { err(`${w}: installed is true but gameFile is empty`); brokenFiles++; }
    else if (isRemote(f)) { if (!/^https:\/\//i.test(f)) err(`${w}: gameFile must use https:// - browsers block http content on https pages`); }
    else if (!fs.existsSync(localPath(f))) { err(`${w}: installed is true but "${f}" does not exist`); brokenFiles++; }
    else {
      const ext = path.extname(f).toLowerCase();
      if (g.type === 'flash' && ext !== '.swf') warn(`${w}: type is flash but "${f}" is not a .swf file`);
      if ((g.type === 'html5' || g.type === 'local-web') && !['.html', '.htm'].includes(ext)) warn(`${w}: type is ${g.type} but "${f}" is not an .html page`);
    }
  } else {
    if (f && !isRemote(f) && fs.existsSync(localPath(f))) warn(`${w}: "${f}" exists but installed is false - set "installed": true to make it playable`);
    const dir = path.join(ROOT, 'games', g.id || '_');
    if (g.id && fs.existsSync(dir) && fs.readdirSync(dir).length) warn(`${w}: games/${g.id}/ has files but the game is not installed - run node tools/catalog/sync-files.mjs`);
  }
});

// ---------------------------------------------------------------- whole catalogue
const valid = games.filter((g) => g && typeof g.title === 'string');
const sorted = valid.slice().sort(byTitle);
const outOfOrder = valid.findIndex((g, i) => g !== sorted[i]);
if (outOfOrder >= 0) warn(`records are not in natural A-Z order (first difference at "${valid[outOfOrder].title}") - run node tools/catalog/sync-files.mjs or build-catalog.mjs to re-sort`);

const countIn = (c) => valid.filter((g) => [g.category, ...(g.secondaryCategories || [])].some((x) => catOf(x) && catOf(x).id === c.id)).length;
const emptyCats = cats.filter((c) => !c.virtual && countIn(c) === 0);
for (const c of emptyCats) warn(`category "${c.name}" has no games (it is hidden on the site)`);

// ---------------------------------------------------------------- data/site.json references
const site = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/site.json'), 'utf8')); } catch (e) { err(`data/site.json: ${e.message}`); return {}; } })();
const ids = new Set(valid.map((g) => g.id));
const refs = [];
for (const b of site.homeCategories || []) {
  const id = typeof b === 'string' ? b : b.id;
  if (!cats.some((c) => c.id === id)) err(`data/site.json: homeCategories has unknown category "${id}"`);
  for (const g of (b && b.games) || []) refs.push(['homeCategories.' + id, g]);
}
for (const id of site.navCategories || []) if (!cats.some((c) => c.id === id)) err(`data/site.json: navCategories has unknown category "${id}"`);
for (const k of ['homeFeatured', 'homeLatestThumbs', 'hotGames', 'topTen', 'topGames']) for (const g of site[k] || []) refs.push([k, g]);
if (site.daily) for (const k of ['left', 'right']) if (site.daily[k]) refs.push(['daily.' + k, site.daily[k]]);
for (const [where, id] of refs) if (!ids.has(id)) err(`data/site.json: ${where} refers to "${id}", which is not in data/games.json`);

// ---------------------------------------------------------------- report
const n = (f) => valid.filter(f).length;
const letters = {};
for (const g of valid) letters[letterOf(g.title)] = (letters[letterOf(g.title)] || 0) + 1;
const dupIds = errors.filter((e) => e.includes('duplicate id')).length;
const dupTitles = errors.filter((e) => e.includes('duplicates')).length;
const aliases = valid.reduce((s, g) => s + (Array.isArray(g.aliases) ? g.aliases.length : 0), 0);

if (!quiet) {
  const row = (k, v) => console.log('  ' + (k + ':').padEnd(34) + v);
  console.log('MiniClip Classic - catalogue check (data/games.json)\n');
  row('Total records', valid.length);
  row('Duplicate IDs', dupIds);
  row('Duplicate titles/aliases', dupTitles);
  row('Aliases', aliases);
  row('Installed (playable)', `${n((g) => g.installed)} (${n((g) => g.installed && isRemote(g.gameFile))} streamed from their official host)`);
  row('Not installed yet', n((g) => !g.installed));
  row('Broken local game files', brokenFiles);
  row('Broken image paths', brokenImages);
  row('Using generated thumbnails', placeholders);
  row('Verified/cross/single/review', VERIFICATION.map((v) => n((g) => g.verificationStatus === v)).join(' / '));
  row('Flash / HTML5 / iframe / local', ['flash', 'html5', 'iframe', 'local-web'].map((t) => n((g) => g.type === t)).join(' / '));
  row('Historical types', HISTORICAL_TYPES.map((t) => `${t} ${n((g) => g.historicalType === t)}`).join(', '));
  row('Relationship with Miniclip', RELATIONSHIPS.map((t) => `${t} ${n((g) => g.relationship === t)}`).join(', '));
  row('Series', `${new Set(valid.filter((g) => g.series).map((g) => g.series)).size} (${n((g) => g.series)} games)`);
  row('Priority 3 / 2 / 1 / 0', [3, 2, 1, 0].map((p) => n((g) => g.nostalgiaPriority === p)).join(' / '));
  row('Unknown year / developer', `${n((g) => g.year == null)} / ${n((g) => !g.developer)}`);
  row('Empty categories', emptyCats.length);
  row('A-Z', Object.keys(letters).sort().map((l) => `${l}${letters[l]}`).join(' '));
  console.log('');
}
for (const e of errors) console.log('ERROR   ' + e);
for (const w of warnings) console.log('warning ' + w);
console.log(`${errors.length} error${errors.length === 1 ? '' : 's'}, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`);
process.exitCode = errors.length ? 1 : 0;
