// "All Categories" + "Other Sections" side lists and the Full Games List.
import { esc, catUrl } from '../assets/js/core/util.js';
import { link } from './thumbs.js';

export const OTHER_SECTIONS = [
  ['My Games', 'mygames.html'],
  ['Player Profile', 'players.html'],
  ['New Games Alerts', 'games.html?cat=new'],
  ['Free Website Games', 'info.html#webmasters'],
  ['Add Your Own Games', 'info.html#add-games'],
];

export function categoryItems(lib, current, withCounts = false) {
  return lib.cats.map((c) => {
    const n = withCounts && !c.virtual ? ` <span class="n">(${lib.count(c.id)})</span>` : '';
    return `<li${c.id === current ? ' class="on"' : ''}><a href="${catUrl(c.id)}">${esc(c.name)}${n}</a></li>`;
  }).join('');
}

export function otherItems() {
  return OTHER_SECTIONS.map(([t, h]) => `<li><a href="${h}">${t}</a></li>`).join('');
}

// Full A-Z games list in 7 columns with letter headings.
export function fullList(lib, games = lib.alpha(), cols = 7) {
  const items = [];
  let last = null;
  for (const g of games) {
    let ch = g.sortTitle.charAt(0).toUpperCase();
    if (!/[A-Z]/.test(ch)) ch = '#';
    if (ch !== last) { items.push(`<li class="l">${ch}</li>`); last = ch; }
    items.push(`<li>${link(g, g.challenge ? 'c' : '')}</li>`);
  }
  const per = Math.ceil(items.length / cols);
  let out = '';
  for (let i = 0; i < cols; i++) out += '<ul>' + items.slice(i * per, (i + 1) * per).join('') + '</ul>';
  return out;
}
