// game.html?id=<game id>
import { param, html, catUrl, esc } from '../core/util.js';
import { getData } from '../core/data.js';
import { boot } from '../core/boot.js';
import { renderGamePage } from '../../../components/gamepage.js';

const id = param('id');
// highlight the matching nav tab before the header is drawn
const pre = await getData().catch(() => null);
const game = pre && pre.get(id);
if (game) document.body.dataset.nav = game.category;

const lib = await boot();
if (game) renderGamePage(lib, game);
else {
  html('#content', `<div class="ipanel" style="margin:10px 5px 0"><div class="bhead"><h1>Game not found</h1></div>
    <div class="ibody notfound"><div class="big">Oops!</div><p>Sorry, we couldn't find the game <b>${esc(id || '')}</b>.</p>
    <p><a href="index.html">Back to the Games Home</a> &middot; <a href="${catUrl('new')}">Latest games</a> &middot; <a href="categories.html">All categories</a></p></div></div>`);
}
