// info.html - About, Help, Add Your Games, Free Website Games, Credits, Terms, Privacy
import { html, setTitle, $ } from '../core/util.js';
import { boot } from '../core/boot.js';
import { renderRightColumn } from '../../../components/rightcol.js';

const lib = await boot();
setTitle('Information');
const base = location.href.replace(/[^/]*$/, '');

html('#main', `<div class="ipanel"><div class="bhead"><h1>Information</h1></div><div class="ibody info">
<h2 id="about">About Us</h2>
<p><b>MiniClip Classic</b> is a fan-made recreation of what a free online games website looked like around 2008-2009: small thumbnails, glossy blue panels, dense lists of games and a Top Ten chart. It is a personal nostalgia project and is <b>not affiliated with, or endorsed by, Miniclip</b>.</p>
<p>Every game here (${lib.games.length} and counting) is an original game written for this site in HTML5, plus a small home-made Flash movie that shows off the Ruffle Flash emulator.</p>

<h2 id="help">Help</h2>
<ul>
<li><b>Finding games:</b> use the category links, the <b>Find Games Quickly</b> drop-down or the <b>Search for Games</b> box at the top of every page.</li>
<li><b>Playing:</b> click a game to open it. Most games use the arrow keys or the mouse. Press <b>P</b> to pause and <b>M</b> to mute in most games.</li>
<li><b>Full screen:</b> press the <b>Full Screen</b> button under a game. Press <b>Esc</b> to go back.</li>
<li><b>My Games:</b> press <b>Add to My Games</b> under a game to keep it in your list. Your list, play history, ratings and high scores are stored in your browser (localStorage), so they stay on this computer.</li>
<li><b>A game will not load?</b> Make sure JavaScript is switched on. Flash games need the Ruffle player, which downloads automatically.</li>
</ul>

<h2 id="add-games">Add Your Games</h2>
<p>The game list is built from <code>data/games.json</code>, so adding a game takes three steps:</p>
<ol>
<li>Put the game files in <code>games/your-game/</code> (for example <code>games/your-game/index.html</code>, or a <code>.swf</code> file for Flash games).</li>
<li>Add a thumbnail image to <code>assets/games/your-game.png</code> (any size - it is shown at 68x57, 136x114 looks sharp) and, optionally, a bigger picture to <code>assets/games/large/your-game.png</code> (548x398).</li>
<li>Add one entry to <code>data/games.json</code>:</li>
</ol>
<pre>{
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
}</pre>
<p><b>type</b> can be <code>html5</code> (a page in this site, shown in a frame), <code>flash</code> (a <code>.swf</code> file played with Ruffle) or <code>iframe</code> (an embed address on another website). <b>category</b> and <b>tags</b> use the ids from <code>data/categories.json</code>. Only games you have permission to share should be added.</p>

<h2 id="webmasters">Free Website Games</h2>
<p>Want a game on your own web page? Copy this code (change <code>brick-buster</code> to any game's id):</p>
<pre>&lt;iframe src="${base}games/brick-buster/index.html" width="640" height="480"
  style="border:0" allow="fullscreen; autoplay"&gt;&lt;/iframe&gt;</pre>

<h2 id="credits">Credits</h2>
<ul>
<li>Site design reconstructed from screenshots of a 2008-2009 games portal. All artwork, logos and games on this site were made from scratch for this project.</li>
<li>Flash emulation: <a href="https://ruffle.rs/" rel="noopener">Ruffle</a> (MIT / Apache 2.0).</li>
<li>Fonts: DejaVu Sans Condensed (Bitstream Vera licence) as a Tahoma fallback; Titan One and Lilita One (SIL Open Font License) in the games.</li>
</ul>

<h2 id="languages">Languages</h2>
<p>This recreation is currently English only. The language flags in the footer are kept for the authentic look - translations may be added in the future.</p>

<h2 id="terms">Terms and Conditions</h2>
<p>This is a free, non-commercial fan project. The games are provided "as is" for fun. Please be nice and don't try to break things.</p>

<h2 id="privacy">Privacy</h2>
<p>This site has no accounts, no adverts from other companies, no cookies and no tracking. The only things stored are your player name, My Games list, play history, ratings and high scores - and they are kept in your own browser's local storage. Use <a href="players.html">Reset my profile</a> to delete them.</p>
</div></div>`);
renderRightColumn(lib, { daily: false });
if (location.hash) setTimeout(() => { const el = $(location.hash); if (el) el.scrollIntoView(); }, 50);
