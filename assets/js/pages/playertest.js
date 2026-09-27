// playertest.html?game=<id>
// Runs the small original test games in games/_extras/ through the real game
// player, so the Flash (Ruffle) and HTML5 players can be checked on any copy
// of the site before real game files are added. These test games are not
// part of the classic catalogue.
import { param, esc, $ } from '../core/util.js';
import { boot } from '../core/boot.js';
import { renderGamePage } from '../../../components/gamepage.js';

const lib = await boot();
const extras = (await fetch('games/_extras/extras.json').then((r) => r.json())).filter((g) => g.id !== 'sketch-pad');
const raw = extras.find((g) => g.id === param('game')) || extras.find((g) => g.type === 'flash') || extras[0];
const g = lib.wrap({ ...raw, title: raw.title + ' (test game)' });
renderGamePage(lib, g, { noCount: true });
document.title = 'Game Player Test - MiniClip Classic';

const flash = extras.filter((x) => x.type === 'flash');
const html5 = extras.filter((x) => x.type !== 'flash');
const opt = (x) => `<option value="${esc(x.id)}"${x.id === raw.id ? ' selected' : ''}>${esc(x.title)}</option>`;
$('.gamewrap').insertAdjacentHTML('beforebegin', `<div class="ipanel ptest"><div class="bhead"><h1>Game Player Test</h1></div>
  <div class="ibody"><p>This page checks that your browser can run the games in the archive. <b>Flash Bounce</b> is a tiny home-made <code>.swf</code> file played with the <b>Ruffle</b> Flash emulator; the others are small original HTML5 test games made for this site. They are <b>not</b> part of the classic games catalogue.</p>
  <label><b>Test game:</b> <select id="ptpick"><optgroup label="Flash (Ruffle)">${flash.map(opt).join('')}</optgroup><optgroup label="HTML5">${html5.map(opt).join('')}</optgroup></select></label>
  &nbsp; <a href="info.html#add-games">How to add real games</a></div></div>`);
$('#ptpick').addEventListener('change', (e) => { location.href = 'playertest.html?game=' + encodeURIComponent(e.target.value); });
