# games/_extras - original test games (not part of the catalogue)

These small HTML5 games and the tiny `flash-bounce.swf` were written from
scratch for this site. They are **not** classic portal games and are **not**
listed in `data/games.json`.

They are kept because they are useful:

* `sketch-pad/` powers the **SketchPad** tab (`sketch.html`).
* The rest are used by **playertest.html** and by the automated tests to check
  that the HTML5 player and the Ruffle Flash player work on your copy of the
  site before you add real game files.

`extras.json` describes them. `games/_shared/` holds the small engine they use
(`gamekit.js`) - HTML5 games you add yourself are free to use it too.
You can delete this folder if you don't want the SketchPad tab or the player
test page.
