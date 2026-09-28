// game.html?id=<game id>   (game.html?game=<id> and ?slug=<id> work too)
import { param, html, catUrl, esc } from '../core/util.js';
import { getData } from '../core/data.js';
import { boot } from '../core/boot.js';
import { renderGamePage, withOwnCopy } from '../../../components/gamepage.js';
import { getCopy } from '../../../components/owncopy.js';
import { searchGames } from '../core/search.js';
import { ct } from '../../../components/thumbs.js';

const id = param('id') || param('game') || param('slug') || '';
// highlight the matching nav tab before the header is drawn
const pre = await getData().catch(() => null);
const game = pre && pre.get(id);
if (game) document.body.dataset.nav = game.category;

const lib = await boot();
// a Flash game the visitor stored their own copy of plays from that copy
const copy = game && !game.installed && game.type === 'flash' ? await getCopy(game.id) : null;
if (game) renderGamePage(lib, copy ? withOwnCopy(game, copy) : game);
else {
  // maybe an old or mistyped link: suggest the closest titles
  const guess = id ? searchGames(lib, id.replace(/[-_]+/g, ' ')).slice(0, 6) : [];
  html('#content', `<div class="ipanel" style="margin:10px 5px 0"><div class="bhead"><h1>Game not found</h1></div>
    <div class="ibody notfound"><div class="big">Oops!</div><p>Sorry, we couldn't find the game <b>${esc(id)}</b>.</p>
    ${guess.length ? `<p>Were you looking for one of these?</p><div class="relgrid" style="justify-content:center;margin-bottom:8px">${guess.map((g) => ct(g)).join('')}</div>` : ''}
    <p><a href="index.html">Back to the Games Home</a> &middot; <a href="allgames.html">All games A-Z</a> &middot; <a href="${catUrl('hot')}">Hot games</a> &middot; <a href="categories.html">All categories</a></p></div></div>`);
}
