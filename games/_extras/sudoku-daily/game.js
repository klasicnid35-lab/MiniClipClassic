// Sudoku Daily - a new, uniquely solvable puzzle generated from today's date
const CS = 46, OX = 24, OY = 44;

function rng(seed) { let s = seed >>> 0 || 7; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function today() { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function candidates(b, i) {
  const r = Math.floor(i / 9), c = i % 9, br = r - (r % 3), bc = c - (c % 3);
  let used = 0;
  for (let k = 0; k < 9; k++) { used |= 1 << b[r * 9 + k]; used |= 1 << b[k * 9 + c]; used |= 1 << b[(br + Math.floor(k / 3)) * 9 + bc + (k % 3)]; }
  return used;
}
// counts solutions up to `limit`
function solveCount(b, limit, r) {
  let best = -1, bestN = 10, bestUsed = 0;
  for (let i = 0; i < 81; i++) {
    if (b[i]) continue;
    const used = candidates(b, i);
    let n = 0; for (let v = 1; v <= 9; v++) if (!(used & (1 << v))) n++;
    if (n < bestN) { best = i; bestN = n; bestUsed = used; if (n <= 1) break; }
  }
  if (best < 0) return 1;
  if (bestN === 0) return 0;
  let vals = []; for (let v = 1; v <= 9; v++) if (!(bestUsed & (1 << v))) vals.push(v);
  if (r) shuffle(vals, r);
  let count = 0;
  for (const v of vals) {
    b[best] = v;
    count += solveCount(b, limit - count, r);
    if (count >= limit) { if (!r) b[best] = 0; return count; }
  }
  b[best] = 0;
  return count;
}

function generate(seed, holes) {
  const r = rng(seed);
  const full = Array(81).fill(0);
  solveCount(full, 1, r); // fills `full` with a random solution
  const puzzle = full.slice();
  const order = shuffle([...Array(81).keys()], r);
  let removed = 0;
  for (const i of order) {
    if (removed >= holes) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (solveCount(puzzle.slice(), 2) !== 1) puzzle[i] = keep; else removed++;
  }
  return { puzzle, solution: full };
}

MCC.game({
  id: 'sudoku-daily',
  title: 'Sudoku Daily',
  width: 640, height: 480,
  scored: false,
  noKeyStart: true,
  instructions: ['Fill the grid so every row, column and 3x3 box has the numbers 1 to 9.', 'Click a square then type a number or click the number buttons.', 'N switches pencil notes on and off. A new puzzle every day!'],

  init(g) { g.seed = today(); this.newPuzzle(g, g.seed, true); g.state = 'title'; },
  start(g) { if (g.solved) { g.seed = today() * 7 + g.randInt(1, 99999); this.newPuzzle(g, g.seed, false); } },

  newPuzzle(g, seed, daily) {
    const { puzzle, solution } = generate(seed, 49);
    g.given = puzzle.map((v) => v > 0);
    g.grid = puzzle.slice();
    g.sol = solution;
    g.notes = Array.from({ length: 81 }, () => new Set());
    g.sel = g.grid.indexOf(0); g.noteMode = false; g.clock = 0; g.solved = false; g.checked = false;
    g.daily = daily;
    g.key = 'mcc.sudoku.' + seed;
    if (daily) {
      try {
        const saved = JSON.parse(localStorage.getItem(g.key));
        if (saved && saved.grid && saved.grid.length === 81) { g.grid = saved.grid; g.clock = saved.clock || 0; saved.notes && saved.notes.forEach((n, i) => (g.notes[i] = new Set(n))); }
      } catch (e) {}
    }
  },

  save(g) {
    if (!g.daily) return;
    try { localStorage.setItem(g.key, JSON.stringify({ grid: g.grid, clock: g.clock, notes: g.notes.map((s) => [...s]) })); } catch (e) {}
  },

  put(g, v) {
    const i = g.sel;
    if (i < 0 || g.given[i] || g.solved) return;
    if (g.noteMode && v) { g.notes[i].has(v) ? g.notes[i].delete(v) : g.notes[i].add(v); }
    else { g.grid[i] = v; g.notes[i].clear(); g.checked = false; }
    g.sfx('click');
    this.save(g);
    if (g.grid.every((x, k) => x === g.sol[k])) { g.solved = true; g.sfx('win'); g.over('Solved!', 'Time: ' + this.fmt(g.clock), true); }
  },

  fmt(t) { t = Math.floor(t); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); },

  conflict(g, i) {
    const v = g.grid[i]; if (!v) return false;
    const r = Math.floor(i / 9), c = i % 9, br = r - (r % 3), bc = c - (c % 3);
    for (let k = 0; k < 9; k++) {
      const a = r * 9 + k, b = k * 9 + c, d = (br + Math.floor(k / 3)) * 9 + bc + (k % 3);
      if ((a !== i && g.grid[a] === v) || (b !== i && g.grid[b] === v) || (d !== i && g.grid[d] === v)) return true;
    }
    return false;
  },

  update(g, dt) {
    g.clock += dt;
    if (g.frame % 120 === 0) this.save(g);
    const mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 };
    for (const k in mv) if (g.pressed(k)) { const n = g.sel + mv[k]; if (n >= 0 && n < 81 && !(Math.abs(mv[k]) === 1 && Math.floor(n / 9) !== Math.floor(g.sel / 9))) g.sel = n; }
    for (let v = 1; v <= 9; v++) if (g.pressed('Digit' + v) || g.pressed('Numpad' + v)) this.put(g, v);
    if (g.anyPressed('Backspace', 'Delete', 'Digit0', 'Numpad0')) this.put(g, 0);
    if (g.pressed('KeyN')) g.noteMode = !g.noteMode;
    if (!g.mouse.clicked) return;
    const mx = g.mouse.x, my = g.mouse.y;
    const cx = Math.floor((mx - OX) / CS), cy = Math.floor((my - OY) / CS);
    if (cx >= 0 && cy >= 0 && cx < 9 && cy < 9) { g.sel = cy * 9 + cx; return; }
    // number pad
    for (let v = 1; v <= 9; v++) { const bx = 470 + ((v - 1) % 3) * 52, by = 110 + Math.floor((v - 1) / 3) * 52; if (mx > bx && mx < bx + 46 && my > by && my < by + 46) this.put(g, v); }
    if (mx > 470 && mx < 618 && my > 270 && my < 302) this.put(g, 0);
    if (mx > 470 && mx < 618 && my > 310 && my < 342) g.noteMode = !g.noteMode;
    if (mx > 470 && mx < 618 && my > 350 && my < 382) { g.checked = true; g.sfx('blip'); }
  },

  demo(g) { g.sel = 40; for (let i = 0; i < 81; i += 5) if (!g.given[i]) g.grid[i] = g.sol[i]; g.notes[g.grid.indexOf(0)] = new Set([2, 5, 7]); },

  draw(g, ctx) {
    const bg = ctx.createLinearGradient(0, 0, 0, g.H);
    bg.addColorStop(0, '#e8f4ff'); bg.addColorStop(1, '#a8d0f5');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, g.W, g.H);
    g.text('Sudoku', OX, 22, 26, '#1d3f6e', null, 'left', g.FONT_TITLE);
    g.text(g.daily ? 'Daily puzzle ' + new Date().toLocaleDateString('en-US') : 'Bonus puzzle', 160, 23, 15, '#1d3f6e', null, 'left');
    const selR = Math.floor(g.sel / 9), selC = g.sel % 9, selV = g.grid[g.sel];
    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9), c = i % 9, x = OX + c * CS, y = OY + r * CS;
      let fill = '#fff';
      if (r === selR || c === selC || (Math.floor(r / 3) === Math.floor(selR / 3) && Math.floor(c / 3) === Math.floor(selC / 3))) fill = '#e4f1fc';
      if (selV && g.grid[i] === selV) fill = '#c6e2ff';
      if (i === g.sel) fill = '#ffe38a';
      ctx.fillStyle = fill; ctx.fillRect(x, y, CS, CS);
      const v = g.grid[i];
      if (v) {
        const bad = this.conflict(g, i) || (g.checked && !g.given[i] && v !== g.sol[i]);
        g.text(String(v), x + CS / 2, y + CS / 2 + 2, 28, bad ? '#e02020' : g.given[i] ? '#1a1a1a' : '#1a5ad8', null);
      } else if (g.notes[i].size) {
        for (const n of g.notes[i]) g.text(String(n), x + 9 + ((n - 1) % 3) * 14, y + 9 + Math.floor((n - 1) / 3) * 14, 11, '#6a7a8a', null);
      }
    }
    ctx.strokeStyle = '#9ab'; ctx.lineWidth = 1;
    for (let k = 0; k <= 9; k++) { ctx.beginPath(); ctx.moveTo(OX + k * CS, OY); ctx.lineTo(OX + k * CS, OY + 9 * CS); ctx.moveTo(OX, OY + k * CS); ctx.lineTo(OX + 9 * CS, OY + k * CS); ctx.stroke(); }
    ctx.strokeStyle = '#1d3f6e'; ctx.lineWidth = 3;
    for (let k = 0; k <= 9; k += 3) { ctx.beginPath(); ctx.moveTo(OX + k * CS, OY); ctx.lineTo(OX + k * CS, OY + 9 * CS); ctx.moveTo(OX, OY + k * CS); ctx.lineTo(OX + 9 * CS, OY + k * CS); ctx.stroke(); }
    // side panel
    g.text('Time ' + this.fmt(g.clock), 544, 70, 22, '#1d3f6e', null);
    for (let v = 1; v <= 9; v++) {
      const bx = 470 + ((v - 1) % 3) * 52, by = 110 + Math.floor((v - 1) / 3) * 52;
      const gr = ctx.createLinearGradient(0, by, 0, by + 46); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#bcdcf8');
      ctx.fillStyle = gr; g.roundRect(bx, by, 46, 46, 8); ctx.fill(); ctx.strokeStyle = '#6a9ad0'; ctx.lineWidth = 1.5; ctx.stroke();
      g.text(String(v), bx + 23, by + 25, 26, '#1d3f6e', null);
    }
    g.button(470, 270, 148, 32, 'Erase', ['#8fd0ff', '#3a8de0', '#1a5ab0']);
    g.button(470, 310, 148, 32, g.noteMode ? 'Notes: ON' : 'Notes: OFF', g.noteMode ? ['#b0ff8a', '#4ac82a', '#2a8a1a'] : ['#8fd0ff', '#3a8de0', '#1a5ab0']);
    g.button(470, 350, 148, 32, 'Check');
  },
});
