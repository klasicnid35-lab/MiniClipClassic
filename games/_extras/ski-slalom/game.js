// Ski Slalom - steer downhill through the gates
MCC.game({
  id: 'ski-slalom',
  title: 'Ski Slalom',
  width: 640, height: 480,
  instructions: ['LEFT / RIGHT arrow keys (or move the mouse) to steer.', 'Ski between each pair of flags. Missing 3 gates ends your run.', "Trees and rocks will stop you dead - avoid them!"],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) {
    g.sk = { x: 320, dir: 0 }; g.speed = 220; g.objs = []; g.missed = 0; g.passed = 0; g.nextGate = 300; g.nextObs = 200; g.trail = []; g.side = 1;
  },

  update(g, dt) {
    const sk = g.sk;
    let steer = (g.anyDown('ArrowRight', 'KeyD') ? 1 : 0) - (g.anyDown('ArrowLeft', 'KeyA') ? 1 : 0);
    if (g.mouse.moved || g.mouse.down) steer = Math.max(-1, Math.min(1, (g.mouse.x - sk.x) / 60));
    sk.dir += (steer - sk.dir) * Math.min(1, dt * 6);
    const down = Math.cos(sk.dir * 1.1);
    g.speed = Math.min(520, g.speed + dt * 12);
    const vy = g.speed * (0.45 + 0.55 * down);
    sk.x += Math.sin(sk.dir * 1.1) * g.speed * dt;
    sk.x = Math.max(20, Math.min(620, sk.x));
    for (const o of g.objs) o.y -= vy * dt;
    for (const t of g.trail) t.y -= vy * dt;
    g.trail.push({ x: sk.x, y: 150 }); if (g.trail.length > 60) g.trail.shift();
    g.score = g.passed * 10 + Math.floor(g.speed / 10) * 0;
    g.nextGate -= vy * dt; g.nextObs -= vy * dt;
    if (g.nextGate <= 0) {
      g.side = -g.side;
      const cx = Math.max(110, Math.min(530, 320 + g.side * g.rand(40, 180)));
      const w = Math.max(90, 150 - g.passed * 1.5);
      g.objs.push({ type: 'gate', x: cx, w, y: 520, c: g.side > 0 ? '#e8302a' : '#2a6ae8' });
      g.nextGate = g.rand(220, 300);
    }
    if (g.nextObs <= 0) {
      const x = g.rand(20, 620);
      if (!g.objs.some((o) => o.type === 'gate' && Math.abs(o.y - 520) < 60 && Math.abs(o.x - x) < o.w)) g.objs.push({ type: Math.random() < 0.7 ? 'tree' : 'rock', x, y: 520 });
      g.nextObs = g.rand(50, 140) - Math.min(40, g.passed);
    }
    for (const o of g.objs) {
      if (o.type === 'gate' && !o.done && o.y < 150) {
        o.done = true;
        if (Math.abs(sk.x - o.x) < o.w / 2) { g.passed++; g.sfx('coin'); o.ok = true; }
        else { g.missed++; g.sfx('hit'); o.ok = false; if (g.missed >= 3) { g.over('Disqualified!', g.passed + ' gates passed'); return; } }
      }
      if (o.type !== 'gate' && Math.abs(o.y - 150) < 16 && Math.abs(o.x - sk.x) < 16) { g.sfx('explode'); g.over('Wipe Out!', g.passed + ' gates passed'); return; }
    }
    g.objs = g.objs.filter((o) => o.y > -60);
  },

  demo(g) {
    g.objs = [{ type: 'gate', x: 250, w: 140, y: 230, c: '#e8302a' }, { type: 'gate', x: 420, w: 140, y: 460, c: '#2a6ae8' }, { type: 'tree', x: 90, y: 300 }, { type: 'tree', x: 540, y: 180 }, { type: 'rock', x: 330, y: 380 }, { type: 'tree', x: 600, y: 420 }, { type: 'tree', x: 60, y: 90 }];
    g.sk.x = 280; g.sk.dir = -0.4;
    for (let i = 0; i < 40; i++) g.trail.push({ x: 280 + Math.sin(i / 6) * 40, y: 150 - (40 - i) * 4 });
    g.passed = 17; g.score = 170;
  },

  draw(g, ctx) {
    const snow = ctx.createLinearGradient(0, 0, 0, g.H);
    snow.addColorStop(0, '#f4faff'); snow.addColorStop(1, '#d8ecfa');
    ctx.fillStyle = snow; ctx.fillRect(0, 0, g.W, g.H);
    ctx.strokeStyle = 'rgba(120,160,200,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); g.trail.forEach((t, i) => (i ? ctx.lineTo(t.x - 5, t.y) : ctx.moveTo(t.x - 5, t.y))); ctx.stroke();
    ctx.beginPath(); g.trail.forEach((t, i) => (i ? ctx.lineTo(t.x + 5, t.y) : ctx.moveTo(t.x + 5, t.y))); ctx.stroke();
    for (const o of g.objs) {
      if (o.type === 'gate') {
        const col = o.done ? (o.ok ? 'rgba(80,200,80,.6)' : 'rgba(0,0,0,.25)') : o.c;
        for (const s of [-1, 1]) {
          const x = o.x + s * o.w / 2;
          ctx.fillStyle = '#555'; ctx.fillRect(x - 1, o.y - 28, 3, 30);
          ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + 2, o.y - 28); ctx.lineTo(x + 2 + s * 16, o.y - 21); ctx.lineTo(x + 2, o.y - 14); ctx.fill();
        }
      } else if (o.type === 'tree') {
        ctx.fillStyle = '#6a4a2a'; ctx.fillRect(o.x - 3, o.y, 6, 10);
        ctx.fillStyle = '#1a7a3a';
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(o.x, o.y - 34 + k * 10); ctx.lineTo(o.x - 16 + k * 2, o.y - 6 + k * 4 - 10 + 10); ctx.lineTo(o.x + 16 - k * 2, o.y - 6 + k * 4); ctx.fill(); }
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(o.x, o.y - 34); ctx.lineTo(o.x - 5, o.y - 26); ctx.lineTo(o.x + 5, o.y - 26); ctx.fill();
      } else { ctx.fillStyle = '#8a8a9a'; ctx.beginPath(); ctx.ellipse(o.x, o.y, 16, 11, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(o.x - 3, o.y - 7, 10, 4, 0, 0, 7); ctx.fill(); }
    }
    // skier
    const sk = g.sk;
    ctx.save(); ctx.translate(sk.x, 150); ctx.rotate(-sk.dir * 0.9);
    ctx.strokeStyle = '#e8302a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(-6, 16); ctx.moveTo(6, -10); ctx.lineTo(6, 16); ctx.stroke();
    ctx.fillStyle = '#2a6ae8'; g.roundRect(-8, -14, 16, 18, 5); ctx.fill();
    ctx.fillStyle = '#ffd2a6'; ctx.beginPath(); ctx.arc(0, -18, 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd83a'; ctx.beginPath(); ctx.arc(0, -20, 6, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-11, -8); ctx.lineTo(-13, 8); ctx.moveTo(11, -8); ctx.lineTo(13, 8); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(0,40,90,.7)'; g.roundRect(8, 8, 250, 30, 8); ctx.fill();
    g.text('Gates: ' + g.passed + '   Missed: ' + g.missed + '/3', 18, 23, 17, '#fff', null, 'left');
    g.text('SKI SLALOM', 620, 23, 22, '#2a6ae8', '#fff', 'right', g.FONT_TITLE);
  },
});
