// categories.html - every category as a box with thumbnails, like the homepage
import { html, setTitle, esc, catUrl } from '../core/util.js';
import { boot } from '../core/boot.js';
import { ct, link } from '../../../components/thumbs.js';
import { renderRightColumn } from '../../../components/rightcol.js';

const lib = await boot();
setTitle('All Categories');

const boxes = lib.cats.map((c) => {
  const games = lib.inCat(c.id).slice().sort((a, b) => lib.score(b) - lib.score(a));
  const n = c.virtual === 'top' ? Math.min(100, games.length) : games.length;
  return `<div class="catbox">
    <div class="chead"><a href="${catUrl(c.id)}">${esc(c.title)}</a></div>
    <div class="cthumbs">${games.slice(0, 2).map((g) => ct(g)).join('')}</div>
    <ul class="clinks">${games.slice(2, 6).map((g) => `<li>${link(g)}</li>`).join('')}</ul>
    <a class="cmore" href="${catUrl(c.id)}">View all ${n} games</a>
  </div>`;
}).join('');

html('#main', `<div class="ipanel" style="margin-bottom:0"><div class="bhead"><img class="bico" src="assets/icons/pad-white.png" width="30" height="16" alt=""><h1>All Categories<span class="cnt">(${lib.cats.length} categories, ${lib.games.length} games)</span></h1><span class="right"><a href="games.html">A-Z list of all games</a></span></div></div>
  <div class="catboxes all">${boxes}</div>`);
renderRightColumn(lib);
