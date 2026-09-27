// Reversi - outflank and flip. Computer uses a weighted-square strategy.
const N = 8, S = 50, OX = 320 - (N * S) / 2 + 60, OY = 40;
const W8 = [
  [100, -20, 10, 5, 5, 10, -20, 100], [-20, -50, -2, -2, -2, -2, -50, -20], [10, -2, 1, 1, 1, 1, -2, 10], [5, -2, 1, 0, 0, 1, -2, 5],
  [5, -2, 1, 0, 0, 1, -2, 5], [10, -2, 1, 1, 1, 1, -2, 10], [-20, -50, -2, -2, -2, -2, -50, -20], [100, -20, 10, 5, 5, 10, -20, 100],
];
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

function flips(b, x, y, p) {
  if (b[y][x]) return [];
  const out = [];
  for (const [dx, dy] of DIRS) {
    const run = [];
    let X = x + dx, Y = y + dy;
    while (X >= 0 && Y >= 0 && X < N && Y < N && b[Y][X] === 3 - p) { run.push([X, Y]); X += dx; Y += dy; }
    if (run.length && X >= 0 && Y >= 0 && X < N && Y < N && b[Y][X] === p) out.push(...run);
  }
  return out;
}
function moves(b, p) { const m = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const f = flips(b, x, y, p); if (f.length) m.push({ x, y, f }); } return m; }

MCC.game({
  id: 'reversi',
  title: 'Reversi',
  width: 640, height: 480,
  scored: false,
  modes: ['1 Player', '2 Players'],
  instructions: ['Place a disc so that it traps a line of your opponent\'s discs.', 'All trapped discs flip to your colour.', 'The player with the most discs at the end wins. You are black.'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) {
    g.b = Array.from({ length: N }, () => Array(N).fill(0));
    g.b[3][3] = g.b[4][4] = 2; g.b[3][4] = g.b[4][3] = 1;
    g.turn = 1; g.think = 0; g.flipAnim = []; g.passMsg = 0;
  },

  count(g, p) { return g.b.flat().filter((v) => v === p).length; },

  apply(g, m) {
    g.b[m.y][m.x] = g.turn;
    for (const [x, y] of m.f) { g.b[y][x] = g.turn; g.flipAnim.push({ x, y, t: 0.3 }); }
    g.sfx('click');
    this.next(g);
  },

  next(g) {
    g.turn = 3 - g.turn;
    if (!moves(g.b, g.turn).length) {
      g.turn = 3 - g.turn;
      if (!moves(g.b, g.turn).length) {
        const a = this.count(g, 1), c = this.count(g, 2);
        g.over(a === c ? 'Draw!' : a > c ? (g.mode ? 'Black Wins!' : 'You Win!') : (g.mode ? 'White Wins!' : 'Computer Wins'), 'Black ' + a + ' - ' + c + ' White', a > c || g.mode === 1);
        return;
      }
      g.passMsg = 1.5;
    }
    g.think = 0.6;
  },

  update(g, dt) {
    for (const f of g.flipAnim) f.t -= dt;
    g.flipAnim = g.flipAnim.filter((f) => f.t > 0);
    if (g.passMsg > 0) g.passMsg -= dt;
    if (g.mode === 0 && g.turn === 2) {
      g.think -= dt;
      if (g.think > 0) return;
      const ms = moves(g.b, 2);
      let best = ms[0], bv = -1e9;
      for (const m of ms) {
        let v = W8[m.y][m.x] + m.f.length * 1.5 + Math.random();
        const nb = g.b.map((r) => r.slice()); nb[m.y][m.x] = 2; m.f.forEach(([x, y]) => (nb[y][x] = 2));
        v -= moves(nb, 1).length * 1.2;
        if (v > bv) { bv = v; best = m; }
      }
      if (best) this.apply(g, best);
      return;
    }
    if (g.mouse.clicked) {
      const x = Math.floor((g.mouse.x - OX) / S), y = Math.floor((g.mouse.y - OY) / S);
      if (x >= 0 && y >= 0 && x < N && y < N) { const f = flips(g.b, x, y, g.turn); if (f.length) this.apply(g, { x, y, f }); else g.sfx('tick'); }
    }
  },

  demo(g) {
    const layout = ['........', '...2....', '..2212..', '..1112..', '..21111.', '...12...', '....1...', '........'];
    layout.forEach((r, y) => [...r].forEach((c, x) => (g.b[y][x] = c === '.' ? 0 : +c)));
  },

  draw(g, ctx) {
    ctx.fillStyle = '#2a1a0a'; ctx.fillRect(0, 0, g.W, g.H);
    ctx.fillStyle = '#6a4a2a'; g.roundRect(OX - 14, OY - 14, N * S + 28, N * S + 28, 12); ctx.fill();
    const felt = ctx.createLinearGradient(0, OY, 0, OY + N * S);
    felt.addColorStop(0, '#2aa84a'); felt.addColorStop(1, '#1a7a32');
    ctx.fillStyle = felt; ctx.fillRect(OX, OY, N * S, N * S);
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.5;
    for (let k = 0; k <= N; k++) { ctx.beginPath(); ctx.moveTo(OX + k * S, OY); ctx.lineTo(OX + k * S, OY + N * S); ctx.moveTo(OX, OY + k * S); ctx.lineTo(OX + N * S, OY + k * S); ctx.stroke(); }
    const human = g.state === 'play' && !(g.mode === 0 && g.turn === 2);
    if (human) for (const m of moves(g.b, g.turn)) { ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.arc(OX + m.x * S + S / 2, OY + m.y * S + S / 2, 6, 0, 7); ctx.fill(); }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = g.b[y][x]; if (!v) continue;
      const fa = g.flipAnim.find((f) => f.x === x && f.y === y);
      const sx = fa ? Math.abs(Math.cos((fa.t / 0.3) * Math.PI)) : 1;
      const cx = OX + x * S + S / 2, cy = OY + y * S + S / 2;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(cx + 2, cy + 3, 20 * sx, 20, 0, 0, 7); ctx.fill();
      const gr = ctx.createRadialGradient(cx - 7, cy - 7, 2, cx, cy, 21);
      if (v === 1) { gr.addColorStop(0, '#777'); gr.addColorStop(1, '#0a0a0a'); } else { gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#c8c8c8'); }
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(cx, cy, 20 * Math.max(0.05, sx), 20, 0, 0, 7); ctx.fill();
    }
    g.text('Reversi', 70, 40, 30, '#ffd24a', '#3a1a00', 'center', g.FONT_TITLE);
    const pc = (y, v, label, cnt) => { ctx.fillStyle = v === 1 ? '#111' : '#eee'; ctx.beginPath(); ctx.arc(40, y, 14, 0, 7); ctx.fill(); ctx.strokeStyle = '#888'; ctx.lineWidth = 1; ctx.stroke(); g.text(label, 62, y - 6, 14, '#fff', null, 'left'); g.text(String(cnt), 62, y + 12, 22, '#ffd24a', null, 'left'); };
    pc(120, 1, g.mode ? 'Black' : 'You', this.count(g, 1));
    pc(190, 2, g.mode ? 'White' : 'Computer', this.count(g, 2));
    if (g.state === 'play') g.text(g.turn === 1 ? 'Black to play' : 'White to play', 70, 260, 16, '#fff', null);
    if (g.passMsg > 0) g.text('No moves - turn passes!', 70, 290, 14, '#ff8a8a', null);
  },
});
