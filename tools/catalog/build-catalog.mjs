// Builds data/games.json from tools/catalog/master-list.txt.
//
//   node tools/catalog/build-catalog.mjs            merge the master list into data/games.json
//   node tools/catalog/build-catalog.mjs --refresh  also re-apply editorial fields from the list
//   node tools/catalog/build-catalog.mjs --fresh    ignore the current data/games.json (start over)
//
// Merge rules (default):
//   * a game that is already in data/games.json keeps its id/slug and all of its
//     values - only empty fields are filled in from the master list;
//   * installation fields (installed, gameFile, type, width, height, thumbnail,
//     image) are NEVER overwritten, not even with --refresh;
//   * games that are only in data/games.json (added by hand) are kept;
//   * duplicate spellings in the master list are merged into one record and the
//     other spelling is kept as an alias.
// Afterwards the file sync runs (see sync-files.mjs), so game files and artwork
// dropped into games/<id>/ and assets/games/ are picked up automatically.
import {
  parseMaster, titleKey, compactKey, slugify, readJSON, writeGames, loadCategories, syncFiles,
  GAMES_JSON, INSTALL_FIELDS, HISTORICAL_TYPES, TYPES, byTitle,
} from './lib.mjs';

const args = new Set(process.argv.slice(2));
const FRESH = args.has('--fresh');
const REFRESH = args.has('--refresh') || FRESH;

const { byName } = loadCategories();
const catName = (id) => {
  const c = byName.get(String(id).toLowerCase());
  if (!c) throw new Error(`unknown category "${id}"`);
  return c.name;
};

// ---------------------------------------------------------------- read master list
const entries = parseMaster();
const problems = [];
const canon = [];            // unique games from the master list
const keyIndex = new Map();  // titleKey -> canonical entry
let merged = 0;

// canonical entries first (lines with categories), then bare duplicate spellings
for (const e of entries.slice().sort((a, b) => (b.cats.length > 0) - (a.cats.length > 0))) {
  const aliases = (e.opts.aka || '').split(';').map((s) => s.trim()).filter(Boolean);
  const keys = [e.title, ...aliases].map(titleKey);
  const hit = keys.map((k) => keyIndex.get(k)).find(Boolean);
  if (hit) {
    // same game under another name: keep the spelling as an alias
    if (e.title !== hit.title && !hit.aliases.includes(e.title)) hit.aliases.push(e.title);
    hit.mergedFrom.push(e.title);
    merged++;
    continue;
  }
  if (!e.cats.length) problems.push(`line ${e.line}: "${e.title}" has no categories and matches no other game`);
  const c = { ...e, aliases, mergedFrom: [] };
  canon.push(c);
  for (const k of keys) keyIndex.set(k, c);
}

// near-duplicates that only differ by spacing ("Water Slide" / "Waterslide")
const compact = new Map();
for (const c of canon) {
  const k = compactKey(c.title);
  if (compact.has(k)) problems.push(`possible duplicate: "${compact.get(k).title}" / "${c.title}"`);
  compact.set(k, c);
}

// ---------------------------------------------------------------- build records
function fromMaster(e) {
  const o = e.opts;
  for (const c of e.cats) catName(c);
  if (o.ht && !HISTORICAL_TYPES.includes(o.ht)) problems.push(`line ${e.line}: unknown historical type ${o.ht}`);
  if (o.type && !TYPES.includes(o.type)) problems.push(`line ${e.line}: unknown type ${o.type}`);
  const p = Math.max(0, Math.min(3, e.priority | 0));
  return {
    title: e.title,
    aliases: e.aliases.slice(),
    category: catName(e.cats[0]),
    secondaryCategories: e.cats.slice(1).map(catName),
    era: 'classic',
    year: o.year ? Number(o.year) : null,
    developer: o.dev || null,
    publisher: o.pub || null,
    hostedByMiniclip: true,
    historicalType: o.ht || 'standard',
    verificationStatus: e.flags.has('v') ? 'verified' : e.flags.has('r') ? 'needs-review' : 'likely',
    historicalNotes: o.note || '',
    description: o.desc || '',
    instructions: o.how || '',
    thumbnail: '',
    image: '',
    type: o.type || 'flash',
    gameFile: '',
    installed: false,
    featured: p === 3,
    popular: p >= 2,
    new: e.flags.has('new'),
    challenge: e.flags.has('hs'),
    nostalgiaPriority: p,
    rating: 0,
    plays: 0,
  };
}

const EDITORIAL = ['category', 'secondaryCategories', 'era', 'year', 'developer', 'publisher', 'hostedByMiniclip',
  'historicalType', 'verificationStatus', 'historicalNotes', 'description', 'instructions', 'featured', 'popular',
  'new', 'challenge', 'nostalgiaPriority'];
const isEmpty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

const existing = FRESH ? [] : readJSON(GAMES_JSON, []);
const byKey = new Map();
const usedIds = new Set();
for (const g of existing) {
  usedIds.add(g.id);
  for (const t of [g.title, ...(g.aliases || [])]) byKey.set(titleKey(t), g);
}

let added = 0, updated = 0;
const out = existing.slice();
for (const e of canon) {
  const rec = fromMaster(e);
  const keys = [e.title, ...e.aliases, ...e.mergedFrom].map(titleKey);
  const cur = keys.map((k) => byKey.get(k)).find(Boolean);
  if (!cur) {
    let id = slugify(e.title), n = 2;
    while (usedIds.has(id)) id = slugify(e.title) + '-' + n++;
    usedIds.add(id);
    out.push({ id, slug: id, ...rec });
    added++;
    continue;
  }
  let touched = false;
  for (const [k, v] of Object.entries(rec)) {
    if (k === 'title') continue;
    if (INSTALL_FIELDS.includes(k)) { if (!(k in cur)) { cur[k] = v; touched = true; } continue; }
    if (k === 'aliases') {
      const have = new Set((cur.aliases || []).map(titleKey));
      const extra = v.filter((a) => !have.has(titleKey(a)) && titleKey(a) !== titleKey(cur.title));
      if (extra.length || !cur.aliases) { cur.aliases = [...(cur.aliases || []), ...extra]; touched = true; }
      continue;
    }
    if (isEmpty(cur[k]) || (REFRESH && EDITORIAL.includes(k) && JSON.stringify(cur[k]) !== JSON.stringify(v))) {
      if (JSON.stringify(cur[k]) !== JSON.stringify(v)) { cur[k] = v; touched = true; }
    }
  }
  if (!cur.slug) { cur.slug = cur.id; touched = true; }
  if (touched) updated++;
}

// ---------------------------------------------------------------- file sync + write
const syncLog = [];
syncFiles(out, { log: (s) => syncLog.push(s) });
out.sort(byTitle);
writeGames(out);

const count = (f) => out.filter(f).length;
const aliasCount = out.reduce((n, g) => n + (g.aliases || []).length, 0);
console.log(`master list: ${entries.length} lines -> ${canon.length} unique games (${merged} duplicate spelling${merged === 1 ? '' : 's'} merged)`);
for (const c of canon.filter((x) => x.mergedFrom.length)) console.log(`  merged: ${c.mergedFrom.map((t) => `"${t}"`).join(', ')} -> "${c.title}"`);
console.log(`data/games.json: ${out.length} records (${added} added, ${updated} updated, ${out.length - canon.length} not in the master list)`);
console.log(`aliases: ${aliasCount}`);
console.log(`verified ${count((g) => g.verificationStatus === 'verified')}, likely ${count((g) => g.verificationStatus === 'likely')}, needs-review ${count((g) => g.verificationStatus === 'needs-review')}`);
console.log(`installed ${count((g) => g.installed)}, unavailable ${count((g) => !g.installed)}`);
if (syncLog.length) console.log('file sync:\n  ' + syncLog.join('\n  '));
if (problems.length) { console.log('\nproblems:\n  ' + problems.join('\n  ')); process.exitCode = 1; }
