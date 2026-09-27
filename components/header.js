// Site header: logo, the three big tabs and the blue navigation bar with
// the "More" menu, "Find Games Quickly" drop-down and the search box.
import { esc, gameUrl, catUrl, $, param } from '../assets/js/core/util.js';

const TABS = [
  { id: 'games', cls: 't-games', href: 'index.html', label: 'Games', icon: 'assets/icons/tab-games.png', w: 30, h: 17 },
  { id: 'players', cls: 't-players', href: 'players.html', label: 'Players', icon: 'assets/icons/tab-players.png', w: 31, h: 24 },
  { id: 'sketch', cls: 't-sketch', href: 'sketch.html', label: 'SketchPad', icon: 'assets/icons/tab-sketch.png', w: 38, h: 44 },
];

export function renderHeader(lib) {
  const host = $('#hdr');
  if (!host) return;
  const tab = document.body.dataset.tab || 'games';
  const nav = document.body.dataset.nav || '';
  const navCats = (lib && lib.site.navCategories) || ['action', 'multiplayer', 'sports', 'puzzle'];

  const tabs = TABS.map((t) => `<li class="${t.cls}${t.id === tab ? ' on' : ''}"><a href="${t.href}"><img class="ti" src="${t.icon}" width="${t.w}" height="${t.h}" alt="">${t.label}</a></li>`).join('');

  const links = [`<li><a href="index.html"${nav === 'home' ? ' class="on"' : ''}>Games Home</a></li>`]
    .concat(navCats.map((id) => {
      const c = lib && lib.cat(id);
      const label = c ? c.title : id;
      return `<li><a href="${catUrl(id)}"${nav === id ? ' class="on"' : ''}>${esc(label)}</a></li>`;
    })).join('');

  const moreItems = lib
    ? lib.cats.map((c) => `<a href="${catUrl(c.id)}">${esc(c.name)}</a>`).join('') + '<a href="categories.html">All Categories...</a>'
    : '';

  const q = document.body.dataset.page === 'search' ? (param('q') || '') : '';

  host.innerHTML = `
<div class="top">
  <a id="logo" href="index.html" title="Play Free Games"><img src="assets/logo/logo.png" width="240" height="52" alt="MiniClip Classic - Play Free Games"></a>
  <ul id="tabs">${tabs}</ul>
</div>
<div id="nav"><div id="navin">
  <ul id="navlinks">${links}</ul>
  <div id="more"><a href="categories.html" id="morebtn" aria-haspopup="true">More</a><div id="moremenu">${moreItems}</div></div>
  <div id="finder">
    <div class="ff1"><label for="quickfind">Find Games Quickly</label>
      <select id="quickfind"><option value="">Loading Game List...</option></select></div>
    <div class="ff2"><label for="q">Search for Games</label>
      <form action="search.html" method="get" id="searchform"><input id="q" name="q" type="text" value="${esc(q)}" autocomplete="off"><button type="submit">Go!</button></form></div>
  </div>
</div></div>`;

  // "More" drop-down
  const more = $('#more');
  $('#morebtn').addEventListener('click', (e) => {
    if (!lib) return;
    e.preventDefault();
    more.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!more.contains(e.target)) more.classList.remove('open');
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') more.classList.remove('open'); });

  // "Find Games Quickly"
  const sel = $('#quickfind');
  if (lib) {
    sel.innerHTML = '<option value="">Select a Game...</option>' +
      lib.alpha().map((g) => `<option value="${esc(g.id)}">${esc(g.title)}</option>`).join('');
    sel.addEventListener('change', () => {
      const g = lib.get(sel.value);
      if (g) location.href = gameUrl(g);
    });
  }

  // don't submit an empty search
  $('#searchform').addEventListener('submit', (e) => {
    if (!$('#q').value.trim()) { e.preventDefault(); $('#q').focus(); }
  });
}
