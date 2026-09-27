// Loads data/games.json, data/categories.json and data/site.json and offers
// the queries the pages need (latest, hot, top, category listings, related).
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

const DEFAULTS = {
  description: '',
  instructions: '',
  category: 'arcade',
  tags: [],
  year: '',
  developer: 'Unknown',
  type: 'html5',
  width: 640,
  height: 480,
  featured: false,
  new: false,
  popular: false,
  challenge: false,
  rating: 3,
  popularity: 50,
  added: '2000-01-01',
};

function normalise(raw) {
  const g = Object.assign({}, DEFAULTS, raw);
  g.tags = Array.isArray(g.tags) ? g.tags : [];
  g.type = String(g.type || 'html5').toLowerCase();
  if (g.type === 'swf' || g.type === 'ruffle') g.type = 'flash';
  if (!g.thumbnail) g.thumbnail = 'assets/games/_placeholder.png';
  if (!g.image) g.image = g.thumbnail;
  const cats = [g.category, ...g.tags];
  if (g.type === 'flash') cats.push('flash');
  g.cats = Array.from(new Set(cats));
  g.sortTitle = g.title.toLowerCase().replace(/^(the|a) /, '');
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
      const seen = new Set();
      const list = [];
      for (const raw of games) {
        if (!raw || !raw.id || !raw.title || !raw.file) {
          console.warn('games.json: skipping entry without id/title/file', raw);
          continue;
        }
        if (seen.has(raw.id)) { console.warn('games.json: duplicate id', raw.id); continue; }
        seen.add(raw.id);
        list.push(normalise(raw));
      }
      list.sort((a, b) => a.sortTitle.localeCompare(b.sortTitle));
      return new Library(list, cats, site);
    });
  }
  return dataPromise;
}

export class Library {
  constructor(games, cats, site) {
    this.games = games;
    this.cats = cats;
    this.site = site;
    this.byId = new Map(games.map((g) => [g.id, g]));
    this.catById = new Map(cats.map((c) => [c.id, c]));
  }

  get(id) { return this.byId.get(id); }
  cat(id) { return this.catById.get(id); }

  // popularity score: editorial popularity + what this player actually plays
  score(g) {
    const mine = ratings.get(g.id);
    return g.popularity + plays.get(g.id) * 3 + (mine ? (mine - 3) * 5 : 0);
  }

  rating(g) {
    return ratings.get(g.id) || g.rating;
  }

  alpha() { return this.games.slice(); }

  latest() {
    return this.games.slice().sort((a, b) => (b.added > a.added ? 1 : b.added < a.added ? -1 : a.sortTitle.localeCompare(b.sortTitle)));
  }

  top() {
    return this.games.slice().sort((a, b) => this.score(b) - this.score(a) || a.sortTitle.localeCompare(b.sortTitle));
  }

  hot() {
    const hot = this.top().filter((g) => g.popular);
    return hot.length ? hot : this.top();
  }

  featured() {
    const f = this.latest().filter((g) => g.featured);
    return f.length ? f : this.latest();
  }

  topRated() {
    return this.games.slice().sort((a, b) => this.rating(b) - this.rating(a) || this.score(b) - this.score(a));
  }

  inCat(id) {
    const c = this.cat(id);
    if (c && c.virtual === 'hot') return this.hot();
    if (c && c.virtual === 'new') return this.latest();
    if (c && c.virtual === 'top') return this.top().slice(0, 100);
    return this.games.filter((g) => g.cats.includes(id));
  }

  // count shown next to category names
  count(id) { return this.inCat(id).length; }

  related(g, n = 6) {
    const others = this.games.filter((o) => o.id !== g.id);
    const scored = others.map((o) => {
      let s = 0;
      if (o.category === g.category) s += 5;
      for (const c of o.cats) if (g.cats.includes(c)) s += 2;
      return { o, s: s * 100 + this.score(o) };
    });
    return scored.filter((x) => x.s >= 200).sort((a, b) => b.s - a.s).slice(0, n).map((x) => x.o);
  }

  // "you might also like": popular games from other categories
  recommended(g, n = 6) {
    const rel = new Set(this.related(g, 12).map((x) => x.id));
    return this.top().filter((o) => o.id !== g.id && !rel.has(o.id)).slice(0, n);
  }
}
