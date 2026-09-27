// Dark grey footer box: language row, welcome text, links and copyright.
import { $ } from '../assets/js/core/util.js';

// [label, flag index in assets/flags/flags.png]
const LANGS = [
  ['English', 0], ['Français', 1], ['Español', 2], ['Deutsch', 3], ['Português', 4],
  ['Italiano', 5], ['Polski', 6], ['Română', 7], ['Magyar', 8], ['Brasil', 9],
  ['한국어', 10], ['漢語', 11], ['日本語', 12],
];

const LINKS = [
  ['Join Now', 'players.html'],
  ['Credits', 'info.html#credits'],
  ['About Us', 'info.html#about'],
  ['Free Website Games', 'info.html#webmasters'],
  ['Add Your Games', 'info.html#add-games'],
  ['New Games Alerts', 'games.html?cat=new'],
  ['Help', 'info.html#help'],
  ['Terms and Conditions', 'info.html#terms'],
  ['Privacy', 'info.html#privacy'],
];

export function renderFooter() {
  const host = $('#ftr');
  if (!host) return;
  const langs = LANGS.map(([name, i], n) => {
    const flag = `<i class="flag" style="background-position:0 -${i * 11}px"></i>`;
    return n === 0
      ? `<a href="index.html" lang="en">${flag}${name}</a>`
      : `<a href="info.html#languages" title="${name} edition coming soon">${flag}${name}</a>`;
  }).join(' ');
  const links = LINKS.map(([t, h]) => `<a href="${h}">${t}</a>`).join('<span class="sep">|</span>') +
    '<span class="sep">|</span><i class="rss"></i><a href="feed.xml">MiniClip Classic Games Feed</a>';

  host.innerHTML = `<div class="footbox">
  <div class="langs"><b>Select language :</b> ${langs}</div>
  <div class="fwelcome">Welcome to MiniClip Classic, a fan-made recreation of a 2008-2009 online games site where you can play a large range of free online games including sports games, multiplayer games, action games, puzzle games, and flash games. Players can save their favourite games and high scores, and rate the games they play.</div>
  <div class="flinks">${links}</div>
  <div class="fcopy">&copy; Copyright 2026 MiniClip Classic. Fan-made tribute site &ndash; not affiliated with or endorsed by Miniclip. All games on this site are original works.</div>
</div>`;
}
