// Client-side game search over title, description, developer and category.

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ');
}

export function searchGames(lib, query) {
  const q = norm(query).trim();
  if (!q) return [];
  const words = q.split(/\s+/).filter(Boolean);

  const results = [];
  for (const g of lib.games) {
    const title = norm(g.title);
    const catNames = g.cats.map((c) => norm((lib.cat(c) || {}).name || c) + ' ' + norm((lib.cat(c) || {}).title || '')).join(' ');
    const fields = {
      title,
      desc: norm(g.description + ' ' + g.instructions),
      dev: norm(g.developer),
      cat: catNames + ' ' + norm(g.cats.join(' ')),
    };
    let score = 0;
    let all = true;
    for (const w of words) {
      let s = 0;
      if (fields.title === w) s = 100;
      else if (fields.title.startsWith(w)) s = 60;
      else if ((' ' + fields.title).includes(' ' + w)) s = 40;
      else if (fields.title.includes(w)) s = 25;
      else if (fields.cat.includes(w)) s = 15;
      else if (fields.dev.includes(w)) s = 12;
      else if (fields.desc.includes(w)) s = 8;
      if (!s) { all = false; break; }
      score += s;
    }
    if (all) results.push({ g, score: score + lib.score(g) / 100 });
  }
  return results.sort((a, b) => b.score - a.score).map((r) => r.g);
}
