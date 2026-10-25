// Simulação de Copa do Mundo usada pelo Leilão (mesma lógica do Dado da Copa).
const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const seeded = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const avg = a => a.length ? a.reduce((s, x) => s + x[2], 0) / a.length : 0;
const pois = (l, R) => { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= R(); } while (p > L); return k - 1; };
const strength = pl => { const a = p => avg(pl.filter(x => x[1] === p)); return { off: a('ATT') * .5 + a('MID') * .3 + a('DEF') * .2, def: a('GK') * .3 + a('DEF') * .45 + a('MID') * .25 }; };
const bestXI = sq => [['GK', 1], ['DEF', 4], ['MID', 3], ['ATT', 3]].flatMap(([p, n]) => sq.p.filter(x => x[1] === p).sort((a, b) => b[2] - a[2]).slice(0, n));
const poolOf = l => l.map(x => [x[0], { ATT: 5, MID: 2, DEF: .6, GK: 0 }[x[1]]]).filter(x => x[1] > 0);
function goals(n, pool, R) {
  const tot = pool.reduce((s, x) => s + x[1], 0), out = [];
  for (let i = 0; i < n; i++) { let r = R() * tot; for (const [nm, w] of pool) if ((r -= w) <= 0) { out.push(nm); break; } }
  return out;
}
const play = (a, b, R) => {
  const ga = pois(1.35 * Math.exp((a.s.off - b.s.def) / 12), R), gb = pois(1.35 * Math.exp((b.s.off - a.s.def) / 12), R);
  return { gf: ga, ga: gb, us: goals(ga, a.pool, R), them: goals(gb, b.pool, R) };
};
// lineup: [[nome, pos, nota], ...]; SQUADS: base do dados.js; o: { fmt: 32|48, style: 0-2, diff: 0-2, seed }
function campaign(lineup, SQUADS, o = {}) {
  const fmt = o.fmt || 48, style = o.style ?? 1, d = (o.diff ?? 1) * 2;
  const R = seeded(hash(String(o.seed || '') + lineup.map(x => x[0]).join()));
  const me = { s: strength(lineup), pool: poolOf(lineup) }; me.s.off += (style - 1) * 2; me.s.def -= (style - 1) * 2;
  const used = new Set();
  const opp = () => { const c = SQUADS.map((_, i) => i).filter(i => !used.has(i)); const i = c[Math.floor(R() * c.length)]; used.add(i);
    const sq = SQUADS[i], b = bestXI(sq), s = strength(b); s.off += d; s.def += d; return { name: sq.t + ' ' + sq.y, s, pool: poolOf(b) }; };
  const M = [], O = [opp(), opp(), opp()];
  const rows = [{ name: 'SEU TIME', me: 1 }, ...O.map(o => ({ name: o.name.toUpperCase() }))].map(r => ({ ...r, pts: 0, gf: 0, ga: 0 }));
  const add = (i, j, r) => { rows[i].gf += r.gf; rows[i].ga += r.ga; rows[j].gf += r.ga; rows[j].ga += r.gf;
    if (r.gf > r.ga) rows[i].pts += 3; else if (r.gf < r.ga) rows[j].pts += 3; else { rows[i].pts++; rows[j].pts++; } };
  O.forEach((x, k) => { const r = play(me, x, R); add(0, k + 1, r); M.push({ stage: 'Grupos', opp: x.name, ...r, won: r.gf > r.ga, draw: r.gf === r.ga }); });
  [[1, 2], [1, 3], [2, 3]].forEach(([i, j]) => add(i, j, play(O[i - 1], O[j - 1], R)));
  const tb = rows.map(r => ({ ...r, gd: r.gf - r.ga })).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  M[2].table = tb; const pos = tb.findIndex(r => r.me);
  let out = 'Fase de grupos';
  if (pos < 2 || (fmt === 48 && pos === 2 && tb[pos].pts >= 4)) {
    out = null;
    for (const stage of fmt === 48 ? ['16-avos', 'Oitavas', 'Quartas', 'Semi', 'Final'] : ['Oitavas', 'Quartas', 'Semi', 'Final']) {
      const x = opp(), r = play(me, x, R); let won = r.gf > r.ga, pen = false;
      if (r.gf === r.ga) { pen = true; won = R() < Math.min(.8, Math.max(.2, .5 + (me.s.off + me.s.def - x.s.off - x.s.def) / 80)); }
      M.push({ stage, opp: x.name, ...r, won, pen });
      if (!won) { out = stage; break; }
    }
  }
  const sc = {}; M.forEach(m => m.us.forEach(n => sc[n] = (sc[n] || 0) + 1));
  return { matches: M, res: { champ: !out, out, wins: M.filter(m => m.won).length, losses: M.filter(m => !m.won && !m.draw).length,
    gf: M.reduce((s, m) => s + m.gf, 0), ga: M.reduce((s, m) => s + m.ga, 0), rating: Math.round((me.s.off + me.s.def) / 2 * 10) / 10,
    top: Object.entries(sc).sort((a, b) => b[1] - a[1]).slice(0, 3) } };
}
module.exports = { campaign };
