// Paddle Pong - 1 player vs computer or 2 players on one keyboard
const PH = 80, WIN = 7;

MCC.game({
  id: 'paddle-pong',
  title: 'Paddle Pong',
  width: 640, height: 480,
  scored: false,
  modes: ['1 Player', '2 Players'],
  instructions: ['Player 1 (left): W / S keys or the mouse.', 'Player 2 (right): UP / DOWN arrow keys.', 'First to 7 points wins the match.'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) {
    g.p1 = { y: 200, s: 0 }; g.p2 = { y: 200, s: 0 };
    this.serve(g, Math.random() < 0.5 ? 1 : -1);
  },

  serve(g, dir) {
    g.ball = { x: 320, y: 240, vx: 0, vy: 0, wait: 1, dir };
    g.trail = [];
  },

  update(g, dt) {
    const b = g.ball;
    if (g.mouse.moved && !g.mode) g.p1.y = g.mouse.y - PH / 2;
    if (g.down('KeyW')) g.p1.y -= 420 * dt;
    if (g.down('KeyS')) g.p1.y += 420 * dt;
    if (g.mode === 1) {
      if (g.down('ArrowUp')) g.p2.y -= 420 * dt;
      if (g.down('ArrowDown')) g.p2.y += 420 * dt;
      if (g.mouse.moved && g.mouse.x > 320) g.p2.y = g.mouse.y - PH / 2;
    } else {
      // computer: follows the ball with a reaction limit
      const target = b.vx > 0 ? b.y - PH / 2 + Math.sin(g.time * 2) * 18 : 200;
      const d = target - g.p2.y;
      g.p2.y += Math.sign(d) * Math.min(Math.abs(d), (230 + Math.min(120, g.time * 3)) * dt);
    }
    for (const p of [g.p1, g.p2]) p.y = Math.max(40, Math.min(g.H - 10 - PH, p.y));
    if (b.wait > 0) {
      b.wait -= dt;
      if (b.wait <= 0) { const a = g.rand(-0.5, 0.5); b.vx = Math.cos(a) * 300 * b.dir; b.vy = Math.sin(a) * 300; }
      return;
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    g.trail.push({ x: b.x, y: b.y }); if (g.trail.length > 10) g.trail.shift();
    if (b.y < 48) { b.y = 48; b.vy = Math.abs(b.vy); g.sfx('tick'); }
    if (b.y > g.H - 18) { b.y = g.H - 18; b.vy = -Math.abs(b.vy); g.sfx('tick'); }
    const hitP = (p, x, dir) => {
      if ((dir < 0 ? b.vx < 0 && b.x < x + 12 && b.x > x - 10 : b.vx > 0 && b.x > x - 12 && b.x < x + 10) && b.y > p.y - 8 && b.y < p.y + PH + 8) {
        const off = (b.y - (p.y + PH / 2)) / (PH / 2);
        const sp = Math.min(760, Math.hypot(b.vx, b.vy) * 1.06);
        const a = off * 0.9;
        b.vx = Math.cos(a) * sp * -dir; b.vy = Math.sin(a) * sp;
        b.x = x + (dir < 0 ? 12 : -12);
        g.sfx('bounce');
      }
    };
    hitP(g.p1, 36, -1);
    hitP(g.p2, 604, 1);
    if (b.x < -20) { g.p2.s++; g.sfx('lose'); this.point(g, -1); }
    if (b.x > g.W + 20) { g.p1.s++; g.sfx('coin'); this.point(g, 1); }
  },

  point(g, dir) {
    if (g.p1.s >= WIN || g.p2.s >= WIN) {
      const p1 = g.p1.s >= WIN;
      g.over(p1 ? (g.mode ? 'Player 1 Wins!' : 'You Win!') : (g.mode ? 'Player 2 Wins!' : 'Computer Wins'), g.p1.s + ' - ' + g.p2.s, p1 || g.mode === 1);
      return;
    }
    this.serve(g, dir);
  },

  demo(g) { g.ball = { x: 250, y: 190, vx: -300, vy: -100, wait: 0 }; g.trail = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => ({ x: 250 + (10 - i) * 12, y: 190 + (10 - i) * 4 })); g.p1 = { y: 150, s: 4 }; g.p2 = { y: 260, s: 3 }; },

  draw(g, ctx) {
    const bg = ctx.createLinearGradient(0, 0, 0, g.H);
    bg.addColorStop(0, '#0a3a1a'); bg.addColorStop(1, '#0a5a2a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, g.W, g.H);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3;
    ctx.strokeRect(12, 44, g.W - 24, g.H - 56);
    ctx.setLineDash([10, 12]); ctx.beginPath(); ctx.moveTo(320, 44); ctx.lineTo(320, g.H - 12); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(320, 256, 50, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, g.W, 38);
    g.text(String(g.p1.s), 250, 20, 30, '#fff', null);
    g.text(String(g.p2.s), 390, 20, 30, '#fff', null);
    g.text(g.mode ? 'PLAYER 1' : 'YOU', 100, 20, 18, '#8fd0ff', null);
    g.text(g.mode ? 'PLAYER 2' : 'COMPUTER', 540, 20, 18, '#ffb0b0', null);
    const pad = (x, y, c1, c2) => { const gr = ctx.createLinearGradient(x, 0, x + 12, 0); gr.addColorStop(0, c1); gr.addColorStop(1, c2); ctx.fillStyle = gr; g.roundRect(x, y, 12, PH, 6); ctx.fill(); };
    pad(24, g.p1.y, '#bfe6ff', '#2a7ad8');
    pad(604, g.p2.y, '#ffc0c0', '#d82a2a');
    g.trail.forEach((t, i) => { ctx.fillStyle = 'rgba(255,255,120,' + i / 25 + ')'; ctx.beginPath(); ctx.arc(t.x, t.y, 4 + i / 3, 0, 7); ctx.fill(); });
    const b = g.ball;
    ctx.fillStyle = '#ffffa0'; ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, 7); ctx.fill();
    if (b.wait > 0 && g.state === 'play') g.text('Get ready...', 320, 200, 26, '#fff', '#000');
  },
});
