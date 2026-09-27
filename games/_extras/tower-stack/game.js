// Tower Stack - drop sliding blocks to build the tallest tower
const BH = 26;

MCC.game({
  id: 'tower-stack',
  title: 'Tower Stack',
  width: 640, height: 480,
  instructions: ['Click or press SPACE to drop the sliding block.', 'Anything hanging over the edge is chopped off.', 'Perfect drops give bonus points and keep your tower wide!'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) {
    g.stack = [{ x: 220, w: 200, hue: 200 }];
    g.cur = { x: 0, w: 200, dir: 1, hue: 212 };
    g.speed = 220; g.chips = []; g.cam = 0; g.perfect = 0; g.flash = 0;
  },

  update(g, dt) {
    const c = g.cur;
    c.x += c.dir * g.speed * dt;
    if (c.x + c.w > 600) { c.x = 600 - c.w; c.dir = -1; }
    if (c.x < 40) { c.x = 40; c.dir = 1; }
    if (g.pressed('Space') || g.mouse.clicked) {
      const top = g.stack[g.stack.length - 1];
      const l = Math.max(c.x, top.x), r = Math.min(c.x + c.w, top.x + top.w);
      if (r - l <= 0) { g.chips.push({ x: c.x, w: c.w, y: g.stack.length, vy: 0, hue: c.hue }); g.sfx('lose'); g.over('Timber!', 'Your tower is ' + (g.stack.length - 1) + ' blocks tall'); return; }
      let nx = l, nw = r - l;
      if (Math.abs(c.x - top.x) < 5) { nx = top.x; nw = top.w; g.perfect++; g.flash = 0.4; g.addScore(2 + g.perfect); g.sfx('win'); if (g.perfect >= 3) nw = Math.min(260, nw + 10); }
      else {
        g.perfect = 0; g.addScore(1); g.sfx('hit');
        if (c.x < top.x) g.chips.push({ x: c.x, w: top.x - c.x, y: g.stack.length, vy: 0, hue: c.hue });
        else g.chips.push({ x: top.x + top.w, w: c.x + c.w - top.x - top.w, y: g.stack.length, vy: 0, hue: c.hue });
      }
      g.stack.push({ x: nx, w: nw, hue: c.hue });
      g.cur = { x: c.dir > 0 ? 40 : 600 - nw, w: nw, dir: c.dir > 0 ? 1 : -1, hue: (c.hue + 12) % 360 };
      g.speed = Math.min(520, 220 + g.stack.length * 9);
    }
    for (const ch of g.chips) { ch.vy += 30 * dt; ch.y -= ch.vy * dt; }
    g.chips = g.chips.filter((ch) => ch.y > g.stack.length - 30);
    const target = Math.max(0, (g.stack.length - 9) * BH);
    g.cam += (target - g.cam) * Math.min(1, dt * 5);
    if (g.flash > 0) g.flash -= dt;
  },

  demo(g) {
    for (let i = 0; i < 12; i++) g.stack.push({ x: 220 + Math.sin(i) * 12 + i * 2, w: 200 - i * 6, hue: 212 + i * 12 });
    g.cur = { x: 340, w: 128, dir: 1, hue: 356 };
    g.cam = 4 * BH; g.score = 21;
  },

  draw(g, ctx) {
    const h = g.stack.length;
    const sky = ctx.createLinearGradient(0, 0, 0, g.H);
    sky.addColorStop(0, 'hsl(' + (220 - h * 3) + ',60%,' + Math.max(20, 70 - h) + '%)'); sky.addColorStop(1, 'hsl(' + (200 - h * 2) + ',70%,85%)');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, g.W, g.H);
    const base = 440 + g.cam;
    ctx.fillStyle = '#5a8a3a'; ctx.fillRect(0, base, 640, 200);
    const block = (x, w, i, hue) => {
      const y = base - (i + 1) * BH;
      const gr = ctx.createLinearGradient(0, y, 0, y + BH);
      gr.addColorStop(0, 'hsl(' + hue + ',75%,70%)'); gr.addColorStop(1, 'hsl(' + hue + ',70%,48%)');
      ctx.fillStyle = gr; ctx.fillRect(x, y, w, BH - 1);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x, y, w, 3);
    };
    g.stack.forEach((b, i) => block(b.x, b.w, i, b.hue));
    for (const ch of g.chips) block(ch.x, ch.w, ch.y, ch.hue);
    if (g.state === 'play' || g.demoMode) block(g.cur.x, g.cur.w, g.stack.length, g.cur.hue);
    if (g.flash > 0) g.text('PERFECT!', 320, 120, 40, '#fff', '#c07000', 'center', g.FONT_TITLE);
    g.text(String(g.score), 320, 60, 56, '#fff', 'rgba(0,0,0,.35)', 'center', g.FONT_TITLE);
    g.text('Height: ' + (h - 1), 20, 24, 18, '#fff', null, 'left');
  },
});
