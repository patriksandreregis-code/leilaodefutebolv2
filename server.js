const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');
const POOL = require('./craques.js'), copa = require('./copa.js');
let SQUADS = [];
try { SQUADS = new Function(fs.readFileSync(path.join(__dirname, 'dados.js'), 'utf8') + ';return SQUADS')(); } catch (e) { console.log('dados.js não carregado:', e.message); }

// ===== Opções que o anfitrião pode mudar =====
const FORMS = { 7: ['2-3-1', '3-2-1', '2-2-2'], 8: ['3-3-1', '2-3-2', '3-2-2'], 9: ['3-3-2', '4-3-1', '3-4-1'], 10: ['4-3-2', '3-4-2', '4-4-1', '3-3-3'], 11: ['4-3-3', '4-4-2', '3-5-2', '5-3-2', '4-5-1', '3-4-3'] };
const OPT = { budget: [100, 150, 200, 300, 500], size: [7, 8, 9, 10, 11], bidSec: [8, 12, 15, 20, 30], fmt: [32, 48] };
// Pacotes de craques (checkboxes na sala). Para criar um novo: adicione aqui e marque a "época" dos craques em craques.js.
const PACKS = [{ id: 'atuais', label: 'Craques atuais', era: 'A' }, { id: 'lendas', label: 'Lendas', era: 'L' }, { id: 'brasileirao', label: 'Brasileirão 2026 (mostra posição e clube)', era: 'B' }];
const ROLE = { GOL: 'goleiro', ZAG: 'zagueiro', LD: 'lateral-direito', LE: 'lateral-esquerdo', VOL: 'volante', MC: 'meio-campista', MEI: 'meia-atacante', PE: 'ponta-esquerda', PD: 'ponta-direita', CA: 'centroavante' };
// Moderação do chat: palavras ofensivas viram ***
const BAD = new Set(`porra caralho carai merda bosta foda foder fodido fodida fodase puta puto putaria fdp vsf vtnc tnc pqp cu cuzao buceta viado viada otario otaria idiota imbecil babaca arrombado arrombada corno corna escroto escrota vagabundo vagabunda cacete piranha vadia retardado mongol macaco desgracado nazista`.split(' ').map(w => norm(w)));
function norm(w) { return w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[@4]/g, 'a').replace(/3/g, 'e').replace(/1/g, 'i').replace(/0/g, 'o').replace(/[$5]/g, 's').replace(/(.)\1+/g, '$1'); }
const clean = t => t.replace(/[\p{L}\p{N}@$]+/gu, w => BAD.has(norm(w)) ? '*'.repeat(Math.max(3, w.length)) : w);
const NAME = { GK: 'goleiro', DEF: 'defensor', MID: 'meia', ATT: 'atacante' };
const T = +process.env.SPEEDUP || 1; // só para testes automáticos (acelera os tempos)
const PL = { GK: 'goleiros', DEF: 'defensores', MID: 'meias', ATT: 'atacantes' };
const MAX_PLAYERS = 8, RESET_MS = 6000 / T;
const FILE = path.join(process.env.DATA_DIR || __dirname, 'salas.json');

process.on('uncaughtException', e => console.error('Erro não tratado:', e));
process.on('unhandledRejection', e => console.error('Promessa rejeitada:', e));
const mi = n => n === 1 ? '1 milhão' : n + ' milhões';
const rooms = {};
const DEFAULT_CFG = { budget: 200, size: 9, form: '3-3-2', bidSec: 12, packs: ['atuais', 'lendas'], copa: false, torneio: false, fmt: 48 };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const send = (ws, m) => ws && ws.readyState === 1 && ws.send(JSON.stringify(m));
const slotsOf = r => { const [d, m, a] = r.cfg.form.split('-').map(Number); return { GK: 1, DEF: d, MID: m, ATT: a }; };
const unit = r => r.cfg.budget / 200;
const baseOf = (r, x, l) => { let b = Math.max(1, Math.round((x - 80) * unit(r))); if (l && l.round > 1) b = Math.max(1, Math.ceil(b / 2)); return b; }; // repescagem: preço pela metade
const floorOf = (r, x, l) => Math.max(1, Math.ceil(baseOf(r, x, l) / 2)); // primeiro lance pode ser a metade do preço inicial
const stockWarn = r => { // avisa quando estão acabando os craques de uma posição
  const out = [];
  for (const pos of Object.keys(slotsOf(r))) {
    const nd = r.players.reduce((s, p) => s + Math.max(0, need(r, p, pos)), 0); if (!nd) continue;
    const left = r.queue.filter(x => x[1] === pos).length + (r.lot && r.lot.pos === pos ? 1 : 0) + (r.round < 3 ? r.unsold.filter(x => x[1] === pos).length : 0);
    if (left <= nd + 2) out.push({ pos, left, need: nd, crit: left < nd });
  }
  return out;
};
const fairOf = (r, x) => Math.max(1, Math.round((x - 78) * 2.2 * unit(r)));
const need = (r, p, pos) => slotsOf(r)[pos] - p.squad.filter(x => x.pos === pos).length;
const maxBid = (r, p) => { const rem = r.cfg.size - p.squad.length; return rem <= 0 ? 0 : p.budget - (rem - 1); };
const score = p => p.squad.reduce((s, x) => s + x.r, 0);
const bidMs = r => r.cfg.bidSec * 1000 / T;
const firstOnline = (r, but) => r.players.find(x => x.ws && x.id !== but);

// ===== Estado enviado aos jogadores =====
function view(r) {
  const v = {
    code: r.code, phase: r.phase, host: r.host, cfg: r.cfg, slots: slotsOf(r), total: r.cfg.size, copaOk: SQUADS.length > 8, packs: PACKS, warn: r.phase === 'auction' ? stockWarn(r) : [], round: r.round,
    log: r.log.slice(-6), chat: r.chat.slice(-30),
    players: r.players.map(p => ({ id: p.id, name: p.name, budget: p.budget, squad: p.squad, on: !!p.ws, max: maxBid(r, p),
      need: Object.fromEntries(Object.keys(slotsOf(r)).map(k => [k, need(r, p, k)])) })),
    lot: r.lot && { n: r.lot.n, pos: r.lot.pos, r: r.lot.r, club: r.lot.club, role: r.lot.role, base: baseOf(r, r.lot.r, r.lot), floor: floorOf(r, r.lot.r, r.lot), bid: r.lot.bid, bidder: r.lot.bidder,
      left: r.lot.end - Date.now(), skips: r.lot.skips, skipNeed: r.players.filter(x => x.ws && need(r, x, r.lot.pos) > 0).length },
  };
  if (r.phase === 'end') {
    const d = r.sales.map(s => ({ ...s, fair: fairOf(r, s.r), v: fairOf(r, s.r) - s.price }));
    v.sales = d; v.best = [...d].sort((a, b) => b.v - a.v).slice(0, 3); v.worst = [...d].sort((a, b) => a.v - b.v).slice(0, 3); v.copaRes = r.copaRes; v.torneio = r.torneio;
  }
  return v;
}
const bc = r => { r.touched = Date.now(); r.players.forEach(p => send(p.ws, { t: 'state', you: p.id, ...view(r) })); save(); };
const say = (r, text, fx) => { r.log.push(text); r.players.forEach(p => send(p.ws, { t: 'say', text, fx })); bc(r); };

// ===== Persistência (sobrevive a reinícios quando o disco é mantido) =====
let saveT;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try {
      fs.writeFileSync(FILE, JSON.stringify(Object.values(rooms).map(r => ({ code: r.code, phase: r.phase, host: r.host, cfg: r.cfg, queue: r.queue, lot: r.lot, log: r.log, chat: r.chat,
        sales: r.sales, copaRes: r.copaRes, torneio: r.torneio, unsold: r.unsold, round: r.round, warned: r.warned, banned: r.banned, touched: r.touched, players: r.players.map(p => ({ id: p.id, name: p.name, budget: p.budget, squad: p.squad })) }))));
    } catch (e) {}
  }, 800);
}
function restore() {
  let list = []; try { list = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { return; }
  for (const o of list) {
    if (Date.now() - (o.touched || 0) > 24 * 3600e3) continue;
    const r = rooms[o.code] = { ...o, players: o.players.map(p => ({ ...p, ws: null })), timer: null, timers: [] };
    r.cfg = { ...DEFAULT_CFG, ...r.cfg }; r.unsold = r.unsold || []; r.round = r.round || 1; r.warned = r.warned || {};
    r.gapAt = Date.now();
    if (r.phase === 'auction') { if (r.lot) { r.lot.end = Date.now() + bidMs(r); arm(r); } else setTimeout(() => nextLot(r), 5000); }
  }
  console.log('Salas restauradas:', Object.keys(rooms).length);
}

// ===== Leilão =====
function arm(r) {
  clearTimeout(r.timer); (r.timers || []).forEach(clearTimeout); r.timers = [];
  const l = r.lot, left = l.end - Date.now();
  r.timer = setTimeout(() => close(r), Math.max(0, left));
  if (l.bidder) {
    if (left > 3500 / T) r.timers.push(setTimeout(() => r.lot === l && say(r, 'Dou-lhe uma!', 'once'), left - 3500 / T));
    if (left > 1800 / T) r.timers.push(setTimeout(() => r.lot === l && say(r, 'Dou-lhe duas!', 'twice'), left - 1800 / T));
  }
}
function nextLot(r) {
  let x;
  for (;;) { // pula craques que ninguém pode comprar; os que ninguém conseguiu pagar voltam na repescagem
    x = r.queue.shift(); if (!x) break;
    if (r.players.some(p => need(r, p, x[1]) > 0 && maxBid(r, p) >= floorOf(r, x[2], { round: r.round }))) break;
    if (r.players.some(p => need(r, p, x[1]) > 0)) r.unsold.push(x);
  }
  if (!x) {
    if (r.players.some(p => p.squad.length < r.cfg.size) && r.unsold.length && r.round < 3) { // acabaram os craques: os não vendidos voltam
      r.round++; r.queue = shuffle(r.unsold.splice(0)); r.warned = {}; r.gapAt = Date.now();
      say(r, `Rodada ${r.round}! Os craques que ficaram sem comprador voltam ao leilão com preço reduzido!`, 'gavel');
      return void setTimeout(() => r.phase === 'auction' && !r.lot && nextLot(r), 3500 / T);
    }
    r.phase = 'end'; r.lot = null;
    const w = [...r.players].sort((a, b) => score(b) - score(a) || b.budget - a.budget)[0];
    if (r.cfg.copa && SQUADS.length > 8) runCopa(r);
    if (r.cfg.torneio) runTorneio(r);
    return say(r, `Fim do leilão! O melhor time é de ${w ? w.name : '—'}!`, 'sold');
  }
  r.gapAt = null;
  r.lot = { n: x[0], pos: x[1], r: x[2], club: x[3], role: x[4], bid: 0, bidder: null, hist: [], skips: [], round: r.round, end: Date.now() + bidMs(r) };
  say(r, `Próximo jogador: ${x[0]}, ${x[4] ? ROLE[x[4]] + ', ' + x[3] : NAME[x[1]]}, nota ${x[2]}. Lance inicial: ${mi(baseOf(r, x[2], r.lot))}!`, 'gavel');
  for (const w of stockWarn(r)) if (!r.warned[w.pos]) { r.warned[w.pos] = 1; say(r, w.crit ? `Atenção! Faltam ${PL[w.pos]}: só restam ${w.left} para ${w.need} vagas.` : `Atenção! Estão acabando os ${PL[w.pos]}: restam ${w.left} para ${w.need} vagas.`); }
  arm(r);
}
function close(r) {
  clearTimeout(r.timer); (r.timers || []).forEach(clearTimeout);
  const l = r.lot; if (!l) return; r.lot = null; r.gapAt = Date.now();
  const p = l.bidder && r.players.find(x => x.id === l.bidder);
  if (p) {
    p.budget -= l.bid; p.squad.push({ n: l.n, pos: l.pos, r: l.r, price: l.bid, club: l.club, role: l.role });
    r.sales.push({ n: l.n, pos: l.pos, r: l.r, price: l.bid, buyer: p.name, club: l.club, role: l.role });
    say(r, `Vendido! ${l.n} vai para ${p.name} por ${mi(l.bid)}!`, 'sold');
  } else { r.unsold.push([l.n, l.pos, l.r, l.club, l.role]); say(r, `Ninguém quis ${l.n}. Vamos ao próximo!`, 'pass'); }
  setTimeout(() => r.phase === 'auction' && !r.lot && nextLot(r), 3500 / T);
}
function runTorneio(r) {
  const teams = r.players.filter(p => p.squad.length).map(p => ({ id: p.id, name: p.name, lineup: p.squad.map(x => [x.n, x.pos, x.r]) }));
  if (teams.length > 1) r.torneio = copa.league(teams, r.code + Date.now());
}
function runCopa(r) {
  const out = r.players.filter(p => p.squad.length).map(p => {
    const c = copa.campaign(p.squad.map(x => [x.n, x.pos, x.r]), SQUADS, { fmt: r.cfg.fmt, seed: r.code + p.id + Date.now() });
    return { id: p.id, name: p.name, ...c.res, matches: c.matches };
  });
  r.copaRes = out.sort((a, b) => b.champ - a.champ || b.matches.length - a.matches.length || b.wins - a.wins || (b.gf - b.ga) - (a.gf - a.ga));
}
function removePlayer(r, id, why) {
  const p = r.players.find(x => x.id === id); if (!p) return;
  send(p.ws, { t: 'kicked' }); try { p.ws && p.ws.close(); } catch (e) {} p.ws = null;
  r.players = r.players.filter(x => x !== p);
  if (why === 'kick') r.banned.push(p.name);
  if (r.host === id) r.host = (firstOnline(r) || r.players[0] || {}).id || null;
  if (!r.players.length) { clearTimeout(r.timer); delete rooms[r.code]; save(); return; }
  if (r.lot) {
    r.lot.hist = r.lot.hist.filter(h => h.bidder !== id); r.lot.skips = r.lot.skips.filter(x => x !== id);
    const h = r.lot.hist[r.lot.hist.length - 1]; r.lot.bid = h ? h.bid : 0; r.lot.bidder = h ? h.bidder : null; arm(r);
  }
  say(r, `${p.name} saiu da sala.`);
}

// ===== HTTP / WebSocket =====
const FILES = { '/': 'index.html', '/leilao': 'leilao.html', '/dado': 'dado.html', '/manager': 'manager.html', '/manager-teste': 'manager-teste.html', '/selecoes': 'selecoes.html', '/dados.js': 'dados.js', '/logo.png': 'logo.png', '/favicon.ico': 'favicon.ico', '/favicon-16x16.png': 'favicon-16x16.png', '/favicon-32x32.png': 'favicon-32x32.png', '/apple-touch-icon.png': 'apple-touch-icon.png', '/android-chrome-192x192.png': 'android-chrome-192x192.png', '/android-chrome-512x512.png': 'android-chrome-512x512.png', '/site.webmanifest': 'site.webmanifest' };
const server = http.createServer((q, s) => {
  const f = FILES[new URL(q.url, 'http://x').pathname];
  if (!f) { s.writeHead(404); return s.end('404'); }
  fs.readFile(path.join(__dirname, f), (e, d) => { if (e) { s.writeHead(404); return s.end('404'); } const type = f.endsWith('.js') ? 'text/javascript; charset=utf-8' : f.endsWith('.png') ? 'image/png' : f.endsWith('.ico') ? 'image/x-icon' : f.endsWith('.webmanifest') ? 'application/manifest+json; charset=utf-8' : 'text/html; charset=utf-8'; s.writeHead(200, { 'Content-Type': type }); s.end(d); });
});
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  let r, p;
  const err = text => send(ws, { t: 'err', text });
  const handle = d => {
    let m; try { m = JSON.parse(d); } catch { return; }
    if (m.t === 'join') {
      const code = String(m.room || '').toUpperCase().trim().slice(0, 8), name = String(m.name || '').trim().slice(0, 16);
      if (!code || !name) return err('Informe seu nome e o código da sala.');
      if (clean(name) !== name) return err('Nome não permitido.');
      if (!rooms[code] && m.re) return err('Essa sala não existe mais (o servidor reiniciou). Crie uma nova sala.');
      r = rooms[code] || (rooms[code] = { code, players: [], phase: 'lobby', queue: [], lot: null, log: [], chat: [], host: null, timer: null, timers: [], sales: [], copaRes: null, torneio: null, unsold: [], round: 1, warned: {}, banned: [], cfg: { ...DEFAULT_CFG } });
      if (r.banned.includes(name)) { r = null; return err('Você foi removido desta sala.'); }
      p = r.players.find(x => x.name === name); // mesmo nome = reconexão
      if (p) { p.ws = ws; }
      else if (r.phase !== 'lobby' || r.players.length >= MAX_PLAYERS) { r = null; return err('Sala em andamento ou cheia.'); }
      else { p = { id: Math.random().toString(36).slice(2, 8), name, ws, budget: r.cfg.budget, squad: [] }; r.players.push(p); }
      if (!r.host || !r.players.some(x => x.id === r.host)) r.host = p.id;
      bc(r);
    } else if (!r || !p) return;
    else if (m.t === 'cfg' && p.id === r.host && r.phase === 'lobby') {
      const c = r.cfg, k = m.k, v = m.v;
      if (k === 'copa') c.copa = !!v;
      else if (k === 'torneio') c.torneio = !!v;
      else if (k === 'packs') { const ids = (Array.isArray(v) ? v : []).filter(x => PACKS.some(p => p.id === x)); if (ids.length) c.packs = ids; }
      else if (k === 'form' && FORMS[c.size].includes(v)) c.form = v;
      else if (OPT[k] && OPT[k].includes(+v)) {
        c[k] = +v;
        if (k === 'budget') r.players.forEach(x => x.budget = c.budget);
        if (k === 'size' && !FORMS[c.size].includes(c.form)) c.form = FORMS[c.size][0];
      }
      bc(r);
    } else if (m.t === 'start' && p.id === r.host && r.phase === 'lobby') {
      const sl = slotsOf(r), eras = PACKS.filter(k => r.cfg.packs.includes(k.id)).map(k => k.era), pool0 = POOL.filter(x => eras.includes(x[3])),
        bNames = new Set(pool0.filter(x => x[3] === 'B').map(x => x[0])), pool = pool0.filter(x => x[3] === 'B' || !bNames.has(x[0])); // mesma pessoa em dois pacotes: vale a versão do Brasileirão
      for (const pos of Object.keys(sl)) {
        const have = pool.filter(x => x[1] === pos).length, want = r.players.length * sl[pos];
        if (have < want) return err(`Não há craques suficientes: faltam ${PL[pos]} (${have} disponíveis para ${want} vagas). Marque mais pacotes de craques, use menos jogadores ou outra formação.`);
      }
      r.phase = 'auction'; r.gapAt = Date.now(); r.log = []; r.sales = []; r.copaRes = null; r.torneio = null; r.unsold = []; r.round = 1; r.warned = {};
      r.queue = shuffle(pool.map(x => [x[0], x[1], x[2], x[4], x[5]]));
      say(r, 'O leilão vai começar! Boa sorte, cartolas!', 'gavel');
      setTimeout(() => r.phase === 'auction' && !r.lot && nextLot(r), 3000 / T);
    } else if (m.t === 'again' && p.id === r.host && r.phase === 'end') {
      r.phase = 'lobby'; r.log = []; r.sales = []; r.copaRes = null; r.torneio = null; r.unsold = []; r.round = 1; r.warned = {}; r.players.forEach(x => { x.budget = r.cfg.budget; x.squad = []; }); bc(r);
    } else if (m.t === 'copa' && p.id === r.host && r.phase === 'end' && !r.copaRes && SQUADS.length > 8) { runCopa(r); bc(r); }
    else if (m.t === 'torneio' && p.id === r.host && r.phase === 'end' && !r.torneio) { runTorneio(r); bc(r); }
    else if (m.t === 'kick' && p.id === r.host && m.id !== p.id) removePlayer(r, m.id, 'kick');
    else if (m.t === 'kickOffline' && p.id === r.host) r.players.filter(x => !x.ws && x.id !== p.id).forEach(x => removePlayer(r, x.id, 'kick'));
    else if (m.t === 'host' && p.id === r.host && r.players.some(x => x.id === m.id)) { r.host = m.id; say(r, `${r.players.find(x => x.id === m.id).name} agora é o anfitrião.`); }
    else if (m.t === 'chat') {
      const t = clean(String(m.text || '').trim().slice(0, 140)), now = Date.now();
      if (!t || now - (p.lastChat || 0) < 600) return; p.lastChat = now;
      r.chat.push({ n: p.name, t }); if (r.chat.length > 60) r.chat.shift(); bc(r);
    } else if (m.t === 'skip') {
      const l = r.lot; if (!l || l.bidder || need(r, p, l.pos) < 1) return;
      if (!l.skips.includes(p.id)) l.skips.push(p.id);
      if (r.players.filter(x => x.ws && need(r, x, l.pos) > 0).every(x => l.skips.includes(x.id))) close(r); else bc(r);
    } else if (m.t === 'bid') {
      const l = r.lot, a = Math.floor(+m.amount);
      if (!l) return err('O jogador acabou de ser vendido. Aguarde o próximo!');
      const minBid = l.bidder ? l.bid + 1 : floorOf(r, l.r, l);
      if (!(a > 0) || p.id === l.bidder || need(r, p, l.pos) < 1 || a > maxBid(r, p) || a < minBid) return err(`Lance inválido: mínimo € ${minBid}M, máximo € ${maxBid(r, p)}M.`);
      l.bid = a; l.bidder = p.id; l.hist.push({ bidder: p.id, bid: a }); l.end = Math.max(l.end, Date.now() + RESET_MS); arm(r);
      say(r, `${p.name} dá ${mi(a)} por ${l.n}!`, 'bid');
    }
  };
  ws.on('message', d => { try { handle(d); } catch (e) { console.error('Erro ao tratar mensagem:', e); } });
  ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; });
  ws.on('close', () => {
    if (!p || !r || p.ws !== ws) return;
    p.ws = null; const room = r, who = p; bc(room);
    setTimeout(() => { // anfitrião ausente por 15s: passa para outro jogador online
      if (rooms[room.code] === room && room.host === who.id && !who.ws) {
        const n = firstOnline(room, who.id);
        if (n) { room.host = n.id; say(room, `${n.name} agora é o anfitrião.`); }
      }
    }, 15000);
  });
});

// Batimento: derruba conexões mortas (ex.: celular que perdeu sinal) e mantém as ativas
setInterval(() => wss.clients.forEach(ws => {
  if (ws.isAlive === false) return ws.terminate();
  ws.isAlive = false; try { ws.ping(); ws.send(JSON.stringify({ t: 'hb' })); } catch (e) {}
}), 25000 / T);
// Vigia: se algum lote ficar preso ou o intervalo entre lotes não terminar, o servidor se corrige sozinho
setInterval(() => {
  for (const r of Object.values(rooms)) {
    try {
      if (r.phase !== 'auction') continue;
      if (r.lot && Date.now() - r.lot.end > 4000) { console.warn('Vigia: lote preso na sala', r.code); close(r); }
      else if (!r.lot && r.gapAt && Date.now() - r.gapAt > 9000) { console.warn('Vigia: sala presa entre lotes', r.code); r.gapAt = Date.now(); nextLot(r); }
    } catch (e) { console.error('Erro no vigia:', e); }
  }
}, 2000 / T);
restore();
server.listen(process.env.PORT || 3000, () => console.log('Leilão de Futebol no ar!'));
