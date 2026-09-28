// Picks up game files and artwork that were copied into the standard folders
// and updates data/games.json. It only ever switches things ON:
//
//   games/<id>/<id>.swf  (or the only .swf in the folder)  -> installed flash game
//   games/<id>/index.html                                  -> installed html5 game
//   assets/games/<id>.png|jpg|jpeg|gif|webp                -> thumbnail (68x57 slot, 136x114 looks sharp)
//   assets/games/large/<id>.png|jpg|...                    -> big picture (274x199 slot, 548x398 looks sharp)
//
// usage: node tools/catalog/sync-files.mjs [--dry-run]
import { readJSON, writeGames, syncFiles, GAMES_JSON } from './lib.mjs';

const dry = process.argv.includes('--dry-run');
const games = readJSON(GAMES_JSON, []);
const log = [];
const n = syncFiles(games, { log: (s) => log.push(s) });
if (log.length) console.log(log.join('\n'));
if (n && !dry) writeGames(games);
console.log(n ? `${n} change${n === 1 ? '' : 's'}${dry ? ' (dry run - nothing written)' : ' written to data/games.json'}` : 'nothing new to pick up');
