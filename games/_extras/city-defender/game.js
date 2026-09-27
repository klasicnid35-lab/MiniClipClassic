// City Defender - protect the cities from incoming missiles
MCC.game({
  id: 'city-defender',
  title: 'City Defender',
  width: 640, height: 480,
  instructions: ['Click to fire an interceptor at that spot.', 'Its explosion destroys any missile that touches it.', 'Save your cities - bonus points for every city left at the end of a wave.'],

  init(g) {
    g.stars = Array.from({ length: 60 }, () => ({ x: Math.random() * 640, y: Math.random() * 300 }));
    this.start(g); g.state = 'title';
  },

  start(g) {
    g.cities = [80, 150, 220, 420, 490, 560].map((x) => ({ x, alive: true }));
    g.wave = 0;
    this.newWave(g);
  },

  newWave(g) {
    g.wave++;
    g.missiles = []; g.booms = []; g.inter = [];
    g.toLaunch = 8 + g.wave * 3;
    g.launchT = 1;
    g.ammo = 20 + g.wave * 2;
    g.waveMsg = 2;
  },

  update(g, dt) {
    if (g.waveMsg > 0) g.waveMsg -= dt;
    if (g.mouse.clicked && g.ammo > 0 && g.mouse.y < 420) {
      g.inter.push({ sx: 320, sy: 440, x: 320, y: 440, tx: g.mouse.x, ty: g.mouse.y });
      g.ammo--; g.sfx('shoot');
    }
    g.launchT -= dt;
    if (g.toLaunch > 0 && g.launchT <= 0) {
      const targets = g.cities.filter((c) => c.alive).map((c) => c.x).concat([320]);
      const tx = g.pick(targets) + g.rand(-10, 10);
      const sx = g.rand(20, 620);
      const sp = 28 + g.wave * 7 + g.rand(0, 20);
      const d = Math.hypot(tx - sx, 440);
      g.missiles.push({ sx, sy: 0, x: sx, y: 0, vx: (tx - sx) / d * sp, vy: 440 / d * sp });
      g.toLaunch--;
      g.launchT = Math.max(0.35, 1.6 - g.wave * 0.12) * g.rand(0.5, 1.4);
    }
    for (const m of g.inter) {
      const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy), step = 420 * dt;
      if (d <= step) { m.done = true; g.booms.push({ x: m.tx, y: m.ty, r: 1, t: 0 }); g.sfx('explode'); }
      else { m.x += dx / d * step; m.y += dy / d * step; }
    }
    g.inter = g.inter.filter((m) => !m.done);
    for (const b of g.booms) { b.t += dt; b.r = b.t < 0.6 ? b.t / 0.6 * 38 : Math.max(0, 38 - (b.t - 0.6) / 0.5 * 38); }
    g.booms = g.booms.filter((b) => b.t < 1.1);
    for (const m of g.missiles) {
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (g.booms.some((b) => Math.hypot(b.x - m.x, b.y - m.y) < b.r)) { m.dead = true; g.addScore(25); g.booms.push({ x: m.x, y: m.y, r: 1, t: 0.2 }); }
      if (m.y >= 440) {
        m.dead = true;
        g.booms.push({ x: m.x, y: 440, r: 1, t: 0.1, enemy: true }); g.sfx('explode');
        for (const c of g.cities) if (c.alive && Math.abs(c.x - m.x) < 30) c.alive = false;
      }
    }
    g.missiles = g.missiles.filter((m) => !m.dead);
    if (!g.cities.some((c) => c.alive)) { g.over('The End', 'All your cities were destroyed'); return; }
    if (g.toLaunch <= 0 && !g.missiles.length && !g.booms.length) {
      const left = g.cities.filter((c) => c.alive).length;
      g.addScore(left * 100 + g.ammo * 5); g.sfx('win');
      this.newWave(g);
    }
  },

  demo(g) {
    g.missiles = [];
    for (const [sx, tx, f] of [[60, 150, 0.55], [300, 420, 0.4], [520, 560, 0.7], [610, 220, 0.3], [150, 80, 0.62]]) {
      g.missiles.push({ sx, sy: 0, x: sx + (tx - sx) * f, y: 440 * f });
    }
    g.booms = [{ x: 250, y: 190, r: 34, t: 0.5 }, { x: 470, y: 250, r: 22, t: 0.3 }];
    g.inter = [{ sx: 320, sy: 440, x: 360, y: 300, tx: 400, ty: 160 }];
    g.cities[2].alive = false;
    g.waveMsg = 0; g.score = 2350;
  },

  draw(g, ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, g.H);
    sky.addColorStop(0, '#07051c'); sky.addColorStop(0.7, '#2a1a5a'); sky.addColorStop(1, '#6a2a5a');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, g.W, g.H);
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    for (const s of g.stars) ctx.fillRect(s.x, s.y, 1.5, 1.5);
    // ground + base
    ctx.fillStyle = '#c89a3a'; ctx.beginPath(); ctx.moveTo(0, 450); ctx.lineTo(270, 450); ctx.lineTo(295, 425); ctx.lineTo(345, 425); ctx.lineTo(370, 450); ctx.lineTo(640, 450); ctx.lineTo(640, 480); ctx.lineTo(0, 480); ctx.fill();
    ctx.fillStyle = '#7ad0ff'; ctx.fillRect(310, 410, 20, 16); ctx.fillRect(317, 398, 6, 14);
    for (const c of g.cities) {
      if (c.alive) {
        const cols = ['#5ab4ff', '#7ad0ff', '#3a8de0'];
        [[-20, 18], [-10, 28], [0, 22], [10, 32], [18, 16]].forEach(([dx, h], i) => { ctx.fillStyle = cols[i % 3]; ctx.fillRect(c.x + dx - 4, 450 - h, 9, h); });
        ctx.fillStyle = '#ffe45a'; for (let i = 0; i < 6; i++) ctx.fillRect(c.x - 20 + i * 7, 436, 2, 2);
      } else { ctx.fillStyle = '#4a3a3a'; ctx.fillRect(c.x - 22, 444, 44, 6); }
    }
    ctx.lineWidth = 1.5;
    for (const m of g.missiles) {
      ctx.strokeStyle = 'rgba(255,90,90,.8)'; ctx.beginPath(); ctx.moveTo(m.sx, m.sy); ctx.lineTo(m.x, m.y); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(m.x - 1.5, m.y - 1.5, 3, 3);
    }
    for (const m of g.inter) {
      ctx.strokeStyle = 'rgba(120,220,255,.9)'; ctx.beginPath(); ctx.moveTo(m.sx, m.sy); ctx.lineTo(m.x, m.y); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(m.tx - 4, m.ty - 4); ctx.lineTo(m.tx + 4, m.ty + 4); ctx.moveTo(m.tx + 4, m.ty - 4); ctx.lineTo(m.tx - 4, m.ty + 4); ctx.stroke();
    }
    for (const b of g.booms) {
      const gr = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, Math.max(1, b.r));
      gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, b.enemy ? '#ff8a3a' : '#ffe45a'); gr.addColorStop(1, 'rgba(255,60,60,.2)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(0, b.r), 0, 7); ctx.fill();
    }
    g.text('Score: ' + g.score, 12, 18, 20, '#fff', null, 'left');
    g.text('Wave ' + g.wave, 320, 18, 18, '#ffd24a', null);
    g.text('Ammo: ' + g.ammo, 600, 18, 18, '#7ad0ff', null, 'right');
    if (g.waveMsg > 0 && g.state === 'play') g.text('WAVE ' + g.wave, 320, 200, 48, '#ffd24a', '#5a2000', 'center', g.FONT_TITLE);
  },
});
