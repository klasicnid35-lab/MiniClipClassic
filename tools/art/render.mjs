// Renders HTML/SVG snippets to PNG files with a headless browser.
// Used by build-ui.mjs, build-banners.mjs and build-thumbs.mjs.
//
// Each asset: { out: 'assets/icons/x.png', w, h, scale = 2, html }
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export async function renderAll(assets, { only } = {}) {
  const browser = await pw.chromium.launch();
  const pages = {};
  const getPage = async (scale) => {
    if (!pages[scale]) {
      const p = await browser.newPage({ deviceScaleFactor: scale, viewport: { width: 1200, height: 900 } });
      await p.goto(pathToFileURL(path.join(ROOT, 'tools/art/studio.html')).href);
      await p.evaluate(() => document.fonts.ready);
      pages[scale] = p;
    }
    return pages[scale];
  };
  let n = 0;
  for (const a of assets) {
    if (only && !a.out.includes(only)) continue;
    const page = await getPage(a.scale || 2);
    await page.evaluate(({ w, h, html }) => {
      const s = document.getElementById('stage');
      s.style.width = w + 'px';
      s.style.height = h + 'px';
      s.innerHTML = html;
    }, a);
    await page.evaluate(() => document.fonts.ready);
    if (a.wait) await page.waitForTimeout(a.wait);
    const out = path.join(ROOT, a.out);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await page.locator('#stage').screenshot({ path: out, omitBackground: !a.opaque });
    n++;
  }
  await browser.close();
  return n;
}
