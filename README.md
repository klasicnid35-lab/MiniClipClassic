# MiniClip Classic

A fan-made archive of the classic Miniclip era: a static recreation of the
2008–2009 browser games portal, filled with a catalogue of **753 classic
games** from roughly 2001–2011, running on GitHub Pages.

The layout (970 px page, glossy blue panels, 70×59 thumbnails, Top Ten chart,
category boxes, the huge Full Games List and the dark footer) was
reconstructed from screenshots of the 2008–2009 homepage, measured down to the
pixel. The homepage line-up (Latest Games, Hot Games, the six category boxes,
the Top Ten and the orange high score challenge links) matches the games
visible in those screenshots.

> This is a personal nostalgia project. It is **not affiliated with, or
> endorsed by, Miniclip**. Game names and trademarks belong to their owners.
> No original site code, artwork, music or game files are used or downloaded.

## What's inside

- **The catalogue** – `data/games.json`, 753 games merged from several
  historical game lists and the screenshots: the famous classics, obscure
  titles, online multiplayer worlds and the sponsored / licensed / promotional
  games of the time. Duplicate spellings are merged and kept as aliases.
- **Homepage** – Latest Games, Hot Games, promo banners, advert box, Top Ten
  with hover previews, Latest Games Played / My Games, daily puzzles, six
  category boxes, All Categories and the Full Games List (every game, as on
  the original site).
- **A–Z directory** (`allgames.html`) – `# A–Z` letter bar, category and
  "playable / not added yet / challenge" filters, total calculated from the data.
- **Game pages** – for every game. Playable games get the player (Flash via
  Ruffle, HTML5, local web builds, iframes); the others show
  **GAME CURRENTLY UNAVAILABLE** with the title, generated picture, category,
  release information, archive notes, rating, Add to My Games, related and
  recommended games.
- **Search** over titles, aliases, categories, developer, publisher and
  descriptions; tolerant of case, apostrophes, hyphens, spacing, `&`/`and`
  and `II`/`2` (`commando` → Commando, Commando 2, Commando 3).
- **Generated thumbnails** – every game without artwork gets an original
  retro placeholder (title, category, category colours) drawn at exactly the
  real thumbnail size (136×114 for the 68×57 slots, 548×398 for 274×199), so
  there are never broken images and nothing is downloaded per game.
- **Favourites, recently played, ratings, player profile and high scores**
  are stored in the browser with `localStorage` – no server or account needed.
- Works on phones and tablets (the desktop layout is untouched above 980 px).

## Project structure

```
index.html  allgames.html  games.html  game.html  search.html  categories.html
mygames.html  players.html  sketch.html  playertest.html  info.html  404.html  feed.xml
assets/
  css/site.css            all styling (desktop first, responsive at the end)
  js/core/                data loading, storage, search, helpers
  js/pages/               one script per page
  games/                  real game artwork goes here (see "Adding artwork")
  logo/ icons/ ui/ flags/ banners/ fonts/
components/               header, footer, player, placeholders, listings...
data/
  games.json              the game catalogue
  categories.json         categories
  site.json               homepage line-up (from the screenshots)
games/
  <game-id>/              playable game files, one folder per game (see games/README.md)
  _shared/                small engine used by the test games
  _extras/                original test games + SketchPad (not in the catalogue)
vendor/ruffle/            Ruffle Flash emulator (downloaded, see below)
tools/
  catalog/                build, sync, validate and install tools + master-list.txt
  test/                   end-to-end tests
  art/                    banner / UI artwork generators
```

## The catalogue (`data/games.json`)

Each record looks like this – unknown facts stay `null` or empty on purpose:

```json
{
  "id": "heli-attack-3",
  "slug": "heli-attack-3",
  "title": "Heli Attack 3",
  "aliases": [],
  "category": "Shooting",
  "secondaryCategories": ["Action"],
  "era": "classic",
  "year": 2005,
  "developer": "Squarecircleco",
  "publisher": null,
  "hostedByMiniclip": true,
  "historicalType": "standard",
  "verificationStatus": "verified",
  "historicalNotes": "",
  "description": "Run, jump and blast your way through ...",
  "instructions": "",
  "thumbnail": "",
  "image": "",
  "type": "flash",
  "gameFile": "",
  "installed": false,
  "featured": true,
  "popular": true,
  "new": false,
  "challenge": false,
  "nostalgiaPriority": 3,
  "rating": 0,
  "plays": 0
}
```

- `category` / `secondaryCategories` – names from `data/categories.json`
  (Action, Adventure, Arcade, Board, Card, Casual, Driving, Fighting, Flying,
  Football, Multiplayer, Other, Platform, Pool, Promotional, Puzzle, Racing,
  Shooting, Skill, Sports, Strategy, Winter, Word). "Other" = not sorted yet.
- `nostalgiaPriority` – 3 iconic classic, 2 major classic-era title, 1 normal,
  0 obscure / promotional. Drives Hot Games, recommendations and ranking.
- `historicalType` – `standard`, `sponsored`, `licensed`, `promotional`,
  `multiplayer-service` or `external-service`.
- `verificationStatus` – `verified` (well documented, or visible in the
  2008–2009 screenshots), `likely` (listed in the historical game lists, not
  cross-checked yet) or `needs-review` (possibly shortened, duplicated or not a
  normal game – see `historicalNotes`).
- `challenge` – high score challenge game (an orange link in the 2008–2009
  Full Games List).
- `type` – `flash` (a `.swf` played with Ruffle), `html5`, `local-web` (any
  other local web build) or `iframe` (an embed URL). Only used when
  `installed` is `true`.
- `thumbnail` / `image` – empty means "use the generated placeholder".
- `width` / `height` – optional game size (default 640×480).

`tools/catalog/master-list.txt` is the editorial source the catalogue was
built from. `node tools/catalog/build-catalog.mjs` merges it into
`games.json` **without** overwriting existing values or anything to do with
installed games, and keeps games that were added by hand.

## Adding a game file

Only add games you are allowed to share. Then either:

```sh
node tools/catalog/install-game.mjs heli-attack-3 ~/Downloads/heli-attack-3.swf --width 550 --height 400
node tools/catalog/install-game.mjs bloxorz ~/builds/bloxorz-html5/      # a folder with index.html
node tools/catalog/install-game.mjs some-game --url https://example.com/embed   # iframe
```

or copy the file to `games/<id>/` yourself (`games/<id>/<id>.swf` or
`games/<id>/index.html`) and run `node tools/catalog/sync-files.mjs`, or set
`"installed": true`, `"gameFile"` and `"type"` by hand. The game page then
shows the right player automatically – no per-game HTML is needed. The GitHub
Pages workflow also runs the sync before each deploy. See `games/README.md`.

Look up a game's id with `node tools/catalog/validate.mjs --find "heli"`.

## Adding artwork

Put pictures named after the game id in `assets/games/` (thumbnail, shown at
68×57 – 136×114 looks sharp) and `assets/games/large/` (274×199 slot –
548×398 looks sharp), then run `node tools/catalog/sync-files.mjs`.

## Checking the catalogue

```sh
node tools/catalog/validate.mjs
```

prints a report (totals, duplicates, broken files, verification counts, A–Z
spread...) and fails on errors: invalid JSON, missing fields, duplicate ids,
slugs, titles or aliases, unknown categories, missing artwork or game files,
`installed: true` without a file, bad `site.json` references. It runs on every
push and pull request (`.github/workflows/validate.yml`).

## Running it locally

The site is plain HTML/CSS/JavaScript, but browsers block `fetch()` of the JSON
files from `file://`, so use any static web server:

```sh
npx http-server -c-1 .          # then open http://localhost:8080/
bash tools/fetch-ruffle.sh      # optional: self-hosted Flash emulator
```

Without `vendor/ruffle` the Flash player is loaded from the unpkg CDN.
`playertest.html` checks that the Flash and HTML5 players work.

## Deploying to GitHub Pages

1. In the repository go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
2. Push to the default branch (or run the *Deploy to GitHub Pages* workflow
   from the Actions tab). The workflow downloads Ruffle, picks up new game
   files, validates the catalogue, builds `feed.xml` for your Pages address
   and publishes the site.

All paths are relative, so the site works at `username.github.io/repository-name/`
as well as on a custom domain. `.nojekyll` keeps the `_shared` / `_extras` folders.

## Tests

```sh
node tools/test/run-tests.mjs          # everything (opens every game page)
node tools/test/run-tests.mjs --quick  # a sample of the game pages
```

The tests serve the site from a `/MiniClipClassic/` sub folder like GitHub
Pages does and check: the catalogue validator, every page, console errors,
broken images and links, every game page, the homepage line-up, search
(including aliases and spelling variants), the A–Z directory, categories,
natural sorting, pagination, unavailable game pages, installed HTML5 /
local-web / Flash (Ruffle) games (using temporary records that point at the
test games), missing files, favourites, recently played, ratings, the player
profile, the 404 page, the desktop layout grid and phone layouts. They need
Playwright with Chromium.

## Credits and licences

- Code, layout reconstruction, placeholder artwork, banners and test games:
  original work for this project.
- [Ruffle](https://ruffle.rs/) Flash emulator – MIT / Apache-2.0 (downloaded at deploy time).
- DejaVu Sans Condensed (Tahoma fallback) – Bitstream Vera licence, see `assets/fonts/DejaVu-LICENSE.txt`.
- Lilita One (placeholders), Titan One and the display fonts in `tools/art/fonts`
  – SIL Open Font License, see the `OFL` files.
