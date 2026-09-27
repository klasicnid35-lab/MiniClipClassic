// Block Drop - falling block puzzle
const SHAPES = {
  I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]],
};
const COL = { I: '#35d0ff', O: '#ffd83a', T: '#b95aff', S: '#4ad84a', Z: '#ff4a4a', J: '#3a6aff', L: '#ff9a2a' };
const CW = 10, CH = 20, SZ = 22, OX = 210, OY = 20;

MCC.game({
  id: 'block-drop',
  title: 'Block Drop',
  width: 640, height: 480,
  instructions: ['LEFT / RIGHT to move, UP to rotate.', 'DOWN drops faster, SPACE drops instantly.', 'Complete a line to clear it. Clear 4 at once for a big bonus!'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) {
    g.board = Array.from({ length: CH }, () => Array(CW).fill(null));
    g.bag = []; g.lines = 0; g.level = 1; g.fall = 0; g.flash = [];
    g.next = this.draw1(g);
    this.spawn(g);
  },

  draw1(g) {
    if (!g.bag.length) g.bag = Object.keys(SHAPES).sort(() => Math.random() - 0.5);
    return g.bag.pop();
  },

  spawn(g) {
    g.cur = { t: g.next, cells: SHAPES[g.next].map((c) => c.slice()), x: 3, y: 0 };
    g.next = this.draw1(g);
    if (!this.fits(g, g.cur.cells, g.cur.x, g.cur.y)) g.over('Game Over', g.lines + ' lines cleared');
  },

  fits(g, cells, x, y) {
    return cells.every(([cx, cy]) => {
      const X = x + cx, Y = y + cy;
      return X >= 0 && X < CW && Y < CH && (Y < 0 || !g.board[Y][X]);
    });
  },

  rotate(g) {
    const c = g.cur;
    if (c.t === 'O') return;
    const n = c.t === 'I' ? 3 : 2;
    const r = c.cells.map(([x, y]) => [n - y, x]);
    for (const k of [0, -1, 1, -2, 2]) if (this.fits(g, r, c.x + k, c.y)) { c.cells = r; c.x += k; g.sfx('click'); return; }
  },

  lock(g) {
    const c = g.cur;
    for (const [x, y] of c.cells) if (c.y + y >= 0) g.board[c.y + y][c.x + x] = c.t;
    const full = [];
    for (let y = 0; y < CH; y++) if (g.board[y].every(Boolean)) full.push(y);
    if (full.length) {
      g.addScore([0, 100, 300, 500, 1200][full.length] * g.level);
      g.lines += full.length;
      g.level = 1 + Math.floor(g.lines / 10);
      for (const y of full) { g.board.splice(y, 1); g.board.unshift(Array(CW).fill(null)); }
      g.flash = full.map((y) => ({ y, t: 0.3 }));
      g.sfx(full.length === 4 ? 'win' : 'coin');
    } else g.sfx('tick');
    this.spawn(g);
  },

  update(g, dt) {
    const c = g.cur;
    const tryMove = (dx, dy) => { if (this.fits(g, c.cells, c.x + dx, c.y + dy)) { c.x += dx; c.y += dy; return true; } return false; };
    g.das = g.das || 0;
    const left = g.anyDown('ArrowLeft', 'KeyA'), right = g.anyDown('ArrowRight', 'KeyD');
    if (g.anyPressed('ArrowLeft', 'KeyA')) { tryMove(-1, 0); g.das = -0.17; }
    if (g.anyPressed('ArrowRight', 'KeyD')) { tryMove(1, 0); g.das = -0.17; }
    if (left || right) { g.das += dt; if (g.das > 0.05) { g.das = 0; tryMove(left ? -1 : 1, 0); } }
    if (g.anyPressed('ArrowUp', 'KeyW', 'KeyX')) this.rotate(g);
    if (g.pressed('Space')) { while (tryMove(0, 1)) g.addScore(2); this.lock(g); return; }
    const speed = Math.max(0.06, 0.8 - (g.level - 1) * 0.07);
    g.fall += dt * (g.anyDown('ArrowDown', 'KeyS') ? 12 : 1);
    if (g.fall >= speed) {
      g.fall = 0;
      if (!tryMove(0, 1)) this.lock(g);
      else if (g.anyDown('ArrowDown', 'KeyS')) g.addScore(1);
    }
    for (const f of g.flash) f.t -= dt;
    g.flash = g.flash.filter((f) => f.t > 0);
  },

  demo(g) {
    const rows = ['..........', '..........', '....T.....', '...TTT....', 'I.....OO..', 'I.ZZ..OOL.', 'I..ZZJLLL.', 'ISSJJJTTTZ', 'SSOOLTLTZZ', 'JJOOLLLTZ.'];
    rows.forEach((r, i) => { for (let x = 0; x < CW; x++) g.board[CH - rows.length + i][x] = r[x] === '.' ? null : r[x]; });
    for (let y = 0; y < CH - 7; y++) g.board[y] = Array(CW).fill(null);
    g.cur = { t: 'L', cells: SHAPES.L.map((c) => c.slice()), x: 6, y: 6 };
    g.next = 'I'; g.score = 18450; g.lines = 34; g.level = 4;
  },

  cell(g, ctx, x, y, t, a = 1) {
    ctx.globalAlpha = a;
    const gr = ctx.createLinearGradient(x, y, x + SZ, y + SZ);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.25, COL[t]); gr.addColorStop(1, COL[t]);
    ctx.fillStyle = gr; ctx.fillRect(x + 1, y + 1, SZ - 2, SZ - 2);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 1, y + SZ - 5, SZ - 2, 4);
    ctx.globalAlpha = 1;
  },

  draw(g, ctx) {
    const bg = ctx.createLinearGradient(0, 0, 0, g.H);
    bg.addColorStop(0, '#231a4a'); bg.addColorStop(1, '#4a2a7a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, g.W, g.H);
    for (let i = 0; i < 18; i++) { ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect((i * 97) % 640, (i * 53) % 480, 40, 40); }
    ctx.fillStyle = '#0a0a1e'; ctx.fillRect(OX - 4, OY - 4, CW * SZ + 8, CH * SZ + 8);
    ctx.strokeStyle = '#8ab4ff'; ctx.lineWidth = 3; ctx.strokeRect(OX - 4, OY - 4, CW * SZ + 8, CH * SZ + 8);
    ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
    for (let x = 0; x <= CW; x++) { ctx.beginPath(); ctx.moveTo(OX + x * SZ, OY); ctx.lineTo(OX + x * SZ, OY + CH * SZ); ctx.stroke(); }
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (g.board[y][x]) this.cell(g, ctx, OX + x * SZ, OY + y * SZ, g.board[y][x]);
    const c = g.cur;
    if (c) {
      let gy = c.y; while (this.fits(g, c.cells, c.x, gy + 1)) gy++;
      for (const [x, y] of c.cells) if (gy + y >= 0) this.cell(g, ctx, OX + (c.x + x) * SZ, OY + (gy + y) * SZ, c.t, 0.22);
      for (const [x, y] of c.cells) if (c.y + y >= 0) this.cell(g, ctx, OX + (c.x + x) * SZ, OY + (c.y + y) * SZ, c.t);
    }
    for (const f of g.flash) { ctx.fillStyle = 'rgba(255,255,255,' + f.t * 3 + ')'; ctx.fillRect(OX, OY + f.y * SZ, CW * SZ, SZ); }
    // side panels
    const box = (x, y, w, h, title) => {
      ctx.fillStyle = 'rgba(0,0,0,.35)'; g.roundRect(x, y, w, h, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 2; ctx.stroke();
      g.text(title, x + w / 2, y + 18, 18, '#ffd24a', null);
    };
    box(20, 20, 170, 80, 'SCORE'); g.text(String(g.score), 105, 62, 28, '#fff', null);
    box(20, 115, 170, 70, 'LINES'); g.text(String(g.lines), 105, 155, 24, '#fff', null);
    box(20, 200, 170, 70, 'LEVEL'); g.text(String(g.level), 105, 240, 24, '#fff', null);
    box(450, 20, 170, 110, 'NEXT');
    if (g.next) for (const [x, y] of SHAPES[g.next]) this.cell(g, ctx, 490 + x * SZ + (g.next === 'O' ? -11 : 0) + (g.next === 'I' ? -11 : 0), 60 + y * SZ, g.next);
    box(450, 145, 170, 70, 'BEST'); g.text(String(g.best), 535, 185, 22, '#fff', null);
    g.text('BLOCK', 535, 300, 40, '#ff9a2a', '#5a2000', 'center', g.FONT_TITLE);
    g.text('DROP', 535, 344, 40, '#35d0ff', '#003a5a', 'center', g.FONT_TITLE);
  },
});
