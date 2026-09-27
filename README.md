# MiniClip Classic

A fan-made recreation of a 2008–2009 browser games portal, rebuilt from scratch
as a static website that runs on GitHub Pages.

The layout (970 px page, glossy blue panels, 70×59 thumbnails, Top Ten chart,
category boxes, the huge A–Z games list and the dark footer) was reconstructed
from screenshots of the original 2009 homepage, measured down to the pixel.
All artwork, logos and the 44 games were made for this project.

> This is a personal nostalgia project. It is **not affiliated with, or
> endorsed by, Miniclip**. No original site code, artwork or games are used.

## What's inside

- **Homepage** – Latest Games carousel, Hot Games, promo banners, advert box,
  Top Ten with hover previews, Latest Games Played / My Games, daily puzzles,
  six category boxes, All Categories sidebar and the Full Games List.
- **Game pages** – player with loading screen, Full Screen, Restart,
  Add to My Games, 5-star rating, description, instructions, game info,
  related and recommended games.
- **Category / A–Z / search pages** – dense listings with sorting
  (popular, newest, top rated, A–Z) and pagination.
- **Players tab** – a local player profile: name, avatar, stats, high scores
  and ratings. **SketchPad tab** – a drawing toy.
- **44 original games** – 43 HTML5 games (arcade, puzzle, sports, racing,
  strategy, platform, two-player games…) and one home-made Flash movie that
  proves Ruffle works.
- **Favourites, recently played, ratings and high scores** are stored in the
  browser with `localStorage` – no server or account needed.
- Works on phones and tablets (the desktop layout is untouched above 980 px).

## Project structure

```
index.html  games.html  game.html  search.html  categories.html
mygames.html  players.html  sketch.html  info.html  404.html  feed.xml
assets/
  css/site.css            all styling (desktop first, responsive at the end)
  js/core/                data loading, storage, search, helpers
  js/pages/               one script per page
  logo/ icons/ ui/ flags/ banners/ fonts/
  games/                  thumbnails (136x114) and games/large/ (548x398)
components/               header, footer, player, listings, right column…
data/
  games.json              the game database
  categories.json         categories (ids used by games.json)
  site.json               homepage settings (promo, featured boxes…)
games/
  _shared/                gamekit.js mini engine used by the HTML5 games
  <game-id>/              one folder per game
vendor/ruffle/            Ruffle Flash emulator (downloaded, see below)
tools/                    art generators, tests, helpers (not deployed)
```

## Adding a game

1. Put the files in `games/<your-game>/` – for example an `index.html`, or a
   `.swf` file for Flash games.
2. Add a thumbnail `assets/games/<your-game>.png` (shown at 68×57; 136×114
   looks sharp) and optionally a big picture `assets/games/large/<your-game>.png`
   (548×398). If there is no picture yet a placeholder is shown.
3. Add one entry to `data/games.json`:

```json
{
  "id": "your-game",
  "title": "Your Game",
  "description": "One or two sentences about the game.",
  "instructions": "Arrow keys to move, SPACE to jump.",
  "thumbnail": "assets/games/your-game.png",
  "image": "assets/games/large/your-game.png",
  "category": "action",
  "tags": ["platform", "retro"],
  "year": 2009,
  "developer": "Unknown",
  "type": "html5",
  "file": "games/your-game/index.html",
  "width": 640,
  "height": 480,
  "featured": false,
  "new": true,
  "popular": false,
  "challenge": false,
  "rating": 4.5,
  "popularity": 60,
  "added": "2009-06-01"
}
```

- `type` – `html5` (a page in this repository), `flash` (a `.swf` played with
  Ruffle) or `iframe` (an embed URL on another site).
- `category` / `tags` – ids from `data/categories.json`.
- `featured`, `new`, `popular` – drive the homepage sections and NEW/HOT/TOP badges.
- `popularity` (0–100) and `rating` (0–5) – starting values; plays and ratings
  from the visitor are mixed in locally.
- `challenge` – shows the game in orange in the Full Games List and in the
  high-score table (HTML5 games using `gamekit.js` save their best score).
- `added` – `YYYY-MM-DD`, newest games appear in Latest Games.

Only add games you have the right to share.

## Running it locally

The site is plain HTML/CSS/JavaScript, but browsers block `fetch()` of the JSON
files from `file://`, so use any static web server:

```sh
npx http-server -c-1 .          # then open http://localhost:8080/
bash tools/fetch-ruffle.sh      # optional: self-hosted Flash emulator
```

Without `vendor/ruffle` the Flash player is loaded from the unpkg CDN.

## Deploying to GitHub Pages

1. In the repository go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
2. Push to the default branch (or run the *Deploy to GitHub Pages* workflow
   from the Actions tab). The workflow downloads Ruffle, builds `feed.xml`
   for your Pages address and publishes the site.

All paths are relative, so the site works at `username.github.io/repository-name/`
as well as on a custom domain. `.nojekyll` keeps the `games/_shared` folder.

## Tests

```sh
node tools/test/run-tests.mjs          # everything (~1600 checks)
node tools/test/run-tests.mjs --quick  # skip loading every single game
```

The tests serve the site from a `/MiniClipClassic/` sub folder like GitHub
Pages does and check: every page, console errors, broken images and links,
the JSON data, search, quick find, categories, sorting, pagination, favourites,
recently played, ratings, player profile, every game loading, Ruffle,
fullscreen, restart, missing-file handling, the 404 page, the desktop layout
grid and phone layouts. They need Playwright with Chromium.

Other tools: `tools/art/build-ui.mjs`, `build-banners.mjs` and
`build-thumbs.mjs` regenerate the artwork, `tools/make-swf.py` builds the demo
Flash movie, `tools/test/sokoban_check.py` / `platform_check.py` prove the Box
Pusher and Jumpin' Jack levels can be completed.

## Credits and licences

- Code, games and artwork: original work for this project.
- [Ruffle](https://ruffle.rs/) Flash emulator – MIT / Apache-2.0 (downloaded at deploy time).
- DejaVu Sans Condensed (Tahoma fallback) – Bitstream Vera licence, see `assets/fonts/DejaVu-LICENSE.txt`.
- Titan One, Lilita One and the display fonts in `tools/art/fonts` – SIL Open Font License, see `OFL.txt`.
