// Writes feed.xml (RSS 2.0): the Latest Games line-up followed by the other
// games flagged "new" and the iconic classics.
// usage: node tools/build-feed.mjs [site base url ending in /]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = (process.argv[2] || 'https://klasicnid35-lab.github.io/MiniClipClassic/').replace(/\/*$/, '/');
const games = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8'));
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/site.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const byId = new Map(games.map((g) => [g.id, g]));
const picked = [];
const add = (g) => { if (g && !picked.includes(g)) picked.push(g); };
[...(site.homeFeatured || []), ...(site.homeLatestThumbs || [])].forEach((id) => add(byId.get(id)));
games.filter((g) => g.new).forEach(add);
games.filter((g) => g.nostalgiaPriority === 3).forEach(add);
const items = picked.slice(0, 40).map((g) => {
  const url = `${base}game.html?id=${encodeURIComponent(g.id)}`;
  const desc = g.description || `A classic ${String(g.category).toLowerCase()} game${g.year ? ' from ' + g.year : ''}.`;
  return `    <item>
      <title>${esc(g.title)}${g.installed ? '' : ' (archive)'}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(desc)}</description>
      <category>${esc(g.category)}</category>${g.thumbnail ? `
      <enclosure url="${base}${esc(g.thumbnail)}" type="image/${/\.jpe?g$/i.test(g.thumbnail) ? 'jpeg' : 'png'}" length="0"/>` : ''}
    </item>`;
}).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>MiniClip Classic - Latest Games</title>
    <link>${base}</link>
    <description>The latest games and the iconic classics in the MiniClip Classic games archive.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;
fs.writeFileSync(path.join(ROOT, 'feed.xml'), xml);
console.log('wrote feed.xml with', Math.min(40, picked.length), 'games for', base);
