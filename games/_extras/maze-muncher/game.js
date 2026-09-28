// Maze Muncher - eat the dots, dodge the ghosts, power pills turn the tables
const MAZE = [
  '###################',
  '#o.......#.......o#',
  '#.##.###.#.###.##.#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.### # ###.####',
  '   #.#   G   #.#   ',
  '####.# ##-## #.####',
  '    .  #GGG#  .    ',
  '####.# ##### #.####',
  '   #.#       #.#   ',
  '####.# ##### #.####',
  '#........#........#',
  '#.##.###.#.###.##.#',
  '#o.#.....P.....#.o#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '#.######.#.######.#',
  '#.................#',
  '###################',
];
const T = 22, OX = (640 - 19 * T) / 2, OY = 12;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const GC = ['#ff3a3a', '#ffb0e0', '#3ae8ff', '#ffb03a'];

MCC.game({
  id: 'maze-muncher',
  title: 'Maze Muncher',
  width: 640, height: 480,
  instructions: ['ARROW keys or WASD to move through the maze.', 'Eat every dot to clear the level.', 'Big power pills let you eat the ghosts for a short time!'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) { g.lives = 3; g.level = 1; this.load(g); },

  load(g) {
    g.dots = new Set(); g.pills = new Set(); g.walls = new Set();
    MAZE.forEach((r, y) => [...r].forEach((c, x) => {
      const k = x + ',' + y;
      if (c === '#') g.walls.add(k);
      if (c === '.') g.dots.add(k);
      if (c === 'o') g.pills.add(k);
      if (c === 'P') g.home = { x, y };
    }));
    this.reset(g);
  },

  reset(g) {
    g.pac = { x: g.home.x, y: g.home.y, d: 'left', want: 'left', t: 0, mouth: 0 };
    g.ghosts = [[9, 7], [8, 9], [9, 9], [10, 9]].map(([x, y], i) => ({ x, y, px: x, py: y, d: 'up', t: 0, c: GC[i], out: i * 3, eaten: false }));
    g.fright = 0; g.ready = 1.2; g.combo = 0;
  },

  open(g, x, y, ghost) {
    if (x < 0) x = 18; if (x > 18) x = 0;
    const c = MAZE[y] && MAZE[y][x];
    if (!c || c === '#') return false;
    if (c === '-' && !ghost) return false;
    return true;
  },

  step(g, e, speed, dt, choose) {
    e.t += dt * speed;
    while (e.t >= 1) {
      e.t -= 1;
      e.px = e.x; e.py = e.y;
      if (choose) choose();
      const [dx, dy] = DIRS[e.d];
      if (this.open(g, e.x + dx, e.y + dy, e.ghost)) { e.x += dx; e.y += dy; if (e.x < 0) { e.x = 18; e.px = 18; } if (e.x > 18) { e.x = 0; e.px = 0; } }
      else { e.t = 0; e.blocked = true; return; }
      e.blocked = false;
    }
  },

  update(g, dt) {
    if (g.ready > 0) { g.ready -= dt; return; }
    const p = g.pac;
    for (const [k, d] of [['ArrowUp', 'up'], ['KeyW', 'up'], ['ArrowDown', 'down'], ['KeyS', 'down'], ['ArrowLeft', 'left'], ['KeyA', 'left'], ['ArrowRight', 'right'], ['KeyD', 'right']]) if (g.down(k) || g.pressed(k)) p.want = d;
    p.mouth += dt * 12;
    this.step(g, p, 7.5 + g.level * 0.3, dt, () => {
      const [wx, wy] = DIRS[p.want];
      if (this.open(g, p.x + wx, p.y + wy)) p.d = p.want;
      const k = p.x + ',' + p.y;
      if (g.dots.delete(k)) { g.addScore(10); if (g.frame % 2) g.sfx('tick'); }
      if (g.pills.delete(k)) { g.addScore(50); g.fright = Math.max(3, 8 - g.level); g.combo = 0; g.sfx('coin'); g.ghosts.forEach((q) => { if (q.out <= 0 && !q.eaten) q.d = { up: 'down', down: 'up', left: 'right', right: 'left' }[q.d]; }); }
    });
    if (p.blocked) { const [wx, wy] = DIRS[p.want]; if (this.open(g, p.x + wx, p.y + wy)) { p.d = p.want; p.t = 0.99; } }
    if (g.fright > 0) g.fright -= dt;
    g.ghosts.forEach((q, i) => {
      if (q.out > 0) { q.out -= dt; return; }
      q.ghost = true;
      const sp = q.eaten ? 14 : g.fright > 0 ? 4 : 6.4 + g.level * 0.3;
      this.step(g, q, sp, dt, () => {
        if (q.eaten && q.x === 9 && q.y === 9) q.eaten = false;
        let tx = p.x, ty = p.y;
        if (i === 1) { tx += DIRS[p.d][0] * 4; ty += DIRS[p.d][1] * 4; }
        if (i === 2) { tx = 18 - p.x; ty = 20 - p.y; }
        if (i === 3 && Math.hypot(q.x - p.x, q.y - p.y) < 6) { tx = 0; ty = 20; }
        if (q.eaten) { tx = 9; ty = 9; }
        else if (q.y >= 8 && q.y <= 9 && q.x >= 8 && q.x <= 10) { tx = 9; ty = 6; }
        const back = { up: 'down', down: 'up', left: 'right', right: 'left' }[q.d];
        const opts = Object.keys(DIRS).filter((d) => d !== back && this.open(g, q.x + DIRS[d][0], q.y + DIRS[d][1], true));
        if (!opts.length) { q.d = back; return; }
        if (g.fright > 0 && !q.eaten) { q.d = g.pick(opts); return; }
        opts.sort((a, b) => Math.hypot(q.x + DIRS[a][0] - tx, q.y + DIRS[a][1] - ty) - Math.hypot(q.x + DIRS[b][0] - tx, q.y + DIRS[b][1] - ty));
        q.d = opts[0];
      });
      const gx = q.x + (q.x - q.px) * 0, gy = q.y;
      if (Math.abs(q.x - p.x) + Math.abs(gy - p.y) === 0 || (Math.abs(q.x - p.x) + Math.abs(q.y - p.y) === 1 && q.px === p.x && q.py === p.y)) {
        if (q.eaten) return;
        if (g.fright > 0) { q.eaten = true; g.combo++; g.addScore(200 * g.combo); g.sfx('win'); }
        else {
          g.lives--; g.sfx('lose');
          if (g.lives <= 0) { g.over('Game Over', 'You reached level ' + g.level); return; }
          this.reset(g);
        }
      }
    });
    if (!g.dots.size && !g.pills.size) { g.level++; g.addScore(500); g.sfx('win'); this.load(g); }
  },

  demo(g) {
    g.ready = 0;
    for (let x = 1; x < 9; x++) g.dots.delete(x + ',13'); for (let y = 13; y < 20; y++) g.dots.delete('1,' + y);
    g.pac = { x: 5, y: 13, d: 'right', want: 'right', t: 0, mouth: 0.6 };
    g.ghosts[0].x = 12; g.ghosts[0].y = 13; g.ghosts[0].out = 0; g.ghosts[1].x = 4; g.ghosts[1].y = 5; g.ghosts[1].out = 0;
    g.score = 2460;
  },

  draw(g, ctx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, g.W, g.H);
    const lerp = (e) => {
      let fx = e.x, fy = e.y;
      const moving = !e.blocked && e.t > 0;
      if (moving) { const [dx, dy] = DIRS[e.d]; fx = e.x + dx * e.t; fy = e.y + dy * e.t; }
      return [OX + fx * T + T / 2, OY + fy * T + T / 2];
    };
    ctx.strokeStyle = '#2a4aff'; ctx.lineWidth = 3;
    for (const k of g.walls) { const [x, y] = k.split(',').map(Number); ctx.fillStyle = '#0a1a6a'; ctx.fillRect(OX + x * T + 2, OY + y * T + 2, T - 4, T - 4); ctx.strokeRect(OX + x * T + 3, OY + y * T + 3, T - 6, T - 6); }
    ctx.fillStyle = '#ffb8a0'; ctx.fillRect(OX + 9 * T, OY + 8 * T + 9, T, 4);
    ctx.fillStyle = '#ffd8b0';
    for (const k of g.dots) { const [x, y] = k.split(',').map(Number); ctx.fillRect(OX + x * T + T / 2 - 2, OY + y * T + T / 2 - 2, 4, 4); }
    for (const k of g.pills) { const [x, y] = k.split(',').map(Number); if (Math.floor(g.frame / 15) % 2 || g.demoMode) { ctx.beginPath(); ctx.arc(OX + x * T + T / 2, OY + y * T + T / 2, 7, 0, 7); ctx.fill(); } }
    const p = g.pac, [px, py] = lerp(p);
    const ang = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[p.d];
    const m = 0.1 + Math.abs(Math.sin(p.mouth)) * 0.35;
    ctx.fillStyle = '#ffe600'; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, T / 2 + 1, ang + m, ang + Math.PI * 2 - m); ctx.closePath(); ctx.fill();
    for (const q of g.ghosts) {
      const [x, y] = q.out > 0 ? [OX + q.x * T + T / 2, OY + q.y * T + T / 2] : lerp(q);
      const fr = g.fright > 0 && !q.eaten;
      if (!q.eaten) {
        ctx.fillStyle = fr ? (g.fright < 1.5 && Math.floor(g.frame / 8) % 2 ? '#fff' : '#2a3aff') : q.c;
        ctx.beginPath(); ctx.arc(x, y - 2, T / 2, Math.PI, 0); ctx.lineTo(x + T / 2, y + T / 2);
        for (let k = 0; k < 4; k++) ctx.lineTo(x + T / 2 - (k + 0.5) * T / 4, y + T / 2 - (k % 2 ? 0 : 4));
        ctx.lineTo(x - T / 2, y + T / 2); ctx.fill();
      }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 4, y - 3, 3.5, 0, 7); ctx.arc(x + 4, y - 3, 3.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#12c'; const [dx, dy] = DIRS[q.d]; ctx.beginPath(); ctx.arc(x - 4 + dx * 1.5, y - 3 + dy * 1.5, 1.8, 0, 7); ctx.arc(x + 4 + dx * 1.5, y - 3 + dy * 1.5, 1.8, 0, 7); ctx.fill();
    }
    g.text('SCORE', 58, 30, 16, '#fff', null); g.text(String(g.score), 58, 52, 20, '#ffe600', null);
    g.text('BEST', 58, 90, 16, '#fff', null); g.text(String(g.best), 58, 112, 18, '#ffe600', null);
    g.text('LEVEL ' + g.level, 58, 160, 16, '#fff', null);
    for (let i = 0; i < g.lives; i++) { ctx.fillStyle = '#ffe600'; ctx.beginPath(); ctx.moveTo(34 + i * 24, 200); ctx.arc(34 + i * 24, 200, 9, 0.5, Math.PI * 2 - 0.5); ctx.fill(); }
    g.text('MAZE', 582, 40, 26, '#ffe600', '#6a3a00', 'center', g.FONT_TITLE);
    g.text('MUNCHER', 582, 70, 20, '#ffe600', '#6a3a00', 'center', g.FONT_TITLE);
    if (g.ready > 0 && g.state === 'play') g.text('READY!', 320, OY + 11 * T + 11, 22, '#ffe600', null);
  },
});
