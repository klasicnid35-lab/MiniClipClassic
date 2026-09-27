// Jewel Swap - match-3 against the clock
const N = 8, S = 52, OX = 196, OY = 28;
const GEMS = [
  { c1: '#ff9a9a', c2: '#e01818', sides: 4 }, { c1: '#9dffa0', c2: '#18a818', sides: 6 }, { c1: '#9ad0ff', c2: '#1860e0', sides: 0 },
  { c1: '#fff39a', c2: '#e0b000', sides: 3 }, { c1: '#f0a0ff', c2: '#a018d0', sides: 5 }, { c1: '#ffffff', c2: '#9aa8b8', sides: 8 }, { c1: '#ffc88a', c2: '#e86a00', sides: 4, rot: 0.785 },
];

MCC.game({
  id: 'jewel-swap',
  title: 'Jewel Swap',
  width: 640, height: 480,
  instructions: ['Click a jewel, then a jewel next to it, to swap them.', 'Line up 3 or more of the same jewel to clear them.', 'Every match adds time to the clock. How long can you last?'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) {
    g.b = [];
    for (let y = 0; y < N; y++) { g.b[y] = []; for (let x = 0; x < N; x++) { let t; do { t = g.randInt(0, 6); } while ((x > 1 && g.b[y][x - 1].t === t && g.b[y][x - 2].t === t) || (y > 1 && g.b[y - 1][x].t === t && g.b[y - 2][x].t === t)); g.b[y][x] = { t, oy: 0, pop: 0 }; } }
    if (!this.anyMove(g)) return this.start(g);
    g.sel = null; g.busy = 0; g.combo = 0; g.timeLeft = 60; g.swap = null; g.floats = [];
  },

  matches(g) {
    const m = new Set();
    for (let y = 0; y < N; y++) for (let x = 0; x < N - 2; x++) { const t = g.b[y][x].t; if (t >= 0 && g.b[y][x + 1].t === t && g.b[y][x + 2].t === t) { m.add(y * N + x); m.add(y * N + x + 1); m.add(y * N + x + 2); } }
    for (let x = 0; x < N; x++) for (let y = 0; y < N - 2; y++) { const t = g.b[y][x].t; if (t >= 0 && g.b[y + 1][x].t === t && g.b[y + 2][x].t === t) { m.add(y * N + x); m.add((y + 1) * N + x); m.add((y + 2) * N + x); } }
    return m;
  },

  swapCells(g, a, b) { const t = g.b[a.y][a.x]; g.b[a.y][a.x] = g.b[b.y][b.x]; g.b[b.y][b.x] = t; },

  anyMove(g) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) for (const [dx, dy] of [[1, 0], [0, 1]]) {
      if (x + dx >= N || y + dy >= N) continue;
      this.swapCells(g, { x, y }, { x: x + dx, y: y + dy });
      const ok = this.matches(g).size > 0;
      this.swapCells(g, { x, y }, { x: x + dx, y: y + dy });
      if (ok) return true;
    }
    return false;
  },

  resolve(g) {
    const m = this.matches(g);
    if (!m.size) { g.combo = 0; if (!this.anyMove(g)) { g.floats.push({ x: 404, y: 240, t: 1.5, s: 'Shuffle!' }); this.start2(g); } return false; }
    g.combo++;
    const pts = m.size * 10 * g.combo;
    g.addScore(pts);
    g.timeLeft = Math.min(99, g.timeLeft + m.size * 0.4);
    let sx = 0, sy = 0;
    m.forEach((i) => { sx += i % N; sy += Math.floor(i / N); g.b[Math.floor(i / N)][i % N].t = -1; });
    g.floats.push({ x: OX + (sx / m.size + 0.5) * S, y: OY + (sy / m.size + 0.5) * S, t: 0.9, s: '+' + pts });
    g.sfx(g.combo > 1 ? 'win' : 'coin');
    // gravity
    for (let x = 0; x < N; x++) {
      let w = N - 1;
      for (let y = N - 1; y >= 0; y--) if (g.b[y][x].t >= 0) { const c = g.b[y][x]; if (w !== y) { c.oy -= (w - y) * S; g.b[w][x] = c; } w--; }
      for (let y = w; y >= 0; y--) g.b[y][x] = { t: g.randInt(0, 6), oy: -(w + 1) * S - 20, pop: 0 };
    }
    g.busy = 0.3;
    return true;
  },

  start2(g) { const keep = { s: g.score, t: g.timeLeft, f: g.floats }; this.start(g); g.score = keep.s; g.timeLeft = keep.t; g.floats = keep.f; },

  update(g, dt) {
    g.timeLeft -= dt;
    if (g.timeLeft <= 0) { g.timeLeft = 0; g.over("Time's Up!", 'Final score: ' + g.score); return; }
    for (const row of g.b) for (const c of row) if (c.oy < 0) c.oy = Math.min(0, c.oy + 900 * dt);
    for (const f of g.floats) { f.t -= dt; f.y -= 30 * dt; }
    g.floats = g.floats.filter((f) => f.t > 0);
    if (g.swap) {
      g.swap.t += dt * 6;
      if (g.swap.t >= 1) {
        const sw = g.swap; g.swap = null;
        this.swapCells(g, sw.a, sw.b);
        if (!sw.back) {
          if (this.matches(g).size) this.resolve(g);
          else { g.swap = { a: sw.a, b: sw.b, t: 0, back: true }; g.sfx('hit'); }
        }
      }
      return;
    }
    if (g.busy > 0) { g.busy -= dt; if (g.busy <= 0) { if (!this.resolve(g)) g.busy = 0; } return; }
    if (g.mouse.clicked) {
      const x = Math.floor((g.mouse.x - OX) / S), y = Math.floor((g.mouse.y - OY) / S);
      if (x < 0 || y < 0 || x >= N || y >= N) { g.sel = null; return; }
      if (g.sel && Math.abs(g.sel.x - x) + Math.abs(g.sel.y - y) === 1) {
        const a = g.sel, b = { x, y };
        g.sel = null;
        g.swap = { a, b, t: 0, back: false };
        g.sfx('whoosh');
      } else { g.sel = { x, y }; g.sfx('click'); }
    }
  },

  gem(g, ctx, t, cx, cy, r) {
    const G = GEMS[t];
    const gr = ctx.createRadialGradient(cx - r / 3, cy - r / 3, 1, cx, cy, r);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.3, G.c1); gr.addColorStop(1, G.c2);
    ctx.fillStyle = gr;
    ctx.beginPath();
    if (!G.sides) ctx.arc(cx, cy, r, 0, 7);
    else for (let i = 0; i < G.sides; i++) { const a = (G.rot || -Math.PI / 2) + (i / G.sides) * Math.PI * 2; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(cx - r * 0.25, cy - r * 0.35, r * 0.35, r * 0.18, -0.5, 0, 7); ctx.fill();
  },

  demo(g) { g.sel = { x: 3, y: 4 }; g.score = 8420; g.timeLeft = 47; },

  draw(g, ctx) {
    const bg = ctx.createLinearGradient(0, 0, g.W, g.H);
    bg.addColorStop(0, '#2a0a4a'); bg.addColorStop(1, '#0a2a5a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, g.W, g.H);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; g.roundRect(OX - 8, OY - 8, N * S + 16, N * S + 16, 12); ctx.fill();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { ctx.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.12)'; ctx.fillRect(OX + x * S, OY + y * S, S, S); }
    if (g.sel) { ctx.strokeStyle = '#ffe45a'; ctx.lineWidth = 3; g.roundRect(OX + g.sel.x * S + 2, OY + g.sel.y * S + 2, S - 4, S - 4, 8); ctx.stroke(); }
    ctx.save(); ctx.beginPath(); ctx.rect(OX, OY, N * S, N * S); ctx.clip();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const c = g.b[y][x];
      if (c.t < 0) continue;
      let px = OX + x * S + S / 2, py = OY + y * S + S / 2 + c.oy;
      if (g.swap) {
        const { a, b } = g.swap; const k = g.swap.t;
        if (a.x === x && a.y === y) { px += (b.x - a.x) * S * k; py += (b.y - a.y) * S * k; }
        if (b.x === x && b.y === y) { px += (a.x - b.x) * S * k; py += (a.y - b.y) * S * k; }
      }
      const pulse = g.sel && g.sel.x === x && g.sel.y === y ? 1 + Math.sin(g.frame * 0.2) * 0.06 : 1;
      this.gem(g, ctx, c.t, px, py, 19 * pulse);
    }
    ctx.restore();
    for (const f of g.floats) g.text(f.s, f.x, f.y, 24, '#ffe45a', '#5a2a00');
    g.text('Jewel', 98, 50, 36, '#f0a0ff', '#3a0a5a', 'center', g.FONT_TITLE);
    g.text('Swap', 98, 88, 36, '#9ad0ff', '#0a2a5a', 'center', g.FONT_TITLE);
    g.text('SCORE', 98, 150, 16, '#bfe6ff', null); g.text(String(g.score), 98, 176, 26, '#fff', null);
    g.text('BEST', 98, 220, 16, '#bfe6ff', null); g.text(String(g.best), 98, 244, 22, '#fff', null);
    g.text('TIME', 98, 290, 16, '#bfe6ff', null);
    ctx.fillStyle = 'rgba(255,255,255,.2)'; g.roundRect(28, 305, 140, 18, 9); ctx.fill();
    ctx.fillStyle = g.timeLeft < 10 ? '#ff4a4a' : '#4ad84a'; g.roundRect(28, 305, 140 * Math.min(1, g.timeLeft / 60), 18, 9); ctx.fill();
    g.text(String(Math.ceil(g.timeLeft)), 98, 342, 22, '#fff', null);
  },
});
