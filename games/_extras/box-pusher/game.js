// Box Pusher - warehouse puzzle. # wall, . goal, $ box, * box on goal, @ player, + player on goal
const LEVELS = [
  ['########', '#      #', '# @ $ .#', '#      #', '########'],
  ['#######', '#.  . #', '# $$  #', '#  @  #', '#######'],
  ['  #####', '  #   #', '###$# #', '#  .  #', '# #.$ #', '#  @###', '#####'],
  [' #######', ' #.   .#', '##$###$##', '#   @   #', '#.$ # $.#', '#   #   #', '#########'],
  ['#######', '#. $ .#', '# $@$ #', '#. $ .#', '#######'],
  ['########', '#  .   #', '# #$##.#', '#   $@ #', '###  # #', '  #    #', '  ######'],
  ['#########', '#   #   #', '# $   $ #', '#.# @ #.#', '#   $   #', '#  .#   #', '#########'],
  ['  #####', '###   #', '#   $ #', '# #.$.#', '#  $  #', '## .@##', ' #####'],
  ['########', '#.  #  #', '# $  $ #', '#  ##. #', '## @ $ #', ' #.    #', ' #######'],
  ['##########', '#   ..   #', '# $$##$$ #', '#   ..   #', '###  @ ###', '  ######'],
];

MCC.game({
  id: 'box-pusher',
  title: 'Box Pusher',
  width: 640, height: 480,
  scored: false,
  instructions: ['Push every box onto a target square.', 'ARROW keys to move (swipe on touch screens).', 'R restarts the level, U undoes a move.'],

  init(g) { g.levelIdx = 0; this.load(g); g.state = 'title'; },

  start(g) { g.levelIdx = 0; this.load(g); },

  load(g) {
    const rows = LEVELS[g.levelIdx];
    g.walls = new Set(); g.goals = new Set(); g.boxes = new Set(); g.floor = new Set();
    g.w = Math.max(...rows.map((r) => r.length)); g.h = rows.length;
    rows.forEach((r, y) => [...r].forEach((ch, x) => {
      const k = x + ',' + y;
      if (ch === '#') g.walls.add(k);
      if ('.*+'.includes(ch)) g.goals.add(k);
      if ('$*'.includes(ch)) g.boxes.add(k);
      if ('@+'.includes(ch)) g.p = { x, y };
    }));
    // flood floor from player to know what to paint
    const st = [[g.p.x, g.p.y]];
    while (st.length) { const [x, y] = st.pop(); const k = x + ',' + y; if (g.floor.has(k) || g.walls.has(k) || x < 0 || y < 0 || x >= g.w || y >= g.h) continue; g.floor.add(k); st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
    g.moves = 0; g.hist = []; g.done = 0;
    g.S = Math.min(48, Math.floor(Math.min(600 / g.w, 380 / g.h)));
  },

  step(g, dx, dy) {
    const nx = g.p.x + dx, ny = g.p.y + dy, k = nx + ',' + ny;
    if (g.walls.has(k)) return;
    if (g.boxes.has(k)) {
      const k2 = (nx + dx) + ',' + (ny + dy);
      if (g.walls.has(k2) || g.boxes.has(k2)) return;
      g.hist.push({ p: { ...g.p }, boxes: new Set(g.boxes) });
      g.boxes.delete(k); g.boxes.add(k2);
      g.sfx(g.goals.has(k2) ? 'coin' : 'blip');
    } else { g.hist.push({ p: { ...g.p }, boxes: new Set(g.boxes) }); g.sfx('tick'); }
    g.p = { x: nx, y: ny }; g.moves++;
    if ([...g.boxes].every((b) => g.goals.has(b))) { g.done = 1.2; g.sfx('win'); }
  },

  update(g, dt) {
    if (g.done > 0) {
      g.done -= dt;
      if (g.done <= 0) {
        g.levelIdx++;
        try { localStorage.setItem('mcc.boxpusher.level', String(Math.max(g.levelIdx, +localStorage.getItem('mcc.boxpusher.level') || 0))); } catch (e) {}
        if (g.levelIdx >= LEVELS.length) { g.over('All Done!', 'You solved all ' + LEVELS.length + ' levels!', true); return; }
        this.load(g);
      }
      return;
    }
    if (g.anyPressed('ArrowLeft', 'KeyA')) this.step(g, -1, 0);
    if (g.anyPressed('ArrowRight', 'KeyD')) this.step(g, 1, 0);
    if (g.anyPressed('ArrowUp', 'KeyW')) this.step(g, 0, -1);
    if (g.anyPressed('ArrowDown', 'KeyS')) this.step(g, 0, 1);
    if (g.pressed('KeyR')) this.load(g);
    if (g.pressed('KeyU') && g.hist.length) { const h = g.hist.pop(); g.p = h.p; g.boxes = h.boxes; g.moves--; }
    // on-screen buttons
    if (g.mouse.clicked) {
      if (g.mouse.y > 440 && g.mouse.x > 440 && g.mouse.x < 530) this.load(g);
      if (g.mouse.y > 440 && g.mouse.x > 540 && g.mouse.x < 630 && g.hist.length) { const h = g.hist.pop(); g.p = h.p; g.boxes = h.boxes; g.moves--; }
    }
  },

  demo(g) { g.levelIdx = 1; this.load(g); this.step(g, 1, 0); },

  draw(g, ctx) {
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(0, 0, g.W, g.H);
    for (let y = 0; y < g.H; y += 20) for (let x = (y / 20) % 2 * 20; x < g.W; x += 40) { ctx.fillStyle = 'rgba(255,255,255,.03)'; ctx.fillRect(x, y, 20, 20); }
    const S = g.S, ox = Math.floor((g.W - g.w * S) / 2), oy = 50 + Math.floor((380 - g.h * S) / 2);
    for (const k of g.floor) { const [x, y] = k.split(',').map(Number); ctx.fillStyle = (x + y) % 2 ? '#c9b48a' : '#d4c096'; ctx.fillRect(ox + x * S, oy + y * S, S, S); }
    for (const k of g.walls) {
      const [x, y] = k.split(',').map(Number), X = ox + x * S, Y = oy + y * S;
      ctx.fillStyle = '#8a3a2a'; ctx.fillRect(X, Y, S, S);
      ctx.fillStyle = '#b8543a';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) ctx.fillRect(X + 1 + c * S / 2 + (r % 2 ? S / 4 : 0) - (r % 2 && c ? S / 2 : 0), Y + 1 + r * S / 3, S / 2 - 2, S / 3 - 2);
    }
    for (const k of g.goals) { const [x, y] = k.split(',').map(Number); ctx.strokeStyle = '#e82a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ox + x * S + S / 2, oy + y * S + S / 2, S / 5, 0, 7); ctx.stroke(); }
    for (const k of g.boxes) {
      const [x, y] = k.split(',').map(Number), X = ox + x * S + 3, Y = oy + y * S + 3, on = g.goals.has(k);
      ctx.fillStyle = on ? '#4ac84a' : '#e8a23a'; ctx.fillRect(X, Y, S - 6, S - 6);
      ctx.strokeStyle = on ? '#1a6a1a' : '#8a5a1a'; ctx.lineWidth = 3; ctx.strokeRect(X + 1.5, Y + 1.5, S - 9, S - 9);
      ctx.beginPath(); ctx.moveTo(X + 3, Y + 3); ctx.lineTo(X + S - 9, Y + S - 9); ctx.moveTo(X + S - 9, Y + 3); ctx.lineTo(X + 3, Y + S - 9); ctx.stroke();
    }
    // worker
    const X = ox + g.p.x * S + S / 2, Y = oy + g.p.y * S + S / 2;
    ctx.fillStyle = '#2a6ad8'; g.roundRect(X - S * 0.28, Y - S * 0.05, S * 0.56, S * 0.42, 6); ctx.fill();
    ctx.fillStyle = '#ffd2a6'; ctx.beginPath(); ctx.arc(X, Y - S * 0.15, S * 0.22, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd83a'; ctx.beginPath(); ctx.arc(X, Y - S * 0.22, S * 0.23, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#000'; ctx.fillRect(X - 5, Y - S * 0.15, 3, 3); ctx.fillRect(X + 3, Y - S * 0.15, 3, 3);
    g.text('BOX PUSHER', 20, 26, 28, '#ffd83a', '#5a2a00', 'left', g.FONT_TITLE);
    g.text('Level ' + (g.levelIdx + 1) + ' / ' + LEVELS.length, 420, 26, 20, '#fff', null);
    g.text('Moves: ' + g.moves, 560, 26, 20, '#fff', null);
    g.button(440, 444, 90, 30, 'Restart', ['#8fd0ff', '#3a8de0', '#1a5ab0']);
    g.button(540, 444, 90, 30, 'Undo', ['#8fd0ff', '#3a8de0', '#1a5ab0']);
    if (g.done > 0) g.text('Level Complete!', 320, 240, 44, '#8dff6a', '#1a4a00', 'center', g.FONT_TITLE);
  },
});
