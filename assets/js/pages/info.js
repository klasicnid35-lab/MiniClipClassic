// info.html - About, Help, Add Your Games, Free Website Games, Credits, Terms, Privacy
import { html, setTitle, $, esc } from '../core/util.js';
import { boot } from '../core/boot.js';
import { renderRightColumn } from '../../../components/rightcol.js';

const lib = await boot();
setTitle('Information');
const base = location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
const n = (f) => lib.games.filter(f).length;
const total = lib.games.length;
const installed = lib.installed();
const example = installed.find((g) => g.type !== 'iframe');

html('#main', `<div class="ipanel"><div class="bhead"><h1>Information</h1></div><div class="ibody info">
<h2 id="about">About Us</h2>
<p><b>MiniClip Classic</b> is a fan-made recreation of what the classic free online games portal looked like around 2008-2009: small thumbnails, glossy blue panels, dense lists of games and a Top Ten chart. It is a personal nostalgia project and is <b>not affiliated with, or endorsed by, Miniclip</b>. Game names and trademarks belong to their owners.</p>
<p>The site is an <b>archive</b> of the classic era: its catalogue lists <b>${total} classic games</b> from roughly 2001-2011 - the famous ones, the obscure ones, online multiplayer worlds and the sponsored and promotional games of the time. <b>${installed.length}</b> of them ${installed.length === 1 ? 'is' : 'are'} playable at the moment. The others have a page with everything we know about them and show <i>"Game currently unavailable"</i> until their game file is added.</p>

<h2 id="catalogue">About the Catalogue</h2>
<ul>
<li>Each game has an <b>archive status</b>: <b>Verified classic</b> (${n((g) => g.verificationStatus === 'verified')} games - well documented, or visible on the 2008-2009 homepage), <b>Listed in the classic game lists</b> (${n((g) => g.verificationStatus === 'likely')}) or <b>Details still being checked</b> (${n((g) => g.verificationStatus === 'needs-review')} - for example titles that may be shortened or duplicated in the old lists).</li>
<li>Release years, developers and publishers are only shown when we are sure about them - otherwise they say <i>Unknown</i>. Games that are not sorted into a category yet are listed under <a href="games.html?cat=other">Other</a>.</li>
<li>Sponsored, licensed and promotional games (${n((g) => ['sponsored', 'licensed', 'promotional'].includes(g.historicalType))}) and online multiplayer services (${n((g) => /service/.test(g.historicalType))}) are kept because they are part of the history of the classic portals - see <a href="games.html?cat=promotional">Promotional Games</a>.</li>
<li><span style="color:#ff3300;font-weight:bold">Orange links</span> are the high score challenge games of the 2008-2009 site.</li>
<li>All thumbnails you see are generated placeholders showing the game's title and category, until real artwork is added.</li>
</ul>

<h2 id="help">Help</h2>
<ul>
<li><b>Finding games:</b> use the category links, the <a href="allgames.html">A-Z directory</a>, the <b>Find Games Quickly</b> drop-down or the <b>Search for Games</b> box at the top of every page. Search understands alternative titles too.</li>
<li><b>"Game currently unavailable":</b> the game is in the archive, but its file has not been added yet. You can still rate it and add it to <b>My Games</b>.</li>
<li><b>Playing:</b> click a game to open it. Most games use the arrow keys or the mouse.</li>
<li><b>Full screen:</b> press the <b>Full Screen</b> button under a game. Press <b>Esc</b> to go back.</li>
<li><b>My Games:</b> press <b>Add to My Games</b> under a game to keep it in your list. Your list, history, ratings and high scores are stored in your browser (localStorage), so they stay on this computer.</li>
<li><b>A game will not load?</b> Make sure JavaScript is switched on. Flash games need the Ruffle player, which downloads automatically - you can check it on the <a href="playertest.html">Game Player Test</a> page.</li>
</ul>

<h2 id="add-games">Add Your Games</h2>
<p>The whole site is built from <code>data/games.json</code>. Every game already has a record and an id (the last part of its address, e.g. <code>game.html?id=heli-attack-3</code>). To make a game playable:</p>
<ol>
<li>Put the file in a folder named after the id: <code>games/heli-attack-3/heli-attack-3.swf</code> for a Flash game, or <code>games/bloxorz/index.html</code> (plus its files) for an HTML5 game.</li>
<li>In its record set <code>"installed": true</code>, <code>"gameFile"</code> to the file's path and <code>"type"</code> to <code>flash</code>, <code>html5</code>, <code>local-web</code> or <code>iframe</code>. Or simply run <code>node tools/catalog/install-game.mjs heli-attack-3 path/to/file.swf</code>, which copies the file and updates the record for you.</li>
<li>Optional artwork: <code>assets/games/heli-attack-3.png</code> (shown at 68x57 - 136x114 looks sharp) and <code>assets/games/large/heli-attack-3.png</code> (274x199 - 548x398 looks sharp). Run <code>node tools/catalog/sync-files.mjs</code> to link them up.</li>
<li>Check everything with <code>node tools/catalog/validate.mjs</code>.</li>
</ol>
<p>A record looks like this (unknown facts stay <code>null</code> or empty):</p>
<pre>{
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
  "description": "Run, jump and blast your way through...",
  "instructions": "",
  "thumbnail": "",
  "image": "",
  "type": "flash",
  "gameFile": "games/heli-attack-3/heli-attack-3.swf",
  "installed": true,
  "featured": true,
  "popular": true,
  "new": false,
  "challenge": false,
  "nostalgiaPriority": 3,
  "rating": 0,
  "plays": 0
}</pre>
<p><b>category</b> and <b>secondaryCategories</b> use the names in <code>data/categories.json</code>. <b>nostalgiaPriority</b> (0-3) decides how prominent a game is. <b>Only add game files you have permission to share.</b></p>

<h2 id="webmasters">Free Website Games</h2>
<p>Want a game on your own web page? Copy this code, and change the address to the game you want:</p>
<pre>&lt;iframe src="${esc(base)}${esc(example ? example.file : 'games/&lt;game id&gt;/index.html')}" width="640" height="480"
  style="border:0" allow="fullscreen; autoplay"&gt;&lt;/iframe&gt;</pre>
<p>This works for HTML5 games that are installed on this site.</p>

<h2 id="credits">Credits</h2>
<ul>
<li>Site design reconstructed from screenshots of a 2008-2009 games portal. All artwork, logos and placeholder pictures on this site were made from scratch for this project; no original site code, artwork or game files were copied.</li>
<li>Flash emulation: <a href="https://ruffle.rs/" rel="noopener">Ruffle</a> (MIT / Apache 2.0).</li>
<li>Fonts: DejaVu Sans Condensed (Bitstream Vera licence) as a Tahoma fallback; Lilita One and Titan One (SIL Open Font License) for the placeholder pictures and test games.</li>
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
