# games/ - where playable game files go

Every game in `data/games.json` has an id (for example `heli-attack-3`).
To make a game playable, put its files in a folder with that id:

| Game type | Put the file here | Set in data/games.json |
|-----------|-------------------|------------------------|
| Flash (.swf, played with Ruffle) | `games/heli-attack-3/heli-attack-3.swf` | `"type": "flash"`, `"gameFile": "games/heli-attack-3/heli-attack-3.swf"`, `"installed": true` |
| HTML5 | `games/bloxorz/index.html` (+ its other files) | `"type": "html5"`, `"gameFile": "games/bloxorz/index.html"`, `"installed": true` |
| Other local web build | `games/<id>/...` | `"type": "local-web"`, `"gameFile": "games/<id>/index.html"`, `"installed": true` |
| Embed from another site | nothing to copy | `"type": "iframe"`, `"gameFile": "https://..."`, `"installed": true` |

Optional: `"width"` and `"height"` (the game's size in pixels, default 640 x 480).

You don't have to edit the JSON by hand:

```sh
node tools/catalog/install-game.mjs heli-attack-3 ~/Downloads/heli-attack-3.swf --width 550 --height 400
# or copy the files yourself and let the sync pick them up:
node tools/catalog/sync-files.mjs
node tools/catalog/validate.mjs
```

The GitHub Pages workflow also runs the sync before every deploy, so a file
committed to `games/<id>/` goes live even if you forget to update the JSON.

**Only add games you are allowed to share.** Nothing in this repository
downloads game files, artwork or music from other websites.

`_shared/` is the small engine used by the test games in `_extras/`.
