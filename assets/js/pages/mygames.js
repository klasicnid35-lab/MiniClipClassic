// mygames.html - favourites and recently played games (stored in localStorage)
import { html, setTitle, esc, $ } from '../core/util.js';
import { boot } from '../core/boot.js';
import { favorites, recent } from '../core/store.js';
import { gameCard, bindFavLinks } from '../../../components/listing.js';
import { renderRightColumn } from '../../../components/rightcol.js';

const lib = await boot();
setTitle('My Games');

function ago(t) {
  if (!t) return '';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' hours ago';
  return Math.round(s / 86400) + ' days ago';
}

function draw() {
  const favs = favorites.list().map((id) => lib.get(id)).filter(Boolean);
  const played = recent.list().map((r) => ({ g: lib.get(r.id), t: r.t })).filter((r) => r.g);
  html('#main', `
  <div class="ipanel">
    <div class="bhead"><img class="bico" src="assets/icons/pad-white.png" width="30" height="16" alt=""><h1>My Games<span class="cnt">(${favs.length} game${favs.length === 1 ? '' : 's'})</span></h1>
      ${favs.length ? '<span class="right"><button class="linkbtn" id="clearfav" style="color:#fff;font-weight:bold">Clear list</button></span>' : ''}</div>
    <div class="ibody">${favs.length
      ? `<div class="gcards" id="favlist">${favs.map((g) => gameCard(lib, g)).join('')}</div>`
      : '<div class="nores">You have not added any games yet.<br>Add your favorite Games by clicking on the <b>"Add to My Games"</b> button under the Games, or the <b>+ My Games</b> links in the game lists. They are saved in this browser, so no account is needed!</div>'}</div>
  </div>
  <div class="ipanel">
    <div class="bhead"><h1>Latest Games Played<span class="cnt">(${played.length})</span></h1>
      ${played.length ? '<span class="right"><button class="linkbtn" id="clearrec" style="color:#fff;font-weight:bold">Clear history</button></span>' : ''}</div>
    <div class="ibody">${played.length
      ? `<div class="gcards" id="reclist">${played.map((r) => gameCard(lib, r.g, ` &middot; ${esc(ago(r.t))}`)).join('')}</div>`
      : '<div class="nores">Games you play will show up here.</div>'}</div>
  </div>`);
  const cf = $('#clearfav');
  if (cf) cf.addEventListener('click', () => { if (confirm('Remove all games from My Games?')) { favorites.clear(); draw(); } });
  const cr = $('#clearrec');
  if (cr) cr.addEventListener('click', () => { recent.clear(); draw(); });
}
draw();
bindFavLinks($('#main'), () => setTimeout(draw, 250));
renderRightColumn(lib, { daily: false });
