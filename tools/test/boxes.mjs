// Print bounding boxes (page-relative to #page) of selectors: node boxes.mjs url sel1 sel2 ...
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const [,, url, ...sels] = process.argv;
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1408, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
const r = await page.evaluate((sels) => {
  const p = document.getElementById('page').getBoundingClientRect();
  return sels.map((s) => [...document.querySelectorAll(s)].slice(0, 4).map((e) => {
    const b = e.getBoundingClientRect();
    return `${s}: x${Math.round(b.left - p.left)} y${Math.round(b.top - p.top)} w${Math.round(b.width)} h${Math.round(b.height)}`;
  }).join('\n'));
}, sels);
console.log(r.join('\n'));
await browser.close();
