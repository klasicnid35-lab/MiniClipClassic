// Homepage: fills the static layout in index.html with games from the catalogue.
// The line-up (Latest Games, Hot Games, category boxes, Top Ten) comes from
// data/site.json and matches the 2008-2009 screenshots; anything missing is
// filled in automatically from the catalogue.
import { boot } from '../core/boot.js';
import { $, esc, gameUrl, catUrl, html } from '../core/util.js';
import { prefs } from '../core/store.js';
import { tb, ct, link, imageSrc } from '../../../components/thumbs.js';
import { remember } from '../../../components/placeholder.js';
import { categoryItems, otherItems, fullList } from '../../../components/sidebar.js';
import { fillRightColumn } from '../../../components/rightcol.js';

const lib = await boot();
const site = lib.site;

// ---------------------------------------------------------------- Latest Games
// the big picture pages through 3 featured games; the 3 thumbnails stay put
const thumbs = lib.pick(site.homeLatestThumbs, 3, lib.latest());
const pages = lib.pick(site.homeFeatured, 3, lib.latest());
html('#fthumbs', thumbs.map((g) => tb(g)).join(''));
let page = 0;
let timer = null;

const short = (s, n) => (s.length > n ? s.slice(0, n - 2).replace(/\s+\S*$/, '') + '...' : s);
const blurb = (g) => g.description || `A classic ${g.categoryName.toLowerCase()} game${g.year ? ' from ' + g.year : ''}.`;

function showPage(n) {
  page = (n + pages.length) % pages.length;
  const big = pages[page];
  remember(big);
  const img = $('#fimg img');
  img.dataset.gid = big.id;
  img.dataset.ph = 'l';
  delete img.dataset.phDone;
  img.src = imageSrc(big);
  img.alt = big.title;
  $('#fimg').href = gameUrl(big);
  $('#ftitle').href = gameUrl(big);
  $('#ftitle').textContent = big.title;
  $('#fdesc').textContent = short(blurb(big), 58);
  $('#fplay').href = gameUrl(big);
  $('#fplay').lastChild.textContent = big.installed ? 'Play Now' : 'More Info';
  html('#fpager .nums', pages.map((_, i) => (i === page ? `<b>${i + 1}</b>` : `<a href="#" data-page="${i}">${i + 1}</a>`)).join(''));
}

$('#fpager').addEventListener('click', (e) => {
  const a = e.target.closest('a');
  if (!a) return;
  e.preventDefault();
  if (a.dataset.page) showPage(+a.dataset.page);
  else showPage(page + (+a.dataset.dir || 0));
  restartTimer();
});
function restartTimer() {
  clearInterval(timer);
  timer = setInterval(() => showPage(page + 1), 9000);
}
$('.latest').addEventListener('mouseenter', () => clearInterval(timer));
$('.latest').addEventListener('mouseleave', restartTimer);
showPage(0);
restartTimer();

// ---------------------------------------------------------------- Hot Games
html('#hotgrid', lib.pick(site.hotGames, 6, lib.hot()).map((g) => tb(g)).join(''));

// ---------------------------------------------------------------- wide promo
if (site.promo) {
  $('#widebanner').href = site.promo.href;
  $('#widebanner img').alt = site.promo.alt || '';
}

// ---------------------------------------------------------------- category boxes
html('#catboxes', (site.homeCategories || []).map((box) => {
  const id = typeof box === 'string' ? box : box.id;
  const c = lib.cat(id);
  if (!c) return '';
  const games = lib.pick(box.games, 6, lib.byScore(lib.inCat(id)));
  const thumbs = games.slice(0, 2).map((g) => ct(g)).join('');
  const links = games.slice(2, 6).map((g) => `<li>${link(g)}</li>`).join('');
  return `<div class="catbox">
    <div class="chead"><a href="${catUrl(id)}">${esc(c.title)}</a></div>
    <div class="cthumbs">${thumbs}</div>
    <ul class="clinks">${links}</ul>
    <a class="cmore" href="${catUrl(id)}">View all ${lib.count(id)} games</a>
  </div>`;
}).join(''));

// ---------------------------------------------------------------- right column
fillRightColumn(lib);

// ---------------------------------------------------------------- categories + full list
// The Full Games List shows the whole catalogue, as on the 2008-2009 site.
html('#catlist', categoryItems(lib));
html('#othersections', otherItems());
html('#fullcols', fullList(lib));
const az = $('#azlink');
if (az) az.textContent = `A-Z directory (${lib.games.length} games)`;

const toggle = $('#togglelists');
const label = toggle.childNodes[1];
function setHidden(h) {
  $('#agcols').classList.toggle('hidden', h);
  label.textContent = (h ? 'Show' : 'Hide') + ' all Games Sections and Full Games List';
}
toggle.addEventListener('click', (e) => {
  e.preventDefault();
  const h = !$('#agcols').classList.contains('hidden');
  setHidden(h);
  prefs.set('hideLists', h);
});
if (prefs.get('hideLists', false)) setHidden(true);
