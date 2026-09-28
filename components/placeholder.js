// Generated thumbnails for games that don't have artwork yet.
//
// Every game without a "thumbnail" (or "image") in data/games.json gets an
// original, 2008-style placeholder drawn on a canvas: category colours, a
// glossy highlight, a faint category symbol, the game's title and a small
// category label. They are drawn at exactly the size of real artwork
// (136x114 for the 68x57 thumbnail slots, 548x398 for the 274x199 feature
// slots), so real pictures can replace them later without any layout change.
// Nothing is downloaded, so there are never missing-image icons.

const FONT = 'PHTitle';
const FONT_STACK = `"${FONT}", "Arial Black", Tahoma, Verdana, sans-serif`;

// [top, bottom, outline] per category
const PALETTE = {
  action: ['#ff8a2a', '#c8380a', '#5a1400'],
  adventure: ['#5ad07a', '#16782e', '#063a14'],
  arcade: ['#e858d0', '#8a1a9a', '#380848'],
  board: ['#b8d05a', '#5a7a0a', '#263a04'],
  card: ['#e8586a', '#8a1024', '#3a0410'],
  casual: ['#a8e85a', '#4c9a12', '#1c4a04'],
  driving: ['#ffb04a', '#c8580a', '#502000'],
  fighting: ['#ff5a8a', '#b0104a', '#480020'],
  flying: ['#72d4ff', '#1a78d8', '#08346a'],
  football: ['#4ade9a', '#0e8a52', '#033e24'],
  multiplayer: ['#6aa4ff', '#1a48c8', '#081a5a'],
  other: ['#90aac8', '#46607e', '#18283c'],
  platform: ['#5ae4d4', '#0e9a8a', '#04403a'],
  pool: ['#2ac070', '#086a38', '#022a12'],
  promotional: ['#ffdc5a', '#c8980a', '#503c00'],
  puzzle: ['#b884ff', '#5a2ad0', '#1e0a58'],
  racing: ['#ffe04a', '#e08a0a', '#5a3000'],
  shooting: ['#ff6a4a', '#9a1a0a', '#3a0800'],
  skill: ['#ff9ae0', '#c8409e', '#540a40'],
  sports: ['#86e45a', '#2a961a', '#0c4404'],
  strategy: ['#d0aa82', '#7a5030', '#341c0a'],
  winter: ['#b8ecff', '#4aa8e0', '#0a3e6e'],
  word: ['#52e2e2', '#0e88a8', '#043c4c'],
};

const SIZES = {
  s: { w: 68, h: 57, strip: 11, label: 6.5, pad: 3, max: 13, min: 6.5, lines: 4 },
  l: { w: 274, h: 199, strip: 22, label: 12, pad: 14, max: 40, min: 14, lines: 3 },
};
const SCALE = 2;

// ---------------------------------------------------------------- font
let fontReady = null;
export function loadPlaceholderFont() {
  if (!fontReady) {
    fontReady = (typeof FontFace === 'undefined')
      ? Promise.resolve()
      : new FontFace(FONT, 'url(assets/fonts/lilita-one.woff2)').load()
        .then((f) => { document.fonts.add(f); })
        .catch(() => { /* fall back to Arial Black / Tahoma */ });
  }
  return fontReady;
}

// ---------------------------------------------------------------- symbols
// Faint category symbols, drawn in a 100x100 box.
const SYMBOLS = {
  action(c) { c.beginPath(); c.moveTo(58, 2); c.lineTo(18, 56); c.lineTo(46, 56); c.lineTo(36, 98); c.lineTo(84, 38); c.lineTo(54, 38); c.lineTo(70, 2); c.closePath(); c.fill(); },
  adventure(c) { ring(c, 50, 50, 44, 10); c.beginPath(); c.moveTo(50, 10); c.lineTo(62, 50); c.lineTo(50, 90); c.lineTo(38, 50); c.closePath(); c.fill(); },
  arcade(c) { c.fillRect(14, 70, 72, 24); c.fillRect(45, 30, 10, 42); dot(c, 50, 24, 16); dot(c, 76, 64, 6); },
  board(c) { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if ((x + y) % 2 === 0) c.fillRect(10 + x * 20, 10 + y * 20, 20, 20); ring(c, 50, 50, 44, 0, true); },
  card(c) { roundRect(c, 20, 6, 60, 88, 8); c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.moveTo(50, 22); c.lineTo(70, 50); c.lineTo(50, 78); c.lineTo(30, 50); c.closePath(); c.fill(); c.restore(); },
  casual(c) { ring(c, 50, 50, 42, 8); dot(c, 36, 40, 7); dot(c, 64, 40, 7); c.lineWidth = 8; c.beginPath(); c.arc(50, 52, 24, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); },
  driving(c) { ring(c, 50, 50, 42, 11); dot(c, 50, 50, 12); c.lineWidth = 10; line(c, 12, 46, 88, 46); line(c, 50, 50, 50, 90); },
  fighting(c) { star(c, 50, 50, 46, 22, 8); },
  flying(c) { c.beginPath(); c.moveTo(50, 4); c.lineTo(58, 38); c.lineTo(96, 58); c.lineTo(58, 56); c.lineTo(56, 82); c.lineTo(70, 94); c.lineTo(30, 94); c.lineTo(44, 82); c.lineTo(42, 56); c.lineTo(4, 58); c.lineTo(42, 38); c.closePath(); c.fill(); },
  football(c) { ring(c, 50, 50, 44, 8); poly(c, 50, 50, 16, 5); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; c.lineWidth = 5; line(c, 50 + Math.cos(a) * 16, 50 + Math.sin(a) * 16, 50 + Math.cos(a) * 42, 50 + Math.sin(a) * 42); } },
  multiplayer(c) { dot(c, 32, 34, 15); dot(c, 68, 34, 15); c.beginPath(); c.ellipse(32, 86, 26, 30, 0, Math.PI, 2 * Math.PI); c.fill(); c.beginPath(); c.ellipse(68, 86, 26, 30, 0, Math.PI, 2 * Math.PI); c.fill(); },
  other(c) { c.font = `bold 96px ${FONT_STACK}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 50, 54); },
  platform(c) { c.fillRect(6, 70, 30, 24); c.fillRect(36, 46, 30, 48); c.fillRect(66, 22, 30, 72); },
  pool(c) { dot(c, 50, 50, 44); c.save(); c.globalCompositeOperation = 'destination-out'; dot(c, 50, 46, 20); c.restore(); c.font = `bold 32px ${FONT_STACK}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('8', 50, 48); },
  promotional(c) { star(c, 50, 52, 46, 20, 5); },
  puzzle(c) { c.fillRect(16, 30, 54, 54); dot(c, 43, 22, 12); dot(c, 78, 57, 12); },
  racing(c) { c.fillRect(10, 8, 6, 88); for (let y = 0; y < 4; y++) for (let x = 0; x < 5; x++) if ((x + y) % 2 === 0) c.fillRect(16 + x * 15, 10 + y * 13, 15, 13); },
  shooting(c) { ring(c, 50, 50, 38, 7); ring(c, 50, 50, 14, 6); c.lineWidth = 7; line(c, 50, 2, 50, 30); line(c, 50, 70, 50, 98); line(c, 2, 50, 30, 50); line(c, 70, 50, 98, 50); },
  skill(c) { ring(c, 50, 50, 44, 9); ring(c, 50, 50, 26, 9); dot(c, 50, 50, 9); },
  sports(c) { ring(c, 50, 50, 42, 8); c.lineWidth = 6; c.beginPath(); c.arc(-4, 50, 42, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(104, 50, 42, Math.PI - 0.9, Math.PI + 0.9); c.stroke(); },
  strategy(c) { c.fillRect(24, 30, 52, 66); for (let i = 0; i < 3; i++) c.fillRect(24 + i * 20, 14, 12, 18); c.save(); c.globalCompositeOperation = 'destination-out'; c.fillRect(42, 68, 16, 28); c.restore(); },
  winter(c) { c.lineWidth = 7; for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; const dx = Math.cos(a) * 44, dy = Math.sin(a) * 44; line(c, 50 - dx, 50 - dy, 50 + dx, 50 + dy); } c.lineWidth = 5; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; const x = 50 + Math.cos(a) * 30, y = 50 + Math.sin(a) * 30; line(c, x, y, x + Math.cos(a + 0.7) * 12, y + Math.sin(a + 0.7) * 12); line(c, x, y, x + Math.cos(a - 0.7) * 12, y + Math.sin(a - 0.7) * 12); } },
  word(c) { c.font = `bold 62px ${FONT_STACK}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Ab', 50, 54); },
};
function dot(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill(); }
function ring(c, x, y, r, w, fillIt) { c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); if (fillIt) return; c.lineWidth = w; c.stroke(); }
function line(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
function poly(c, x, y, r, n) { c.beginPath(); for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.fill(); }
function star(c, x, y, r1, r2, n) { c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n; const r = i % 2 ? r2 : r1; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.fill(); }
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); c.fill(); }

// ---------------------------------------------------------------- text layout
function wrap(c, words, maxW) {
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (c.measureText(t).width <= maxW || !cur) cur = t;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

function fitTitle(c, title, maxW, maxH, sz) {
  const words = title.split(/\s+/);
  for (let size = sz.max; size >= sz.min; size -= 0.5) {
    c.font = `${size}px ${FONT_STACK}`;
    const lines = wrap(c, words, maxW);
    const lh = size * 1.02;
    if (lines.length <= sz.lines && lines.length * lh <= maxH && lines.every((l) => c.measureText(l).width <= maxW)) return { size, lines, lh };
  }
  // very long titles: smallest size, cut the last line with an ellipsis
  const size = sz.min;
  c.font = `${size}px ${FONT_STACK}`;
  let lines = wrap(c, words, maxW);
  if (lines.length > sz.lines) lines = lines.slice(0, sz.lines);
  lines = lines.map((l) => { while (c.measureText(l).width > maxW && l.length > 2) l = l.slice(0, -1); return l; });
  const last = lines.length - 1;
  if (lines.join(' ').length < title.length) { let l = lines[last]; while (c.measureText(l + '...').width > maxW && l.length > 1) l = l.slice(0, -1); lines[last] = l.replace(/\s+$/, '') + '...'; }
  return { size, lines, lh: size * 1.02 };
}

// ---------------------------------------------------------------- drawing
function draw(g, key) {
  const sz = SIZES[key];
  const { w, h } = sz;
  const cv = document.createElement('canvas');
  cv.width = w * SCALE;
  cv.height = h * SCALE;
  const c = cv.getContext('2d');
  c.scale(SCALE, SCALE);
  const [top, bottom, dark] = PALETTE[g.category] || PALETTE.other;

  // background: category gradient + fine diagonal stripes + gloss
  const bg = c.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, top);
  bg.addColorStop(1, bottom);
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);
  c.save();
  c.strokeStyle = 'rgba(255,255,255,.08)';
  c.lineWidth = key === 's' ? 1 : 2;
  const step = key === 's' ? 5 : 10;
  for (let x = -h; x < w; x += step) line(c, x, h, x + h, 0);
  c.restore();
  const glow = c.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.35, w * 0.6);
  glow.addColorStop(0, 'rgba(255,255,255,.28)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = glow;
  c.fillRect(0, 0, w, h);

  // category symbol, big and faint on the right
  const sym = SYMBOLS[g.category] || SYMBOLS.other;
  c.save();
  const s = h * (key === 's' ? 0.9 : 0.95) / 100;
  c.translate(w - h * (key === 's' ? 0.62 : 0.72), h * (key === 's' ? 0.02 : 0.0));
  c.scale(s, s);
  c.fillStyle = 'rgba(255,255,255,.2)';
  c.strokeStyle = 'rgba(255,255,255,.2)';
  c.lineCap = 'round';
  sym(c);
  c.restore();

  // glossy top half, Web 2.0 style
  c.fillStyle = 'rgba(255,255,255,.16)';
  c.beginPath();
  c.ellipse(w / 2, -h * 0.18, w * 0.85, h * 0.62, 0, 0, Math.PI * 2);
  c.fill();

  // category strip
  const stripY = h - sz.strip;
  c.fillStyle = 'rgba(0,0,0,.34)';
  c.fillRect(0, stripY, w, sz.strip);
  c.fillStyle = 'rgba(255,255,255,.22)';
  c.fillRect(0, stripY, w, key === 's' ? 0.5 : 1);
  c.fillStyle = '#fff';
  c.textBaseline = 'middle';
  c.textAlign = 'left';
  c.font = `bold ${sz.label}px Tahoma, TahomaFallback, Verdana, sans-serif`;
  const label = String(g.categoryName || 'Other').toUpperCase();
  c.fillText(label, sz.pad, stripY + sz.strip / 2 + 0.5);
  if (key === 'l') {
    c.textAlign = 'right';
    c.fillStyle = 'rgba(255,255,255,.85)';
    c.fillText(g.year ? String(g.year) : 'CLASSIC GAME', w - sz.pad, stripY + sz.strip / 2 + 0.5);
  }

  // title
  const maxW = w - sz.pad * 2;
  const maxH = stripY - sz.pad * 2;
  const t = fitTitle(c, g.title, maxW, maxH, sz);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.font = `${t.size}px ${FONT_STACK}`;
  const y0 = sz.pad + (maxH - t.lines.length * t.lh) / 2 + t.lh / 2 + t.size * 0.04;
  t.lines.forEach((l, i) => {
    const y = y0 + i * t.lh;
    c.lineWidth = Math.max(1.6, t.size * 0.24);
    c.strokeStyle = dark;
    c.strokeText(l, w / 2, y + t.size * 0.07);
    c.strokeText(l, w / 2, y);
    c.fillStyle = '#fff';
    c.fillText(l, w / 2, y);
  });

  // thin light frame
  c.strokeStyle = 'rgba(255,255,255,.3)';
  c.lineWidth = key === 's' ? 0.5 : 1;
  c.strokeRect(0.25, 0.25, w - 0.5, h - 0.5);
  return cv.toDataURL('image/png');
}

const cache = new Map();
const known = new Map();

/** Data URL of the generated picture: size "s" = thumbnail, "l" = feature picture. */
export function placeholder(g, key = 's') {
  const k = g.id + '|' + key;
  let url = cache.get(k);
  if (!url) {
    try { url = draw(g, key); } catch (e) { url = 'assets/games/_placeholder.png'; }
    cache.set(k, url);
  }
  known.set(g.id, g);
  return url;
}

/** Makes a game's placeholder available as a fallback for broken artwork. */
export function remember(g) { known.set(g.id, g); }

// If real artwork fails to load, show the generated placeholder instead of a broken image.
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!img || img.tagName !== 'IMG' || !img.dataset.gid || img.dataset.phDone) return;
  img.dataset.phDone = '1';
  const g = known.get(img.dataset.gid);
  img.src = g ? placeholder(g, img.dataset.ph === 'l' ? 'l' : 's') : 'assets/games/_placeholder.png';
}, true);
