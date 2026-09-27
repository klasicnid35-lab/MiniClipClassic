// Tic Tac Toe - perfect-play computer on hard, a bit forgetful on easy
const S = 110, OX = 320 - 1.5 * S, OY = 80;
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const win = (b) => { for (const l of LINES) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return l; return null; };
function mm(b, p, me) {
  const w = win(b); if (w) return b[w[0]] === me ? 10 : -10;
  if (b.every(Boolean)) return 0;
  let best = p === me ? -99 : 99;
  for (let i = 0; i < 9; i++) if (!b[i]) { b[i] = p; const v = mm(b, p === 'X' ? 'O' : 'X', me); b[i] = null; best = p === me ? Math.max(best, v) : Math.min(best, v); }
  return best;
}

MCC.game({
  id: 'tic-tac-toe',
  title: 'Tic Tac Toe',
  width: 640, height: 480,
  scored: false,
  modes: ['Easy', 'Hard', '2 Players'],
  instructions: ['Click a square to place your mark.', 'Get three in a row to win.', 'Play the computer on Easy or Hard, or play a friend.'],

  init(g) { g.tally = [0, 0, 0]; this.start(g); g.state = 'title'; },
  start(g) { g.b = Array(9).fill(null); g.turn = 'X'; g.line = null; g.think = 0; g.end = 0; },

  place(g, i) {
    if (g.b[i] || g.line) return;
    g.b[i] = g.turn; g.sfx('click');
    g.line = win(g.b);
    if (g.line) { g.end = 1.2; g.tally[g.turn === 'X' ? 0 : 1]++; return; }
    if (g.b.every(Boolean)) { g.end = 1; g.tally[2]++; return; }
    g.turn = g.turn === 'X' ? 'O' : 'X'; g.think = 0.45;
  },

  update(g, dt) {
    if (g.end > 0) {
      g.end -= dt;
      if (g.end <= 0) {
        if (g.line) { const x = g.b[g.line[0]] === 'X'; g.over(g.mode === 2 ? (x ? 'X Wins!' : 'O Wins!') : x ? 'You Win!' : 'Computer Wins', 'X ' + g.tally[0] + '  -  O ' + g.tally[1] + '  -  Draws ' + g.tally[2], x || g.mode === 2); }
        else g.over("It's a Draw!", 'X ' + g.tally[0] + '  -  O ' + g.tally[1] + '  -  Draws ' + g.tally[2]);
      }
      return;
    }
    if (g.mode < 2 && g.turn === 'O') {
      g.think -= dt;
      if (g.think > 0) return;
      const free = g.b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
      let pick;
      if (g.mode === 0 && Math.random() < 0.45) pick = g.pick(free);
      else { let bv = -99; for (const i of free) { g.b[i] = 'O'; const v = mm(g.b, 'X', 'O') + Math.random() * 0.1; g.b[i] = null; if (v > bv) { bv = v; pick = i; } } }
      this.place(g, pick);
      return;
    }
    if (g.mouse.clicked) {
      const x = Math.floor((g.mouse.x - OX) / S), y = Math.floor((g.mouse.y - OY) / S);
      if (x >= 0 && y >= 0 && x < 3 && y < 3) this.place(g, y * 3 + x);
    }
    for (let k = 1; k <= 9; k++) if (g.pressed('Digit' + k) || g.pressed('Numpad' + k)) this.place(g, k - 1);
  },

  demo(g) { g.b = ['X', 'O', null, null, 'X', 'O', null, null, 'X']; g.line = [0, 4, 8]; g.end = 5; },

  draw(g, ctx) {
    ctx.fillStyle = '#fdf6e3'; ctx.fillRect(0, 0, g.W, g.H);
    ctx.strokeStyle = 'rgba(80,140,220,.25)'; ctx.lineWidth = 1;
    for (let y = 30; y < g.H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(g.W, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(230,80,80,.4)'; ctx.beginPath(); ctx.moveTo(70, 0); ctx.lineTo(70, g.H); ctx.stroke();
    g.text('Tic Tac Toe', 320, 36, 32, '#2a4a9a', null, 'center', g.FONT_TITLE);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (let k = 1; k < 3; k++) { ctx.beginPath(); ctx.moveTo(OX + k * S, OY + 8); ctx.lineTo(OX + k * S, OY + 3 * S - 8); ctx.moveTo(OX + 8, OY + k * S); ctx.lineTo(OX + 3 * S - 8, OY + k * S); ctx.stroke(); }
    g.b.forEach((v, i) => {
      const cx = OX + (i % 3) * S + S / 2, cy = OY + Math.floor(i / 3) * S + S / 2;
      ctx.lineWidth = 10;
      if (v === 'X') { ctx.strokeStyle = '#e8302a'; ctx.beginPath(); ctx.moveTo(cx - 30, cy - 30); ctx.lineTo(cx + 30, cy + 30); ctx.moveTo(cx + 30, cy - 30); ctx.lineTo(cx - 30, cy + 30); ctx.stroke(); }
      if (v === 'O') { ctx.strokeStyle = '#2a6ae8'; ctx.beginPath(); ctx.arc(cx, cy, 32, 0, 7); ctx.stroke(); }
    });
    if (g.line) {
      const p = (i) => [OX + (i % 3) * S + S / 2, OY + Math.floor(i / 3) * S + S / 2];
      const [a, b] = [p(g.line[0]), p(g.line[2])];
      ctx.strokeStyle = 'rgba(40,160,40,.85)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    g.text('X: ' + g.tally[0] + '   O: ' + g.tally[1] + '   Draws: ' + g.tally[2], 320, 440, 20, '#333', null);
    if (g.state === 'play' && !g.end) g.text(g.mode < 2 ? (g.turn === 'X' ? 'Your turn (X)' : 'Computer is thinking...') : g.turn + "'s turn", 320, 464, 16, '#666', null);
  },
});
