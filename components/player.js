// Game player: picks the right way to run a game from its "type".
//   html5     - a page in this repository (games/<id>/index.html), loaded in an iframe
//   local-web - any other local web build (a folder or .html page), loaded in an iframe
//   iframe    - an external embed URL, loaded in a sandboxed iframe
//   flash     - a .swf file, played with the Ruffle Flash emulator; either a
//               local file, an official stream (an https:// address on the
//               game's own official host, e.g. Miniclip's classic archive) or
//               the visitor's own copy (game.data, an ArrayBuffer that never
//               leaves their browser - see owncopy.js)
// Only games with "installed": true reach the player - see gamepage.js.
import { esc } from '../assets/js/core/util.js';

const RUFFLE_VERSION = '0.6.0';
const RUFFLE_LOCAL = 'vendor/ruffle/ruffle.js';
const RUFFLE_CDN = `https://unpkg.com/@ruffle-rs/ruffle@${RUFFLE_VERSION}/ruffle.js`;

let rufflePromise = null;
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve(src);
    s.onerror = () => { s.remove(); reject(new Error('Could not load ' + src)); };
    document.head.appendChild(s);
  });
}

// Uses the self-hosted copy in vendor/ruffle when it exists (the GitHub Pages
// workflow downloads it), otherwise falls back to the public CDN build.
export function loadRuffle() {
  // Ruffle builds its context menu with `new Intl.Locale(navigator.language)`,
  // which throws when the browser reports no language (some embedded or
  // headless browsers). Fall back to English in that case.
  try { new Intl.Locale(navigator.language); } catch (e) {
    try { Object.defineProperty(navigator, 'language', { get: () => 'en-US', configurable: true }); } catch (err) { /* ignore */ }
  }
  if (window.RufflePlayer && window.RufflePlayer.newest) return Promise.resolve();
  if (!rufflePromise) {
    window.RufflePlayer = window.RufflePlayer || {};
    window.RufflePlayer.config = Object.assign({
      autoplay: 'auto',
      unmuteOverlay: 'visible',
      letterbox: 'on',
      splashScreen: true,
      contextMenu: 'on',
      showSwfDownload: false,
      warnOnUnsupportedContent: false,
      allowScriptAccess: false,
    }, window.RufflePlayer.config || {});
    rufflePromise = loadScript(RUFFLE_LOCAL)
      .catch(() => loadScript(RUFFLE_CDN))
      .then(() => { if (!window.RufflePlayer.newest) throw new Error('Ruffle did not start'); });
  }
  return rufflePromise;
}

export function fitSize(game, maxW) {
  const w = +game.width || 640, h = +game.height || 480;
  const s = Math.min(1, maxW / w);
  return { w: Math.round(w * s), h: Math.round(h * s), ratio: w / h };
}

/**
 * Mounts a game into `host`. Returns a small controller.
 */
export function mountPlayer(host, game, { maxWidth = 920, onStart = null } = {}) {
  const { w, h, ratio } = fitSize(game, maxWidth);
  // a folder means its index.html
  const src = /\/$/.test(game.file) ? game.file + 'index.html' : game.file;
  host.innerHTML = `<div class="player" id="player" style="width:${w}px;height:${h}px;aspect-ratio:${ratio}">
    <div class="loader" id="loader"><div class="lt">${esc(game.title)}</div><div class="ls">Loading game...</div>
      <div class="bar"><i></i></div><div class="pc">0%</div></div></div>`;
  const box = host.querySelector('.player');
  const loader = box.querySelector('.loader');
  const bar = loader.querySelector('.bar i');
  const pc = loader.querySelector('.pc');
  let pct = 0;
  let done = false;
  const tick = setInterval(() => {
    if (done) return;
    pct = Math.min(90, pct + Math.max(1, (90 - pct) / 8));
    bar.style.width = pct + '%'; pc.textContent = Math.round(pct) + '%';
  }, 80);

  // onStart runs once, when the game has really started (a page loaded, or
  // the SWF's header arrived) - that is what counts as "played".
  let started = false;
  const start1 = () => { if (!started) { started = true; if (onStart) onStart(); } };
  const finish = () => {
    if (done) return;
    done = true; clearInterval(tick);
    bar.style.width = '100%'; pc.textContent = '100%';
    setTimeout(() => { loader.style.transition = 'opacity .3s'; loader.style.opacity = '0'; setTimeout(() => loader.remove(), 320); }, 250);
  };
  const fail = (msg) => {
    done = true; clearInterval(tick);
    loader.classList.add('err');
    loader.innerHTML = `<div class="lt">Oops!</div><div class="ls">${msg}</div><a class="btn orange gobtn" href="index.html">Back to Games</a>`;
  };

  let frame = null;
  let ruffle = null;
  // A remote SWF loads its extra files (levels, sounds...) relative to its own
  // folder, as it did on its original site.
  const own = game.data instanceof ArrayBuffer;
  const remote = !own && /^[a-z]+:\/\//i.test(src);
  const swfOptions = () => Object.assign(
    own ? { data: game.data, swfFileName: game.dataName || 'game.swf' } : { url: src },
    { allowScriptAccess: false, backgroundColor: '#000000' },
    remote ? { base: src.replace(/[?#].*$/, '').replace(/[^/]*$/, '') } : {},
  );

  const startHtml = () => {
    frame = document.createElement('iframe');
    frame.title = game.title;
    frame.allow = 'fullscreen; autoplay; gamepad';
    if (game.type === 'iframe') {
      frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-forms');
      frame.referrerPolicy = 'no-referrer';
    }
    frame.addEventListener('load', () => { finish(); start1(); try { frame.contentWindow.focus(); } catch (e) { /* cross-origin */ } });
    frame.src = src;
    box.appendChild(frame);
  };

  const startFlash = () => {
    loadRuffle().then(() => {
      const holder = document.createElement('div');
      holder.className = 'ruffle-host';
      box.appendChild(holder);
      ruffle = window.RufflePlayer.newest().createPlayer();
      ruffle.addEventListener('loadedmetadata', start1);
      holder.appendChild(ruffle);
      return ruffle.load(swfOptions());
    }).then(finish).catch((e) => {
      console.error(e);
      fail(remote
        ? `The game could not be loaded from ${esc(game.host || 'its official server')}. Please check your internet connection and try again.`
        : 'The Flash player (Ruffle) could not be started. Please check your internet connection, or add Ruffle to <code>vendor/ruffle/</code>.');
    });
  };

  const start = () => {
    if (game.type === 'flash') startFlash();
    else startHtml();
  };

  // make sure local game files exist before trying to run them
  if (own) start();
  else if (!remote) {
    fetch(src, { method: 'HEAD', cache: 'no-cache' }).then((r) => {
      if (r.ok) start();
      else fail(`Sorry, this game's file could not be found:<br><code>${esc(src)}</code>`);
    }).catch(() => start());
  } else start();

  return {
    el: box,
    // stop the game before its page is replaced (Ruffle's sound keeps running otherwise)
    destroy() {
      done = true; clearInterval(tick);
      if (ruffle) { try { ruffle.pause(); } catch (e) { /* ignore */ } ruffle.remove(); ruffle = null; }
      if (frame) { frame.remove(); frame = null; }
    },
    restart() {
      if (frame) { frame.src = src; }
      else if (ruffle) { ruffle.load(swfOptions()); }
    },
    fullscreen() {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (fsEl) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      if (box.classList.contains('fs-fallback')) { box.classList.remove('fs-fallback'); return; }
      const req = box.requestFullscreen || box.webkitRequestFullscreen;
      if (req) {
        Promise.resolve(req.call(box)).then(() => { try { frame && frame.contentWindow.focus(); } catch (e) { /* ignore */ } })
          .catch(() => box.classList.add('fs-fallback'));
      } else box.classList.add('fs-fallback');
    },
  };
}
