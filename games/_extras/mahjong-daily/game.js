// Mahjong Daily - mahjong solitaire. The deal is built backwards from a
// solved position, so every daily layout can always be cleared.
const TW = 40, TH = 52, DEPTH = 5;

function rng(seed) { let s = seed >>> 0 || 7; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function today() { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }

// layout positions in tile units (x, y, z); 72 tiles
function layout() {
  const P = [];
  for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) P.push({ x, y, z: 0 });
  for (let y = 1; y < 5; y++) for (let x = 2; x < 6; x++) P.push({ x, y, z: 1 });
  for (let y = 2; y < 4; y++) for (let x = 3; x < 5; x++) P.push({ x, y, z: 2 });
  P.push({ x: 3.5, y: 2.5, z: 3 });
  P.push({ x: -1, y: 2.5, z: 0 }, { x: 8, y: 2.5, z: 0 }, { x: 9, y: 2.5, z: 0 });
  return P;
}

// 18 tile faces, 4 of each
const FACES = [];
for (let i = 1; i <= 6; i++) FACES.push({ suit: 'dot', n: i });
for (let i = 1; i <= 5; i++) FACES.push({ suit: 'bam', n: i });
for (const n of ['一', '二', '三']) FACES.push({ suit: 'char', n });
for (const n of ['東', '北']) FACES.push({ suit: 'wind', n });
FACES.push({ suit: 'dragon', n: '中', c: '#d02020' }, { suit: 'dragon', n: '發', c: '#1a8a2a' });

MCC.game({
  id: 'mahjong-daily',
  title: 'Mahjong Daily',
  width: 640, height: 480,
  scored: false,
  instructions: ['Click two matching tiles to remove them from the board.', 'A tile can only be picked when nothing is on top of it and its left or right side is free.', 'Clear all 72 tiles to win. A new layout is dealt every day!'],

  init(g) { g.seed = today(); this.deal(g, g.seed); g.state = 'title'; },
  start(g) { if (g.cleared) { g.seed = today() * 13 + g.randInt(1, 99999); } if (g.cleared || g.stuckOver) this.deal(g, g.seed); },

  deal(g, seed) {
    const r = rng(seed);
    for (let attempt = 0; attempt < 50; attempt++) {
      const tiles = layout().map((p, i) => ({ ...p, i, face: -1, gone: false }));
      const faces = [];
      for (let f = 0; f < FACES.length; f++) for (let k = 0; k < 2; k++) faces.push(f);
      // shuffle the pair list
      for (let i = faces.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [faces[i], faces[j]] = [faces[j], faces[i]]; }
      let ok = true;
      for (const f of faces) {
        const free = tiles.filter((t) => !t.gone && this.isFree(tiles, t));
        if (free.length < 2) { ok = false; break; }
        const a = free.splice(Math.floor(r() * free.length), 1)[0];
        const b = free[Math.floor(r() * free.length)];
        a.face = b.face = f; a.gone = b.gone = true;
      }
      if (ok) { tiles.forEach((t) => (t.gone = false)); g.tiles = tiles; break; }
    }
    g.sel = null; g.hist = []; g.clock = 0; g.cleared = false; g.stuckOver = false; g.hint = null; g.fx = [];
  },

  isFree(tiles, t) {
    const live = tiles.filter((o) => !o.gone && o !== t);
    if (live.some((o) => o.z === t.z + 1 && Math.abs(o.x - t.x) < 1 && Math.abs(o.y - t.y) < 1)) return false;
    const left = live.some((o) => o.z === t.z && Math.abs(o.y - t.y) < 1 && o.x - t.x <= -1 && o.x - t.x > -1.01);
    const right = live.some((o) => o.z === t.z && Math.abs(o.y - t.y) < 1 && o.x - t.x >= 1 && o.x - t.x < 1.01);
    return !left || !right;
  },

  pos(t) { return { x: 140 + t.x * TW - t.z * DEPTH, y: 66 + t.y * TH - t.z * DEPTH }; },

  moves(g) {
    const free = g.tiles.filter((t) => !t.gone && this.isFree(g.tiles, t));
    for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) if (free[i].face === free[j].face) return [free[i], free[j]];
    return null;
  },

  update(g, dt) {
    g.clock += dt;
    if (g.hint) { g.hint.t -= dt; if (g.hint.t <= 0) g.hint = null; }
    for (const f of g.fx) f.t -= dt;
    g.fx = g.fx.filter((f) => f.t > 0);
    if (!g.mouse.clicked) return;
    const mx = g.mouse.x, my = g.mouse.y;
    if (my > 440) {
      if (mx > 20 && mx < 120) { const m = this.moves(g); if (m) { g.hint = { a: m[0], b: m[1], t: 1.5 }; g.clock += 15; } }
      if (mx > 130 && mx < 230 && g.hist.length) { const [a, b] = g.hist.pop(); a.gone = b.gone = false; g.sel = null; g.sfx('blip'); }
      if (mx > 240 && mx < 340) this.shuffle(g);
      return;
    }
    // topmost tile under the pointer
    const hit = g.tiles.filter((t) => !t.gone).sort((a, b) => b.z - a.z || b.x - a.x).find((t) => { const p = this.pos(t); return mx >= p.x && mx < p.x + TW && my >= p.y && my < p.y + TH; });
    if (!hit) return;
    if (!this.isFree(g.tiles, hit)) { g.sfx('hit'); g.fx.push({ t: 0.3, tile: hit, bad: true }); return; }
    if (g.sel === hit) { g.sel = null; return; }
    if (g.sel && g.sel.face === hit.face) {
      g.sel.gone = hit.gone = true; g.hist.push([g.sel, hit]); g.sel = null; g.sfx('coin');
      if (g.tiles.every((t) => t.gone)) { g.cleared = true; g.over('Cleared!', 'Time: ' + Math.floor(g.clock / 60) + ':' + String(Math.floor(g.clock % 60)).padStart(2, '0'), true); return; }
      if (!this.moves(g)) { g.fx.push({ t: 2.5, msg: 'No more moves - try Shuffle or Undo' }); }
    } else { g.sel = hit; g.sfx('click'); }
  },

  shuffle(g) {
    const live = g.tiles.filter((t) => !t.gone);
    const faces = live.map((t) => t.face);
    for (let i = faces.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [faces[i], faces[j]] = [faces[j], faces[i]]; }
    live.forEach((t, i) => (t.face = faces[i]));
    g.sel = null; g.hist = []; g.clock += 30; g.sfx('whoosh');
  },

  face(g, ctx, f, x, y) {
    const F = FACES[f];
    const cx = x + TW / 2, cy = y + TH / 2;
    if (F.suit === 'dot') {
      const spots = { 1: [[0, 0]], 2: [[0, -1], [0, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[F.n];
      const r = F.n === 1 ? 11 : 5.5;
      for (const [dx, dy] of spots) { ctx.fillStyle = F.n === 1 ? '#1a6ad8' : ['#1a6ad8', '#d02020', '#1a8a2a'][(dx + dy + 3) % 3]; ctx.beginPath(); ctx.arc(cx + dx * 9, cy + dy * 13, r, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + dx * 9, cy + dy * 13, r / 2.5, 0, 7); ctx.fill(); }
    } else if (F.suit === 'bam') {
      for (let k = 0; k < F.n; k++) {
        const bx = cx + (k - (F.n - 1) / 2) * 6.5;
        ctx.fillStyle = k % 2 ? '#1a8a2a' : '#2aa84a'; g.roundRect(bx - 2.5, cy - 16, 5, 32, 2); ctx.fill();
        ctx.fillStyle = '#0a5a1a'; ctx.fillRect(bx - 2.5, cy - 1, 5, 2);
      }
    } else {
      ctx.fillStyle = F.c || (F.suit === 'wind' ? '#1a2a5a' : '#1a1a1a');
      ctx.font = 'bold 24px "Noto Sans CJK SC", "Microsoft YaHei", "WenQuanYi Zen Hei", "PingFang SC", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(F.n, cx, cy - (F.suit === 'char' ? 7 : 0));
      if (F.suit === 'char') { ctx.fillStyle = '#c01818'; ctx.font = 'bold 15px "Noto Sans CJK SC", "Microsoft YaHei", "WenQuanYi Zen Hei", sans-serif'; ctx.fillText('萬', cx, cy + 14); }
    }
  },

  demo(g) { for (const t of g.tiles) if ((t.z === 0 && (t.x === 0 || t.x === 7) && t.y > 2) || t.x === 9) t.gone = true; g.sel = g.tiles.find((t) => t.z === 3); },

  draw(g, ctx) {
    const bg = ctx.createRadialGradient(320, 220, 40, 320, 240, 460);
    bg.addColorStop(0, '#8a1a1a'); bg.addColorStop(1, '#3a0808');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, g.W, g.H);
    ctx.strokeStyle = 'rgba(255,200,120,.08)'; ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.arc(320, 240, 40 + i * 40, 0, 7); ctx.stroke(); }
    g.text('Mahjong', 20, 26, 28, '#ffb13a', '#3a0000', 'left', g.FONT_TITLE);
    const left = g.tiles.filter((t) => !t.gone).length;
    g.text('Tiles left: ' + left, 620, 26, 18, '#fff', null, 'right');
    const order = g.tiles.filter((t) => !t.gone).sort((a, b) => a.z - b.z || a.y - b.y || b.x - a.x);
    for (const t of order) {
      const p = this.pos(t);
      // tile body with 3D edge
      ctx.fillStyle = '#b8864a'; g.roundRect(p.x + DEPTH, p.y + DEPTH, TW, TH, 5); ctx.fill();
      ctx.fillStyle = '#e8d8b0'; g.roundRect(p.x + 2, p.y + 2, TW, TH, 5); ctx.fill();
      const sel = g.sel === t || (g.hint && (g.hint.a === t || g.hint.b === t));
      const gr = ctx.createLinearGradient(p.x, p.y, p.x + TW, p.y + TH);
      gr.addColorStop(0, sel ? '#fff7a0' : '#fffdf6'); gr.addColorStop(1, sel ? '#ffd84a' : '#efe6d2');
      ctx.fillStyle = gr; g.roundRect(p.x, p.y, TW, TH, 5); ctx.fill();
      ctx.strokeStyle = sel ? '#e89a00' : '#a88a5a'; ctx.lineWidth = sel ? 2.5 : 1; ctx.stroke();
      this.face(g, ctx, t.face, p.x, p.y);
      const bad = g.fx.find((f) => f.tile === t);
      if (bad) { ctx.fillStyle = 'rgba(255,0,0,.3)'; g.roundRect(p.x, p.y, TW, TH, 5); ctx.fill(); }
    }
    for (const f of g.fx) if (f.msg) g.text(f.msg, 320, 420, 20, '#fff', '#000');
    g.button(20, 444, 100, 30, 'Hint', ['#8fd0ff', '#3a8de0', '#1a5ab0']);
    g.button(130, 444, 100, 30, 'Undo', ['#8fd0ff', '#3a8de0', '#1a5ab0']);
    g.button(240, 444, 100, 30, 'Shuffle', ['#8fd0ff', '#3a8de0', '#1a5ab0']);
    g.text('Time ' + Math.floor(g.clock / 60) + ':' + String(Math.floor(g.clock % 60)).padStart(2, '0'), 620, 460, 18, '#ffd24a', null, 'right');
  },
});
