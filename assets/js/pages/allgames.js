// allgames.html?letter=A&cat=action&kind=seasonal&show=playable&era=2007-2009
// The master A-Z directory of the whole catalogue. Letters and filters work
// instantly (no page reload) and are kept in the URL. The counters at the top
// are worked out from data/games.json.
import { param, html, setTitle, esc, gameUrl, $ } from '../core/util.js';
import { boot } from '../core/boot.js';
import { ERAS } from '../core/data.js';
import { renderRightColumn } from '../../../components/rightcol.js';
import { categoryItems, otherItems } from '../../../components/sidebar.js';

const LETTERS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const SHOWS = ['playable', 'na', 'challenge'];
const KINDS = ['seasonal', 'promotional'];
// the compact filter row: [label, what it sets]
const QUICK = [
  ['All', {}],
  ...['action', 'adventure', 'arcade', 'puzzle', 'racing', 'sports', 'shooting', 'multiplayer'].map((c) => [null, { cat: c }]),
  ['Seasonal', { kind: 'seasonal' }], ['Promotional', { kind: 'promotional' }],
  ['Playable', { show: 'playable' }], ['Unavailable', { show: 'na' }],
];

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
  kind: KINDS.includes(param('kind')) ? param('kind') : '',
  show: SHOWS.includes(param('show')) ? param('show') : '',
  era: ERAS.some(([k]) => k === param('era')) ? param('era') : '',
};

const total = lib.games.length;
const count = (f) => lib.games.filter(f).length;
const STATS = [
  ['TOTAL GAMES', total],
  ['VERIFIED', count((g) => g.verificationStatus === 'verified')],
  ['PLAYABLE', count((g) => g.installed)],
  ['ARCHIVED CATALOG ONLY', count((g) => !g.installed)],
];
const isPromo = (g) => g.cats.includes('promotional') || ['promotional', 'sponsored', 'licensed'].includes(g.historicalType);
const isMulti = (g) => g.cats.includes('multiplayer') || g.historicalType === 'multiplayer';
const byLetter = new Map(LETTERS.map((l) => [l, []]));
for (const g of lib.games) byLetter.get(g.letter).push(g);

function matches(g) {
  if (state.cat === 'multiplayer' ? !isMulti(g) : state.cat && !g.cats.includes(state.cat)) return false;
  if (state.kind === 'seasonal' && g.historicalType !== 'seasonal') return false;
  if (state.kind === 'promotional' && !isPromo(g)) return false;
  if (state.era && g.era !== state.era) return false;
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
  if (state.kind) q.set('kind', state.kind);
  if (state.show) q.set('show', state.show);
  if (state.era) q.set('era', state.era);
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
  const on = (set) => (Object.keys(set).length ? Object.entries(set).every(([k, v]) => state[k] === v) : !state.cat && !state.kind && !state.show);
  html('#azquick', '<b>Show:</b> ' + QUICK.map(([label, set], i) => {
    const text = label || (lib.cat(set.cat) || {}).name || set.cat;
    return `<a href="#" data-q="${i}"${on(set) ? ' class="on"' : ''}>${esc(text)}</a>`;
  }).join(' | '));
  html('#azera', '<b>Years:</b> ' + [['', 'All years'], ...ERAS.map(([k]) => [k, k.replace('-', '&ndash;')])].map(([k, t]) => {
    const n = k ? byEra.get(k) : 0;
    return `<a href="#" data-era="${k}"${state.era === k ? ' class="on"' : ''}${k ? ` title="${n} game${n === 1 ? '' : 's'} with a known year"` : ''}>${t}</a>`;
  }).join(' | '));
  if ($('#azcat').value !== state.cat) $('#azcat').value = state.cat;
  html('#azcount', `Showing <b>${shown}</b> of ${total} games`);
  html('#azlist', sections || `<div class="nores">No games match these filters. <a href="allgames.html">Show all ${total} games</a>.</div>`);
  const t = state.letter ? `Games starting with ${state.letter === '#' ? 'a number' : state.letter}` : 'All Games A-Z';
  setTitle(t);
  history.replaceState(null, '', url());
}

const byEra = new Map(ERAS.map(([k]) => [k, count((g) => g.era === k)]));
const catOptions = lib.cats.filter((c) => !c.virtual)
  .map((c) => `<option value="${esc(c.id)}"${c.id === state.cat ? ' selected' : ''}>${esc(c.name)} (${lib.count(c.id)})</option>`).join('');

html('#main', `<div class="ipanel azpanel" id="aztop">
  <div class="bhead"><img class="bico" src="assets/icons/pad-white.png" width="30" height="16" alt=""><h1>All Games A-Z<span class="cnt">(${total} games)</span></h1><span class="right">TOTAL GAMES: ${total}</span></div>
  <div class="ibody">
    <div class="azstats">${STATS.map(([k, v]) => `<span><b>${k}:</b> ${v}</span>`).join('')}</div>
    <p class="catdesc">The complete directory of the classic games archive - ${total} games from the golden age of free online games, from <b>${esc(lib.games[0].title)}</b> to <b>${esc(lib.games[total - 1].title)}</b>. Pick a letter, or narrow the list down below.</p>
    <div class="azbar" id="azbar"></div>
    <div class="azquick" id="azquick"></div>
    <div class="azfilter">
      <span class="azera" id="azera"></span>
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
$('#azquick').addEventListener('click', (e) => {
  const a = e.target.closest('a[data-q]');
  if (!a) return;
  e.preventDefault();
  Object.assign(state, { cat: '', kind: '', show: '' }, QUICK[+a.dataset.q][1]);
  draw();
});
$('#azera').addEventListener('click', (e) => {
  const a = e.target.closest('a[data-era]');
  if (!a) return;
  e.preventDefault();
  state.era = a.dataset.era;
  draw();
});
$('#azcat').addEventListener('change', (e) => { state.cat = e.target.value; draw(); });
draw();

renderRightColumn(lib, { daily: false });
$('#rcol').insertAdjacentHTML('beforeend', `<div class="opanel cats"><div class="ohead">All Categories</div>
  <div class="obody"><ul class="catlist">${categoryItems(lib, '', true)}</ul></div></div>
  <div class="opanel cats"><div class="ohead">Other Sections</div><div class="obody"><ul class="catlist">${otherItems()}</ul></div></div>`);
