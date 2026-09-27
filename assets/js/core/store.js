// Everything the site remembers lives in localStorage under "mcc." keys.
// Storage can be unavailable (private mode, blocked cookies), so every
// access is wrapped and falls back to an in-memory copy.

const PREFIX = 'mcc.';
const memory = {};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw != null) return JSON.parse(raw);
  } catch (e) { /* fall through */ }
  return key in memory ? memory[key] : fallback;
}

function write(key, value) {
  memory[key] = value;
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  window.dispatchEvent(new CustomEvent('mcc:store', { detail: { key } }));
}

// ---- favourites ("My Games") ----
export const favorites = {
  list: () => read('favorites', []),
  has: (id) => read('favorites', []).includes(id),
  toggle(id) {
    const list = read('favorites', []);
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.unshift(id);
    write('favorites', list);
    return i < 0;
  },
  remove(id) { write('favorites', read('favorites', []).filter((x) => x !== id)); },
  clear() { write('favorites', []); },
};

// ---- recently played ----
const RECENT_MAX = 30;
export const recent = {
  list: () => read('recent', []).map((r) => (typeof r === 'string' ? { id: r, t: 0 } : r)),
  push(id) {
    const list = recent.list().filter((r) => r.id !== id);
    list.unshift({ id, t: Date.now() });
    write('recent', list.slice(0, RECENT_MAX));
  },
  clear() { write('recent', []); },
};

// ---- the player's own star ratings ----
export const ratings = {
  all: () => read('ratings', {}),
  get: (id) => read('ratings', {})[id] || 0,
  set(id, stars) {
    const all = read('ratings', {});
    if (stars) all[id] = stars; else delete all[id];
    write('ratings', all);
  },
};

// ---- play counts ----
export const plays = {
  all: () => read('plays', {}),
  get: (id) => read('plays', {})[id] || 0,
  inc(id) {
    const all = read('plays', {});
    all[id] = (all[id] || 0) + 1;
    write('plays', all);
    return all[id];
  },
};

// ---- high scores written by games/_shared/gamekit.js ----
export function highScore(id) {
  const v = read('hs.' + id, null);
  return typeof v === 'number' ? v : null;
}

// ---- misc UI preferences ----
export const prefs = {
  get: (k, d) => read('pref.' + k, d),
  set: (k, v) => write('pref.' + k, v),
};

export function clearAll() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
  } catch (e) { /* ignore */ }
  Object.keys(memory).forEach((k) => delete memory[k]);
  window.dispatchEvent(new CustomEvent('mcc:store', { detail: { key: '*' } }));
}
