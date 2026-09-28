// Color Echo - repeat the growing sequence of colours and tones
const PADS = [
  { c: '#2ad84a', l: '#9dff9d', f: 392, a0: Math.PI, key: 'Digit1' },
  { c: '#e8282a', l: '#ff9a9a', f: 330, a0: -Math.PI / 2, key: 'Digit2' },
  { c: '#2a6ae8', l: '#9ac4ff', f: 262, a0: Math.PI / 2, key: 'Digit4' },
  { c: '#f2c21a', l: '#fff29a', f: 196, a0: 0, key: 'Digit3' },
];
const CX = 320, CY = 262, R1 = 70, R2 = 200;

MCC.game({
  id: 'color-echo',
  title: 'Color Echo',
  width: 640, height: 480,
  instructions: ['Watch the pads light up and listen to the tones.', 'Then click the pads in the same order (keys 1-4 work too).', 'The pattern gets one step longer every round.'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) { g.seq = []; g.lit = -1; g.litT = 0; this.nextRound(g); },

  nextRound(g) {
    g.seq.push(g.randInt(0, 3));
    g.pos = 0; g.phase = 'show'; g.showI = 0; g.timer = 0.8; g.score = g.seq.length - 1;
  },

  press(g, i) {
    g.lit = i; g.litT = 0.25; g.tone(PADS[i].f, 0.3, 'triangle', 0.14);
    if (g.phase !== 'input') return;
    if (g.seq[g.pos] !== i) { g.lit = -1; g.over('Oops!', 'You remembered ' + (g.seq.length - 1) + ' steps'); return; }
    g.pos++;
    if (g.pos >= g.seq.length) { g.phase = 'wait'; g.timer = 0.9; g.score = g.seq.length; }
  },

  update(g, dt) {
    if (g.litT > 0) { g.litT -= dt; if (g.litT <= 0) g.lit = -1; }
    g.timer -= dt;
    if (g.phase === 'show' && g.timer <= 0) {
      if (g.showI < g.seq.length) {
        const i = g.seq[g.showI++]; g.lit = i; g.litT = Math.max(0.2, 0.45 - g.seq.length * 0.015); g.tone(PADS[i].f, g.litT, 'triangle', 0.14);
        g.timer = g.litT + 0.15;
      } else g.phase = 'input';
    } else if (g.phase === 'wait' && g.timer <= 0) this.nextRound(g);
    if (g.phase === 'input') {
      PADS.forEach((p, i) => { if (g.pressed(p.key)) this.press(g, i); });
      if (g.mouse.clicked) {
        const dx = g.mouse.x - CX, dy = g.mouse.y - CY, d = Math.hypot(dx, dy);
        if (d > R1 && d < R2) {
          const a = Math.atan2(dy, dx);
          const i = PADS.findIndex((p) => { let da = a - p.a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; return Math.abs(da) < Math.PI / 4; });
          if (i >= 0) this.press(g, i);
        }
      }
    }
  },

  demo(g) { g.seq = [1, 3, 0, 2, 1, 0]; g.lit = 1; g.score = 5; g.phase = 'input'; },

  draw(g, ctx) {
    const bg = ctx.createRadialGradient(CX, CY, 20, CX, CY, 420);
    bg.addColorStop(0, '#3a2a6a'); bg.addColorStop(1, '#0e0a24');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, g.W, g.H);
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(CX, CY, R2 + 12, 0, 7); ctx.fill();
    PADS.forEach((p, i) => {
      const on = g.lit === i;
      ctx.save();
      if (on) { ctx.shadowColor = p.l; ctx.shadowBlur = 30; }
      ctx.fillStyle = on ? p.l : p.c;
      ctx.beginPath(); ctx.arc(CX, CY, R2, p.a0 - Math.PI / 4 + 0.06, p.a0 + Math.PI / 4 - 0.06); ctx.arc(CX, CY, R1 + 8, p.a0 + Math.PI / 4 - 0.1, p.a0 - Math.PI / 4 + 0.1, true); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = on ? 0 : 0.35;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(CX, CY, R2, p.a0 - Math.PI / 4 + 0.06, p.a0 + Math.PI / 4 - 0.06); ctx.arc(CX, CY, R1 + 8, p.a0 + Math.PI / 4 - 0.1, p.a0 - Math.PI / 4 + 0.1, true); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    });
    const cg = ctx.createRadialGradient(CX - 15, CY - 15, 5, CX, CY, R1);
    cg.addColorStop(0, '#666'); cg.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(CX, CY, R1, 0, 7); ctx.fill();
    g.text(String(g.score), CX, CY - 6, 40, '#fff', null);
    g.text(g.phase === 'input' ? 'YOUR TURN' : g.phase === 'show' ? 'WATCH...' : 'GOOD!', CX, CY + 26, 14, '#ffd24a', null);
    g.text('COLOR ECHO', 320, 30, 30, '#fff', '#3a0a6a', 'center', g.FONT_TITLE);
    g.text('Best: ' + g.best, 620, 30, 18, '#bfe6ff', null, 'right');
  },
});
