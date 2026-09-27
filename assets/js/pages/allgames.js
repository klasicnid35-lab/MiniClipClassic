// allgames.html?letter=A&cat=action&show=playable
// The master A-Z directory of the whole catalogue. Letters, category and
// "show" filters work instantly (no page reload) and are kept in the URL.
import { param, html, setTitle, esc, gameUrl, $ } from '../core/util.js';
import { boot } from '../core/boot.js';
import { renderRightColumn } from '../../../components/rightcol.js';
import { categoryItems, otherItems } from '../../../components/sidebar.js';

const LETTERS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const SHOWS = [['', 'All games'], ['playable', 'Playable now'], ['na', 'Not added yet'], ['challenge', 'High score challenge games']];

const lib = await boot();
setTitle('All Games A-Z');

const fromParam = (v) => {
  const s = String(v || '').toUpperCase();
  if (s === '0' || s === '#' || s === '0-9') return '#';
  return LETTERS.includes(s) ? s : '';
};
const state = {
  letter: fromParam(param('letter')),
  cat: lib.cat(param('cat')) && !lib.cat(param('cat')).virtual ? param('cat') : '',
  show: SHOWS.some(([k]) => k === param('show')) ? param('show') : '',
};

const total = lib.games.length;
const byLetter = new Map(LETTERS.map((l) => [l, []]));
for (const g of lib.games) byLetter.get(g.letter).push(g);

function matches(g) {
  if (state.cat && !g.cats.includes(state.cat)) return false;
  if (state.show === 'playable' && !g.installed) return false;
  if (state.show === 'na' && g.installed) return false;
  if (state.show === 'challenge' && !g.challenge) return false;
  return true;
}

const lp = (l) => (l === '#' ? '0' : l);
function url() {
  const q = new URLSearchParams();
  if (state.letter) q.set('letter', lp(state.letter));
  if (state.cat) q.set('cat', state.cat);
  if (state.show) q.set('show', state.show);
  const s = q.toString();
  return 'allgames.html' + (s ? '?' + s : '');
}

// compact text entry for the full directory
const entry = (g) => `<li><a href="${gameUrl(g)}"${g.challenge ? ' class="c"' : ''} title="${esc(g.title)} - ${esc(g.categoryName)}${g.year ? ', ' + g.year : ''}">${esc(g.title)}</a>${g.installed ? ' <span class="st on">Play</span>' : ''}</li>`;
// richer row when a single letter is shown
const row = (g) => `<li><a href="${gameUrl(g)}"${g.challenge ? ' class="c"' : ''}>${esc(g.title)}</a><span class="azi">${esc(g.categoryName)}${g.year ? ' &middot; ' + g.year : ''}${g.installed ? ' <span class="st on">Play now</span>' : ''}</span></li>`;

function draw() {
  const letters = state.letter ? [state.letter] : LETTERS;
  let shown = 0;
  const sections = letters.map((l) => {
    const games = byLetter.get(l).filter(matches);
    shown += games.length;
    if (!games.length) return '';
    return `<div class="azsec" id="az-${lp(l)}"><h2 class="azh">${l === '#' ? '# (numbers)' : l}<span>(${games.length} game${games.length === 1 ? '' : 's'})</span>${state.letter ? '' : '<a href="#aztop" class="up">top</a>'}</h2>
      <ul class="${state.letter ? 'azrows' : 'azcols'}">${games.map(state.letter ? row : entry).join('')}</ul></div>`;
  }).join('');

  const bar = ['<a href="#" data-l=""' + (state.letter ? '' : ' class="on"') + '>All</a>']
    .concat(LETTERS.map((l) => {
      const n = byLetter.get(l).filter(matches).length;
      if (!n) return `<span class="dis">${l}</span>`;
      return `<a href="#" data-l="${lp(l)}"${state.letter === l ? ' class="on"' : ''} title="${n} game${n === 1 ? '' : 's'}">${l}</a>`;
    })).join('');

  html('#azbar', bar);
  html('#azcount', `Showing <b>${shown}</b> of ${total} games`);
  html('#azlist', sections || `<div class="nores">No games match these filters. <a href="allgames.html">Show all ${total} games</a>.</div>`);
  const t = state.letter ? `Games starting with ${state.letter === '#' ? 'a number' : state.letter}` : 'All Games A-Z';
  setTitle(t);
  history.replaceState(null, '', url());
}

const catOptions = lib.cats.filter((c) => !c.virtual)
  .map((c) => `<option value="${esc(c.id)}"${c.id === state.cat ? ' selected' : ''}>${esc(c.name)} (${lib.count(c.id)})</option>`).join('');

html('#main', `<div class="ipanel azpanel" id="aztop">
  <div class="bhead"><img class="bico" src="assets/icons/pad-white.png" width="30" height="16" alt=""><h1>All Games A-Z<span class="cnt">(${total} games)</span></h1><span class="right">TOTAL GAMES: ${total}</span></div>
  <div class="ibody">
    <p class="catdesc">The complete directory of the classic games archive - ${total} games from the golden age of free online games, from <b>${esc(lib.games[0].title)}</b> to <b>${esc(lib.games[total - 1].title)}</b>. Pick a letter, or narrow the list down by category.</p>
    <div class="azbar" id="azbar"></div>
    <div class="azfilter">
      <label>Show: <select id="azshow">${SHOWS.map(([k, t]) => `<option value="${k}"${k === state.show ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Category: <select id="azcat"><option value="">All categories</option>${catOptions}</select></label>
      <span class="azcount" id="azcount"></span>
    </div>
    <div id="azlist"></div>
    <div class="legend"><b>Legend :</b> <span class="o">Orange Links</span> = High score challenge game &nbsp; <span class="b">Blue Links</span> = normal game &nbsp; <span class="st on">Play</span> = playable now</div>
  </div>
</div>`);

$('#azbar').addEventListener('click', (e) => {
  const a = e.target.closest('a[data-l]');
  if (!a) return;
  e.preventDefault();
  state.letter = fromParam(a.dataset.l);
  draw();
  $('#aztop').scrollIntoView();
});
$('#azshow').addEventListener('change', (e) => { state.show = e.target.value; draw(); });
$('#azcat').addEventListener('change', (e) => { state.cat = e.target.value; draw(); });
draw();

renderRightColumn(lib, { daily: false });
$('#rcol').insertAdjacentHTML('beforeend', `<div class="opanel cats"><div class="ohead">All Categories</div>
  <div class="obody"><ul class="catlist">${categoryItems(lib, '', true)}</ul></div></div>
  <div class="opanel cats"><div class="ohead">Other Sections</div><div class="obody"><ul class="catlist">${otherItems()}</ul></div></div>`);
