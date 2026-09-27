// Shared helpers for the catalogue tools (build-catalog, sync-files,
// validate, install-game). Plain Node, no dependencies.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const GAMES_JSON = path.join(ROOT, 'data/games.json');
export const CATS_JSON = path.join(ROOT, 'data/categories.json');
export const MASTER = path.join(ROOT, 'tools/catalog/master-list.txt');

export const SOURCES_DIR = path.join(ROOT, 'tools/catalog/sources');
export const AUDIT_JSON = path.join(ROOT, 'data/audit-report.json');

export const TYPES = ['flash', 'html5', 'iframe', 'local-web'];
export const HISTORICAL_TYPES = ['standard', 'multiplayer', 'promotional', 'licensed', 'sponsored', 'seasonal', 'political-parody', 'external-service'];
// verified        direct evidence: Miniclip's own archive / CD / downloads or the 2008-2009 screenshots
// cross-verified  two or more independent sources
// single-source   one source only
// needs-review    doubtful (possibly shortened, duplicated or not a normal game)
export const VERIFICATION = ['verified', 'cross-verified', 'single-source', 'needs-review'];
export const RELATIONSHIPS = ['developed', 'published', 'hosted', 'licensed', 'sponsored', 'external-service', 'unknown'];
// Source types (tools/catalog/sources/*.txt). "official" and "screenshot" are direct evidence.
export const SOURCE_TYPES = ['official', 'screenshot', 'archive', 'reference', 'web', 'maintainer'];
export const DIRECT_EVIDENCE = ['official', 'screenshot'];
export const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

// Field order used when writing data/games.json
export const FIELD_ORDER = [
  'id', 'slug', 'title', 'aliases', 'series', 'seriesOrder', 'category', 'secondaryCategories', 'era', 'year',
  'developer', 'publisher', 'hostedByMiniclip', 'relationship', 'historicalType', 'verificationStatus', 'sources',
  'historicalNotes', 'description', 'instructions', 'thumbnail', 'image', 'type', 'gameFile',
  'installed', 'width', 'height', 'featured', 'popular', 'new', 'challenge', 'nostalgiaPriority', 'rating', 'plays',
];

// Fields that describe an installed copy of a game. The catalogue tools never
// overwrite these once they have a value (an official stream only fills them
// while no local copy is installed).
export const INSTALL_FIELDS = ['installed', 'gameFile', 'type', 'width', 'height', 'thumbnail', 'image'];

// ---------------------------------------------------------------- strings

// URL-safe slug: "Bang! Howdy" -> "bang-howdy", "Bears & Bees" -> "bears-and-bees"
export function slugify(title) {
  return String(title)
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’.!]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const ROMAN = { ii: '2', iii: '3', iv: '4', v: '5', vi: '6' };
// Key used to spot the same game written in different ways:
// case, punctuation, "&"/"and", "II"/"2" and a leading "The".
export function titleKey(title) {
  return String(title)
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => ROMAN[w] || w)
    .join(' ')
    .replace(/^the /, '');
}
export const compactKey = (title) => titleKey(title).replace(/ /g, '');

// Natural, case-insensitive title order: "Commando", "Commando 2", "Commando 3",
// punctuation ignored but spaces kept ("A Day of Slacking" before "Aaron Stone").
// Keep in step with sortKey() in assets/js/core/data.js.
export const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
export const sortKey = (t) => String(t).normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/&/g, ' and ').replace(/['’!.:,?"]/g, '').replace(/[-/]/g, ' ').replace(/\s+/g, ' ').trim();
export const byTitle = (a, b) => collator.compare(sortKey(a.title), sortKey(b.title)) || a.title.localeCompare(b.title);

export function letterOf(title) {
  const c = String(title).normalize('NFKD').replace(/[^A-Za-z0-9]/g, '').charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

// ---------------------------------------------------------------- files

export function readJSON(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function orderFields(rec) {
  const out = {};
  for (const k of FIELD_ORDER) if (k in rec) out[k] = rec[k];
  for (const k of Object.keys(rec)) if (!(k in out)) out[k] = rec[k];
  return out;
}

// One record per block, short arrays kept on one line - easy to edit by hand.
export function formatGames(games) {
  const body = games.map((g) => {
    const rec = orderFields(g);
    const lines = Object.entries(rec).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
    return '  {\n' + lines.join(',\n') + '\n  }';
  }).join(',\n');
  return '[\n' + body + '\n]\n';
}

export function writeGames(games) {
  fs.writeFileSync(GAMES_JSON, formatGames(games.slice().sort(byTitle)));
}

export function loadCategories() {
  const cats = readJSON(CATS_JSON, []);
  const real = cats.filter((c) => !c.virtual);
  const byName = new Map();
  for (const c of real) { byName.set(c.id.toLowerCase(), c); byName.set(c.name.toLowerCase(), c); }
  return { cats, real, byName };
}

export const isRemote = (p) => /^[a-z][a-z0-9+.-]*:\/\//i.test(p || '');
export const localPath = (p) => path.join(ROOT, decodeURIComponent(String(p).split(/[?#]/)[0]));

// ---------------------------------------------------------------- master list

// Parses tools/catalog/master-list.txt into plain entries.
export function parseMaster(text = fs.readFileSync(MASTER, 'utf8')) {
  const entries = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const parts = line.split(' | ').map((s) => s.trim());
    const e = { line: i + 1, title: parts[0], cats: [], priority: 1, opts: {}, flags: new Set() };
    if (parts[1]) e.cats = parts[1].split(/\s+/).filter(Boolean);
    if (parts[2] !== undefined && parts[2] !== '') e.priority = Number(parts[2]);
    for (const p of parts.slice(3)) {
      const m = p.match(/^([a-zA-Z]+)=(.*)$/);
      if (m) e.opts[m[1]] = m[2].trim();
      else e.flags.add(p);
    }
    entries.push(e);
  });
  return entries;
}

// ---------------------------------------------------------------- file sync

function findImage(dir, id) {
  for (const ext of IMAGE_EXT) {
    const rel = `${dir}/${id}${ext}`;
    if (fs.existsSync(path.join(ROOT, rel))) return rel;
  }
  return null;
}

// Looks for game files and artwork that have been dropped into the standard
// folders and switches the matching records on. Only ever ADDS information:
//   games/<id>/<id>.swf, games/<id>/*.swf  -> type flash
//   games/<id>/index.html                  -> type html5 (or local-web)
// A local copy always wins over an official remote stream.
//   assets/games/<id>.png|jpg|gif|webp     -> thumbnail
//   assets/games/large/<id>.png|jpg|...    -> image
export function syncFiles(games, { log = () => {} } = {}) {
  let changed = 0;
  for (const g of games) {
    const dir = path.join(ROOT, 'games', g.id);
    const streamed = g.installed && isRemote(g.gameFile);
    if ((!g.installed || streamed) && fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      const files = fs.readdirSync(dir);
      const swfs = files.filter((f) => f.toLowerCase().endsWith('.swf'));
      const swf = swfs.find((f) => f.toLowerCase() === g.id + '.swf') || (swfs.length === 1 ? swfs[0] : null);
      const html = files.includes('index.html') ? 'index.html' : null;
      const wantHtml = g.type === 'html5' || g.type === 'local-web';
      let file = null, type = g.type;
      if (html && (wantHtml || !swf)) { file = html; type = g.type === 'local-web' ? 'local-web' : 'html5'; }
      else if (swf) { file = swf; type = 'flash'; }
      if (file) {
        g.gameFile = `games/${g.id}/${file}`;
        g.type = type;
        g.installed = true;
        changed++;
        log(`installed  ${g.id}  ->  ${g.gameFile} (${type})${streamed ? ' - replaces the remote stream' : ''}`);
      } else if (swfs.length > 1) {
        log(`skipped    ${g.id}: several .swf files in games/${g.id}/ - name the main one ${g.id}.swf`);
      }
    }
    if (!g.thumbnail) {
      const t = findImage('assets/games', g.id);
      if (t) { g.thumbnail = t; changed++; log(`thumbnail  ${g.id}  ->  ${t}`); }
    }
    if (!g.image) {
      const t = findImage('assets/games/large', g.id);
      if (t) { g.image = t; changed++; log(`image      ${g.id}  ->  ${t}`); }
    }
  }
  return changed;
}
