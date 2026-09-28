// Mini Putt - nine holes of crazy golf. Walls are line segments.
const HOLES = [
  { par: 2, ball: [120, 240], cup: [520, 240], walls: [] },
  { par: 2, ball: [100, 380], cup: [540, 110], walls: [[240, 140, 240, 480], [400, 40, 400, 340]] },
  { par: 3, ball: [90, 90], cup: [550, 390], walls: [[40, 200, 460, 200], [180, 300, 600, 300]] },
  { par: 2, ball: [100, 240], cup: [540, 240], walls: [[320, 40, 320, 180], [320, 300, 320, 440], [260, 240, 380, 240]] },
  { par: 3, ball: [320, 410], cup: [320, 90], walls: [[200, 160, 440, 160], [200, 160, 200, 300], [440, 160, 440, 300], [260, 330, 380, 330]] },
  { par: 2, ball: [80, 420], cup: [560, 70], walls: [[160, 360, 280, 240], [360, 240, 480, 120]], sand: [[290, 260, 90, 70]] },
  { par: 3, ball: [80, 240], cup: [560, 240], walls: [[180, 40, 180, 300], [300, 180, 300, 440], [420, 40, 420, 300]] },
  { par: 2, ball: [110, 110], cup: [530, 370], walls: [[260, 160, 380, 320]], water: [[220, 330, 160, 100]] },
  { par: 3, ball: [320, 240], cup: [80, 80], walls: [[200, 120, 440, 120], [440, 120, 440, 360], [200, 360, 440, 360], [200, 200, 200, 360]] },
];
const BOX = [40, 40, 600, 440];

MCC.game({
  id: 'mini-putt',
  title: 'Mini Putt',
  width: 640, height: 480,
  scored: false,
  instructions: ['Click and drag away from the ball, then let go to putt.', 'The longer the line, the harder the shot.', 'Sink the ball in all 9 holes in as few strokes as possible.'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) { g.hole = 0; g.card = []; this.load(g); },

  load(g) {
    const h = HOLES[g.hole];
    g.b = { x: h.ball[0], y: h.ball[1], vx: 0, vy: 0 };
    g.last = { x: g.b.x, y: g.b.y };
    g.strokes = 0; g.sunk = 0; g.aim = false; g.msg = null;
  },

  moving(g) { return Math.hypot(g.b.vx, g.b.vy) > 4; },

  update(g, dt) {
    const h = HOLES[g.hole], b = g.b;
    if (g.msg) { g.msg.t -= dt; if (g.msg.t <= 0) g.msg = null; }
    if (g.sunk > 0) {
      g.sunk -= dt;
      if (g.sunk <= 0) {
        g.card.push(g.strokes);
        g.hole++;
        if (g.hole >= HOLES.length) {
          const tot = g.card.reduce((a, c) => a + c, 0), par = HOLES.reduce((a, c) => a + c.par, 0);
          const d = tot - par;
          try { const best = +localStorage.getItem('mcc.minigolf.best') || 999; if (tot < best) localStorage.setItem('mcc.minigolf.best', String(tot)); } catch (e) {}
          g.over('Round Complete', tot + ' strokes (' + (d === 0 ? 'level par' : d > 0 ? d + ' over par' : -d + ' under par') + ')', d <= 0);
          return;
        }
        this.load(g);
      }
      return;
    }
    if (!this.moving(g)) {
      b.vx = b.vy = 0;
      if (g.mouse.clicked) g.aim = true;
      if (g.aim && g.mouse.released) {
        const dx = b.x - g.mouse.x, dy = b.y - g.mouse.y, pw = Math.min(160, Math.hypot(dx, dy));
        if (pw > 5) { const d = Math.hypot(dx, dy); b.vx = dx / d * pw * 4.6; b.vy = dy / d * pw * 4.6; g.strokes++; g.last = { x: b.x, y: b.y }; g.sfx('hit'); }
        g.aim = false;
      }
      return;
    }
    const steps = 6;
    for (let s = 0; s < steps; s++) {
      const t = dt / steps;
      b.x += b.vx * t; b.y += b.vy * t;
      if (b.x < BOX[0] + 8) { b.x = BOX[0] + 8; b.vx = Math.abs(b.vx) * 0.85; g.sfx('tick'); }
      if (b.x > BOX[2] - 8) { b.x = BOX[2] - 8; b.vx = -Math.abs(b.vx) * 0.85; g.sfx('tick'); }
      if (b.y < BOX[1] + 8) { b.y = BOX[1] + 8; b.vy = Math.abs(b.vy) * 0.85; g.sfx('tick'); }
      if (b.y > BOX[3] - 8) { b.y = BOX[3] - 8; b.vy = -Math.abs(b.vy) * 0.85; g.sfx('tick'); }
      for (const [x1, y1, x2, y2] of h.walls) {
        const vx = x2 - x1, vy = y2 - y1, L = vx * vx + vy * vy;
        const k = Math.max(0, Math.min(1, ((b.x - x1) * vx + (b.y - y1) * vy) / L));
        const px = x1 + vx * k, py = y1 + vy * k, dx = b.x - px, dy = b.y - py, d = Math.hypot(dx, dy);
        if (d < 12) {
          const nx = dx / d, ny = dy / d, dot = b.vx * nx + b.vy * ny;
          if (dot < 0) { b.vx -= 1.85 * dot * nx; b.vy -= 1.85 * dot * ny; g.sfx('tick'); }
          b.x = px + nx * 12; b.y = py + ny * 12;
        }
      }
    }
    let fr = 0.985;
    for (const [x, y, w, hh] of h.sand || []) if (b.x > x && b.x < x + w && b.y > y && b.y < y + hh) fr = 0.93;
    b.vx *= Math.pow(fr, dt * 60); b.vy *= Math.pow(fr, dt * 60);
    for (const [x, y, w, hh] of h.water || []) if (b.x > x && b.x < x + w && b.y > y && b.y < y + hh) {
      b.x = g.last.x; b.y = g.last.y; b.vx = b.vy = 0; g.strokes++; g.msg = { s: 'Splash! +1 stroke', t: 1.5 }; g.sfx('lose');
    }
    const cd = Math.hypot(b.x - h.cup[0], b.y - h.cup[1]);
    if (cd < 11 && Math.hypot(b.vx, b.vy) < 420) {
      g.sunk = 1.4; b.x = h.cup[0]; b.y = h.cup[1]; b.vx = b.vy = 0; g.sfx('win');
      const names = { '-2': 'Eagle!', '-1': 'Birdie!', 0: 'Par', 1: 'Bogey', 2: 'Double Bogey' };
      g.msg = { s: g.strokes === 1 ? 'HOLE IN ONE!' : names[g.strokes - h.par] || g.strokes + ' strokes', t: 1.4 };
    } else if (cd < 30 && Math.hypot(b.vx, b.vy) < 250) { b.vx += (h.cup[0] - b.x) * 0.6 * dt; b.vy += (h.cup[1] - b.y) * 0.6 * dt; }
  },

  demo(g) { g.hole = 5; this.load(g); g.b.x = 250; g.b.y = 330; g.card = [2, 3, 2, 2, 4]; g.demoAim = true; },

  draw(g, ctx) {
    const h = HOLES[g.hole] || HOLES[HOLES.length - 1];
    ctx.fillStyle = '#2a6a1a'; ctx.fillRect(0, 0, g.W, g.H);
    for (let i = 0; i < 60; i++) { ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect((i * 71) % 640, (i * 47) % 480, 4, 10); }
    ctx.fillStyle = '#8a5a2a'; g.roundRect(BOX[0] - 10, BOX[1] - 10, BOX[2] - BOX[0] + 20, BOX[3] - BOX[1] + 20, 12); ctx.fill();
    const green = ctx.createLinearGradient(0, BOX[1], 0, BOX[3]);
    green.addColorStop(0, '#6ad84a'); green.addColorStop(1, '#4ab82a');
    ctx.fillStyle = green; ctx.fillRect(BOX[0], BOX[1], BOX[2] - BOX[0], BOX[3] - BOX[1]);
    for (let x = BOX[0]; x < BOX[2]; x += 40) { ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(x, BOX[1], 20, BOX[3] - BOX[1]); }
    for (const [x, y, w, hh] of h.sand || []) { ctx.fillStyle = '#f0d890'; g.roundRect(x, y, w, hh, 20); ctx.fill(); }
    for (const [x, y, w, hh] of h.water || []) { ctx.fillStyle = '#3a8ae8'; g.roundRect(x, y, w, hh, 20); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 20, y + 30); ctx.quadraticCurveTo(x + 40, y + 20, x + 60, y + 30); ctx.stroke(); }
    ctx.lineCap = 'round';
    for (const [x1, y1, x2, y2] of h.walls) { ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = '#c8904a'; ctx.lineWidth = 4; ctx.stroke(); }
    ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(h.cup[0], h.cup[1], 11, 0, 7); ctx.fill();
    ctx.fillStyle = '#ddd'; ctx.fillRect(h.cup[0] - 1, h.cup[1] - 50, 3, 50);
    ctx.fillStyle = '#e82a2a'; ctx.beginPath(); ctx.moveTo(h.cup[0] + 2, h.cup[1] - 50); ctx.lineTo(h.cup[0] + 26, h.cup[1] - 42); ctx.lineTo(h.cup[0] + 2, h.cup[1] - 34); ctx.fill();
    const b = g.b;
    if ((g.aim && !this.moving(g)) || g.demoAim) {
      const mx = g.demoAim ? b.x - 60 : g.mouse.x, my = g.demoAim ? b.y + 70 : g.mouse.y;
      const dx = b.x - mx, dy = b.y - my, pw = Math.min(160, Math.hypot(dx, dy)), d = Math.hypot(dx, dy) || 1;
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + dx / d * pw * 1.2, b.y + dy / d * pw * 1.2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(b.x - 30, b.y + 18, 60, 8);
      ctx.fillStyle = pw > 120 ? '#ff4a4a' : pw > 60 ? '#ffd24a' : '#4ad84a'; ctx.fillRect(b.x - 30, b.y + 18, 60 * pw / 160, 8);
    }
    if (g.sunk <= 0) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(b.x + 2, b.y + 3, 8, 6, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, 7); ctx.fill(); ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.fillStyle = 'rgba(0,0,0,.5)'; g.roundRect(10, 450, 620, 26, 8); ctx.fill();
    g.text('Hole ' + Math.min(9, g.hole + 1) + '/9   Par ' + h.par + '   Strokes: ' + g.strokes, 20, 463, 16, '#fff', null, 'left');
    g.text('Total: ' + g.card.reduce((a, c) => a + c, 0), 620, 463, 16, '#ffd24a', null, 'right');
    g.text('MINI PUTT', 320, 20, 24, '#fff', '#1a4a0a', 'center', g.FONT_TITLE);
    if (g.msg) g.text(g.msg.s, 320, 240, 40, '#ffe45a', '#5a2a00', 'center', g.FONT_TITLE);
  },
});
