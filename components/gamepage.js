// Full game page: player + toolbar + description, instructions, info,
// related and recommended games. Used by game.html and sketch.html.
import { $, esc, catUrl, niceDate, html, setTitle } from '../assets/js/core/util.js';
import { favorites, ratings, plays, recent, highScore } from '../assets/js/core/store.js';
import { mountPlayer } from './player.js';
import { ct, stars } from './thumbs.js';
import { renderRightColumn } from './rightcol.js';

const TYPE_NAMES = { html5: 'HTML5 game', flash: 'Flash game (played with Ruffle)', iframe: 'Embedded game' };

// turn "LEFT / RIGHT arrow keys", "SPACE" etc. into little key caps
function keycaps(text) {
  return esc(text).replace(/\b(SPACE|ENTER|UP|DOWN|LEFT|RIGHT|ESC|BACKSPACE|W A S D|WASD)\b/g, '<span class="keycap">$1</span>');
}

export function renderGamePage(lib, g) {
  setTitle(g.title + ' - Play Free Online');
  document.querySelector('meta[name="description"]')?.setAttribute('content', g.description);
  const cat = lib.cat(g.category);
  const tags = g.cats.filter((c) => c !== g.category).map((c) => lib.cat(c)).filter(Boolean);
  const rel = lib.related(g, 6);
  const rec = lib.recommended(g, 6);

  html('#content', `
  <div class="gamewrap">
    <div class="bhead"><img class="bico" src="assets/icons/pad-white.png" width="30" height="16" alt=""><h1>${esc(g.title)}</h1>
      <span class="crumbs"><a href="index.html">Games</a> &raquo; ${cat ? `<a href="${catUrl(cat.id)}">${esc(cat.title)}</a> &raquo; ` : ''}${esc(g.title)}</span></div>
    <div class="stagebox">
      <div id="stage"></div>
      <div class="gtools">
        <a href="#" class="btn orange" id="favbtn"><img src="assets/icons/heart.png" width="16" height="14" alt=""><span></span></a>
        <a href="#" class="btn" id="fsbtn"><img src="assets/icons/fullscreen.png" width="14" height="14" alt="">Full Screen</a>
        <a href="#" class="btn" id="rsbtn"><img src="assets/icons/reload.png" width="14" height="14" alt="">Restart</a>
        <span class="rateme">Rate this game: <span class="rstars" id="rstars">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" title="${n} star${n > 1 ? 's' : ''}" aria-label="Rate ${n} out of 5"></button>`).join('')}</span></span>
        <span class="gstats" id="gstats"></span>
      </div>
    </div>
  </div>
  <div class="gcols">
    <div class="gl">
      <div class="infobox"><div class="chead"><b>Game Description</b></div><div class="ib">${esc(g.description)}</div></div>
      <div class="infobox"><div class="chead"><b>How to Play</b></div><div class="ib">${keycaps(g.instructions || 'Use the mouse and keyboard to play.')}<br><span class="gstats">Tip: press <span class="keycap">P</span> to pause and <span class="keycap">M</span> to mute most games. Full Screen works best on a big monitor!</span></div></div>
      <div class="infobox"><div class="chead"><b>Game Information</b></div><div class="ib"><table>
        <tr><td>Category</td><td>${cat ? `<a href="${catUrl(cat.id)}">${esc(cat.title)}</a>` : '-'}</td></tr>
        ${tags.length ? `<tr><td>Also in</td><td>${tags.map((c) => `<a href="${catUrl(c.id)}">${esc(c.name)}</a>`).join(', ')}</td></tr>` : ''}
        <tr><td>Rating</td><td id="ratingcell"></td></tr>
        <tr><td>Developer</td><td>${esc(g.developer)}</td></tr>
        ${g.year ? `<tr><td>Year</td><td>${esc(g.year)}</td></tr>` : ''}
        <tr><td>Game type</td><td>${esc(TYPE_NAMES[g.type] || g.type)}${g.challenge ? ' &middot; <span style="color:#ff3300;font-weight:bold">High score challenge</span>' : ''}</td></tr>
        <tr><td>Size</td><td>${esc(g.width)} x ${esc(g.height)}</td></tr>
        <tr><td>Added</td><td>${esc(niceDate(g.added))}</td></tr>
      </table></div></div>
      ${rel.length ? `<div class="infobox"><div class="chead"><b>Related Games</b></div><div class="ib"><div class="relgrid">${rel.map((o) => ct(o)).join('')}</div></div></div>` : ''}
      ${rec.length ? `<div class="infobox"><div class="chead"><b>Recommended Games</b></div><div class="ib"><div class="relgrid">${rec.map((o) => ct(o)).join('')}</div></div></div>` : ''}
    </div>
    <div class="gr" id="rcol"></div>
  </div>`);

  const ctl = mountPlayer($('#stage'), g);
  // count the play and remember it
  plays.inc(g.id);
  recent.push(g.id);

  // favourites
  const favbtn = $('#favbtn');
  const drawFav = () => {
    const on = favorites.has(g.id);
    favbtn.classList.toggle('on', on);
    favbtn.classList.toggle('orange', !on);
    favbtn.querySelector('span').textContent = on ? 'Remove from My Games' : 'Add to My Games';
  };
  favbtn.addEventListener('click', (e) => { e.preventDefault(); favorites.toggle(g.id); drawFav(); });
  drawFav();

  $('#fsbtn').addEventListener('click', (e) => { e.preventDefault(); ctl.fullscreen(); });
  $('#rsbtn').addEventListener('click', (e) => { e.preventDefault(); ctl.restart(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') ctl.el.classList.remove('fs-fallback'); });

  // ratings
  const rs = $('#rstars');
  const paint = (n) => [...rs.children].forEach((b) => b.classList.toggle('on', +b.dataset.n <= n));
  const drawRating = () => {
    const mine = ratings.get(g.id);
    paint(mine || Math.round(g.rating));
    html('#ratingcell', `${stars(lib.rating(g))} ${lib.rating(g).toFixed(1)} / 5${mine ? ` &nbsp;(your rating: ${mine})` : ''}`);
  };
  rs.addEventListener('mouseover', (e) => { const b = e.target.closest('button'); if (b) paint(+b.dataset.n); });
  rs.addEventListener('mouseleave', drawRating);
  rs.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const n = +b.dataset.n;
    ratings.set(g.id, ratings.get(g.id) === n ? 0 : n);
    drawRating();
    drawStats();
  });
  drawRating();

  // stats line
  const drawStats = () => {
    const hs = highScore(g.id);
    const mine = ratings.get(g.id);
    html('#gstats', `Played ${plays.get(g.id)} time${plays.get(g.id) === 1 ? '' : 's'}${hs != null && g.challenge ? ` &middot; Your best: <b>${hs}</b>` : ''}${mine ? ' &middot; Thanks for rating!' : ''}`);
  };
  drawStats();
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data || e.data.type !== 'mcc:gameover' || e.data.id !== g.id) return;
    drawStats();
  });

  renderRightColumn(lib, { promo: false, daily: false });
}
