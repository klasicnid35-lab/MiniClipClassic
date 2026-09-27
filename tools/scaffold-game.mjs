// Creates games/<id>/index.html for every html5 game in data/games.json whose
// folder has a game.js but no index.html yet.
// usage: node tools/scaffold-game.mjs [--force]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const games = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8'));
const force = process.argv.includes('--force');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

let n = 0;
for (const g of games) {
  if (g.type !== 'html5') continue;
  const dir = path.join(ROOT, 'games', g.id);
  const js = path.join(dir, 'game.js');
  const html = path.join(dir, 'index.html');
  if (!fs.existsSync(js)) continue;
  if (fs.existsSync(html) && !force) continue;
  fs.writeFileSync(html, `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(g.title)}</title>
<link rel="stylesheet" href="../_shared/game.css">
</head>
<body>
<script src="../_shared/gamekit.js"></script>
<script src="game.js"></script>
</body>
</html>
`);
  n++;
}
console.log('wrote', n, 'index.html files');
