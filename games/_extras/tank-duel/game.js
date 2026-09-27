// Tank Duel - turn based artillery on destructible hills, vs computer or 2 players
const W = 640, H = 480, GRAV = 260;

MCC.game({
  id: 'tank-duel',
  title: 'Tank Duel',
  width: 640, height: 480,
  scored: false,
  modes: ['1 Player', '2 Players'],
  instructions: ['LEFT / RIGHT to aim, UP / DOWN to set the power.', 'Press SPACE to fire. Watch the wind!', 'Hit the other tank 3 times to win. Players take turns on one keyboard.'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) {
    g.land = new Float32Array(W);
    const a = g.rand(0, 6), b = g.rand(0, 6), base = g.rand(300, 340);
    for (let x = 0; x < W; x++) g.land[x] = base + Math.sin(x / 90 + a) * 45 + Math.sin(x / 37 + b) * 18 - Math.exp(-((x - 320) ** 2) / 9000) * 110;
    g.tanks = [{ x: g.randInt(50, 150), hp: 3, ang: -0.9, pow: 60, c: '#3a8ae8', name: g.mode ? 'Blue' : 'You' }, { x: g.randInt(490, 590), hp: 3, ang: -2.2, pow: 60, c: '#e84a3a', name: g.mode ? 'Red' : 'Computer' }];
    g.turn = 0; g.shell = null; g.booms = []; g.wind = g.rand(-40, 40); g.aiT = 0; g.msg = null; g.aiShots = 0; g.aiTarget = null;
  },

  groundY(g, x) { return g.land[Math.max(0, Math.min(W - 1, Math.round(x)))]; },

  fire(g) {
    const t = g.tanks[g.turn];
    const ty = this.groundY(g, t.x) - 10;
    const sp = t.pow * 6.2;
    g.shell = { x: t.x + Math.cos(t.ang) * 18, y: ty + Math.sin(t.ang) * 18, vx: Math.cos(t.ang) * sp, vy: Math.sin(t.ang) * sp, trail: [] };
    g.sfx('explode');
  },

  aiPlan(g) {
    const t = g.tanks[1], foe = g.tanks[0];
    let best = null, bd = 1e9;
    for (let a = -2.9; a <= -1.7; a += 0.05) for (let p = 30; p <= 100; p += 2) {
      let x = t.x + Math.cos(a) * 18, y = this.groundY(g, t.x) - 10 + Math.sin(a) * 18, vx = Math.cos(a) * p * 6.2, vy = Math.sin(a) * p * 6.2;
      for (let s = 0; s < 400; s++) { vx += g.wind * 0.02; vy += GRAV * 0.02; x += vx * 0.02; y += vy * 0.02; if (x < 0 || x >= W || y > this.groundY(g, x)) break; }
      const d = Math.abs(x - foe.x);
      if (d < bd) { bd = d; best = { a, p }; }
    }
    g.aiShots = g.aiShots || 0;
    const err = Math.max(0, 3 - g.aiShots) * 0.03;
    g.aiTarget = { a: best.a + g.rand(-err, err), p: best.p + g.rand(-3, 3) * (err * 20) };
    g.aiShots++;
  },

  update(g, dt) {
    if (g.msg) { g.msg.t -= dt; if (g.msg.t <= 0) g.msg = null; }
    for (const b of g.booms) b.t -= dt; g.booms = g.booms.filter((b) => b.t > 0);
    if (g.shell) {
      const s = g.shell;
      for (let k = 0; k < 3; k++) {
        const h = dt / 3;
        s.vx += g.wind * h; s.vy += GRAV * h; s.x += s.vx * h; s.y += s.vy * h;
        if (s.x < -50 || s.x > W + 50 || s.y > H + 50) { g.shell = null; this.nextTurn(g); return; }
        const hitTank = g.tanks.find((t) => Math.hypot(t.x - s.x, this.groundY(g, t.x) - 8 - s.y) < 14);
        if (hitTank || (s.x >= 0 && s.x < W && s.y >= this.groundY(g, s.x))) { this.explode(g, s.x, s.y); g.shell = null; return; }
      }
      if (g.frame % 2 === 0) s.trail.push({ x: s.x, y: s.y });
      return;
    }
    const t = g.tanks[g.turn];
    const human = g.turn === 0 || g.mode === 1;
    if (human) {
      if (g.anyDown('ArrowLeft', 'KeyA')) t.ang = Math.max(-Math.PI + 0.05, t.ang - dt * 1.2);
      if (g.anyDown('ArrowRight', 'KeyD')) t.ang = Math.min(-0.05, t.ang + dt * 1.2);
      if (g.anyDown('ArrowUp', 'KeyW')) t.pow = Math.min(100, t.pow + dt * 30);
      if (g.anyDown('ArrowDown', 'KeyS')) t.pow = Math.max(10, t.pow - dt * 30);
      if (g.pressed('Space') || g.pressed('Enter')) this.fire(g);
    } else {
      if (!g.aiTarget) { this.aiPlan(g); g.aiT = 0.8; }
      t.ang += Math.sign(g.aiTarget.a - t.ang) * Math.min(Math.abs(g.aiTarget.a - t.ang), dt * 1.4);
      t.pow += Math.sign(g.aiTarget.p - t.pow) * Math.min(Math.abs(g.aiTarget.p - t.pow), dt * 40);
      g.aiT -= dt;
      if (g.aiT <= 0 && Math.abs(g.aiTarget.a - t.ang) < 0.01 && Math.abs(g.aiTarget.p - t.pow) < 0.5) { g.aiTarget = null; this.fire(g); }
    }
  },

  explode(g, x, y) {
    g.booms.push({ x, y, t: 0.5 }); g.sfx('explode');
    for (let dx = -30; dx <= 30; dx++) { const X = Math.round(x + dx); if (X < 0 || X >= W) continue; const depth = Math.sqrt(900 - dx * dx); if (g.land[X] < y + depth) g.land[X] = Math.max(g.land[X], y + depth); }
    let hit = false;
    for (const t of g.tanks) if (Math.hypot(t.x - x, this.groundY(g, t.x) - 8 - y) < 36) { t.hp--; hit = true; g.msg = { s: 'DIRECT HIT!', t: 1.2 }; }
    const dead = g.tanks.find((t) => t.hp <= 0);
    if (dead) { const w = g.tanks.find((t) => t !== dead); setTimeout(() => g.over(w.name + (g.mode || w === g.tanks[1] ? ' Wins!' : ' Win!'), 'Hits remaining: ' + w.hp, w === g.tanks[0] || g.mode === 1), 700); return; }
    if (!hit) g.msg = { s: 'Missed!', t: 0.8 };
    this.nextTurn(g);
  },

  nextTurn(g) { g.turn = 1 - g.turn; g.wind = Math.max(-60, Math.min(60, g.wind + g.rand(-15, 15))); },

  demo(g) { g.shell = { x: 330, y: 120, trail: Array.from({ length: 30 }, (_, i) => ({ x: 110 + i * 7.3, y: 250 - Math.sin(i / 30 * 2.4) * 140 })) }; g.tanks[0].x = 110; g.tanks[1].x = 540; g.tanks[1].hp = 2; },

  draw(g, ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#ffb86a'); sky.addColorStop(0.6, '#ffe0a8'); sky.addColorStop(1, '#fff0d0');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffec9a'; ctx.beginPath(); ctx.arc(520, 90, 40, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x < W; x++) ctx.lineTo(x, g.land[x]);
    ctx.lineTo(W, H); ctx.closePath();
    const dirt = ctx.createLinearGradient(0, 180, 0, H); dirt.addColorStop(0, '#7ac83a'); dirt.addColorStop(0.08, '#8a6a3a'); dirt.addColorStop(1, '#5a3a1a');
    ctx.fillStyle = dirt; ctx.fill();
    ctx.strokeStyle = '#5aa82a'; ctx.lineWidth = 4; ctx.beginPath(); for (let x = 0; x < W; x += 2) ctx.lineTo(x, g.land[x]); ctx.stroke();
    g.tanks.forEach((t, i) => {
      if (t.hp <= 0) return;
      const y = this.groundY(g, t.x);
      ctx.save(); ctx.translate(t.x, y - 10);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(t.ang) * 20, Math.sin(t.ang) * 20); ctx.stroke();
      ctx.fillStyle = t.c; ctx.beginPath(); ctx.arc(0, 0, 10, Math.PI, 0); ctx.fill(); g.roundRect(-16, 0, 32, 10, 4); ctx.fill();
      ctx.fillStyle = '#333'; for (let k = -12; k <= 12; k += 8) { ctx.beginPath(); ctx.arc(k, 10, 3.5, 0, 7); ctx.fill(); }
      ctx.restore();
      for (let k = 0; k < 3; k++) { ctx.fillStyle = k < t.hp ? '#4ad84a' : 'rgba(0,0,0,.3)'; ctx.fillRect(t.x - 15 + k * 11, y - 38, 9, 5); }
      if (i === g.turn && !g.shell && g.state === 'play') g.text('▼', t.x, y - 50, 16, t.c, '#fff');
    });
    if (g.shell) {
      ctx.fillStyle = 'rgba(255,255,255,.8)'; for (const p of g.shell.trail) { ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(g.shell.x, g.shell.y, 4, 0, 7); ctx.fill();
    }
    for (const b of g.booms) { const gr = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 40); gr.addColorStop(0, 'rgba(255,255,200,' + b.t * 2 + ')'); gr.addColorStop(1, 'rgba(255,80,0,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(b.x, b.y, 40, 0, 7); ctx.fill(); }
    const t = g.tanks[g.turn];
    ctx.fillStyle = 'rgba(0,0,0,.5)'; g.roundRect(8, 8, 624, 32, 8); ctx.fill();
    g.text(t.name === 'You' ? 'Your turn' : t.name + "'s turn", 20, 24, 18, t.c === '#3a8ae8' ? '#8fd0ff' : '#ffb0a0', null, 'left');
    g.text('Angle ' + Math.round(-t.ang * 180 / Math.PI) + '°   Power ' + Math.round(t.pow), 320, 24, 16, '#fff', null);
    g.text('Wind ' + (g.wind < 0 ? '◄ ' : '') + Math.abs(Math.round(g.wind)) + (g.wind > 0 ? ' ►' : ''), 620, 24, 16, '#bfe6ff', null, 'right');
    if (g.msg) g.text(g.msg.s, 320, 120, 36, '#fff', '#8a2000', 'center', g.FONT_TITLE);
  },
});
