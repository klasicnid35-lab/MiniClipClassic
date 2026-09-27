// Serpent Sprint - classic snake
MCC.game({
  id: 'serpent-sprint',
  title: 'Serpent Sprint',
  width: 640, height: 480,
  instructions: ['Eat the apples to grow. Golden apples are worth 5 points!', 'Arrow keys / WASD to steer (swipe on touch screens).', "Don't hit the walls or your own tail."],

  init(g) {
    g.C = 20; g.COLS = 32; g.ROWS = 22; g.TOP = 40;
    this.start(g);
    g.state = 'title';
  },

  start(g) {
    g.snake = [{ x: 8, y: 11 }, { x: 7, y: 11 }, { x: 6, y: 11 }, { x: 5, y: 11 }];
    g.dir = { x: 1, y: 0 };
    g.queue = [];
    g.step = 0;
    g.speed = 0.11;
    g.gold = null;
    g.eaten = 0;
    g.apple = this.free(g);
  },

  free(g) {
    for (let n = 0; n < 1000; n++) {
      const p = { x: g.randInt(0, g.COLS - 1), y: g.randInt(0, g.ROWS - 1) };
      if (!g.snake.some((s) => s.x === p.x && s.y === p.y) && !(g.apple && g.apple.x === p.x && g.apple.y === p.y)) return p;
    }
    return { x: 0, y: 0 };
  },

  update(g, dt) {
    const turns = [['ArrowUp', 'KeyW', 0, -1], ['ArrowDown', 'KeyS', 0, 1], ['ArrowLeft', 'KeyA', -1, 0], ['ArrowRight', 'KeyD', 1, 0]];
    for (const [a, b, x, y] of turns) if (g.pressed(a) || g.pressed(b)) g.queue.push({ x, y });
    g.step += dt;
    if (g.gold) { g.gold.t -= dt; if (g.gold.t <= 0) g.gold = null; }
    while (g.step >= g.speed && g.state === 'play') {
      g.step -= g.speed;
      while (g.queue.length) {
        const d = g.queue.shift();
        if (d.x !== -g.dir.x || d.y !== -g.dir.y) { if (d.x !== g.dir.x || d.y !== g.dir.y) { g.dir = d; break; } }
      }
      const h = g.snake[0];
      const n = { x: h.x + g.dir.x, y: h.y + g.dir.y };
      if (n.x < 0 || n.y < 0 || n.x >= g.COLS || n.y >= g.ROWS || g.snake.slice(0, -1).some((s) => s.x === n.x && s.y === n.y)) {
        g.over('Game Over', 'Length: ' + g.snake.length);
        return;
      }
      g.snake.unshift(n);
      if (n.x === g.apple.x && n.y === g.apple.y) {
        g.addScore(1); g.eaten++; g.sfx('coin');
        g.apple = this.free(g);
        g.speed = Math.max(0.05, g.speed - 0.002);
        if (g.eaten % 5 === 0) { g.gold = this.free(g); g.gold.t = 6; }
      } else if (g.gold && n.x === g.gold.x && n.y === g.gold.y) {
        g.addScore(5); g.sfx('win'); g.gold = null;
        g.snake.push({ ...g.snake[g.snake.length - 1] });
      } else g.snake.pop();
    }
  },

  demo(g) {
    g.snake = [];
    const path = [[14, 12], [13, 12], [12, 12], [11, 12], [10, 12], [10, 11], [10, 10], [10, 9], [11, 9], [12, 9], [13, 9], [14, 9], [15, 9], [16, 9], [16, 8], [16, 7], [15, 7], [14, 7], [13, 7]];
    for (const [x, y] of path) g.snake.push({ x, y });
    g.snake.reverse();
    g.dir = { x: 1, y: 0 };
    g.apple = { x: 16, y: 12 };
    g.gold = { x: 20, y: 6, t: 5 };
    g.score = 23;
  },

  draw(g, ctx) {
    const { C, TOP } = g;
    // grass board
    for (let y = 0; y < g.ROWS; y++) for (let x = 0; x < g.COLS; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#8fd14f' : '#a2dc5c';
      ctx.fillRect(x * C, TOP + y * C, C, C);
    }
    // HUD
    const hg = ctx.createLinearGradient(0, 0, 0, TOP);
    hg.addColorStop(0, '#2f7a1d'); hg.addColorStop(1, '#1d5410');
    ctx.fillStyle = hg; ctx.fillRect(0, 0, g.W, TOP);
    g.text('Score: ' + g.score, 14, 21, 22, '#fff', '#0b2e05', 'left');
    g.text('Best: ' + g.best, 250, 21, 18, '#d9ffb0', null, 'left');
    g.text('SERPENT SPRINT', 500, 21, 20, '#ffd24a', '#5a3000', 'center', g.FONT_TITLE);

    // apple
    const ap = (p, gold) => {
      const cx = p.x * C + C / 2, cy = TOP + p.y * C + C / 2 + 1;
      const gr = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 9);
      gr.addColorStop(0, gold ? '#fff7b0' : '#ff9a9a'); gr.addColorStop(1, gold ? '#e0a800' : '#d01010');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5a3000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx + 2, cy - 11); ctx.stroke();
      ctx.fillStyle = '#2f9a1d'; ctx.beginPath(); ctx.ellipse(cx + 5, cy - 10, 4, 2, -0.5, 0, Math.PI * 2); ctx.fill();
    };
    ap(g.apple, false);
    if (g.gold && (g.gold.t > 2 || Math.floor(g.gold.t * 6) % 2)) ap(g.gold, true);

    // snake
    const n = g.snake.length;
    for (let i = n - 1; i >= 0; i--) {
      const s = g.snake[i];
      const x = s.x * C, y = TOP + s.y * C;
      const t = i / n;
      ctx.fillStyle = i === 0 ? '#1d6fd0' : `hsl(${210 - t * 20}, 80%, ${52 + (i % 2) * 6}%)`;
      g.roundRect(x + 1, y + 1, C - 2, C - 2, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      g.roundRect(x + 3, y + 3, C - 6, 6, 3); ctx.fill();
    }
    const h = g.snake[0];
    const ex = h.x * C + C / 2, ey = TOP + h.y * C + C / 2;
    const px = g.dir.y !== 0 ? 5 : 0, py = g.dir.x !== 0 ? 5 : 0;
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + px * s + g.dir.x * 3, ey + py * s + g.dir.y * 3, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex + px * s + g.dir.x * 4.5, ey + py * s + g.dir.y * 4.5, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  },
});
