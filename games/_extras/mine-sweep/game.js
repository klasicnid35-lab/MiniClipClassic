// Mine Sweep - classic minesweeper
const COLS = 20, ROWS = 13, S = 28, OX = 40, OY = 70, MINES = 40;
const NUMC = ['', '#1a5ad8', '#2a8a2a', '#d82a2a', '#1a1a8a', '#8a1a1a', '#1a8a8a', '#000', '#666'];

MCC.game({
  id: 'mine-sweep',
  title: 'Mine Sweep',
  width: 640, height: 480,
  scored: false,
  instructions: ['Left click to uncover a square.', 'Right click (or press F while pointing, or long-press) to place a flag.', 'Numbers show how many mines touch that square. Clear the field!'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) {
    g.cells = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) g.cells.push({ x, y, mine: false, open: false, flag: false, n: 0 });
    g.first = true; g.flags = 0; g.clock = 0; g.boom = null; g.holdT = 0;
  },

  at(g, x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS ? g.cells[y * COLS + x] : null; },
  around(g, c) { const r = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) { const n = this.at(g, c.x + dx, c.y + dy); if (n) r.push(n); } return r; },

  plant(g, safe) {
    let n = 0;
    while (n < MINES) {
      const c = g.pick(g.cells);
      if (c.mine || (Math.abs(c.x - safe.x) <= 1 && Math.abs(c.y - safe.y) <= 1)) continue;
      c.mine = true; n++;
    }
    for (const c of g.cells) c.n = this.around(g, c).filter((k) => k.mine).length;
  },

  open(g, c) {
    if (c.open || c.flag) return;
    if (g.first) { g.first = false; this.plant(g, c); }
    c.open = true;
    if (c.mine) {
      g.boom = c; g.sfx('explode');
      for (const k of g.cells) if (k.mine) k.open = true;
      g.over('BOOM!', 'You hit a mine after ' + Math.floor(g.clock) + ' seconds');
      return;
    }
    if (!c.n) { const stack = [c]; while (stack.length) { const k = stack.pop(); for (const nb of this.around(g, k)) if (!nb.open && !nb.flag && !nb.mine) { nb.open = true; if (!nb.n) stack.push(nb); } } }
    g.sfx('tick');
    if (g.cells.every((k) => k.mine || k.open)) { g.cells.forEach((k) => { if (k.mine) k.flag = true; }); g.over('Cleared!', 'Time: ' + Math.floor(g.clock) + ' seconds', true); }
  },

  pick(g) {
    const x = Math.floor((g.mouse.x - OX) / S), y = Math.floor((g.mouse.y - OY) / S);
    return this.at(g, x, y);
  },

  flag(g, c) { if (c && !c.open) { c.flag = !c.flag; g.flags += c.flag ? 1 : -1; g.sfx('click'); } },

  update(g, dt) {
    if (!g.first) g.clock += dt;
    const c = this.pick(g);
    if (g.mouse.down) { g.holdT += dt; if (g.holdT > 0.45 && !g.held) { g.held = true; this.flag(g, c); } } else g.holdT = 0;
    if (g.mouse.clicked && c) { if (g.mouse.right) { this.flag(g, c); g.held = true; } else g.held = false; }
    if (g.mouse.released && c && !g.held) this.open(g, c);
    if (g.mouse.released) g.held = false;
    if (g.pressed('KeyF') && c) this.flag(g, c);
  },

  demo(g) {
    this.plant(g, { x: 8, y: 6 });
    this.open(g, this.at(g, 8, 6));
    let k = 0;
    for (const c of g.cells) if (c.mine && c.x < 12 && this.around(g, c).some((n) => n.open) && k++ < 8) c.flag = true;
    g.clock = 42;
  },

  draw(g, ctx) {
    const bg = ctx.createLinearGradient(0, 0, 0, g.H);
    bg.addColorStop(0, '#5a8ad8'); bg.addColorStop(1, '#2a4a9a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, g.W, g.H);
    g.text('MINE SWEEP', 40, 34, 30, '#fff', '#12306a', 'left', g.FONT_TITLE);
    const pill = (x, t) => { ctx.fillStyle = '#111'; g.roundRect(x, 16, 100, 36, 6); ctx.fill(); g.text(t, x + 50, 35, 22, '#ff3a3a', null); };
    pill(400, '💣 ' + (MINES - g.flags)); pill(510, '⏱ ' + Math.min(999, Math.floor(g.clock)));
    ctx.fillStyle = '#7a8aa8'; ctx.fillRect(OX - 4, OY - 4, COLS * S + 8, ROWS * S + 8);
    const hover = g.state === 'play' ? this.pick(g) : null;
    for (const c of g.cells) {
      const x = OX + c.x * S, y = OY + c.y * S;
      if (!c.open) {
        const gr = ctx.createLinearGradient(x, y, x, y + S);
        gr.addColorStop(0, c === hover ? '#e6f4ff' : '#cfe3ff'); gr.addColorStop(1, c === hover ? '#9fc8f8' : '#8ab0e8');
        ctx.fillStyle = gr; ctx.fillRect(x + 1, y + 1, S - 2, S - 2);
        ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x + 1, y + 1, S - 2, 2); ctx.fillRect(x + 1, y + 1, 2, S - 2);
        if (c.flag) {
          ctx.fillStyle = '#333'; ctx.fillRect(x + 12, y + 6, 2, 16);
          ctx.fillStyle = '#e82a2a'; ctx.beginPath(); ctx.moveTo(x + 14, y + 6); ctx.lineTo(x + 23, y + 10); ctx.lineTo(x + 14, y + 14); ctx.fill();
          ctx.fillStyle = '#333'; ctx.fillRect(x + 8, y + 21, 10, 2);
        }
      } else {
        ctx.fillStyle = c === g.boom ? '#ff4a4a' : '#eef2f8'; ctx.fillRect(x + 0.5, y + 0.5, S - 1, S - 1);
        if (c.mine) {
          ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(x + S / 2, y + S / 2, 7, 0, 7); ctx.fill();
          ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
          for (let a = 0; a < 4; a++) { ctx.beginPath(); ctx.moveTo(x + S / 2 + Math.cos(a * 0.785 * 2) * 10, y + S / 2 + Math.sin(a * 1.57) * 10); ctx.lineTo(x + S / 2 - Math.cos(a * 1.57) * 10, y + S / 2 - Math.sin(a * 1.57) * 10); ctx.stroke(); }
          ctx.fillStyle = '#fff'; ctx.fillRect(x + S / 2 - 3, y + S / 2 - 3, 2, 2);
        } else if (c.n) g.text(String(c.n), x + S / 2, y + S / 2 + 1, 19, NUMC[c.n], null);
      }
    }
  },
});
