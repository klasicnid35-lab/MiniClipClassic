// Memory Match - flip cards to find pairs
const ICONS = ['🐶', '🐱', '🐸', '🦊', '🐼', '🐵', '🦁', '🐷', '🐙', '🦄', '🐧', '🐢'];
const COLS = 6, ROWS = 4, CW = 84, CHh = 92, GX = 12, OX = (640 - (COLS * CW + (COLS - 1) * GX)) / 2, OY = 68;

MCC.game({
  id: 'memory-match',
  title: 'Memory Match',
  width: 640, height: 480,
  scored: false,
  instructions: ['Click two cards to turn them over.', 'If they match, they stay face up.', 'Find all 12 pairs in as few turns as you can!'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) {
    const deck = ICONS.concat(ICONS).sort(() => Math.random() - 0.5);
    g.cards = deck.map((icon, i) => ({ icon, i, up: false, done: false, flip: 0 }));
    g.sel = []; g.turns = 0; g.wait = 0; g.found = 0;
  },

  update(g, dt) {
    for (const c of g.cards) c.flip += ((c.up || c.done ? 1 : 0) - c.flip) * Math.min(1, dt * 14);
    if (g.wait > 0) {
      g.wait -= dt;
      if (g.wait <= 0) { g.sel.forEach((c) => (c.up = false)); g.sel = []; }
      return;
    }
    if (!g.mouse.clicked) return;
    const cx = Math.floor((g.mouse.x - OX) / (CW + GX)), cy = Math.floor((g.mouse.y - OY) / (CHh + GX));
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return;
    const c = g.cards[cy * COLS + cx];
    if (c.up || c.done) return;
    c.up = true; g.sel.push(c); g.sfx('click');
    if (g.sel.length === 2) {
      g.turns++;
      if (g.sel[0].icon === g.sel[1].icon) {
        g.sel.forEach((k) => (k.done = true)); g.sel = []; g.found++; g.sfx('coin');
        if (g.found === ICONS.length) g.over('Well Done!', 'All pairs found in ' + g.turns + ' turns', true);
      } else g.wait = 0.8;
    }
  },

  demo(g) {
    g.cards.forEach((c, i) => { if (i % 5 === 0 || i === 7) { c.done = true; c.flip = 1; } });
    g.cards[9].up = true; g.cards[9].flip = 1;
    g.turns = 9;
  },

  draw(g, ctx) {
    const bg = ctx.createLinearGradient(0, 0, 0, g.H);
    bg.addColorStop(0, '#7ad0ff'); bg.addColorStop(1, '#2a8ad8');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, g.W, g.H);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(60 + i * 110, 470, 40, 0, 7); ctx.fill(); }
    g.text('Memory Match', 24, 30, 30, '#fff', '#1a4a8a', 'left', g.FONT_TITLE);
    g.text('Turns: ' + g.turns, 610, 30, 22, '#fff', '#1a4a8a', 'right');
    g.cards.forEach((c, k) => {
      const x = OX + (k % COLS) * (CW + GX), y = OY + Math.floor(k / COLS) * (CHh + GX);
      const sx = Math.abs(Math.cos(c.flip * Math.PI));
      const face = c.flip > 0.5;
      ctx.save(); ctx.translate(x + CW / 2, y + CHh / 2); ctx.scale(Math.max(0.02, sx), 1);
      ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
      if (face) {
        ctx.fillStyle = c.done ? '#eaffea' : '#fff'; g.roundRect(-CW / 2, -CHh / 2, CW, CHh, 10); ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = c.done ? '#4ac84a' : '#ffb13a'; ctx.lineWidth = 3; ctx.stroke();
        ctx.font = '46px "Noto Color Emoji", "Segoe UI Emoji", "Apple Color Emoji", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(c.icon, 0, 4);
      } else {
        const gr = ctx.createLinearGradient(0, -CHh / 2, 0, CHh / 2);
        gr.addColorStop(0, '#ff9a3a'); gr.addColorStop(1, '#e8541a');
        ctx.fillStyle = gr; g.roundRect(-CW / 2, -CHh / 2, CW, CHh, 10); ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
        g.text('?', 0, 3, 46, '#fff', 'rgba(120,40,0,.6)', 'center', g.FONT_TITLE);
      }
      ctx.restore();
    });
  },
});
