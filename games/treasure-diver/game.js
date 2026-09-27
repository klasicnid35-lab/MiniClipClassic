// Treasure Diver - dive for gold, watch your air, bank treasure at the surface
MCC.game({
  id: 'treasure-diver',
  title: 'Treasure Diver',
  width: 640, height: 480,
  instructions: ['ARROW keys to steer your mini submarine.', 'Pick up treasure and carry it back to the boat to bank it.', 'Grab air bubbles and avoid the jellyfish. Out of air = game over!'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) {
    g.sub = { x: 320, y: 70, vx: 0, vy: 0, face: 1 };
    g.air = 100; g.carry = 0; g.banked = 0; g.cam = 0;
    g.items = []; g.jelly = []; g.bubbles = []; g.fx = [];
    for (let i = 0; i < 26; i++) g.items.push({ x: g.rand(30, 1250), y: g.rand(200, 900), t: 'gold', v: 10 + Math.floor(g.rand(0, 3)) * 10 });
    for (let i = 0; i < 6; i++) g.items.push({ x: g.rand(60, 1220), y: g.rand(700, 920), t: 'chest', v: 100 });
    for (let i = 0; i < 10; i++) g.jelly.push({ x: g.rand(0, 1280), y: g.rand(260, 900), ph: g.rand(0, 6), vx: g.rand(-30, 30) });
    g.air = 100;
  },

  update(g, dt) {
    const s = g.sub;
    const ax = (g.anyDown('ArrowRight', 'KeyD') ? 1 : 0) - (g.anyDown('ArrowLeft', 'KeyA') ? 1 : 0);
    const ay = (g.anyDown('ArrowDown', 'KeyS') ? 1 : 0) - (g.anyDown('ArrowUp', 'KeyW') ? 1 : 0);
    if (ax) s.face = ax;
    const heavy = 1 + g.carry / 200;
    s.vx += ax * 420 * dt / heavy; s.vy += ay * 420 * dt / heavy + 25 * dt * g.carry / 60;
    s.vx *= Math.pow(0.12, dt); s.vy *= Math.pow(0.12, dt);
    s.x = Math.max(20, Math.min(1260, s.x + s.vx * dt));
    s.y = Math.max(60, Math.min(940, s.y + s.vy * dt));
    g.cam += (Math.max(0, Math.min(1280 - 640, s.x - 320)) - g.cam) * Math.min(1, dt * 5);
    g.camY = Math.max(0, Math.min(1000 - 480, s.y - 240));
    const depthFactor = 1 + s.y / 400;
    if (s.y > 72) g.air -= dt * 2.6 * depthFactor; else { g.air = Math.min(100, g.air + dt * 40); if (g.carry) { g.banked += g.carry; g.addScore(g.carry); g.fx.push({ x: s.x, y: s.y - 30, t: 1, s: '+' + g.carry }); g.carry = 0; g.sfx('win'); } }
    if (g.air <= 0) { g.air = 0; g.over('Out of Air!', 'Treasure banked: ' + g.banked); return; }
    if (Math.random() < dt * 1.2) g.bubbles.push({ x: g.rand(20, 1260), y: 1000, big: Math.random() < 0.35 });
    for (const b of g.bubbles) { b.y -= (b.big ? 50 : 80) * dt; b.x += Math.sin(b.y / 30) * 0.5; if (b.big && Math.hypot(b.x - s.x, b.y - s.y) < 28) { b.y = -99; g.air = Math.min(100, g.air + 25); g.sfx('pop'); } }
    g.bubbles = g.bubbles.filter((b) => b.y > 60);
    for (const it of g.items) if (!it.got && Math.hypot(it.x - s.x, it.y - s.y) < 26) { it.got = true; g.carry += it.v; g.sfx('coin'); g.fx.push({ x: it.x, y: it.y, t: 0.8, s: '+' + it.v }); }
    for (const j of g.jelly) {
      j.ph += dt * 2; j.x += j.vx * dt; j.y += Math.sin(j.ph) * 20 * dt;
      if (j.x < 0 || j.x > 1280) j.vx = -j.vx;
      if (Math.hypot(j.x - s.x, j.y - s.y) < 30 && !j.cool) { j.cool = 1.5; g.air -= 20; g.sfx('hit'); s.vx = -s.vx - Math.sign(j.x - s.x) * 200; }
      if (j.cool) { j.cool -= dt; if (j.cool < 0) j.cool = 0; }
    }
    for (const f of g.fx) { f.t -= dt; f.y -= 30 * dt; }
    g.fx = g.fx.filter((f) => f.t > 0);
    if (g.items.every((i) => i.got) && !g.carry) { g.addScore(Math.floor(g.air) * 5); g.over('Ocean Cleared!', 'You found every treasure!', true); }
  },

  demo(g) { g.sub = { x: 330, y: 330, vx: 0, vy: 0, face: 1 }; g.cam = 20; g.camY = 90; g.carry = 60; g.air = 58; g.score = 380;
    g.items = [{ x: 420, y: 380, t: 'gold', v: 20 }, { x: 250, y: 470, t: 'chest', v: 100 }, { x: 520, y: 300, t: 'gold', v: 10 }, { x: 150, y: 330, t: 'gold', v: 30 }];
    g.jelly = [{ x: 520, y: 450, ph: 1 }, { x: 180, y: 240, ph: 2 }];
    g.bubbles = [{ x: 400, y: 250, big: true }, { x: 280, y: 200 }, { x: 290, y: 170 }]; },

  draw(g, ctx) {
    const cy = g.camY || 0;
    const sea = ctx.createLinearGradient(0, -cy, 0, 1000 - cy);
    sea.addColorStop(0, '#3ac8ff'); sea.addColorStop(0.3, '#1a78c8'); sea.addColorStop(1, '#061a4a');
    ctx.fillStyle = sea; ctx.fillRect(0, 0, g.W, g.H);
    ctx.save(); ctx.translate(-g.cam, -cy);
    ctx.fillStyle = '#bfeaff'; ctx.fillRect(g.cam, 0, 640, 60);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; for (let x = 0; x < 1280; x += 40) { ctx.beginPath(); ctx.arc(x + ((g.frame * 0.5) % 40), 60, 12, Math.PI, 0); ctx.fill(); }
    // boat
    ctx.fillStyle = '#8a4a2a'; ctx.beginPath(); ctx.moveTo(250, 40); ctx.lineTo(390, 40); ctx.lineTo(370, 62); ctx.lineTo(270, 62); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(305, 0, 4, 40); ctx.beginPath(); ctx.moveTo(309, 4); ctx.lineTo(350, 34); ctx.lineTo(309, 34); ctx.fill();
    // sea floor
    ctx.fillStyle = '#c8a86a'; ctx.beginPath(); ctx.moveTo(0, 1000); for (let x = 0; x <= 1280; x += 40) ctx.lineTo(x, 950 + Math.sin(x / 90) * 18); ctx.lineTo(1280, 1000); ctx.fill();
    for (let x = 30; x < 1280; x += 110) { ctx.strokeStyle = '#2a8a4a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, 960); ctx.quadraticCurveTo(x + Math.sin(g.frame * 0.03 + x) * 14, 900, x + 4, 860); ctx.stroke(); }
    for (const it of g.items) if (!it.got) {
      if (it.t === 'gold') { ctx.fillStyle = '#ffd83a'; ctx.beginPath(); ctx.arc(it.x, it.y, 8, 0, 7); ctx.fill(); ctx.strokeStyle = '#c88a00'; ctx.lineWidth = 2; ctx.stroke(); }
      else { ctx.fillStyle = '#8a5a2a'; ctx.fillRect(it.x - 16, it.y - 10, 32, 20); ctx.fillStyle = '#ffd83a'; ctx.fillRect(it.x - 16, it.y - 3, 32, 3); ctx.fillRect(it.x - 3, it.y - 3, 6, 8); }
    }
    for (const b of g.bubbles) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, b.big ? 12 : 4, 0, 7); ctx.stroke(); if (b.big) g.text('AIR', b.x, b.y, 9, '#fff', null); }
    for (const j of g.jelly) {
      ctx.fillStyle = 'rgba(255,120,220,.75)'; ctx.beginPath(); ctx.arc(j.x, j.y, 16, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(255,160,230,.8)'; ctx.lineWidth = 2;
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(j.x + k * 6, j.y); ctx.quadraticCurveTo(j.x + k * 6 + Math.sin(j.ph + k) * 6, j.y + 14, j.x + k * 6, j.y + 26); ctx.stroke(); }
    }
    const s = g.sub;
    ctx.save(); ctx.translate(s.x, s.y); ctx.scale(s.face, 1);
    ctx.fillStyle = '#ffd83a'; ctx.beginPath(); ctx.ellipse(0, 0, 26, 14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8a800'; ctx.fillRect(-6, -22, 12, 10); ctx.fillRect(-2, -30, 3, 10);
    ctx.fillStyle = '#9fe0ff'; ctx.beginPath(); ctx.arc(10, -2, 6, 0, 7); ctx.fill(); ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#555'; ctx.fillRect(-32, -6, 6, 12);
    ctx.restore();
    for (const f of g.fx) g.text(f.s, f.x, f.y, 18, '#ffe45a', '#000');
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.45)'; g.roundRect(8, 8, 360, 30, 8); ctx.fill();
    g.text('Banked: ' + g.banked + '   Carrying: ' + g.carry, 18, 23, 16, '#fff', null, 'left');
    g.text('AIR', 400, 23, 16, '#bfeaff', null);
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(420, 15, 150, 16);
    ctx.fillStyle = g.air < 25 ? '#ff4a4a' : '#5ae8ff'; ctx.fillRect(420, 15, 150 * g.air / 100, 16);
  },
});
