// Jumpin' Jack - tile platformer, 8 levels.
// # ground, = platform (jump through from below), ^ spikes, o coin, s slime, D door, P player
const LEVELS = [
  ['                    ', '                    ', '                    ', '                    ', '                    ', '                    ',
   '                    ', '          o o       ', '        ======      ', '   o o              ', '  =====         o  D', ' P            s  ###', '####################', '####################'],
  ['                    ', '                    ', '                    ', '                  D ', '        o o      ===', '       =====        ', '  o             o   ',
   ' ===    s     =====  ', '                    ', '    o o    o o      ', ' P ======  =====   o', '#####   ^^^   ######', '####################', '####################'],
  ['                    ', '                    ', ' o               o  ', '===      o o     ===', '        =====       ', '   o          o     ',
   '  ===    s   ===    ', '                    ', 'o     =====        D', '=           o    ===', ' P   s    ====      ', '####^^###      #####', '####################', '####################'],
  ['                    ', '                    ', '       o   o   o    ', '      === === ===   ', '  o                 ', ' ===             o  ',
   '       s    s   === ', '     =====  ====    ', ' o                  ', '===        o       D', ' P    o   ===    ###', '###  ###^^^^^^^^####', '####################', '####################'],
  ['                    ', '  o      D          ', ' ===    ===         ', '             o      ', '     o      ===     ',
   '    ===        o    ', '               ===  ', '   s     o   s      ', '  =====  =  =====   ', '                  o ', ' P   o o     o   ===', '####^^^^^###^^^#####', '####################', '####################'],
  ['                    ', '                    ', ' o  o  o  o  o  o D ', '=================== ', '                   =', '                    ',
   '   s    s    s    o ', '  ===  ===  ===  ===', '                    ', 'o   o    o    o     ', '==  ==  ===  ==   s ', ' P                ==', '######^^^^^^^^######', '####################'],
  ['D                   ', '==   o             o', '    ===   s   o  ===', '        =====  =    ', '  o                 ',
   ' ===   o     s      ', '      ===  =====  o ', '   s            === ', '  ====   o          ', '        ===    o    ', ' P  o         ===   ', '####^^^^##^^^^^^^^##', '####################', '####################'],
  ['                   D', '   o  o  o  o    ===', '  ============       ', '                 o  ', '   s   s   s    === ',
   ' =================  ', '                    ', 'o    o    o    o    ', '===  ===  ===  ===  ', '   s    s    s    o ', ' P                ==', '###^^^^^^^^^^^^^^^##', '####################', '####################'],
];
const T = 32, W = 20, HH = 14, GRAV = 1500, SPEED = 190, JUMP = 560;

MCC.game({
  id: 'jumpin-jack',
  title: "Jumpin' Jack",
  width: 640, height: 480,
  scored: false,
  instructions: ['LEFT / RIGHT to run, UP or SPACE to jump.', 'Collect every coin to open the door, then walk into it.', 'Jump on slimes to squash them. Watch out for spikes!'],

  init(g) { g.lvl = 0; this.load(g); g.state = 'title'; },
  start(g) { if (g.allDone) g.lvl = 0; g.allDone = false; g.lives = 3; g.total = 0; this.load(g); },

  load(g) {
    const L = LEVELS[g.lvl];
    const rows = L.slice(); while (rows.length < HH) rows.unshift('');
    g.map = rows.map((r) => r.padEnd(W, ' ').slice(0, W).split(''));
    g.coins = []; g.slimes = [];
    g.map.forEach((row, y) => row.forEach((c, x) => {
      if (c === 'o') { g.coins.push({ x: x * T + 16, y: y * T + 16 }); row[x] = ' '; }
      if (c === 's') { g.slimes.push({ x: x * T + 16, y: y * T + 32, vx: 50, alive: true }); row[x] = ' '; }
      if (c === 'P') { g.start = { x: x * T + 16, y: y * T + 32 }; row[x] = ' '; }
      if (c === 'D') { g.door = { x: x * T + 16, y: y * T + 32 }; row[x] = ' '; }
    }));
    g.p = { x: g.start.x, y: g.start.y, vx: 0, vy: 0, ground: false, face: 1, run: 0, inv: 1 };
    g.lives = g.lives == null ? 3 : g.lives; g.msg = null;
  },

  tile(g, x, y) { const tx = Math.floor(x / T), ty = Math.floor(y / T); if (tx < 0 || tx >= W) return '#'; if (ty < 0 || ty >= HH) return ' '; return g.map[ty][tx]; },

  die(g) {
    g.lives--; g.sfx('lose');
    if (g.lives <= 0) { g.over('Game Over', 'You reached level ' + (g.lvl + 1)); return; }
    const keepCoins = g.coins; this.load(g); g.coins = keepCoins;
  },

  update(g, dt) {
    const p = g.p;
    if (g.msg) { g.msg.t -= dt; if (g.msg.t <= 0) { g.msg = null; if (g.nextLvl) { g.nextLvl = false; g.lvl++; this.load(g); } } return; }
    p.inv -= dt;
    const dir = (g.anyDown('ArrowRight', 'KeyD') ? 1 : 0) - (g.anyDown('ArrowLeft', 'KeyA') ? 1 : 0);
    p.vx += (dir * SPEED - p.vx) * Math.min(1, dt * (p.ground ? 14 : 6));
    if (dir) p.face = dir;
    if (g.anyPressed('ArrowUp', 'KeyW', 'Space') && p.ground) { p.vy = -JUMP; p.ground = false; g.sfx('jump'); }
    if (!g.anyDown('ArrowUp', 'KeyW', 'Space') && p.vy < -200) p.vy = -200;
    p.vy = Math.min(900, p.vy + GRAV * dt);
    // horizontal
    p.x += p.vx * dt;
    for (const yy of [p.y - 4, p.y - 26]) {
      if (this.tile(g, p.x + 10, yy) === '#') p.x = Math.floor((p.x + 10) / T) * T - 10.01;
      if (this.tile(g, p.x - 10, yy) === '#') p.x = Math.floor((p.x - 10) / T + 1) * T + 10.01;
    }
    // vertical
    const oy = p.y;
    p.y += p.vy * dt;
    p.ground = false;
    for (const xx of [p.x - 9, p.x + 9]) {
      const t = this.tile(g, xx, p.y);
      const topY = Math.floor(p.y / T) * T;
      if (p.vy >= 0 && (t === '#' || (t === '=' && oy <= topY + 1)) ) { p.y = topY; p.vy = 0; p.ground = true; }
      if (p.vy < 0 && this.tile(g, xx, p.y - 28) === '#') { p.y = Math.floor((p.y - 28) / T + 1) * T + 28; p.vy = 0; }
    }
    if (p.ground) p.run += Math.abs(p.vx) * dt / 12;
    if (this.tile(g, p.x, p.y - 4) === '^' || p.y > HH * T + 40) { this.die(g); return; }
    for (const c of g.coins) if (!c.got && Math.hypot(c.x - p.x, c.y - (p.y - 16)) < 20) { c.got = true; g.sfx('coin'); }
    for (const s of g.slimes) {
      if (!s.alive) continue;
      s.x += s.vx * dt;
      const ahead = s.x + Math.sign(s.vx) * 14;
      if (this.tile(g, ahead, s.y - 8) === '#' || !'#='.includes(this.tile(g, ahead, s.y + 4))) s.vx = -s.vx;
      if (Math.abs(s.x - p.x) < 22 && Math.abs(s.y - p.y) < 26) {
        if (p.vy > 0 && p.y < s.y - 8) { s.alive = false; p.vy = -380; g.sfx('pop'); }
        else if (p.inv <= 0) { this.die(g); return; }
      }
    }
    const allCoins = g.coins.every((c) => c.got);
    if (allCoins && Math.abs(p.x - g.door.x) < 18 && Math.abs(p.y - g.door.y) < 20) {
      g.sfx('win');
      if (g.lvl >= LEVELS.length - 1) { g.allDone = true; g.over('You Did It!', 'All ' + LEVELS.length + ' levels complete!', true); return; }
      g.msg = { s: 'Level ' + (g.lvl + 1) + ' complete!', t: 1.5 }; g.nextLvl = true;
    }
  },

  demo(g) { g.lvl = 1; this.load(g); Object.assign(g.p, { x: 150, y: 250, vy: -100, face: 1, inv: 0 }); g.coins[0].got = true; },

  draw(g, ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, g.H);
    sky.addColorStop(0, '#6ac8ff'); sky.addColorStop(1, '#c8f0ff');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, g.W, g.H);
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    for (const [x, y] of [[80, 60], [330, 40], [520, 90]]) { ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.arc(x + 18, y - 6, 20, 0, 7); ctx.arc(x + 38, y, 16, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#7ad07a'; ctx.beginPath(); ctx.arc(120, 520, 180, 0, 7); ctx.arc(480, 540, 200, 0, 7); ctx.fill();
    const oy = g.H - HH * T;
    ctx.save(); ctx.translate(0, oy);
    g.map.forEach((row, y) => row.forEach((c, x) => {
      const X = x * T, Y = y * T;
      if (c === '#') {
        const top = y === 0 || g.map[y - 1][x] !== '#';
        ctx.fillStyle = '#9a6a3a'; ctx.fillRect(X, Y, T, T);
        ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(X + 4, Y + 10, 6, 5); ctx.fillRect(X + 18, Y + 20, 7, 5);
        if (top) { ctx.fillStyle = '#4ac83a'; ctx.fillRect(X, Y, T, 9); ctx.fillStyle = '#6ae85a'; ctx.fillRect(X, Y, T, 3); }
      } else if (c === '=') {
        ctx.fillStyle = '#c8904a'; g.roundRect(X, Y, T, 12, 4); ctx.fill();
        ctx.fillStyle = '#e8b06a'; ctx.fillRect(X + 2, Y + 2, T - 4, 3);
      } else if (c === '^') {
        ctx.fillStyle = '#ccc';
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(X + k * 8, Y + T); ctx.lineTo(X + k * 8 + 4, Y + 14); ctx.lineTo(X + k * 8 + 8, Y + T); ctx.fill(); }
      }
    }));
    const open = g.coins.every((c) => c.got);
    ctx.fillStyle = '#6a3a1a'; g.roundRect(g.door.x - 14, g.door.y - 40, 28, 40, 12); ctx.fill();
    ctx.fillStyle = open ? '#ffe45a' : '#3a1a0a'; g.roundRect(g.door.x - 10, g.door.y - 36, 20, 36, 9); ctx.fill();
    for (const c of g.coins) if (!c.got) { ctx.fillStyle = '#ffd83a'; ctx.beginPath(); ctx.ellipse(c.x, c.y, 3 + 6 * Math.abs(Math.cos(g.frame * 0.08 + c.x)), 9, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#c88a00'; ctx.lineWidth = 2; ctx.stroke(); }
    for (const s of g.slimes) if (s.alive) {
      const sq = 1 + Math.sin(g.frame * 0.2 + s.x) * 0.08;
      ctx.fillStyle = '#a03ae8'; ctx.beginPath(); ctx.ellipse(s.x, s.y - 11 * sq, 15 / sq, 11 * sq, 0, Math.PI, 0); ctx.lineTo(s.x + 15, s.y); ctx.lineTo(s.x - 15, s.y); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x - 5, s.y - 12, 3.5, 0, 7); ctx.arc(s.x + 5, s.y - 12, 3.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(s.x - 5 + Math.sign(s.vx), s.y - 12, 1.8, 0, 7); ctx.arc(s.x + 5 + Math.sign(s.vx), s.y - 12, 1.8, 0, 7); ctx.fill();
    }
    const p = g.p;
    if (p.inv <= 0 || Math.floor(p.inv * 12) % 2) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.face, 1);
      const leg = p.ground && Math.abs(p.vx) > 20 ? Math.sin(p.run) * 6 : 0;
      ctx.fillStyle = '#2a4ab8'; ctx.fillRect(-7 + leg, -10, 6, 10); ctx.fillRect(1 - leg, -10, 6, 10);
      ctx.fillStyle = '#e8302a'; g.roundRect(-9, -24, 18, 16, 4); ctx.fill();
      ctx.fillStyle = '#ffd2a6'; ctx.beginPath(); ctx.arc(0, -30, 9, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8302a'; ctx.beginPath(); ctx.arc(0, -33, 9, Math.PI, 0); ctx.fill(); ctx.fillRect(0, -35, 13, 4);
      ctx.fillStyle = '#000'; ctx.fillRect(3, -31, 3, 3);
      ctx.restore();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.45)'; g.roundRect(8, 6, 330, 28, 8); ctx.fill();
    g.text('Level ' + (g.lvl + 1) + '/8   Coins ' + g.coins.filter((c) => c.got).length + '/' + g.coins.length + '   Lives ' + g.lives, 18, 20, 16, '#fff', null, 'left');
    if (g.msg) g.text(g.msg.s, 320, 200, 40, '#ffe45a', '#5a2a00', 'center', g.FONT_TITLE);
  },
});
