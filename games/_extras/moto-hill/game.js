// Moto Hill - side view trials bike with simple rigid body physics
const GRAV = 900, WR = 12;
const WHEELS = [[-22, 14], [22, 14]];
const HEAD = [-2, -30];

// terrain is a list of [x, y] points, built from simple features
function buildLevel(n) {
  const pts = [[-200, 380], [300, 380]];
  let x = 300, y = 380;
  const add = (dx, dy) => { x += dx; y += dy; pts.push([x, y]); };
  const feats = [
    () => { add(80, -40); add(80, 40); },
    () => { add(95, -60); add(40, 0); add(95, 60); },
    () => { add(150, -85); add(12, 85); },
    () => { add(50, 30); add(60, 0); add(50, -30); },
    () => { for (let i = 0; i < 4; i++) { add(30, -16); add(30, 16); } },
    () => { add(150, -60); add(100, 0); },
    () => { add(120, 60); add(80, 0); },
    () => { add(60, -40); add(45, -28); add(60, 0); add(45, 28); add(60, 40); },
  ];
  let seed = 11 + n * 97;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const count = 10 + n * 4;
  for (let i = 0; i < count; i++) {
    feats[Math.floor(r() * (feats.length - (n === 0 ? 3 : 0)))]();
    add(60 + r() * 80, 0);
    if (y < 220) { add(120, 60); } if (y > 420) { add(120, -50); }
  }
  add(200, 0);
  const finish = x - 120;
  add(600, 0);
  return { pts, finish };
}

function groundAt(pts, x) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    if (x >= x1 && x <= x2) { const t = (x - x1) / (x2 - x1 || 1); return { y: y1 + (y2 - y1) * t, a: Math.atan2(y2 - y1, x2 - x1) }; }
  }
  return { y: 380, a: 0 };
}

MCC.game({
  id: 'moto-hill',
  title: 'Moto Hill',
  width: 640, height: 480,
  scored: false,
  instructions: ['UP to accelerate, DOWN to brake / reverse.', 'LEFT / RIGHT to lean back and forward - keep the bike balanced!', 'Reach the chequered flag. Land on your head and you crash!'],

  init(g) { g.lvl = 0; this.setup(g); g.state = 'title'; },
  start(g) { if (g.passed) g.lvl = (g.lvl + 1) % 3; g.passed = false; this.setup(g); },

  setup(g) {
    g.L = buildLevel(g.lvl);
    g.b = { x: 120, y: 330, vx: 0, vy: 0, a: 0, w: 0 };
    g.cam = 0; g.clock = 0; g.crashT = 0; g.faults = 0; g.wheelSpin = 0;
  },

  world(b, lx, ly) { const c = Math.cos(b.a), s = Math.sin(b.a); return [b.x + lx * c - ly * s, b.y + lx * s + ly * c]; },

  update(g, dt) {
    const b = g.b;
    if (g.crashT > 0) {
      g.crashT -= dt;
      b.vy += GRAV * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt;
      const gnd = groundAt(g.L.pts, b.x).y; if (b.y > gnd - 10) { b.y = gnd - 10; b.vy *= -0.3; b.vx *= 0.7; b.w *= 0.6; }
      if (g.crashT <= 0) {
        // respawn at last safe spot a bit back
        g.faults++;
        const x = Math.max(120, b.x - 140), gy = groundAt(g.L.pts, x);
        Object.assign(b, { x, y: gy.y - 30, vx: 0, vy: 0, a: gy.a, w: 0 });
      }
      return;
    }
    g.clock += dt;
    const gas = g.anyDown('ArrowUp', 'KeyW'), brake = g.anyDown('ArrowDown', 'KeyS');
    const lean = (g.anyDown('ArrowRight', 'KeyD') ? 1 : 0) - (g.anyDown('ArrowLeft', 'KeyA') ? 1 : 0);
    const steps = 8, h = dt / steps, I = 2200;
    let grounded = false;
    for (let s = 0; s < steps; s++) {
      b.vy += GRAV * h;
      b.w += lean * 9 * h;
      b.w *= Math.pow(0.6, h);
      b.x += b.vx * h; b.y += b.vy * h; b.a += b.w * h;
      WHEELS.forEach(([lx, ly], wi) => {
        const [wx, wy] = this.world(b, lx, ly);
        const gnd = groundAt(g.L.pts, wx);
        const pen = wy + WR - gnd.y;
        if (pen > -2) {
          grounded = true;
          const nx = Math.sin(gnd.a), ny = -Math.cos(gnd.a), tx = Math.cos(gnd.a), ty = Math.sin(gnd.a);
          if (pen > 0) { b.x += nx * pen * 0.8; b.y += ny * pen * 0.8; }
          const rx = wx - b.x, ry = wy - b.y;
          const vpx = b.vx - b.w * ry, vpy = b.vy + b.w * rx;
          const vn = vpx * nx + vpy * ny;
          const rn = rx * ny - ry * nx;
          if (vn < 0) {
            const j = -vn / (1 + rn * rn / I);
            b.vx += j * nx; b.vy += j * ny; b.w += j * rn / I;
          }
          // traction on the rear wheel, rolling friction on both
          const vt = vpx * tx + vpy * ty;
          let drive = 0;
          if (wi === 0 && gas) drive = 950 * h;
          if (brake) drive = vt > 5 ? -900 * h : vt > -80 ? -350 * h : 0;
          const fr = -vt * 0.9 * h;
          b.vx += tx * (drive + fr); b.vy += ty * (drive + fr);
        }
      });
      const [hx, hy] = this.world(b, HEAD[0], HEAD[1]);
      if (hy + 6 > groundAt(g.L.pts, hx).y) { g.crashT = 1.3; g.sfx('explode'); b.w = g.rand(-4, 4); return; }
    }
    if (!grounded && gas) b.w -= 0.8 * dt;
    g.wheelSpin += b.vx * dt / WR;
    if (b.x > g.L.finish) { g.passed = true; g.over('Finished!', 'Time ' + g.clock.toFixed(1) + 's  -  Faults: ' + g.faults, true); }
    if (b.y > 700) { g.crashT = 0.1; }
  },

  demo(g) {
    const x = 560, gy = groundAt(g.L.pts, x);
    Object.assign(g.b, { x, y: gy.y - 70, a: -0.35 });
    g.cam = x - 220; g.clock = 23.4;
  },

  draw(g, ctx) {
    const b = g.b;
    g.cam += (b.x - 220 - g.cam) * 0.1;
    if (g.demoMode) g.cam = b.x - 220;
    const cy = Math.min(0, Math.max(-200, 300 - b.y)) * 0.6;
    const sky = ctx.createLinearGradient(0, 0, 0, g.H);
    sky.addColorStop(0, '#6ac0ff'); sky.addColorStop(1, '#d8f0ff');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, g.W, g.H);
    ctx.fillStyle = '#a8c8e0';
    for (let i = -1; i < 5; i++) { const x = i * 220 - (g.cam * 0.2) % 220; ctx.beginPath(); ctx.moveTo(x, 330); ctx.lineTo(x + 110, 190); ctx.lineTo(x + 220, 330); ctx.fill(); }
    ctx.save(); ctx.translate(-g.cam, cy);
    const pts = g.L.pts;
    ctx.beginPath(); ctx.moveTo(pts[0][0], 900);
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.lineTo(pts[pts.length - 1][0], 900); ctx.closePath();
    const dirt = ctx.createLinearGradient(0, 200, 0, 600);
    dirt.addColorStop(0, '#b87a3a'); dirt.addColorStop(1, '#6a3a1a');
    ctx.fillStyle = dirt; ctx.fill();
    ctx.strokeStyle = '#5ac83a'; ctx.lineWidth = 6; ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    // finish flag
    const fx = g.L.finish, fy = groundAt(pts, fx).y;
    ctx.fillStyle = '#333'; ctx.fillRect(fx, fy - 80, 4, 80);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { ctx.fillStyle = (i + j) % 2 ? '#fff' : '#111'; ctx.fillRect(fx + 4 + i * 9, fy - 80 + j * 9, 9, 9); }
    // bike
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
    for (const [lx, ly] of WHEELS) {
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(lx, ly, WR, 0, 7); ctx.fill();
      ctx.fillStyle = '#bbb'; ctx.beginPath(); ctx.arc(lx, ly, WR - 5, 0, 7); ctx.fill();
      ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 3; k++) { const a = g.wheelSpin + k * 2.1; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + Math.cos(a) * (WR - 5), ly + Math.sin(a) * (WR - 5)); ctx.stroke(); }
    }
    ctx.strokeStyle = '#444'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-22, 14); ctx.lineTo(-4, 2); ctx.lineTo(16, 0); ctx.lineTo(22, 14); ctx.stroke();
    ctx.fillStyle = '#e8302a'; g.roundRect(-14, -6, 30, 12, 5); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-4, -4, 10, 3);
    if (g.crashT <= 0) {
      ctx.strokeStyle = '#1a4ab8'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-4, -22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, -18); ctx.lineTo(12, -8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(4, 6); ctx.stroke();
      ctx.fillStyle = '#ffd83a'; ctx.beginPath(); ctx.arc(HEAD[0], HEAD[1], 8, 0, 7); ctx.fill();
      ctx.fillStyle = '#2a2a2a'; ctx.fillRect(HEAD[0], HEAD[1] - 3, 8, 4);
    }
    ctx.restore();
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.5)'; g.roundRect(8, 8, 300, 30, 8); ctx.fill();
    g.text('Track ' + (g.lvl + 1) + '   Time ' + g.clock.toFixed(1) + 's   Faults ' + g.faults, 18, 23, 16, '#fff', null, 'left');
    const prog = Math.max(0, Math.min(1, b.x / g.L.finish));
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(420, 18, 200, 8); ctx.fillStyle = '#ffd24a'; ctx.fillRect(420, 18, 200 * prog, 8);
    if (g.crashT > 0) g.text('CRASH!', 320, 180, 48, '#ff5a3a', '#3a0000', 'center', g.FONT_TITLE);
  },
});
