// Draws the site's UI artwork (logo, tab icons, bullets, stars, flags...).
// All drawings are original SVG. Output is 2x PNG for sharp high-DPI display.
// usage: node tools/art/build-ui.mjs [filter]
import { renderAll } from './render.mjs';

const svg = (w, h, body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;

// ---------------------------------------------------------------- gamepad
function gamepad(w, h, id) {
  return svg(w, h, `
  <g transform="scale(${w / 30} ${h / 17})">
    <path d="M8 1.5H22C26.2 1.5 28.8 5.5 29.4 10.6 29.9 14.8 27.4 16.8 24.8 15.2L21.2 12.1H8.8L5.2 15.2C2.6 16.8.1 14.8.6 10.6 1.2 5.5 3.8 1.5 8 1.5Z" fill="url(#${id})" stroke="#e8f6ff" stroke-width=".6"/>
    <rect x="6.9" y="4.6" width="2.4" height="6.6" rx=".5" fill="#2f8fe8"/>
    <rect x="4.8" y="6.7" width="6.6" height="2.4" rx=".5" fill="#2f8fe8"/>
    <rect x="12.6" y="6.2" width="2" height="1.3" rx=".4" fill="#ffb31a"/>
    <rect x="15.4" y="6.2" width="2" height="1.3" rx=".4" fill="#ffb31a"/>
    <circle cx="22.3" cy="5.4" r="1.35" fill="#3aa2ff"/>
    <circle cx="24.7" cy="7.9" r="1.35" fill="#3aa2ff"/>
    <circle cx="19.9" cy="7.9" r="1.35" fill="#3aa2ff"/>
    <circle cx="22.3" cy="10.4" r="1.35" fill="#3aa2ff"/>
  </g>`, `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#f2faff"/><stop offset="1" stop-color="#b8e0ff"/></linearGradient>`);
}

// ---------------------------------------------------------------- flame
const flame = svg(18, 24, `
  <path d="M10.2.6C11 5.4 16.8 8.3 16.8 15.2 16.8 20.6 13.2 23.6 9 23.6 4.6 23.6 1.4 20.6 1.4 16.4 1.4 12.3 4.3 10.6 5.1 6.4 6.6 8.3 6.9 10.2 6.7 12 8.8 9.4 10.9 5.6 10.2.6Z" fill="url(#fl)"/>
  <path d="M9.4 11.5C10.3 14.4 13.3 15.9 13 19 12.8 21.4 11 22.6 9 22.6 6.7 22.6 5 21 5.1 18.9 5.3 16.3 8.2 15.4 9.4 11.5Z" fill="#fff" opacity=".85"/>
  <path d="M7.6 19.5C8.4 18.2 8.3 17.4 8.9 16.2" stroke="#8fd0ff" stroke-width="1.1" fill="none" stroke-linecap="round"/>`,
  `<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6f5ff"/><stop offset=".6" stop-color="#9fd6ff"/><stop offset="1" stop-color="#7cc6ff"/></linearGradient>`);

// ---------------------------------------------------------------- players (two kids)
function kid(cx, cy, r, skin, hair, shirt) {
  return `
  <path d="M${cx - r * 1.15} ${cy + r * 1.9}C${cx - r * 1.1} ${cy + r * .95} ${cx + r * 1.1} ${cy + r * .95} ${cx + r * 1.15} ${cy + r * 1.9}Z" fill="${shirt}"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${skin}" stroke="#d9823f" stroke-width=".7"/>
  <path d="M${cx - r * .95} ${cy - r * .15}C${cx - r * 1.05} ${cy - r * 1.2} ${cx - r * .2} ${cy - r * 1.35} ${cx + r * .1} ${cy - r * 1.1}C${cx + r * .5} ${cy - r * 1.45} ${cx + r * 1.2} ${cy - r * 1} ${cx + r * .95} ${cy - r * .1}C${cx + r * .5} ${cy - r * .6} ${cx - r * .4} ${cy - r * .7} ${cx - r * .95} ${cy - r * .15}Z" fill="${hair}"/>
  <ellipse cx="${cx - r * .36}" cy="${cy + r * .08}" rx="${r * .2}" ry="${r * .26}" fill="#fff"/>
  <ellipse cx="${cx + r * .36}" cy="${cy + r * .08}" rx="${r * .2}" ry="${r * .26}" fill="#fff"/>
  <circle cx="${cx - r * .33}" cy="${cy + r * .12}" r="${r * .12}" fill="#2a6fd6"/>
  <circle cx="${cx + r * .39}" cy="${cy + r * .12}" r="${r * .12}" fill="#2a6fd6"/>
  <path d="M${cx - r * .3} ${cy + r * .5}Q${cx} ${cy + r * .75} ${cx + r * .3} ${cy + r * .5}" stroke="#c0552a" stroke-width=".8" fill="none" stroke-linecap="round"/>`;
}
const players = svg(31, 24, kid(21, 8.5, 6.6, '#ffd2a6', '#e56a12', '#ffe9d4') + kid(10, 11.5, 7.2, '#ffe0bf', '#f0842a', '#fff4e8'));

// ---------------------------------------------------------------- sketch (star + pencil)
function starPath(cx, cy, R, r, n = 5) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const rr = i % 2 ? r : R;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(2) + ' ' + (cy + Math.sin(a) * rr).toFixed(2);
  }
  return d + 'Z';
}
const sketch = svg(38, 44, `
  <path d="${starPath(20, 30, 10.5, 4.6)}" fill="none" stroke="#fff" stroke-width="2.8" stroke-linejoin="round"/>
  <g transform="translate(1 4) rotate(-50 11 9)">
    <rect x="3" y="6.3" width="17" height="5.4" rx="1" fill="#f4f7fb" stroke="#8c9bb3" stroke-width=".8"/>
    <rect x="3" y="6.3" width="3.2" height="5.4" rx="1" fill="#c9d3e3" stroke="#8c9bb3" stroke-width=".8"/>
    <path d="M20 6.3L25.5 9 20 11.7Z" fill="#f1d8b0" stroke="#8c9bb3" stroke-width=".8"/>
    <path d="M23.6 8.1L25.5 9 23.6 9.9Z" fill="#333"/>
  </g>`);

// ---------------------------------------------------------------- round bullets
function circleArrow(d, c1, c2, stroke, dir = 1) {
  const r = d / 2;
  const tri = dir > 0
    ? `M${r - d * .14} ${r - d * .24}L${r + d * .24} ${r}L${r - d * .14} ${r + d * .24}Z`
    : `M${r + d * .14} ${r - d * .24}L${r - d * .24} ${r}L${r + d * .14} ${r + d * .24}Z`;
  const id = 'g' + Math.random().toString(36).slice(2, 7);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}" viewBox="0 0 ${d} ${d}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <circle cx="${r}" cy="${r}" r="${r - .5}" fill="url(#${id})" stroke="${stroke}" stroke-width=".8"/>
    <path d="${tri}" fill="#fff"/></svg>`;
}

// ---------------------------------------------------------------- stars sprite (11x22)
const starSprite = svg(11, 22, `
  <path d="${starPath(5.5, 6, 5.2, 2.2)}" fill="#e3e3e3" stroke="#b2b2b2" stroke-width=".7" stroke-linejoin="round"/>
  <path d="${starPath(5.5, 17, 5.2, 2.2)}" fill="url(#st)" stroke="#e08a00" stroke-width=".7" stroke-linejoin="round"/>`,
  `<linearGradient id="st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff27a"/><stop offset=".5" stop-color="#ffcc00"/><stop offset="1" stop-color="#ffa800"/></linearGradient>`);

// big stars for the rating widget on the game page (15x30)
const starSpriteBig = svg(15, 30, `
  <path d="${starPath(7.5, 8, 7, 3)}" fill="#e3e3e3" stroke="#a8a8a8" stroke-width=".8" stroke-linejoin="round"/>
  <path d="${starPath(7.5, 23, 7, 3)}" fill="url(#st2)" stroke="#e08a00" stroke-width=".8" stroke-linejoin="round"/>`,
  `<linearGradient id="st2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff27a"/><stop offset=".5" stop-color="#ffcc00"/><stop offset="1" stop-color="#ffa800"/></linearGradient>`);

// ---------------------------------------------------------------- RSS
const rss = svg(12, 12, `
  <rect x=".5" y=".5" width="11" height="11" rx="2" fill="url(#rs)" stroke="#d45d00" stroke-width=".6"/>
  <circle cx="3.4" cy="8.6" r="1.2" fill="#fff"/>
  <path d="M2.3 5.4A4.3 4.3 0 0 1 6.6 9.7" stroke="#fff" stroke-width="1.3" fill="none"/>
  <path d="M2.3 2.6A7.1 7.1 0 0 1 9.4 9.7" stroke="#fff" stroke-width="1.3" fill="none"/>`,
  `<linearGradient id="rs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb366"/><stop offset="1" stop-color="#f26a00"/></linearGradient>`);

// ---------------------------------------------------------------- flags (16x11 each, stacked)
const F = {
  vert: (a, b, c) => `<rect width="5.34" height="11" fill="${a}"/><rect x="5.33" width="5.34" height="11" fill="${b}"/><rect x="10.66" width="5.34" height="11" fill="${c}"/>`,
  horz: (a, b, c) => `<rect width="16" height="3.67" fill="${a}"/><rect y="3.66" width="16" height="3.68" fill="${b}"/><rect y="7.33" width="16" height="3.67" fill="${c}"/>`,
};
const flagBodies = [
  // English (UK / US split)
  `<rect width="16" height="11" fill="#fff"/>
   ${[0, 2, 4, 6, 8, 10].map((y) => `<rect y="${y * 11 / 11}" width="16" height="1" fill="#c8202f"/>`).join('')}
   <path d="M0 0H16L0 11Z" fill="#1d3f8f"/>
   <path d="M0 0L16 11M16 0" stroke="#fff" stroke-width="0"/>
   <path d="M0 1.2L9.5 7.7" stroke="#fff" stroke-width="2.2"/><path d="M0 1.2L9.5 7.7" stroke="#c8202f" stroke-width=".8"/>
   <path d="M6.5 0V6.2M0 3.8H11" stroke="#fff" stroke-width="2.4"/><path d="M6.5 0V6.2M0 3.8H11" stroke="#c8202f" stroke-width="1.2"/>
   <path d="M0 0H16L0 11Z" fill="none"/>`,
  F.vert('#1f3e9c', '#fff', '#e0283a'),                                    // Français
  `<rect width="16" height="11" fill="#c8102e"/><rect y="2.75" width="16" height="5.5" fill="#ffc400"/>`, // Español
  F.horz('#000', '#dd0000', '#ffce00'),                                     // Deutsch
  `<rect width="16" height="11" fill="#e0201b"/><rect width="6.4" height="11" fill="#1d7a2e"/><circle cx="6.4" cy="5.5" r="2.4" fill="#ffd200" stroke="#b58b00" stroke-width=".4"/>`, // Português
  F.vert('#1e9a48', '#fff', '#d42a35'),                                     // Italiano
  `<rect width="16" height="5.5" fill="#fff"/><rect y="5.5" width="16" height="5.5" fill="#dc143c"/>`, // Polski
  F.vert('#1c3d9c', '#fcd116', '#ce1126'),                                  // Română
  F.horz('#d0303a', '#fff', '#3d7d3a'),                                     // Magyar
  `<rect width="16" height="11" fill="#1f9a3c"/><path d="M8 1.3L14.6 5.5 8 9.7 1.4 5.5Z" fill="#fedd00"/><circle cx="8" cy="5.5" r="2.4" fill="#1d3f8f"/>`, // Brasil
  `<rect width="16" height="11" fill="#fff"/><path d="M5.5 5.5A2.5 2.5 0 0 1 10.5 5.5Z" fill="#cd2e3a"/><path d="M5.5 5.5A2.5 2.5 0 0 0 10.5 5.5Z" fill="#0047a0"/>
   <path d="M1.6 2.2L3.6 3.8M13.4 7.2L15 8.8M12.4 3.8L14.4 2.2M1.8 8.8L3.6 7.2" stroke="#000" stroke-width="1"/>`, // Korean
  `<rect width="16" height="11" fill="#de2910"/><path d="${starPath(3.4, 3.4, 1.9, .8)}" fill="#ffde00"/><circle cx="6.3" cy="1.6" r=".5" fill="#ffde00"/><circle cx="7.3" cy="2.9" r=".5" fill="#ffde00"/><circle cx="7.3" cy="4.6" r=".5" fill="#ffde00"/><circle cx="6.3" cy="5.8" r=".5" fill="#ffde00"/>`, // Chinese
  `<rect width="16" height="11" fill="#fff"/><circle cx="8" cy="5.5" r="3.1" fill="#bc002d"/>`, // Japanese
];
const flags = svg(16, 11 * flagBodies.length, flagBodies.map((b, i) =>
  `<g transform="translate(0 ${i * 11})"><clipPath id="c${i}"><rect width="16" height="11"/></clipPath><g clip-path="url(#c${i})">${b}</g><rect x=".25" y=".25" width="15.5" height="10.5" fill="none" stroke="rgba(0,0,0,.35)" stroke-width=".5"/></g>`).join(''));

// ---------------------------------------------------------------- logo
const logo = `<div style="position:relative;width:240px;height:52px">
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="52" viewBox="0 0 240 52">
  <defs>
    <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffb52e"/><stop offset=".38" stop-color="#ff7a12"/><stop offset=".62" stop-color="#f7450c"/><stop offset="1" stop-color="#d9190c"/>
    </linearGradient>
    <linearGradient id="lh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  <text x="1" y="33" font-family="Titan One" font-size="37" textLength="202" lengthAdjust="spacingAndGlyphs" fill="#b3170c" opacity=".35" transform="translate(1 1.5)">MINICLIP</text>
  <text x="1" y="33" font-family="Titan One" font-size="37" textLength="202" lengthAdjust="spacingAndGlyphs" fill="url(#lg)" stroke="#e3380b" stroke-width=".6">MINICLIP</text>
  <text x="1" y="33" font-family="Titan One" font-size="37" textLength="202" lengthAdjust="spacingAndGlyphs" fill="url(#lh)" clip-path="inset(0 0 60% 0)">MINICLIP</text>
  <text x="3" y="49.5" font-family="Russo One" font-size="13.2" textLength="198" lengthAdjust="spacing" fill="#8a8a8a" stroke="#8a8a8a" stroke-width=".7">PLAY FREE GAMES</text>
  <g transform="translate(205 13) rotate(-14)">
    <rect x="-3" y="-9.5" width="37" height="13" rx="3" fill="url(#bd)" stroke="#fff" stroke-width="1.3"/>
    <text x="15.5" y="0.2" font-family="SiteTahoma" font-weight="bold" font-size="8.4" fill="#fff" text-anchor="middle">CLASSIC</text>
  </g>
  <defs><linearGradient id="bd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#48b8ff"/><stop offset="1" stop-color="#0079e0"/></linearGradient></defs>
</svg></div>`;

// ---------------------------------------------------------------- favicon + placeholder
const favicon = svg(32, 32, `
  <rect x="1" y="1" width="30" height="30" rx="7" fill="url(#fv)" stroke="#d63b0a" stroke-width="1"/>
  <g transform="translate(2 8)">${gamepad(28, 16, 'fvp').replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`,
  `<linearGradient id="fv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffab2b"/><stop offset="1" stop-color="#ee3d0c"/></linearGradient>`);

const placeholder = `<div style="width:136px;height:114px;background:linear-gradient(#d9ecfb,#9fcbee);position:relative;font:bold 13px SiteTahoma;color:#2a5f8f;text-align:center">
  <div style="position:absolute;left:38px;top:22px">${gamepad(60, 34, 'ph')}</div>
  <div style="position:absolute;left:0;right:0;top:66px">No Picture<br>Yet</div></div>`;

// ---------------------------------------------------------------- misc buttons / icons for game page
const heart = svg(16, 14, `<path d="M8 13.2C3.4 9.8.8 7.4.8 4.5.8 2.4 2.4.8 4.4.8 5.9.8 7.2 1.7 8 3 8.8 1.7 10.1.8 11.6.8 13.6.8 15.2 2.4 15.2 4.5 15.2 7.4 12.6 9.8 8 13.2Z" fill="url(#ht)" stroke="#c2185b" stroke-width=".8"/>`,
  `<linearGradient id="ht" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8ab4"/><stop offset="1" stop-color="#e91e63"/></linearGradient>`);
const fullscreen = svg(14, 14, `
  <path d="M1.5 5V1.5H5M9 1.5H12.5V5M12.5 9V12.5H9M5 12.5H1.5V9" stroke="#0077dd" stroke-width="1.8" fill="none"/>`);
const trophy = svg(16, 16, `<path d="M4 1.5H12V6C12 8.5 10.3 10.3 8 10.3 5.7 10.3 4 8.5 4 6Z" fill="url(#tp)" stroke="#b37400" stroke-width=".7"/>
  <path d="M4 3H1.6C1.6 6 2.8 7 4.6 7.3M12 3H14.4C14.4 6 13.2 7 11.4 7.3" stroke="#b37400" stroke-width="1" fill="none"/>
  <rect x="7" y="10" width="2" height="2.6" fill="#d99a00"/><rect x="4.5" y="12.6" width="7" height="2.4" rx=".6" fill="#8a5a00"/>`,
  `<linearGradient id="tp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff38a"/><stop offset="1" stop-color="#ffb300"/></linearGradient>`);
const reload = svg(14, 14, `<path d="M11.6 5.2A5 5 0 1 0 12 8.4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M12.8 1.6V6H8.4Z" fill="#fff"/>`);

const assets = [
  { out: 'assets/logo/logo.png', w: 240, h: 52, html: logo },
  { out: 'assets/icons/tab-games.png', w: 30, h: 17, html: gamepad(30, 17, 'tg') },
  { out: 'assets/icons/pad-white.png', w: 30, h: 16, html: gamepad(30, 16, 'pw') },
  { out: 'assets/icons/flame.png', w: 18, h: 24, html: flame },
  { out: 'assets/icons/tab-players.png', w: 31, h: 24, html: players },
  { out: 'assets/icons/tab-sketch.png', w: 38, h: 44, html: sketch },
  { out: 'assets/icons/playnow.png', w: 24, h: 24, html: circleArrow(24, '#ffbb33', '#ff8c00', '#f08000') },
  { out: 'assets/icons/circle-arrows.png', w: 24, h: 12, html: `<div style="display:flex">${circleArrow(12, '#4db1ff', '#1a85e6', '#1576cf')}${circleArrow(12, '#4db1ff', '#1a85e6', '#1576cf', -1)}</div>` },
  { out: 'assets/icons/bullet-orange.png', w: 11, h: 11, html: circleArrow(11, '#ffb733', '#ff8a00', '#ee7f00') },
  { out: 'assets/icons/bullet-blue.png', w: 11, h: 11, html: circleArrow(11, '#4db1ff', '#1a85e6', '#1576cf') },
  { out: 'assets/icons/stars.png', w: 11, h: 22, html: starSprite },
  { out: 'assets/icons/stars-big.png', w: 15, h: 30, html: starSpriteBig },
  { out: 'assets/icons/rss.png', w: 12, h: 12, html: rss },
  { out: 'assets/flags/flags.png', w: 16, h: 11 * flagBodies.length, html: flags },
  { out: 'assets/icons/favicon.png', w: 32, h: 32, html: favicon },
  { out: 'assets/icons/heart.png', w: 16, h: 14, html: heart },
  { out: 'assets/icons/fullscreen.png', w: 14, h: 14, html: fullscreen },
  { out: 'assets/icons/trophy.png', w: 16, h: 16, html: trophy },
  { out: 'assets/icons/reload.png', w: 14, h: 14, html: reload },
  { out: 'assets/games/_placeholder.png', w: 136, h: 114, scale: 1, html: placeholder },
];

const n = await renderAll(assets, { only: process.argv[2] });
console.log('rendered', n, 'UI assets');
