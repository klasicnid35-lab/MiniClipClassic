// Turbo Track - top-down micro racing on three circuits, 3 laps
const TRACKS = [
  { name: 'Oval Speedway', pts: [[120, 120], [520, 120], [590, 190], [590, 310], [520, 380], [120, 380], [50, 310], [50, 190]], grass: '#4aa83a' },
  { name: 'Twisty Hills', pts: [[90, 100], [300, 80], [380, 190], [540, 90], [600, 220], [470, 280], [560, 400], [300, 410], [220, 300], [80, 380], [50, 230]], grass: '#5ab84a' },
  { name: 'Desert Loop', pts: [[80, 80], [560, 70], [600, 200], [420, 220], [420, 300], [590, 330], [540, 420], [150, 420], [60, 330], [220, 260], [60, 180]], grass: '#e0c080' },
];
const ROAD = 72;

function smooth(pts, n = 10) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[(i - 1 + pts.length) % pts.length], p1 = pts[i], p2 = pts[(i + 1) % pts.length], p3 = pts[(i + 2) % pts.length];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}

MCC.game({
  id: 'turbo-track',
  title: 'Turbo Track',
  width: 640, height: 480,
  scored: false,
  modes: ['1 Player', '2 Players'],
  instructions: ['Player 1 (blue car): ARROW keys.', 'Player 2 (red car): W A S D.', 'Race 3 laps against the computer cars. Stay on the road - the grass slows you down!'],

  init(g) { g.trackI = 0; this.setup(g); g.state = 'title'; },
  start(g) { this.setup(g); },

  setup(g) {
    const T = TRACKS[g.trackI % TRACKS.length];
    g.T = T; g.path = smooth(T.pts);
    const p0 = g.path[0], p1 = g.path[3];
    const a = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
    const nx = -Math.sin(a), ny = Math.cos(a);
    const grid = [[-1, -18], [-1, 18], [-3, -18], [-3, 18]];
    const colors = ['#2a7ae8', '#e8302a', '#f0c020', '#30b040'];
    g.cars = grid.map(([back, side], i) => ({
      x: p0[0] + Math.cos(a) * back * 22 + nx * side, y: p0[1] + Math.sin(a) * back * 22 + ny * side,
      a, v: 0, c: colors[i], lap: 0, idx: 0, prog: 0, human: i === 0 || (i === 1 && g.mode === 1), id: i, done: false, finishT: 0, skill: 0.84 + i * 0.03,
    }));
    const n = g.path.length;
    for (const c of g.cars) { const near = this.nearest(g, c.x, c.y); c.idx = near.i; c.lap = near.i > n / 2 ? -1 : 0; }
    g.count = 3; g.raceT = 0; g.finished = [];
  },

  nearest(g, x, y, hint) {
    const P = g.path, n = P.length;
    let best = hint || 0, bd = 1e9;
    const range = hint == null ? n : 30;
    for (let k = -range; k <= range; k++) {
      const i = ((hint || 0) + k + n * 2) % n;
      const d = (P[i][0] - x) ** 2 + (P[i][1] - y) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return { i: best, d: Math.sqrt(bd) };
  },

  update(g, dt) {
    if (g.count > 0) { const c = Math.ceil(g.count); g.count -= dt; if (Math.ceil(g.count) !== c) g.sfx(g.count <= 0 ? 'coin' : 'blip'); return; }
    g.raceT += dt;
    const n = g.path.length;
    for (const car of g.cars) {
      if (car.done) { car.v *= 0.96; car.x += Math.cos(car.a) * car.v * dt; car.y += Math.sin(car.a) * car.v * dt; continue; }
      let acc = 0, steer = 0;
      if (car.human) {
        const k = car.id === 0 ? ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] : ['KeyW', 'KeyS', 'KeyA', 'KeyD'];
        if (car.id === 0 && g.mode === 0) k.push('KeyW', 'KeyS', 'KeyA', 'KeyD');
        acc = (g.down(k[0]) || g.down(k[4]) ? 1 : 0) - (g.down(k[1]) || g.down(k[5]) ? 1 : 0);
        steer = (g.down(k[3]) || g.down(k[7]) ? 1 : 0) - (g.down(k[2]) || g.down(k[6]) ? 1 : 0);
      } else {
        const look = g.path[(car.idx + 7) % n];
        let da = Math.atan2(look[1] - car.y, look[0] - car.x) - car.a;
        while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        steer = Math.max(-1, Math.min(1, da * 3));
        acc = Math.abs(da) > 0.6 && car.v > 150 ? -0.3 : 1;
      }
      const near = this.nearest(g, car.x, car.y, car.idx);
      const off = near.d > ROAD / 2;
      const max = (car.human ? 260 : 250 * car.skill) * (off ? 0.45 : 1);
      car.v += acc * (acc > 0 ? 260 : 420) * dt;
      car.v = Math.max(-80, Math.min(max, car.v));
      if (!acc || car.v > max) car.v *= Math.pow(0.35, dt);
      car.a += steer * 2.8 * dt * Math.min(1, Math.abs(car.v) / 120) * Math.sign(car.v || 1);
      car.x += Math.cos(car.a) * car.v * dt; car.y += Math.sin(car.a) * car.v * dt;
      car.x = Math.max(8, Math.min(632, car.x)); car.y = Math.max(8, Math.min(472, car.y));
      // progress & laps
      const moved = near.i - car.idx;
      if (moved < -n / 2) { car.lap++; if (car.human) g.sfx('coin'); }
      else if (moved > n / 2) car.lap--;
      car.idx = near.i;
      car.prog = car.lap * n + car.idx;
      if (car.lap >= 3 && !car.done) { car.done = true; car.finishT = g.raceT; g.finished.push(car); if (car.human) g.sfx('win'); }
    }
    // bumping
    for (let i = 0; i < g.cars.length; i++) for (let j = i + 1; j < g.cars.length; j++) {
      const a = g.cars[i], b = g.cars[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d < 20 && d > 0) { const push = (20 - d) / 2; a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push; a.v *= 0.97; b.v *= 0.97; }
    }
    const humans = g.cars.filter((c) => c.human);
    if (humans.every((c) => c.done)) {
      const pos = g.finished.indexOf(humans[0]) + 1;
      const txt = g.mode === 1 ? (g.finished.indexOf(g.cars[0]) < g.finished.indexOf(g.cars[1]) ? 'Blue Car Wins!' : 'Red Car Wins!') : ['', '1st Place!', '2nd Place', '3rd Place', '4th Place'][pos];
      const t = humans[0].finishT;
      g.over(txt, 'Time ' + t.toFixed(2) + 's on ' + g.T.name, pos === 1 || g.mode === 1);
      g.trackI++;
    }
  },

  demo(g) {
    g.count = 0;
    const n = g.path.length;
    g.cars.forEach((c, i) => { const k = (n - 22 + i * 7) % n, p = g.path[k], q = g.path[(k + 2) % n]; c.x = p[0] + (i % 2 ? 12 : -12); c.y = p[1]; c.a = Math.atan2(q[1] - p[1], q[0] - p[0]); c.v = 200; });
  },

  car(g, ctx, c) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; g.roundRect(-11, -7, 24, 16, 4); ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillRect(-9, -9, 6, 3); ctx.fillRect(5, -9, 6, 3); ctx.fillRect(-9, 6, 6, 3); ctx.fillRect(5, 6, 6, 3);
    ctx.fillStyle = c.c; g.roundRect(-12, -7, 25, 14, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-10, -6, 20, 3);
    ctx.fillStyle = '#9fd8ff'; ctx.fillRect(2, -5, 5, 10);
    ctx.fillStyle = '#fff'; ctx.fillRect(-6, -1, 7, 2);
    ctx.restore();
  },

  draw(g, ctx) {
    ctx.fillStyle = g.T.grass; ctx.fillRect(0, 0, g.W, g.H);
    for (let i = 0; i < 80; i++) { ctx.fillStyle = 'rgba(0,0,0,.06)'; ctx.fillRect((i * 83) % 640, (i * 41) % 480, 6, 6); }
    const P = g.path;
    const stroke = (w, c, dash) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.setLineDash(dash || []); ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]); };
    stroke(ROAD + 10, '#fff', [14, 14]);
    stroke(ROAD + 10, '#e83a2a', [14, 14]);
    ctx.lineDashOffset = 14; stroke(ROAD + 10, '#fff', [14, 14]); ctx.lineDashOffset = 0;
    stroke(ROAD, '#5a5a62');
    stroke(2, 'rgba(255,255,255,.6)', [12, 16]);
    // start line
    const p0 = P[0], p1 = P[2], a = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
    ctx.save(); ctx.translate(p0[0], p0[1]); ctx.rotate(a);
    for (let i = -4; i < 4; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? '#fff' : '#111'; ctx.fillRect(j * 6 - 6, i * 9, 6, 9); }
    ctx.restore();
    for (const c of g.cars) this.car(g, ctx, c);
    const me = g.cars[0];
    ctx.fillStyle = 'rgba(0,0,0,.55)'; g.roundRect(8, 8, 200, 30, 8); ctx.fill();
    g.text('Lap ' + Math.max(1, Math.min(3, me.lap + 1)) + '/3   ' + g.raceT.toFixed(1) + 's', 18, 23, 17, '#fff', null, 'left');
    if (g.mode === 1) { const p2 = g.cars[1]; ctx.fillStyle = 'rgba(0,0,0,.55)'; g.roundRect(432, 8, 200, 30, 8); ctx.fill(); g.text('Red: Lap ' + Math.max(1, Math.min(3, p2.lap + 1)) + '/3', 622, 23, 17, '#ffb0b0', null, 'right'); }
    g.text(g.T.name, 320, 466, 16, '#fff', '#000');
    if (g.count > 0 && g.state === 'play') g.text(String(Math.ceil(g.count)), 320, 230, 80, '#ffd24a', '#5a2000', 'center', g.FONT_TITLE);
  },
});
