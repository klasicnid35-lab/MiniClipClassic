// Historical sources (tools/catalog/sources/*.txt) and the fields derived
// from them: sources, verificationStatus, relationship, series/seriesOrder
// and the official streams. Used by build-catalog.mjs and audit-games.mjs.
//
// Source file format - a header, then one title per line:
//
//   # name: Miniclip CD "Ultimate Game Pack" (Christmas 2006)
//   # type: official | screenshot | archive | reference | web | maintainer
//           (or rejected / uncertain: notes for the audit, not evidence)
//   # url:  https://...
//   # about: what the source is and how it was read
//   Title | key=value | key=value | flag
//
//   id=      the catalogue record the line belongs to, when the spelling differs
//   aka=     other names used by this source (;-separated), kept as aliases
//   noalias  do not keep this spelling as an alias
//   year= dev= pub=   facts stated by the source (only fill EMPTY fields)
//   play=    official SWF stream (official sources only), size=WIDTHxHEIGHT
//   ref=     reference sources: where the fact comes from (each ref is one source)
//   note=    remark, reason= (rejected titles)
import fs from 'fs';
import path from 'path';
import {
  SOURCES_DIR, SOURCE_TYPES, DIRECT_EVIDENCE, titleKey, compactKey, isRemote,
} from './lib.mjs';

export function parseSources(dir = SOURCES_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.txt')).sort().map((file) => {
    const src = { id: file.replace(/\.txt$/, ''), file: `tools/catalog/sources/${file}`, name: '', type: '', url: '', about: '', entries: [] };
    let about = false;
    fs.readFileSync(path.join(dir, file), 'utf8').split(/\r?\n/).forEach((raw, i) => {
      const line = raw.trim();
      if (!line) { about = false; return; }
      if (line.startsWith('#')) {
        const m = line.match(/^#\s*(name|type|url|about):\s*(.*)$/);
        if (m) { src[m[1]] = m[2].trim(); about = m[1] === 'about'; }
        else if (about && /^#\s{2,}\S/.test(raw)) src.about += ' ' + line.replace(/^#\s*/, '');
        else about = false;
        return;
      }
      about = false;
      const parts = line.split(' | ').map((s) => s.trim());
      const e = { line: i + 1, title: parts[0], opts: {}, flags: new Set() };
      for (const p of parts.slice(1)) {
        const m = p.match(/^([a-zA-Z]+)=(.*)$/);
        if (m) e.opts[m[1]] = m[2].trim();
        else e.flags.add(p);
      }
      e.aka = (e.opts.aka || '').split(';').map((s) => s.trim()).filter(Boolean);
      src.entries.push(e);
    });
    return src;
  });
}

// Each reference (ref=) counts as its own source; the two maintainer lists
// come from one person, so they count once.
export const sourceName = (src, e) => (src.type === 'reference' && e.opts.ref ? e.opts.ref : src.name);
export const sourceGroup = (src, e) => (src.type === 'maintainer' ? 'maintainer' : src.type === 'reference' ? 'ref:' + (e.opts.ref || src.id) : src.id);

// Title index over titles and aliases (never loose: sequels stay apart).
export function indexGames(games) {
  const byKey = new Map();
  const byId = new Map();
  for (const g of games) {
    byId.set(g.id, g);
    for (const t of [g.title, ...(g.aliases || [])]) if (!byKey.has(titleKey(t))) byKey.set(titleKey(t), g);
  }
  return { byKey, byId };
}

export function matchEntry(index, e) {
  if (e.opts.id) return index.byId.get(e.opts.id) || null;
  for (const t of [e.title, ...e.aka]) {
    const g = index.byKey.get(titleKey(t));
    if (g) return g;
  }
  return null;
}

const addAlias = (g, name, created) => {
  const k = compactKey(name);
  if ([g.title, ...(g.aliases || [])].some((t) => compactKey(t) === k)) return;
  g.aliases = [...(g.aliases || []), name];
  created.push({ id: g.id, alias: name });
};

// Applies every source to the catalogue. Returns what happened, for the
// build summary and the audit report.
export function applySources(games, sources, { reviewIds = new Set() } = {}) {
  const index = indexGames(games);
  const res = { matched: [], unmatched: [], rejected: [], uncertain: [], aliases: [], filled: [], conflicts: [], streams: [], problems: [] };
  const found = new Map(); // id -> [{src, e}]
  for (const src of sources) {
    if (src.type === 'rejected') { for (const e of src.entries) res.rejected.push({ title: e.title, reason: e.opts.reason || '', note: e.opts.note || '' }); continue; }
    if (src.type === 'uncertain') { for (const e of src.entries) res.uncertain.push({ title: e.title, with: e.opts.with || '', decision: e.opts.decision || '', note: e.opts.note || '' }); continue; }
    if (!SOURCE_TYPES.includes(src.type)) { res.problems.push(`${src.file}: unknown source type "${src.type}"`); continue; }
    if (!src.name) res.problems.push(`${src.file}: missing "# name:"`);
    for (const e of src.entries) {
      const g = matchEntry(index, e);
      if (!g) {
        if (e.opts.id) res.problems.push(`${src.file}:${e.line}: id "${e.opts.id}" is not in the catalogue`);
        res.unmatched.push({ source: src.id, title: e.title, line: e.line });
        continue;
      }
      res.matched.push({ source: src.id, title: e.title, id: g.id });
      if (!found.has(g.id)) found.set(g.id, []);
      found.get(g.id).push({ src, e });
    }
  }
  for (const g of games) {
    const hits = found.get(g.id) || [];
    // sources: one {type, name} per source, strongest first
    const seen = new Set();
    const list = [];
    for (const { src, e } of hits) {
      const name = sourceName(src, e);
      if (seen.has(name)) continue;
      seen.add(name);
      list.push({ type: src.type, name });
    }
    const rank = (t) => ['official', 'screenshot', 'archive', 'reference', 'web', 'maintainer'].indexOf(t);
    g.sources = list.sort((a, b) => rank(a.type) - rank(b.type));
    // aliases: other spellings used by the sources
    for (const { src, e } of hits) {
      for (const a of e.aka) addAlias(g, a, res.aliases);
      if (!e.flags.has('noalias') && src.type !== 'maintainer' && titleKey(e.title) !== titleKey(g.title) && (e.opts.id || e.aka.length)) addAlias(g, e.title, res.aliases);
    }
    // facts: fill empty fields, report disagreements
    for (const { src, e } of hits) {
      for (const [opt, field] of [['year', 'year'], ['dev', 'developer'], ['pub', 'publisher']]) {
        if (!e.opts[opt]) continue;
        const v = field === 'year' ? Number(e.opts[opt]) : e.opts[opt];
        if (g[field] === null || g[field] === undefined || g[field] === '') { g[field] = v; res.filled.push({ id: g.id, field, value: v, source: sourceName(src, e) }); }
        else if (g[field] !== v) res.conflicts.push({ id: g.id, field, have: g[field], source: sourceName(src, e), says: v });
      }
    }
    // official streams: only while no local copy is installed
    const play = hits.find(({ src, e }) => src.type === 'official' && e.opts.play);
    if (play) {
      const { e } = play;
      if (!/^https:\/\//.test(e.opts.play)) res.problems.push(`${play.src.file}:${e.line}: play= must be an https:// address`);
      else if (!g.installed || isRemote(g.gameFile)) {
        const [w, h] = (e.opts.size || '').split('x').map(Number);
        g.type = 'flash';
        g.gameFile = e.opts.play;
        g.installed = true;
        if (w && h) { g.width = w; g.height = h; }
        res.streams.push({ id: g.id, url: e.opts.play });
      }
    }
    // verification
    const groups = new Set(hits.map(({ src, e }) => sourceGroup(src, e)));
    const direct = hits.some(({ src }) => DIRECT_EVIDENCE.includes(src.type));
    g.verificationStatus = direct ? 'verified'
      : reviewIds.has(g.id) ? 'needs-review'
        : groups.size >= 2 ? 'cross-verified'
          : 'single-source';
    if (!hits.length) res.problems.push(`"${g.title}" (${g.id}) is not backed by any source in tools/catalog/sources/`);
  }
  return res;
}

// relationship with Miniclip - only claimed when the record is verified or
// cross-verified; otherwise "unknown".
export function relationshipOf(g, override) {
  if (override) return override;
  const sure = g.verificationStatus === 'verified' || g.verificationStatus === 'cross-verified';
  if (!sure) return 'unknown';
  if (g.historicalType === 'external-service') return 'external-service';
  if (g.historicalType === 'licensed') return 'licensed';
  if (g.historicalType === 'sponsored') return 'sponsored';
  if (g.developer === 'Miniclip') return 'developed';
  if (g.publisher === 'Miniclip') return 'published';
  if ((g.sources || []).some((s) => DIRECT_EVIDENCE.includes(s.type))) return 'hosted';
  return 'unknown';
}

// Series: "Commando", "Commando 2", "Commando 3" -> series "Commando", order 1-3.
// Automatic for titles that differ only by a sequel number when the catalogue
// has at least two of them; master-list series= / order= add or override.
export function deriveSeries(games, manual = new Map()) {
  const groups = new Map();
  const numOf = new Map();
  for (const g of games) {
    const k = titleKey(g.title);
    const m = k.match(/^(.+) (\d{1,2})$/);
    const base = m && Number(m[2]) <= 20 ? m[1] : k;
    numOf.set(g, m && Number(m[2]) <= 20 ? Number(m[2]) : 1);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(g);
  }
  for (const g of games) { g.series = null; g.seriesOrder = null; }
  for (const [, list] of groups) {
    if (list.length < 2) continue;
    const first = list.slice().sort((a, b) => numOf.get(a) - numOf.get(b))[0];
    const name = numOf.get(first) === 1 ? first.title : first.title.replace(/[\s:-]+(\d{1,2}|I{1,3}|IV|VI?)$/i, '');
    for (const g of list) { g.series = name; g.seriesOrder = numOf.get(g); }
  }
  for (const g of games) {
    const m = manual.get(g.id);
    if (!m) continue;
    if (m.series) g.series = m.series;
    if (m.order !== undefined) g.seriesOrder = m.order;
  }
}
