// Road Hopper - get the frog across the road and the river into the lily pads
const T = 40, COLS = 16, TOP = 40;
// lanes from the top (row 0 = home row)
const LANES = [
  { t: 'home' },
  { t: 'river', dir: 1, sp: 60, len: 3, gap: 4 },
  { t: 'river', dir: -1, sp: 80, len: 2, gap: 3, turtle: true },
  { t: 'river', dir: 1, sp: 100, len: 4, gap: 5 },
  { t: 'river', dir: -1, sp: 50, len: 3, gap: 3, turtle: true },
  { t: 'safe' },
  { t: 'road', dir: -1, sp: 110, len: 1, gap: 4, c: '#e8302a' },
  { t: 'road', dir: 1, sp: 70, len: 2, gap: 5, c: '#f0c020', truck: true },
  { t: 'road', dir: -1, sp: 140, len: 1, gap: 5, c: '#3ad0ff' },
  { t: 'road', dir: 1, sp: 90, len: 1, gap: 3, c: '#a040e0' },
  { t: 'start' },
];

MCC.game({
  id: 'road-hopper',
  title: 'Road Hopper',
  width: 640, height: 480,
  instructions: ['ARROW keys to hop (swipe on touch screens).', 'Dodge the traffic, then ride the logs and turtles across the river.', 'Fill all 5 lily pads to finish the level!'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) { g.lives = 3; g.level = 1; g.pads = [false, false, false, false, false]; this.setupLanes(g); this.resetFrog(g); },

  setupLanes(g) {
    g.lanes = LANES.map((L) => {
      if (!L.len) return { ...L, objs: [] };
      const objs = [];
      for (let x = g.rand(0, 3) * T; x < COLS * T + 200; x += (L.len + L.gap) * T) objs.push({ x, w: L.len * T });
      return { ...L, sp: L.sp * (1 + (g.level - 1) * 0.15), objs };
    });
  },

  resetFrog(g) { g.frog = { x: 7 * T, row: LANES.length - 1, hop: 0, face: 0 }; g.maxRow = g.frog.row; g.clock = 30; },

  die(g, why) {
    g.lives--; g.sfx('lose'); g.splat = { x: g.frog.x, row: g.frog.row, t: 0.8, why };
    if (g.lives <= 0) { g.over('Game Over', 'You reached level ' + g.level); return; }
    this.resetFrog(g);
  },

  update(g, dt) {
    if (g.splat) { g.splat.t -= dt; if (g.splat.t <= 0) g.splat = null; }
    const f = g.frog;
    g.clock -= dt;
    if (g.clock <= 0) { this.die(g, "Time's up!"); return; }
    const hop = (dx, dr, face) => { f.x = Math.max(0, Math.min((COLS - 1) * T, f.x + dx * T)); f.row = Math.max(0, Math.min(LANES.length - 1, f.row + dr)); f.hop = 0.12; f.face = face; g.sfx('jump'); if (f.row < g.maxRow) { g.maxRow = f.row; g.addScore(10); } };
    if (g.anyPressed('ArrowUp', 'KeyW')) hop(0, -1, 0);
    else if (g.anyPressed('ArrowDown', 'KeyS')) hop(0, 1, 2);
    else if (g.anyPressed('ArrowLeft', 'KeyA')) hop(-1, 0, 3);
    else if (g.anyPressed('ArrowRight', 'KeyD')) hop(1, 0, 1);
    if (f.hop > 0) f.hop -= dt;
    for (const L of g.lanes) for (const o of L.objs) {
      o.x += L.dir * L.sp * dt;
      const span = COLS * T + 200;
      if (L.dir > 0 && o.x > COLS * T) o.x -= span + o.w;
      if (L.dir < 0 && o.x + o.w < 0) o.x += span + o.w;
    }
    const L = g.lanes[f.row], cx = f.x + T / 2;
    if (L.t === 'road' && L.objs.some((o) => cx + 14 > o.x && cx - 14 < o.x + o.w)) { this.die(g, 'Splat!'); return; }
    if (L.t === 'river') {
      const on = L.objs.find((o) => cx > o.x + 4 && cx < o.x + o.w - 4 && !(L.turtle && this.diving(g, o)));
      if (!on) { this.die(g, 'Splash!'); return; }
      f.x += L.dir * L.sp * dt;
      if (f.x < -T / 2 || f.x > (COLS - 0.5) * T) { this.die(g, 'Swept away!'); return; }
    }
    if (L.t === 'home') {
      const pad = [1, 4, 7, 10, 13].findIndex((px) => Math.abs(px * T + T / 2 - cx) < 22);
      if (pad < 0 || g.pads[pad]) { this.die(g, 'Missed the pad!'); return; }
      g.pads[pad] = true; g.addScore(50 + Math.floor(g.clock) * 5); g.sfx('coin');
      if (g.pads.every(Boolean)) { g.level++; g.addScore(1000); g.pads = g.pads.map(() => false); this.setupLanes(g); g.sfx('win'); }
      this.resetFrog(g);
    }
  },

  diving(g, o) { return Math.sin(g.time * 1.2 + o.x * 0.01) > 0.85; },

  demo(g) {
    g.frog = { x: 7 * T, row: 7, hop: 0, face: 0 }; g.pads[1] = true; g.pads[3] = true;
    for (const L of g.lanes) for (const o of L.objs) o.x += 40;
    g.score = 870; g.clock = 21;
  },

  draw(g, ctx) {
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, g.W, g.H);
    g.lanes.forEach((L, r) => {
      const y = TOP + r * T;
      ctx.fillStyle = { home: '#1a6a2a', river: '#1a5ad8', safe: '#8a5ac8', road: '#333', start: '#8a5ac8' }[L.t];
      ctx.fillRect(0, y, g.W, T);
      if (L.t === 'road') { ctx.fillStyle = '#eee'; for (let x = 0; x < g.W; x += 50) ctx.fillRect(x, y + T - 2, 25, 2); }
      if (L.t === 'home') for (const [i, px] of [1, 4, 7, 10, 13].entries()) { ctx.fillStyle = '#1a5ad8'; ctx.fillRect(px * T - 4, y + 4, T + 8, T - 4); ctx.fillStyle = '#3ac84a'; ctx.beginPath(); ctx.arc(px * T + T / 2, y + T / 2 + 2, 15, 0.3, Math.PI * 2 - 0.3); ctx.fill(); if (g.pads[i]) this.frogSprite(g, ctx, px * T, y, 0); }
      for (const o of L.objs) {
        if (L.t === 'river' && !L.turtle) { ctx.fillStyle = '#8a5a2a'; g.roundRect(o.x, y + 6, o.w, T - 12, 12); ctx.fill(); ctx.fillStyle = '#a8703a'; ctx.fillRect(o.x + 10, y + 12, o.w - 20, 4); }
        if (L.turtle) { const dive = this.diving(g, o); for (let k = 0; k < o.w / T; k++) { ctx.fillStyle = dive ? 'rgba(60,160,60,.35)' : '#3a9a3a'; ctx.beginPath(); ctx.ellipse(o.x + k * T + T / 2, y + T / 2, 16, 13, 0, 0, 7); ctx.fill(); ctx.fillStyle = dive ? 'rgba(0,0,0,0)' : '#2a6a2a'; ctx.beginPath(); ctx.ellipse(o.x + k * T + T / 2, y + T / 2, 9, 7, 0, 0, 7); ctx.fill(); } }
        if (L.t === 'road') {
          ctx.fillStyle = L.c; g.roundRect(o.x + 2, y + 6, o.w - 4, T - 12, 6); ctx.fill();
          ctx.fillStyle = '#9fd8ff'; ctx.fillRect(o.x + (L.dir > 0 ? o.w - 16 : 6), y + 10, 10, T - 20);
          ctx.fillStyle = '#111'; ctx.fillRect(o.x + 6, y + 3, 8, 4); ctx.fillRect(o.x + o.w - 14, y + 3, 8, 4); ctx.fillRect(o.x + 6, y + T - 7, 8, 4); ctx.fillRect(o.x + o.w - 14, y + T - 7, 8, 4);
        }
      }
    });
    if (g.splat) g.text(g.splat.why, 320, TOP + g.splat.row * T + 20, 26, '#fff', '#c00');
    else this.frogSprite(g, ctx, g.frog.x, TOP + g.frog.row * T - (g.frog.hop > 0 ? 6 : 0), g.frog.face);
    g.text('Score: ' + g.score, 12, 20, 18, '#fff', null, 'left');
    g.text('ROAD HOPPER', 320, 20, 20, '#7aff5a', '#1a3a00', 'center', g.FONT_TITLE);
    g.text('Lives: ' + g.lives + '  Lvl ' + g.level, 628, 20, 16, '#fff', null, 'right');
    ctx.fillStyle = '#333'; ctx.fillRect(160, TOP + LANES.length * T + 6, 320, 10);
    ctx.fillStyle = g.clock < 8 ? '#ff4a4a' : '#7aff5a'; ctx.fillRect(160, TOP + LANES.length * T + 6, 320 * g.clock / 30, 10);
  },

  frogSprite(g, ctx, x, y, face) {
    ctx.save(); ctx.translate(x + T / 2, y + T / 2); ctx.rotate(face * Math.PI / 2);
    ctx.fillStyle = '#2ae84a'; ctx.beginPath(); ctx.ellipse(0, 2, 12, 14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#1ab83a'; ctx.fillRect(-15, 4, 6, 10); ctx.fillRect(9, 4, 6, 10); ctx.fillRect(-14, -10, 5, 7); ctx.fillRect(9, -10, 5, 7);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-5, -9, 4, 0, 7); ctx.arc(5, -9, 4, 0, 7); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-5, -10, 2, 0, 7); ctx.arc(5, -10, 2, 0, 7); ctx.fill();
    ctx.restore();
  },
});
