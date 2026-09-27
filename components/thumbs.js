// Markup builders for the small game "thumbnail boxes" used everywhere.
import { esc, gameUrl } from '../assets/js/core/util.js';

export function badge(g) {
  if (g.new) return '<span class="badge new">NEW</span>';
  if (g.featured) return '<span class="badge top">TOP</span>';
  if (g.popular && g.popularity >= 90) return '<span class="badge hot">HOT</span>';
  return '';
}

export function thumbImg(g, cls = 'thumb') {
  return `<img class="${cls}" src="${esc(g.thumbnail)}" width="68" height="57" alt="${esc(g.title)}" loading="lazy" onerror="this.onerror=null;this.src='assets/games/_placeholder.png'">`;
}

// white box used in the blue "Latest Games" / "Hot Games" panels
export function tb(g, opts = {}) {
  return `<div class="tb"><a href="${gameUrl(g)}"><span class="tbw">${thumbImg(g)}${opts.badges ? badge(g) : ''}</span>${esc(g.title)}</a></div>`;
}

// light blue box used in category boxes
export function ct(g, opts = {}) {
  return `<div class="ct"><a href="${gameUrl(g)}"><span class="tbw">${thumbImg(g)}${opts.badges ? badge(g) : ''}</span>${esc(g.title)}</a></div>`;
}

export function link(g, cls = '') {
  return `<a href="${gameUrl(g)}"${cls ? ` class="${cls}"` : ''}>${esc(g.title)}</a>`;
}

// 5-star rating display, value 0-5 in half steps
export function stars(value, opts = {}) {
  const w = Math.round((Math.max(0, Math.min(5, value)) * 2)) / 2 * 11;
  const title = opts.title || (value ? value.toFixed(1) + ' out of 5' : 'Not rated');
  return `<span class="stars${opts.cls ? ' ' + opts.cls : ''}" title="${esc(title)}"><i style="width:${w}px"></i></span>`;
}
