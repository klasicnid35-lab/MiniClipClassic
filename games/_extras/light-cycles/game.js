// Light Cycles - trap your opponent behind your trail. First to 3 rounds.
const C = 8, GW = 80, GH = 54, OY = 48;

MCC.game({
  id: 'light-cycles',
  title: 'Light Cycles',
  width: 640, height: 480,
  scored: false,
  modes: ['1 Player', '2 Players'],
  instructions: ['Player 1 (blue): W A S D.   Player 2 (orange): ARROW keys.', 'Your cycle leaves a wall of light behind it.', "Don't crash into walls or trails. Win 3 rounds to win the match!"],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) { g.wins = [0, 0]; this.round(g); },

  round(g) {
    g.grid = new Uint8Array(GW * GH);
    g.bikes = [
      { x: 15, y: 27, dx: 1, dy: 0, q: [], c: '#3ad0ff', id: 1, alive: true },
      { x: 64, y: 27, dx: -1, dy: 0, q: [], c: '#ff9a2a', id: 2, alive: true },
    ];
    for (const b of g.bikes) g.grid[b.y * GW + b.x] = b.id;
    g.step = 0; g.pause = 1.2; g.msg = 'Get Ready!';
  },

  free(g, x, y) { return x >= 0 && y >= 0 && x < GW && y < GH && !g.grid[y * GW + x]; },

  space(g, x, y, limit) {
    const seen = new Set(), st = [[x, y]];
    let n = 0;
    while (st.length && n < limit) {
      const [cx, cy] = st.pop(), k = cy * GW + cx;
      if (seen.has(k) || !this.free(g, cx, cy)) continue;
      seen.add(k); n++;
      st.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    return n;
  },

  ai(g, b, foe) {
    const dirs = [[b.dx, b.dy], [b.dy, -b.dx], [-b.dy, b.dx]];
    let best = null, bs = -1;
    for (const [dx, dy] of dirs) {
      const nx = b.x + dx, ny = b.y + dy;
      if (!this.free(g, nx, ny)) continue;
      let s = this.space(g, nx, ny, 400) * 10;
      s -= Math.hypot(nx - foe.x, ny - foe.y) * 0.5;
      if (dx === b.dx && dy === b.dy) s += 6;
      s += Math.random() * 4;
      if (s > bs) { bs = s; best = [dx, dy]; }
    }
    if (best) { b.dx = best[0]; b.dy = best[1]; }
  },

  update(g, dt) {
    const [p1, p2] = g.bikes;
    const turn = (b, keys) => {
      const map = { [keys[0]]: [0, -1], [keys[1]]: [0, 1], [keys[2]]: [-1, 0], [keys[3]]: [1, 0] };
      for (const k in map) if (g.pressed(k)) b.q.push(map[k]);
    };
    turn(p1, ['KeyW', 'KeyS', 'KeyA', 'KeyD']);
    if (g.mode === 0) turn(p1, ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
    else turn(p2, ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
    if (g.pause > 0) { g.pause -= dt; if (g.pause <= 0) { g.msg = null; if (g.roundOver) { g.roundOver = false; if (Math.max(...g.wins) >= 3) { const w = g.wins[0] >= 3; g.over(w ? (g.mode ? 'Blue Wins!' : 'You Win!') : (g.mode ? 'Orange Wins!' : 'Computer Wins'), g.wins[0] + ' - ' + g.wins[1], w || g.mode === 1); return; } this.round(g); } } return; }
    g.step += dt;
    while (g.step > 0.045) {
      g.step -= 0.045;
      for (const b of g.bikes) {
        while (b.q.length) { const [dx, dy] = b.q.shift(); if (dx !== -b.dx || dy !== -b.dy) { b.dx = dx; b.dy = dy; break; } }
      }
      if (g.mode === 0) this.ai(g, p2, p1);
      const next = g.bikes.map((b) => ({ x: b.x + b.dx, y: b.y + b.dy }));
      g.bikes.forEach((b, i) => { if (!this.free(g, next[i].x, next[i].y)) b.alive = false; });
      if (next[0].x === next[1].x && next[0].y === next[1].y) g.bikes.forEach((b) => (b.alive = false));
      g.bikes.forEach((b, i) => { if (b.alive) { b.x = next[i].x; b.y = next[i].y; g.grid[b.y * GW + b.x] = b.id; } });
      if (!p1.alive || !p2.alive) {
        g.sfx('explode');
        if (p1.alive) { g.wins[0]++; g.msg = g.mode ? 'Blue takes the round!' : 'You take the round!'; }
        else if (p2.alive) { g.wins[1]++; g.msg = g.mode ? 'Orange takes the round!' : 'Computer takes the round!'; }
        else g.msg = 'Draw!';
        g.pause = 1.6; g.roundOver = true;
        return;
      }
    }
  },

  demo(g) {
    g.pause = 0; g.msg = null;
    const path = (b, moves) => { for (const [dx, dy, n] of moves) { for (let i = 0; i < n; i++) { b.x += dx; b.y += dy; g.grid[b.y * GW + b.x] = b.id; } b.dx = dx; b.dy = dy; } };
    path(g.bikes[0], [[1, 0, 14], [0, -1, 12], [1, 0, 10], [0, 1, 20], [1, 0, 6]]);
    path(g.bikes[1], [[-1, 0, 10], [0, 1, 14], [-1, 0, 12], [0, -1, 26], [-1, 0, 5]]);
    g.wins = [1, 1];
  },

  draw(g, ctx) {
    ctx.fillStyle = '#02040c'; ctx.fillRect(0, 0, g.W, g.H);
    ctx.strokeStyle = 'rgba(40,120,255,.18)'; ctx.lineWidth = 1;
    for (let x = 0; x <= GW; x += 4) { ctx.beginPath(); ctx.moveTo(x * C, OY); ctx.lineTo(x * C, OY + GH * C); ctx.stroke(); }
    for (let y = 0; y <= GH; y += 4) { ctx.beginPath(); ctx.moveTo(0, OY + y * C); ctx.lineTo(GW * C, OY + y * C); ctx.stroke(); }
    ctx.strokeStyle = '#3a8aff'; ctx.lineWidth = 2; ctx.strokeRect(1, OY, GW * C - 2, GH * C);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const v = g.grid[y * GW + x];
      if (v) { ctx.fillStyle = v === 1 ? 'rgba(58,208,255,.75)' : 'rgba(255,154,42,.75)'; ctx.fillRect(x * C + 1, OY + y * C + 1, C - 2, C - 2); }
    }
    for (const b of g.bikes) {
      ctx.save(); ctx.shadowColor = b.c; ctx.shadowBlur = 14;
      ctx.fillStyle = '#fff'; ctx.fillRect(b.x * C - 1, OY + b.y * C - 1, C + 2, C + 2);
      ctx.restore();
    }
    g.text('LIGHT CYCLES', 320, 22, 26, '#3ad0ff', '#001a3a', 'center', g.FONT_TITLE);
    g.text(String(g.wins[0]), 30, 22, 26, '#3ad0ff', null);
    g.text(String(g.wins[1]), 610, 22, 26, '#ff9a2a', null);
    if (g.msg && g.state === 'play') g.text(g.msg, 320, 250, 32, '#fff', '#000');
  },
});
