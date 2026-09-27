// End-to-end tests for the whole site, run in headless Chromium.
//
// The site is served from a sub folder (/MiniClipClassic/) exactly like a
// GitHub Pages project site, with 404.html returned for missing files.
// Installed games are tested by temporarily serving a modified games.json
// that points catalogue records at the original test games in games/_extras/.
// Games streamed from Miniclip's official archive (classic.miniclip.com) are
// answered with the local test .swf, so no network is needed; with --live the
// real files are fetched (through curl, which uses this machine's proxy
// settings) and every official stream is checked in Ruffle.
//
// usage: node tools/test/run-tests.mjs [--quick] [--live]
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PREFIX = '/MiniClipClassic/';
const QUICK = process.argv.includes('--quick');
const LIVE = process.argv.includes('--live');
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
const IGNORE = /GPU stall|AudioContext|WebGL|GL Driver|swiftshader/i;

// every page gets error tracking
function track(page) {
  const problems = [];
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error' && m.type() !== 'warning') return;
    const t = m.text();
    if (IGNORE.test(t)) return;
    if (/status of 404/.test(t) && (page.url().includes('missing-page') || t.includes('this-file-does-not-exist'))) return;
    problems.push('console ' + m.type() + ': ' + t);
  });
  page.on('response', (r) => {
    const u = r.url();
    if (r.status() >= 400 && !u.includes('missing-page') && !u.includes('this-file-does-not-exist')) problems.push(r.status() + ' ' + u);
  });
  page.on('requestfailed', (r) => {
    const err = r.failure() && r.failure().errorText;
    if (err === 'net::ERR_ABORTED') return; // navigating away / replacing an iframe
    problems.push('requestfailed ' + err + ' ' + r.url());
  });
  return problems;
}
async function open(url, opts = {}) {
  const page = await (opts.ctx || context).newPage();
  const problems = track(page);
  if (opts.catalog) await page.route('**/data/games.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(opts.catalog) }));
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  if (opts.wait) await page.waitForTimeout(opts.wait);
  return { page, problems };
}
async function brokenImages(page) {
  return page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map((i) => i.getAttribute('src').slice(0, 80)));
}

const games = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8'));
const cats = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/categories.json'), 'utf8'));
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/site.json'), 'utf8'));
const extras = JSON.parse(fs.readFileSync(path.join(ROOT, 'games/_extras/extras.json'), 'utf8'));
const byId = new Map(games.map((g) => [g.id, g]));
const catOf = (name) => cats.find((c) => c.id === String(name).toLowerCase() || c.name.toLowerCase() === String(name).toLowerCase());
const inCat = (id) => games.filter((g) => [g.category, ...g.secondaryCategories].some((n) => catOf(n) && catOf(n).id === id));
const nonEmptyCats = cats.filter((c) => c.virtual || inCat(c.id).length);
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const sortKey = (t) => String(t).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/['’!.:,?"]/g, '').replace(/[-/]/g, ' ').replace(/\s+/g, ' ').trim();
const naturallySorted = (list) => list.every((t, i) => i === 0 || collator.compare(sortKey(list[i - 1]), sortKey(t)) <= 0);

const html5Test = extras.find((x) => x.id === 'brick-buster');
const swfTest = extras.find((x) => x.type === 'flash');
const OFFICIAL = 'https://classic.miniclip.com/';
const streamed = games.filter((g) => g.installed && g.gameFile.startsWith('https://'));
const officialRequests = [];
async function officialHost(ctx) {
  await ctx.route(OFFICIAL + '**', async (route) => {
    const url = route.request().url();
    officialRequests.push(url);
    const headers = { 'access-control-allow-origin': '*' };
    if (!LIVE) return route.fulfill({ status: 200, headers: { ...headers, 'content-type': 'application/x-shockwave-flash' }, body: fs.readFileSync(path.join(ROOT, swfTest.gameFile)) });
    const tmp = path.join(os.tmpdir(), `mcc-live-${process.pid}-${officialRequests.length}`);
    try {
      const [code, type] = execFileSync('curl', ['-sS', '-L', '--max-time', '90', '-o', tmp, '-w', '%{http_code}\n%{content_type}', url], { encoding: 'utf8' }).split('\n');
      await route.fulfill({ status: +code, headers: { ...headers, 'content-type': type || 'application/octet-stream' }, body: fs.readFileSync(tmp) });
    } catch (e) { await route.abort(); } finally { fs.rmSync(tmp, { force: true }); }
  });
}
await officialHost(context);

// a copy of the catalogue with some records switched on, pointing at the test games
function catalogWith(changes) {
  return games.map((g) => (changes[g.id] ? { ...g, ...changes[g.id] } : g));
}

// ---------------------------------------------------------------- catalogue
await section('catalogue validator', async () => {
  let out = '';
  let code = 0;
  try { out = execFileSync('node', [path.join(ROOT, 'tools/catalog/validate.mjs')], { encoding: 'utf8' }); } catch (e) { code = e.status; out = e.stdout; }
  ok(code === 0, 'tools/catalog/validate.mjs passes', out.split('\n').filter((l) => /ERROR/.test(l)).slice(0, 3).join(' | '));
  ok(/0 errors, 0 warnings/.test(out), 'validator reports no errors or warnings', out.trim().split('\n').pop());
});

await section('catalogue contents', async () => {
  ok(games.length >= 700, 'hundreds of games in the catalogue', String(games.length));
  // every title from the master list is present (as a title or an alias)
  const master = fs.readFileSync(path.join(ROOT, 'tools/catalog/master-list.txt'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split(' | ')[0].trim());
  const names = new Set(games.flatMap((g) => [g.title, ...g.aliases]));
  const missing = master.filter((t) => !names.has(t));
  ok(missing.length === 0, 'every master list title is in games.json', missing.slice(0, 5).join(', '));
  // the invented placeholder games are gone from the catalogue
  const invented = extras.map((x) => x.id).filter((id) => byId.has(id) && byId.get(id).installed);
  ok(invented.length === 0, 'no invented test games in the catalogue', invented.join(', '));
  for (const t of ['Heli Attack 3', 'Commando', 'Bloxorz', 'MotherLoad', 'Club Penguin', 'RuneScape', 'Fancy Pants Adventure 2', 'Dirk Valentine and the Fortress of Steam', 'Zubo Zurfing', '3 Foot Ninja']) ok(games.some((g) => g.title === t), 'catalogue has ' + t);
  ok(games.every((g) => !g.installed || (g.gameFile.startsWith(OFFICIAL) ? g.type === 'flash' : fs.existsSync(path.join(ROOT, g.gameFile)))), 'installed games have a local file or an official stream');
  ok(streamed.length === 16 && streamed.every((g) => g.gameFile.startsWith(OFFICIAL) && g.width && g.height), 'the 16 games of Miniclip\'s own archive are streamed', String(streamed.length));
  ok(games.every((g) => g.sources.length > 0), 'every game is backed by a source');
  ok(games.every((g) => g.verificationStatus !== 'verified' || g.sources.some((x) => x.type === 'official' || x.type === 'screenshot')), 'verified means direct evidence');
  const t = (x) => byId.get(x);
  ok(t('3-foot-ninja') && t('3-foot-ninja-ii') && t('3-foot-ninja').series === '3 Foot Ninja' && t('3-foot-ninja-ii').seriesOrder === 2, 'sequels are separate records in one series');
  ok(t('commando-2').aliases.includes('Commando II') || t('commando-2').title === 'Commando 2', 'Commando 2 keeps its spellings');
  for (const x of ['Battle Pong', 'Mancala Bugs', 'Zen Puzzle Garden', 'Skidoo TT', 'Mad Skills Motocross', 'Raft Wars 2', 'Trick or Treat Smash', '8 Ball Pool Multiplayer']) ok(games.some((g) => g.title === x), 'audit added ' + x);
  ok(byId.get('8-ball-pool').year === 2008 && byId.get('8-ball-pool-multiplayer').year === 2010, '8 Ball Pool (2008) and 8 Ball Pool Multiplayer (2010) are separate');
  ok(games.every((g) => g.year === null || (g.year >= 2001 && g.year <= 2012)), 'years are unknown or 2001-2012');
  const hc = games.filter((g) => g.nostalgiaPriority === 3);
  ok(hc.length >= 40 && hc.length <= 80, 'a sensible number of iconic classics', String(hc.length));
  ok(naturallySorted(games.map((g) => g.title)), 'games.json is in natural A-Z order');
  for (const k of ['homeFeatured', 'homeLatestThumbs', 'hotGames', 'topTen', 'topGames']) ok((site[k] || []).every((id) => byId.has(id)), `site.json ${k} ids exist`);
});

await section('historical audit', async () => {
  let out = '';
  let code = 0;
  try { out = execFileSync('node', [path.join(ROOT, 'tools/catalog/audit-games.mjs'), '--no-write'], { encoding: 'utf8' }); } catch (e) { code = e.status; out = e.stdout; }
  ok(code === 0 && /no problems/.test(out), 'tools/catalog/audit-games.mjs finds no duplicates or collisions', out.split('\n').filter((l) => /PROBLEM/.test(l)).join(' | '));
  const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/audit-report.json'), 'utf8'));
  ok(report.summary.totalGames === games.length, 'data/audit-report.json matches games.json', String(report.summary.totalGames));
  ok(report.checks.duplicateIds.length === 0 && report.checks.aliasCollisions.length === 0 && report.checks.sequelCollisions.length === 0, 'audit report: no duplicate ids, alias or sequel collisions');
});

// ---------------------------------------------------------------- every page renders cleanly
const PAGES = ['index.html', 'games.html', 'games.html?cat=action', 'games.html?cat=hot', 'games.html?cat=new', 'games.html?cat=top', 'games.html?cat=other',
  'games.html?cat=promotional', 'games.html?sort=az&page=3', 'allgames.html', 'allgames.html?letter=C', 'allgames.html?letter=0', 'allgames.html?cat=winter&show=challenge',
  'search.html?q=commando', 'search.html?q=zzzzqqq', 'search.html', 'mygames.html', 'players.html', 'sketch.html', 'playertest.html', 'categories.html', 'info.html', '404.html',
  'game.html?id=heli-attack-3', 'game.html?id=heli-attack-2', 'game.html?game=bloxorz', 'game.html?id=club-penguin', 'game.html?id=nope',
  'allgames.html?kind=seasonal', 'allgames.html?era=2007-2009&show=playable'];
const links = new Set();
await section('pages load without errors or broken images', async () => {
  for (const url of PAGES) {
    const { page, problems } = await open(url, { wait: url.startsWith('playertest') || url.startsWith('sketch') ? 1500 : 300 });
    ok(problems.length === 0, 'no errors on ' + url, problems.join(' | '));
    const broken = await brokenImages(page);
    ok(broken.length === 0, 'no broken images on ' + url, broken.join(', '));
    ok(await page.$('#hdr #logo') !== null, 'header rendered on ' + url);
    ok(await page.$('#ftr .footbox') !== null, 'footer rendered on ' + url);
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.href));
    for (const h of hrefs) if (h.startsWith(BASE) && !h.startsWith('javascript')) links.add(h.split('#')[0]);
    await page.close();
  }
});

await section('every internal link resolves', async () => {
  const req = context.request;
  let n = 0;
  for (const h of links) {
    const r = await req.get(h);
    ok(r.status() === 200, 'link ok: ' + h.replace(BASE, ''), String(r.status()));
    const m = h.match(/game\.html\?id=([^&]+)/);
    if (m) ok(byId.has(decodeURIComponent(m[1])), 'link points at a real game', m[1]);
    const c = h.match(/games\.html\?cat=([^&]+)/);
    if (c) ok(cats.some((x) => x.id === decodeURIComponent(c[1])), 'link points at a real category', c[1]);
    n++;
  }
  ok(n > games.length, 'found links to the whole catalogue', String(n));
  console.log('  checked', n, 'links');
});

await section('every game has a working page', async () => {
  const page = await context.newPage();
  const problems = track(page);
  const list = QUICK ? games.filter((_, i) => i % 25 === 0) : games;
  let bad = 0;
  for (const g of list) {
    await page.goto(BASE + 'game.html?id=' + g.id, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.gamewrap h1', { timeout: 8000 });
    const h1 = await page.textContent('.gamewrap h1');
    const notice = await page.$(g.installed ? '#player' : '.unavail .uhead');
    if (h1 !== g.title || !notice) { bad++; ok(false, 'game page for ' + g.id, h1); }
  }
  ok(bad === 0, `${list.length} game pages show the title and the player or the unavailable notice`);
  ok(problems.length === 0, 'no errors on game pages', problems.slice(0, 3).join(' | '));
  await page.close();
});

// ---------------------------------------------------------------- homepage
await section('homepage widgets', async () => {
  const { page, problems } = await open('index.html');
  const hot = await page.$$eval('#hotgrid .tb a', (e) => e.map((a) => a.textContent.trim()));
  ok(JSON.stringify(hot) === JSON.stringify(site.hotGames.map((id) => byId.get(id).title)), 'Hot Games line-up from site.json', hot.join(', '));
  const lt = await page.$$eval('#fthumbs .tb a', (e) => e.map((a) => a.textContent.trim()));
  ok(JSON.stringify(lt) === JSON.stringify(site.homeLatestThumbs.map((id) => byId.get(id).title)), 'Latest Games thumbnails as in the screenshots', lt.join(', '));
  ok((await page.textContent('#ftitle')) === byId.get(site.homeFeatured[0]).title, 'Latest Games starts with ' + site.homeFeatured[0]);
  const boxes = await page.$$eval('#catboxes .catbox', (e) => e.map((b) => [b.querySelector('.chead').textContent, b.querySelector('.ct a').textContent.trim(), b.querySelector('.cmore').textContent]));
  ok(boxes.length === 6, 'six category boxes');
  ok(boxes[0][0] === 'Action Games' && boxes[0][1] === 'Monster Trucks Nitro', 'Action box as in the screenshots', boxes[0].join(' / '));
  ok(boxes[4][0] === "Shoot 'Em Up Games", "Shoot 'Em Up box title", boxes[4][0]);
  ok(boxes.every((b) => /View all \d+ games/.test(b[2])), 'category boxes show game counts');
  const top = await page.$$eval('#tlist li a', (e) => e.map((a) => a.textContent));
  ok(JSON.stringify(top) === JSON.stringify(site.topTen.map((id) => byId.get(id).title)), 'Top Ten as in the screenshots', top.join(', '));
  ok(await page.$$eval('#fullcols li a', (e) => e.length) === games.length, 'Full Games List has every game');
  ok(await page.$$eval('#fullcols li a.c', (e) => e.length) === games.filter((g) => g.challenge).length, 'orange links = high score challenge games');
  const letters = await page.$$eval('#fullcols li.l', (e) => e.map((x) => x.textContent));
  ok(letters.length === 27 && letters[0] === '#' && letters[26] === 'Z', 'Full Games List has # and A-Z headings', letters.join(''));
  ok(naturallySorted(await page.$$eval('#fullcols li a', (e) => e.map((a) => a.textContent))), 'Full Games List is in natural order');
  ok((await page.$$eval('#catlist li', (e) => e.length)) === nonEmptyCats.length, 'all non-empty categories listed');
  ok((await page.textContent('#azlink')).includes(String(games.length)), 'A-Z directory link shows the total');
  const first = await page.textContent('#ftitle');
  await page.click('#fpager .next');
  ok(await page.textContent('#ftitle') !== first, 'latest games pager changes page');
  await page.hover('#tlist li:nth-child(4) a');
  ok((await page.textContent('#tprev .tt')) === top[3], 'top ten hover preview');
  await page.click('#togglelists');
  ok(await page.$eval('#agcols', (e) => e.classList.contains('hidden')), 'hide full games list');
  await page.click('#togglelists');
  await page.click('#morebtn');
  ok(await page.$eval('#more', (e) => e.classList.contains('open')), 'More menu opens');
  ok(await page.$('#moremenu a[href="allgames.html"]') !== null, 'More menu links to the A-Z directory');
  await page.click('body', { position: { x: 5, y: 600 } });
  ok(!(await page.$eval('#more', (e) => e.classList.contains('open'))), 'More menu closes');
  ok(/\d\d\/\d\d\/\d{4}/.test(await page.textContent('#dailydate')), 'daily puzzle date shown');
  ok((await page.$eval('.daily-l', (a) => a.getAttribute('href'))) === 'game.html?id=sudoku', 'daily Sudoku links to the catalogue');
  // generated thumbnails: real image data at the exact artwork size, no network requests
  const th = await page.$$eval('#hotgrid img, #catboxes img', (e) => e.map((i) => [i.src.slice(0, 22), i.naturalWidth, i.naturalHeight, i.width, i.height]));
  ok(th.every(([s, w, h, dw, dh]) => s === 'data:image/png;base64,' && w === 136 && h === 114 && dw === 68 && dh === 57), 'placeholder thumbnails are 136x114 shown at 68x57', JSON.stringify(th[0]));
  const big = await page.$eval('#fimg img', (i) => [i.naturalWidth, i.naturalHeight, i.width, i.height]);
  ok(JSON.stringify(big) === '[548,398,274,199]', 'feature placeholder is 548x398 shown at 274x199', JSON.stringify(big));
  ok(problems.length === 0, 'no errors while using homepage', problems.join(' | '));
  await page.close();
});

await section('homepage stays light with the big catalogue', async () => {
  const page = await context.newPage();
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  const t0 = Date.now();
  await page.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
  const ms = Date.now() - t0;
  const images = requests.filter((u) => /\.(png|jpe?g|gif|webp)$/.test(u.split('?')[0]));
  ok(images.length < 40, 'homepage loads only layout images, not one per game', String(images.length));
  ok(requests.filter((u) => u.includes('games.json')).length === 1, 'games.json is loaded once');
  ok(ms < 8000, 'homepage loads quickly', ms + 'ms');
  console.log(`  homepage: ${requests.length} requests, ${images.length} images, ${ms}ms`);
  await page.close();
});

// ---------------------------------------------------------------- search
await section('search', async () => {
  const { page } = await open('index.html');
  await page.fill('#q', 'commando');
  await Promise.all([page.waitForNavigation(), page.click('#searchform button')]);
  ok(page.url().includes('search.html?q=commando'), 'search submits to search page');
  await page.waitForSelector('.gcard');
  const titles = async () => page.$$eval('.gcard .gt', (e) => e.map((x) => x.textContent));
  ok(JSON.stringify((await titles()).slice(0, 3)) === '["Commando","Commando 2","Commando 3"]', 'commando -> Commando, Commando 2, Commando 3', (await titles()).join(', '));
  ok((await page.inputValue('#q')) === 'commando', 'search box keeps the query');
  const expect = {
    pool: ['8 Ball Pool', '9 Ball Pool', 'Deluxe Pool', 'Quick Fire Pool', 'Disc Pool'],
    ninja: ['3 Foot Ninja', '3 Foot Ninja II', 'Final Ninja', 'Final Ninja Zero'],
    heli: ['Heli Attack 2', 'Heli Attack 3'],
    run: ['On The Run', 'On The Run 2', 'Run N Gun'],
    'HELI-ATTACK': ['Heli Attack 2', 'Heli Attack 3'],
    'bloomin gardens': ["Bloomin' Gardens"],
    'shootout': ['Bush Shoot-Out'],
    '3 foot ninja 2': ['3 Foot Ninja II'],
    'fancy pants 2': ['Fancy Pants Adventure 2'],
    'apache overkill': ['Overkill Apache'],
    'the pharaohs tomb': ["Pharaoh's Tomb"],
    'motox urban fever': ['Motocross Urban'],
    'bears and bees': ['Bears & Bees'],
    'mother load': ['MotherLoad'],
    'rift': ['R.I.F.T.'],
    'commando ii': ['Commando 2'],
    snow: ['Snow Drift', 'Snow Line', 'Snowman Stacker'],
    santa: ['Santa Ski Jump', "Santa's Factory", 'Santa Balls 2'],
    racing: ['Turbo Racing', 'Turbo Racing 2', 'Miniclip Rally'],
    football: ['American Football', 'Keepy Ups', 'World Cup Goal'],
    2008: ['8 Ball Pool', 'Canyon Defense', 'Snow Line'],
    'bush shootout': ['Bush Shoot-Out'],
    'squarecircleco': ['Heli Attack 2', 'Heli Attack 3'],
    'political parody': ['Dancing Bush', 'Hip-Hop Debate'],
  };
  for (const [q, want] of Object.entries(expect)) {
    await page.goto(BASE + 'search.html?q=' + encodeURIComponent(q), { waitUntil: 'networkidle' });
    const got = [];
    for (;;) { // every result page
      got.push(...await titles());
      const next = await page.$('.ipager a.next');
      if (!next || got.length > 200) break;
      await Promise.all([page.waitForNavigation(), next.click()]);
    }
    ok(want.every((t) => got.includes(t)), `search "${q}" finds ${want.join(', ')}`, got.slice(0, 8).join(', '));
  }
  await page.goto(BASE + 'search.html?q=' + encodeURIComponent('commando ii'), { waitUntil: 'networkidle' });
  ok((await titles())[0] === 'Commando 2', '"commando ii" puts Commando 2 first', (await titles()).slice(0, 3).join(', '));
  await page.goto(BASE + 'search.html?q=zzzzqqq', { waitUntil: 'networkidle' });
  ok((await page.$('.nores')) !== null, 'no-result message');
  await page.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
  const url0 = page.url();
  await page.fill('#q', '   ');
  await page.click('#searchform button');
  await page.waitForTimeout(300);
  ok(page.url() === url0, 'empty search does not navigate');
  ok(await page.$$eval('#quickfind option', (e) => e.length) === games.length + 1, 'quick find lists every game');
  await Promise.all([page.waitForNavigation(), page.selectOption('#quickfind', 'motherload')]);
  ok(page.url().includes('game.html?id=motherload'), 'quick find opens the game', page.url());
  await page.close();
});

// ---------------------------------------------------------------- A-Z directory
await section('A-Z directory', async () => {
  const { page, problems } = await open('allgames.html');
  ok((await page.textContent('.azpanel .bhead .right')).trim() === `TOTAL GAMES: ${games.length}`, 'total games calculated from games.json');
  const stats = (await page.textContent('.azstats')).replace(/\s+/g, ' ');
  const nv = games.filter((g) => g.verificationStatus === 'verified').length;
  const np = games.filter((g) => g.installed).length;
  ok(stats.includes(`TOTAL GAMES: ${games.length}`) && stats.includes(`VERIFIED: ${nv}`) && stats.includes(`PLAYABLE: ${np}`) && stats.includes(`ARCHIVED CATALOG ONLY: ${games.length - np}`), 'A-Z counters calculated from games.json', stats);
  ok(await page.$$eval('#azlist li a', (e) => e.length) === games.length, 'all games listed');
  ok(await page.$$eval('#azbar a, #azbar span', (e) => e.length) === 28, '# A-Z letter bar plus All');
  await page.click('#azbar a[data-l="C"]');
  const cgames = games.filter((g) => /^c/i.test(sortKey(g.title)));
  const shown = await page.$$eval('#azlist li > a', (e) => e.map((a) => a.textContent));
  ok(shown.length === cgames.length && shown.every((t) => /^c/i.test(t)), 'letter C shows the C games', String(shown.length));
  ok(page.url().includes('letter=C'), 'letter kept in the address');
  const cmd = shown.filter((t) => t.startsWith('Commando'));
  ok(JSON.stringify(cmd) === '["Commando","Commando 2","Commando 2 Trailer","Commando 3","Commando Assault"]', 'natural sort inside a letter', cmd.join(', '));
  await page.selectOption('#azcat', 'shooting');
  const sh = await page.$$eval('#azlist li > a', (e) => e.map((a) => a.textContent));
  ok(sh.length > 0 && sh.every((t) => /^c/i.test(t)) && sh.includes('Canyon Shooter'), 'category filter narrows the letter', sh.join(', '));
  await page.click('#azbar a[data-l=""]');
  await page.click('#azquick a:text-is("Playable")');
  const pl = await page.$$eval('#azlist li > a', (e) => e.map((a) => a.textContent));
  ok(pl.length === np && pl.includes('Commando 2'), 'Playable filter shows the playable games', String(pl.length));
  ok(!page.url().includes('cat=shooting') && page.url().includes('show=playable'), 'quick filters replace each other');
  await page.click('#azquick a:text-is("Unavailable")');
  ok(await page.$$eval('#azlist li > a', (e) => e.length) === games.length - np, 'Unavailable filter');
  await page.click('#azquick a:text-is("Seasonal")');
  const sea = await page.$$eval('#azlist li > a', (e) => e.map((a) => a.textContent));
  ok(sea.length === games.filter((g) => g.historicalType === 'seasonal').length && sea.includes('Santa Ski Jump'), 'Seasonal filter', String(sea.length));
  await page.click('#azquick a:text-is("Promotional")');
  ok(await page.$$eval('#azlist li > a', (e) => e.length) === games.filter((g) => [g.category, ...g.secondaryCategories].includes('Promotional') || ['promotional', 'sponsored', 'licensed'].includes(g.historicalType)).length, 'Promotional filter');
  await page.click('#azquick a:text-is("Multiplayer")');
  ok((await page.$$eval('#azlist li > a', (e) => e.map((a) => a.textContent))).includes('Club Penguin'), 'Multiplayer filter');
  await page.click('#azquick a:text-is("All")');
  await page.click('#azera a[data-era="2007-2009"]');
  const era = await page.$$eval('#azlist li > a', (e) => e.length);
  ok(era === games.filter((g) => g.year >= 2007 && g.year <= 2009).length && page.url().includes('era=2007-2009'), 'era filter 2007-2009', String(era));
  await page.click('#azera a[data-era=""]');
  await page.goto(BASE + 'allgames.html?letter=0', { waitUntil: 'networkidle' });
  ok(JSON.stringify(await page.$$eval('#azlist li > a', (e) => e.map((a) => a.textContent))) === JSON.stringify(games.filter((g) => /^\d/.test(g.title)).map((g) => g.title)), '# shows the number games');
  ok(problems.length === 0, 'no errors on the A-Z page', problems.join(' | '));
  await page.close();
});

// ---------------------------------------------------------------- categories, sorting and pagination
await section('categories, sorting and pagination', async () => {
  const { page } = await open('games.html?cat=puzzle');
  const expected = inCat('puzzle').length;
  ok(await page.$$eval('.gcard', (e) => e.length) === Math.min(20, expected), 'puzzle category shows puzzle games', String(expected));
  ok((await page.textContent('.bhead h1')).includes('(' + expected + ' games)'), 'category count in title');
  ok(await page.$eval('#navlinks a.on', (a) => a.textContent) === 'Puzzle Games', 'nav highlights the category');
  await page.goto(BASE + 'games.html?sort=az', { waitUntil: 'networkidle' });
  const t = await page.$$eval('.gcard .gt', (e) => e.map((x) => x.textContent));
  ok(naturallySorted(t) && t[0] === games[0].title, 'A-Z sort is natural', t.slice(0, 4).join(', '));
  ok(t.length === 20, '20 games per page', String(t.length));
  await Promise.all([page.waitForNavigation(), page.click('.ipager .next')]);
  ok(page.url().includes('page=2'), 'next page link');
  ok((await page.$$eval('.gcard .gt', (e) => e.map((x) => x.textContent)))[0] === games[20].title, 'page 2 continues the list');
  await page.goto(BASE + 'games.html?cat=new', { waitUntil: 'networkidle' });
  const fresh = await page.$$eval('.gcard .gt', (e) => e.map((x) => x.textContent));
  ok(fresh.length === games.filter((g) => g.new).length && fresh.every((x) => games.find((g) => g.title === x).new), 'Latest category lists the new games');
  // earlier sections played some games, which moves them up - start from a clean history
  await page.evaluate(() => localStorage.removeItem('mcc.plays'));
  await page.goto(BASE + 'games.html?cat=top', { waitUntil: 'networkidle' });
  ok((await page.textContent('.gcard .gt')) === byId.get(site.topGames[0]).title, 'Top 100 starts with the number one game', await page.textContent('.gcard .gt'));
  await page.goto(BASE + 'games.html?cat=promotional', { waitUntil: 'networkidle' });
  ok((await page.textContent('.bhead h1')).includes('(' + inCat('promotional').length + ' games)'), 'promotional games have their own category');
  await page.goto(BASE + 'games.html?cat=doesnotexist', { waitUntil: 'networkidle' });
  ok((await page.textContent('.nores')).includes('no category'), 'unknown category message');
  await page.goto(BASE + 'categories.html', { waitUntil: 'networkidle' });
  ok(await page.$$eval('.catbox', (e) => e.length) === nonEmptyCats.length, 'categories page lists every non-empty category');
  ok(await page.$$eval('.catbox .cmore', (e) => e.every((a) => !/View all 0 games/.test(a.textContent))), 'no empty category pages');
  await page.close();
});

// ---------------------------------------------------------------- unavailable games
await section('unavailable game pages', async () => {
  const { page, problems } = await open('game.html?id=heli-attack-2', { wait: 300 });
  ok((await page.textContent('.unavail .uhead')).toLowerCase() === 'game currently unavailable', 'GAME CURRENTLY UNAVAILABLE notice');
  ok((await page.textContent('.unavail .usub')) === 'This game is part of the historical catalog but no playable local file has been added yet.', 'unavailable message text');
  ok(await page.$('#player, iframe, ruffle-player') === null, 'no fake player for a game without files');
  ok(await page.$('#fsbtn') === null && await page.$('#rsbtn') === null, 'no Full Screen / Restart without a game');
  const info = await page.$$eval('.infobox table tr', (e) => Object.fromEntries(e.map((r) => [r.cells[0].textContent, r.cells[1].textContent])));
  ok(info.Released === '2003' && info.Developer === 'Squarecircleco', 'release information shown', JSON.stringify(info));
  ok(/Not added yet/i.test(info.Format), 'format row says not added yet', info.Format);
  ok(info.Series === 'Heli Attack · Heli Attack 2 · Heli Attack 3', 'series shown in order', info.Series);
  ok(/Cross-verified/.test(info.Archive) && /MobyGames/.test(info.Sources) && !/https?:/.test(info.Sources), 'verification and sources shown as plain names', info.Archive + ' / ' + info.Sources);
  const rel = await page.$$eval('.infobox:nth-of-type(4) .ct a', (e) => e.map((a) => a.textContent.trim()));
  ok(rel.slice(0, 2).sort().join() === 'Heli Attack,Heli Attack 3', 'related games start with the same series', rel.join(', '));
  const bigsrc = await page.$eval('.unavail .upic', (i) => [i.src.slice(0, 22), i.naturalWidth]);
  ok(bigsrc[0] === 'data:image/png;base64,' && bigsrc[1] === 548, 'unavailable page shows the generated picture');
  await page.click('#favbtn');
  ok((await page.textContent('#mygames')).includes('Heli Attack 2'), 'unavailable games can be added to My Games');
  ok(!(await page.textContent('#played')).includes('Heli Attack 2'), 'opening an unavailable game does not count as playing it');
  await page.click('#rstars button[data-n="5"]');
  ok((await page.textContent('#ratingcell')).includes('your rating: 5'), 'unavailable games can be rated');
  ok((await page.textContent('#gstats')).includes('Not playable yet'), 'no fake play count');
  await page.goto(BASE + 'game.html?id=fancy-pants-adventure', { waitUntil: 'networkidle' });
  ok((await page.textContent('.infobox table')).includes('Fancy Pants 1'), 'aliases shown on the game page');
  await page.goto(BASE + 'game.html?id=nope-not-a-game', { waitUntil: 'networkidle' });
  ok((await page.textContent('.notfound')).includes("couldn't find"), 'unknown game message');
  await page.goto(BASE + 'game.html?id=heli-attack-3-game', { waitUntil: 'networkidle' });
  ok((await page.textContent('.notfound')).includes('Heli Attack 3'), 'unknown game suggests close titles');
  await page.goto(BASE + 'game.html?id=snow-line', { waitUntil: 'networkidle' });
  const sl = await page.$$eval('.infobox table tr', (e) => Object.fromEntries(e.map((r) => [r.cells[0].textContent, r.cells[1].textContent])));
  ok(sl['Game type'] === 'Seasonal / holiday game' && sl.Released === '2008', 'seasonal game page', JSON.stringify(sl));
  ok(problems.length === 0, 'no errors on unavailable pages', problems.join(' | '));
  await page.close();
});

// ---------------------------------------------------------------- installed games (player architecture)
await section('installed HTML5 game plays automatically', async () => {
  const catalog = catalogWith({ 'heli-attack-3': { installed: true, type: 'html5', gameFile: html5Test.gameFile, width: 640, height: 480 } });
  const { page, problems } = await open('index.html', { catalog });
  const playsOf = () => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('mcc.plays') || '{}')['heli-attack-3'] || 0; } catch (e) { return -1; } });
  const n0 = await playsOf();
  await page.goto(BASE + 'game.html?id=heli-attack-3', { waitUntil: 'networkidle' });
  await page.waitForSelector('#loader', { state: 'detached', timeout: 10000 });
  const frame = page.frames().find((f) => f.url().includes(html5Test.gameFile));
  ok(!!frame, 'html5 game runs in an iframe');
  ok(frame && await frame.waitForSelector('canvas', { timeout: 5000 }).then(() => true).catch(() => false), 'html5 game draws on a canvas');
  ok(await page.$('.unavail') === null, 'no unavailable notice for an installed game');
  await page.waitForFunction((n) => document.querySelector('#gstats').textContent.includes(`Played ${n} time`), n0 + 1, { timeout: 5000 }).catch(() => {});
  ok(await playsOf() === n0 + 1 && (await page.textContent('#gstats')).includes(`Played ${n0 + 1} time`), 'plays are counted when the game starts', `${n0} -> ${await playsOf()}`);
  ok((await page.textContent('#played')).includes('Heli Attack 3'), 'a launched game shows in Latest Games Played');
  const src0 = await page.$eval('#player iframe', (f) => f.src);
  await page.click('#rsbtn');
  await page.waitForTimeout(400);
  ok((await page.$eval('#player iframe', (f) => f.src)) === src0, 'restart reloads the game');
  await page.click('#fsbtn');
  await page.waitForTimeout(400);
  const fs1 = await page.evaluate(() => (document.fullscreenElement && document.fullscreenElement.id) || (document.querySelector('#player.fs-fallback') ? 'fallback' : ''));
  ok(fs1 === 'player' || fs1 === 'fallback', 'full screen mode', fs1);
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.fullscreenElement && document.exitFullscreen());
  await page.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
  ok(problems.length === 0, 'no errors for an installed html5 game', problems.join(' | '));
  await page.close();
  // "local-web" pointing at a folder loads its index.html
  const cat2 = catalogWith({ bloxorz: { installed: true, type: 'local-web', gameFile: html5Test.gameFile.replace(/index\.html$/, '') } });
  const r2 = await open('game.html?id=bloxorz', { catalog: cat2 });
  await r2.page.waitForSelector('#loader', { state: 'detached', timeout: 10000 });
  ok(r2.page.frames().some((f) => f.url().endsWith(html5Test.gameFile)), 'local-web folder loads its index.html');
  ok(r2.problems.length === 0, 'no errors for a local-web game', r2.problems.join(' | '));
  await r2.page.close();
});

await section('installed Flash game plays with Ruffle automatically', async () => {
  const catalog = catalogWith({ 'bloxorz': { installed: true, type: 'flash', gameFile: swfTest.gameFile, width: swfTest.width, height: swfTest.height } });
  const { page, problems } = await open('game.html?id=bloxorz', { catalog });
  await page.waitForSelector('#loader', { state: 'detached', timeout: 30000 }).catch(() => {});
  ok(await page.$('#player ruffle-player, #player ruffle-object') !== null, 'Ruffle player created');
  ok(await page.$('.loader.err') === null, 'Ruffle loaded the .swf without error');
  ok(problems.length === 0, 'no errors for an installed flash game', problems.join(' | '));
  await page.close();
});

await section(LIVE ? 'official Miniclip streams (live from classic.miniclip.com)' : 'official Miniclip streams (answered locally)', async () => {
  const list = LIVE ? streamed : streamed.filter((g) => g.id === 'commando-2');
  for (const g of list) {
    const before = officialRequests.length;
    const { page, problems } = await open('game.html?id=' + g.id);
    await page.waitForSelector('#loader', { state: 'detached', timeout: 60000 }).catch(() => {});
    const played = await page.waitForFunction(() => /Played [1-9]\d* time/.test(document.querySelector('#gstats').textContent), null, { timeout: LIVE ? 90000 : 15000 }).then(() => true).catch(() => false);
    ok(officialRequests.slice(before).includes(g.gameFile), 'the SWF is requested from its official address: ' + g.id);
    ok(await page.$('#player ruffle-player, #player ruffle-object') !== null && await page.$('.loader.err') === null, 'Ruffle runs the official stream: ' + g.id);
    ok(played, 'the stream starts and counts as played: ' + g.id);
    const info = await page.$$eval('.infobox table tr', (e) => Object.fromEntries(e.map((r) => [r.cells[0].textContent, r.cells[1].textContent])));
    ok(/Streamed from classic\.miniclip\.com/.test(info['Game file'] || ''), 'the page says where the game is streamed from: ' + g.id, info['Game file']);
    if (LIVE && process.env.SHOTS) { await page.waitForTimeout(4000); await page.screenshot({ path: path.join(process.env.SHOTS, g.id + '.png') }); }
    // Old Miniclip SWFs still ask for retired extras (component.txt, avatarloader.txt,
    // 2000s stats counters); they fail on Miniclip's own archive too and do not stop the game.
    const retired = (p) => /classic\.miniclip\.com\/.*\.txt\b|status of 403|stats\/SWFcounters|blocked by CORS policy.*http:\/\/\d/.test(p);
    ok(problems.filter((p) => !retired(p)).length === 0, 'no errors for the official stream: ' + g.id, problems.join(' | '));
    await page.close();
  }
});

await section('installed game with a missing file', async () => {
  const catalog = catalogWith({ 'raft-wars': { installed: true, type: 'flash', gameFile: 'games/raft-wars/this-file-does-not-exist.swf' } });
  const { page } = await open('game.html?id=raft-wars', { catalog, wait: 400 });
  ok(await page.$('.loader.err') !== null, 'friendly error when an installed game file is missing');
  await page.close();
});

await section('player test page and SketchPad', async () => {
  const { page, problems } = await open('playertest.html', { wait: 500 });
  await page.waitForSelector('#loader', { state: 'detached', timeout: 30000 }).catch(() => {});
  ok(await page.$('#player ruffle-player, #player ruffle-object') !== null, 'player test runs the demo .swf with Ruffle');
  ok(await page.$('.loader.err') === null, 'Ruffle demo loads');
  const list = QUICK ? ['brick-buster'] : extras.filter((x) => x.type !== 'flash' && x.id !== 'sketch-pad').map((x) => x.id);
  for (const id of list) {
    await page.goto(BASE + 'playertest.html?game=' + id, { waitUntil: 'networkidle' });
    await page.waitForSelector('#loader', { state: 'detached', timeout: 10000 }).catch(() => {});
    const frame = page.frames().find((f) => f.url().includes('/_extras/' + id + '/'));
    ok(frame && await frame.waitForSelector('canvas', { timeout: 5000 }).then(() => true).catch(() => false), 'test game runs: ' + id);
  }
  await page.goto(BASE + 'sketch.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('#loader', { state: 'detached', timeout: 10000 }).catch(() => {});
  ok(page.frames().some((f) => f.url().includes('sketch-pad')), 'SketchPad tab still works');
  ok(problems.length === 0, 'no errors on the player test page', problems.join(' | '));
  await page.close();
});

// ---------------------------------------------------------------- favourites, recent, ratings, profile
await section('favourites, recently played and profile', async () => {
  const { page, problems } = await open('games.html?cat=sports');
  await page.click('.gcard [data-fav="8-ball-pool"]');
  await page.goto(BASE + 'mygames.html', { waitUntil: 'networkidle' });
  ok((await page.textContent('#favlist')).includes('8 Ball Pool'), '+ My Games link on cards');
  ok((await page.textContent('#favlist')).includes('Heli Attack 2'), 'My Games page lists favourites (catalog-only games too)');
  ok((await page.textContent('#reclist')).includes('Heli Attack 3'), 'My Games page lists recently played');
  ok(!(await page.textContent('#reclist')).includes('Heli Attack 2'), 'only launched games are in the play history');
  await page.click('#favlist [data-fav="8-ball-pool"]');
  await page.waitForTimeout(400);
  ok(!(await page.textContent('#favlist')).includes('8 Ball Pool'), 'removing from My Games');
  // old ids from earlier versions of the site must not break anything
  await page.evaluate(() => { localStorage.setItem('mcc.favorites', JSON.stringify(['brick-buster', 'heli-attack-3'])); localStorage.setItem('mcc.recent', JSON.stringify([{ id: 'cave-copter', t: 1 }, { id: 'bloxorz', t: 2 }])); });
  await page.reload({ waitUntil: 'networkidle' });
  ok((await page.$$eval('#favlist .gcard', (e) => e.length)) === 1, 'stale favourites are ignored');
  ok((await page.textContent('#reclist')).includes('Bloxorz'), 'stale history entries are ignored');
  await page.goto(BASE + 'players.html', { waitUntil: 'networkidle' });
  await page.fill('#nick', 'Tester');
  await page.click('#savenick');
  ok((await page.textContent('.bhead h1')).includes("Tester's Profile"), 'player name saved');
  ok((await page.textContent('#scores')).includes('high score challenge games'), 'high score section explains that streamed games keep their own scores');
  await page.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
  ok((await page.textContent('#mygames')).includes('Heli Attack 3'), 'homepage My Games panel');
  ok(problems.length === 0, 'no errors while using favourites', problems.join(' | '));
  await page.close();
});

// ---------------------------------------------------------------- 404
await section('404 page', async () => {
  const { page } = await open('some/deep/missing-page.html', { wait: 800 });
  ok((await page.textContent('.notfound')).includes('404'), '404 page shown for missing path');
  const bg = await page.evaluate(() => getComputedStyle(document.getElementById('page')).backgroundColor);
  ok(bg === 'rgb(255, 255, 255)', '404 page is styled from a nested path', bg);
  ok(await page.$('#hdr #logo img') !== null, '404 page has the site header');
  ok((await page.$eval('.notfound a.btn', (a) => a.href)) === BASE + 'index.html', '404 page links back to the site root');
  await page.close();
});

// ---------------------------------------------------------------- layout
await section('desktop layout matches the reference grid', async () => {
  const { page } = await open('index.html');
  const r = await page.evaluate(() => {
    const p = document.getElementById('page').getBoundingClientRect();
    const box = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return [Math.round(b.left - p.left), Math.round(b.top - p.top), Math.round(b.width), Math.round(b.height)]; };
    return { page: [p.width], lcol: box('#lcol'), rcol: box('#rcol'), latest: box('.bpanel.latest'), hot: box('.bpanel.hot'), nav: box('#nav'), thumb: box('#hotgrid .tb img'), ad: box('.adslot'), cat: box('.catbox'), tt: box('.topten') };
  });
  ok(r.page[0] === 970, 'page is 970px wide', String(r.page[0]));
  ok(JSON.stringify(r.lcol.slice(0, 3)) === '[5,124,630]', 'left column position', JSON.stringify(r.lcol));
  ok(r.rcol[0] === 641 && r.rcol[2] === 324, 'right column position', JSON.stringify(r.rcol));
  ok(JSON.stringify(r.latest) === '[10,129,411,335]', 'Latest Games panel box', JSON.stringify(r.latest));
  ok(JSON.stringify(r.hot) === '[424,129,203,335]', 'Hot Games panel box', JSON.stringify(r.hot));
  ok(JSON.stringify(r.nav) === '[5,63,960,51]', 'nav bar box', JSON.stringify(r.nav));
  ok(r.thumb[2] === 70 && r.thumb[3] === 59, 'thumbnails are 70x59 with border', JSON.stringify(r.thumb));
  ok(r.ad[2] === 304 && r.ad[3] === 254, 'advert slot 300x250 + border', JSON.stringify(r.ad));
  ok(r.cat[2] === 203 && r.cat[3] === 221, 'category box 203x221', JSON.stringify(r.cat));
  ok(r.tt[2] === 324, 'Top Ten panel width', JSON.stringify(r.tt));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  ok(overflow, 'no horizontal overflow on desktop');
  await page.close();
});

await section('mobile layout has no sideways scrolling', async () => {
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US', isMobile: true, hasTouch: true });
  await officialHost(mctx);
  for (const url of ['index.html', 'games.html?cat=action', 'game.html?id=heli-attack-3', 'allgames.html', 'allgames.html?letter=S', 'search.html?q=ball', 'players.html', 'info.html', 'playertest.html']) {
    const { page, problems } = await open(url, { ctx: mctx, wait: 300 });
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    ok(w[0] <= w[1] + 1, 'no horizontal scroll on phone: ' + url, w.join(' > '));
    ok(problems.length === 0, 'no errors on phone: ' + url, problems.join(' | '));
    await page.close();
  }
  await mctx.close();
});

// ---------------------------------------------------------------- deployment
await section('RSS feed and GitHub Pages files', async () => {
  const r = await context.request.get(BASE + 'feed.xml');
  ok(r.status() === 200 && (await r.text()).includes('<rss'), 'feed.xml is served');
  ok(fs.existsSync(path.join(ROOT, '.nojekyll')), '.nojekyll exists (keeps games/_shared and games/_extras)');
  const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/pages.yml'), 'utf8');
  ok(wf.includes('sync-files.mjs') && wf.includes('validate.mjs'), 'Pages workflow syncs and validates the catalogue');
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
