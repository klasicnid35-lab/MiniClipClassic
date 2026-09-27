// Historical catalogue audit: checks data/games.json against the sources in
// tools/catalog/sources/, prints a report and writes data/audit-report.json.
// It never changes data/games.json (build-catalog.mjs does that).
//
//   node tools/catalog/audit-games.mjs                          report + data/audit-report.json
//   node tools/catalog/audit-games.mjs --baseline old.json      compare with an older games.json
//   node tools/catalog/audit-games.mjs --baseline-commit e5ef2f1  ... or with the one in a git commit
//   node tools/catalog/audit-games.mjs --no-write               only print
//
// Without a baseline the comparison sections (new titles, aliases created,
// corrections) are taken over from the previous data/audit-report.json.
// Exits with code 1 when it finds duplicates, collisions or broken installs.
import fs from 'fs';
import { execFileSync } from 'child_process';
import {
  GAMES_JSON, AUDIT_JSON, ROOT, readJSON, titleKey, compactKey, isRemote, localPath, loadCategories,
  VERIFICATION, HISTORICAL_TYPES, RELATIONSHIPS, byTitle,
} from './lib.mjs';
import { parseSources, applySources, matchEntry, indexGames } from './sources.mjs';

const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const WRITE = !argv.includes('--no-write');

const games = readJSON(GAMES_JSON, []);
const previous = readJSON(AUDIT_JSON, null);
const sources = parseSources();
const problems = [];

// ---------------------------------------------------------------- baseline
let baseline = null;
let baselineCommit = opt('--baseline-commit') || (previous && previous.baseline && previous.baseline.commit) || null;
if (opt('--baseline')) { baseline = JSON.parse(fs.readFileSync(opt('--baseline'), 'utf8')); baselineCommit = opt('--baseline-commit') || null; }
else if (baselineCommit) {
  try { baseline = JSON.parse(execFileSync('git', ['show', `${baselineCommit}:data/games.json`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 })); }
  catch { baseline = null; }
}

// ---------------------------------------------------------------- integrity
const dup = (list) => { const seen = new Map(), out = []; for (const [k, who] of list) { if (seen.has(k)) out.push(`${k}: ${seen.get(k)} / ${who}`); else seen.set(k, who); } return out; };
const dupIds = dup(games.map((g) => [g.id, g.title]));
const dupSlugs = dup(games.map((g) => [g.slug, g.title]));
const dupTitles = dup(games.map((g) => [titleKey(g.title), g.title]));
const nameOwner = new Map();
for (const g of games) nameOwner.set(titleKey(g.title), g);
const aliasCollisions = [];
for (const g of games) {
  for (const a of g.aliases || []) {
    const o = nameOwner.get(titleKey(a));
    if (o && o !== g) aliasCollisions.push(`"${a}" (alias of ${g.id}) is the title of ${o.id}`);
    else nameOwner.set(titleKey(a), g);
  }
}
// sequels: titles that only differ by a sequel number must stay separate records
const baseOf = (t) => { const k = titleKey(t); const m = k.match(/^(.+) (\d{1,2})$/); return m ? m[1] : k; };
const seqGroups = new Map();
for (const g of games) { const b = baseOf(g.title); if (!seqGroups.has(b)) seqGroups.set(b, []); seqGroups.get(b).push(g); }
const sequelFamilies = [...seqGroups.values()].filter((l) => l.length > 1);
const sequelCollisions = [];
for (const g of games) {
  for (const a of g.aliases || []) {
    const sib = (seqGroups.get(baseOf(a)) || []).find((o) => o !== g && titleKey(o.title) === titleKey(a));
    if (sib) sequelCollisions.push(`alias "${a}" of ${g.id} is the sequel ${sib.id}`);
  }
  // an alias that is a different sequel number than the title
  const own = titleKey(g.title).match(/ (\d{1,2})$/);
  for (const a of g.aliases || []) {
    const m = titleKey(a).match(/ (\d{1,2})$/);
    if (baseOf(a) === baseOf(g.title) && (own ? own[1] : '1') !== (m ? m[1] : '1')) sequelCollisions.push(`alias "${a}" of "${g.title}" has a different sequel number`);
  }
}
const installed = games.filter((g) => g.installed);
const missingFiles = installed.filter((g) => !g.gameFile || (!isRemote(g.gameFile) && !fs.existsSync(localPath(g.gameFile))));
const brokenArt = games.filter((g) => ['thumbnail', 'image'].some((k) => g[k] && !isRemote(g[k]) && !fs.existsSync(localPath(g[k]))));
const noThumb = games.filter((g) => !g.thumbnail);
const unsourced = games.filter((g) => !(g.sources || []).length);
const badEnums = games.filter((g) => !VERIFICATION.includes(g.verificationStatus) || !HISTORICAL_TYPES.includes(g.historicalType) || !RELATIONSHIPS.includes(g.relationship));

// ---------------------------------------------------------------- sources
// Matching is repeated on a copy, so the report shows exactly what each source hit.
const copy = JSON.parse(JSON.stringify(games));
const applied = applySources(copy, sources, { reviewIds: new Set(games.filter((g) => g.verificationStatus === 'needs-review').map((g) => g.id)) });
problems.push(...applied.problems);
const index = indexGames(games);
const baseIds = new Set((baseline || []).map((g) => g.id));
const research = sources.filter((s) => !['rejected', 'uncertain'].includes(s.type) && s.id !== 'maintainer-master-list');
const candidateKeys = new Set();
const alreadyPresent = new Set();
const sourcesChecked = sources.map((s) => {
  const row = { file: s.file, name: s.name, type: s.type, url: s.url || null, about: s.about.trim(), entries: s.entries.length };
  if (['rejected', 'uncertain'].includes(s.type)) return row;
  let matched = 0, fresh = 0, present = 0;
  const unmatched = [];
  for (const e of s.entries) {
    const g = matchEntry(index, e);
    if (!g) { unmatched.push(e.title); continue; }
    matched++;
    if (research.includes(s)) {
      candidateKeys.add(g.id);
      if (baseline && baseIds.has(g.id)) { present++; alreadyPresent.add(g.title); } else if (baseline) fresh++;
    }
  }
  for (const t of unmatched) if (research.includes(s)) candidateKeys.add('?' + titleKey(t));
  return { ...row, matched, ...(baseline && research.includes(s) ? { alreadyInCatalogue: present, addedByAudit: fresh } : {}), unmatched };
});

// ---------------------------------------------------------------- comparison with the baseline
let compare = null;
if (baseline) {
  const byBase = new Map(baseline.map((g) => [g.id, g]));
  const newTitles = games.filter((g) => !byBase.has(g.id)).sort(byTitle).map((g) => ({
    id: g.id, title: g.title, year: g.year, category: g.category, historicalType: g.historicalType,
    verificationStatus: g.verificationStatus, sources: (g.sources || []).map((s) => s.name),
  }));
  const removed = baseline.filter((g) => !games.some((x) => x.id === g.id)).map((g) => ({ id: g.id, title: g.title }));
  const aliasesCreated = [];
  for (const g of games) {
    const old = new Set(((byBase.get(g.id) || {}).aliases || []).map((a) => a.toLowerCase()));
    for (const a of g.aliases || []) if (!old.has(a.toLowerCase())) aliasesCreated.push({ id: g.id, title: g.title, alias: a });
  }
  const FIELDS = ['title', 'category', 'secondaryCategories', 'year', 'developer', 'publisher', 'historicalType', 'description', 'historicalNotes', 'installed', 'gameFile'];
  const corrections = [];
  for (const g of games) {
    const b = byBase.get(g.id);
    if (!b) continue;
    for (const f of FIELDS) {
      const was = b[f] === undefined ? null : b[f];
      const now = g[f] === undefined ? null : g[f];
      if (JSON.stringify(was) !== JSON.stringify(now)) corrections.push({ id: g.id, field: f, before: was, after: now });
    }
  }
  const multiplayerRename = corrections.filter((c) => c.field === 'historicalType' && c.before === 'multiplayer-service' && c.after === 'multiplayer').length;
  compare = {
    baseline: { commit: baselineCommit, records: baseline.length, uniqueTitles: new Set(baseline.map((g) => titleKey(g.title))).size },
    newTitles, removed, aliasesCreated,
    corrections: corrections.filter((c) => !(c.field === 'historicalType' && c.before === 'multiplayer-service' && c.after === 'multiplayer')),
    renamedTypes: multiplayerRename ? [`historicalType "multiplayer-service" is now "multiplayer" (${multiplayerRename} games)`] : [],
  };
} else if (previous && previous.comparison) {
  compare = { ...previous.comparison, note: 'Copied from the previous audit - run with --baseline or --baseline-commit to recompute.' };
}

// ---------------------------------------------------------------- counts
const n = (f) => games.filter(f).length;
const tally = (f) => { const o = {}; for (const g of games) { const k = f(g); o[k] = (o[k] || 0) + 1; } return Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))); };
const eraOf = (y) => (!y ? 'unknown' : y <= 2003 ? '2001-2003' : y <= 2006 ? '2004-2006' : y <= 2009 ? '2007-2009' : y <= 2012 ? '2010-2012' : 'later');
const { byName } = loadCategories();
const streamed = installed.filter((g) => isRemote(g.gameFile));
const summary = {
  totalGames: games.length,
  uniqueNormalizedTitles: new Set(games.map((g) => titleKey(g.title))).size,
  existingBeforeAudit: compare && compare.baseline ? compare.baseline.records : null,
  candidateTitlesDiscovered: candidateKeys.size,
  candidatesAlreadyInCatalogue: baseline ? alreadyPresent.size : (previous && previous.summary ? previous.summary.candidatesAlreadyInCatalogue : null),
  newUniqueGamesAdded: compare ? compare.newTitles.length : null,
  masterListSpellingsMerged: null,
  aliases: games.reduce((s, g) => s + (g.aliases || []).length, 0),
  aliasesCreated: compare ? compare.aliasesCreated.length : null,
  rejectedCandidates: applied.rejected.length,
  uncertainVariants: applied.uncertain.length,
  verification: Object.fromEntries(VERIFICATION.map((v) => [v, n((g) => g.verificationStatus === v)])),
  playable: installed.length,
  playableFlash: n((g) => g.installed && g.type === 'flash'),
  playableHtml5: n((g) => g.installed && (g.type === 'html5' || g.type === 'local-web')),
  playableIframe: n((g) => g.installed && g.type === 'iframe'),
  playableStreamedFromMiniclip: streamed.length,
  playableLocal: installed.length - streamed.length,
  unavailable: n((g) => !g.installed),
  generatedPlaceholders: noThumb.length,
  historicalType: Object.fromEntries(HISTORICAL_TYPES.map((t) => [t, n((g) => g.historicalType === t)])),
  relationship: Object.fromEntries(RELATIONSHIPS.map((t) => [t, n((g) => g.relationship === t)])),
  series: new Set(games.filter((g) => g.series).map((g) => g.series)).size,
  gamesInSeries: n((g) => g.series),
  unknownYear: n((g) => g.year == null),
  unknownDeveloper: n((g) => !g.developer),
};
// "Merged" = duplicate spellings in the master list folded into one record
try {
  const { parseMaster } = await import('./lib.mjs');
  const entries = parseMaster();
  const keys = new Map();
  let merged = 0;
  for (const e of entries.slice().sort((a, b) => (b.cats.length > 0) - (a.cats.length > 0))) {
    const ks = [e.title, ...(e.opts.aka || '').split(';').map((s) => s.trim()).filter(Boolean)].map(titleKey);
    if (ks.some((k) => keys.has(k))) { merged++; continue; }
    ks.forEach((k) => keys.set(k, e));
  }
  summary.masterListSpellingsMerged = merged;
} catch { /* optional */ }

const checks = {
  duplicateIds: dupIds, duplicateSlugs: dupSlugs, duplicateTitles: dupTitles,
  aliasCollisions, sequelCollisions,
  sequelFamiliesKeptApart: sequelFamilies.length,
  installedWithMissingFiles: missingFiles.map((g) => g.id),
  brokenArtwork: brokenArt.map((g) => g.id),
  recordsWithoutSources: unsourced.map((g) => g.id),
  unknownEnumValues: badEnums.map((g) => g.id),
  unmatchedSourceLines: applied.unmatched.map((u) => `${u.source}: ${u.title}`),
  sourceProblems: applied.problems,
  factDisagreements: applied.conflicts,
};
const failed = ['duplicateIds', 'duplicateSlugs', 'duplicateTitles', 'aliasCollisions', 'sequelCollisions', 'installedWithMissingFiles', 'brokenArtwork', 'recordsWithoutSources', 'unknownEnumValues', 'unmatchedSourceLines', 'sourceProblems']
  .filter((k) => checks[k].length);

// ---------------------------------------------------------------- print
const row = (k, v) => console.log('  ' + (k + ':').padEnd(40) + v);
const obj = (o) => Object.entries(o).map(([k, v]) => `${k} ${v}`).join(', ');
console.log('MiniClip Classic - historical catalogue audit\n');
row('Total games', summary.totalGames);
row('Unique normalized titles', summary.uniqueNormalizedTitles);
if (summary.existingBeforeAudit != null) row(`Before the audit (${baselineCommit || 'baseline'})`, summary.existingBeforeAudit);
row('Candidate titles discovered', summary.candidateTitlesDiscovered);
if (summary.candidatesAlreadyInCatalogue != null) row('  already in the catalogue (rejected)', summary.candidatesAlreadyInCatalogue);
if (summary.newUniqueGamesAdded != null) row('  new unique games added', summary.newUniqueGamesAdded);
row('Master-list spellings merged', summary.masterListSpellingsMerged);
row('Aliases (created by the audit)', `${summary.aliases}${summary.aliasesCreated != null ? ` (${summary.aliasesCreated})` : ''}`);
row('Rejected / uncertain candidates', `${summary.rejectedCandidates} / ${summary.uncertainVariants}`);
row('Duplicate IDs / slugs / titles', `${dupIds.length} / ${dupSlugs.length} / ${dupTitles.length}`);
row('Alias collisions / sequel collisions', `${aliasCollisions.length} / ${sequelCollisions.length}`);
row('Sequel families kept apart', sequelFamilies.length);
row('Playable (installed)', `${installed.length} - flash ${summary.playableFlash}, html5 ${summary.playableHtml5}, iframe ${summary.playableIframe}`);
row('  streamed from Miniclip / local', `${streamed.length} / ${summary.playableLocal}`);
row('Installed with missing files', missingFiles.length);
row('Unavailable (catalogue only)', summary.unavailable);
row('Generated placeholder thumbnails', noThumb.length);
row('Broken artwork paths', brokenArt.length);
row('Verification', obj(summary.verification));
row('Historical type', obj(summary.historicalType));
row('Relationship with Miniclip', obj(summary.relationship));
row('Series', `${summary.series} (${summary.gamesInSeries} games)`);
row('Unknown year / developer', `${summary.unknownYear} / ${summary.unknownDeveloper}`);
row('By era', obj(tally((g) => eraOf(g.year))));
row('By year', obj(Object.fromEntries(Object.entries(tally((g) => g.year || 'unknown')).sort((a, b) => String(a[0]).localeCompare(String(b[0]))))));
row('By category', obj(tally((g) => (byName.get(String(g.category).toLowerCase()) || { name: g.category }).name)));
console.log('\n  Sources:');
for (const s of sourcesChecked) console.log(`    ${s.name} [${s.type}] ${s.entries} lines${s.matched != null ? `, ${s.matched} matched` : ''}${s.addedByAudit != null ? `, ${s.alreadyInCatalogue} already in the catalogue, ${s.addedByAudit} added` : ''}${s.unmatched && s.unmatched.length ? `, UNMATCHED: ${s.unmatched.join('; ')}` : ''}`);
if (applied.conflicts.length) console.log('\n  Sources that disagree with the catalogue (catalogue value kept):\n' + applied.conflicts.map((c) => `    ${c.id}: ${c.field} ${c.have} - ${c.source} says ${c.says}`).join('\n'));
console.log('');
for (const k of failed) console.log(`PROBLEM ${k}: ${checks[k].slice(0, 20).join(' | ')}`);
console.log(failed.length ? `${failed.length} problem type${failed.length === 1 ? '' : 's'}` : 'no problems');

// ---------------------------------------------------------------- write
if (WRITE) {
  const report = {
    title: 'MiniClip Classic - historical catalogue audit',
    generated: new Date().toISOString().slice(0, 10),
    summary,
    checks,
    sourcesChecked,
    ...(compare ? { comparison: compare } : {}),
    streams: streamed.map((g) => ({ id: g.id, title: g.title, url: g.gameFile })),
    uncertainVariants: applied.uncertain,
    rejected: applied.rejected,
    eras: tally((g) => eraOf(g.year)),
    categories: tally((g) => g.category),
    ...(compare && compare.baseline ? { baseline: { commit: baselineCommit, ids: (baseline || []).map((g) => g.id) } } : previous && previous.baseline ? { baseline: previous.baseline } : {}),
  };
  if (report.comparison && report.comparison.baseline) report.comparison.alreadyPresent = [...alreadyPresent].sort();
  fs.writeFileSync(AUDIT_JSON, JSON.stringify(report, null, 1) + '\n');
  console.log('wrote data/audit-report.json');
}
process.exitCode = failed.length ? 1 : 0;
