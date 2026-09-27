// games.html?cat=<category>&sort=<popular|new|rated|az>&page=<n>
// Without ?cat it lists every game.
import { param, html, setTitle, $ } from '../core/util.js';
import { boot } from '../core/boot.js';
import { listingPanel, sortGames, bindFavLinks, SORTS } from '../../../components/listing.js';
import { renderRightColumn } from '../../../components/rightcol.js';
import { categoryItems, otherItems } from '../../../components/sidebar.js';

const catId = param('cat') || '';
document.body.dataset.nav = catId;
const lib = await boot();

const cat = lib.cat(catId);
const defaultSort = cat && cat.virtual === 'new' ? 'new' : 'popular';
const sort = SORTS.some(([k]) => k === param('sort')) ? param('sort') : defaultSort;
const page = Math.max(1, parseInt(param('page'), 10) || 1);
const games = cat ? (cat.virtual ? lib.inCat(catId) : sortGames(lib, lib.inCat(catId), sort)) : sortGames(lib, lib.alpha(), sort);

const url = (p) => {
  const q = new URLSearchParams();
  if (catId) q.set('cat', catId);
  if (p.sort && p.sort !== defaultSort) q.set('sort', p.sort);
  if (p.page > 1) q.set('page', p.page);
  const s = q.toString();
  return 'games.html' + (s ? '?' + s : '');
};

const title = cat ? cat.title : catId ? 'Unknown Category' : 'All Games';
setTitle(title);
const icon = cat && cat.virtual === 'hot' ? null : 'assets/icons/pad-white.png';

html('#main', listingPanel(lib, {
  title,
  icon,
  games: catId && !cat ? [] : games,
  desc: cat ? cat.description : catId ? '' : 'Every game on the site. Use the sort options to find something new!',
  sort: cat && cat.virtual ? null : sort,
  sortUrl: cat && cat.virtual ? null : (k) => url({ sort: k, page: 1 }),
  page,
  pageUrl: (n) => url({ sort, page: n }),
  empty: catId && !cat
    ? `Sorry, there is no category called "<b>${catId.replace(/[<>&"]/g, '')}</b>". Try <a href="categories.html">all categories</a>.`
    : 'No games in this category yet - add some by following the guide on the <a href="info.html#add-games">Add Your Games</a> page!',
}));
bindFavLinks($('#main'));

renderRightColumn(lib, { daily: false });
$('#rcol').insertAdjacentHTML('beforeend', `<div class="opanel cats"><div class="ohead">All Categories</div>
  <div class="obody"><ul class="catlist">${categoryItems(lib, catId, true)}</ul></div></div>
  <div class="opanel cats"><div class="ohead">Other Sections</div><div class="obody"><ul class="catlist">${otherItems()}</ul></div></div>`);
