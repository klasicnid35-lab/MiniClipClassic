// Brick Buster - bat and ball brick breaker with power-ups
const LEVELS = [
  ['..........', 'rrrrrrrrrr', 'oooooooooo', 'yyyyyyyyyy', 'gggggggggg', 'bbbbbbbbbb'],
  ['r........r', 'or......ro', 'yor....roy', 'gyor..royg', 'bgyorroygb', 'SSSSSSSSSS'],
  ['bbbbbbbbbb', 'b........b', 'b.yyyyyy.b', 'b.ySSSSy.b', 'b.yyyyyy.b', 'bbbbbbbbbb'],
  ['r.o.y.g.b.', '.r.o.y.g.b', 'r.o.y.g.b.', '.r.o.y.g.b', 'SSSS..SSSS', 'pppppppppp'],
  ['pp..pp..pp', 'pp..pp..pp', 'SSSSSSSSSS', 'oooooooooo', 'rrrrrrrrrr', 'yyyyyyyyyy'],
];
const COLORS = { r: '#ff4040', o: '#ff9a1a', y: '#ffe030', g: '#40d040', b: '#3a9dff', p: '#c060ff', S: '#b8c4d0' };

MCC.game({
  id: 'brick-buster',
  title: 'Brick Buster',
  width: 640, height: 480,
  instructions: ['Move the bat with the mouse or LEFT / RIGHT keys.', 'Click or press SPACE to launch the ball.', 'Silver bricks need two hits. Catch the falling power-ups!'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) {
    g.lives = 3; g.level = 0;
    g.pad = { x: 320, w: 90 };
    this.loadLevel(g);
  },

  loadLevel(g) {
    const L = LEVELS[g.level % LEVELS.length];
    g.bricks = [];
    for (let r = 0; r < L.length; r++) for (let c = 0; c < 10; c++) {
      const ch = L[r][c];
      if (ch !== '.') g.bricks.push({ x: 20 + c * 60, y: 70 + r * 24, w: 58, h: 22, c: ch, hp: ch === 'S' ? 2 : 1 });
    }
    g.drops = []; g.effects = [];
    this.resetBall(g);
  },

  resetBall(g) {
    g.balls = [{ x: g.pad.x, y: 440, vx: 0, vy: 0, stuck: true }];
    g.pad.w = 90; g.slow = 0;
  },

  update(g, dt) {
    const p = g.pad;
    if (g.mouse.moved || g.mouse.down) p.x = g.mouse.x;
    if (g.anyDown('ArrowLeft', 'KeyA')) p.x -= 520 * dt;
    if (g.anyDown('ArrowRight', 'KeyD')) p.x += 520 * dt;
    p.x = Math.max(p.w / 2, Math.min(g.W - p.w / 2, p.x));
    const launch = g.pressed('Space') || g.mouse.clicked;
    const speed = (330 + g.level * 25) * (g.slow > 0 ? 0.7 : 1);
    if (g.slow > 0) g.slow -= dt;

    for (const b of g.balls) {
      if (b.stuck) {
        b.x = p.x; b.y = 440;
        if (launch) { b.stuck = false; const a = -Math.PI / 2 + g.rand(-0.4, 0.4); b.vx = Math.cos(a); b.vy = Math.sin(a); g.sfx('blip'); }
        continue;
      }
      const steps = 4;
      for (let s = 0; s < steps; s++) {
        b.x += b.vx * speed * dt / steps; b.y += b.vy * speed * dt / steps;
        if (b.x < 7) { b.x = 7; b.vx = Math.abs(b.vx); g.sfx('tick'); }
        if (b.x > g.W - 7) { b.x = g.W - 7; b.vx = -Math.abs(b.vx); g.sfx('tick'); }
        if (b.y < 47) { b.y = 47; b.vy = Math.abs(b.vy); g.sfx('tick'); }
        // paddle
        if (b.vy > 0 && b.y > 444 && b.y < 460 && Math.abs(b.x - p.x) < p.w / 2 + 6) {
          const off = (b.x - p.x) / (p.w / 2);
          const a = -Math.PI / 2 + off * 1.05;
          b.vx = Math.cos(a); b.vy = Math.sin(a); b.y = 444; g.sfx('bounce');
        }
        // bricks
        for (const k of g.bricks) {
          if (k.hp <= 0) continue;
          if (b.x + 6 > k.x && b.x - 6 < k.x + k.w && b.y + 6 > k.y && b.y - 6 < k.y + k.h) {
            const ox = Math.min(b.x + 6 - k.x, k.x + k.w - (b.x - 6));
            const oy = Math.min(b.y + 6 - k.y, k.y + k.h - (b.y - 6));
            if (ox < oy) b.vx = -b.vx; else b.vy = -b.vy;
            k.hp--;
            if (k.hp <= 0) {
              g.addScore(k.c === 'S' ? 25 : 10); g.sfx('pop');
              for (let i = 0; i < 6; i++) g.effects.push({ x: k.x + k.w / 2, y: k.y + k.h / 2, vx: g.rand(-120, 120), vy: g.rand(-120, 60), t: 0.5, c: COLORS[k.c] });
              if (Math.random() < 0.14) g.drops.push({ x: k.x + k.w / 2, y: k.y, t: g.pick(['W', 'M', 'S', 'L']) });
            } else g.sfx('hit');
            break;
          }
        }
      }
    }
    g.balls = g.balls.filter((b) => b.y < g.H + 10);
    if (!g.balls.length) {
      g.lives--; g.sfx('lose');
      if (g.lives <= 0) { g.over('Game Over', 'You reached level ' + (g.level + 1)); return; }
      this.resetBall(g);
    }
    for (const d of g.drops) {
      d.y += 140 * dt;
      if (d.y > 440 && d.y < 462 && Math.abs(d.x - p.x) < p.w / 2 + 14) {
        d.y = 999; g.sfx('coin'); g.addScore(50);
        if (d.t === 'W') p.w = 140;
        if (d.t === 'S') g.slow = 10;
        if (d.t === 'L') g.lives++;
        if (d.t === 'M') {
          const src = g.balls.find((b) => !b.stuck) || g.balls[0];
          for (const a of [-0.5, 0.5]) g.balls.push({ x: src.x, y: src.y, vx: Math.sin(a), vy: -Math.cos(a), stuck: false });
        }
      }
    }
    g.drops = g.drops.filter((d) => d.y < g.H);
    for (const e of g.effects) { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 400 * dt; e.t -= dt; }
    g.effects = g.effects.filter((e) => e.t > 0);
    if (g.bricks.every((k) => k.hp <= 0)) {
      g.level++; g.addScore(100); g.sfx('win');
      this.loadLevel(g);
    }
  },

  demo(g) {
    g.level = 1; this.loadLevel(g);
    g.bricks.forEach((k, i) => { if ([3, 4, 13, 22, 24].includes(i)) k.hp = 0; });
    g.balls = [{ x: 380, y: 300, vx: 0.5, vy: -0.8, stuck: false }];
    g.pad.x = 300;
    g.drops = [{ x: 200, y: 330, t: 'M' }];
    g.score = 340;
  },

  draw(g, ctx) {
    const bg = ctx.createLinearGradient(0, 0, 0, g.H);
    bg.addColorStop(0, '#0b1f4a'); bg.addColorStop(1, '#1c4f9c');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, g.W, g.H);
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    for (let x = 0; x < g.W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, g.H); ctx.stroke(); }
    // HUD
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, g.W, 40);
    g.text('Score: ' + g.score, 14, 21, 20, '#fff', null, 'left');
    g.text('Level ' + (g.level + 1), 320, 21, 20, '#ffd24a', null);
    g.text('Lives: ' + g.lives, 600, 21, 20, '#fff', null, 'right');

    for (const k of g.bricks) {
      if (k.hp <= 0) continue;
      const gr = ctx.createLinearGradient(0, k.y, 0, k.y + k.h);
      gr.addColorStop(0, '#fff'); gr.addColorStop(0.15, COLORS[k.c]); gr.addColorStop(1, shade(COLORS[k.c]));
      ctx.fillStyle = gr; g.roundRect(k.x, k.y, k.w, k.h, 4); ctx.fill();
      if (k.c === 'S' && k.hp === 1) { ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.moveTo(k.x + 10, k.y + 4); ctx.lineTo(k.x + 25, k.y + 14); ctx.lineTo(k.x + 38, k.y + 8); ctx.stroke(); }
    }
    for (const e of g.effects) { ctx.fillStyle = e.c; ctx.globalAlpha = Math.max(0, e.t * 2); ctx.fillRect(e.x - 3, e.y - 3, 6, 6); }
    ctx.globalAlpha = 1;
    for (const d of g.drops) {
      ctx.fillStyle = { W: '#3a9dff', M: '#c060ff', S: '#40d040', L: '#ff4060' }[d.t];
      g.roundRect(d.x - 16, d.y - 8, 32, 16, 8); ctx.fill();
      g.text(d.t, d.x, d.y + 1, 13, '#fff', null);
    }
    // paddle
    const p = g.pad;
    const pg = ctx.createLinearGradient(0, 446, 0, 462);
    pg.addColorStop(0, '#fff'); pg.addColorStop(0.3, '#ffb13a'); pg.addColorStop(1, '#d85b00');
    ctx.fillStyle = pg; g.roundRect(p.x - p.w / 2, 446, p.w, 16, 8); ctx.fill();
    for (const b of g.balls) {
      const rg = ctx.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, 7);
      rg.addColorStop(0, '#fff'); rg.addColorStop(1, '#9ad0ff');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, Math.PI * 2); ctx.fill();
    }
    if (g.state === 'play' && g.balls.some((b) => b.stuck)) g.text('Click or press SPACE to launch', 320, 400, 18, '#fff', '#000');
  },
});

function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.floor(v * 0.6);
  return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')';
}
