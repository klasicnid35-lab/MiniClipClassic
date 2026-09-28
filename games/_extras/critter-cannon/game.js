// Critter Cannon - launch the critter as far as it will bounce
const GROUND = 420, G = 700;

MCC.game({
  id: 'critter-cannon',
  title: 'Critter Cannon',
  width: 640, height: 480,
  instructions: ['Move the mouse to aim the cannon.', 'Hold the mouse button (or SPACE) to charge up, let go to FIRE!', 'Bounce pads send you flying. Spikes and mud stop you dead. 5 shots!'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) { g.shots = 5; g.best5 = 0; g.total = 0; this.ready(g); },

  ready(g) {
    g.phase = 'aim'; g.power = 0; g.charge = false; g.angle = -0.8;
    g.c = { x: 110, y: GROUND - 60, vx: 0, vy: 0, rot: 0, sq: 0 };
    g.cam = 0; g.dist = 0; g.stopT = 0; g.trail = [];
    g.things = [];
    for (let x = 700; x < 30000; x += g.rand(260, 700)) g.things.push({ x, t: Math.random() < 0.55 ? 'pad' : Math.random() < 0.6 ? 'spike' : 'mud' });
  },

  update(g, dt) {
    if (g.phase === 'aim') {
      if (g.mouse.x >= 0) g.angle = Math.max(-1.45, Math.min(-0.05, Math.atan2(g.mouse.y - (GROUND - 40), g.mouse.x - 80)));
      if (g.anyDown('ArrowUp')) g.angle = Math.max(-1.45, g.angle - dt);
      if (g.anyDown('ArrowDown')) g.angle = Math.min(-0.05, g.angle + dt);
      if (g.mouse.down || g.down('Space')) { g.charge = true; g.power = Math.min(1, g.power + dt * 0.9); }
      else if (g.charge) {
        g.phase = 'fly';
        const sp = 450 + g.power * 900;
        g.c.x = 80 + Math.cos(g.angle) * 60; g.c.y = GROUND - 40 + Math.sin(g.angle) * 60;
        g.c.vx = Math.cos(g.angle) * sp; g.c.vy = Math.sin(g.angle) * sp;
        g.sfx('explode'); g.boom = 0.3;
      }
      return;
    }
    if (g.boom > 0) g.boom -= dt;
    const c = g.c;
    if (g.phase === 'fly') {
      c.vy += G * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vx * dt * 0.02;
      c.vx *= Math.pow(0.995, dt * 60);
      if (g.frame % 3 === 0) g.trail.push({ x: c.x, y: c.y }); if (g.trail.length > 40) g.trail.shift();
      if (c.y > GROUND - 14) {
        c.y = GROUND - 14;
        const hit = g.things.find((t) => Math.abs(t.x - c.x) < 34);
        if (hit && hit.t === 'pad') { c.vy = -Math.max(520, Math.abs(c.vy) * 1.05); c.vx = Math.max(c.vx, 380) * 1.1; c.sq = 0.3; g.sfx('bounce'); g.addScore(0); }
        else if (hit && (hit.t === 'spike' || hit.t === 'mud')) { c.vx = 0; c.vy = 0; g.sfx(hit.t === 'spike' ? 'hit' : 'pop'); c.stuck = hit.t; }
        else if (Math.abs(c.vy) > 120) { c.vy = -c.vy * 0.5; c.vx *= 0.78; c.sq = 0.2; g.sfx('bounce'); }
        else { c.vy = 0; c.vx *= Math.pow(0.1, dt); }
      }
      if (c.sq > 0) c.sq -= dt;
      g.dist = Math.max(0, Math.floor((c.x - 110) / 10));
      if (Math.abs(c.vx) < 8 && c.y >= GROUND - 15) { g.phase = 'done'; g.stopT = 1.8; g.total += g.dist; g.best5 = Math.max(g.best5, g.dist); g.score = g.total; g.sfx(g.dist > 300 ? 'win' : 'blip'); }
    }
    if (g.phase === 'done') {
      g.stopT -= dt;
      if (g.stopT <= 0) {
        g.shots--;
        if (g.shots <= 0) { g.over('Out of Shots!', 'Total distance ' + g.total + 'm  -  longest ' + g.best5 + 'm'); return; }
        this.ready(g);
      }
    }
    g.cam += (Math.max(0, c.x - 240) - g.cam) * Math.min(1, dt * 6);
  },

  demo(g) { g.phase = 'fly'; g.c = { x: 520, y: 180, vx: 500, vy: -80, rot: 0.6, sq: 0 }; g.cam = 200; for (let i = 0; i < 30; i++) g.trail.push({ x: 250 + i * 9, y: 330 - Math.sin(i / 30 * 2.2) * 170 }); g.things = [{ x: 560, t: 'pad' }, { x: 760, t: 'spike' }, { x: 380, t: 'mud' }]; g.dist = 42; g.total = 612; },

  critter(g, ctx, x, y, rot, sq) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1 + sq, 1 - sq);
    ctx.fillStyle = '#ff7ab8'; ctx.beginPath(); ctx.ellipse(-8, -14, 5, 11, -0.4, 0, 7); ctx.ellipse(8, -14, 5, 11, 0.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff9ad0'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-5, -3, 5, 0, 7); ctx.arc(6, -3, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-4, -2, 2.2, 0, 7); ctx.arc(7, -2, 2.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#c0306a'; ctx.beginPath(); ctx.ellipse(1, 7, 5, 3, 0, 0, Math.PI); ctx.fill();
    ctx.restore();
  },

  draw(g, ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, g.H);
    sky.addColorStop(0, '#5ab4ff'); sky.addColorStop(1, '#d8f4ff');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, g.W, g.H);
    ctx.fillStyle = '#a8e0a0';
    for (let i = -1; i < 6; i++) { const x = i * 200 - (g.cam * 0.3) % 200; ctx.beginPath(); ctx.arc(x, 430, 120, Math.PI, 0); ctx.fill(); }
    ctx.save(); ctx.translate(-g.cam, 0);
    ctx.fillStyle = '#5ac83a'; ctx.fillRect(g.cam - 10, GROUND, 700, 70);
    ctx.fillStyle = '#3a9a2a'; ctx.fillRect(g.cam - 10, GROUND, 700, 6);
    for (let m = Math.floor(g.cam / 500) * 500; m < g.cam + 700; m += 500) { ctx.fillStyle = '#fff'; ctx.fillRect(m + 110, GROUND + 14, 3, 20); g.text(m / 10 + 'm', m + 111, GROUND + 44, 14, '#fff', '#2a6a1a'); }
    for (const t of g.things) {
      if (t.x < g.cam - 60 || t.x > g.cam + 700) continue;
      if (t.t === 'pad') { ctx.fillStyle = '#e8302a'; ctx.fillRect(t.x - 30, GROUND - 10, 60, 10); ctx.fillStyle = '#ffd83a'; ctx.fillRect(t.x - 26, GROUND - 16, 52, 6); ctx.strokeStyle = '#555'; ctx.lineWidth = 2; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(t.x + k * 10, GROUND - 10); ctx.lineTo(t.x + k * 10 + 4, GROUND - 4); ctx.stroke(); } }
      if (t.t === 'spike') { ctx.fillStyle = '#999'; for (let k = -3; k < 3; k++) { ctx.beginPath(); ctx.moveTo(t.x + k * 10, GROUND); ctx.lineTo(t.x + k * 10 + 5, GROUND - 22); ctx.lineTo(t.x + k * 10 + 10, GROUND); ctx.fill(); } }
      if (t.t === 'mud') { ctx.fillStyle = '#6a4a2a'; ctx.beginPath(); ctx.ellipse(t.x, GROUND + 2, 34, 9, 0, 0, 7); ctx.fill(); }
    }
    ctx.fillStyle = 'rgba(255,255,255,.7)'; for (const p of g.trail) { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill(); }
    // cannon
    ctx.fillStyle = '#6a4a2a'; ctx.beginPath(); ctx.arc(70, GROUND - 14, 16, 0, 7); ctx.arc(100, GROUND - 14, 16, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(80, GROUND - 40); ctx.rotate(g.angle || -0.8);
    ctx.fillStyle = '#333'; g.roundRect(-14, -16, 76, 32, 10); ctx.fill(); ctx.fillStyle = '#555'; ctx.fillRect(52, -18, 12, 36);
    ctx.restore();
    ctx.fillStyle = '#444'; ctx.beginPath(); ctx.arc(80, GROUND - 40, 20, 0, 7); ctx.fill();
    if (g.boom > 0) { ctx.fillStyle = 'rgba(255,200,60,' + g.boom * 3 + ')'; ctx.beginPath(); ctx.arc(80 + Math.cos(g.angle) * 70, GROUND - 40 + Math.sin(g.angle) * 70, 30, 0, 7); ctx.fill(); }
    if (g.phase !== 'aim') this.critter(g, ctx, g.c.x, g.c.y, g.c.stuck ? 0 : g.c.rot, g.c.sq);
    else this.critter(g, ctx, 80 + Math.cos(g.angle) * 40, GROUND - 40 + Math.sin(g.angle) * 40, 0, 0);
    ctx.restore();
    if (g.phase === 'aim' && g.state === 'play') {
      ctx.fillStyle = 'rgba(0,0,0,.5)'; g.roundRect(20, 60, 22, 150, 6); ctx.fill();
      const pc = ctx.createLinearGradient(0, 210, 0, 60); pc.addColorStop(0, '#4ad84a'); pc.addColorStop(0.6, '#ffd83a'); pc.addColorStop(1, '#ff3a3a');
      ctx.fillStyle = pc; ctx.fillRect(24, 206 - 142 * g.power, 14, 142 * g.power);
      g.text('POWER', 31, 224, 12, '#fff', '#000');
    }
    ctx.fillStyle = 'rgba(0,0,0,.45)'; g.roundRect(8, 8, 380, 30, 8); ctx.fill();
    g.text('Distance: ' + g.dist + 'm   Shots left: ' + g.shots + '   Total: ' + g.total, 18, 23, 16, '#fff', null, 'left');
    g.text('CRITTER CANNON', 628, 24, 20, '#ff7ab8', '#5a0a3a', 'right', g.FONT_TITLE);
    if (g.phase === 'done') g.text(g.dist + ' m!', 320, 200, 50, '#fff', '#c0306a', 'center', g.FONT_TITLE);
  },
});
