// Air Hockey - mouse vs computer, or mouse vs arrow keys
const T = { x: 40, y: 40, w: 560, h: 400 }, GOAL_H = 130, PR = 26, KR = 14, WIN = 7;

MCC.game({
  id: 'air-hockey',
  title: 'Air Hockey',
  width: 640, height: 480,
  scored: false,
  modes: ['1 Player', '2 Players'],
  instructions: ['Player 1 (left): move your mallet with the mouse.', 'Player 2 (right): ARROW keys.', 'Knock the puck into the other goal. First to 7 wins!'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) {
    g.p1 = { x: 120, y: 240, vx: 0, vy: 0, s: 0 };
    g.p2 = { x: 520, y: 240, vx: 0, vy: 0, s: 0 };
    this.face(g, 1);
  },

  face(g, dir) { g.puck = { x: 320 - dir * 80, y: 240, vx: 0, vy: 0 }; g.wait = 0.6; },

  moveMallet(p, tx, ty, dt, minX, maxX, maxSpeed) {
    tx = Math.max(minX + PR, Math.min(maxX - PR, tx));
    ty = Math.max(T.y + PR, Math.min(T.y + T.h - PR, ty));
    let dx = tx - p.x, dy = ty - p.y;
    const d = Math.hypot(dx, dy), max = maxSpeed * dt;
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    p.vx = dx / dt; p.vy = dy / dt;
    p.x += dx; p.y += dy;
  },

  update(g, dt) {
    const pk = g.puck;
    if (g.wait > 0) g.wait -= dt;
    if (g.mouse.x >= 0) this.moveMallet(g.p1, g.mouse.x, g.mouse.y, dt, T.x, 320, 1400);
    if (g.mode === 1) {
      let tx = g.p2.x, ty = g.p2.y;
      if (g.down('ArrowLeft')) tx -= 500 * dt; if (g.down('ArrowRight')) tx += 500 * dt;
      if (g.down('ArrowUp')) ty -= 500 * dt; if (g.down('ArrowDown')) ty += 500 * dt;
      this.moveMallet(g.p2, tx, ty, dt, 320, T.x + T.w, 500);
    } else {
      // computer: defend the goal, attack when the puck is on its side
      let tx = 540, ty = 240 + (pk.y - 240) * 0.6;
      if (pk.x > 330) { tx = pk.x + 18; ty = pk.y; }
      if (pk.x > 330 && pk.vx < 0 && Math.abs(pk.vx) > 250) { tx = 540; ty = pk.y; }
      this.moveMallet(g.p2, tx, ty, dt, 320, T.x + T.w, 380 + Math.min(200, g.time * 4));
    }
    if (g.wait > 0) return;
    const steps = 6;
    for (let s = 0; s < steps; s++) {
      const h = dt / steps;
      pk.x += pk.vx * h; pk.y += pk.vy * h;
      if (pk.y < T.y + KR) { pk.y = T.y + KR; pk.vy = Math.abs(pk.vy) * 0.9; g.sfx('tick'); }
      if (pk.y > T.y + T.h - KR) { pk.y = T.y + T.h - KR; pk.vy = -Math.abs(pk.vy) * 0.9; g.sfx('tick'); }
      const inGoal = Math.abs(pk.y - 240) < GOAL_H / 2;
      if (pk.x < T.x + KR && !inGoal) { pk.x = T.x + KR; pk.vx = Math.abs(pk.vx) * 0.9; g.sfx('tick'); }
      if (pk.x > T.x + T.w - KR && !inGoal) { pk.x = T.x + T.w - KR; pk.vx = -Math.abs(pk.vx) * 0.9; g.sfx('tick'); }
      for (const p of [g.p1, g.p2]) {
        const dx = pk.x - p.x, dy = pk.y - p.y, d = Math.hypot(dx, dy);
        if (d < PR + KR && d > 0) {
          const nx = dx / d, ny = dy / d;
          pk.x = p.x + nx * (PR + KR); pk.y = p.y + ny * (PR + KR);
          const rvx = pk.vx - p.vx, rvy = pk.vy - p.vy, dot = rvx * nx + rvy * ny;
          if (dot < 0) { pk.vx -= 1.9 * dot * nx; pk.vy -= 1.9 * dot * ny; g.sfx('bounce'); }
        }
      }
    }
    const sp = Math.hypot(pk.vx, pk.vy);
    if (sp > 1100) { pk.vx *= 1100 / sp; pk.vy *= 1100 / sp; }
    pk.vx *= Math.pow(0.995, dt * 60); pk.vy *= Math.pow(0.995, dt * 60);
    if (pk.x < T.x - 10) this.goal(g, 2);
    if (pk.x > T.x + T.w + 10) this.goal(g, 1);
  },

  goal(g, who) {
    const p = who === 1 ? g.p1 : g.p2;
    p.s++; g.sfx(who === 1 ? 'win' : 'lose');
    if (p.s >= WIN) { g.over(who === 1 ? (g.mode ? 'Player 1 Wins!' : 'You Win!') : (g.mode ? 'Player 2 Wins!' : 'Computer Wins'), g.p1.s + ' - ' + g.p2.s, who === 1 || g.mode === 1); return; }
    this.face(g, who === 1 ? -1 : 1);
  },

  demo(g) { g.puck = { x: 360, y: 190, vx: 300, vy: -100 }; g.p1 = { x: 250, y: 280, s: 3 }; g.p2 = { x: 500, y: 230, s: 2 }; g.wait = 0; },

  draw(g, ctx) {
    ctx.fillStyle = '#1a1a2a'; ctx.fillRect(0, 0, g.W, g.H);
    ctx.fillStyle = '#3a3a5a'; g.roundRect(T.x - 14, T.y - 14, T.w + 28, T.h + 28, 30); ctx.fill();
    const ice = ctx.createLinearGradient(0, T.y, 0, T.y + T.h);
    ice.addColorStop(0, '#f4fbff'); ice.addColorStop(1, '#cfe8ff');
    ctx.fillStyle = ice; g.roundRect(T.x, T.y, T.w, T.h, 22); ctx.fill();
    ctx.fillStyle = 'rgba(0,80,160,.12)';
    for (let x = T.x + 20; x < T.x + T.w; x += 24) for (let y = T.y + 20; y < T.y + T.h; y += 24) ctx.fillRect(x, y, 2, 2);
    ctx.strokeStyle = '#e84a4a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(320, T.y); ctx.lineTo(320, T.y + T.h); ctx.stroke();
    ctx.strokeStyle = '#4a8ae8'; ctx.beginPath(); ctx.arc(320, 240, 60, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(T.x, 240, 80, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(T.x + T.w, 240, 80, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(T.x - 14, 240 - GOAL_H / 2, 14, GOAL_H); ctx.fillRect(T.x + T.w, 240 - GOAL_H / 2, 14, GOAL_H);
    const mallet = (p, c1, c2) => {
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.arc(p.x + 3, p.y + 4, PR, 0, 7); ctx.fill();
      const gr = ctx.createRadialGradient(p.x - 8, p.y - 8, 2, p.x, p.y, PR);
      gr.addColorStop(0, c1); gr.addColorStop(1, c2);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, PR, 0, 7); ctx.fill();
      ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(p.x, p.y, PR * 0.45, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(p.x - 3, p.y - 3, PR * 0.2, 0, 7); ctx.fill();
    };
    mallet(g.p1, '#9ad0ff', '#1a5ad8');
    mallet(g.p2, '#ffb0b0', '#d81a1a');
    const pk = g.puck;
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(pk.x, pk.y, KR, 0, 7); ctx.fill();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pk.x, pk.y, KR - 4, 0, 7); ctx.stroke();
    g.text(String(g.p1.s), 290, 20, 26, '#8fd0ff', null);
    g.text(String(g.p2.s), 350, 20, 26, '#ffb0b0', null);
    g.text('AIR HOCKEY', 20, 20, 20, '#fff', null, 'left', g.FONT_TITLE);
  },
});
