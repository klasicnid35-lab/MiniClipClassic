// Cave Copter - hold to fly up through an endless cave
MCC.game({
  id: 'cave-copter',
  title: 'Cave Copter',
  width: 640, height: 480,
  instructions: ['Hold the mouse button or SPACE to fly up.', 'Let go to drop down.', 'Avoid the cave walls and the green blocks!'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) {
    g.heli = { x: 150, y: 220, vy: 0 };
    g.dist = 0; g.speed = 230;
    g.seg = 16;
    g.cave = [];
    g.gap = 330; g.mid = 240; g.trend = 0;
    for (let x = 0; x <= g.W + g.seg; x += g.seg) g.cave.push(this.next(g, true));
    g.blocks = [];
    g.nextBlock = 400;
    g.smoke = [];
    g.crashed = 0;
  },

  next(g, flat) {
    if (!flat) {
      g.trend += g.rand(-4, 4);
      g.trend = Math.max(-9, Math.min(9, g.trend));
      g.mid += g.trend;
      g.gap = Math.max(170, 330 - g.dist / 60);
    }
    const lo = 40 + g.gap / 2 + 10, hi = g.H - g.gap / 2 - 10;
    if (g.mid < lo) { g.mid = lo; g.trend = Math.abs(g.trend); }
    if (g.mid > hi) { g.mid = hi; g.trend = -Math.abs(g.trend); }
    return { top: g.mid - g.gap / 2, bot: g.mid + g.gap / 2 };
  },

  update(g, dt) {
    const h = g.heli;
    const up = g.mouse.down || g.down('Space') || g.down('ArrowUp');
    h.vy += (up ? -900 : 700) * dt;
    h.vy = Math.max(-330, Math.min(380, h.vy));
    h.y += h.vy * dt;
    g.speed = 230 + g.dist / 40;
    const dx = g.speed * dt;
    g.dist += dx;
    g.score = Math.floor(g.dist / 10);
    g.offset = (g.offset || 0) + dx;
    while (g.offset >= g.seg) { g.offset -= g.seg; g.cave.shift(); g.cave.push(this.next(g)); }
    g.nextBlock -= dx;
    if (g.nextBlock <= 0) {
      const c = g.cave[g.cave.length - 1];
      g.blocks.push({ x: g.W + 20, y: g.rand(c.top + 10, c.bot - 90), w: 26, h: 80 });
      g.nextBlock = g.rand(320, 520) - Math.min(150, g.dist / 100);
    }
    for (const b of g.blocks) b.x -= dx;
    g.blocks = g.blocks.filter((b) => b.x > -40);
    if (g.frame % 3 === 0) g.smoke.push({ x: h.x - 26, y: h.y + 2, r: 4, a: 0.6 });
    for (const s of g.smoke) { s.x -= dx + 30 * dt; s.r += 16 * dt; s.a -= dt * 0.9; }
    g.smoke = g.smoke.filter((s) => s.a > 0);
    // collisions
    const i = Math.floor((h.x + g.offset) / g.seg);
    const c = g.cave[i] || g.cave[0];
    const hit = h.y - 12 < c.top || h.y + 12 > c.bot || g.blocks.some((b) => h.x + 26 > b.x && h.x - 26 < b.x + b.w && h.y + 10 > b.y && h.y - 10 < b.y + b.h);
    if (hit) { g.sfx('explode'); g.over('Crashed!', 'Distance: ' + g.score + ' m'); }
  },

  demo(g) {
    for (let k = 0; k < 900; k++) { g.dist += 5; g.offset = (g.offset || 0) + 5; while (g.offset >= g.seg) { g.offset -= g.seg; g.cave.shift(); g.cave.push(this.next(g)); } }
    const c = g.cave[Math.floor(150 / g.seg)];
    g.heli.y = (c.top + c.bot) / 2 - 10;
    g.blocks = [{ x: 420, y: (g.cave[27].top + g.cave[27].bot) / 2 - 20, w: 26, h: 80 }];
    for (let k = 0; k < 12; k++) g.smoke.push({ x: 124 - k * 12, y: g.heli.y + 2 + k * 0.5, r: 4 + k * 1.5, a: 0.6 - k * 0.045 });
    g.score = 1284;
  },

  draw(g, ctx) {
    const bg = ctx.createLinearGradient(0, 0, 0, g.H);
    bg.addColorStop(0, '#1b0f2b'); bg.addColorStop(1, '#3b2255');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, g.W, g.H);
    const off = g.offset || 0;
    // cave walls
    const wall = ctx.createLinearGradient(0, 0, 0, g.H);
    wall.addColorStop(0, '#5ec12a'); wall.addColorStop(1, '#2f7d10');
    ctx.fillStyle = wall;
    ctx.beginPath(); ctx.moveTo(0, 0);
    g.cave.forEach((c, i) => ctx.lineTo(i * g.seg - off, c.top));
    ctx.lineTo(g.W + g.seg, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, g.H);
    g.cave.forEach((c, i) => ctx.lineTo(i * g.seg - off, c.bot));
    ctx.lineTo(g.W + g.seg, g.H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#a9ff6a'; ctx.lineWidth = 3;
    ctx.beginPath(); g.cave.forEach((c, i) => ctx.lineTo(i * g.seg - off, c.top)); ctx.stroke();
    ctx.beginPath(); g.cave.forEach((c, i) => ctx.lineTo(i * g.seg - off, c.bot)); ctx.stroke();
    for (const b of g.blocks) {
      ctx.fillStyle = '#6ad13a'; g.roundRect(b.x, b.y, b.w, b.h, 4); ctx.fill();
      ctx.strokeStyle = '#b8ff8a'; ctx.lineWidth = 2; ctx.stroke();
    }
    for (const s of g.smoke) { ctx.fillStyle = 'rgba(220,220,220,' + s.a + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
    // helicopter
    const h = g.heli;
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(Math.max(-0.25, Math.min(0.25, h.vy / 1400)));
    ctx.fillStyle = '#2d6fd6';
    ctx.fillRect(-30, -3, 22, 5);
    ctx.fillRect(-32, -8, 4, 14);
    const body = ctx.createLinearGradient(0, -12, 0, 12);
    body.addColorStop(0, '#9fd2ff'); body.addColorStop(1, '#1f5fc0');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(2, 0, 17, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8f7ff'; ctx.beginPath(); ctx.ellipse(8, -3, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-10, 13); ctx.lineTo(14, 13); ctx.stroke();
    ctx.fillStyle = '#333'; ctx.fillRect(1, -16, 3, 5);
    const bl = Math.abs(Math.sin(g.frame * 0.9)) * 26 + 4;
    ctx.fillRect(2 - bl, -17, bl * 2, 2);
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, 0, 250, 30);
    g.text('Distance: ' + g.score + 'm', 10, 16, 18, '#fff', null, 'left');
    g.text('Best: ' + g.best, 170, 16, 16, '#ffd24a', null, 'left');
  },
});
