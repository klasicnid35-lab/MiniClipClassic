// Client-side search over the whole catalogue: titles, aliases, categories
// (main and secondary), developer, publisher, year, kind of game (seasonal,
// multiplayer, political parody...), series and description. Tolerates
// capitals, apostrophes, hyphens, punctuation, "&"/"and", "II"/"2" and a few
// alternate spellings.

const ROMAN = { ii: '2', iii: '3', iv: '4' };
const SPELLING = { defence: 'defense', mahjongg: 'mahjong', minute: 'min', minutes: 'min', colour: 'color', favourite: 'favorite', grey: 'gray' };
// words people add to a search that don't narrow it down
const NOISE = new Set(['game', 'games', 'play', 'online', 'free', 'flash', 'the', 'a', 'an', 'of']);
// extra words that find a kind of game ("holiday" finds the seasonal games)
const KIND_WORDS = { seasonal: 'holiday', 'political-parody': 'politics satire', multiplayer: 'mmo', licensed: 'tie in', sponsored: 'sponsor' };

export function norm(s) {
  return String(s || '').toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => ROMAN[w] || SPELLING[w] || w)
    .join(' ');
}
const compact = (s) => s.replace(/ /g, '');

// per-game search fields, built once
const index = new WeakMap();
function fields(lib, g) {
  let f = index.get(g);
  if (!f) {
    const title = norm(g.title);
    const aliases = g.aliases.map(norm);
    const catText = g.cats.map((id) => { const c = lib.cat(id); return c ? c.name + ' ' + c.title : id; }).join(' ');
    f = {
      title,
      titleWords: title.split(' '),
      titleCompact: compact(title),
      aliases,
      aliasWords: aliases.join(' ').split(' ').filter(Boolean),
      aliasCompact: aliases.map(compact),
      cat: norm(catText + ' ' + g.historicalType.replace(/-/g, ' ') + ' ' + (KIND_WORDS[g.historicalType] || '') + ' ' + g.type).split(' '),
      series: norm(g.seriesName || ''),
      year: g.year ? String(g.year) : '',
      people: norm(g.developer + ' ' + g.publisher),
      text: ' ' + norm(g.description + ' ' + g.instructions + ' ' + g.historicalNotes + ' ' + (g.year || '')) + ' ',
    };
    index.set(g, f);
  }
  return f;
}

// best score for one query word against one game (0 = no match)
function wordScore(f, w) {
  if (f.titleWords.includes(w)) return 40;
  if (f.titleWords.some((t) => t.startsWith(w))) return 28;
  if (f.aliasWords.includes(w)) return 34;
  if (f.aliasWords.some((t) => t.startsWith(w))) return 22;
  if (w.length >= 3 && f.titleCompact.includes(w)) return 16;
  if (w.length >= 3 && f.aliasCompact.some((a) => a.includes(w))) return 12;
  if (f.year && w === f.year) return 18;
  if (f.cat.includes(w) || (w.length >= 4 && f.cat.some((t) => t.startsWith(w)))) return 14;
  if (w.length >= 3 && f.series && (' ' + f.series).includes(' ' + w)) return 12;
  if (w.length >= 3 && f.people.includes(w)) return 10;
  if (w.length >= 3 && f.text.includes(' ' + w)) return 6;
  return 0;
}

export function searchGames(lib, query) {
  const q = norm(query);
  if (!q) return [];
  let words = q.split(' ');
  const meaningful = words.filter((w) => !NOISE.has(w));
  if (meaningful.length) words = meaningful;
  const qc = compact(q);

  const results = [];
  for (const g of lib.games) {
    const f = fields(lib, g);
    let score = 0;
    let all = true;
    for (const w of words) {
      const s = wordScore(f, w);
      if (!s) { all = false; break; }
      score += s;
    }
    // whole-phrase matches, also when spaces differ ("mother load", "goalkeeper")
    const phrase = f.titleCompact === qc || f.aliasCompact.includes(qc);
    if (!all && !(phrase || (qc.length >= 4 && (f.titleCompact.includes(qc) || f.aliasCompact.some((a) => a.includes(qc)))))) continue;
    if (!all) score = 20;
    if (phrase) score += 200;
    else if ((f.title + ' ').startsWith(q + ' ')) score += 15;
    results.push({ g, score: score + g.priority * 8 + (g.installed ? 5 : 0) });
  }
  return results
    .sort((a, b) => b.score - a.score || b.g.priority - a.g.priority || a.g.sortKey.localeCompare(b.g.sortKey, 'en', { numeric: true }))
    .map((r) => r.g);
}
