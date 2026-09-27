// Writes feed.xml (RSS 2.0) listing the newest games.
// usage: node tools/build-feed.mjs [site base url ending in /]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = (process.argv[2] || 'https://klasicnid35-lab.github.io/MiniClipClassic/').replace(/\/*$/, '/');
const games = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const items = games.slice().sort((a, b) => (b.added || '').localeCompare(a.added || '')).slice(0, 30).map((g) => `    <item>
      <title>${esc(g.title)}</title>
      <link>${base}game.html?id=${encodeURIComponent(g.id)}</link>
      <guid isPermaLink="true">${base}game.html?id=${encodeURIComponent(g.id)}</guid>
      <description>${esc(g.description)}</description>
      <category>${esc(g.category)}</category>
      <pubDate>${new Date((g.added || '2026-01-01') + 'T12:00:00Z').toUTCString()}</pubDate>
      <enclosure url="${base}${esc(g.thumbnail)}" type="image/png" length="0"/>
    </item>`).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>MiniClip Classic - New Games</title>
    <link>${base}</link>
    <description>The latest free games added to MiniClip Classic.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;
fs.writeFileSync(path.join(ROOT, 'feed.xml'), xml);
console.log('wrote feed.xml with', Math.min(30, games.length), 'games for', base);
