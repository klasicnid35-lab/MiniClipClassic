// Loads data/games.json, data/categories.json and data/site.json once per page
// and offers the queries the pages need (latest, hot, top, categories, related).
//
// games.json records follow the catalogue schema documented in README.md:
//   id, slug, title, aliases, category, secondaryCategories, year, developer,
//   publisher, description, instructions, thumbnail, image, type, gameFile,
//   installed, featured, popular, new, nostalgiaPriority, rating, plays ...
// Older records that use "file" / "tags" / "added" still work.
import { plays, ratings } from './store.js';

const cache = {};
function loadJSON(path) {
  if (!cache[path]) {
    cache[path] = fetch(path, { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error('Could not load ' + path + ' (' + r.status + ')');
      return r.json();
    });
  }
  return cache[path];
}

// ---- natural title order: "Commando", "Commando 2", "Commando 3" ----------
// (keep in step with tools/catalog/lib.mjs)
export const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
export const sortKey = (t) => String(t).normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/&/g, ' and ').replace(/['’!.:,?"]/g, '').replace(/[-/]/g, ' ').replace(/\s+/g, ' ').trim();
export const byTitle = (a, b) => collator.compare(a.sortKey, b.sortKey) || (a.title < b.title ? -1 : 1);

export function letterOf(title) {
  const c = String(title).normalize('NFKD').replace(/[^A-Za-z0-9]/g, '').charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

// small stable hash, used for tie-breaking and per-game "random" picks
export function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const TYPE_ALIASES = { swf: 'flash', ruffle: 'flash', html: 'html5', web: 'html5', external: 'iframe', embed: 'iframe', local: 'local-web', localweb: 'local-web' };
export const TYPES = ['flash', 'html5', 'iframe', 'local-web'];
const str = (v) => (v == null ? '' : String(v).trim());

function normalise(raw, catIndex) {
  const g = Object.assign({}, raw);
  g.id = str(raw.id || raw.slug);
  g.slug = str(raw.slug) || g.id;
  g.title = str(raw.title);
  g.aliases = Array.isArray(raw.aliases) ? raw.aliases.map(str).filter(Boolean) : [];

  // categories may be given by name ("Action") or id ("action")
  const cats = [];
  const add = (v) => {
    const c = catIndex.get(str(v).toLowerCase());
    if (c && !c.virtual && !cats.includes(c.id)) cats.push(c.id);
  };
  add(raw.category);
  (Array.isArray(raw.secondaryCategories) ? raw.secondaryCategories : []).forEach(add);
  (Array.isArray(raw.tags) ? raw.tags : []).forEach(add);
  if (!cats.length) cats.push('other');
  g.category = cats[0];
  g.cats = cats;
  g.categoryName = (catIndex.get(cats[0]) || {}).name || 'Other';

  let type = str(raw.type).toLowerCase() || 'flash';
  type = TYPE_ALIASES[type] || type;
  g.type = TYPES.includes(type) ? type : 'flash';
  g.file = str(raw.gameFile || raw.file);
  // "installed" must be true AND point at a file; old records without the flag are installed when they have a file
  g.installed = (raw.installed === undefined ? true : raw.installed === true) && !!g.file;

  g.thumbnail = str(raw.thumbnail);
  g.image = str(raw.image);
  g.width = +raw.width > 0 ? +raw.width : 640;
  g.height = +raw.height > 0 ? +raw.height : 480;

  const pr = raw.nostalgiaPriority;
  g.priority = Math.max(0, Math.min(3, pr === undefined || pr === null ? (raw.featured ? 3 : raw.popular ? 2 : 1) : (+pr | 0)));
  g.featured = !!raw.featured;
  g.popular = !!raw.popular;
  g.new = !!raw.new;
  g.rating = Math.max(0, Math.min(5, +raw.rating || 0));
  g.plays = Math.max(0, +raw.plays || 0);
  g.year = Number.isInteger(+raw.year) && +raw.year > 1900 ? +raw.year : null;
  g.developer = str(raw.developer);
  g.publisher = str(raw.publisher);
  g.description = str(raw.description);
  g.instructions = str(raw.instructions);
  g.historicalNotes = str(raw.historicalNotes);
  g.historicalType = str(raw.historicalType) || 'standard';
  g.verificationStatus = str(raw.verificationStatus) || 'likely';
  g.challenge = !!raw.challenge;
  g.sortKey = sortKey(g.title);
  g.letter = letterOf(g.title);
  g.jitter = (hash(g.id) % 1000) / 1000;
  return g;
}

let dataPromise;
export function getData() {
  if (!dataPromise) {
    dataPromise = Promise.all([
      loadJSON('data/games.json'),
      loadJSON('data/categories.json'),
      loadJSON('data/site.json'),
    ]).then(([games, cats, site]) => {
      const catIndex = new Map();
      for (const c of cats) { catIndex.set(c.id.toLowerCase(), c); catIndex.set(c.name.toLowerCase(), c); }
      const seen = new Set();
      const list = [];
      for (const raw of Array.isArray(games) ? games : []) {
        if (!raw || !(raw.id || raw.slug) || !raw.title) {
          console.warn('games.json: skipping a record without id/title', raw);
          continue;
        }
        const g = normalise(raw, catIndex);
        if (seen.has(g.id)) { console.warn('games.json: duplicate id', g.id); continue; }
        seen.add(g.id);
        list.push(g);
      }
      list.sort(byTitle);
      return new Library(list, cats, site, catIndex);
    });
  }
  return dataPromise;
}

// words that don't identify a series ("Monster Golf" and "Monster Trucks" are not related)
const SERIES_TAIL = /\s+(\d+|ii|iii|iv|zero|xt|pro|deluxe|nitro|vegas|japan|halloween|hawaii|lost city|moscow|shots|rc)$/;
function seriesKey(title) {
  let k = sortKey(title).toLowerCase().replace(/^the /, '');
  for (let i = 0; i < 3; i++) k = k.replace(SERIES_TAIL, '');
  return k;
}

export class Library {
  constructor(games, cats, site, catIndex) {
    this.games = games;
    this.catIndex = catIndex;
    this.site = site || {};
    this.allCats = cats;
    this.byId = new Map(games.map((g) => [g.id, g]));
    this.catById = new Map(cats.map((c) => [c.id, c]));
    const counts = new Map();
    for (const g of games) for (const c of g.cats) counts.set(c, (counts.get(c) || 0) + 1);
    this.catCounts = counts;
    // categories without games are hidden from the menus
    this.cats = cats.filter((c) => c.virtual || counts.get(c.id));
    const top = Array.isArray(this.site.topGames) ? this.site.topGames : [];
    this.editorial = new Map(top.map((id, i) => [id, top.length - i]));
    for (const g of games) g.series = seriesKey(g.title);
  }

  // turns a raw record that is not in the catalogue (SketchPad, player test games) into a game object
  wrap(raw) {
    const g = normalise(raw, this.catIndex);
    g.series = seriesKey(g.title);
    return g;
  }

  get(id) {
    if (!id) return undefined;
    return this.byId.get(id) || this.games.find((g) => g.slug === id) || this.byId.get(String(id).toLowerCase());
  }
  cat(id) { return this.catById.get(id); }

  // How prominent a game is: nostalgia priority first, then the editorial Top
  // Games order from site.json, then what this player actually plays and rates.
  score(g) {
    const mine = ratings.get(g.id);
    return g.priority * 100
      + (this.editorial.get(g.id) || 0) * 3
      + (g.installed ? 30 : 0)
      + Math.min(60, plays.get(g.id) * 12)
      + (mine ? (mine - 3) * 8 : 0)
      + Math.min(40, Math.log10(1 + g.plays) * 10)
      + (g.rating ? g.rating * 2 : 0)
      + g.jitter * 10;
  }

  rating(g) { return ratings.get(g.id) || g.rating; }

  alpha() { return this.games.slice(); }

  // games from a list of ids (unknown ids are skipped), topped up from "more"
  pick(ids, n = Infinity, more = []) {
    const out = [];
    const seen = new Set();
    for (const g of [...(ids || []).map((id) => this.get(id)), ...more]) {
      if (!g || seen.has(g.id)) continue;
      seen.add(g.id);
      out.push(g);
      if (out.length >= n) break;
    }
    return out;
  }

  // Top Ten Games: the line-up from site.json, then the most popular games
  topTen() { return this.pick(this.site.topTen, 10, this.top()); }
  installed() { return this.games.filter((g) => g.installed); }
  byScore(list) { return list.slice().sort((a, b) => this.score(b) - this.score(a)); }

  // "Latest Games": games flagged new (newest year first), topped up with featured classics
  latest() {
    const byYear = (a, b) => (b.year || 0) - (a.year || 0) || this.score(b) - this.score(a);
    const fresh = this.games.filter((g) => g.new).sort(byYear);
    if (fresh.length >= 12) return fresh;
    const ids = new Set(fresh.map((g) => g.id));
    return fresh.concat(this.featured().filter((g) => !ids.has(g.id)));
  }

  top() { return this.byScore(this.games); }

  hot() {
    const hot = this.byScore(this.games.filter((g) => g.popular));
    return hot.length ? hot : this.top();
  }

  featured() {
    const f = this.byScore(this.games.filter((g) => g.featured));
    return f.length ? f : this.top();
  }

  topRated() {
    return this.games.slice().sort((a, b) => this.rating(b) - this.rating(a) || this.score(b) - this.score(a));
  }

  inCat(id) {
    const c = this.cat(id);
    if (c && c.virtual === 'hot') return this.hot();
    if (c && c.virtual === 'new') { const fresh = this.latest().filter((g) => g.new); return fresh.length ? fresh : this.latest(); }
    if (c && c.virtual === 'top') return this.top().slice(0, 100);
    return this.games.filter((g) => g.cats.includes(id));
  }

  // count shown next to category names
  count(id) {
    const c = this.cat(id);
    return c && c.virtual ? this.inCat(id).length : (this.catCounts.get(id) || 0);
  }

  // Related games: the same series first ("Commando 2" -> "Commando", "Commando 3"),
  // then games sharing categories, preferring the well-known classics.
  related(g, n = 6) {
    const words = g.series.split(' ');
    const scored = [];
    for (const o of this.games) {
      if (o.id === g.id) continue;
      let s = 0;
      if (o.series === g.series) s += 60;
      else {
        const ow = o.series.split(' ');
        if (words.length > 1 && ow.length > 1 && words[0] === ow[0] && words[1] === ow[1]) s += 30;
      }
      if (o.category === g.category) s += 12;
      for (const c of o.cats) if (g.cats.includes(c) && c !== 'other') s += 5;
      if (s < 12 || (g.category === 'other' && s < 30)) continue;
      scored.push({ o, s: s + o.priority * 5 + (o.installed ? 6 : 0) + o.jitter });
    }
    return scored.sort((a, b) => b.s - a.s).slice(0, n).map((x) => x.o);
  }

  // "you might also like": famous classics, a different handful for every game
  recommended(g, n = 6) {
    const skip = new Set(this.related(g, 12).map((x) => x.id));
    skip.add(g.id);
    const pool = this.hot().filter((o) => !skip.has(o.id)).slice(0, 40);
    const seed = hash(g.id);
    return pool.map((o) => ({ o, k: hash(o.id + ':' + seed) })).sort((a, b) => a.k - b.k).slice(0, n).map((x) => x.o);
  }
}
