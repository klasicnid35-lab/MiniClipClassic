/*
 * gamekit.js - tiny shared engine for the MiniClip Classic HTML5 games.
 *
 *   MCC.game({
 *     id, title, width, height, instructions: [...],
 *     scored: true,            // show score / best on the game over screen
 *     init(g) {}, start(g) {}, update(g, dt) {}, draw(g, ctx) {}, demo(g) {}
 *   });
 *
 * g (the game object) offers: ctx, W, H, state ('title'|'play'|'pause'|'over'),
 * keys: g.down(code), g.pressed(code); pointer: g.mouse {x, y, down, clicked,
 * released}; g.score, g.addScore(n), g.best, g.over(text?), g.sfx(name),
 * g.rand(a, b), g.randInt(a, b), g.time, g.frame, g.demoMode.
 *
 * High scores are stored in localStorage "mcc.hs.<id>" (shared with the site).
 * ?demo=1 renders a single representative frame (used to make thumbnails).
 */
(function () {
  'use strict';

  var FONT_TITLE = '"Titan One", "Arial Black", Impact, sans-serif';
  var FONT_UI = '"Lilita One", "Arial Black", Arial, sans-serif';

  function loadFonts() {
    if (!window.FontFace || !document.fonts) return Promise.resolve();
    var base = (document.currentScript && document.currentScript.src) || '';
    var dir = '../_shared/fonts/';
    var faces = [
      new FontFace('Titan One', 'url(' + dir + 'titan-one.woff2)'),
      new FontFace('Lilita One', 'url(' + dir + 'lilita-one.woff2)'),
    ];
    return Promise.all(faces.map(function (f) {
      return f.load().then(function (ff) { document.fonts.add(ff); }).catch(function () {});
    }));
  }

  // ------------------------------------------------------------------ audio
  var audio = null;
  var muted = false;
  try { muted = localStorage.getItem('mcc.muted') === '1'; } catch (e) {}
  function ac() {
    if (!audio) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audio = new AC();
    }
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }
  function tone(freq, dur, type, vol, slide, delay) {
    var a = ac();
    if (!a || muted) return;
    var t = a.currentTime + (delay || 0);
    var o = a.createOscillator();
    var gn = a.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    gn.gain.setValueAtTime(vol || 0.08, t);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn); gn.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, delay) {
    var a = ac();
    if (!a || muted) return;
    var t = a.currentTime + (delay || 0);
    var len = Math.floor(a.sampleRate * dur);
    var buf = a.createBuffer(1, len, a.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = a.createBufferSource();
    var gn = a.createGain();
    gn.gain.value = vol || 0.12;
    src.buffer = buf; src.connect(gn); gn.connect(a.destination);
    src.start(t);
  }
  var SFX = {
    blip: function () { tone(660, 0.07, 'square', 0.06); },
    click: function () { tone(880, 0.04, 'square', 0.05); },
    coin: function () { tone(988, 0.06, 'square', 0.06); tone(1319, 0.12, 'square', 0.06, 0, 0.06); },
    jump: function () { tone(300, 0.15, 'square', 0.06, 2.2); },
    hit: function () { tone(180, 0.12, 'sawtooth', 0.08, 0.5); },
    shoot: function () { tone(900, 0.1, 'square', 0.04, 0.3); },
    explode: function () { noise(0.35, 0.18); tone(120, 0.3, 'sawtooth', 0.06, 0.3); },
    pop: function () { tone(500 + Math.random() * 300, 0.05, 'sine', 0.12, 0.4); },
    bounce: function () { tone(220, 0.08, 'sine', 0.12, 1.8); },
    lose: function () { tone(440, 0.15, 'square', 0.06, 0.8); tone(330, 0.15, 'square', 0.06, 0.8, 0.15); tone(220, 0.35, 'square', 0.06, 0.6, 0.3); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.14, 'square', 0.06, 0, i * 0.1); }); },
    tick: function () { tone(1200, 0.02, 'square', 0.03); },
    whoosh: function () { noise(0.2, 0.06); },
  };

  // ------------------------------------------------------------------ helpers
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function outlinedText(ctx, text, x, y, size, fill, stroke, font, align) {
    ctx.font = size + 'px ' + (font || FONT_UI);
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    if (stroke) {
      ctx.lineWidth = Math.max(3, size / 6);
      ctx.strokeStyle = stroke;
      ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
  }

  function glossyButton(ctx, x, y, w, h, label, hover, colors) {
    var c = colors || ['#ffc34d', '#ff8a00', '#d96a00'];
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.4)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    roundRect(ctx, x, y, w, h, h / 2.6);
    var gr = ctx.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, hover ? '#ffe08a' : c[0]);
    gr.addColorStop(0.5, c[1]);
    gr.addColorStop(1, c[2]);
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    roundRect(ctx, x, y, w, h, h / 2.6);
    ctx.stroke();
    // gloss
    ctx.save();
    roundRect(ctx, x + 3, y + 3, w - 6, h / 2 - 3, h / 3);
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.fill();
    ctx.restore();
    outlinedText(ctx, label, x + w / 2, y + h / 2 + 1, Math.round(h * 0.52), '#fff', 'rgba(120,50,0,.55)');
  }

  function panel(ctx, x, y, w, h) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = 16;
    roundRect(ctx, x, y, w, h, 14);
    var gr = ctx.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, 'rgba(18,110,210,.94)');
    gr.addColorStop(1, 'rgba(6,56,130,.94)');
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    roundRect(ctx, x, y, w, h, 14);
    ctx.stroke();
  }

  function wrapLines(ctx, text, maxW) {
    var words = String(text).split(' ');
    var lines = [];
    var line = '';
    for (var i = 0; i < words.length; i++) {
      var t = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = words[i]; } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }

  // ------------------------------------------------------------------ game
  function game(def) {
    var W = def.width || 640;
    var H = def.height || 480;
    var params = new URLSearchParams(location.search);
    var demoMode = params.get('demo') === '1';

    var canvas = document.createElement('canvas');
    canvas.tabIndex = 0;
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var dpr = 1;

    var keysDown = {};
    var keysPressed = {};
    var mouse = { x: -1, y: -1, down: false, clicked: false, released: false, right: false, moved: false };

    var g = {
      W: W, H: H, ctx: ctx, canvas: canvas, def: def,
      state: 'title', score: 0, best: 0, time: 0, frame: 0,
      demoMode: demoMode, mouse: mouse, muted: muted, mode: 0,
      overText: '', overSub: '', won: false,
      down: function (k) { return !!keysDown[k]; },
      pressed: function (k) { return !!keysPressed[k]; },
      anyDown: function () { for (var i = 0; i < arguments.length; i++) if (keysDown[arguments[i]]) return true; return false; },
      anyPressed: function () { for (var i = 0; i < arguments.length; i++) if (keysPressed[arguments[i]]) return true; return false; },
      addScore: function (n) { g.score += n; },
      sfx: function (n) { if (!demoMode && SFX[n]) SFX[n](); },
      tone: tone,
      rand: function (a, b) { return a + Math.random() * (b - a); },
      randInt: function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
      pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
      roundRect: function (x, y, w, h, r) { roundRect(ctx, x, y, w, h, r); },
      text: function (t, x, y, size, fill, stroke, align, font) { outlinedText(ctx, t, x, y, size, fill || '#fff', stroke, font, align); },
      button: function (x, y, w, h, label, colors) {
        var hover = mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
        glossyButton(ctx, x, y, w, h, label, hover, colors);
        return hover && mouse.clicked;
      },
      panel: function (x, y, w, h) { panel(ctx, x, y, w, h); },
      FONT_TITLE: FONT_TITLE,
      FONT_UI: FONT_UI,
      over: function (text, sub, won) {
        if (g.state !== 'play') return;
        g.state = 'over';
        g.overText = text || 'Game Over';
        g.overSub = sub || '';
        g.won = !!won;
        g.newBest = false;
        if (def.scored !== false && g.score > g.best) {
          g.best = g.score;
          g.newBest = g.score > 0;
          try { localStorage.setItem('mcc.hs.' + def.id, JSON.stringify(g.best)); } catch (e) {}
        }
        try { parent.postMessage({ type: 'mcc:gameover', id: def.id, score: g.score, best: g.best }, '*'); } catch (e) {}
        g.sfx(won ? 'win' : 'lose');
      },
      startGame: function () {
        g.score = 0;
        g.state = 'play';
        g.time = 0;
        if (def.start) def.start(g);
      },
    };

    try {
      var hs = JSON.parse(localStorage.getItem('mcc.hs.' + def.id));
      if (typeof hs === 'number') g.best = hs;
    } catch (e) {}

    // ---- sizing: fit the window, keep aspect ratio, render at device resolution
    function resize() {
      var s = Math.min(window.innerWidth / W, window.innerHeight / H);
      if (!isFinite(s) || s <= 0) s = 1;
      var cw = Math.floor(W * s);
      var ch = Math.floor(H * s);
      dpr = Math.min(3, (window.devicePixelRatio || 1) * s);
      canvas.style.width = cw + 'px';
      canvas.style.height = ch + 'px';
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      g.scale = s;
    }
    window.addEventListener('resize', resize);
    resize();

    // ---- input
    var BLOCK = { ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Space: 1 };
    window.addEventListener('keydown', function (e) {
      if (BLOCK[e.code]) e.preventDefault();
      if (!keysDown[e.code]) keysPressed[e.code] = true;
      keysDown[e.code] = true;
      if (def.keydown) def.keydown(g, e);
      if (e.code === 'KeyM' && !def.noMuteKey) toggleMute();
      if ((e.code === 'KeyP' || e.code === 'Escape') && !def.noPause) {
        if (g.state === 'play') g.state = 'pause';
        else if (g.state === 'pause') g.state = 'play';
      }
      if ((e.code === 'Enter' || e.code === 'Space') && (g.state === 'title' || g.state === 'over') && !def.noKeyStart) {
        ac();
        g.startGame();
        keysPressed = {};
      }
    }, { passive: false });
    window.addEventListener('keyup', function (e) { keysDown[e.code] = false; });
    window.addEventListener('blur', function () {
      keysDown = {};
      if (g.state === 'play' && !def.noPause) g.state = 'pause';
    });

    function toPos(e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * (W / r.width);
      mouse.y = (e.clientY - r.top) * (H / r.height);
    }
    canvas.addEventListener('pointerdown', function (e) {
      canvas.focus();
      try { window.focus(); } catch (err) {}
      ac();
      toPos(e);
      mouse.down = true;
      mouse.right = e.button === 2;
      mouse.clicked = true;
      if (canvas.setPointerCapture) try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', function (e) { toPos(e); mouse.moved = true; });
    canvas.addEventListener('pointerup', function (e) { toPos(e); mouse.down = false; mouse.released = true; });
    canvas.addEventListener('pointercancel', function () { mouse.down = false; });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // swipe detection for touch screens
    var sw = null;
    canvas.addEventListener('touchstart', function (e) { var t = e.touches[0]; sw = { x: t.clientX, y: t.clientY }; }, { passive: true });
    canvas.addEventListener('touchend', function (e) {
      if (!sw) return;
      var t = e.changedTouches[0];
      var dx = t.clientX - sw.x, dy = t.clientY - sw.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 30) {
        var code = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowDown' : 'ArrowUp');
        keysPressed[code] = true;
        g.swiped = code;
      }
      sw = null;
    }, { passive: true });

    function toggleMute() {
      muted = !muted;
      g.muted = muted;
      try { localStorage.setItem('mcc.muted', muted ? '1' : '0'); } catch (e) {}
    }

    // ---- overlays
    function drawTitle() {
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(0, 0, W, H);
      var pw = Math.min(W - 60, 460);
      var lines = def.instructions || [];
      ctx.font = '15px ' + FONT_UI;
      var wrapped = [];
      lines.forEach(function (l) { wrapLines(ctx, l, pw - 50).forEach(function (x) { wrapped.push(x); }); });
      var ph = 150 + wrapped.length * 20 + (g.best && def.scored !== false ? 22 : 0);
      var px = (W - pw) / 2, py = (H - ph) / 2;
      panel(ctx, px, py, pw, ph);
      outlinedText(ctx, def.title, W / 2, py + 40, Math.min(44, (pw - 30) / (def.title.length * 0.62)), '#ffd24a', '#7a2a00', FONT_TITLE);
      var y = py + 78;
      wrapped.forEach(function (l) { outlinedText(ctx, l, W / 2, y, 15, '#fff', null); y += 20; });
      if (g.best && def.scored !== false) { outlinedText(ctx, 'Your best: ' + g.best, W / 2, y + 2, 15, '#bfe6ff', null); y += 22; }
      var bh = 42;
      var modes = def.modes || ['Play!'];
      var bw = modes.length > 2 ? 124 : modes.length > 1 ? 150 : 170;
      var gap = 16;
      var total = modes.length * bw + (modes.length - 1) * gap;
      for (var m = 0; m < modes.length; m++) {
        if (g.button(W / 2 - total / 2 + m * (bw + gap), py + ph - bh - 18, bw, bh, modes[m])) {
          mouse.clicked = false; g.mode = m; g.startGame();
        }
      }
    }

    function drawOver() {
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(0, 0, W, H);
      var pw = 360;
      var ph = def.scored === false ? 170 : 210;
      var px = (W - pw) / 2, py = (H - ph) / 2;
      panel(ctx, px, py, pw, ph);
      outlinedText(ctx, g.overText, W / 2, py + 40, 36, g.won ? '#8dff6a' : '#ffd24a', '#6a2200', FONT_TITLE);
      var y = py + 80;
      if (g.overSub) { outlinedText(ctx, g.overSub, W / 2, y, 16, '#fff'); y += 24; }
      if (def.scored !== false) {
        outlinedText(ctx, 'Score: ' + g.score, W / 2, y, 22, '#fff', null); y += 26;
        outlinedText(ctx, g.newBest ? 'NEW BEST SCORE!' : 'Best: ' + g.best, W / 2, y, 16, g.newBest ? '#ffe45a' : '#bfe6ff', null);
      }
      if (def.modes) {
        if (g.button(W / 2 - 160, py + ph - 60, 150, 42, 'Play Again')) { mouse.clicked = false; g.startGame(); }
        if (g.button(W / 2 + 10, py + ph - 60, 150, 42, 'Menu', ['#8fd0ff', '#3a8de0', '#1a5ab0'])) { mouse.clicked = false; g.state = 'title'; }
      } else if (g.button(W / 2 - 85, py + ph - 60, 170, 42, 'Play Again')) { mouse.clicked = false; g.startGame(); }
    }

    function drawPause() {
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(0, 0, W, H);
      outlinedText(ctx, 'PAUSED', W / 2, H / 2 - 16, 48, '#fff', '#000', FONT_TITLE);
      outlinedText(ctx, 'Press P or click to continue', W / 2, H / 2 + 26, 16, '#fff', '#000');
      if (mouse.clicked) { g.state = 'play'; mouse.clicked = false; }
    }

    function drawMuteIcon() {
      if (def.noMuteIcon) return;
      var x = W - 26, y = 6;
      var hover = mouse.x >= x && mouse.x <= x + 20 && mouse.y >= y && mouse.y <= y + 18;
      ctx.save();
      ctx.globalAlpha = hover ? 0.95 : 0.55;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 6); ctx.lineTo(x + 6, y + 6); ctx.lineTo(x + 11, y + 2); ctx.lineTo(x + 11, y + 16); ctx.lineTo(x + 6, y + 12); ctx.lineTo(x + 2, y + 12); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      if (muted) { ctx.beginPath(); ctx.moveTo(x + 13, y + 5); ctx.lineTo(x + 19, y + 13); ctx.moveTo(x + 19, y + 5); ctx.lineTo(x + 13, y + 13); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(x + 11, y + 9, 5, -0.8, 0.8); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 11, y + 9, 8.5, -0.8, 0.8); ctx.stroke(); }
      ctx.restore();
      if (hover && mouse.clicked) { toggleMute(); mouse.clicked = false; }
    }

    // ---- main loop
    var last = 0;
    function frame(t) {
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 60;
      last = t;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.frame++;
      // the mute icon and overlays get first go at clicks
      var clickedUi = false;
      if (mouse.clicked && mouse.x >= W - 26 && mouse.y <= 24 && !def.noMuteIcon) clickedUi = true;
      if (g.state === 'play' && !clickedUi) {
        g.time += dt;
        if (def.update) def.update(g, dt);
      } else if (def.idle) def.idle(g, dt);
      if (def.draw) def.draw(g, ctx);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (g.state === 'title') drawTitle();
      else if (g.state === 'over') drawOver();
      else if (g.state === 'pause') drawPause();
      drawMuteIcon();
      keysPressed = {};
      mouse.clicked = false;
      mouse.released = false;
      mouse.moved = false;
      g.swiped = null;
      requestAnimationFrame(frame);
    }

    loadFonts().then(function () {
      if (def.init) def.init(g);
      if (demoMode) {
        g.state = 'play';
        if (def.start) def.start(g);
        if (def.demo) def.demo(g);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (def.draw) def.draw(g, ctx);
        window.__demoReady = true;
        document.title = 'demo-ready';
        return;
      }
      requestAnimationFrame(frame);
    });

    return g;
  }

  window.MCC = { game: function (def) { var g = game(def); window.MCC.current = g; return g; }, roundRect: roundRect, outlinedText: outlinedText };
})();
