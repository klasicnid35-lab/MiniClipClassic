// Four in a Row - vs computer (minimax) or 2 players
const COLS = 7, ROWS = 6, S = 58, OX = 320 - (COLS * S) / 2, OY = 80;

function winner(b) {
  const L = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const v = b[y][x]; if (!v) continue;
    for (const [dx, dy] of L) {
      const cells = [[x, y]];
      for (let k = 1; k < 4; k++) { const X = x + dx * k, Y = y + dy * k; if (X < 0 || Y < 0 || X >= COLS || Y >= ROWS || b[Y][X] !== v) break; cells.push([X, Y]); }
      if (cells.length === 4) return { v, cells };
    }
  }
  return null;
}
function drop(b, c) { for (let y = ROWS - 1; y >= 0; y--) if (!b[y][c]) return y; return -1; }
function scoreLine(w, p) {
  const o = 3 - p, mine = w.filter((v) => v === p).length, theirs = w.filter((v) => v === o).length, empty = 4 - mine - theirs;
  if (mine === 4) return 1000; if (mine === 3 && empty === 1) return 6; if (mine === 2 && empty === 2) return 2;
  if (theirs === 3 && empty === 1) return -8; return 0;
}
function evalBoard(b, p) {
  let s = 0;
  for (let y = 0; y < ROWS; y++) if (b[y][3] === p) s += 3;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    const w = []; for (let k = 0; k < 4; k++) { const X = x + dx * k, Y = y + dy * k; if (X < 0 || Y < 0 || X >= COLS || Y >= ROWS) break; w.push(b[Y][X]); }
    if (w.length === 4) s += scoreLine(w, p);
  }
  return s;
}
function minimax(b, depth, a, bt, maxP, p) {
  const w = winner(b);
  if (w) return w.v === p ? 100000 + depth : -100000 - depth;
  const moves = [3, 2, 4, 1, 5, 0, 6].filter((c) => drop(b, c) >= 0);
  if (!moves.length) return 0;
  if (depth === 0) return evalBoard(b, p);
  if (maxP) {
    let v = -Infinity;
    for (const c of moves) { const y = drop(b, c); b[y][c] = p; v = Math.max(v, minimax(b, depth - 1, a, bt, false, p)); b[y][c] = 0; a = Math.max(a, v); if (a >= bt) break; }
    return v;
  }
  let v = Infinity;
  for (const c of moves) { const y = drop(b, c); b[y][c] = 3 - p; v = Math.min(v, minimax(b, depth - 1, a, bt, true, p)); b[y][c] = 0; bt = Math.min(bt, v); if (a >= bt) break; }
  return v;
}

MCC.game({
  id: 'four-in-a-row',
  title: 'Four in a Row',
  width: 640, height: 480,
  scored: false,
  modes: ['1 Player', '2 Players'],
  instructions: ['Click a column to drop your counter.', 'Get four in a row - across, down or diagonally.', 'You are red. Red always goes first.'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) { g.b = Array.from({ length: ROWS }, () => Array(COLS).fill(0)); g.turn = 1; g.anim = null; g.win = null; g.think = 0; },

  play(g, c) {
    const y = drop(g.b, c);
    if (y < 0) return false;
    g.anim = { c, y, v: g.turn, py: OY - S, vy: 0 };
    return true;
  },

  update(g, dt) {
    if (g.anim) {
      const a = g.anim;
      a.vy += 2400 * dt; a.py += a.vy * dt;
      const ty = OY + a.y * S;
      if (a.py >= ty) {
        g.b[a.y][a.c] = a.v; g.anim = null; g.sfx('tick');
        g.win = winner(g.b);
        if (g.win) { g.done = 1.2; g.sfx(g.mode === 0 && g.win.v === 2 ? 'lose' : 'win'); return; }
        if (g.b.every((r) => r.every(Boolean))) { g.over('Draw!', 'The board is full', false); return; }
        g.turn = 3 - g.turn; g.think = 0.4;
      }
      return;
    }
    if (g.done > 0) {
      g.done -= dt;
      if (g.done <= 0) { const red = g.win.v === 1; g.over(g.mode ? (red ? 'Red Wins!' : 'Yellow Wins!') : (red ? 'You Win!' : 'Computer Wins'), 'Four in a row!', red || g.mode === 1); }
      return;
    }
    if (g.mode === 0 && g.turn === 2) {
      g.think -= dt;
      if (g.think <= 0) {
        let best = 3, bv = -Infinity;
        for (const c of [3, 2, 4, 1, 5, 0, 6]) {
          const y = drop(g.b, c); if (y < 0) continue;
          g.b[y][c] = 2; const v = minimax(g.b, 4, -Infinity, Infinity, false, 2) + Math.random(); g.b[y][c] = 0;
          if (v > bv) { bv = v; best = c; }
        }
        this.play(g, best);
      }
      return;
    }
    if (g.mouse.clicked) { const c = Math.floor((g.mouse.x - OX) / S); if (c >= 0 && c < COLS) this.play(g, c); }
    for (let c = 1; c <= COLS; c++) if (g.pressed('Digit' + c)) this.play(g, c - 1);
  },

  demo(g) {
    const moves = [3, 3, 4, 2, 2, 5, 4, 4, 1, 5, 5, 2];
    let v = 1; for (const c of moves) { g.b[drop(g.b, c)][c] = v; v = 3 - v; }
  },

  disc(g, ctx, x, y, v, r = S / 2 - 6) {
    const gr = ctx.createRadialGradient(x - 8, y - 8, 3, x, y, r);
    if (v === 1) { gr.addColorStop(0, '#ff9a8a'); gr.addColorStop(1, '#d81a1a'); } else { gr.addColorStop(0, '#fff6a0'); gr.addColorStop(1, '#e8b000'); }
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r - 6, 0, 7); ctx.stroke();
  },

  draw(g, ctx) {
    const bg = ctx.createLinearGradient(0, 0, 0, g.H);
    bg.addColorStop(0, '#bfe6ff'); bg.addColorStop(1, '#6ab4f0');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, g.W, g.H);
    g.text('Four in a Row', 320, 30, 30, '#fff', '#1a4a8a', 'center', g.FONT_TITLE);
    // hover column preview
    const hc = Math.floor((g.mouse.x - OX) / S);
    if (!g.anim && g.state === 'play' && hc >= 0 && hc < COLS && !(g.mode === 0 && g.turn === 2)) this.disc(g, ctx, OX + hc * S + S / 2, OY - S / 2 + 18, g.turn, S / 2 - 10);
    if (g.anim) this.disc(g, ctx, OX + g.anim.c * S + S / 2, g.anim.py + S / 2, g.anim.v);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (g.b[y][x]) this.disc(g, ctx, OX + x * S + S / 2, OY + y * S + S / 2, g.b[y][x]);
    // board with holes
    ctx.save();
    ctx.beginPath(); ctx.rect(OX - 12, OY - 8, COLS * S + 24, ROWS * S + 16);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { ctx.moveTo(OX + x * S + S / 2 + S / 2 - 6, OY + y * S + S / 2); ctx.arc(OX + x * S + S / 2, OY + y * S + S / 2, S / 2 - 6, 0, Math.PI * 2); }
    const bd = ctx.createLinearGradient(0, OY, 0, OY + ROWS * S);
    bd.addColorStop(0, '#3a7ae8'); bd.addColorStop(1, '#1a4ab8');
    ctx.fillStyle = bd; ctx.fill('evenodd');
    ctx.restore();
    if (g.win) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath(); g.win.cells.forEach(([x, y], i) => (i ? ctx.lineTo(OX + x * S + S / 2, OY + y * S + S / 2) : ctx.moveTo(OX + x * S + S / 2, OY + y * S + S / 2))); ctx.stroke(); }
    const who = g.mode ? (g.turn === 1 ? "Red's turn" : "Yellow's turn") : (g.turn === 1 ? 'Your turn' : 'Computer is thinking...');
    if (g.state === 'play' && !g.win) g.text(who, 320, 452, 20, g.turn === 1 ? '#d81a1a' : '#b88a00', '#fff');
  },
});
