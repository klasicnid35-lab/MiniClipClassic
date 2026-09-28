# assets/games - game artwork

Games without artwork get a generated placeholder (title + category), so this
folder can stay empty. To add real pictures you are allowed to use, name them
after the game id and run `node tools/catalog/sync-files.mjs`:

- `assets/games/<id>.png` (or .jpg / .gif / .webp) - thumbnail, shown at 68x57 (136x114 looks sharp)
- `assets/games/large/<id>.png` - big picture, shown at 274x199 (548x398 looks sharp)

`_placeholder.png` is the last-resort fallback image.
