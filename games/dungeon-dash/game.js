// Dungeon Dash - small turn-based roguelike with random dungeons
const CW = 20, CH = 20, GW = 32, GH = 21, OY = 40;
const MONSTERS = [
  { n: 'Rat', c: '#b08a6a', hp: 4, atk: 1, xp: 2 }, { n: 'Bat', c: '#8a6ab0', hp: 5, atk: 2, xp: 3 },
  { n: 'Goblin', c: '#5ab04a', hp: 9, atk: 3, xp: 6 }, { n: 'Skeleton', c: '#e8e8d8', hp: 14, atk: 4, xp: 10 }, { n: 'Ogre', c: '#c86a3a', hp: 24, atk: 6, xp: 18 },
];

MCC.game({
  id: 'dungeon-dash',
  title: 'Dungeon Dash',
  width: 640, height: 480,
  instructions: ['ARROW keys or WASD to move. Walk into a monster to attack it.', 'Pick up potions (red) and gold (yellow). Find the stairs to go deeper.', 'Each floor is harder. How deep can you go?'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) { g.hero = { hp: 20, max: 20, atk: 3, lvl: 1, xp: 0, gold: 0 }; g.depth = 0; g.log = []; this.newFloor(g); },

  say(g, s) { g.log.unshift(s); g.log.length = Math.min(g.log.length, 3); },

  newFloor(g) {
    g.depth++;
    g.map = Array.from({ length: GH }, () => Array(GW).fill('#'));
    const rooms = [];
    for (let t = 0; t < 60 && rooms.length < 8; t++) {
      const w = g.randInt(4, 8), h = g.randInt(3, 6), x = g.randInt(1, GW - w - 2), y = g.randInt(1, GH - h - 2);
      if (rooms.some((r) => x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y)) continue;
      rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) g.map[yy][xx] = '.';
    }
    for (let i = 1; i < rooms.length; i++) {
      let { cx: x, cy: y } = rooms[i - 1]; const { cx: tx, cy: ty } = rooms[i];
      while (x !== tx) { g.map[y][x] = '.'; x += Math.sign(tx - x); }
      while (y !== ty) { g.map[y][x] = '.'; y += Math.sign(ty - y); }
    }
    g.rooms = rooms;
    g.hero.x = rooms[0].cx; g.hero.y = rooms[0].cy;
    const last = rooms[rooms.length - 1];
    g.map[last.cy][last.cx] = '>';
    g.items = []; g.mons = [];
    const spot = () => { for (;;) { const r = g.pick(rooms.slice(1)); const x = g.randInt(r.x, r.x + r.w - 1), y = g.randInt(r.y, r.y + r.h - 1); if (g.map[y][x] === '.' && !g.items.some((i) => i.x === x && i.y === y) && !g.mons.some((m) => m.x === x && m.y === y)) return { x, y }; } };
    for (let i = 0; i < 3 + g.depth; i++) { const kind = Math.min(MONSTERS.length - 1, Math.floor(Math.random() * (1 + g.depth * 0.7))); const M = MONSTERS[kind]; g.mons.push({ ...spot(), ...M, hp: M.hp + g.depth, max: M.hp + g.depth, atk: M.atk + Math.floor(g.depth / 3) }); }
    for (let i = 0; i < 2; i++) g.items.push({ ...spot(), t: 'potion' });
    for (let i = 0; i < 3; i++) g.items.push({ ...spot(), t: 'gold' });
    if (g.depth % 2 === 0) g.items.push({ ...spot(), t: 'sword' });
    this.say(g, 'You enter floor ' + g.depth + '.');
    this.see(g);
  },

  see(g) {
    g.seen = g.seen && g.seenDepth === g.depth ? g.seen : Array.from({ length: GH }, () => Array(GW).fill(false));
    g.seenDepth = g.depth;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -5; dx <= 5; dx++) { const x = g.hero.x + dx, y = g.hero.y + dy; if (x >= 0 && y >= 0 && x < GW && y < GH) g.seen[y][x] = true; }
    for (const r of g.rooms) if (g.hero.x >= r.x && g.hero.x < r.x + r.w && g.hero.y >= r.y && g.hero.y < r.y + r.h) for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) g.seen[y][x] = true;
  },

  move(g, dx, dy) {
    const h = g.hero, nx = h.x + dx, ny = h.y + dy;
    const m = g.mons.find((o) => o.x === nx && o.y === ny);
    if (m) {
      const dmg = g.randInt(1, h.atk + 1);
      m.hp -= dmg; g.sfx('hit');
      if (m.hp <= 0) {
        g.mons.splice(g.mons.indexOf(m), 1); h.xp += m.xp; g.addScore(m.xp * 10); this.say(g, 'You defeat the ' + m.n + '!');
        if (h.xp >= h.lvl * 12) { h.lvl++; h.max += 5; h.hp = h.max; h.atk++; this.say(g, 'Level up! You are now level ' + h.lvl + '.'); g.sfx('win'); }
      } else this.say(g, 'You hit the ' + m.n + ' for ' + dmg + '.');
    } else if (g.map[ny][nx] !== '#') {
      h.x = nx; h.y = ny; g.sfx('tick');
      const it = g.items.find((i) => i.x === nx && i.y === ny);
      if (it) {
        g.items.splice(g.items.indexOf(it), 1);
        if (it.t === 'potion') { h.hp = Math.min(h.max, h.hp + 10); this.say(g, 'You drink a potion. Ahh!'); g.sfx('coin'); }
        if (it.t === 'gold') { const n = g.randInt(5, 15) * g.depth; h.gold += n; g.addScore(n); this.say(g, 'You find ' + n + ' gold.'); g.sfx('coin'); }
        if (it.t === 'sword') { h.atk += 2; this.say(g, 'A sharper sword! Attack +2.'); g.sfx('win'); }
      }
      if (g.map[ny][nx] === '>') { g.addScore(50 * g.depth); this.newFloor(g); return; }
    } else return;
    // monsters act
    for (const o of g.mons) {
      const d = Math.abs(o.x - h.x) + Math.abs(o.y - h.y);
      if (d === 1) { const dmg = g.randInt(1, o.atk); h.hp -= dmg; this.say(g, 'The ' + o.n + ' hits you for ' + dmg + '.'); if (h.hp <= 0) { h.hp = 0; g.over('You Died!', 'Killed by a ' + o.n + ' on floor ' + g.depth); return; } }
      else if (d < 8 && Math.random() < 0.8) {
        const opts = [[Math.sign(h.x - o.x), 0], [0, Math.sign(h.y - o.y)]].filter(([a, b]) => (a || b) && g.map[o.y + b][o.x + a] !== '#' && !g.mons.some((q) => q.x === o.x + a && q.y === o.y + b) && !(o.x + a === h.x && o.y + b === h.y));
        if (opts.length) { const [a, b] = g.pick(opts); o.x += a; o.y += b; }
      }
    }
    this.see(g);
  },

  update(g) {
    const k = [['ArrowUp', 'KeyW', 0, -1], ['ArrowDown', 'KeyS', 0, 1], ['ArrowLeft', 'KeyA', -1, 0], ['ArrowRight', 'KeyD', 1, 0]];
    for (const [a, b, dx, dy] of k) if (g.pressed(a) || g.pressed(b)) { this.move(g, dx, dy); break; }
    if (g.swiped) {}
  },

  demo(g) { for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) g.seen[y][x] = true; g.hero.hp = 14; g.score = 420; },

  draw(g, ctx) {
    ctx.fillStyle = '#0a0806'; ctx.fillRect(0, 0, g.W, g.H);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      if (!g.seen[y][x]) continue;
      const X = x * CW, Y = OY + y * CH, c = g.map[y][x];
      const near = Math.abs(x - g.hero.x) <= 5 && Math.abs(y - g.hero.y) <= 4;
      ctx.globalAlpha = near ? 1 : 0.55;
      if (c === '#') { ctx.fillStyle = '#4a3a2a'; ctx.fillRect(X, Y, CW, CH); ctx.fillStyle = '#5a4a3a'; ctx.fillRect(X + 1, Y + 1, CW - 2, 8); ctx.fillRect(X + 1, Y + 11, 8, 8); ctx.fillRect(X + 11, Y + 11, 8, 8); }
      else { ctx.fillStyle = (x + y) % 2 ? '#2a2420' : '#322a24'; ctx.fillRect(X, Y, CW, CH); }
      if (c === '>') { ctx.fillStyle = '#8a8a8a'; for (let k = 0; k < 4; k++) ctx.fillRect(X + 3 + k * 3, Y + 4 + k * 3, CW - 6 - k * 3, 3); }
    }
    ctx.globalAlpha = 1;
    for (const it of g.items) {
      if (!g.seen[it.y][it.x]) continue;
      const X = it.x * CW + 10, Y = OY + it.y * CH + 10;
      if (it.t === 'potion') { ctx.fillStyle = '#e82a3a'; ctx.beginPath(); ctx.arc(X, Y + 2, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#ccc'; ctx.fillRect(X - 2, Y - 8, 4, 5); }
      if (it.t === 'gold') { ctx.fillStyle = '#ffd83a'; ctx.beginPath(); ctx.arc(X - 3, Y + 3, 4, 0, 7); ctx.arc(X + 3, Y + 3, 4, 0, 7); ctx.arc(X, Y - 2, 4, 0, 7); ctx.fill(); }
      if (it.t === 'sword') { ctx.strokeStyle = '#dde'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X - 6, Y + 6); ctx.lineTo(X + 6, Y - 6); ctx.stroke(); ctx.strokeStyle = '#a86a2a'; ctx.beginPath(); ctx.moveTo(X - 6, Y); ctx.lineTo(X, Y + 6); ctx.stroke(); }
    }
    for (const m of g.mons) {
      if (!g.seen[m.y][m.x] || Math.abs(m.x - g.hero.x) > 5 || Math.abs(m.y - g.hero.y) > 4) continue;
      const X = m.x * CW + 10, Y = OY + m.y * CH + 10;
      ctx.fillStyle = m.c; ctx.beginPath(); ctx.arc(X, Y + 1, 8, 0, 7); ctx.fill();
      ctx.fillStyle = '#e00'; ctx.fillRect(X - 4, Y - 2, 3, 3); ctx.fillRect(X + 1, Y - 2, 3, 3);
      ctx.fillStyle = '#300'; ctx.fillRect(X - 9, Y - 11, 18, 3); ctx.fillStyle = '#e44'; ctx.fillRect(X - 9, Y - 11, 18 * m.hp / m.max, 3);
    }
    const h = g.hero, X = h.x * CW + 10, Y = OY + h.y * CH + 10;
    const lg = ctx.createRadialGradient(X, Y, 10, X, Y, 120);
    lg.addColorStop(0, 'rgba(255,200,120,.15)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lg; ctx.fillRect(X - 120, Y - 120, 240, 240);
    ctx.fillStyle = '#3a8ae8'; ctx.beginPath(); ctx.arc(X, Y + 2, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd2a6'; ctx.beginPath(); ctx.arc(X, Y - 4, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#bbb'; ctx.fillRect(X + 6, Y - 8, 2, 12);
    // HUD
    ctx.fillStyle = '#1a1410'; ctx.fillRect(0, 0, g.W, OY);
    g.text('Floor ' + g.depth, 12, 13, 16, '#ffd24a', null, 'left');
    g.text('HP', 90, 13, 14, '#fff', null, 'left');
    ctx.fillStyle = '#400'; ctx.fillRect(112, 7, 100, 12); ctx.fillStyle = '#e84a4a'; ctx.fillRect(112, 7, 100 * h.hp / h.max, 12);
    g.text(h.hp + '/' + h.max, 162, 13, 12, '#fff', null);
    g.text('Lvl ' + h.lvl + '  Atk ' + h.atk + '  Gold ' + h.gold + '  Score ' + g.score, 226, 13, 14, '#fff', null, 'left');
    g.text(g.log[0] || '', 12, 31, 13, '#d8c8a8', null, 'left');
  },
});
