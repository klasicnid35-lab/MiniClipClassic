// Load a game, optionally click Play and press keys, screenshot, report errors.
// usage: node gameshot.mjs <id> <out.png> [demo|play] [keys...]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const [,, id, out, mode = 'play', ...keys] = process.argv;
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
page.on('response', (r) => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
const base = 'http://localhost:8080/MiniClipClassic/games/' + id + '/index.html';
if (mode === 'demo') {
  await page.goto(base + '?demo=1');
  await page.waitForFunction(() => window.__demoReady === true, null, { timeout: 8000 }).catch(() => errs.push('demo not ready'));
} else {
  await page.goto(base);
  await page.waitForTimeout(600);
  await page.screenshot({ path: out.replace('.png', '-title.png') });
  await page.mouse.click(320, 300);
  await page.keyboard.press('Enter');
  for (const k of keys) {
    if (k.startsWith('wait')) await page.waitForTimeout(+k.slice(4));
    else if (k.startsWith('click')) { const [x, y] = k.slice(5).split(','); await page.mouse.click(+x, +y); }
    else if (k.startsWith('hold')) { const [key, ms] = k.slice(4).split(':'); await page.keyboard.down(key); await page.waitForTimeout(+ms); await page.keyboard.up(key); }
    else await page.keyboard.press(k);
  }
  await page.waitForTimeout(400);
}
await page.screenshot({ path: out });
console.log(errs.length ? errs.join('\n') : 'ok');
await browser.close();
