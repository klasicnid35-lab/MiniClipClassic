# MiniClip Classic

A fan-made archive of the classic Miniclip era: a static recreation of the
2008–2009 browser games portal, filled with a catalogue of **828 classic
games** from 2001–2012, every one backed by historical sources, running on
GitHub Pages. **16 of them are playable**, streamed from Miniclip's own
classic games archive.

The layout (970 px page, glossy blue panels, 70×59 thumbnails, Top Ten chart,
category boxes, the huge Full Games List and the dark footer) was
reconstructed from screenshots of the 2008–2009 homepage, measured down to the
pixel. The homepage line-up (Latest Games, Hot Games, the six category boxes,
the Top Ten and the orange high score challenge links) matches the games
visible in those screenshots.

> This is a personal nostalgia project. It is **not affiliated with, or
> endorsed by, Miniclip**. Game names, games and trademarks belong to their
> owners. No original site code or artwork is used, and no game files are
> downloaded into this repository: the playable Flash games are streamed at
> play time from Miniclip's official archive (classic.miniclip.com), which
> serves them to any website (`Access-Control-Allow-Origin: *`).

## What's inside

- **The catalogue** – `data/games.json`, 828 games: the famous classics,
  obscure titles, online multiplayer worlds and the sponsored / licensed /
  promotional / seasonal / parody games of the time. Every game lists its
  historical **sources**, and its verification level is worked out from them.
  Duplicate spellings are merged and kept as aliases; sequels never are.
- **Playable games** – the 16 games in Miniclip's official classic archive
  (Commando 2, Heli Attack 3, Bloxorz, Motherload, Bubble Trouble, 8 Ball
  Pool, Raft Wars 2, Mad Skills Motocross...) stream straight into the
  Ruffle player. A local copy in `games/<id>/` always takes priority.
- **Homepage** – Latest Games, Hot Games, promo banners, advert box, Top Ten
  with hover previews, Latest Games Played / My Games, daily puzzles, six
  category boxes, All Categories and the Full Games List (every game, as on
  the original site).
- **A–Z directory** (`allgames.html`) – `# A–Z` letter bar, calculated
  counters (TOTAL GAMES / VERIFIED / PLAYABLE / ARCHIVED CATALOG ONLY), compact
  filters (Action ... Multiplayer, Seasonal, Promotional, Playable,
  Unavailable), year ranges (2001–2003 ... 2010–2012) and every category.
- **Game pages** – for every game. Playable games get the player (Flash via
  Ruffle, HTML5, local web builds, iframes); the others show
  **GAME CURRENTLY UNAVAILABLE** – "This game is part of the historical
  catalog but no playable local file has been added yet." – with the title,
  generated picture, category, release information, series, sources,
  verification, archive notes, rating, Add to My Games, related (weighted by
  series, developer, category, kind of game, era and year) and recommended
  games.
- **Search** over titles, aliases, main and secondary categories, developer,
  publisher, year, series, kind of game and descriptions; tolerant of case,
  apostrophes, hyphens, spacing, `&`/`and` and `II`/`2` (`commando` →
  Commando, Commando 2, Commando 3; `commando ii` → Commando 2).
- **Generated thumbnails** – every game without artwork gets an original
  retro placeholder (title, category, category colours) drawn at exactly the
  real thumbnail size (136×114 for the 68×57 slots, 548×398 for 274×199), so
  there are never broken images and nothing is downloaded per game.
- **Favourites, recently played, ratings, player profile and high scores**
  are stored in the browser with `localStorage` – no server or account needed.
  Favourites work for every game; only games that actually start count as
  played.
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
  audit-report.json       the latest historical audit (tools/catalog/audit-games.mjs)
games/
  <game-id>/              playable game files, one folder per game (see games/README.md)
  _shared/                small engine used by the test games
  _extras/                original test games + SketchPad (not in the catalogue)
vendor/ruffle/            Ruffle Flash emulator (downloaded, see below)
tools/
  catalog/                build, sync, validate, audit and install tools + master-list.txt
  catalog/sources/        the historical sources the catalogue is checked against
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
  "series": "Heli Attack",
  "seriesOrder": 3,
  "category": "Shooting",
  "secondaryCategories": ["Action"],
  "era": "classic",
  "year": 2005,
  "developer": "Squarecircleco",
  "publisher": null,
  "hostedByMiniclip": true,
  "relationship": "hosted",
  "historicalType": "standard",
  "verificationStatus": "verified",
  "sources": [
    { "type": "official", "name": "Miniclip Arcade (classic.miniclip.com)" },
    { "type": "official", "name": "Miniclip CD \"Ultimate Game Pack\" (Christmas 2006)" },
    { "type": "screenshot", "name": "Miniclip homepage screenshots (2008-2009)" },
    { "type": "archive", "name": "Internet Archive items credited to Miniclip" },
    { "type": "maintainer", "name": "Maintainer's master list" }
  ],
  "historicalNotes": "",
  "description": "Run, jump and blast your way through ...",
  "instructions": "",
  "thumbnail": "",
  "image": "",
  "type": "flash",
  "gameFile": "https://classic.miniclip.com/game-files/heli-attack-3/game-files/ha3miniclip.swf",
  "installed": true,
  "width": 448,
  "height": 320,
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
- `historicalType` – `standard`, `multiplayer`, `promotional`, `licensed`,
  `sponsored`, `seasonal`, `political-parody` or `external-service`.
- `sources` – where the game is documented (`type` + `name`, see below). Shown
  on the game page as plain names.
- `verificationStatus` – worked out from the sources: `verified` (direct
  evidence – Miniclip's own archive, CD or downloads, or the 2008–2009
  screenshots), `cross-verified` (two or more independent sources),
  `single-source` or `needs-review` (possibly shortened, duplicated or not a
  normal game – see `historicalNotes`).
- `relationship` – Miniclip's part in the game: `developed`, `published`,
  `hosted`, `licensed`, `sponsored`, `external-service` or `unknown`. Only
  claimed for verified / cross-verified games; everything else is `unknown`.
- `developer` / `publisher` / `year` – only when a source says so, otherwise
  `null` (never "Miniclip" by default).
- `series` / `seriesOrder` – "Commando", "Commando 2", "Commando 3" are one
  series, in order; sequels are always separate records.
- `challenge` – high score challenge game (an orange link in the 2008–2009
  Full Games List).
- `type` – `flash` (a `.swf` played with Ruffle – a local file or an official
  `https://` stream), `html5`, `local-web` (any other local web build) or
  `iframe` (an embed URL). Only used when `installed` is `true`.
- `thumbnail` / `image` – empty means "use the generated placeholder".
- `width` / `height` – optional game size (default 640×480).

`tools/catalog/master-list.txt` is the editorial source the catalogue was
built from. `node tools/catalog/build-catalog.mjs` merges it into
`games.json` **without** overwriting existing values or anything to do with
installed games, and keeps games that were added by hand. It then applies the
historical sources (below).

## Historical sources and the audit

`tools/catalog/sources/` holds one text file per source – a small header and
one title per line, with optional facts:

```
# name: Miniclip CD "Ultimate Game Pack" (Christmas 2006)
# type: official
# url: https://archive.org/details/miniclip-cd
# about: Miniclip's own offline games CD ...
Skidoo TT
Dance 2 The Beat | aka=Dance to the Beat
Blooming Gardens | id=bloomin-gardens
```

Source types: `official` (Miniclip's own archive, CD, downloads),
`screenshot` (the 2008–2009 homepage), `archive` (Internet Archive items),
`reference` (databases and wikis, one per `ref=`), `web` (miniclip.com game
pages found by web search) and `maintainer` (the maintainer's lists);
`rejected` and `uncertain` files record the candidates that were left out or
kept apart, and why. `id=` points a spelling at a record, `aka=` adds
aliases, `year=` / `dev=` / `pub=` only fill **empty** fields (disagreements
are reported, never overwritten) and `play=` + `size=` (official sources only)
turn on an official stream.

```sh
node tools/catalog/build-catalog.mjs           # merge master list + sources into games.json
node tools/catalog/audit-games.mjs             # audit report + data/audit-report.json
```

The audit prints totals, unique normalized titles, duplicate ids / slugs /
titles, alias and sequel collisions, installed and missing files, placeholder
thumbnails, verification, relationship, historical type, year, era and
category totals, and what each source matched. It fails on duplicates,
collisions, broken installs, unsourced records or source lines that match
nothing (a genuinely missing game has to be added to the master list). Title
matching normalizes case, `&`/`and`, apostrophes, dashes, spacing and
`II`/`2`, but never merges different sequel numbers.

## Adding a game file

Only add games you are allowed to share. Then either:

```sh
node tools/catalog/install-game.mjs heli-attack-3 ~/Downloads/heli-attack-3.swf --width 550 --height 400
node tools/catalog/install-game.mjs bloxorz ~/builds/bloxorz-html5/      # a folder with index.html
node tools/catalog/install-game.mjs some-game --url https://example.com/embed   # iframe
```

or copy the file to `games/<id>/` yourself (`games/<id>/<id>.swf` or
`games/<id>/index.html`) and run `node tools/catalog/sync-files.mjs`, or set
`"installed": true`, `"gameFile"` and `"type"` by hand. A local copy replaces
an official stream. The game page then
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
slugs, titles or aliases, unknown categories, types, verification levels or
relationships, records without sources, "verified" without direct evidence,
missing artwork or game files, `installed: true` without a file, non-https
streams, bad `site.json` references. It runs, together with the audit, on
every push and pull request (`.github/workflows/validate.yml`).

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
node tools/test/run-tests.mjs --live   # also play all 16 official streams for real
```

The tests serve the site from a `/MiniClipClassic/` sub folder like GitHub
Pages does (requests to classic.miniclip.com are answered with a local test
file unless `--live` is given) and check: the catalogue validator, the
historical audit, the official streams, every page, console errors,
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
- The playable Flash games belong to their owners and are streamed from
  Miniclip's official classic games archive, [classic.miniclip.com](https://classic.miniclip.com/).
- DejaVu Sans Condensed (Tahoma fallback) – Bitstream Vera licence, see `assets/fonts/DejaVu-LICENSE.txt`.
- Lilita One (placeholders), Titan One and the display fonts in `tools/art/fonts`
  – SIL Open Font License, see the `OFL` files.
