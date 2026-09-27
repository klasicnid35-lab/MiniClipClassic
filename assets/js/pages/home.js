// Homepage: fills the static layout in index.html with games from the data.
import { boot } from '../core/boot.js';
import { $, esc, gameUrl, catUrl, html } from '../core/util.js';
import { prefs } from '../core/store.js';
import { tb, ct, link } from '../../../components/thumbs.js';
import { categoryItems, otherItems, fullList } from '../../../components/sidebar.js';
import { fillRightColumn } from '../../../components/rightcol.js';

const lib = await boot();
const site = lib.site;

// ---------------------------------------------------------------- Latest Games
// 3 pages; each page = 1 big featured game + 3 thumbnails
const latest = lib.latest();
const pages = [];
for (let i = 0; i < 3 && i * 4 < latest.length; i++) pages.push(latest.slice(i * 4, i * 4 + 4));
let page = 0;
let timer = null;

const short = (s, n) => (s.length > n ? s.slice(0, n - 2).replace(/\s+\S*$/, '') + '...' : s);

function showPage(n) {
  page = (n + pages.length) % pages.length;
  const [big, ...small] = pages[page];
  const img = $('#fimg img');
  img.src = big.image;
  img.alt = big.title;
  $('#fimg').href = gameUrl(big);
  $('#ftitle').href = gameUrl(big);
  $('#ftitle').textContent = big.title;
  $('#fdesc').textContent = short(big.description, 58);
  $('#fplay').href = gameUrl(big);
  html('#fthumbs', small.map((g) => tb(g)).join(''));
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
html('#hotgrid', lib.hot().slice(0, 6).map((g) => tb(g)).join(''));

// ---------------------------------------------------------------- wide promo
const promo = lib.get(site.homePromo.game);
if (promo) {
  $('#widebanner').href = gameUrl(promo);
  $('#widebanner img').alt = 'Play ' + promo.title;
}

// ---------------------------------------------------------------- category boxes
html('#catboxes', site.homeCategories.map((id) => {
  const c = lib.cat(id);
  if (!c) return '';
  const games = lib.inCat(id).slice().sort((a, b) => lib.score(b) - lib.score(a));
  const thumbs = games.slice(0, 2).map((g) => ct(g)).join('');
  const links = games.slice(2, 6).map((g) => `<li>${link(g)}</li>`).join('');
  return `<div class="catbox">
    <div class="chead"><a href="${catUrl(id)}">${esc(c.title)}</a></div>
    <div class="cthumbs">${thumbs}</div>
    <ul class="clinks">${links}</ul>
    <a class="cmore" href="${catUrl(id)}">View all ${games.length} games</a>
  </div>`;
}).join(''));

// ---------------------------------------------------------------- right column
fillRightColumn(lib);

// ---------------------------------------------------------------- categories + full list
html('#catlist', categoryItems(lib));
html('#othersections', otherItems());
html('#fullcols', fullList(lib));

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
