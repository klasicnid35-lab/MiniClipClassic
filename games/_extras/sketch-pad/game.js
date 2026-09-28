// Sketch Pad - painting toy with brushes, stamps, fill and save
const PAL = ['#000000', '#ffffff', '#7a7a7a', '#e8302a', '#ff9a2a', '#ffe030', '#4ad84a', '#1a8a3a', '#3ad0ff', '#2a6ae8', '#a040e0', '#ff7ab8', '#8a5a2a', '#ffd2a6'];
const TOOLS = ['Brush', 'Marker', 'Spray', 'Fill', 'Stamp', 'Eraser'];
const STAMPS = ['★', '♥', '☺', '✿', '☀', '♪'];
const CX = 110, CY = 10, CW = 520, CHh = 420;

MCC.game({
  id: 'sketch-pad',
  title: 'Sketch Pad',
  width: 640, height: 480,
  scored: false,
  noPause: true,
  noMuteIcon: true,
  instructions: ['Pick a tool and a colour on the left, then draw on the paper.', 'Use Fill to paint whole areas and Stamp for quick pictures.', 'Save downloads your drawing as a PNG picture.'],

  init(g) {
    g.paper = document.createElement('canvas'); g.paper.width = CW; g.paper.height = CHh;
    g.pctx = g.paper.getContext('2d');
    g.pctx.fillStyle = '#fff'; g.pctx.fillRect(0, 0, CW, CHh);
    g.color = '#2a6ae8'; g.tool = 'Brush'; g.size = 8; g.stamp = 0; g.undo = [];
    try { const saved = localStorage.getItem('mcc.sketchpad'); if (saved) { const img = new Image(); img.onload = () => g.pctx.drawImage(img, 0, 0); img.src = saved; } } catch (e) {}
    g.state = 'title';
  },

  start(g) {},

  snapshot(g) { g.undo.push(g.pctx.getImageData(0, 0, CW, CHh)); if (g.undo.length > 15) g.undo.shift(); },
  persist(g) { try { localStorage.setItem('mcc.sketchpad', g.paper.toDataURL('image/png')); } catch (e) {} },

  fill(g, x, y) {
    const img = g.pctx.getImageData(0, 0, CW, CHh), d = img.data;
    const i0 = (y * CW + x) * 4, t = [d[i0], d[i0 + 1], d[i0 + 2]];
    const c = [parseInt(g.color.slice(1, 3), 16), parseInt(g.color.slice(3, 5), 16), parseInt(g.color.slice(5, 7), 16)];
    if (t[0] === c[0] && t[1] === c[1] && t[2] === c[2]) return;
    const match = (i) => Math.abs(d[i] - t[0]) < 40 && Math.abs(d[i + 1] - t[1]) < 40 && Math.abs(d[i + 2] - t[2]) < 40;
    const st = [[x, y]];
    while (st.length) {
      let [px, py] = st.pop();
      let i = (py * CW + px) * 4;
      while (px >= 0 && match(i)) { px--; i -= 4; }
      px++; i += 4;
      let up = false, dn = false;
      while (px < CW && match(i)) {
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
        if (py > 0) { const u = i - CW * 4; if (match(u)) { if (!up) { st.push([px, py - 1]); up = true; } } else up = false; }
        if (py < CHh - 1) { const v = i + CW * 4; if (match(v)) { if (!dn) { st.push([px, py + 1]); dn = true; } } else dn = false; }
        px++; i += 4;
      }
    }
    g.pctx.putImageData(img, 0, 0);
  },

  paint(g, x, y, lx, ly) {
    const p = g.pctx;
    p.lineCap = 'round'; p.lineJoin = 'round';
    if (g.tool === 'Brush' || g.tool === 'Eraser' || g.tool === 'Marker') {
      p.strokeStyle = g.tool === 'Eraser' ? '#fff' : g.color;
      p.globalAlpha = g.tool === 'Marker' ? 0.35 : 1;
      p.lineWidth = g.tool === 'Marker' ? g.size * 2.5 : g.tool === 'Eraser' ? g.size * 2 : g.size;
      p.beginPath(); p.moveTo(lx, ly); p.lineTo(x, y); p.stroke();
      p.globalAlpha = 1;
    } else if (g.tool === 'Spray') {
      p.fillStyle = g.color;
      for (let k = 0; k < 30; k++) { const a = Math.random() * 7, r = Math.random() * g.size * 2.5; p.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.5, 1.5); }
    }
  },

  update(g) {
    const m = g.mouse, inPaper = m.x >= CX && m.x < CX + CW && m.y >= CY && m.y < CY + CHh;
    const px = Math.floor(m.x - CX), py = Math.floor(m.y - CY);
    if (m.clicked) {
      if (inPaper) {
        this.snapshot(g);
        if (g.tool === 'Fill') { this.fill(g, px, py); g.sfx('pop'); }
        else if (g.tool === 'Stamp') { g.pctx.fillStyle = g.color; g.pctx.font = (g.size * 5 + 10) + 'px "Segoe UI Symbol", "DejaVu Sans", sans-serif'; g.pctx.textAlign = 'center'; g.pctx.textBaseline = 'middle'; g.pctx.fillText(STAMPS[g.stamp], px, py); g.sfx('pop'); }
        else { g.last = { x: px, y: py }; this.paint(g, px, py, px, py); }
      } else {
        TOOLS.forEach((t, i) => { if (m.x > 8 && m.x < 98 && m.y > 8 + i * 30 && m.y < 34 + i * 30) { g.tool = t; g.sfx('click'); } });
        PAL.forEach((c, i) => { const x = 10 + (i % 2) * 46, y = 196 + Math.floor(i / 2) * 26; if (m.x > x && m.x < x + 42 && m.y > y && m.y < y + 22) { g.color = c; g.sfx('click'); } });
        [4, 8, 16].forEach((s, i) => { if (m.x > 8 + i * 31 && m.x < 36 + i * 31 && m.y > 384 && m.y < 408) g.size = s; });
        if (g.tool === 'Stamp' && m.y > 412 && m.y < 432) g.stamp = (g.stamp + 1) % STAMPS.length;
        if (m.y > 440 && m.x > 110 && m.x < 210) { this.snapshot(g); g.pctx.fillStyle = '#fff'; g.pctx.fillRect(0, 0, CW, CHh); g.sfx('whoosh'); }
        if (m.y > 440 && m.x > 220 && m.x < 320 && g.undo.length) { g.pctx.putImageData(g.undo.pop(), 0, 0); }
        if (m.y > 440 && m.x > 330 && m.x < 430) { const a = document.createElement('a'); a.download = 'my-drawing.png'; a.href = g.paper.toDataURL('image/png'); a.click(); g.sfx('win'); }
      }
    } else if (m.down && g.last && inPaper) { this.paint(g, px, py, g.last.x, g.last.y); g.last = { x: px, y: py }; }
    if (m.released && g.last) { g.last = null; this.persist(g); }
    if (m.released && (g.tool === 'Fill' || g.tool === 'Stamp')) this.persist(g);
  },

  demo(g) {
    const p = g.pctx;
    p.fillStyle = '#bfe6ff'; p.fillRect(0, 0, CW, 260); p.fillStyle = '#6ad84a'; p.fillRect(0, 260, CW, 160);
    p.fillStyle = '#ffe030'; p.beginPath(); p.arc(420, 80, 45, 0, 7); p.fill();
    p.fillStyle = '#e8302a'; p.fillRect(120, 170, 150, 110); p.fillStyle = '#8a5a2a'; p.beginPath(); p.moveTo(105, 175); p.lineTo(195, 100); p.lineTo(285, 175); p.fill();
    p.fillStyle = '#3ad0ff'; p.fillRect(145, 195, 35, 35); p.fillRect(215, 195, 35, 35); p.fillStyle = '#8a5a2a'; p.fillRect(180, 230, 32, 50);
    p.strokeStyle = '#2a6ae8'; p.lineWidth = 8; p.lineCap = 'round'; p.beginPath(); p.moveTo(320, 330); p.quadraticCurveTo(380, 250, 470, 340); p.stroke();
    g.tool = 'Brush';
  },

  draw(g, ctx) {
    ctx.fillStyle = '#7d9fd4'; ctx.fillRect(0, 0, g.W, g.H);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(CX + 4, CY + 4, CW, CHh);
    ctx.drawImage(g.paper, CX, CY);
    TOOLS.forEach((t, i) => {
      const on = g.tool === t;
      ctx.fillStyle = on ? '#ffd24a' : '#e8f0ff'; g.roundRect(8, 8 + i * 30, 90, 26, 6); ctx.fill();
      ctx.strokeStyle = '#3a5a9a'; ctx.lineWidth = 1.5; ctx.stroke();
      g.text(t, 53, 22 + i * 30, 15, on ? '#5a3000' : '#1a3a7a', null);
    });
    PAL.forEach((c, i) => {
      const x = 10 + (i % 2) * 46, y = 196 + Math.floor(i / 2) * 26;
      ctx.fillStyle = c; g.roundRect(x, y, 42, 22, 5); ctx.fill();
      ctx.strokeStyle = g.color === c ? '#ffd24a' : 'rgba(0,0,0,.4)'; ctx.lineWidth = g.color === c ? 3 : 1; ctx.stroke();
    });
    [4, 8, 16].forEach((s, i) => { ctx.fillStyle = g.size === s ? '#ffd24a' : '#e8f0ff'; g.roundRect(8 + i * 31, 384, 28, 24, 5); ctx.fill(); ctx.fillStyle = '#1a3a7a'; ctx.beginPath(); ctx.arc(22 + i * 31, 396, s / 2.2 + 1, 0, 7); ctx.fill(); });
    if (g.tool === 'Stamp') g.text('Stamp: ' + STAMPS[g.stamp] + ' (click)', 53, 422, 13, '#fff', null);
    g.button(110, 444, 100, 30, 'Clear', ['#ff9a8a', '#e84a3a', '#b82a1a']);
    g.button(220, 444, 100, 30, 'Undo', ['#8fd0ff', '#3a8de0', '#1a5ab0']);
    g.button(330, 444, 100, 30, 'Save');
    g.text('SketchPad', 632, 459, 22, '#fff', '#2a4a8a', 'right', g.FONT_TITLE);
    const m = g.mouse;
    if (m.x >= CX && m.x < CX + CW && m.y >= CY && m.y < CY + CHh && g.state === 'play') { ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(m.x, m.y, Math.max(3, (g.tool === 'Marker' ? g.size * 2.5 : g.tool === 'Eraser' ? g.size * 2 : g.size) / 2), 0, 7); ctx.stroke(); }
  },
});
