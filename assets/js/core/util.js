// Small DOM / string helpers shared by every page.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);

export const param = (name) => new URLSearchParams(location.search).get(name);

export const gameUrl = (g) => 'game.html?id=' + encodeURIComponent(g.id);
export const catUrl = (id) => 'games.html?cat=' + encodeURIComponent(id);
export const searchUrl = (q) => 'search.html?q=' + encodeURIComponent(q);

export function html(el, markup) {
  if (typeof el === 'string') el = $(el);
  if (el) el.innerHTML = markup;
  return el;
}

// US style date as used on the 2009 site ("06/01/2009")
export function usDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return p(d.getMonth() + 1) + '/' + p(d.getDate()) + '/' + d.getFullYear();
}

export function niceDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Deterministic PRNG, used for "random" picks that should stay stable per day.
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

export function daySeed(d = new Date()) {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export function setTitle(t) {
  document.title = t ? t + ' - MiniClip Classic' : 'MiniClip Classic - Play Free Online Games';
}
