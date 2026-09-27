// Space Rocks - asteroid blaster
MCC.game({
  id: 'space-rocks',
  title: 'Space Rocks',
  width: 640, height: 480,
  instructions: ['LEFT / RIGHT to rotate, UP to thrust, SPACE to fire.', 'Big rocks split into smaller ones. Clear the field to warp to the next wave!'],

  init(g) {
    g.stars = Array.from({ length: 90 }, () => ({ x: Math.random() * g.W, y: Math.random() * g.H, s: Math.random() * 1.6 + 0.3 }));
    this.start(g); g.state = 'title';
  },

  start(g) {
    g.lives = 3; g.wave = 0;
    g.ship = { x: 320, y: 240, a: -Math.PI / 2, vx: 0, vy: 0, inv: 2 };
    g.shots = []; g.parts = []; g.rocks = [];
    this.newWave(g);
  },

  rock(g, x, y, size) {
    const n = 11, pts = [];
    for (let i = 0; i < n; i++) pts.push(0.75 + Math.random() * 0.35);
    const sp = g.rand(30, 70) * (4 - size) * 0.6 + g.wave * 6;
    const a = g.rand(0, Math.PI * 2);
    return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: [0, 14, 26, 42][size], size, pts, rot: 0, vr: g.rand(-1, 1) };
  },

  newWave(g) {
    g.wave++;
    for (let i = 0; i < 3 + g.wave; i++) {
      let x, y;
      do { x = g.rand(0, g.W); y = g.rand(0, g.H); } while (Math.hypot(x - g.ship.x, y - g.ship.y) < 150);
      g.rocks.push(this.rock(g, x, y, 3));
    }
  },

  boom(g, x, y, n, c) {
    for (let i = 0; i < n; i++) { const a = Math.random() * 7, s = g.rand(40, 200); g.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: g.rand(0.3, 0.8), c }); }
  },

  update(g, dt) {
    const s = g.ship;
    const wrap = (o) => { o.x = (o.x + g.W) % g.W; o.y = (o.y + g.H) % g.H; };
    if (g.anyDown('ArrowLeft', 'KeyA')) s.a -= 4.2 * dt;
    if (g.anyDown('ArrowRight', 'KeyD')) s.a += 4.2 * dt;
    s.thrust = g.anyDown('ArrowUp', 'KeyW');
    if (s.thrust) { s.vx += Math.cos(s.a) * 260 * dt; s.vy += Math.sin(s.a) * 260 * dt; }
    s.vx *= 0.992; s.vy *= 0.992;
    s.x += s.vx * dt; s.y += s.vy * dt; wrap(s);
    s.inv -= dt;
    s.cool = (s.cool || 0) - dt;
    if (g.down('Space') && s.cool <= 0 && g.shots.length < 6) {
      g.shots.push({ x: s.x + Math.cos(s.a) * 14, y: s.y + Math.sin(s.a) * 14, vx: Math.cos(s.a) * 480 + s.vx, vy: Math.sin(s.a) * 480 + s.vy, t: 0.9 });
      s.cool = 0.18; g.sfx('shoot');
    }
    for (const b of g.shots) { b.x += b.vx * dt; b.y += b.vy * dt; b.t -= dt; wrap(b); }
    for (const r of g.rocks) { r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.vr * dt; wrap(r); }
    for (const p of g.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; }
    g.parts = g.parts.filter((p) => p.t > 0);
    // shots vs rocks
    const born = [];
    for (const b of g.shots) for (const r of g.rocks) {
      if (b.t > 0 && !r.dead && Math.hypot(b.x - r.x, b.y - r.y) < r.r) {
        b.t = 0; r.dead = true;
        g.addScore([0, 100, 50, 20][r.size]); g.sfx('explode');
        this.boom(g, r.x, r.y, 10, '#c8b89a');
        if (r.size > 1) for (let k = 0; k < 2; k++) born.push(this.rock(g, r.x, r.y, r.size - 1));
      }
    }
    g.shots = g.shots.filter((b) => b.t > 0);
    g.rocks = g.rocks.filter((r) => !r.dead).concat(born);
    // ship vs rocks
    if (s.inv <= 0) for (const r of g.rocks) {
      if (Math.hypot(s.x - r.x, s.y - r.y) < r.r + 9) {
        this.boom(g, s.x, s.y, 30, '#7fd0ff'); g.sfx('explode');
        g.lives--;
        if (g.lives <= 0) { g.over('Game Over', 'You reached wave ' + g.wave); return; }
        Object.assign(s, { x: 320, y: 240, vx: 0, vy: 0, a: -Math.PI / 2, inv: 3 });
        break;
      }
    }
    if (!g.rocks.length) { g.addScore(250); this.newWave(g); s.inv = 2; }
  },

  demo(g) {
    g.rocks = [this.rock(g, 110, 120, 3), this.rock(g, 500, 110, 3), this.rock(g, 480, 360, 2), this.rock(g, 190, 380, 2), this.rock(g, 390, 200, 1), this.rock(g, 560, 250, 1)];
    g.ship = { x: 290, y: 270, a: -0.7, vx: 0, vy: 0, inv: 0, thrust: true };
    g.shots = [{ x: 330, y: 234, t: 1 }, { x: 360, y: 210, t: 1 }];
    this.boom(g, 520, 130, 16, '#c8b89a');
    g.parts.forEach((p) => { p.x += p.vx * 0.12; p.y += p.vy * 0.12; });
    g.score = 4570;
  },

  draw(g, ctx) {
    ctx.fillStyle = '#05040f'; ctx.fillRect(0, 0, g.W, g.H);
    const neb = ctx.createRadialGradient(470, 140, 10, 470, 140, 300);
    neb.addColorStop(0, 'rgba(120,40,160,.35)'); neb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neb; ctx.fillRect(0, 0, g.W, g.H);
    for (const st of g.stars) { ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + st.s / 3) + ')'; ctx.fillRect(st.x, st.y, st.s, st.s); }
    for (const r of g.rocks) {
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot);
      ctx.beginPath();
      r.pts.forEach((k, i) => { const a = (i / r.pts.length) * Math.PI * 2; ctx.lineTo(Math.cos(a) * r.r * k, Math.sin(a) * r.r * k); });
      ctx.closePath();
      const gr = ctx.createRadialGradient(-r.r / 3, -r.r / 3, 2, 0, 0, r.r);
      gr.addColorStop(0, '#b9a58a'); gr.addColorStop(1, '#5a4a3a');
      ctx.fillStyle = gr; ctx.fill();
      ctx.strokeStyle = '#d8c8a8'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath(); ctx.arc(r.r * 0.25, r.r * 0.1, r.r * 0.2, 0, 7); ctx.fill();
      ctx.restore();
    }
    for (const p of g.parts) { ctx.fillStyle = p.c; ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffef6a';
    for (const b of g.shots) { ctx.beginPath(); ctx.arc(b.x, b.y, 2.5, 0, 7); ctx.fill(); }
    const s = g.ship;
    if (s.inv <= 0 || Math.floor(s.inv * 10) % 2) {
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
      if (s.thrust) { ctx.fillStyle = '#ff9a1a'; ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(-18 - Math.random() * 6, 0); ctx.lineTo(-8, 4); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-10, -10); ctx.lineTo(-6, 0); ctx.lineTo(-10, 10); ctx.closePath();
      const sg = ctx.createLinearGradient(0, -10, 0, 10); sg.addColorStop(0, '#e8f7ff'); sg.addColorStop(1, '#3a8de0');
      ctx.fillStyle = sg; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    }
    g.text('Score: ' + g.score, 12, 18, 20, '#fff', null, 'left');
    g.text('Wave ' + g.wave, 320, 18, 18, '#ffd24a', null);
    for (let i = 0; i < g.lives; i++) { ctx.save(); ctx.translate(560 + i * 20, 20); ctx.rotate(-Math.PI / 2); ctx.fillStyle = '#9fd4ff'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -6); ctx.lineTo(-6, 6); ctx.fill(); ctx.restore(); }
  },
});
