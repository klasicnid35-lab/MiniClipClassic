// Type Attack - type the falling words before they land
const WORDS = ('game play jump race ball goal star moon rock fish frog bird snow rain wind fire gold ship tank bike kite drum fox owl cat dog cake pizza apple mango lemon ninja robot pirate dragon castle rocket planet laser magic comet storm tiger panda koala zebra puzzle bonus combo level score speed turbo pixel arcade joystick keyboard monster treasure galaxy volcano penguin dinosaur skateboard adventure champion').split(' ');

MCC.game({
  id: 'type-attack',
  title: 'Type Attack',
  width: 640, height: 480,
  noPause: true,
  noKeyStart: true,
  noMuteKey: true,
  instructions: ['Words are falling towards the city!', 'Type a word to lock on and blast it - you do not need to press ENTER.', 'Five words reaching the ground ends the game. Backspace clears your typing.'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) { g.words = []; g.typed = ''; g.spawn = 1; g.lives = 5; g.lasers = []; g.booms = []; g.done = 0; },

  keydown(g, e) {
    if (g.state !== 'play') return;
    if (e.key === 'Backspace') { g.typed = g.typed.slice(0, -1); e.preventDefault(); return; }
    if (e.key === 'Escape') { g.typed = ''; return; }
    if (e.key.length === 1 && /[a-z]/i.test(e.key)) {
      const t = g.typed + e.key.toLowerCase();
      if (g.words.some((w) => w.s.startsWith(t))) { g.typed = t; g.sfx('tick'); }
      else { g.sfx('hit'); g.miss = 0.2; }
      const hit = g.words.find((w) => w.s === g.typed);
      if (hit) {
        hit.dead = true; g.done++; g.addScore(hit.s.length * 10);
        g.lasers.push({ x: hit.x, y: hit.y, t: 0.2 }); g.booms.push({ x: hit.x, y: hit.y, t: 0.5 }); g.typed = ''; g.sfx('explode');
      }
    }
  },

  update(g, dt) {
    g.spawn -= dt;
    const lvl = 1 + Math.floor(g.done / 8);
    if (g.spawn <= 0) {
      const pool = WORDS.filter((w) => w.length <= 3 + lvl * 1.5);
      let s; do { s = g.pick(pool); } while (g.words.some((w) => w.s[0] === s[0]) && Math.random() < 0.9);
      g.words.push({ s, x: g.rand(60, 580), y: 20, v: 22 + lvl * 6 + g.rand(0, 10) });
      g.spawn = Math.max(0.8, 2.6 - lvl * 0.2);
    }
    for (const w of g.words) { w.y += w.v * dt; if (w.y > 420 && !w.dead) { w.dead = true; g.lives--; g.sfx('lose'); g.booms.push({ x: w.x, y: 420, t: 0.5, bad: true }); if (g.typed && w.s.startsWith(g.typed)) g.typed = ''; } }
    g.words = g.words.filter((w) => !w.dead);
    if (g.typed && !g.words.some((w) => w.s.startsWith(g.typed))) g.typed = '';
    for (const l of g.lasers) l.t -= dt; g.lasers = g.lasers.filter((l) => l.t > 0);
    for (const b of g.booms) b.t -= dt; g.booms = g.booms.filter((b) => b.t > 0);
    if (g.miss > 0) g.miss -= dt;
    if (g.lives <= 0) g.over('City Destroyed!', g.done + ' words blasted');
  },

  demo(g) { g.words = [{ s: 'rocket', x: 150, y: 120 }, { s: 'penguin', x: 420, y: 200 }, { s: 'star', x: 300, y: 300 }, { s: 'galaxy', x: 520, y: 80 }]; g.typed = 'pen'; g.lasers = [{ x: 420, y: 200, t: 0.1 }]; g.score = 640; },

  draw(g, ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, g.H);
    sky.addColorStop(0, '#0a0a2a'); sky.addColorStop(1, '#3a1a5a');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, g.W, g.H);
    for (let i = 0; i < 50; i++) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect((i * 131) % 640, (i * 71) % 380, 2, 2); }
    // city
    for (let i = 0; i < 16; i++) { const h = 30 + ((i * 37) % 50); ctx.fillStyle = '#1a1a3a'; ctx.fillRect(i * 40, 440 - h, 36, h + 40); ctx.fillStyle = '#ffd86a'; for (let y = 440 - h + 8; y < 440; y += 14) if ((i + y) % 3) ctx.fillRect(i * 40 + 8, y, 6, 6); }
    ctx.fillStyle = '#2a2a4a'; ctx.fillRect(0, 440, 640, 40);
    // cannon
    ctx.fillStyle = '#5ab4ff'; g.roundRect(300, 430, 40, 20, 6); ctx.fill();
    for (const l of g.lasers) { ctx.strokeStyle = 'rgba(120,230,255,' + l.t * 5 + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(320, 430); ctx.lineTo(l.x, l.y); ctx.stroke(); }
    for (const b of g.booms) { ctx.fillStyle = b.bad ? 'rgba(255,80,40,' + b.t * 2 + ')' : 'rgba(255,220,80,' + b.t * 2 + ')'; ctx.beginPath(); ctx.arc(b.x, b.y, 40 * (1 - b.t), 0, 7); ctx.fill(); }
    for (const w of g.words) {
      const lock = g.typed && w.s.startsWith(g.typed);
      ctx.fillStyle = '#c86a2a'; ctx.beginPath(); ctx.arc(w.x, w.y - 18, 10, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,140,40,.5)'; ctx.beginPath(); ctx.moveTo(w.x - 7, w.y - 24); ctx.lineTo(w.x, w.y - 50); ctx.lineTo(w.x + 7, w.y - 24); ctx.fill();
      ctx.font = '20px ' + g.FONT_UI; const tw = ctx.measureText(w.s).width;
      ctx.fillStyle = lock ? 'rgba(255,230,90,.25)' : 'rgba(0,0,0,.55)'; g.roundRect(w.x - tw / 2 - 6, w.y - 4, tw + 12, 24, 6); ctx.fill();
      if (lock) { g.text(g.typed, w.x - tw / 2, w.y + 9, 20, '#ffe45a', null, 'left'); g.text(w.s.slice(g.typed.length), w.x - tw / 2 + ctx.measureText(g.typed).width, w.y + 9, 20, '#fff', null, 'left'); }
      else g.text(w.s, w.x, w.y + 9, 20, '#fff', null);
    }
    ctx.fillStyle = g.miss > 0 ? 'rgba(255,60,60,.6)' : 'rgba(0,0,0,.5)'; g.roundRect(220, 392, 200, 30, 8); ctx.fill();
    g.text(g.typed || '_', 320, 408, 20, '#ffe45a', null);
    g.text('Score: ' + g.score, 12, 18, 18, '#fff', null, 'left');
    g.text('TYPE ATTACK', 320, 18, 20, '#5ab4ff', '#001a3a', 'center', g.FONT_TITLE);
    g.text('City: ' + '♥'.repeat(Math.max(0, g.lives)), 628, 18, 18, '#ff6a8a', null, 'right');
  },
});
