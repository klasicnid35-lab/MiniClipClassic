// Draws the promotional banners used on the homepage: the wide 612x77 promo,
// the small 314x66 promo, the 300x250 house advert and the Sudoku / Mahjong
// "play daily" backgrounds. All artwork is original SVG, rendered at 2x.
// usage: node tools/art/build-banners.mjs [filter]
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { renderAll, ROOT } from './render.mjs';

// ---- cute critters -------------------------------------------------------
function eye(x, y, r, look = 0) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="#333" stroke-width="${r / 6}"/><circle cx="${x + look * r * 0.35}" cy="${y + r * 0.1}" r="${r * 0.45}" fill="#111"/><circle cx="${x + look * r * 0.35 - r * 0.15}" cy="${y - r * 0.12}" r="${r * 0.15}" fill="#fff"/>`;
}
function bunnyCritter(x, y, s, col, col2) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="-14" cy="-58" rx="9" ry="26" fill="${col}" stroke="#7a1a4a" stroke-width="2" transform="rotate(-18 -14 -58)"/>
    <ellipse cx="14" cy="-58" rx="9" ry="26" fill="${col}" stroke="#7a1a4a" stroke-width="2" transform="rotate(18 14 -58)"/>
    <ellipse cx="-14" cy="-58" rx="4" ry="17" fill="${col2}" transform="rotate(-18 -14 -58)"/>
    <ellipse cx="14" cy="-58" rx="4" ry="17" fill="${col2}" transform="rotate(18 14 -58)"/>
    <ellipse cx="0" cy="-12" rx="30" ry="32" fill="${col}" stroke="#7a1a4a" stroke-width="2"/>
    <ellipse cx="-8" cy="-22" rx="12" ry="8" fill="#fff" opacity=".35"/>
    ${eye(-10, -20, 8, 0.6)}${eye(11, -20, 8, 0.6)}
    <path d="M-8 -2 Q2 10 12 -2" fill="#c0306a" stroke="#7a1a4a" stroke-width="2"/>
    <ellipse cx="-22" cy="-6" rx="5" ry="3" fill="#ff5a9a" opacity=".6"/><ellipse cx="22" cy="-6" rx="5" ry="3" fill="#ff5a9a" opacity=".6"/></g>`;
}
function blob(x, y, s, col, dark, horns = false) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    ${horns ? `<path d="M-16 -44 L-22 -62 L-8 -48 Z M16 -44 L22 -62 L8 -48 Z" fill="#fff4c0" stroke="${dark}" stroke-width="2"/>` : ''}
    <path d="M-30 0 C-34 -40 -18 -52 0 -52 C18 -52 34 -40 30 0 C20 6 -20 6 -30 0 Z" fill="${col}" stroke="${dark}" stroke-width="2.5"/>
    <ellipse cx="-8" cy="-38" rx="10" ry="6" fill="#fff" opacity=".35"/>
    ${eye(-9, -28, 7, -0.5)}${eye(10, -28, 7, -0.5)}
    <path d="M-10 -12 Q0 -4 10 -12" fill="none" stroke="${dark}" stroke-width="3" stroke-linecap="round"/></g>`;
}
function tallCritter(x, y, s, col, dark) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-14 0 C-18 -40 -10 -90 0 -96 C10 -90 18 -40 14 0 Z" fill="${col}" stroke="${dark}" stroke-width="2.5"/>
    <path d="M-6 -96 C-14 -110 -20 -108 -24 -116 M6 -96 C14 -110 20 -108 24 -116" stroke="${dark}" stroke-width="3" fill="none"/>
    <circle cx="-24" cy="-117" r="5" fill="#fff" stroke="${dark}" stroke-width="2"/><circle cx="24" cy="-117" r="5" fill="#fff" stroke="${dark}" stroke-width="2"/>
    ${eye(0, -72, 9, 0.3)}
    <path d="M-8 -44 L-4 -38 L0 -44 L4 -38 L8 -44" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></g>`;
}
function playButton(x, y, w, h, label = 'play') {
  return `<g transform="translate(${x} ${y})">
    <rect x="-3" y="-3" width="${w + 6}" height="${h + 6}" rx="${h / 3.2}" fill="#fff"/>
    <rect width="${w}" height="${h}" rx="${h / 3.6}" fill="url(#pb)" stroke="#3a0a6a" stroke-width="2"/>
    <rect x="4" y="3" width="${w - 8}" height="${h / 2 - 3}" rx="${h / 5}" fill="#fff" opacity=".25"/>
    <text x="${w * 0.42}" y="${h * 0.72}" text-anchor="middle" font-family="'Baloo 2'" font-weight="800" font-size="${h * 0.78}" fill="#fff" stroke="#2a0050" stroke-width="${h / 22}" paint-order="stroke">${label}</text>
    <path d="M${w * 0.78} ${h * 0.28} L${w * 0.9} ${h * 0.5} L${w * 0.78} ${h * 0.72} Z" fill="#fff" stroke="#2a0050" stroke-width="1.5"/></g>`;
}
const DEFS = `<defs>
  <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ad83a"/><stop offset="1" stop-color="#3a9a1a"/></linearGradient>
  <linearGradient id="pb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b86aff"/><stop offset=".5" stop-color="#8a2ae8"/><stop offset="1" stop-color="#5a0ab8"/></linearGradient>
  <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="2.2" fill="#fff" opacity=".13"/><circle cx="10" cy="10" r="1.5" fill="#1a5a0a" opacity=".15"/></pattern>
  <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
</defs>`;
const grassBg = (w, h) => `<rect width="${w}" height="${h}" fill="url(#grass)"/><rect width="${w}" height="${h}" fill="url(#dots)"/>
  <path d="M0 ${h * 0.35} C${w * 0.2} ${h * 0.15} ${w * 0.35} ${h * 0.5} ${w * 0.55} ${h * 0.3} S${w * 0.85} ${h * 0.1} ${w} ${h * 0.4} V0 H0Z" fill="#aef06a" opacity=".45"/>`;

const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="612" height="77" viewBox="0 0 612 77">${DEFS}
  ${grassBg(612, 77)}
  <ellipse cx="300" cy="40" rx="200" ry="45" fill="url(#glow)"/>
  ${tallCritter(26, 82, 0.62, '#ff6a4a', '#7a1a0a')}${tallCritter(52, 88, 0.55, '#ff8a5a', '#7a1a0a')}
  ${bunnyCritter(98, 88, 0.95, '#ff9ad0', '#ffd0ea')}
  ${blob(165, 82, 0.45, '#ffd83a', '#8a5a00')}
  ${blob(410, 84, 0.42, '#ff7ad8', '#7a1a5a', true)}
  ${bunnyCritter(478, 68, 0.62, '#7ac8ff', '#d0ecff')}
  <text x="300" y="44" text-anchor="middle" font-family="'Luckiest Guy'" font-size="44" fill="#fff" stroke="#6a1aa8" stroke-width="7" paint-order="stroke" stroke-linejoin="round" textLength="300" lengthAdjust="spacingAndGlyphs">Critter Cannon</text>
  <text x="300" y="68" text-anchor="middle" font-family="'Lilita One'" font-size="19" fill="#fff" stroke="#2a4a0a" stroke-width="4" paint-order="stroke" stroke-linejoin="round">Launch your own CRITTER!</text>
  ${playButton(507, 12, 92, 52)}
</svg>`;

const small = `<svg xmlns="http://www.w3.org/2000/svg" width="314" height="66" viewBox="0 0 314 66">${DEFS}
  ${grassBg(314, 66)}
  ${tallCritter(18, 72, 0.5, '#ff6a4a', '#7a1a0a')}${tallCritter(38, 76, 0.44, '#ff8a5a', '#7a1a0a')}
  ${bunnyCritter(76, 74, 0.72, '#ff9ad0', '#ffd0ea')}
  ${blob(124, 70, 0.36, '#ffd83a', '#8a5a00')}
  ${bunnyCritter(168, 58, 0.55, '#7ac8ff', '#d0ecff')}
  ${playButton(210, 10, 94, 46)}
</svg>`;

const frame = (id) => {
  const f = path.join(ROOT, 'tools/art/output/frames', id + '.png');
  return fs.existsSync(f) ? pathToFileURL(f).href : '';
};

const houseAd = `<div style="position:relative;width:300px;height:250px;overflow:hidden;background:#5ab83a;font-family:'Lilita One'">
  <img src="${frame('castle-guard')}" style="position:absolute;left:-40px;top:-38px;width:380px;height:285px;opacity:.95">
  <div style="position:absolute;inset:0;background:linear-gradient(rgba(10,30,80,.75),rgba(10,30,80,.1) 45%,rgba(10,30,80,.55))"></div>
  <svg xmlns="http://www.w3.org/2000/svg" width="300" height="250" style="position:absolute;left:0;top:0">
    <defs><linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff5a0"/><stop offset="1" stop-color="#ffb31a"/></linearGradient></defs>
    <text x="150" y="52" text-anchor="middle" font-family="'Carter One'" font-size="40" fill="url(#t)" stroke="#3a1a00" stroke-width="6" paint-order="stroke" stroke-linejoin="round">Castle Guard</text>
    <text x="150" y="80" text-anchor="middle" font-family="'Lilita One'" font-size="18" fill="#fff" stroke="#0a1a4a" stroke-width="4" paint-order="stroke">Stop the goblin army!</text>
    <text x="150" y="188" text-anchor="middle" font-family="'Lilita One'" font-size="15" fill="#fff" stroke="#0a1a4a" stroke-width="3.5" paint-order="stroke">15 waves • 3 towers • FREE</text>
  </svg>
  <div style="position:absolute;left:75px;top:200px;width:150px;height:36px;border-radius:14px;border:3px solid #fff;box-sizing:border-box;
    background:linear-gradient(#ffc34d,#ff8a00 55%,#e06a00);color:#fff;font-size:21px;line-height:30px;text-align:center;letter-spacing:1px;
    text-shadow:0 2px 0 rgba(120,50,0,.6);box-shadow:0 3px 6px rgba(0,0,0,.5)">PLAY NOW &#9658;</div>
</div>`;

const sudokuBg = `<svg xmlns="http://www.w3.org/2000/svg" width="155" height="68" viewBox="0 0 155 68">
  <defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3ac0ff"/><stop offset="1" stop-color="#1a90e8"/></linearGradient></defs>
  <rect width="155" height="68" fill="url(#sk)"/>
  <path d="M0 56 C40 48 80 62 155 52 V68 H0Z" fill="#6ad84a"/>
  <g transform="translate(4 30) rotate(-14)">
    <rect width="48" height="42" fill="#fff" stroke="#9ab" stroke-width="1"/>
    ${Array.from({ length: 8 }, (_, i) => `<line x1="${(i + 1) * 5.3}" y1="0" x2="${(i + 1) * 5.3}" y2="42" stroke="${(i + 1) % 3 ? '#bcd' : '#345'}" stroke-width="${(i + 1) % 3 ? 0.6 : 1.2}"/><line x1="0" y1="${(i + 1) * 4.7}" x2="48" y2="${(i + 1) * 4.7}" stroke="${(i + 1) % 3 ? '#bcd' : '#345'}" stroke-width="${(i + 1) % 3 ? 0.6 : 1.2}"/>`).join('')}
    ${[[1, 1, 5], [4, 2, 3], [7, 0, 8], [2, 5, 1], [6, 4, 9], [0, 7, 4], [5, 7, 2]].map(([x, y, n]) => `<text x="${x * 5.3 + 1.2}" y="${y * 4.7 + 4.2}" font-size="4.6" font-family="SiteTahoma" font-weight="bold" fill="#1d3f6e">${n}</text>`).join('')}
  </g>
  <g transform="translate(46 16) rotate(40)"><rect width="5" height="34" fill="#ffd83a" stroke="#b88a00" stroke-width=".8"/><rect y="-5" width="5" height="5" fill="#ff8a8a"/><path d="M0 34 L2.5 41 L5 34Z" fill="#f1d8b0"/><path d="M1.6 38.5 L2.5 41 L3.4 38.5Z" fill="#333"/></g>
</svg>`;

const mahjongBg = `<svg xmlns="http://www.w3.org/2000/svg" width="158" height="68" viewBox="0 0 158 68">
  <defs><radialGradient id="mr" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#9a1a1a"/><stop offset="1" stop-color="#4a0606"/></radialGradient></defs>
  <rect width="158" height="68" fill="url(#mr)"/>
  <g stroke="#ffd0a0" stroke-opacity=".12" fill="none">${Array.from({ length: 6 }, (_, i) => `<circle cx="79" cy="34" r="${14 + i * 14}"/>`).join('')}</g>
  ${[[112, 34, '中', '#d02020'], [128, 28, '發', '#1a8a2a'], [142, 38, '東', '#1a2a5a'], [120, 46, '●', '#1a6ad8']].map(([x, y, ch, c]) => `<g transform="translate(${x} ${y}) rotate(${(x % 7) - 3})"><rect x="2" y="2" width="16" height="21" rx="2" fill="#b8864a"/><rect width="16" height="21" rx="2" fill="#fffdf0" stroke="#a88a5a" stroke-width=".7"/><text x="8" y="15" text-anchor="middle" font-size="11" font-family="'Noto Sans CJK SC','WenQuanYi Zen Hei',sans-serif" font-weight="bold" fill="${c}">${ch}</text></g>`).join('')}
</svg>`;

const assets = [
  { out: 'assets/banners/promo-wide.png', w: 612, h: 77, html: wide },
  { out: 'assets/banners/promo-small.png', w: 314, h: 66, html: small },
  { out: 'assets/banners/house-ad.png', w: 300, h: 250, html: houseAd, opaque: true },
  { out: 'assets/banners/daily-sudoku.png', w: 155, h: 68, html: sudokuBg },
  { out: 'assets/banners/daily-mahjong.png', w: 158, h: 68, html: mahjongBg },
];
const n = await renderAll(assets, { only: process.argv[2] });
console.log('rendered', n, 'banners');
