// Makes the game thumbnails (136x114, shown at 68x57) and large promo images
// (548x398, shown at 274x199 / 148x107) from each game's own demo frame,
// with a chunky logo title on top - the way 2008 portal thumbnails looked.
//
// usage: node tools/art/build-thumbs.mjs [game-id]
// needs the site served at http://localhost:8080/MiniClipClassic/ (see README)
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { ROOT } from './render.mjs';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }

const BASE = process.env.SITE_URL || 'http://localhost:8080/MiniClipClassic/';
const only = process.argv[2];
const games = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8')).filter((g) => !only || g.id === only);
const FRAMES = path.join(ROOT, 'tools/art/output/frames');
fs.mkdirSync(FRAMES, { recursive: true });

// logo style per game: font, gradient colours, outline colour, position
const STYLE = {
  'cave-copter': ['Bangers', '#ffffff', '#b8ff6a', '#1a3a00'],
  'serpent-sprint': ['Luckiest Guy', '#fff27a', '#ffb31a', '#1a4a0a'],
  'brick-buster': ['Russo One', '#ffffff', '#ffb13a', '#0a1f4a'],
  'space-rocks': ['Black Ops One', '#e8f7ff', '#7ac8ff', '#000000'],
  'alien-assault': ['Press Start 2P', '#9dffa0', '#2ae84a', '#000000', 0.55],
  'city-defender': ['Bungee', '#ffe45a', '#ff8a3a', '#2a0a3a'],
  'tank-duel': ['Black Ops One', '#ffe0a0', '#ff9a2a', '#3a1a00'],
  'block-drop': ['Titan One', '#ffffff', '#35d0ff', '#1a0a4a'],
  'number-merge': ['Titan One', '#fff6e0', '#f2b179', '#7a3a10'],
  'mine-sweep': ['Russo One', '#ffffff', '#cfe3ff', '#12306a'],
  'box-pusher': ['Luckiest Guy', '#ffe45a', '#ffb13a', '#5a2a00'],
  'lights-out': ['Bungee', '#fffbd0', '#ffd83a', '#1a2238'],
  'sudoku-daily': ['Carter One', '#ffffff', '#bfe0ff', '#1d3f6e'],
  'mahjong-daily': ['Carter One', '#ffe08a', '#ff9a1a', '#3a0000'],
  'jewel-swap': ['Chewy', '#ffe0ff', '#f0a0ff', '#3a0a5a'],
  'memory-match': ['Chewy', '#ffffff', '#ffd24a', '#1a4a8a'],
  'mole-mayhem': ['Luckiest Guy', '#ffe45a', '#ff9a2a', '#4a2000'],
  'color-echo': ['Bungee', '#ffffff', '#ffd83a', '#3a0a6a'],
  'bubble-wrap': ['Chewy', '#ffffff', '#bfe6ff', '#3a2a6a'],
  'paddle-pong': ['Press Start 2P', '#ffffa0', '#ffffff', '#003a10', 0.55],
  'hoop-shot': ['Bangers', '#ffb86a', '#ff6a1a', '#1a1a3a'],
  'mini-putt': ['Luckiest Guy', '#ffffff', '#c8ff9a', '#1a4a0a'],
  'penalty-kick': ['Bangers', '#ffffff', '#ffe45a', '#0a2a5a'],
  'air-hockey': ['Russo One', '#ffffff', '#9ad0ff', '#1a1a4a'],
  'turbo-track': ['Bangers', '#ffe45a', '#ff4a2a', '#1a1a1a'],
  'highway-dash': ['Bungee', '#ffe45a', '#ffb13a', '#1a1a3a'],
  'moto-hill': ['Bangers', '#ffffff', '#ffd83a', '#8a1a00'],
  'ski-slalom': ['Luckiest Guy', '#ffffff', '#9ad0ff', '#1a3a8a'],
  'light-cycles': ['Russo One', '#e8ffff', '#3ad0ff', '#001a3a'],
  'castle-guard': ['Carter One', '#ffe45a', '#ffb13a', '#3a1a00'],
  'four-in-a-row': ['Titan One', '#ffffff', '#ffd83a', '#1a3a8a'],
  'tic-tac-toe': ['Permanent Marker', '#ff4a3a', '#e8302a', '#ffffff'],
  'reversi': ['Carter One', '#ffffff', '#dddddd', '#0a3a1a'],
  'pixel-runner': ['Press Start 2P', '#ffffff', '#ffd86a', '#3a1a5a', 0.55],
  'jumpin-jack': ['Luckiest Guy', '#ffe45a', '#ff8a2a', '#8a1a00'],
  'dungeon-dash': ['Black Ops One', '#ffe0a0', '#ffb13a', '#1a0a00'],
  'treasure-diver': ['Carter One', '#ffe45a', '#ffb13a', '#002a5a'],
  'maze-muncher': ['Bungee', '#ffe600', '#ffb000', '#000a4a'],
  'road-hopper': ['Luckiest Guy', '#9dff7a', '#2ae84a', '#0a3a00'],
  'tower-stack': ['Titan One', '#ffffff', '#ffd0f0', '#5a1a5a'],
  'type-attack': ['Press Start 2P', '#9ae8ff', '#3ad0ff', '#001a3a', 0.55],
  'critter-cannon': ['Luckiest Guy', '#ffd0f0', '#ff7ab8', '#5a0a3a'],
  'flash-bounce': ['Bangers', '#ffffff', '#ffb13a', '#8a2a00'],
  'sketch-pad': ['Permanent Marker', '#ffffff', '#ffe45a', '#2a4a8a'],
};

// thumbnails zoom into the action: [x, y, width] of the 640x480 demo frame
// (height follows the 136x114 aspect ratio). Games not listed use the centre.
const CROP = {
  'moto-hill': [70, 160, 330],
  'hoop-shot': [260, 50, 380],
  'critter-cannon': [190, 55, 250],
  'ski-slalom': [130, 0, 330],
  'penalty-kick': [110, 50, 420],
  'highway-dash': [130, 40, 380],
  'cave-copter': [40, 70, 420],
  'light-cycles': [40, 60, 520],
  'pixel-runner': [80, 40, 400],
  'jumpin-jack': [40, 170, 420],
  'treasure-diver': [140, 60, 380],
  'tower-stack': [150, 150, 340],
  'bubble-wrap': [80, 60, 420],
  'mole-mayhem': [60, 90, 470],
  'color-echo': [100, 40, 440],
  'lights-out': [120, 40, 420],
  'memory-match': [40, 60, 440],
  'four-in-a-row': [110, 60, 420],
  'tic-tac-toe': [140, 60, 360],
  'reversi': [180, 20, 440],
  'castle-guard': [40, 30, 460],
  'box-pusher': [140, 60, 380],
  'number-merge': [150, 50, 360],
  'sudoku-daily': [10, 30, 440],
  'block-drop': [180, 20, 300],
  'mine-sweep': [40, 60, 380],
  'sketch-pad': [100, 10, 460],
};

async function captureFrames(browser) {
  const page = await browser.newPage({ viewport: { width: 640, height: 480 }, locale: 'en-US' });
  for (const g of games) {
    const out = path.join(FRAMES, g.id + '.png');
    if (g.type === 'flash') {
      await page.goto(BASE + 'index.html'); // same origin, so Ruffle may fetch the .swf
      await page.setContent(`<!DOCTYPE html><html><body style="margin:0;background:#000"><div id="c"></div>
        <script>window.RufflePlayer={config:{autoplay:'on',unmuteOverlay:'hidden',splashScreen:false,letterbox:'on'}}</script>
        <script src="${BASE}vendor/ruffle/ruffle.js"></script>
        <script>const p=RufflePlayer.newest().createPlayer();p.style.width='640px';p.style.height='480px';document.getElementById('c').appendChild(p);p.load('${BASE}${g.file}');</script></body></html>`, { waitUntil: 'load' });
      await page.waitForTimeout(3000);
      // headless Chromium has no GPU, so Ruffle shows a notice; close it
      await page.mouse.click(599, 22);
      await page.waitForTimeout(900);
    } else {
      await page.goto(BASE + g.file + '?demo=1');
      await page.waitForFunction(() => window.__demoReady === true, null, { timeout: 10000 });
      await page.waitForTimeout(150);
    }
    await page.screenshot({ path: out });
    process.stdout.write('.');
  }
  await page.close();
  console.log(' frames captured');
}

function thumbImgTag(g, frame) {
  const c = CROP[g.id];
  if (!c) return `<img src="${frame}" style="position:absolute;width:162px;height:122px;left:-13px;top:-2px">`;
  const [x, y, w] = c;
  const k = 136 / w;
  return `<img src="${frame}" style="position:absolute;width:${640 * k}px;height:${480 * k}px;left:${-x * k}px;top:${-y * k}px">`;
}

function title(g, w, h, size, lines) {
  const [font, c1, c2, stroke, scale = 1] = STYLE[g.id] || ['Titan One', '#fff', '#ffd24a', '#000'];
  const words = g.title.toUpperCase().split(' ');
  let rows = [g.title.toUpperCase()];
  if (lines > 1 && words.length > 1 && g.title.length > 9) {
    const mid = Math.ceil(words.length / 2);
    rows = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
  }
  const fs = size * scale;
  const id = 'lg' + Math.random().toString(36).slice(2, 7);
  const texts = rows.map((r, i) => {
    const y = fs * 0.92 + i * fs * 0.98 + 4;
    const fit = Math.min(w - 10, r.length * fs * (font === 'Press Start 2P' ? 1.02 : 0.62));
    return `<text x="${w / 2}" y="${y}" text-anchor="middle" font-family="'${font}'" font-size="${fs}" textLength="${fit}" lengthAdjust="spacingAndGlyphs"
      fill="url(#${id})" stroke="${stroke}" stroke-width="${Math.max(3, fs / 5)}" paint-order="stroke" stroke-linejoin="round">${r.replace(/&/g, '&amp;')}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="position:absolute;left:0;top:0">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
    <filter id="sh${id}"><feDropShadow dx="0" dy="${fs / 14}" stdDeviation="${fs / 18}" flood-opacity=".55"/></filter></defs>
    <g filter="url(#sh${id})">${texts}</g></svg>`;
}

async function compose(browser) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(ROOT, 'tools/art/studio.html')).href);
  await page.evaluate(() => document.fonts.ready);
  const shot = async (w, h, html, out) => {
    await page.evaluate(({ w, h, html }) => { const s = document.getElementById('stage'); s.style.width = w + 'px'; s.style.height = h + 'px'; s.innerHTML = html; }, { w, h, html });
    await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r))))]));
    await page.locator('#stage').screenshot({ path: out });
  };
  for (const g of games) {
    const frame = pathToFileURL(path.join(FRAMES, g.id + '.png')).href + '?v=' + Date.now();
    // thumbnail 136x114: crop the middle of the 640x480 frame
    await shot(136, 114, `<div style="position:relative;width:136px;height:114px;overflow:hidden;background:#000">
        ${thumbImgTag(g, frame)}
        <div style="position:absolute;left:0;right:0;top:0;height:40px;background:linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,0))"></div>
        ${title(g, 136, 114, 26, 2)}</div>`, path.join(ROOT, 'assets/games', g.id + '.png'));
    // large promo 548x398
    await shot(548, 398, `<div style="position:relative;width:548px;height:398px;overflow:hidden;background:#000">
        <img src="${frame}" style="position:absolute;width:548px;height:411px;left:0;top:-7px">
        <div style="position:absolute;left:0;right:0;top:0;height:110px;background:linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,0))"></div>
        ${title(g, 548, 398, 58, 1)}
        <div style="position:absolute;right:14px;bottom:14px;padding:6px 16px 6px 14px;border-radius:18px;border:3px solid #fff;
          background:linear-gradient(#ffc34d,#ff8a00 55%,#e06a00);font:bold 22px 'Lilita One';color:#fff;letter-spacing:1px;
          text-shadow:0 2px 0 rgba(120,50,0,.6);box-shadow:0 3px 6px rgba(0,0,0,.5)">PLAY NOW &#9658;</div></div>`, path.join(ROOT, 'assets/games/large', g.id + '.png'));
    process.stdout.write('+');
  }
  console.log(' composed', games.length, 'games');
}

fs.mkdirSync(path.join(ROOT, 'assets/games/large'), { recursive: true });
const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
await captureFrames(browser);
await compose(browser);
await browser.close();
