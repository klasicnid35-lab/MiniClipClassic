// Right-hand column shared by every page: advert box, small promo banner,
// Top Ten Games, Latest Games Played / My Games and the daily puzzles box.
import { $, $$, esc, gameUrl, usDate, html } from '../assets/js/core/util.js';
import { recent, favorites } from '../assets/js/core/store.js';
import { link, bigImg } from './thumbs.js';

export function rightColumnHTML({ ad = true, promo = true, daily = true } = {}) {
  return `
  ${ad ? `<div class="adbox">
    <div class="adslot"><a id="housead" href="games.html?cat=top"><img src="assets/banners/house-ad.png" width="300" height="250" alt="Advertisement"></a></div>
    <div class="adlabel"><span>Advertisement</span></div>
  </div>` : ''}
  ${promo ? '<a class="smallbanner" id="smallbanner" href="games.html?cat=hot"><img src="assets/banners/promo-small.png" width="314" height="66" alt=""></a>' : ''}
  <div class="opanel topten">
    <div class="ohead">Top Ten Games</div>
    <div class="obody"><ol class="tlist" id="tlist"></ol><div class="tprev" id="tprev"></div></div>
  </div>
  <div class="opanel twin">
    <div class="ohalf played"><div class="ohead">Latest Games Played</div><div class="obody" id="played"></div></div>
    <div class="ohalf mine"><div class="ohead">My Games</div><div class="obody" id="mygames"></div></div>
  </div>
  ${daily ? `<div class="dailybox" id="dailybox">
    <a class="daily-l" href="#"><span class="dname">Sudoku</span><span class="dplay">PLAY DAILY</span></a>
    <a class="daily-r" href="#"><span class="dname">Mahjong</span><span class="dplay">PLAY DAILY</span></a>
    <div class="dfoot">New Puzzles every day! <span id="dailydate"></span></div>
  </div>` : ''}`;
}

const short = (s, n) => (s.length > n ? s.slice(0, n - 2).replace(/\s+\S*$/, '') + '...' : s);

export function fillRightColumn(lib) {
  const site = lib.site;
  if (site.houseAd && $('#housead')) { $('#housead').href = site.houseAd.href; $('#housead img').alt = site.houseAd.alt || 'Advertisement'; }
  if (site.smallBanner && $('#smallbanner')) { $('#smallbanner').href = site.smallBanner.href; $('#smallbanner img').alt = site.smallBanner.alt || ''; }

  // Top Ten with hover preview
  const top = lib.topTen();
  if ($('#tlist')) {
    html('#tlist', top.map((g, i) => `<li data-i="${i}"${i === 0 ? ' class="sel"' : ''}>${link(g)}</li>`).join(''));
    const preview = (i) => {
      const g = top[i];
      $$('#tlist li').forEach((li) => li.classList.toggle('sel', +li.dataset.i === i));
      const text = g.description || `A classic ${g.categoryName.toLowerCase()} game${g.year ? ' from ' + g.year : ''}${g.installed ? '' : ' - coming soon to the archive'}.`;
      html('#tprev', `<a href="${gameUrl(g)}">${bigImg(g, 148, 107)}</a>
        <a class="tt" href="${gameUrl(g)}">${esc(g.title)}</a><p>${esc(short(text, 64))}</p>`);
    };
    $('#tlist').addEventListener('mouseover', (e) => { const li = e.target.closest('li'); if (li) preview(+li.dataset.i); });
    $('#tlist').addEventListener('focusin', (e) => { const li = e.target.closest('li'); if (li) preview(+li.dataset.i); });
    preview(0);
  }

  const drawMine = () => {
    if (!$('#played')) return;
    const played = recent.list().map((r) => lib.get(r.id)).filter(Boolean).slice(0, 5);
    html('#played', played.length ? '<ul>' + played.map((g) => `<li>${link(g)}</li>`).join('') + '</ul>' : '');
    const favs = favorites.list().map((id) => lib.get(id)).filter(Boolean);
    html('#mygames', favs.length
      ? '<ul>' + favs.slice(0, 4).map((g) => `<li>${link(g)}</li>`).join('') + '</ul>' + (favs.length > 4 ? `<a href="mygames.html" class="allmine">View all ${favs.length} games</a>` : '')
      : 'Add your favorite Games by clicking on the "Add to My Games" button under the Games.');
  };
  drawMine();
  window.addEventListener('mcc:store', drawMine);
  window.addEventListener('storage', drawMine);

  if ($('#dailybox')) {
    const dl = site.daily && lib.get(site.daily.left), dr = site.daily && lib.get(site.daily.right);
    if (dl) $('.daily-l').href = gameUrl(dl);
    if (dr) $('.daily-r').href = gameUrl(dr);
    $('#dailydate').textContent = usDate();
  }
}

export function renderRightColumn(lib, opts) {
  const host = $('#rcol');
  if (!host) return;
  host.innerHTML = rightColumnHTML(opts);
  fillRightColumn(lib);
}
