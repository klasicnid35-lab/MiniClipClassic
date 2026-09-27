// Installs a game file you are allowed to share into the catalogue.
//
//   node tools/catalog/install-game.mjs <game id> <path to .swf or folder with index.html> [--width 640 --height 480]
//   node tools/catalog/install-game.mjs <game id> --url https://example.com/embed/game   (type iframe)
//
// Examples:
//   node tools/catalog/install-game.mjs heli-attack-3 ~/Downloads/heli-attack-3.swf --width 550 --height 400
//   node tools/catalog/install-game.mjs bloxorz ~/builds/bloxorz-html5/
//
// The file (or folder) is copied to games/<id>/ and the record in
// data/games.json gets "installed": true, "gameFile" and "type" set.
import fs from 'fs';
import path from 'path';
import { ROOT, GAMES_JSON, readJSON, writeGames, titleKey } from './lib.mjs';

const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv.splice(i, 2)[1] : undefined; };
const width = opt('width'), height = opt('height'), url = opt('url');
const [id, src] = argv;
const die = (msg) => { console.error(msg); process.exit(1); };

if (!id || (!src && !url)) die('usage: node tools/catalog/install-game.mjs <game id> <file or folder> [--width W --height H]\n       node tools/catalog/install-game.mjs <game id> --url <embed url>');
const games = readJSON(GAMES_JSON, []);
const g = games.find((x) => x.id === id) || games.find((x) => titleKey(x.title) === titleKey(id));
if (!g) die(`No game "${id}" in data/games.json. Look the id up with: node tools/catalog/validate.mjs --find "${id}"`);

if (url) {
  g.type = 'iframe';
  g.gameFile = url;
} else {
  const from = path.resolve(src);
  if (!fs.existsSync(from)) die(`Not found: ${from}`);
  const dir = path.join(ROOT, 'games', g.id);
  fs.mkdirSync(dir, { recursive: true });
  if (fs.statSync(from).isDirectory()) {
    fs.cpSync(from, dir, { recursive: true });
    if (!fs.existsSync(path.join(dir, 'index.html'))) die(`Copied, but games/${g.id}/index.html is missing - HTML5 games need an index.html.`);
    g.type = g.type === 'local-web' ? 'local-web' : 'html5';
    g.gameFile = `games/${g.id}/index.html`;
  } else {
    const ext = path.extname(from).toLowerCase();
    const name = ext === '.swf' ? `${g.id}.swf` : path.basename(from);
    fs.copyFileSync(from, path.join(dir, name));
    g.type = ext === '.swf' ? 'flash' : (ext === '.html' || ext === '.htm') ? 'html5' : g.type;
    g.gameFile = `games/${g.id}/${name}`;
  }
}
g.installed = true;
if (width) g.width = Number(width);
if (height) g.height = Number(height);
writeGames(games);
console.log(`"${g.title}" is now installed: ${g.gameFile} (${g.type}). Run node tools/catalog/validate.mjs to double-check.`);
