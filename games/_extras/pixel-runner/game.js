// Pixel Runner - endless rooftop runner with double jump
const GRAV = 2000, JUMP = 720;

MCC.game({
  id: 'pixel-runner',
  title: 'Pixel Runner',
  width: 640, height: 480,
  instructions: ['Press SPACE, UP or click to jump.', 'Press again in the air for a double jump.', "Don't fall between the buildings! Grab the coins for bonus points."],

  init(g) {
    g.sky = Array.from({ length: 40 }, () => ({ x: Math.random() * 640, y: Math.random() * 260, h: 40 + Math.random() * 160, w: 30 + Math.random() * 50 }));
    this.start(g); g.state = 'title';
  },

  start(g) {
    g.p = { x: 140, y: 300, vy: 0, jumps: 0, ground: true, run: 0 };
    g.blocks = [{ x: -50, w: 700, y: 340 }];
    g.coins = []; g.speed = 300; g.dist = 0; g.bonus = 0; g.far = 0; g.dust = [];
    while (g.blocks[g.blocks.length - 1].x + g.blocks[g.blocks.length - 1].w < 1400) this.addBlock(g);
  },

  addBlock(g) {
    const last = g.blocks[g.blocks.length - 1];
    const gap = g.rand(70, 70 + Math.min(130, g.dist / 60));
    const y = Math.max(220, Math.min(400, last.y + g.rand(-80, 70)));
    const b = { x: last.x + last.w + gap, w: g.rand(180, 420), y };
    g.blocks.push(b);
    if (Math.random() < 0.7) { const n = g.randInt(3, 6), sx = b.x + g.rand(20, b.w - n * 30); for (let i = 0; i < n; i++) g.coins.push({ x: sx + i * 28, y: b.y - 50 - Math.sin(i / (n - 1) * Math.PI) * 40 }); }
  },

  update(g, dt) {
    const p = g.p;
    g.speed = 300 + Math.min(260, g.dist / 40);
    const dx = g.speed * dt;
    g.dist += dx; g.far += dx * 0.3;
    for (const b of g.blocks) b.x -= dx;
    for (const c of g.coins) c.x -= dx;
    for (const d of g.dust) { d.x -= dx; d.t -= dt; }
    g.dust = g.dust.filter((d) => d.t > 0);
    g.blocks = g.blocks.filter((b) => b.x + b.w > -50);
    g.coins = g.coins.filter((c) => c.x > -20 && !c.got);
    while (g.blocks[g.blocks.length - 1].x < 900) this.addBlock(g);
    if (g.anyPressed('Space', 'ArrowUp', 'KeyW') || g.mouse.clicked) {
      if (p.ground || p.jumps < 2) { p.vy = -JUMP * (p.ground ? 1 : 0.85); p.jumps = p.ground ? 1 : p.jumps + 1; p.ground = false; g.sfx('jump'); }
    }
    const held = g.anyDown('Space', 'ArrowUp', 'KeyW') || g.mouse.down;
    p.vy += GRAV * (held && p.vy < 0 ? 0.6 : 1) * dt;
    const oy = p.y;
    p.y += p.vy * dt;
    p.ground = false;
    for (const b of g.blocks) {
      if (p.x + 12 > b.x && p.x - 12 < b.x + b.w) {
        if (oy <= b.y && p.y >= b.y && p.vy >= 0) { p.y = b.y; p.vy = 0; p.ground = true; p.jumps = 0; }
        else if (p.y > b.y + 6 && oy > b.y + 2 && p.x + 12 < b.x + 20) { /* hit the wall */ p.x = b.x - 12; }
      }
    }
    if (p.ground) { p.run += dt * g.speed / 20; if (g.frame % 6 === 0) g.dust.push({ x: p.x - 10, y: p.y, t: 0.3 }); }
    p.x += (140 - p.x) * dt * 0.8;
    for (const c of g.coins) if (Math.hypot(c.x - p.x, c.y - (p.y - 20)) < 22) { c.got = true; g.bonus += 10; g.sfx('coin'); }
    g.score = Math.floor(g.dist / 10) + g.bonus;
    if (p.y > 520 || p.x < -20) { g.sfx('lose'); g.over('Game Over', 'You ran ' + Math.floor(g.dist / 10) + ' m'); }
  },

  demo(g) {
    g.blocks = [{ x: -40, w: 260, y: 340 }, { x: 330, w: 300, y: 290 }, { x: 700, w: 200, y: 330 }];
    g.coins = [{ x: 250, y: 220 }, { x: 278, y: 205 }, { x: 306, y: 205 }, { x: 334, y: 220 }];
    Object.assign(g.p, { x: 200, y: 250, vy: -200, ground: false });
    g.score = 1543; g.far = 120;
  },

  draw(g, ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, g.H);
    sky.addColorStop(0, '#ff9a5a'); sky.addColorStop(0.5, '#ffcf8a'); sky.addColorStop(1, '#8a5aa8');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, g.W, g.H);
    ctx.fillStyle = '#ffe8a0'; ctx.beginPath(); ctx.arc(480, 150, 50, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(90,50,120,.45)';
    for (const s of g.sky) { const x = ((s.x - g.far) % 700 + 700) % 700 - 30; ctx.fillRect(x, 380 - s.h, s.w, s.h + 100); }
    for (const b of g.blocks) {
      ctx.fillStyle = '#3a2a5a'; ctx.fillRect(b.x, b.y, b.w, 500);
      ctx.fillStyle = '#5a4a8a'; ctx.fillRect(b.x, b.y, b.w, 10);
      ctx.fillStyle = '#ffd86a';
      for (let wx = b.x + 16; wx < b.x + b.w - 20; wx += 34) for (let wy = b.y + 30; wy < 480; wy += 40) if ((wx * 7 + wy * 3) % 5 < 3) ctx.fillRect(wx, wy, 14, 18);
    }
    for (const c of g.coins) { ctx.fillStyle = '#ffd83a'; ctx.beginPath(); ctx.ellipse(c.x, c.y, 8 * Math.abs(Math.cos(g.frame * 0.1 + c.x)) + 2, 9, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#c88a00'; ctx.lineWidth = 2; ctx.stroke(); }
    for (const d of g.dust) { ctx.fillStyle = 'rgba(255,255,255,' + d.t * 2 + ')'; ctx.beginPath(); ctx.arc(d.x, d.y - 3, 5 * (1 - d.t), 0, 7); ctx.fill(); }
    const p = g.p;
    ctx.save(); ctx.translate(p.x, p.y);
    const leg = p.ground ? Math.sin(p.run) * 10 : 6;
    ctx.strokeStyle = '#1a1a3a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(leg, -2); ctx.moveTo(0, -18); ctx.lineTo(-leg, -2); ctx.stroke();
    ctx.fillStyle = '#2a8ae8'; g.roundRect(-9, -38, 18, 22, 5); ctx.fill();
    ctx.strokeStyle = '#2a8ae8'; ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(12, -24 - leg / 2); ctx.moveTo(0, -32); ctx.lineTo(-12, -24 + leg / 2); ctx.stroke();
    ctx.fillStyle = '#ffd2a6'; ctx.beginPath(); ctx.arc(0, -46, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8302a'; ctx.fillRect(-10, -52, 20, 5); ctx.fillRect(4, -50, 10, 3);
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.4)'; g.roundRect(8, 8, 200, 30, 8); ctx.fill();
    g.text('Score: ' + g.score, 18, 23, 18, '#fff', null, 'left');
    g.text('PIXEL RUNNER', 620, 24, 22, '#fff', '#5a2a6a', 'right', g.FONT_TITLE);
  },
});
