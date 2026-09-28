// Markup builders for the small game "thumbnail boxes" used everywhere.
import { esc, gameUrl } from '../assets/js/core/util.js';
import { placeholder, remember } from './placeholder.js';

// real artwork when the game has it, otherwise the generated placeholder
export const thumbSrc = (g) => g.thumbnail || placeholder(g, 's');
export const imageSrc = (g) => g.image || g.thumbnail || placeholder(g, 'l');

export function badge(g) {
  if (g.new) return '<span class="badge new">NEW</span>';
  if (g.featured) return '<span class="badge top">TOP</span>';
  if (g.popular) return '<span class="badge hot">HOT</span>';
  return '';
}

export function thumbImg(g, cls = 'thumb') {
  remember(g);
  return `<img class="${cls}" src="${esc(thumbSrc(g))}" width="68" height="57" alt="${esc(g.title)}" loading="lazy" decoding="async" data-gid="${esc(g.id)}">`;
}

// feature picture (274x199 slot) - or any size given
export function bigImg(g, w = 274, h = 199, cls = '') {
  remember(g);
  return `<img${cls ? ` class="${cls}"` : ''} src="${esc(imageSrc(g))}" width="${w}" height="${h}" alt="${esc(g.title)}" decoding="async" data-gid="${esc(g.id)}" data-ph="l">`;
}

// "Play now" for installed games, "Not added yet" for catalogue-only entries
export function status(g) {
  return g.installed ? '<span class="st on">Play now</span>' : '<span class="st off">Not added yet</span>';
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
  const title = opts.title || (value ? value.toFixed(1) + ' out of 5' : 'Not rated yet');
  return `<span class="stars${opts.cls ? ' ' + opts.cls : ''}" title="${esc(title)}"><i style="width:${w}px"></i></span>`;
}
