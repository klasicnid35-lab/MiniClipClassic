// Alien Assault - fixed shooter against marching alien waves
const SPR = [
  ['..X.....X..', '...X...X...', '..XXXXXXX..', '.XX.XXX.XX.', 'XXXXXXXXXXX', 'X.XXXXXXX.X', 'X.X.....X.X', '...XX.XX...'],
  ['....XXX....', '.XXXXXXXXX.', 'XXXXXXXXXXX', 'XXX..X..XXX', 'XXXXXXXXXXX', '...XX.XX...', '..XX.X.XX..', 'XX.......XX'],
  ['....XX.....', '...XXXX....', '..XXXXXX...', '.XX.XX.XX..', '.XXXXXXXX..', '...X..X....', '..X.XX.X...', '.X.X..X.X..'],
];
const ROWC = ['#ff5ad2', '#5affc8', '#ffe45a', '#5ab4ff', '#ff8a3a'];

MCC.game({
  id: 'alien-assault',
  title: 'Alien Assault',
  width: 640, height: 480,
  instructions: ['LEFT / RIGHT (or the mouse) to move, SPACE or click to fire.', 'Shoot every alien before they reach the ground.', 'Hide behind the bunkers - they can take a few hits.'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) {
    g.lives = 3; g.wave = 0; g.player = { x: 320, cool: 0 };
    this.newWave(g);
  },

  newWave(g) {
    g.wave++;
    g.aliens = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 10; c++) g.aliens.push({ x: 90 + c * 46, y: 70 + r * 34 + Math.min(4, g.wave - 1) * 10, t: r === 0 ? 2 : r < 3 ? 1 : 0, r, alive: true });
    g.dir = 1; g.step = 0; g.anim = 0;
    g.shots = []; g.bombs = []; g.parts = []; g.ufo = null;
    g.bunkers = [];
    for (let b = 0; b < 4; b++) for (let y = 0; y < 4; y++) for (let x = 0; x < 7; x++) {
      if (y === 3 && x > 1 && x < 5) continue;
      if (y === 0 && (x === 0 || x === 6)) continue;
      g.bunkers.push({ x: 88 + b * 150 + x * 8, y: 380 + y * 8, hp: 3 });
    }
  },

  update(g, dt) {
    const p = g.player;
    if (g.mouse.moved) p.x = g.mouse.x;
    if (g.anyDown('ArrowLeft', 'KeyA')) p.x -= 300 * dt;
    if (g.anyDown('ArrowRight', 'KeyD')) p.x += 300 * dt;
    p.x = Math.max(24, Math.min(g.W - 24, p.x));
    p.cool -= dt;
    if ((g.down('Space') || g.mouse.down) && p.cool <= 0 && g.shots.length < 2) { g.shots.push({ x: p.x, y: 432 }); p.cool = 0.3; g.sfx('shoot'); }
    for (const s of g.shots) s.y -= 520 * dt;
    // aliens march
    const alive = g.aliens.filter((a) => a.alive);
    const interval = Math.max(0.05, 0.6 * alive.length / 50 - g.wave * 0.02);
    g.step += dt;
    if (g.step > interval) {
      g.step = 0; g.anim ^= 1;
      const minX = Math.min(...alive.map((a) => a.x)), maxX = Math.max(...alive.map((a) => a.x));
      if ((g.dir > 0 && maxX > g.W - 40) || (g.dir < 0 && minX < 40)) { g.dir = -g.dir; alive.forEach((a) => (a.y += 14)); }
      else alive.forEach((a) => (a.x += 8 * g.dir));
      g.tone(g.anim ? 110 : 90, 0.06, 'square', 0.04);
    }
    if (Math.random() < dt * (0.8 + g.wave * 0.25) && alive.length) {
      const cols = {};
      for (const a of alive) if (!cols[a.x] || cols[a.x].y < a.y) cols[a.x] = a;
      const a = g.pick(Object.values(cols));
      g.bombs.push({ x: a.x, y: a.y + 12 });
    }
    for (const b of g.bombs) b.y += 190 * dt;
    // ufo
    if (!g.ufo && Math.random() < dt * 0.06) g.ufo = { x: -30, v: 110 };
    if (g.ufo) { g.ufo.x += g.ufo.v * dt; if (g.ufo.x > g.W + 40) g.ufo = null; }
    // collisions
    for (const s of g.shots) {
      for (const a of alive) if (a.alive && Math.abs(s.x - a.x) < 16 && Math.abs(s.y - a.y) < 12) {
        a.alive = false; s.y = -99; g.addScore([10, 20, 30][a.t]); g.sfx('explode'); this.burst(g, a.x, a.y, ROWC[a.r]);
      }
      if (g.ufo && Math.abs(s.x - g.ufo.x) < 22 && Math.abs(s.y - 50) < 10) { g.addScore(g.pick([50, 100, 150, 300])); this.burst(g, g.ufo.x, 50, '#f44'); g.ufo = null; s.y = -99; g.sfx('win'); }
    }
    const hitBunker = (o, down) => {
      for (const k of g.bunkers) if (k.hp > 0 && o.x > k.x - 2 && o.x < k.x + 10 && o.y > k.y && o.y < k.y + 8) { k.hp--; o.y = down ? 999 : -99; return; }
    };
    g.shots.forEach((s) => hitBunker(s, false));
    g.bombs.forEach((b) => hitBunker(b, true));
    for (const b of g.bombs) if (b.y > 430 && b.y < 452 && Math.abs(b.x - p.x) < 18) {
      b.y = 999; g.lives--; g.sfx('explode'); this.burst(g, p.x, 440, '#5ab4ff');
      if (g.lives <= 0) { g.over('Game Over', 'The aliens have landed!'); return; }
    }
    for (const a of alive) {
      for (const k of g.bunkers) if (k.hp > 0 && Math.abs(a.x - k.x) < 16 && Math.abs(a.y - k.y) < 12) k.hp = 0;
      if (a.alive && a.y > 420) { g.over('Game Over', 'The aliens have landed!'); return; }
    }
    g.shots = g.shots.filter((s) => s.y > 30);
    g.bombs = g.bombs.filter((b) => b.y < g.H);
    for (const q of g.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.t -= dt; }
    g.parts = g.parts.filter((q) => q.t > 0);
    if (!g.aliens.some((a) => a.alive)) { g.addScore(200); g.sfx('win'); this.newWave(g); }
  },

  burst(g, x, y, c) {
    for (let i = 0; i < 12; i++) { const a = Math.random() * 7, s = g.rand(40, 160); g.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0.5, c }); }
  },

  demo(g) {
    g.aliens.forEach((a, i) => { if ([3, 14, 25, 26, 38, 41, 47].includes(i)) a.alive = false; a.x += 20; });
    g.shots = [{ x: 262, y: 300 }];
    g.bombs = [{ x: 400, y: 330 }, { x: 190, y: 280 }];
    g.ufo = { x: 470, v: 0 };
    g.player.x = 262;
    g.bunkers.forEach((k, i) => { if (i % 7 === 3) k.hp = 0; });
    g.score = 1290;
  },

  draw(g, ctx) {
    const bg = ctx.createLinearGradient(0, 0, 0, g.H);
    bg.addColorStop(0, '#000010'); bg.addColorStop(1, '#10204a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, g.W, g.H);
    ctx.fillStyle = '#2a4a1a'; ctx.fillRect(0, 456, g.W, 24);
    ctx.fillStyle = '#4c8a2a'; ctx.fillRect(0, 456, g.W, 3);
    const px = (grid, x, y, c, s) => {
      ctx.fillStyle = c;
      grid.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === 'X') ctx.fillRect(x + (i - row.length / 2) * s, y + (j - 4) * s, s, s); });
    };
    for (const a of g.aliens) if (a.alive) {
      const sp = SPR[a.t].slice();
      if (g.anim) sp[7] = sp[7].split('').reverse().join('');
      px(sp, a.x, a.y, ROWC[a.r], 3);
    }
    if (g.ufo) {
      ctx.fillStyle = '#ff4a4a'; ctx.beginPath(); ctx.ellipse(g.ufo.x, 52, 22, 7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#9ff'; ctx.beginPath(); ctx.ellipse(g.ufo.x, 46, 9, 7, 0, Math.PI, 0); ctx.fill();
    }
    for (const k of g.bunkers) if (k.hp > 0) { ctx.fillStyle = ['', '#2a7a2a', '#3aa83a', '#52d852'][k.hp]; ctx.fillRect(k.x, k.y, 8, 8); }
    ctx.fillStyle = '#fff';
    for (const s of g.shots) ctx.fillRect(s.x - 1.5, s.y - 8, 3, 12);
    ctx.fillStyle = '#ffd24a';
    for (const b of g.bombs) { ctx.fillRect(b.x - 2, b.y - 5, 4, 4); ctx.fillRect(b.x - 1, b.y, 3, 4); }
    for (const q of g.parts) { ctx.fillStyle = q.c; ctx.fillRect(q.x - 2, q.y - 2, 4, 4); }
    // player cannon
    const p = g.player;
    const cg = ctx.createLinearGradient(0, 430, 0, 454);
    cg.addColorStop(0, '#bfe6ff'); cg.addColorStop(1, '#2a7ad8');
    ctx.fillStyle = cg;
    ctx.fillRect(p.x - 20, 440, 40, 12); ctx.fillRect(p.x - 12, 434, 24, 8); ctx.fillRect(p.x - 3, 426, 6, 10);
    g.text('Score: ' + g.score, 12, 18, 20, '#fff', null, 'left');
    g.text('Wave ' + g.wave, 320, 18, 18, '#ffd24a', null);
    g.text('Lives: ' + g.lives, 600, 18, 18, '#fff', null, 'right');
  },
});
