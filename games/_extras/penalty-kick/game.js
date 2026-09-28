// Penalty Kick - pick a spot and beat the keeper
const GOAL = { x: 150, y: 90, w: 340, h: 150 };

MCC.game({
  id: 'penalty-kick',
  title: 'Penalty Kick',
  width: 640, height: 480,
  instructions: ['Click inside the goal to aim your shot.', 'Corners are harder to save - but aim too close and you might miss!', 'Score as many goals as you can from 10 penalties.'],

  init(g) { this.start(g); g.state = 'title'; },

  start(g) { g.taken = 0; g.results = []; this.reset(g); },

  reset(g) { g.ball = { x: 320, y: 410, s: 1 }; g.shot = null; g.keeper = { x: 320, y: 200, dive: 0, dir: 0, tx: 320, ty: 200 }; g.msg = null; g.wait = 0; },

  update(g, dt) {
    if (g.wait > 0) {
      g.wait -= dt;
      if (g.wait <= 0) {
        if (g.taken >= 10) { g.over('Full Time!', 'You scored ' + g.score + ' out of 10', g.score >= 7); return; }
        this.reset(g);
      }
    }
    if (!g.shot && g.mouse.clicked && g.mouse.y < 300 && !g.wait) {
      const tx = g.mouse.x + g.rand(-12, 12), ty = g.mouse.y + g.rand(-10, 10);
      g.shot = { tx, ty, t: 0 };
      // keeper guesses: better at central shots, may read the shot
      const k = g.keeper;
      const guessRight = Math.random() < 0.45;
      k.tx = guessRight ? tx : 320 + g.rand(-160, 160);
      k.ty = guessRight ? ty : g.rand(130, 230);
      k.dir = Math.sign(k.tx - 320);
      g.sfx('hit');
    }
    if (g.shot) {
      const s = g.shot, b = g.ball, k = g.keeper;
      s.t += dt * 1.9;
      const t = Math.min(1, s.t);
      b.x = 320 + (s.tx - 320) * t; b.y = 410 + (s.ty - 410) * t - Math.sin(t * Math.PI) * 30; b.s = 1 - t * 0.55;
      k.dive = Math.min(1, s.t * 1.6);
      k.x = 320 + (k.tx - 320) * k.dive; k.y = 200 + (k.ty - 200) * k.dive;
      if (s.t >= 1 && !s.done) {
        s.done = true;
        const inGoal = s.tx > GOAL.x + 6 && s.tx < GOAL.x + GOAL.w - 6 && s.ty > GOAL.y + 6 && s.ty < GOAL.y + GOAL.h;
        const saved = Math.hypot(k.x - s.tx, (k.y - s.ty) * 1.4) < 52;
        let r;
        if (!inGoal) r = 'MISSED!';
        else if (saved) r = 'SAVED!';
        else { r = 'GOAL!'; g.addScore(1); }
        g.results.push(r === 'GOAL!');
        g.taken++;
        g.msg = r; g.sfx(r === 'GOAL!' ? 'win' : 'lose'); g.wait = 1.6;
      }
    }
  },

  demo(g) { g.shot = { tx: 460, ty: 120, t: 0.8, done: true }; g.ball = { x: 432, y: 150, s: 0.56 }; g.keeper = { x: 250, y: 190, dive: 0.7, dir: -1, tx: 220, ty: 180 }; g.results = [true, true, false, true, true]; g.taken = 5; g.score = 4; },

  draw(g, ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, 100);
    sky.addColorStop(0, '#3a6ab8'); sky.addColorStop(1, '#8ab8e8');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, g.W, 100);
    for (let i = 0; i < 200; i++) { ctx.fillStyle = ['#e84a3a', '#fff', '#3a6ae8', '#ffd83a'][i % 4]; ctx.fillRect((i * 29) % 640, 20 + ((i * 7) % 6) * 10, 5, 6); }
    const grass = ctx.createLinearGradient(0, 80, 0, g.H);
    grass.addColorStop(0, '#3a9a2a'); grass.addColorStop(1, '#5ac83a');
    ctx.fillStyle = grass; ctx.fillRect(0, 80, g.W, g.H);
    for (let i = 0; i < 8; i++) { ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(0, 80 + i * 50, 640, 25); }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(40, 240); ctx.lineTo(600, 240); ctx.moveTo(90, 240); ctx.lineTo(40, 330); ctx.lineTo(600, 330); ctx.lineTo(550, 240); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(320, 410, 5, 3, 0, 0, 7); ctx.fill();
    // net
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1;
    for (let x = GOAL.x; x <= GOAL.x + GOAL.w; x += 12) { ctx.beginPath(); ctx.moveTo(x, GOAL.y); ctx.lineTo(x, GOAL.y + GOAL.h); ctx.stroke(); }
    for (let y = GOAL.y; y <= GOAL.y + GOAL.h; y += 12) { ctx.beginPath(); ctx.moveTo(GOAL.x, y); ctx.lineTo(GOAL.x + GOAL.w, y); ctx.stroke(); }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(GOAL.x, GOAL.y + GOAL.h); ctx.lineTo(GOAL.x, GOAL.y); ctx.lineTo(GOAL.x + GOAL.w, GOAL.y); ctx.lineTo(GOAL.x + GOAL.w, GOAL.y + GOAL.h); ctx.stroke();
    // keeper
    const k = g.keeper;
    ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.dir * k.dive * 1.1);
    ctx.fillStyle = '#ffd83a'; g.roundRect(-18, -20, 36, 44, 8); ctx.fill();
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-16, 20, 32, 14);
    ctx.fillStyle = '#ffd2a6'; ctx.beginPath(); ctx.arc(0, -32, 13, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a3a1a'; ctx.beginPath(); ctx.arc(0, -36, 13, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#ffd83a'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-16, -14); ctx.lineTo(-34, -40 + k.dive * 10); ctx.moveTo(16, -14); ctx.lineTo(34, -40 + k.dive * 10); ctx.stroke();
    ctx.fillStyle = '#3ad83a'; ctx.beginPath(); ctx.arc(-36, -44 + k.dive * 10, 7, 0, 7); ctx.arc(36, -44 + k.dive * 10, 7, 0, 7); ctx.fill();
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-8, 34); ctx.lineTo(-10, 56); ctx.moveTo(8, 34); ctx.lineTo(10, 56); ctx.stroke();
    ctx.restore();
    // ball
    const b = g.ball, r = 16 * b.s;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(b.x, b.y + r, r, r / 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 7); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    for (const [dx, dy] of [[0, 0], [-0.6, -0.5], [0.6, -0.5], [-0.5, 0.6], [0.5, 0.6]]) { ctx.beginPath(); ctx.arc(b.x + dx * r, b.y + dy * r, r * 0.25, 0, 7); ctx.fill(); }
    if (!g.shot && g.state === 'play') g.text('Click in the goal to shoot!', 320, 280, 20, '#fff', '#000');
    // results strip
    ctx.fillStyle = 'rgba(0,0,0,.5)'; g.roundRect(170, 442, 300, 30, 8); ctx.fill();
    for (let i = 0; i < 10; i++) { ctx.fillStyle = i < g.results.length ? (g.results[i] ? '#4ad84a' : '#ff4a4a') : 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.arc(196 + i * 28, 457, 9, 0, 7); ctx.fill(); }
    g.text('Goals: ' + g.score, 20, 457, 20, '#fff', '#000', 'left');
    if (g.msg) g.text(g.msg, 320, 290, 54, g.msg === 'GOAL!' ? '#ffe45a' : '#ff8a8a', '#5a0000', 'center', g.FONT_TITLE);
  },
});
