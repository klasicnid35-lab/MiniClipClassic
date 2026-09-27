// search.html?q=<words>&page=<n>
import { param, html, setTitle, esc, catUrl, $ } from '../core/util.js';
import { boot } from '../core/boot.js';
import { searchGames } from '../core/search.js';
import { listingPanel, bindFavLinks } from '../../../components/listing.js';
import { renderRightColumn } from '../../../components/rightcol.js';
import { ct } from '../../../components/thumbs.js';

const q = (param('q') || '').trim();
const lib = await boot();
const page = Math.max(1, parseInt(param('page'), 10) || 1);
const results = q ? searchGames(lib, q) : [];
setTitle(q ? 'Search: ' + q : 'Search');

const cats = lib.cats.filter((c) => !c.virtual);
const empty = q
  ? `Sorry, no games matched <b>"${esc(q)}"</b>.<ul><li>Check your spelling</li><li>Try fewer or different words, like <a href="search.html?q=puzzle">puzzle</a>, <a href="search.html?q=racing">racing</a> or <a href="search.html?q=space">space</a></li><li>Or browse a category: ${cats.slice(0, 8).map((c) => `<a href="${catUrl(c.id)}">${esc(c.name)}</a>`).join(', ')}</li></ul>`
  : 'Type the name of a game, a category or a keyword into the <b>Search for Games</b> box at the top of the page and press <b>Go!</b>';

html('#main', listingPanel(lib, {
  title: q ? `Search Results for "${q}"` : 'Search for Games',
  icon: 'assets/icons/pad-white.png',
  games: results,
  page,
  pageUrl: (n) => 'search.html?q=' + encodeURIComponent(q) + (n > 1 ? '&page=' + n : ''),
  empty,
}) + (results.length ? '' : `<div class="ipanel"><div class="bhead"><h1>Popular Games</h1></div><div class="ibody"><div class="relgrid">${lib.top().slice(0, 12).map((g) => ct(g)).join('')}</div></div></div>`));
bindFavLinks($('#main'));
renderRightColumn(lib, { daily: false });
