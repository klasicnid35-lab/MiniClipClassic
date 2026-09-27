// Number Merge - slide and merge tiles (2048 style)
const N = 4, TS = 92, GAP = 10, BX = 320 - (N * TS + (N + 1) * GAP) / 2, BY = 58;
const TC = { 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e' };

MCC.game({
  id: 'number-merge',
  title: 'Number Merge',
  width: 640, height: 480,
  instructions: ['Use the ARROW keys (or swipe) to slide all the tiles.', 'Tiles with the same number merge into one.', 'Make a 2048 tile to win!'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) {
    g.grid = Array.from({ length: N }, () => Array(N).fill(0));
    g.anim = []; g.wonShown = false;
    this.add(g); this.add(g);
  },

  add(g) {
    const e = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!g.grid[y][x]) e.push([x, y]);
    if (!e.length) return;
    const [x, y] = g.pick(e);
    g.grid[y][x] = Math.random() < 0.9 ? 2 : 4;
    g.anim.push({ x, y, t: 0.15, pop: true });
  },

  move(g, dx, dy) {
    let moved = false;
    const merged = [];
    const order = [0, 1, 2, 3];
    const xs = dx > 0 ? order.slice().reverse() : order;
    const ys = dy > 0 ? order.slice().reverse() : order;
    const done = Array.from({ length: N }, () => Array(N).fill(false));
    for (const y of ys) for (const x of xs) {
      const v = g.grid[y][x];
      if (!v) continue;
      let cx = x, cy = y;
      while (true) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) break;
        if (!g.grid[ny][nx]) { g.grid[ny][nx] = g.grid[cy][cx]; g.grid[cy][cx] = 0; cx = nx; cy = ny; moved = true; continue; }
        if (g.grid[ny][nx] === v && !done[ny][nx]) {
          g.grid[ny][nx] = v * 2; g.grid[cy][cx] = 0; done[ny][nx] = true; moved = true;
          g.addScore(v * 2); merged.push([nx, ny]);
        }
        break;
      }
    }
    if (moved) {
      merged.forEach(([x, y]) => g.anim.push({ x, y, t: 0.15, pop: true }));
      g.sfx(merged.length ? 'coin' : 'tick');
      this.add(g);
      if (!g.wonShown && g.grid.some((r) => r.includes(2048))) { g.wonShown = true; g.over('You Win!', 'You made the 2048 tile!', true); return; }
      if (!this.canMove(g)) g.over('No More Moves', 'Biggest tile: ' + Math.max(...g.grid.flat()));
    }
  },

  canMove(g) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = g.grid[y][x];
      if (!v) return true;
      if (x < N - 1 && g.grid[y][x + 1] === v) return true;
      if (y < N - 1 && g.grid[y + 1][x] === v) return true;
    }
    return false;
  },

  update(g, dt) {
    if (g.anyPressed('ArrowLeft', 'KeyA')) this.move(g, -1, 0);
    else if (g.anyPressed('ArrowRight', 'KeyD')) this.move(g, 1, 0);
    else if (g.anyPressed('ArrowUp', 'KeyW')) this.move(g, 0, -1);
    else if (g.anyPressed('ArrowDown', 'KeyS')) this.move(g, 0, 1);
    for (const a of g.anim) a.t -= dt;
    g.anim = g.anim.filter((a) => a.t > 0);
  },

  demo(g) {
    g.grid = [[2, 4, 8, 16], [0, 2, 32, 64], [0, 0, 128, 256], [2, 0, 4, 1024]];
    g.anim = []; g.score = 12876;
  },

  draw(g, ctx) {
    const bg = ctx.createLinearGradient(0, 0, 0, g.H);
    bg.addColorStop(0, '#fff6e0'); bg.addColorStop(1, '#f2dcb0');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, g.W, g.H);
    g.text('NUMBER MERGE', 24, 26, 26, '#f67c5f', '#7a3a10', 'left', g.FONT_TITLE);
    const pill = (x, label, val) => { ctx.fillStyle = '#bbada0'; g.roundRect(x, 8, 100, 40, 6); ctx.fill(); g.text(label, x + 50, 20, 12, '#eee4da'); g.text(String(val), x + 50, 37, 18, '#fff'); };
    pill(410, 'SCORE', g.score); pill(520, 'BEST', g.best);
    const size = N * TS + (N + 1) * GAP;
    ctx.fillStyle = '#bbada0'; g.roundRect(BX, BY, size, size, 10); ctx.fill();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const px = BX + GAP + x * (TS + GAP), py = BY + GAP + y * (TS + GAP);
      ctx.fillStyle = 'rgba(238,228,218,.35)'; g.roundRect(px, py, TS, TS, 6); ctx.fill();
      const v = g.grid[y][x];
      if (!v) continue;
      const a = g.anim.find((q) => q.x === x && q.y === y);
      const s = a ? 1 + Math.sin((a.t / 0.15) * Math.PI) * 0.12 : 1;
      ctx.save(); ctx.translate(px + TS / 2, py + TS / 2); ctx.scale(s, s);
      ctx.fillStyle = TC[v] || '#3c3a32'; g.roundRect(-TS / 2, -TS / 2, TS, TS, 6); ctx.fill();
      const fs = v < 100 ? 44 : v < 1000 ? 36 : 28;
      g.text(String(v), 0, 3, fs, v <= 4 ? '#776e65' : '#fff', null);
      ctx.restore();
    }
  },
});
