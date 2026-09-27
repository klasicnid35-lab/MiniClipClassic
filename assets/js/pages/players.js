// players.html - the "Players" tab: a local player profile with stats,
// high scores and ratings. Everything is stored in this browser only.
import { html, setTitle, esc, gameUrl, $ } from '../core/util.js';
import { boot } from '../core/boot.js';
import { favorites, recent, ratings, plays, highScore, prefs, clearAll } from '../core/store.js';
import { stars } from '../../../components/thumbs.js';
import { renderRightColumn } from '../../../components/rightcol.js';

const AVATARS = ['🐸', '🐱', '🐶', '🦊', '🐼', '🐵', '🐧', '🐙', '👽', '🤖'];
const lib = await boot();
setTitle('Player Profile');

function draw() {
  const name = prefs.get('nick', '');
  const av = prefs.get('avatar', 0);
  const allPlays = plays.all();
  const total = Object.values(allPlays).reduce((a, b) => a + b, 0);
  const distinct = Object.keys(allPlays).filter((id) => lib.get(id)).length;
  // high score games that can actually be played here
  const scores = lib.alpha().filter((g) => g.challenge && g.installed).map((g) => ({ g, s: highScore(g.id) }));
  const rated = Object.entries(ratings.all()).map(([id, n]) => ({ g: lib.get(id), n })).filter((r) => r.g);
  const most = Object.entries(allPlays).map(([id, n]) => ({ g: lib.get(id), n })).filter((r) => r.g).sort((a, b) => b.n - a.n).slice(0, 5);
  const rank = total >= 100 ? 'Game Legend' : total >= 50 ? 'Arcade Ace' : total >= 20 ? 'Pro Player' : total >= 5 ? 'Regular' : 'Newbie';

  html('#main', `
  <div class="ipanel">
    <div class="bhead"><img class="bico" src="assets/icons/tab-players.png" width="31" height="24" alt="" style="top:3px"><h1>${name ? esc(name) + "'s Profile" : 'Player Profile'}</h1></div>
    <div class="ibody">
      <p>Create your player profile! No sign-up needed: your name, favourite games, high scores and ratings are saved in this web browser.</p>
      <div class="nick"><span style="font-size:34px">${AVATARS[av] || AVATARS[0]}</span>
        <label for="nick"><b>Player name:</b></label><input id="nick" maxlength="20" value="${esc(name)}" placeholder="Type your name"><button class="btn orange" id="savenick">Save</button></div>
      <b>Choose your avatar:</b>
      <div class="avatars">${AVATARS.map((a, i) => `<button type="button" data-av="${i}" class="${i === av ? 'on' : ''}" aria-label="Avatar ${i + 1}">${a}</button>`).join('')}</div>
      <div class="stats"><div><b>${total}</b>games played</div><div><b>${distinct}</b>different games</div><div><b>${favorites.list().length}</b>in My Games</div><div><b>${rank}</b>player rank</div></div>
    </div>
  </div>
  <div class="ipanel" id="scores">
    <div class="bhead"><h1>My High Scores<span class="cnt">(challenge games)</span></h1></div>
    <div class="ibody">${scores.length ? `<table class="hstable"><tr><th>Game</th><th>Your best score</th><th>Played</th></tr>
      ${scores.map(({ g, s }) => `<tr><td><a href="${gameUrl(g)}" style="color:#ff3300">${esc(g.title)}</a></td><td>${s != null ? '<b>' + s + '</b>' : '<span class="empty">not played yet</span>'}</td><td>${plays.get(g.id) || 0}x</td></tr>`).join('')}
    </table>` : `<p class="empty">None of the ${lib.games.filter((g) => g.challenge).length} high score challenge games (the <span style="color:#ff3300">orange links</span> in the games lists) has been added to the archive yet. Your best scores will appear here as soon as they are playable.</p>`}</div>
  </div>
  <div class="ipanel">
    <div class="bhead"><h1>Most Played &amp; My Ratings</h1></div>
    <div class="ibody">
      <h2>Most played</h2>
      ${most.length ? '<ol style="margin:0 0 8px 20px;list-style:decimal">' + most.map((r) => `<li><a href="${gameUrl(r.g)}">${esc(r.g.title)}</a> - ${r.n} plays</li>`).join('') + '</ol>' : '<p class="empty">Play some games and they will appear here.</p>'}
      <h2>Games I rated</h2>
      ${rated.length ? '<ul style="margin:0 0 8px 20px;list-style:disc">' + rated.map((r) => `<li><a href="${gameUrl(r.g)}">${esc(r.g.title)}</a> ${stars(r.n)}</li>`).join('') + '</ul>' : '<p class="empty">Rate games with the stars under each game.</p>'}
      <p style="margin-top:12px"><button class="linkbtn" id="wipe">Reset my profile</button> (removes your name, My Games, history, ratings and high scores from this browser)</p>
    </div>
  </div>`);

  $('#savenick').addEventListener('click', () => { prefs.set('nick', $('#nick').value.trim().slice(0, 20)); draw(); });
  $('#nick').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#savenick').click(); });
  document.querySelectorAll('[data-av]').forEach((b) => b.addEventListener('click', () => { prefs.set('avatar', +b.dataset.av); draw(); }));
  $('#wipe').addEventListener('click', () => {
    if (!confirm('Really reset your profile? This cannot be undone.')) return;
    clearAll();
    try { Object.keys(localStorage).filter((k) => k.startsWith('mcc.')).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
    draw();
  });
}
draw();
renderRightColumn(lib, { daily: false });
if (location.hash === '#scores') setTimeout(() => $('#scores').scrollIntoView(), 50);
