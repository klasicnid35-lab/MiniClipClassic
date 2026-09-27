// Dense game listings used by category, search and My Games pages.
import { esc, gameUrl, catUrl } from '../assets/js/core/util.js';
import { favorites, plays } from '../assets/js/core/store.js';
import { byTitle } from '../assets/js/core/data.js';
import { thumbImg, badge, stars, status } from './thumbs.js';

export const SORTS = [
  ['popular', 'Most Popular'],
  ['new', 'Newest'],
  ['rated', 'Top Rated'],
  ['az', 'A-Z'],
];

export function sortGames(lib, games, key) {
  const list = games.slice();
  // newest: latest additions first, then by release year (unknown years last)
  if (key === 'new') return list.sort((a, b) => (b.new - a.new) || (b.year || 0) - (a.year || 0) || lib.score(b) - lib.score(a));
  if (key === 'rated') return list.sort((a, b) => lib.rating(b) - lib.rating(a) || lib.score(b) - lib.score(a));
  if (key === 'az') return list.sort(byTitle);
  return list.sort((a, b) => lib.score(b) - lib.score(a));
}

export function gameCard(lib, g, extra = '') {
  const cat = lib.cat(g.category);
  const fav = favorites.has(g.id);
  const n = plays.get(g.id);
  return `<div class="gcard">
    <a class="tbw" href="${gameUrl(g)}">${thumbImg(g)}${badge(g)}</a>
    <div class="gi">
      <a class="gt" href="${gameUrl(g)}">${esc(g.title)}</a>
      <p>${g.description ? esc(g.description) : `<span class="empty">A classic ${esc(g.categoryName.toLowerCase())} game${g.year ? ' from ' + esc(g.year) : ''}${g.aliases.length ? ', also known as ' + esc(g.aliases[0]) : ''}.</span>`}</p>
      <div class="meta">${stars(lib.rating(g))} &nbsp;${cat ? `<a href="${catUrl(cat.id)}">${esc(cat.name)}</a>` : ''}${g.year ? ` &middot; ${esc(g.year)}` : ''}${g.installed ? ' &middot; ' + status(g) : ''}${n ? ` &middot; played ${n}x` : ''}${extra}</div>
    </div>
    <a href="#" class="fav${fav ? ' on' : ''}" data-fav="${esc(g.id)}" title="${fav ? 'Remove from My Games' : 'Add to My Games'}">${fav ? '&#9829; My Game' : '+ My Games'}</a>
  </div>`;
}

// wires up the "+ My Games" links inside a container (event delegation)
export function bindFavLinks(host, onChange) {
  host.addEventListener('click', (e) => {
    const a = e.target.closest('[data-fav]');
    if (!a) return;
    e.preventDefault();
    const on = favorites.toggle(a.dataset.fav);
    a.classList.toggle('on', on);
    a.innerHTML = on ? '&#9829; My Game' : '+ My Games';
    a.title = on ? 'Remove from My Games' : 'Add to My Games';
    if (onChange) onChange(a.dataset.fav, on);
  });
}

export function pager(page, pages, makeUrl) {
  if (pages <= 1) return '';
  const nums = [];
  for (let i = 1; i <= pages; i++) {
    if (pages > 9 && i > 2 && i < pages - 1 && Math.abs(i - page) > 2) { if (nums[nums.length - 1] !== '...') nums.push('...'); continue; }
    nums.push(i === page ? `<b>${i}</b>` : `<a href="${makeUrl(i)}">${i}</a>`);
  }
  const prev = page > 1 ? `<a class="prev" href="${makeUrl(page - 1)}"><span class="arr"></span>Previous</a>` : '<span class="prev dis"><span class="arr"></span>Previous</span>';
  const next = page < pages ? `<a class="next" href="${makeUrl(page + 1)}">Next<span class="arr"></span></a>` : '<span class="next dis">Next<span class="arr"></span></span>';
  return `<div class="ipager">${prev}<span class="nums">${nums.join('')}</span>${next}</div>`;
}

/**
 * Renders a full blue listing panel.
 * opts: { title, icon, games, sort, sortUrl(sortKey), page, perPage, pageUrl(n), desc, empty, right }
 */
export function listingPanel(lib, opts) {
  const per = opts.perPage || 20;
  const total = opts.games.length;
  const pages = Math.max(1, Math.ceil(total / per));
  const page = Math.min(Math.max(1, opts.page || 1), pages);
  const slice = opts.games.slice((page - 1) * per, page * per);
  const sortbar = opts.sortUrl
    ? `<div class="sortbar"><b>Sort by:</b>${SORTS.map(([k, t]) => `<a href="${opts.sortUrl(k)}"${k === opts.sort ? ' class="on"' : ''}>${t}</a>`).join(' |')}<span class="view">Showing ${total ? (page - 1) * per + 1 : 0}-${Math.min(total, page * per)} of ${total}</span></div>`
    : '';
  const body = total
    ? `<div class="gcards">${slice.map((g) => gameCard(lib, g)).join('')}</div>${pager(page, pages, opts.pageUrl)}`
    : `<div class="nores">${opts.empty || 'No games here yet.'}</div>`;
  return `<div class="ipanel">
    <div class="bhead">${opts.icon ? `<img class="bico" src="${opts.icon}" width="30" height="16" alt="">` : ''}<h1>${esc(opts.title)}<span class="cnt">(${total} game${total === 1 ? '' : 's'})</span></h1>${opts.right || ''}</div>
    <div class="ibody">${opts.desc ? `<p class="catdesc">${opts.desc}</p>` : ''}${sortbar}${body}</div>
  </div>`;
}
