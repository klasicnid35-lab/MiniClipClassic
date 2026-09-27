// Mole Mayhem - whack-a-mole
const HOLES = [];
for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) HOLES.push({ x: 150 + c * 170, y: 180 + r * 105 });

MCC.game({
  id: 'mole-mayhem',
  title: 'Mole Mayhem',
  width: 640, height: 480,
  instructions: ['Click the moles as they pop out of their holes.', "Don't whack the bunnies - they cost you points!", 'You have 60 seconds. Go!'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) {
    g.left = 60; g.spawn = 0.6; g.hits = [];
    g.holes = HOLES.map((h) => ({ ...h, up: 0, state: 0, who: 'mole', t: 0, hit: 0 }));
  },

  update(g, dt) {
    g.left -= dt;
    if (g.left <= 0) { g.left = 0; g.over("Time's Up!", 'You whacked ' + g.score + ' points of moles'); return; }
    g.spawn -= dt;
    if (g.spawn <= 0) {
      const free = g.holes.filter((h) => h.state === 0);
      if (free.length) { const h = g.pick(free); h.state = 1; h.who = Math.random() < 0.18 ? 'bunny' : Math.random() < 0.1 ? 'gold' : 'mole'; h.t = Math.max(0.55, 1.3 - (60 - g.left) / 60); h.hit = 0; }
      g.spawn = Math.max(0.25, 0.8 - (60 - g.left) / 90) * g.rand(0.6, 1.3);
    }
    for (const h of g.holes) {
      if (h.state === 1) { h.up = Math.min(1, h.up + dt * 7); if (h.up >= 1) { h.t -= dt; if (h.t <= 0) h.state = 2; } }
      else if (h.state === 2) { h.up = Math.max(0, h.up - dt * 6); if (h.up <= 0) h.state = 0; }
      if (h.hit > 0) h.hit -= dt;
    }
    if (g.mouse.clicked) {
      g.hammer = 0.12;
      for (const h of g.holes) {
        if (h.up > 0.4 && h.hit <= 0 && Math.abs(g.mouse.x - h.x) < 48 && g.mouse.y > h.y - 80 && g.mouse.y < h.y + 16) {
          const pts = h.who === 'bunny' ? -5 : h.who === 'gold' ? 5 : 1;
          g.addScore(pts); g.score = Math.max(0, g.score);
          g.hits.push({ x: h.x, y: h.y - 70, t: 0.7, pts });
          h.hit = 0.3; h.state = 2; g.sfx(pts > 0 ? 'hit' : 'lose');
        }
      }
    }
    if (g.hammer > 0) g.hammer -= dt;
    for (const f of g.hits) { f.t -= dt; f.y -= 40 * dt; }
    g.hits = g.hits.filter((f) => f.t > 0);
  },

  demo(g) {
    g.holes[1].up = 1; g.holes[1].state = 1; g.holes[3].up = 0.8; g.holes[3].state = 1;
    g.holes[5].up = 1; g.holes[5].state = 1; g.holes[5].who = 'bunny'; g.holes[7].up = 1; g.holes[7].state = 1; g.holes[7].who = 'gold';
    g.holes[3].hit = 0.2;
    g.hits = [{ x: HOLES[3].x, y: HOLES[3].y - 80, t: 0.6, pts: 1 }];
    g.score = 37; g.left = 24; g.mouse.x = 180; g.mouse.y = 250;
  },

  critter(g, ctx, h) {
    const y = h.y - h.up * 62;
    ctx.save();
    ctx.beginPath(); ctx.rect(h.x - 60, h.y - 120, 120, 120); ctx.clip();
    const bunny = h.who === 'bunny';
    const body = bunny ? '#f4f4f4' : h.who === 'gold' ? '#ffcc2a' : '#8a5a3a';
    if (bunny) { ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(h.x - 12, y - 42, 8, 22, -0.15, 0, 7); ctx.ellipse(h.x + 12, y - 42, 8, 22, 0.15, 0, 7); ctx.fill(); ctx.fillStyle = '#ffb0c8'; ctx.beginPath(); ctx.ellipse(h.x - 12, y - 42, 4, 15, -0.15, 0, 7); ctx.ellipse(h.x + 12, y - 42, 4, 15, 0.15, 0, 7); ctx.fill(); }
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(h.x, y, 34, 42, 0, 0, 7); ctx.fill();
    ctx.fillStyle = bunny ? '#fff' : h.who === 'gold' ? '#fff2a0' : '#c8946a'; ctx.beginPath(); ctx.ellipse(h.x, y + 8, 20, 18, 0, 0, 7); ctx.fill();
    const hit = h.hit > 0;
    ctx.fillStyle = '#000';
    if (hit) { ctx.lineWidth = 3; ctx.strokeStyle = '#000'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(h.x + s * 12 - 5, y - 17); ctx.lineTo(h.x + s * 12 + 5, y - 7); ctx.moveTo(h.x + s * 12 + 5, y - 17); ctx.lineTo(h.x + s * 12 - 5, y - 7); ctx.stroke(); } }
    else for (const s of [-1, 1]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(h.x + s * 12, y - 12, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(h.x + s * 12, y - 11, 3.5, 0, 7); ctx.fill(); }
    ctx.fillStyle = bunny ? '#ff7aa0' : '#ff5a8a'; ctx.beginPath(); ctx.ellipse(h.x, y + 2, 7, 5, 0, 0, 7); ctx.fill();
    if (!bunny) { ctx.fillStyle = '#fff'; ctx.fillRect(h.x - 5, y + 10, 4, 6); ctx.fillRect(h.x + 1, y + 10, 4, 6); }
    ctx.restore();
  },

  draw(g, ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, 120);
    sky.addColorStop(0, '#5ab4ff'); sky.addColorStop(1, '#bfe6ff');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, g.W, 120);
    ctx.fillStyle = '#fff'; for (const [x, y] of [[90, 50], [420, 35], [560, 70]]) { ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.arc(x + 20, y - 8, 22, 0, 7); ctx.arc(x + 44, y, 18, 0, 7); ctx.fill(); }
    const grass = ctx.createLinearGradient(0, 100, 0, g.H);
    grass.addColorStop(0, '#7ad84a'); grass.addColorStop(1, '#3a9a1a');
    ctx.fillStyle = grass; ctx.fillRect(0, 100, g.W, g.H);
    for (const h of g.holes) {
      ctx.fillStyle = '#3a2410'; ctx.beginPath(); ctx.ellipse(h.x, h.y, 50, 16, 0, 0, 7); ctx.fill();
      if (h.up > 0) this.critter(g, ctx, h);
      ctx.fillStyle = '#6a4a2a'; ctx.beginPath(); ctx.ellipse(h.x, h.y + 6, 54, 12, 0, 0, Math.PI); ctx.fill();
    }
    for (const f of g.hits) g.text((f.pts > 0 ? '+' : '') + f.pts, f.x, f.y, 26, f.pts > 0 ? '#ffe45a' : '#ff4a4a', '#000');
    // HUD
    ctx.fillStyle = 'rgba(0,0,0,.35)'; g.roundRect(10, 8, 620, 38, 10); ctx.fill();
    g.text('Score: ' + g.score, 24, 28, 22, '#fff', null, 'left');
    g.text('MOLE MAYHEM', 320, 28, 24, '#ffd24a', '#5a2a00', 'center', g.FONT_TITLE);
    g.text('Time: ' + Math.ceil(g.left), 600, 28, 22, g.left < 10 ? '#ff6a6a' : '#fff', null, 'right');
    // hammer cursor
    if (g.mouse.x >= 0) {
      ctx.save(); ctx.translate(g.mouse.x, g.mouse.y); ctx.rotate(g.hammer > 0 ? -0.2 : -0.9);
      ctx.fillStyle = '#b07a3a'; ctx.fillRect(-4, -4, 8, 50);
      ctx.fillStyle = '#e84a3a'; g.roundRect(-22, -22, 44, 24, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(-18, -19, 36, 6);
      ctx.restore();
    }
  },
});
