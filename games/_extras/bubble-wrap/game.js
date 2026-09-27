// Bubble Wrap - endless popping toy
const COLS = 12, ROWS = 8, R = 22;

MCC.game({
  id: 'bubble-wrap',
  title: 'Bubble Wrap',
  width: 640, height: 480,
  scored: false,
  noPause: true,
  instructions: ['Click the bubbles to pop them.', 'Hold the mouse button and drag to pop lots at once.', 'Pop the whole sheet to get a fresh one!'],

  init(g) { g.total = 0; try { g.total = +localStorage.getItem('mcc.bubblewrap.total') || 0; } catch (e) {} this.sheet(g); g.state = 'title'; },
  start(g) { this.sheet(g); },

  sheet(g) {
    g.hue = g.randInt(160, 220);
    g.bubbles = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = 44 + c * 50 + (r % 2 ? 25 : 0), y = 78 + r * 48;
      if (x > 610) continue;
      g.bubbles.push({ x, y, popped: false, t: 0 });
    }
    g.fresh = 1;
  },

  update(g, dt) {
    if (g.fresh > 0) g.fresh -= dt;
    if (g.mouse.down) {
      for (const b of g.bubbles) if (!b.popped && Math.hypot(g.mouse.x - b.x, g.mouse.y - b.y) < R) {
        b.popped = true; b.t = 0.25; g.total++; g.sfx('pop');
        if (g.total % 25 === 0) try { localStorage.setItem('mcc.bubblewrap.total', String(g.total)); } catch (e) {}
      }
    }
    for (const b of g.bubbles) if (b.t > 0) b.t -= dt;
    if (g.bubbles.every((b) => b.popped) && !g.nextT) g.nextT = 0.8;
    if (g.nextT) { g.nextT -= dt; if (g.nextT <= 0) { g.nextT = 0; this.sheet(g); g.sfx('whoosh'); try { localStorage.setItem('mcc.bubblewrap.total', String(g.total)); } catch (e) {} } }
  },

  demo(g) { g.bubbles.forEach((b, i) => { if ([5, 6, 17, 18, 19, 30, 42, 43, 55].includes(i)) b.popped = true; }); g.total = 1234; },

  draw(g, ctx) {
    const bg = ctx.createLinearGradient(0, 0, 0, g.H);
    bg.addColorStop(0, 'hsl(' + g.hue + ',70%,82%)'); bg.addColorStop(1, 'hsl(' + g.hue + ',60%,62%)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, g.W, g.H);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(14, 50, 612, 416);
    for (const b of g.bubbles) {
      if (b.popped) {
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(b.x, b.y + 4, R * 0.8, R * 0.45, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(b.x - 10, b.y + 2); ctx.lineTo(b.x - 2, b.y + 6); ctx.lineTo(b.x + 4, b.y); ctx.lineTo(b.x + 11, b.y + 5); ctx.stroke();
        if (b.t > 0) g.text('POP!', b.x, b.y - 20 - (0.25 - b.t) * 60, 18, '#fff', '#c0306a');
      } else {
        const gr = ctx.createRadialGradient(b.x - 7, b.y - 8, 2, b.x, b.y, R);
        gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.35, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,.15)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 0, g.W, 40);
    g.text('BUBBLE WRAP', 18, 21, 24, '#fff', '#3a2a6a', 'left', g.FONT_TITLE);
    g.text('Popped: ' + g.total, 600, 21, 20, '#fff', null, 'right');
  },
});
