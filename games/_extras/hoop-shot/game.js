// Hoop Shot - drag back from the ball to shoot hoops against the clock
const RIM_L = { x: 480, y: 180 }, RIM_R = { x: 540, y: 180 }, BOARD_X = 552, GRAV = 900;

MCC.game({
  id: 'hoop-shot',
  title: 'Hoop Shot',
  width: 640, height: 480,
  instructions: ['Click on the ball and drag backwards to aim (like a slingshot).', 'Let go to shoot. The further you drag, the harder the shot.', 'Swishes (no rim) score double. You have 60 seconds!'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) { g.left = 60; g.streak = 0; g.msgs = []; this.newBall(g); },

  newBall(g) {
    const x = g.rand(90, 330), y = g.rand(300, 400);
    g.ball = { x, y, vx: 0, vy: 0, live: false, sx: x, sy: y, touched: false, scored: false, t: 0 };
    g.drag = null;
  },

  update(g, dt) {
    g.left -= dt;
    if (g.left <= 0) { g.left = 0; g.over('Buzzer!', 'Baskets scored: ' + g.score); return; }
    const b = g.ball;
    for (const m of g.msgs) { m.t -= dt; m.y -= 30 * dt; }
    g.msgs = g.msgs.filter((m) => m.t > 0);
    if (!b.live) {
      if (g.mouse.clicked && Math.hypot(g.mouse.x - b.x, g.mouse.y - b.y) < 40) g.drag = true;
      if (g.drag && g.mouse.released) {
        const dx = b.x - g.mouse.x, dy = b.y - g.mouse.y;
        const pw = Math.min(220, Math.hypot(dx, dy));
        if (pw > 15) { const a = Math.atan2(dy, dx); b.vx = Math.cos(a) * pw * 4.2; b.vy = Math.sin(a) * pw * 4.2; b.live = true; g.sfx('whoosh'); }
        g.drag = false;
      }
      return;
    }
    const steps = 5;
    for (let s = 0; s < steps; s++) {
      const h = dt / steps;
      const py = b.y;
      b.vy += GRAV * h; b.x += b.vx * h; b.y += b.vy * h;
      // rim points
      for (const r of [RIM_L, RIM_R]) {
        const dx = b.x - r.x, dy = b.y - r.y, d = Math.hypot(dx, dy);
        if (d < 15) {
          const nx = dx / d, ny = dy / d, dot = b.vx * nx + b.vy * ny;
          if (dot < 0) { b.vx -= 1.6 * dot * nx; b.vy -= 1.6 * dot * ny; b.touched = true; g.sfx('bounce'); }
          b.x = r.x + nx * 15; b.y = r.y + ny * 15;
        }
      }
      // backboard
      if (b.x + 12 > BOARD_X && b.x < BOARD_X + 10 && b.y > 90 && b.y < 200 && b.vx > 0) { b.vx = -b.vx * 0.6; b.x = BOARD_X - 12; b.touched = true; g.sfx('hit'); }
      // through the hoop (crossing the rim line going down)
      if (!b.scored && py < RIM_L.y && b.y >= RIM_L.y && b.x > RIM_L.x + 4 && b.x < RIM_R.x - 4 && b.vy > 0) {
        b.scored = true;
        const pts = b.touched ? 2 : 4;
        g.streak++;
        g.addScore(pts); g.sfx('win');
        g.msgs.push({ x: 510, y: 150, t: 1, s: b.touched ? '+2' : 'SWISH! +4' });
      }
      if (b.y > 452) { b.y = 452; b.vy = -b.vy * 0.55; b.vx *= 0.8; }
    }
    b.t += dt;
    if (b.x < -30 || b.x > g.W + 30 || b.t > 3.2) { if (!b.scored) g.streak = 0; this.newBall(g); }
  },

  demo(g) {
    g.ball = { x: 360, y: 150, vx: 0, vy: 0, live: true, sx: 200, sy: 360 };
    g.arc = true; g.score = 24; g.left = 38;
  },

  draw(g, ctx) {
    const bg = ctx.createLinearGradient(0, 0, 0, g.H);
    bg.addColorStop(0, '#2a3a6a'); bg.addColorStop(1, '#5a6a9a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, g.W, g.H);
    // crowd dots
    for (let i = 0; i < 120; i++) { ctx.fillStyle = ['#e8c49a', '#8a5a3a', '#ffd2a6', '#c89a6a'][i % 4]; ctx.beginPath(); ctx.arc((i * 37) % 640, 30 + ((i * 13) % 5) * 14, 6, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(0, 100, 640, 8);
    // floor
    const fl = ctx.createLinearGradient(0, 380, 0, 480);
    fl.addColorStop(0, '#d89a5a'); fl.addColorStop(1, '#a86a2a');
    ctx.fillStyle = fl; ctx.fillRect(0, 462, 640, 18);
    ctx.fillStyle = '#c8844a'; ctx.fillRect(0, 462, 640, 3);
    // pole + board
    ctx.fillStyle = '#666'; ctx.fillRect(590, 120, 10, 342);
    ctx.fillStyle = '#fff'; ctx.fillRect(BOARD_X, 90, 10, 110); ctx.fillRect(BOARD_X + 8, 140, 40, 8);
    ctx.strokeStyle = '#e83a2a'; ctx.lineWidth = 3; ctx.strokeRect(BOARD_X + 2, 130, 6, 40);
    // net
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.5;
    for (let i = 0; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(RIM_L.x + i * 10, 180); ctx.lineTo(RIM_L.x + 10 + i * 6.6, 232); ctx.stroke(); }
    for (let j = 1; j < 4; j++) { ctx.beginPath(); ctx.moveTo(RIM_L.x + j * 3.3, 180 + j * 17); ctx.lineTo(RIM_R.x - j * 3.3, 180 + j * 17); ctx.stroke(); }
    const b = g.ball;
    // aiming guide
    if (g.drag || g.arc) {
      const dx = g.arc ? 150 : b.x - g.mouse.x, dy = g.arc ? -170 : b.y - g.mouse.y;
      const pw = Math.min(220, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
      let x = g.arc ? b.sx : b.x, y = g.arc ? b.sy : b.y, vx = Math.cos(a) * pw * 4.2, vy = Math.sin(a) * pw * 4.2;
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      for (let i = 0; i < 16; i++) { for (let k = 0; k < 4; k++) { vy += GRAV * 0.01; x += vx * 0.01; y += vy * 0.01; } ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
    }
    // ball
    const gr = ctx.createRadialGradient(b.x - 5, b.y - 5, 2, b.x, b.y, 14);
    gr.addColorStop(0, '#ffb86a'); gr.addColorStop(1, '#d8641a');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(b.x, b.y, 13, 0, 7); ctx.fill();
    ctx.strokeStyle = '#5a2a0a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(b.x, b.y, 13, 0, 7); ctx.moveTo(b.x - 13, b.y); ctx.lineTo(b.x + 13, b.y); ctx.moveTo(b.x, b.y - 13); ctx.lineTo(b.x, b.y + 13); ctx.stroke();
    // rim in front
    ctx.strokeStyle = '#ff5a1a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(RIM_L.x, RIM_L.y); ctx.lineTo(RIM_R.x, RIM_R.y); ctx.stroke();
    if (!b.live && !g.drag && g.state === 'play') g.text('Drag back from the ball!', b.x, b.y - 40, 16, '#fff', '#000');
    for (const m of g.msgs) g.text(m.s, m.x, m.y, 26, '#ffe45a', '#6a2a00');
    ctx.fillStyle = 'rgba(0,0,0,.55)'; g.roundRect(10, 8, 250, 34, 8); ctx.fill();
    g.text('Score: ' + g.score, 20, 25, 20, '#fff', null, 'left');
    g.text('Time: ' + Math.ceil(g.left), 250, 25, 20, g.left < 10 ? '#ff6a6a' : '#ffd24a', null, 'right');
  },
});
