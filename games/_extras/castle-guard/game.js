// Castle Guard - tower defence, 15 waves
const PATH = [[-20, 90], [140, 90], [140, 250], [320, 250], [320, 110], [500, 110], [500, 330], [230, 330], [230, 420], [560, 420]];
const TOWERS = {
  arrow: { name: 'Archer', cost: 50, range: 95, rate: 0.55, dmg: 12, color: '#8a5a2a', shot: '#ffe', desc: 'Fast arrows' },
  cannon: { name: 'Cannon', cost: 110, range: 85, rate: 1.4, dmg: 34, splash: 40, color: '#555', shot: '#222', desc: 'Splash damage' },
  frost: { name: 'Frost', cost: 80, range: 80, rate: 1, dmg: 5, slow: 1.6, color: '#3a9ae8', shot: '#bfeaff', desc: 'Slows enemies' },
};

function segDist(px, py, [x1, y1], [x2, y2]) {
  const vx = x2 - x1, vy = y2 - y1, L = vx * vx + vy * vy;
  const t = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / L));
  return Math.hypot(px - (x1 + vx * t), py - (y1 + vy * t));
}

MCC.game({
  id: 'castle-guard',
  title: 'Castle Guard',
  width: 640, height: 480,
  instructions: ['Pick a tower at the bottom, then click on the grass to build it.', 'Towers shoot the goblins automatically. Click a tower to sell it.', 'Press "Send Wave" when you are ready. Survive all 15 waves!'],

  init(g) {
    g.segs = []; let total = 0;
    for (let i = 0; i < PATH.length - 1; i++) { const L = Math.hypot(PATH[i + 1][0] - PATH[i][0], PATH[i + 1][1] - PATH[i][1]); g.segs.push({ a: PATH[i], b: PATH[i + 1], L, s: total }); total += L; }
    g.pathLen = total;
    this.start(g); g.state = 'title';
  },

  start(g) { g.gold = 180; g.lives = 20; g.wave = 0; g.towers = []; g.foes = []; g.shots = []; g.fx = []; g.pickT = 'arrow'; g.queue = []; g.waveOn = false; g.auto = 0; },

  at(g, d) {
    for (const s of g.segs) if (d <= s.s + s.L) { const t = (d - s.s) / s.L; return [s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t]; }
    return PATH[PATH.length - 1];
  },

  canBuild(g, x, y) {
    if (y > 440 || y < 40 || x < 16 || x > 624) return false;
    for (let i = 0; i < PATH.length - 1; i++) if (segDist(x, y, PATH[i], PATH[i + 1]) < 30) return false;
    if (Math.hypot(x - 590, y - 400) < 50) return false;
    return !g.towers.some((t) => Math.hypot(t.x - x, t.y - y) < 32);
  },

  sendWave(g) {
    if (g.waveOn || g.wave >= 15) return;
    g.wave++; g.waveOn = true;
    const n = 6 + g.wave * 2;
    for (let i = 0; i < n; i++) {
      const big = g.wave % 5 === 0 && i === n - 1;
      const fast = g.wave > 3 && i % 4 === 3;
      g.queue.push({ t: i * (fast ? 0.5 : 0.8), hp: big ? 400 + g.wave * 60 : 26 + g.wave * 12 * (fast ? 0.6 : 1), sp: big ? 30 : fast ? 75 : 45, big, fast, bounty: big ? 60 : 6 + Math.floor(g.wave / 2) });
    }
    g.qT = 0; g.sfx('blip');
  },

  update(g, dt) {
    const m = g.mouse;
    if (m.clicked) {
      if (m.y > 446) {
        const keys = Object.keys(TOWERS);
        keys.forEach((k, i) => { if (m.x > 10 + i * 120 && m.x < 125 + i * 120) g.pickT = k; });
        if (m.x > 500) this.sendWave(g);
      } else {
        const t = g.towers.find((t) => Math.hypot(t.x - m.x, t.y - m.y) < 16);
        if (t) { g.towers.splice(g.towers.indexOf(t), 1); g.gold += Math.floor(TOWERS[t.k].cost * 0.6); g.sfx('coin'); }
        else if (this.canBuild(g, m.x, m.y) && g.gold >= TOWERS[g.pickT].cost) { g.towers.push({ k: g.pickT, x: m.x, y: m.y, cd: 0, a: 0 }); g.gold -= TOWERS[g.pickT].cost; g.sfx('hit'); }
        else g.sfx('tick');
      }
    }
    if (g.pressed('Space')) this.sendWave(g);
    // spawn
    if (g.queue.length) { g.qT += dt; while (g.queue.length && g.queue[0].t <= g.qT) { const f = g.queue.shift(); g.foes.push({ ...f, max: f.hp, d: 0, slow: 0 }); } }
    for (const f of g.foes) {
      f.slow = Math.max(0, f.slow - dt);
      f.d += f.sp * (f.slow > 0 ? 0.5 : 1) * dt;
      [f.x, f.y] = this.at(g, f.d);
      if (f.d >= g.pathLen) { f.dead = true; g.lives -= f.big ? 5 : 1; g.sfx('hit'); }
    }
    for (const t of g.towers) {
      const T = TOWERS[t.k];
      t.cd -= dt;
      const tgt = g.foes.filter((f) => !f.dead && Math.hypot(f.x - t.x, f.y - t.y) < T.range).sort((a, b) => b.d - a.d)[0];
      if (tgt) { t.a = Math.atan2(tgt.y - t.y, tgt.x - t.x); if (t.cd <= 0) { t.cd = T.rate; g.shots.push({ x: t.x, y: t.y, tgt, k: t.k, sp: t.k === 'cannon' ? 260 : 420 }); } }
    }
    for (const s of g.shots) {
      const dx = s.tgt.x - s.x, dy = s.tgt.y - s.y, d = Math.hypot(dx, dy), st = s.sp * dt;
      if (d < st || s.tgt.dead) {
        s.done = true;
        if (s.tgt.dead) continue;
        const T = TOWERS[s.k];
        const hit = (f, dmg) => { f.hp -= dmg; if (T.slow) f.slow = T.slow; if (f.hp <= 0 && !f.dead) { f.dead = true; g.gold += f.bounty; g.addScore(f.bounty * 10); g.fx.push({ x: f.x, y: f.y, t: 0.6, s: '+' + f.bounty }); } };
        if (T.splash) { g.foes.forEach((f) => { if (!f.dead && Math.hypot(f.x - s.tgt.x, f.y - s.tgt.y) < T.splash) hit(f, T.dmg); }); g.fx.push({ x: s.tgt.x, y: s.tgt.y, t: 0.3, boom: true }); g.sfx('explode'); }
        else hit(s.tgt, T.dmg);
      } else { s.x += dx / d * st; s.y += dy / d * st; }
    }
    g.shots = g.shots.filter((s) => !s.done);
    g.foes = g.foes.filter((f) => !f.dead);
    for (const f of g.fx) { f.t -= dt; f.y -= 20 * dt; }
    g.fx = g.fx.filter((f) => f.t > 0);
    if (g.lives <= 0) { g.lives = 0; g.over('Castle Lost!', 'You survived ' + (g.wave - 1) + ' waves'); return; }
    if (g.waveOn && !g.queue.length && !g.foes.length) {
      g.waveOn = false; g.gold += 25 + g.wave * 5; g.sfx('win');
      if (g.wave >= 15) { g.addScore(g.lives * 100); g.over('Victory!', 'The castle is safe! Lives left: ' + g.lives, true); }
    }
  },

  demo(g) {
    g.towers = [{ k: 'arrow', x: 200, y: 180, a: 0.5 }, { k: 'cannon', x: 410, y: 180, a: 2 }, { k: 'frost', x: 420, y: 380, a: 3 }, { k: 'arrow', x: 80, y: 170, a: -0.4 }, { k: 'arrow', x: 580, y: 250, a: 2.6 }];
    g.foes = [80, 150, 230, 330, 420, 560].map((d, i) => { const [x, y] = this.at(g, d); return { x, y, d, hp: 30 - i * 3, max: 40, big: i === 3, slow: i === 4 ? 1 : 0 }; });
    g.shots = [{ x: 260, y: 220, tgt: g.foes[2], k: 'arrow' }]; g.wave = 6; g.gold = 240; g.score = 3120;
  },

  draw(g, ctx) {
    ctx.fillStyle = '#5ab83a'; ctx.fillRect(0, 0, g.W, g.H);
    for (let i = 0; i < 90; i++) { ctx.fillStyle = i % 3 ? 'rgba(0,80,0,.12)' : 'rgba(255,255,255,.08)'; ctx.fillRect((i * 97) % 640, (i * 57) % 440, 5, 3); }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#a8804a'; ctx.lineWidth = 40; ctx.beginPath(); PATH.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    ctx.strokeStyle = '#d8b07a'; ctx.lineWidth = 32; ctx.stroke();
    // castle
    ctx.fillStyle = '#9a9aaa'; ctx.fillRect(560, 360, 70, 70);
    for (let i = 0; i < 4; i++) ctx.fillRect(560 + i * 20, 350, 12, 12);
    ctx.fillStyle = '#5a3a1a'; ctx.beginPath(); ctx.arc(595, 430, 14, Math.PI, 0); ctx.fill(); ctx.fillRect(581, 430, 28, 1);
    ctx.fillStyle = '#e82a2a'; ctx.fillRect(595, 322, 2, 30); ctx.beginPath(); ctx.moveTo(597, 322); ctx.lineTo(615, 328); ctx.lineTo(597, 334); ctx.fill();
    // build preview
    const m = g.mouse;
    if (g.state === 'play' && m.y < 446 && m.y > 0) {
      const ok = this.canBuild(g, m.x, m.y) && g.gold >= TOWERS[g.pickT].cost;
      ctx.fillStyle = ok ? 'rgba(255,255,255,.18)' : 'rgba(255,0,0,.15)'; ctx.beginPath(); ctx.arc(m.x, m.y, TOWERS[g.pickT].range, 0, 7); ctx.fill();
    }
    for (const t of g.towers) {
      const T = TOWERS[t.k];
      ctx.fillStyle = '#6a6a6a'; ctx.beginPath(); ctx.arc(t.x, t.y, 15, 0, 7); ctx.fill();
      ctx.fillStyle = T.color; ctx.beginPath(); ctx.arc(t.x, t.y, 11, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.a);
      ctx.fillStyle = t.k === 'cannon' ? '#222' : '#ddd'; ctx.fillRect(0, -3, 16, 6);
      ctx.restore();
    }
    for (const f of g.foes) {
      const r = f.big ? 15 : 9;
      ctx.fillStyle = f.big ? '#7a2a8a' : f.fast ? '#d8a02a' : '#3a8a3a';
      ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 7); ctx.fill();
      if (f.slow > 0) { ctx.strokeStyle = '#bfeaff'; ctx.lineWidth = 3; ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x - r / 3, f.y - r / 4, r / 4, 0, 7); ctx.arc(f.x + r / 3, f.y - r / 4, r / 4, 0, 7); ctx.fill();
      ctx.fillStyle = '#c00'; ctx.beginPath(); ctx.arc(f.x - r / 3, f.y - r / 4, r / 8, 0, 7); ctx.arc(f.x + r / 3, f.y - r / 4, r / 8, 0, 7); ctx.fill();
      ctx.fillStyle = '#300'; ctx.fillRect(f.x - 12, f.y - r - 7, 24, 4); ctx.fillStyle = '#4ad84a'; ctx.fillRect(f.x - 12, f.y - r - 7, 24 * Math.max(0, f.hp / f.max), 4);
    }
    for (const s of g.shots) { ctx.fillStyle = TOWERS[s.k].shot; ctx.beginPath(); ctx.arc(s.x, s.y, s.k === 'cannon' ? 5 : 3, 0, 7); ctx.fill(); }
    for (const f of g.fx) {
      if (f.boom) { ctx.fillStyle = 'rgba(255,160,40,' + f.t * 2.5 + ')'; ctx.beginPath(); ctx.arc(f.x, f.y, 40 * (1 - f.t), 0, 7); ctx.fill(); }
      else g.text(f.s, f.x, f.y - 14, 14, '#ffe45a', '#000');
    }
    // HUD
    ctx.fillStyle = 'rgba(0,0,0,.55)'; g.roundRect(8, 6, 400, 28, 8); ctx.fill();
    g.text('Gold: ' + g.gold + '   Lives: ' + g.lives + '   Wave: ' + g.wave + '/15   Score: ' + g.score, 18, 20, 16, '#fff', null, 'left');
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(0, 446, 640, 34);
    Object.keys(TOWERS).forEach((k, i) => {
      const T = TOWERS[k], x = 10 + i * 120, on = g.pickT === k;
      ctx.fillStyle = on ? '#ffd24a' : '#6a5a4a'; g.roundRect(x, 450, 115, 26, 6); ctx.fill();
      ctx.fillStyle = T.color; ctx.beginPath(); ctx.arc(x + 14, 463, 8, 0, 7); ctx.fill();
      g.text(T.name + ' ' + T.cost + 'g', x + 26, 463, 14, on ? '#3a2000' : '#fff', null, 'left');
    });
    g.button(500, 449, 130, 28, g.waveOn ? 'Wave ' + g.wave : 'Send Wave', g.waveOn ? ['#aaa', '#888', '#666'] : undefined);
  },
});
