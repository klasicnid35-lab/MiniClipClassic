// Screenshot helper for visual QA.
// usage: node tools/test/shot.mjs <url> <out.png> [width] [height] [fullPage]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }

const [,, url, out, w = '1408', h = '900', full = '0'] = process.argv;
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url()));
page.on('response', (r) => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts && document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: out, fullPage: full === '1' });
if (errors.length) console.log(errors.join('\n'));
await browser.close();
