// End-to-end tests for the whole site, run in headless Chromium.
//
// The site is served from a sub folder (/MiniClipClassic/) exactly like a
// GitHub Pages project site, with 404.html returned for missing files.
//
// usage: node tools/test/run-tests.mjs [--quick]
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PREFIX = '/MiniClipClassic/';
const QUICK = process.argv.includes('--quick');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.swf': 'application/x-shockwave-flash', '.xml': 'application/xml', '.txt': 'text/plain', '.md': 'text/markdown' };

// ---------------------------------------------------------------- server
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = decodeURIComponent(url.pathname);
  const send404 = () => { res.writeHead(404, { 'content-type': TYPES['.html'] }); res.end(req.method === 'HEAD' ? '' : fs.readFileSync(path.join(ROOT, '404.html'))); };
  if (!p.startsWith(PREFIX)) return send404();
  p = p.slice(PREFIX.length) || 'index.html';
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory() || p.startsWith('.git') || p.startsWith('tools/')) return send404();
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}${PREFIX}`;

// ---------------------------------------------------------------- helpers
let passed = 0;
const failures = [];
function ok(cond, name, detail = '') {
  if (cond) { passed++; return true; }
  failures.push(name + (detail ? ' -> ' + detail : ''));
  console.log('  FAIL', name, detail);
  return false;
}
async function section(name, fn) {
  console.log('- ' + name);
  try { await fn(); } catch (e) { ok(false, name + ' (threw)', e.message.split('\n')[0]); }
}

const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });

// every page gets error tracking
function track(page) {
  const problems = [];
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource: the server responded with a status of 404/.test(t) && page.url().includes('missing-page')) return;
    problems.push('console: ' + t);
  });
  page.on('response', (r) => {
    const u = r.url();
    if (r.status() >= 400 && !u.includes('missing-page') && !u.includes('this-file-does-not-exist')) problems.push(r.status() + ' ' + u);
  });
  page.on('requestfailed', (r) => {
    const err = r.failure() && r.failure().errorText;
    // navigating away / replacing an iframe aborts requests on purpose
    if (err === 'net::ERR_ABORTED') return;
    problems.push('requestfailed ' + err + ' ' + r.url());
  });
  return problems;
}
async function open(url, opts = {}) {
  const page = await context.newPage();
  const problems = track(page);
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  if (opts.wait) await page.waitForTimeout(opts.wait);
  return { page, problems };
}
async function brokenImages(page) {
  return page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map((i) => i.getAttribute('src')));
}

const games = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8'));
const cats = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/categories.json'), 'utf8'));
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/site.json'), 'utf8'));

// ---------------------------------------------------------------- data
await section('data files', async () => {
  const ids = new Set();
  const catIds = new Set(cats.map((c) => c.id));
  for (const g of games) {
    ok(g.id && /^[a-z0-9-]+$/.test(g.id), 'game id valid: ' + g.id);
    ok(!ids.has(g.id), 'game id unique: ' + g.id); ids.add(g.id);
    for (const f of ['title', 'description', 'instructions', 'category', 'type', 'file', 'thumbnail', 'image', 'developer', 'year', 'rating', 'popularity', 'added']) ok(g[f] !== undefined && g[f] !== '', `${g.id} has ${f}`);
    ok(['html5', 'flash', 'iframe'].includes(g.type), `${g.id} type`, g.type);
    ok(catIds.has(g.category), `${g.id} category exists`, g.category);
    for (const t of g.tags || []) ok(catIds.has(t), `${g.id} tag exists`, t);
    for (const f of [g.file, g.thumbnail, g.image]) ok(fs.existsSync(path.join(ROOT, f)), `${g.id} file exists`, f);
    ok(g.rating >= 0 && g.rating <= 5, `${g.id} rating range`);
    ok(/^\d{4}-\d{2}-\d{2}$/.test(g.added), `${g.id} added date format`);
  }
  for (const k of ['homePromo', 'houseAd', 'daily']) ok(site[k], 'site.json has ' + k);
  for (const id of [...site.homeCategories, ...site.navCategories]) ok(catIds.has(id), 'site.json category exists', id);
  for (const id of [site.homePromo.game, site.houseAd.game, site.daily.left, site.daily.right]) ok(ids.has(id), 'site.json game exists', id);
});

// ---------------------------------------------------------------- every page renders cleanly
const PAGES = ['index.html', 'games.html', 'games.html?cat=action', 'games.html?cat=hot', 'games.html?cat=new', 'games.html?cat=top', 'games.html?sort=az&page=2',
  'search.html?q=space', 'search.html?q=zzzzqqq', 'search.html', 'mygames.html', 'players.html', 'sketch.html', 'categories.html', 'info.html', '404.html', 'game.html?id=brick-buster', 'game.html?id=nope'];
const links = new Set();
await section('pages load without errors or broken images', async () => {
  for (const url of PAGES) {
    const { page, problems } = await open(url, { wait: 400 });
    ok(problems.length === 0, 'no errors on ' + url, problems.join(' | '));
    const broken = await brokenImages(page);
    ok(broken.length === 0, 'no broken images on ' + url, broken.join(', '));
    ok(await page.$('#hdr #logo') !== null, 'header rendered on ' + url);
    ok(await page.$('#ftr .footbox') !== null, 'footer rendered on ' + url);
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.href));
    for (const h of hrefs) if (h.startsWith(BASE.slice(0, BASE.indexOf(PREFIX))) && !h.startsWith('javascript')) links.add(h.split('#')[0]);
    await page.close();
  }
});

// ---------------------------------------------------------------- links
await section('every internal link resolves', async () => {
  const req = context.request;
  let n = 0;
  for (const h of links) {
    if (!h.startsWith(BASE.replace(/\/MiniClipClassic\/$/, ''))) continue;
    const r = await req.get(h);
    ok(r.status() === 200, 'link ok: ' + h.replace(BASE, ''), String(r.status()));
    const m = h.match(/game\.html\?id=([^&]+)/);
    if (m) ok(games.some((g) => g.id === decodeURIComponent(m[1])), 'link points at a real game', m[1]);
    const c = h.match(/games\.html\?cat=([^&]+)/);
    if (c) ok(cats.some((x) => x.id === decodeURIComponent(c[1])), 'link points at a real category', c[1]);
    n++;
  }
  ok(n > 60, 'found plenty of links to check', String(n));
  console.log('  checked', n, 'links');
});

// ---------------------------------------------------------------- homepage features
await section('homepage widgets', async () => {
  const { page, problems } = await open('index.html');
  ok(await page.$$eval('#hotgrid .tb', (e) => e.length) === 6, 'six hot games');
  ok(await page.$$eval('#fthumbs .tb', (e) => e.length) === 3, 'three latest thumbnails');
  ok(await page.$$eval('#catboxes .catbox', (e) => e.length) === 6, 'six category boxes');
  ok(await page.$$eval('#tlist li', (e) => e.length) === 10, 'top ten has ten games');
  ok(await page.$$eval('#fullcols li a', (e) => e.length) === games.length, 'full list has every game');
  ok((await page.$$eval('#catlist li', (e) => e.length)) === cats.length, 'all categories listed');
  const first = await page.textContent('#ftitle');
  await page.click('#fpager .next');
  ok(await page.textContent('#ftitle') !== first, 'latest games pager changes page');
  await page.click('#fpager .nums a >> nth=0');
  await page.hover('#tlist li:nth-child(4) a');
  const prev = await page.textContent('#tprev .tt');
  ok(prev === (await page.textContent('#tlist li:nth-child(4) a')), 'top ten hover preview', prev);
  await page.click('#togglelists');
  ok(await page.$eval('#agcols', (e) => e.classList.contains('hidden')), 'hide full games list');
  await page.click('#togglelists');
  ok(!(await page.$eval('#agcols', (e) => e.classList.contains('hidden'))), 'show full games list again');
  await page.click('#morebtn');
  ok(await page.$eval('#more', (e) => e.classList.contains('open')), 'More menu opens');
  ok(await page.$$eval('#moremenu a', (e) => e.length) === cats.length + 1, 'More menu lists categories');
  await page.click('body', { position: { x: 5, y: 600 } });
  ok(!(await page.$eval('#more', (e) => e.classList.contains('open'))), 'More menu closes');
  ok(/\d\d\/\d\d\/\d{4}/.test(await page.textContent('#dailydate')), 'daily puzzle date shown');
  ok(problems.length === 0, 'no errors while using homepage', problems.join(' | '));
  await page.close();
});

// ---------------------------------------------------------------- search + quick find
await section('search and quick find', async () => {
  const { page } = await open('index.html');
  await page.fill('#q', 'brick');
  await Promise.all([page.waitForNavigation(), page.click('#searchform button')]);
  ok(page.url().includes('search.html?q=brick'), 'search submits to search page', page.url());
  await page.waitForSelector('.gcard');
  ok((await page.textContent('.gcard .gt')).includes('Brick Buster'), 'search finds Brick Buster');
  ok((await page.inputValue('#q')) === 'brick', 'search box keeps the query');
  for (const [q, expect] of [['sudoku', 'Sudoku Daily'], ['penguin', null], ['racing', 'Turbo Track'], ['MiniClip Classic', null], ['tank strategy', 'Tank Duel'], ['alien', 'Alien Assault']]) {
    await page.goto(BASE + 'search.html?q=' + encodeURIComponent(q), { waitUntil: 'networkidle' });
    const titles = await page.$$eval('.gcard .gt', (e) => e.map((x) => x.textContent));
    if (expect) ok(titles.includes(expect), `search "${q}" finds ${expect}`, titles.slice(0, 5).join(', '));
    else if (q === 'penguin') ok(titles.length === 0 && (await page.$('.nores')) !== null, 'no-result message for "penguin"');
    else ok(titles.length > 5, 'developer search finds games', String(titles.length));
  }
  await page.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
  const url0 = page.url();
  await page.fill('#q', '   ');
  await page.click('#searchform button');
  await page.waitForTimeout(300);
  ok(page.url() === url0, 'empty search does not navigate');
  ok(await page.$$eval('#quickfind option', (e) => e.length) === games.length + 1, 'quick find lists every game');
  await Promise.all([page.waitForNavigation(), page.selectOption('#quickfind', 'mini-putt')]);
  ok(page.url().includes('game.html?id=mini-putt'), 'quick find opens the game', page.url());
  await page.close();
});

// ---------------------------------------------------------------- categories, sorting, pagination
await section('categories, sorting and pagination', async () => {
  const { page } = await open('games.html?cat=puzzle');
  const expected = games.filter((g) => g.category === 'puzzle' || (g.tags || []).includes('puzzle')).length;
  ok(await page.$$eval('.gcard', (e) => e.length) === Math.min(20, expected), 'puzzle category shows puzzle games', String(expected));
  ok((await page.textContent('.bhead h1')).includes('(' + expected + ' games)'), 'category count in title');
  ok(await page.$eval('#navlinks a.on', (a) => a.textContent) === 'Puzzle Games', 'nav highlights the category');
  await page.goto(BASE + 'games.html?sort=az', { waitUntil: 'networkidle' });
  const t = await page.$$eval('.gcard .gt', (e) => e.map((x) => x.textContent));
  const sorted = [...t].sort((a, b) => a.toLowerCase().replace(/^(the|a) /, '').localeCompare(b.toLowerCase().replace(/^(the|a) /, '')));
  ok(JSON.stringify(t) === JSON.stringify(sorted), 'A-Z sort is alphabetical');
  ok(t.length === 20, '20 games per page', String(t.length));
  const pages = Math.ceil(games.length / 20);
  ok(await page.$$eval('.ipager .nums a, .ipager .nums b', (e) => e.length) === pages, 'pager shows every page', String(pages));
  await Promise.all([page.waitForNavigation(), page.click('.ipager .next')]);
  ok(page.url().includes('page=2'), 'next page link');
  const t2 = await page.$$eval('.gcard .gt', (e) => e.map((x) => x.textContent));
  ok(t2[0] !== t[0] && t2.length > 0, 'page 2 shows different games');
  await page.goto(BASE + 'games.html?cat=new', { waitUntil: 'networkidle' });
  const newest = [...games].sort((a, b) => b.added.localeCompare(a.added))[0];
  ok((await page.textContent('.gcard .gt')) === newest.title, 'Latest category starts with the newest game');
  await page.goto(BASE + 'games.html?cat=doesnotexist', { waitUntil: 'networkidle' });
  ok((await page.textContent('.nores')).includes('no category'), 'unknown category message');
  await page.goto(BASE + 'categories.html', { waitUntil: 'networkidle' });
  ok(await page.$$eval('.catbox', (e) => e.length) === cats.length, 'categories page lists all categories');
  await page.close();
});

// ---------------------------------------------------------------- favourites, recent, ratings
await section('favourites, recently played and ratings', async () => {
  const { page, problems } = await open('game.html?id=hoop-shot', { wait: 500 });
  ok((await page.textContent('#favbtn')).includes('Add to My Games'), 'favourite button default');
  await page.click('#favbtn');
  ok((await page.textContent('#favbtn')).includes('Remove from My Games'), 'favourite button toggles');
  ok((await page.textContent('#mygames')).includes('Hoop Shot'), 'right column My Games updates');
  ok((await page.textContent('#played')).includes('Hoop Shot'), 'recently played updates');
  await page.click('#rstars button[data-n="4"]');
  ok((await page.textContent('#ratingcell')).includes('your rating: 4'), 'rating saved');
  await page.reload({ waitUntil: 'networkidle' });
  ok((await page.textContent('#ratingcell')).includes('your rating: 4'), 'rating persists after reload');
  ok(await page.$$eval('#rstars button.on', (e) => e.length) === 4, 'four stars lit');
  ok((await page.textContent('#gstats')).includes('Played 2 times'), 'play counter', await page.textContent('#gstats'));
  await page.goto(BASE + 'mygames.html', { waitUntil: 'networkidle' });
  ok((await page.textContent('#favlist')).includes('Hoop Shot'), 'My Games page lists favourite');
  ok((await page.textContent('#reclist')).includes('Hoop Shot'), 'My Games page lists recently played');
  await page.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
  ok((await page.textContent('#mygames')).includes('Hoop Shot'), 'homepage My Games panel');
  ok((await page.textContent('#played')).includes('Hoop Shot'), 'homepage Latest Games Played panel');
  await page.goto(BASE + 'games.html?cat=sports', { waitUntil: 'networkidle' });
  await page.click('.gcard [data-fav="mini-putt"]');
  await page.goto(BASE + 'mygames.html', { waitUntil: 'networkidle' });
  ok((await page.textContent('#favlist')).includes('Mini Putt'), '+ My Games link on cards');
  await page.click('#favlist [data-fav="mini-putt"]');
  await page.waitForTimeout(400);
  ok(!(await page.textContent('#favlist')).includes('Mini Putt'), 'removing from My Games');
  await page.goto(BASE + 'players.html', { waitUntil: 'networkidle' });
  await page.fill('#nick', 'Tester');
  await page.click('#savenick');
  ok((await page.textContent('.bhead h1')).includes("Tester's Profile"), 'player name saved');
  const totalPlays = parseInt(await page.textContent('.stats div b'), 10);
  ok(totalPlays >= 2, 'player stats count plays', String(totalPlays));
  ok(problems.length === 0, 'no errors while using favourites/ratings', problems.join(' | '));
  await page.close();
});

// ---------------------------------------------------------------- every game loads
await section('every game page loads its game', async () => {
  for (const g of games) {
    if (QUICK && !['brick-buster', 'flash-bounce', 'sketch-pad'].includes(g.id)) continue;
    const { page, problems } = await open('game.html?id=' + g.id);
    try {
      await page.waitForSelector('#loader', { state: 'detached', timeout: g.type === 'flash' ? 30000 : 10000 });
      ok(true, 'loader finished for ' + g.id);
    } catch (e) { ok(false, 'loader finished for ' + g.id); }
    if (g.type === 'html5') {
      const frame = page.frames().find((f) => f.url().includes(g.file));
      ok(!!frame, g.id + ' iframe present');
      if (frame) {
        const hasCanvas = await frame.waitForSelector('canvas', { timeout: 5000 }).then(() => true).catch(() => false);
        ok(hasCanvas, g.id + ' draws on a canvas');
        await page.waitForTimeout(300);
        const box = await page.$('#player iframe');
        const b = await box.boundingBox();
        await page.mouse.click(b.x + b.width / 2, b.y + b.height * 0.72);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(250);
        const state = await frame.evaluate(() => window.MCC && window.MCC.current && window.MCC.current.state);
        ok(state === 'play' || state === 'title', g.id + ' game responds', String(state));
      }
    } else if (g.type === 'flash') {
      ok(await page.$('#player ruffle-player, #player ruffle-object') !== null, 'Ruffle player created');
      ok(await page.$('.loader.err') === null, 'Ruffle loaded without error');
    }
    ok(problems.filter((p) => !/GPU stall|AudioContext|WebGL|GL Driver/.test(p)).length === 0, 'no errors for game ' + g.id, problems.join(' | '));
    await page.close();
  }
});

// ---------------------------------------------------------------- fullscreen + restart
await section('fullscreen and restart', async () => {
  const { page } = await open('game.html?id=serpent-sprint', { wait: 800 });
  await page.click('#fsbtn');
  await page.waitForTimeout(500);
  const fs1 = await page.evaluate(() => (document.fullscreenElement && document.fullscreenElement.id) || (document.querySelector('#player.fs-fallback') ? 'fallback' : ''));
  ok(fs1 === 'player' || fs1 === 'fallback', 'full screen mode', fs1);
  const size = await page.evaluate(() => { const r = document.getElementById('player').getBoundingClientRect(); return [r.width, r.height, innerWidth, innerHeight]; });
  ok(size[0] >= size[2] - 2 && size[1] >= size[3] - 2, 'player fills the screen', size.join('x'));
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.fullscreenElement && document.exitFullscreen());
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => !document.fullscreenElement && !document.querySelector('#player.fs-fallback'));
  ok(after, 'leaves full screen');
  const src0 = await page.$eval('#player iframe', (f) => f.src);
  await page.click('#rsbtn');
  await page.waitForTimeout(500);
  ok((await page.$eval('#player iframe', (f) => f.src)) === src0, 'restart reloads the game');
  await page.close();
});

// ---------------------------------------------------------------- missing files + 404
await section('missing game files and 404 page', async () => {
  const page = await context.newPage();
  await page.route('**/games/mole-mayhem/index.html', (r) => r.fulfill({ status: 404, body: 'missing' }));
  await page.goto(BASE + 'game.html?id=mole-mayhem', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  ok(await page.$('.loader.err') !== null, 'friendly error when a game file is missing');
  await page.close();
  const { page: p2 } = await open('some/deep/missing-page.html', { wait: 800 });
  ok((await p2.textContent('.notfound')).includes('404'), '404 page shown for missing path');
  const bg = await p2.evaluate(() => getComputedStyle(document.getElementById('page')).backgroundColor);
  ok(bg === 'rgb(255, 255, 255)', '404 page is styled from a nested path', bg);
  ok(await p2.$('#hdr #logo img') !== null, '404 page has the site header');
  const home = await p2.$eval('.notfound a.btn', (a) => a.href);
  ok(home === BASE + 'index.html', '404 page links back to the site root', home);
  await p2.close();
});

// ---------------------------------------------------------------- layout checks
await section('desktop layout matches the reference grid', async () => {
  const { page } = await open('index.html');
  const r = await page.evaluate(() => {
    const p = document.getElementById('page').getBoundingClientRect();
    const box = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return [Math.round(b.left - p.left), Math.round(b.top - p.top), Math.round(b.width), Math.round(b.height)]; };
    return { page: [p.width], lcol: box('#lcol'), rcol: box('#rcol'), latest: box('.bpanel.latest'), hot: box('.bpanel.hot'), nav: box('#nav'), thumb: box('#hotgrid .tb img'), ad: box('.adslot'), cat: box('.catbox') };
  });
  ok(r.page[0] === 970, 'page is 970px wide', String(r.page[0]));
  ok(JSON.stringify(r.lcol.slice(0, 3)) === '[5,124,630]', 'left column position', JSON.stringify(r.lcol));
  ok(r.rcol[0] === 641 && r.rcol[2] === 324, 'right column position', JSON.stringify(r.rcol));
  ok(JSON.stringify(r.latest) === '[10,129,411,335]', 'Latest Games panel box', JSON.stringify(r.latest));
  ok(JSON.stringify(r.hot) === '[424,129,203,335]', 'Hot Games panel box', JSON.stringify(r.hot));
  ok(JSON.stringify(r.nav) === '[5,63,960,51]', 'nav bar box', JSON.stringify(r.nav));
  ok(r.thumb[2] === 70 && r.thumb[3] === 59, 'thumbnails are 70x59', JSON.stringify(r.thumb));
  ok(r.ad[2] === 304 && r.ad[3] === 254, 'advert slot 300x250 + border', JSON.stringify(r.ad));
  ok(r.cat[2] === 203 && r.cat[3] === 221, 'category box 203x221', JSON.stringify(r.cat));
  await page.close();
});

await section('mobile layout has no sideways scrolling', async () => {
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US', isMobile: true, hasTouch: true });
  for (const url of ['index.html', 'games.html?cat=action', 'game.html?id=jewel-swap', 'search.html?q=ball', 'players.html', 'info.html']) {
    const page = await mctx.newPage();
    const problems = track(page);
    await page.goto(BASE + url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    ok(w[0] <= w[1] + 1, 'no horizontal scroll on phone: ' + url, w.join(' > '));
    ok(problems.length === 0, 'no errors on phone: ' + url, problems.join(' | '));
    await page.close();
  }
  await mctx.close();
});

await section('RSS feed and GitHub Pages files', async () => {
  const r = await context.request.get(BASE + 'feed.xml');
  ok(r.status() === 200 && (await r.text()).includes('<rss'), 'feed.xml is served');
  ok(fs.existsSync(path.join(ROOT, '.nojekyll')), '.nojekyll exists (keeps games/_shared)');
  ok(fs.existsSync(path.join(ROOT, '.github/workflows/pages.yml')), 'Pages workflow exists');
  // nothing should reference the site root absolutely - it breaks /repo-name/ hosting
  const bad = [];
  const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (['node_modules', 'tools', '.git', 'vendor'].includes(f)) continue; if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(html|js|css|json)$/.test(f)) { const s = fs.readFileSync(p, 'utf8'); if (/(src|href)=["']\/(?!\/)/.test(s) || /url\(\s*['"]?\/(?!\/)/.test(s) || /fetch\(['"]\//.test(s)) bad.push(path.relative(ROOT, p)); } } };
  walk(ROOT);
  ok(bad.length === 0, 'no root-absolute paths in the site', bad.join(', '));
});

await browser.close();
server.close();
console.log(`\n${passed} checks passed, ${failures.length} failed`);
if (failures.length) { console.log(failures.map((f) => ' - ' + f).join('\n')); process.exit(1); }
