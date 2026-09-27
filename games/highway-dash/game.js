// Highway Dash - weave through traffic, grab fuel, don't crash
const LANES = [200, 280, 360, 440];

MCC.game({
  id: 'highway-dash',
  title: 'Highway Dash',
  width: 640, height: 480,
  instructions: ['LEFT / RIGHT arrow keys (or click a lane) to change lanes.', 'Collect fuel cans before your tank runs dry.', 'The further you go, the faster the traffic!'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) {
    g.lane = 1; g.px = LANES[1]; g.speed = 320; g.dist = 0; g.fuel = 100; g.traffic = []; g.cans = []; g.spawn = 1; g.can = 3; g.scroll = 0; g.crash = null;
  },

  update(g, dt) {
    if (g.anyPressed('ArrowLeft', 'KeyA')) g.lane = Math.max(0, g.lane - 1);
    if (g.anyPressed('ArrowRight', 'KeyD')) g.lane = Math.min(3, g.lane + 1);
    if (g.mouse.clicked) { let best = 0; LANES.forEach((x, i) => { if (Math.abs(g.mouse.x - x) < Math.abs(g.mouse.x - LANES[best])) best = i; }); g.lane = best; }
    g.px += (LANES[g.lane] - g.px) * Math.min(1, dt * 12);
    g.speed = 320 + g.dist / 60;
    g.dist += g.speed * dt;
    g.scroll = (g.scroll + g.speed * dt) % 80;
    g.score = Math.floor(g.dist / 20);
    g.fuel -= dt * 6.5;
    if (g.fuel <= 0) { g.fuel = 0; g.over('Out of Fuel!', 'Distance: ' + g.score + ' m'); return; }
    g.spawn -= dt;
    if (g.spawn <= 0) {
      const lane = g.randInt(0, 3);
      if (!g.traffic.some((c) => c.lane === lane && c.y < 80)) g.traffic.push({ lane, y: -70, v: g.rand(0.35, 0.65), c: g.pick(['#e8302a', '#f0c020', '#30b040', '#a040e0', '#e0e0e0', '#ff8a2a']), truck: Math.random() < 0.2 });
      g.spawn = Math.max(0.28, 0.9 - g.dist / 30000) * g.rand(0.7, 1.3);
    }
    g.can -= dt;
    if (g.can <= 0) { g.cans.push({ lane: g.randInt(0, 3), y: -30 }); g.can = g.rand(3, 5); }
    for (const c of g.traffic) c.y += g.speed * (1 - c.v) * dt;
    for (const c of g.cans) c.y += g.speed * dt;
    g.traffic = g.traffic.filter((c) => c.y < 560);
    for (const c of g.cans) if (!c.got && Math.abs(LANES[c.lane] - g.px) < 30 && Math.abs(c.y - 400) < 40) { c.got = true; g.fuel = Math.min(100, g.fuel + 30); g.sfx('coin'); g.addScore(0); }
    g.cans = g.cans.filter((c) => c.y < 520 && !c.got);
    for (const c of g.traffic) {
      const h = c.truck ? 90 : 60;
      if (Math.abs(LANES[c.lane] - g.px) < 36 && c.y + h / 2 > 372 && c.y - h / 2 < 430) { g.sfx('explode'); g.over('CRASH!', 'Distance: ' + g.score + ' m'); return; }
    }
  },

  vehicle(g, ctx, x, y, c, truck, player) {
    const w = 38, h = truck ? 90 : 60;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; g.roundRect(x - w / 2 + 3, y - h / 2 + 4, w, h, 8); ctx.fill();
    ctx.fillStyle = '#111'; for (const dy of [-h / 2 + 12, h / 2 - 16]) { ctx.fillRect(x - w / 2 - 3, y + dy, 5, 12); ctx.fillRect(x + w / 2 - 2, y + dy, 5, 12); }
    const gr = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    gr.addColorStop(0, c); gr.addColorStop(0.5, '#fff'); gr.addColorStop(0.55, c); gr.addColorStop(1, c);
    ctx.fillStyle = gr; g.roundRect(x - w / 2, y - h / 2, w, h, 8); ctx.fill();
    ctx.fillStyle = '#2a3a5a';
    if (truck) { ctx.fillRect(x - 15, y + h / 2 - 26, 30, 12); ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(x - 17, y - h / 2 + 4, 34, h - 34); }
    else { ctx.fillRect(x - 14, y + (player ? -12 : 8), 28, 12); ctx.fillRect(x - 13, y + (player ? 14 : -20), 26, 8); }
    if (player) { ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, y - h / 2, 6, h); }
  },

  demo(g) {
    g.traffic = [{ lane: 0, y: 120, c: '#e8302a' }, { lane: 2, y: 250, c: '#f0c020', truck: true }, { lane: 3, y: 60, c: '#30b040' }, { lane: 1, y: -10, c: '#a040e0' }];
    g.cans = [{ lane: 3, y: 300 }]; g.px = LANES[1]; g.score = 2210; g.fuel = 64; g.speed = 500;
  },

  draw(g, ctx) {
    ctx.fillStyle = '#4ab83a'; ctx.fillRect(0, 0, g.W, g.H);
    for (let y = -80 + g.scroll; y < g.H; y += 80) { ctx.fillStyle = '#3a9a2a'; ctx.beginPath(); ctx.arc(80, y + 20, 26, 0, 7); ctx.arc(560, y + 60, 26, 0, 7); ctx.fill(); ctx.fillStyle = '#2a7a1a'; ctx.beginPath(); ctx.arc(80, y + 20, 14, 0, 7); ctx.arc(560, y + 60, 14, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#555'; ctx.fillRect(152, 0, 336, g.H);
    ctx.fillStyle = '#ddd'; ctx.fillRect(152, 0, 6, g.H); ctx.fillRect(482, 0, 6, g.H);
    ctx.fillStyle = '#fff';
    for (const lx of [240, 320, 400]) for (let y = -80 + g.scroll; y < g.H; y += 80) ctx.fillRect(lx - 2, y, 4, 40);
    for (const c of g.cans) {
      const x = LANES[c.lane];
      ctx.fillStyle = '#e8302a'; g.roundRect(x - 11, c.y - 14, 22, 28, 4); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 6, c.y - 18, 8, 5); g.text('F', x, c.y + 1, 16, '#fff', null);
    }
    for (const c of g.traffic) this.vehicle(g, ctx, LANES[c.lane], c.y, c.c, c.truck, false);
    this.vehicle(g, ctx, g.px, 400, '#2a7ae8', false, true);
    ctx.fillStyle = 'rgba(0,0,0,.55)'; g.roundRect(8, 8, 136, 64, 8); ctx.fill();
    g.text(g.score + ' m', 76, 26, 20, '#fff', null);
    g.text('FUEL', 30, 52, 14, '#ffd24a', null);
    ctx.fillStyle = '#333'; ctx.fillRect(52, 45, 84, 14);
    ctx.fillStyle = g.fuel < 25 ? '#ff4a4a' : '#4ad84a'; ctx.fillRect(52, 45, 84 * g.fuel / 100, 14);
    g.text('HIGHWAY', 566, 24, 22, '#ffd24a', '#5a2000', 'center', g.FONT_TITLE);
    g.text('DASH', 566, 50, 22, '#fff', '#1a3a8a', 'center', g.FONT_TITLE);
  },
});
