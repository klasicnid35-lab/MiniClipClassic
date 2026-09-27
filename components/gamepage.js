// Full game page: player (or the "Game currently unavailable" notice) +
// toolbar + description, instructions, game/archive information, related
// and recommended games. Used by game.html, sketch.html and playertest.html.
import { $, esc, catUrl, html, setTitle } from '../assets/js/core/util.js';
import { favorites, ratings, plays, recent, highScore } from '../assets/js/core/store.js';
import { mountPlayer } from './player.js';
import { ct, stars, bigImg } from './thumbs.js';
import { renderRightColumn } from './rightcol.js';

const TYPE_NAMES = { html5: 'HTML5 game', 'local-web': 'Web game', flash: 'Flash game (played with Ruffle)', iframe: 'Online / embedded game' };
const HISTORY = {
  sponsored: 'Sponsored game', licensed: 'Licensed tie-in', promotional: 'Promotional release',
  'multiplayer-service': 'Online multiplayer service', 'external-service': 'External online service',
};
const VERIFIED = { verified: 'Verified classic', likely: 'Listed in the classic game lists', 'needs-review': 'Details still being checked' };

// turn "LEFT / RIGHT arrow keys", "SPACE" etc. into little key caps
function keycaps(text) {
  return esc(text).replace(/\b(SPACE|ENTER|UP|DOWN|LEFT|RIGHT|ESC|BACKSPACE|W A S D|WASD)\b/g, '<span class="keycap">$1</span>');
}

// The notice shown instead of the player when a game's files are not in the archive yet.
function unavailableHTML(lib, g) {
  const cat = lib.cat(g.category);
  const facts = [
    ['Category', cat ? `<a href="${catUrl(cat.id)}">${esc(cat.name)}</a>` : 'Other'],
    ['Released', g.year ? esc(g.year) : 'Unknown'],
    ['Developer', g.developer ? esc(g.developer) : 'Unknown'],
  ];
  if (g.publisher) facts.push(['Publisher', esc(g.publisher)]);
  return `<div class="unavail">
    ${bigImg(g, 274, 199, 'upic')}
    <div class="utext">
      <div class="uhead">Game currently unavailable</div>
      <div class="usub">This game has not been added yet.</div>
      <p><b>${esc(g.title)}</b> is part of our classic games archive, but its game file is not on the site at the moment. Add it to <b>My Games</b> and check back soon - or try one of the related games below!</p>
      <table class="ufacts">${facts.map(([k, v]) => `<tr><td>${k}:</td><td>${v}</td></tr>`).join('')}</table>
      <div class="ubtns">${cat ? `<a class="btn orange" href="${catUrl(cat.id)}">More ${esc(cat.title)}</a>` : ''}<a class="btn" href="allgames.html?letter=${encodeURIComponent(g.letter === '#' ? '0' : g.letter)}">Games A-Z</a></div>
    </div>
  </div>`;
}

export function renderGamePage(lib, g, opts = {}) {
  setTitle(g.title + (g.installed ? ' - Play Free Online' : ''));
  document.querySelector('meta[name="description"]')?.setAttribute('content', g.description || `${g.title} - a classic ${g.categoryName.toLowerCase()} game.`);
  const cat = lib.cat(g.category);
  const tags = g.cats.filter((c) => c !== g.category).map((c) => lib.cat(c)).filter(Boolean);
  const inCatalogue = !!lib.get(g.id);
  const rel = inCatalogue ? lib.related(g, 6) : [];
  const rec = inCatalogue ? lib.recommended(g, 6) : lib.hot().slice(0, 6);
  const playable = g.installed;
  const history = HISTORY[g.historicalType];

  const info = [
    ['Category', cat ? `<a href="${catUrl(cat.id)}">${esc(cat.title)}</a>` : '-'],
    tags.length && ['Also in', tags.map((c) => `<a href="${catUrl(c.id)}">${esc(c.name)}</a>`).join(', ')],
    g.aliases.length && ['Also known as', g.aliases.map(esc).join(', ')],
    ['Rating', '<span id="ratingcell"></span>'],
    ['Released', g.year ? esc(g.year) : 'Unknown'],
    ['Developer', g.developer ? esc(g.developer) : 'Unknown'],
    g.publisher && ['Publisher', esc(g.publisher)],
    history && ['Game type', history],
    ['Format', `${esc(TYPE_NAMES[g.type] || g.type)} &middot; ${playable ? '<b class="st on">Playable</b>' : '<b class="st off">Not added yet</b>'}${g.challenge ? ' &middot; <span style="color:#ff3300;font-weight:bold">High score challenge</span>' : ''}`],
    playable && ['Size', `${esc(g.width)} x ${esc(g.height)}`],
    inCatalogue && g.hostedByMiniclip !== false && ['Archive', esc(VERIFIED[g.verificationStatus] || g.verificationStatus)],
    g.historicalNotes && ['Notes', esc(g.historicalNotes)],
  ].filter(Boolean);

  html('#content', `
  <div class="gamewrap">
    <div class="bhead"><img class="bico" src="assets/icons/pad-white.png" width="30" height="16" alt=""><h1>${esc(g.title)}</h1>
      <span class="crumbs"><a href="index.html">Games</a> &raquo; ${cat ? `<a href="${catUrl(cat.id)}">${esc(cat.title)}</a> &raquo; ` : ''}${esc(g.title)}</span></div>
    <div class="stagebox${playable ? '' : ' na'}">
      <div id="stage">${playable ? '' : unavailableHTML(lib, g)}</div>
      <div class="gtools">
        ${inCatalogue ? '<a href="#" class="btn orange" id="favbtn"><img src="assets/icons/heart.png" width="16" height="14" alt=""><span></span></a>' : ''}
        ${playable ? `<a href="#" class="btn" id="fsbtn"><img src="assets/icons/fullscreen.png" width="14" height="14" alt="">Full Screen</a>
        <a href="#" class="btn" id="rsbtn"><img src="assets/icons/reload.png" width="14" height="14" alt="">Restart</a>` : ''}
        <span class="rateme">Rate this game: <span class="rstars" id="rstars">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" title="${n} star${n > 1 ? 's' : ''}" aria-label="Rate ${n} out of 5"></button>`).join('')}</span></span>
        <span class="gstats" id="gstats"></span>
      </div>
    </div>
  </div>
  <div class="gcols">
    <div class="gl">
      <div class="infobox"><div class="chead"><b>Game Description</b></div><div class="ib">${g.description ? esc(g.description) : `<span class="empty">No description yet - ${esc(g.title)} is a classic ${esc(g.categoryName.toLowerCase())} game from our archive.</span>`}</div></div>
      <div class="infobox"><div class="chead"><b>How to Play</b></div><div class="ib">${g.instructions ? keycaps(g.instructions) : playable ? 'Use the mouse and keyboard to play.' : '<span class="empty">Instructions will be added together with the game.</span>'}${playable ? '<br><span class="gstats">Tip: press <span class="keycap">P</span> to pause and <span class="keycap">M</span> to mute most games. Full Screen works best on a big monitor!</span>' : ''}</div></div>
      <div class="infobox"><div class="chead"><b>Game Information</b></div><div class="ib"><table>
        ${info.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}
      </table></div></div>
      ${rel.length ? `<div class="infobox"><div class="chead"><b>Related Games</b></div><div class="ib"><div class="relgrid">${rel.map((o) => ct(o)).join('')}</div></div></div>` : ''}
      ${rec.length ? `<div class="infobox"><div class="chead"><b>Recommended Games</b></div><div class="ib"><div class="relgrid">${rec.map((o) => ct(o)).join('')}</div></div></div>` : ''}
    </div>
    <div class="gr" id="rcol"></div>
  </div>`);

  let ctl = null;
  if (playable) {
    ctl = mountPlayer($('#stage'), g);
    if (!opts.noCount) plays.inc(g.id);
  } else {
    // for whoever looks after the site: where the file should go
    console.info(`[MiniClip Classic] "${g.title}" is not installed yet. Copy its file to games/${g.id}/ and set "installed": true and "gameFile" in data/games.json (or run: node tools/catalog/install-game.mjs ${g.id} <file>).`);
  }
  // remember the visit in "Latest Games Played" (unavailable games too)
  if (inCatalogue && !opts.noCount) recent.push(g.id);

  // favourites
  const favbtn = $('#favbtn');
  if (favbtn) {
    const drawFav = () => {
      const on = favorites.has(g.id);
      favbtn.classList.toggle('on', on);
      favbtn.classList.toggle('orange', !on);
      favbtn.querySelector('span').textContent = on ? 'Remove from My Games' : 'Add to My Games';
    };
    favbtn.addEventListener('click', (e) => { e.preventDefault(); favorites.toggle(g.id); drawFav(); });
    drawFav();
  }

  if (ctl) {
    $('#fsbtn').addEventListener('click', (e) => { e.preventDefault(); ctl.fullscreen(); });
    $('#rsbtn').addEventListener('click', (e) => { e.preventDefault(); ctl.restart(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') ctl.el.classList.remove('fs-fallback'); });
  }

  // ratings
  const rs = $('#rstars');
  const paint = (n) => [...rs.children].forEach((b) => b.classList.toggle('on', +b.dataset.n <= n));
  const drawRating = () => {
    const mine = ratings.get(g.id);
    const r = lib.rating(g);
    paint(mine || Math.round(g.rating));
    html('#ratingcell', r ? `${stars(r)} ${r.toFixed(1)} / 5${mine ? ` &nbsp;(your rating: ${mine})` : ''}` : `${stars(0)} Not rated yet - be the first!`);
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
    const n = plays.get(g.id);
    const played = playable ? `Played ${n} time${n === 1 ? '' : 's'}` : 'Not playable yet';
    html('#gstats', `${played}${hs != null && g.challenge ? ` &middot; Your best: <b>${hs}</b>` : ''}${mine ? ' &middot; Thanks for rating!' : ''}`);
  };
  drawStats();
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data || e.data.type !== 'mcc:gameover' || e.data.id !== g.id) return;
    drawStats();
  });

  renderRightColumn(lib, { promo: false, daily: false });
}
