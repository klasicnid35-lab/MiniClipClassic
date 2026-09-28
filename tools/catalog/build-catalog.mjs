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
// Finally the historical sources in tools/catalog/sources/ are applied (see
// sources.mjs): they set each game's sources list and verificationStatus,
// add the spellings they use as aliases, fill EMPTY year/developer/publisher
// fields, switch on official streams, and the relationship and series fields
// are worked out.
import {
  parseMaster, titleKey, compactKey, slugify, readJSON, writeGames, loadCategories, syncFiles,
  GAMES_JSON, INSTALL_FIELDS, HISTORICAL_TYPES, TYPES, RELATIONSHIPS, VERIFICATION, byTitle,
} from './lib.mjs';
import { parseSources, applySources, relationshipOf, deriveSeries } from './sources.mjs';

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
    if (e.cats.length && titleKey(e.title) === titleKey(hit.title)) problems.push(`line ${e.line}: "${e.title}" is listed twice (also line ${hit.line})`);
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
  if (o.rel && !RELATIONSHIPS.includes(o.rel)) problems.push(`line ${e.line}: unknown relationship ${o.rel}`);
  if (o.site && !/^https:\/\/[^\s]+$/.test(o.site)) problems.push(`line ${e.line}: site= must be an https:// address`);
  if (e.flags.has('v')) problems.push(`line ${e.line}: the "v" flag is gone - verification now comes from tools/catalog/sources/`);
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
    verificationStatus: e.flags.has('r') ? 'needs-review' : 'single-source',
    historicalNotes: o.note || '',
    description: o.desc || '',
    instructions: o.how || '',
    officialSite: o.site || null,
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
  'historicalType', 'verificationStatus', 'historicalNotes', 'description', 'instructions', 'officialSite', 'featured', 'popular',
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
const fromList = new Map(); // record -> master-list entry
for (const e of canon) {
  const rec = fromMaster(e);
  const keys = [e.title, ...e.aliases, ...e.mergedFrom].map(titleKey);
  const cur = keys.map((k) => byKey.get(k)).find(Boolean);
  if (!cur) {
    let id = slugify(e.title), n = 2;
    while (usedIds.has(id)) id = slugify(e.title) + '-' + n++;
    usedIds.add(id);
    const g = { id, slug: id, ...rec };
    out.push(g);
    fromList.set(g, e);
    added++;
    continue;
  }
  fromList.set(cur, e);
  let touched = false;
  // renamed in the master list (the old title is one of its aka= names): the
  // record keeps its id, so links keep working, and the old title stays as an alias
  if (titleKey(cur.title) !== titleKey(e.title) && e.aliases.some((a) => titleKey(a) === titleKey(cur.title))) {
    cur.aliases = [cur.title, ...(cur.aliases || [])].filter((a, i, all) => titleKey(a) !== titleKey(e.title) && all.findIndex((b) => titleKey(b) === titleKey(a)) === i);
    cur.title = e.title;
    touched = true;
  }
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

// ---------------------------------------------------------------- file sync + sources + write
const syncLog = [];
syncFiles(out, { log: (s) => syncLog.push(s) });

// needs-review: "r" in the master list (or set by hand on a record that is not in the list)
const reviewIds = new Set(out.filter((g) => (fromList.has(g) ? fromList.get(g).flags.has('r') : g.verificationStatus === 'needs-review')).map((g) => g.id));
const src = applySources(out, parseSources(), { reviewIds });
problems.push(...src.problems);
for (const u of src.unmatched) problems.push(`${u.source}.txt:${u.line}: "${u.title}" is not in the catalogue - add it to master-list.txt (or give it id=)`);
const manualSeries = new Map();
for (const [g, e] of fromList) {
  if (e.opts.series || e.opts.order) manualSeries.set(g.id, { series: e.opts.series, order: e.opts.order ? Number(e.opts.order) : undefined });
}
deriveSeries(out, manualSeries);
for (const g of out) {
  g.relationship = relationshipOf(g, fromList.has(g) ? fromList.get(g).opts.rel : undefined);
  if (!VERIFICATION.includes(g.verificationStatus)) problems.push(`${g.id}: unknown verificationStatus ${g.verificationStatus}`);
}
out.sort(byTitle);
writeGames(out);

const count = (f) => out.filter(f).length;
const aliasCount = out.reduce((n, g) => n + (g.aliases || []).length, 0);
console.log(`master list: ${entries.length} lines -> ${canon.length} unique games (${merged} duplicate spelling${merged === 1 ? '' : 's'} merged)`);
for (const c of canon.filter((x) => x.mergedFrom.length)) console.log(`  merged: ${c.mergedFrom.map((t) => `"${t}"`).join(', ')} -> "${c.title}"`);
console.log(`data/games.json: ${out.length} records (${added} added, ${updated} updated, ${out.length - canon.length} not in the master list)`);
console.log(`aliases: ${aliasCount}`);
console.log(`sources: ${src.matched.length} source lines matched, ${src.aliases.length} alias${src.aliases.length === 1 ? '' : 'es'} added, ${src.filled.length} empty field${src.filled.length === 1 ? '' : 's'} filled, ${src.conflicts.length} disagreement${src.conflicts.length === 1 ? '' : 's'} (kept the catalogue value), ${src.streams.length} official stream${src.streams.length === 1 ? '' : 's'}`);
for (const c of src.conflicts) console.log(`  disagreement: ${c.id} ${c.field} is ${c.have}, ${c.source} says ${c.says}`);
console.log(VERIFICATION.map((v) => `${v} ${count((g) => g.verificationStatus === v)}`).join(', '));
console.log(`installed ${count((g) => g.installed)} (${count((g) => g.installed && /^https?:/.test(g.gameFile))} streamed), unavailable ${count((g) => !g.installed)}`);
console.log(`series: ${new Set(out.filter((g) => g.series).map((g) => g.series)).size} (${count((g) => g.series)} games)`);
if (syncLog.length) console.log('file sync:\n  ' + syncLog.join('\n  '));
if (problems.length) { console.log('\nproblems:\n  ' + problems.join('\n  ')); process.exitCode = 1; }
