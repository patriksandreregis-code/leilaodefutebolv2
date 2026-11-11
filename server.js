const crypto = require('crypto');
const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');
const { AccessToken } = require('livekit-server-sdk');
const POOL = require('./craques.js'), copa = require('./copa.js');
const beatball = require('./resenha-ball-server.js');
const chessServer = require('./resenha-chess-server.js');
const { recordCompletedMatch } = require('./activity-counter.js');
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
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, ''); // ex.: https://resenhadofut.com.br (opcional; sem isso usa o endereço acessado)
const MAX_ROOMS = +process.env.MAX_ROOMS || 300, MAX_CONN_IP = +process.env.MAX_CONN_IP || 40, MAX_NEW_ROOMS_IP_HOUR = +process.env.MAX_NEW_ROOMS_IP_HOUR || 15; // limites por IP (celulares na mesma operadora podem dividir o IP)
const ipConns = {}, ipRooms = {};
const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{1,15}$/u;
const newToken = () => crypto.randomBytes(12).toString('base64url');
const escH = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DEFAULT_CFG = { budget: 200, size: 9, form: '3-3-2', bidSec: 12, packs: ['atuais', 'lendas'], copa: false, torneio: false, fmt: 48 };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const send = (ws, m) => ws && ws.readyState === 1 && ws.send(JSON.stringify(m));
async function verifyAuctionUser(accessToken) {
  if (!accessToken || !process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return null;
  try {
    const response = await fetch(process.env.SUPABASE_URL.replace(/\/$/, '') + '/auth/v1/user', {
      headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + accessToken }
    });
    if (!response.ok) return null;
    const user = await response.json();
    return user && user.id && user.email_confirmed_at ? user : null;
  } catch (e) { console.error('Falha ao validar conta do Leilão:', e.message); return null; }
}
async function verifyPalpitesAdmin(accessToken) {
  const user = await verifyAuctionUser(accessToken);
  const allowedEmail = String(process.env.PALPITES_ADMIN_EMAIL || '').trim().toLowerCase();
  if (!user || !allowedEmail || String(user.email || '').trim().toLowerCase() !== allowedEmail) return null;
  return user;
}

async function awardAuctionXP(r) {
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !process.env.SUPABASE_URL) {
    console.warn('[XP] SUPABASE_SECRET_KEY não configurada; XP do Leilão aguardando configuração.');
    return;
  }
  const eligible = r.players.filter(p => p.supabaseUserId && p.hasValidBid);
  if (eligible.length < 2 || new Set(eligible.map(p => p.supabaseUserId)).size < 2) return;
  const champion = eligible.slice().sort((a, b) => score(b) - score(a) || b.budget - a.budget)[0];
  const base = process.env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/';
  const headers = { apikey: secret, Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' };
  for (const p of eligible) {
    const winner = champion && champion.id === p.id;
    const xp = 10 + (winner ? 20 : 0);
    const eventId = 'leilao:' + r.code + ':' + p.supabaseUserId;
    try {
      const result = await fetch(base + 'game_results', { method: 'POST', headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify({ user_id: p.supabaseUserId, game_key: 'leilao', result_code: winner ? 'win' : 'completed', external_event_id: eventId, xp_awarded: xp }) });
      if (!result.ok) throw new Error('game_results HTTP ' + result.status + ': ' + (await result.text()).slice(0, 300));
      const history = await fetch(base + 'xp_history', { method: 'POST', headers,
        body: JSON.stringify({ user_id: p.supabaseUserId, game_key: 'leilao', event_key: winner ? 'leilao_winner' : 'leilao_completed', description: winner ? 'Concluiu uma disputa válida e venceu o Leilão de Futebol' : 'Concluiu uma disputa válida do Leilão de Futebol', xp_delta: xp, source_event_id: eventId }) });
      if (!history.ok) throw new Error('xp_history HTTP ' + history.status + ': ' + (await history.text()).slice(0, 300));
    } catch (e) { console.error('[XP] Não foi possível registrar XP do Leilão para', p.supabaseUserId, e.message); }
  }
}
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
const bc = r => { r.touched = Date.now(); r.players.forEach(p => send(p.ws, { t: 'state', you: p.id, token: p.token, ...view(r) })); save(); };
const say = (r, text, fx) => { r.log.push(text); r.players.forEach(p => send(p.ws, { t: 'say', text, fx })); bc(r); };

// ===== Persistência (sobrevive a reinícios quando o disco é mantido) =====
let saveT;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try {
      fs.writeFileSync(FILE, JSON.stringify(Object.values(rooms).map(r => ({ code: r.code, phase: r.phase, host: r.host, cfg: r.cfg, queue: r.queue, lot: r.lot, log: r.log, chat: r.chat,
        sales: r.sales, copaRes: r.copaRes, torneio: r.torneio, unsold: r.unsold, round: r.round, warned: r.warned, banned: r.banned, touched: r.touched, players: r.players.map(p => ({ id: p.id, name: p.name, token: p.token, supabaseUserId: p.supabaseUserId || null, hasValidBid: !!p.hasValidBid, budget: p.budget, squad: p.squad })) }))));
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
    if (r.players.length >= 2) recordCompletedMatch('leilao', 'leilao:' + r.code).catch(e => console.error('[Resenha Activity] Leilão:', e.message));
    const w = [...r.players].sort((a, b) => score(b) - score(a) || b.budget - a.budget)[0];
    if (r.players.filter(p => p.supabaseUserId && p.hasValidBid).length >= 2) awardAuctionXP(r);
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
const FILES = { '/palpites-teste': 'palpites-teste.html', '/': 'index.html', '/resenha-ball': 'resenha-ball.html', '/resenha-x': 'resenha-x.html', '/beatball': 'resenha-ball.html', '/leilao': 'leilao.html', '/dado': 'dado.html', '/manager': 'manager.html', '/manager-teste': 'manager-teste.html', '/jogos/leilao-de-futebol': 'jogos/leilao-de-futebol.html', '/jogos/dado-da-copa': 'jogos/dado-da-copa.html', '/jogos/resenha-ball': 'jogos/resenha-ball.html', '/jogos/resenha-x': 'jogos/resenha-x.html', '/jogos/resenha-manager': 'jogos/resenha-manager.html', '/plataforma': 'plataforma.html', '/sobre': 'sobre.html', '/conta': 'conta.html', '/ranking': 'ranking.html', '/ranking/como-funciona': 'ranking-como-funciona.html', '/selecoes': 'selecoes.html', '/dados.js': 'dados.js', '/logo.png': 'logo.png', '/favicon.ico': 'favicon.ico', '/favicon-16x16.png': 'favicon-16x16.png', '/favicon-32x32.png': 'favicon-32x32.png', '/apple-touch-icon.png': 'apple-touch-icon.png', '/android-chrome-192x192.png': 'android-chrome-192x192.png', '/android-chrome-512x512.png': 'android-chrome-512x512.png', '/site.webmanifest': 'site.webmanifest', '/og-image.png': 'og-image.png', '/nav.js': 'nav.js', '/scout': 'resenha-scout.html', '/jogos/resenha-scout': 'jogos/resenha-scout.html' };
const SEC = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(self), geolocation=(), payment=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://media.api-sports.io https://crests.football-data.org; connect-src 'self' ws: wss: https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};
const siteOf = q => SITE_URL || (String(q.headers['x-forwarded-proto'] || 'http').split(',')[0] + '://' + q.headers.host);
function squadsHtml() { // lista de elencos já pronta no HTML (os buscadores leem o texto)
  const g = {}; SQUADS.forEach(x => (g[x.t] = g[x.t] || []).push(x));
  return Object.keys(g).sort((a, b) => a.localeCompare(b, 'pt')).map(n => `<details><summary>${escH(n)} <span>${g[n].map(x => x.y).sort().join(' · ')}</span></summary>` +
    g[n].sort((a, b) => a.y - b.y).map(x => `<h3>Copa ${x.y}</h3>` + x.p.map(p => `<span class="chip">${escH(p[0])} <b>${p[2]}</b> <span class="mu">${p[1]}</span></span>`).join('')).join('') + '</details>').join('');
}
const server = http.createServer(async (q, s) => {
  const pth = new URL(q.url, 'http://x').pathname, site = siteOf(q), hdr = { ...SEC };
  if (String(q.headers['x-forwarded-proto'] || '').startsWith('https')) hdr['Strict-Transport-Security'] = 'max-age=31536000';

  if ((pth === '/api/palpites/me' || pth === '/api/palpites/matches' || pth === '/api/palpites/prediction') && (q.method === 'GET' || q.method === 'POST')) {
    const sendJson = (code, data) => { s.writeHead(code, { ...hdr, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); s.end(JSON.stringify(data)); };
    const token = String(q.headers.authorization || '').replace(/^Bearer\\s+/i, '');
    const user = await verifyPalpitesAdmin(token);
    if (!user) return sendJson(403, { error: 'Área de testes restrita ao administrador autorizado.' });
    if (pth === '/api/palpites/me') return sendJson(200, { ok: true, email: user.email });
    const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const apiToken = process.env.FOOTBALL_DATA_API_TOKEN;
    if (!secret || !process.env.SUPABASE_URL) return sendJson(503, { error: 'Banco de dados ainda não configurado para os palpites.' });
    const season = 2026;
    const base = process.env.SUPABASE_URL.replace(/\\/$/, '') + '/rest/v1/';
    const dbHeaders = { apikey: secret, Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json' };
    if (pth === '/api/palpites/matches') {
      if (!apiToken) return sendJson(503, { error: 'Configure FOOTBALL_DATA_API_TOKEN no servidor para carregar o Brasileirão.' });
      try {
        if (!globalThis.__resenhaPalpitesCache || Date.now() - globalThis.__resenhaPalpitesCache.at > 5 * 60 * 1000) {
          const response = await fetch('https://api.football-data.org/v4/competitions/BSA/matches?season=' + season, {
            headers: { 'X-Auth-Token': apiToken }, signal: AbortSignal.timeout(12000)
          });
          if (!response.ok) throw new Error('football-data.org HTTP ' + response.status + ': ' + (await response.text()).slice(0, 250));
          const data = await response.json();
          globalThis.__resenhaPalpitesCache = { at: Date.now(), matches: (data.matches || []).map(m => ({
            id: m.id, season: m.season && m.season.startDate ? Number(m.season.startDate.slice(0,4)) : season,
            matchday: m.matchday, utcDate: m.utcDate, status: m.status,
            homeTeam: { id: m.homeTeam && m.homeTeam.id, name: m.homeTeam && m.homeTeam.name, shortName: m.homeTeam && m.homeTeam.shortName, crest: m.homeTeam && m.homeTeam.crest },
            awayTeam: { id: m.awayTeam && m.awayTeam.id, name: m.awayTeam && m.awayTeam.name, shortName: m.awayTeam && m.awayTeam.shortName, crest: m.awayTeam && m.awayTeam.crest },
            score: m.score && m.score.fullTime ? { home: m.score.fullTime.home, away: m.score.fullTime.away } : null
          })) };
        }
        const predictionResponse = await fetch(base + 'resenha_palpites_predictions?select=match_id,matchday,predicted_home_score,predicted_away_score,actual_home_score,actual_away_score,match_status,settled_at&season=eq.' + season + '&user_id=eq.' + encodeURIComponent(user.id) + '&order=matchday.asc', { headers: dbHeaders });
        if (!predictionResponse.ok) throw new Error('Supabase HTTP ' + predictionResponse.status + ': ' + (await predictionResponse.text()).slice(0,250));
        const predictions = await predictionResponse.json();
        return sendJson(200, { season, matches: globalThis.__resenhaPalpitesCache.matches, predictions });
      } catch (error) {
        console.error('[Palpites] Falha ao carregar partidas:', error.message);
        return sendJson(502, { error: 'Não foi possível carregar as partidas agora. ' + error.message.slice(0,180) });
      }
    }
    if (pth === '/api/palpites/prediction' && q.method === 'POST') {
      let raw = '';
      q.on('data', chunk => { raw += chunk; if (raw.length > 5000) q.destroy(); });
      q.on('end', async () => {
        let body; try { body = JSON.parse(raw || '{}'); } catch { return sendJson(400, { error: 'Dados inválidos.' }); }
        const matchId = Number(body.matchId), home = Number(body.home), away = Number(body.away);
        if (!Number.isSafeInteger(matchId) || !Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0 || home > 20 || away > 20) return sendJson(400, { error: 'Informe um placar válido entre 0 e 20.' });
        try {
          if (!globalThis.__resenhaPalpitesCache || Date.now() - globalThis.__resenhaPalpitesCache.at > 5 * 60 * 1000) {
            if (!apiToken) return sendJson(503, { error: 'API de partidas não configurada.' });
            const response = await fetch('https://api.football-data.org/v4/competitions/BSA/matches?season=' + season, { headers: { 'X-Auth-Token': apiToken }, signal: AbortSignal.timeout(12000) });
            if (!response.ok) throw new Error('football-data.org HTTP ' + response.status);
            const data = await response.json();
            globalThis.__resenhaPalpitesCache = { at: Date.now(), matches: (data.matches || []).map(m => ({ id:m.id, matchday:m.matchday, utcDate:m.utcDate, status:m.status, homeTeam:m.homeTeam, awayTeam:m.awayTeam, score:m.score && m.score.fullTime })) };
          }
          const match = globalThis.__resenhaPalpitesCache.matches.find(m => m.id === matchId);
          if (!match) return sendJson(404, { error: 'Partida não encontrada na temporada.' });
          if (new Date(match.utcDate).getTime() <= Date.now() || !['SCHEDULED','TIMED'].includes(match.status)) return sendJson(409, { error: 'Os palpites desta partida já estão encerrados.' });
          const payload = { season, match_id: matchId, matchday: match.matchday, user_id: user.id,
            home_team_id: match.homeTeam.id, away_team_id: match.awayTeam.id,
            home_team_name: match.homeTeam.name, away_team_name: match.awayTeam.name,
            home_crest: match.homeTeam.crest || null, away_crest: match.awayTeam.crest || null,
            kickoff_at: match.utcDate, predicted_home_score: home, predicted_away_score: away,
            match_status: match.status, updated_at: new Date().toISOString() };
          const saved = await fetch(base + 'resenha_palpites_predictions?on_conflict=season,match_id,user_id', {
            method: 'POST', headers: { ...dbHeaders, Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(payload)
          });
          if (!saved.ok) throw new Error('Supabase HTTP ' + saved.status + ': ' + (await saved.text()).slice(0,250));
          return sendJson(200, { ok: true, prediction: (await saved.json())[0] });
        } catch (error) {
          console.error('[Palpites] Falha ao salvar palpite:', error.message);
          return sendJson(500, { error: 'Não foi possível salvar o palpite.' });
        }
      });
      return;
    }
  }

  if (pth === '/api/config/supabase' && q.method === 'GET') {
    const configured = !!(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);
    s.writeHead(200, { ...hdr, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return s.end(JSON.stringify({ configured, url: configured ? process.env.SUPABASE_URL : null, publishableKey: configured ? process.env.SUPABASE_PUBLISHABLE_KEY : null }));
  }

  if ((pth === '/api/scout/start' || pth === '/api/scout/guess' || pth === '/api/scout/hint') && q.method === 'POST') {
    const sendJson = (code, data) => { s.writeHead(code, { ...hdr, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); s.end(JSON.stringify(data)); };
    let raw = '', tooLarge = false;
    q.on('data', chunk => { if (raw.length + chunk.length > 6000) tooLarge = true; else raw += chunk; });
    q.on('end', async () => {
      if (tooLarge) return sendJson(413, { error: 'Solicitação muito grande.' });
      let body; try { body = JSON.parse(raw || '{}'); } catch { return sendJson(400, { error: 'Dados inválidos.' }); }
      const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!secret || !process.env.SUPABASE_URL) return sendJson(503, { error: 'O Resenha Scout ainda não está conectado ao banco.' });
      const base = process.env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/';
      const headers = { apikey: secret, Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json' };
      try {
        const accessToken = String(body.accessToken || '');
        const user = accessToken ? await verifyAuctionUser(accessToken) : null;
        if (accessToken && !user) return sendJson(401, { error: 'Sua sessão expirou. Entre novamente na sua conta.' });
        const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
        const dateValues = Object.fromEntries(dateParts.map(part => [part.type, part.value]));
        const date = dateValues.year + '-' + dateValues.month + '-' + dateValues.day;

        if (pth === '/api/scout/start') {
          const playersResponse = await fetch(base + 'scout_players?select=id&active=eq.true&order=id.asc', { headers });
          if (!playersResponse.ok) throw new Error('Não foi possível carregar a base de jogadores: ' + (await playersResponse.text()).slice(0,200));
          const players = await playersResponse.json();
          if (!players.length) return sendJson(503, { error: 'A base de jogadores ainda não foi preenchida.' });
          // Evita repetir o mesmo craque em desafios recentes. Com 72 nomes ativos,
          // a janela de 30 dias reduz bastante a repetição sem esgotar o catálogo.
          const cutoffDate = new Date(date + 'T12:00:00Z');
          cutoffDate.setUTCDate(cutoffDate.getUTCDate() - 30);
          const cutoff = cutoffDate.toISOString().slice(0,10);
          const recentResponse = await fetch(base + 'scout_daily_challenges?select=player_id&challenge_date=gte.' + cutoff + '&challenge_date=lt.' + date, { headers });
          if (!recentResponse.ok) throw new Error('Não foi possível consultar os desafios recentes: ' + (await recentResponse.text()).slice(0,200));
          const recentRows = await recentResponse.json();
          const recentIds = new Set(recentRows.map(row => row.player_id));
          const freshPlayers = players.filter(player => !recentIds.has(player.id));
          const selectionPool = freshPlayers.length ? freshPlayers : players;
          const dayHash = crypto.createHash('sha256').update('resenha-scout:' + date).digest();
          const selected = selectionPool[dayHash.readUInt32BE(0) % selectionPool.length].id;
          const dailyWrite = await fetch(base + 'scout_daily_challenges', { method: 'POST', headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ challenge_date: date, player_id: selected }) });
          if (!dailyWrite.ok) throw new Error('Não foi possível preparar o desafio diário: ' + (await dailyWrite.text()).slice(0,200));
          const challengeResponse = await fetch(base + 'scout_daily_challenges?select=player_id&challenge_date=eq.' + date, { headers });
          const challenge = (await challengeResponse.json())[0];
          if (!challenge) throw new Error('Desafio diário indisponível.');
          let session = null;
          if (user) {
            const existing = await fetch(base + 'scout_sessions?select=id,access_token,guesses,attempts,finished,won,xp_awarded,clues_revealed&user_id=eq.' + user.id + '&challenge_date=eq.' + date + '&limit=1', { headers });
            const rows = await existing.json();
            session = rows[0] || null;
          } else if (body.sessionId && body.accessKey) {
            const guestExisting = await fetch(base + 'scout_sessions?select=id,access_token,guesses,attempts,finished,won,xp_awarded,clues_revealed&user_id=is.null&id=eq.' + encodeURIComponent(String(body.sessionId)) + '&access_token=eq.' + encodeURIComponent(String(body.accessKey)) + '&challenge_date=eq.' + date, { headers });
            const guestRows = await guestExisting.json();
            session = guestRows[0] || null;
          }
          if (!session) {
            const created = await fetch(base + 'scout_sessions?select=id,access_token,guesses,attempts,finished,won,xp_awarded', { method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ challenge_date: date, player_id: challenge.player_id, user_id: user ? user.id : null }) });
            if (!created.ok) throw new Error('Não foi possível iniciar a sessão: ' + (await created.text()).slice(0,200));
            session = (await created.json())[0];
          }
          const playerResponse = await fetch(base + 'scout_players?select=clues,name,nationality,position,birth_year,profile&id=eq.' + challenge.player_id, { headers });
          let playerInfo = null;
          if (playerResponse.ok) playerInfo = (await playerResponse.json())[0] || null;
          const response = { date, sessionId: session.id, accessKey: session.access_token, attempts: session.attempts, guesses: session.guesses, finished: session.finished, won: session.won, xp: session.xp_awarded, clue: playerInfo ? playerInfo.clues[Math.max(0, Math.min(Math.max(session.attempts + 1, session.clues_revealed || 1), 6) - 1)] : 'A primeira pista está pronta.', clueNumber: Math.max(session.attempts + 1, session.clues_revealed || 1), cluesRevealed: Math.max(session.attempts + 1, session.clues_revealed || 1), loggedIn: !!user };
          if (session.finished && playerInfo) response.result = { finished:true, won:session.won, attempts:session.attempts, xp:session.xp_awarded, answer:playerInfo.name, nationality:playerInfo.nationality, position:playerInfo.position, birth_year:playerInfo.birth_year, profile:playerInfo.profile };
          return sendJson(200, response);
        }

        const sessionId = String(body.sessionId || '');
        const accessKey = String(body.accessKey || '');
        const guess = String(body.guess || '').trim().slice(0,80);
        if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !/^[0-9a-f-]{36}$/i.test(accessKey) || (pth === '/api/scout/guess' && !guess)) return sendJson(400, { error: 'Palpite ou sessão inválida.' });
        const sessionResponse = await fetch(base + 'scout_sessions?select=id,user_id,access_token&id=eq.' + sessionId + '&access_token=eq.' + accessKey, { headers });
        if (!sessionResponse.ok) throw new Error('Não foi possível validar sua sessão.');
        const sessionRows = await sessionResponse.json();
        if (!sessionRows[0]) return sendJson(403, { error: 'Sessão inválida. Inicie o desafio novamente.' });
        if (user && sessionRows[0].user_id !== user.id) return sendJson(403, { error: 'Esta sessão não pertence à sua conta.' });
        if (!user && sessionRows[0].user_id) return sendJson(401, { error: 'Entre na conta usada para iniciar este desafio.' });
        if (pth === '/api/scout/hint') {
          const hintResponse = await fetch(base + 'rpc/scout_reveal_clue', { method: 'POST', headers, body: JSON.stringify({ p_session_id: sessionId, p_user_id: user ? user.id : null }) });
          const hint = await hintResponse.json().catch(() => ({}));
          if (!hintResponse.ok) return sendJson(400, { error: hint.message || 'Não foi possível revelar a próxima pista.' });
          return sendJson(200, hint);
        }
        const resultResponse = await fetch(base + 'rpc/scout_submit_guess', { method: 'POST', headers, body: JSON.stringify({ p_session_id: sessionId, p_guess: guess, p_user_id: user ? user.id : null }) });
        const result = await resultResponse.json().catch(() => ({}));
        if (!resultResponse.ok) return sendJson(400, { error: result.message || 'Não foi possível validar esse palpite.' });
        return sendJson(200, result);
      } catch (e) {
        console.error('[Scout] Erro:', e.message);
        return sendJson(500, { error: 'Ocorreu um erro ao processar o desafio. Tente novamente.' });
      }
    });
    return;
  }

  if (pth === '/api/dado/complete' && q.method === 'POST') {
    const sendJson = (code, data) => { s.writeHead(code, { ...hdr, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); s.end(JSON.stringify(data)); };
    let raw = '', tooLarge = false;
    q.on('data', chunk => { if (raw.length + chunk.length > 12000) tooLarge = true; else raw += chunk; });
    q.on('end', async () => {
      if (tooLarge) return sendJson(413, { error: 'Solicitação muito grande.' });
      let body; try { body = JSON.parse(raw || '{}'); } catch { return sendJson(400, { error: 'Dados inválidos.' }); }
      const user = await verifyAuctionUser(String(body.accessToken || ''));
      if (!user) return sendJson(401, { error: 'Entre na sua conta do Resenha do Fut com e-mail confirmado para receber XP.' });
      const mode = body.mode === 'daily' ? 'daily' : body.mode === 'free' ? 'free' : null;
      const seed = String(body.seed || '').toUpperCase();
      const form = String(body.form || '');
      const style = Number(body.style), diff = Number(body.diff), fmt = Number(body.fmt);
      const forms = { '4-3-3': [1,4,3,3], '4-4-2': [1,4,4,2], '3-5-2': [1,3,5,2], '5-3-2': [1,5,3,2], '4-5-1': [1,4,5,1], '3-4-3': [1,3,4,3] };
      const expected = forms[form], lineup = body.lineup;
      if (!mode || !expected || !Array.isArray(lineup) || lineup.length !== 11 ||
          !Number.isInteger(style) || style < 0 || style > 2 ||
          !Number.isInteger(diff) || diff < 0 || diff > 2 || ![32,48].includes(fmt) ||
          !/^[A-Z0-9]{4,12}$/.test(seed)) return sendJson(400, { error: 'Dados da campanha inválidos.' });
      const counts = { GK: 0, DEF: 0, MID: 0, ATT: 0 }, seen = new Set(), cleanLineup = [];
      for (const item of lineup) {
        if (!item || typeof item.name !== 'string' || !['GK','DEF','MID','ATT'].includes(item.pos) || !Number.isFinite(item.rating)) return sendJson(400, { error: 'Escalação inválida.' });
        const name = item.name.trim();
        if (seen.has(name)) return sendJson(400, { error: 'Há jogadores repetidos na escalação.' });
        const found = SQUADS.flatMap(sq => sq.p).find(p => p[0] === name && p[1] === item.pos && p[2] === item.rating);
        if (!found) return sendJson(400, { error: 'A escalação contém jogador ou nota inválida.' });
        seen.add(name); counts[item.pos]++; cleanLineup.push([found[0], found[1], found[2]]);
      }
      if (counts.GK !== expected[0] || counts.DEF !== expected[1] || counts.MID !== expected[2] || counts.ATT !== expected[3]) return sendJson(400, { error: 'A formação não corresponde à escalação.' });
      const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      const dateValues = Object.fromEntries(dateParts.map(part => [part.type, part.value]));
      const date = dateValues.year + '-' + dateValues.month + '-' + dateValues.day;
      if (mode === 'daily' && seed !== date.replace(/-/g, '')) return sendJson(400, { error: 'O sorteio do Desafio do Dia não corresponde à data atual.' });
      const campaign = copa.campaign(cleanLineup, SQUADS, { fmt, style, diff, seed });
      const fingerprint = crypto.createHash('sha256').update(JSON.stringify({ mode, date, seed, form, style, diff, fmt, lineup: cleanLineup })).digest('hex');
      const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!secret || !process.env.SUPABASE_URL) return sendJson(503, { error: 'O serviço de XP ainda não está configurado no servidor.' });
      try {
        const response = await fetch(process.env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/rpc/award_dado_xp', {
          method: 'POST',
          headers: { apikey: secret, Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_user_id: user.id, p_claim_date: date, p_mode: mode, p_campaign_id: fingerprint, p_champion: campaign.res.champ })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error('Supabase RPC HTTP ' + response.status + ': ' + JSON.stringify(result).slice(0, 300));
        return sendJson(200, { ...result, champion: campaign.res.champ });
      } catch (e) {
        console.error('[XP] Falha ao registrar Dado da Copa:', e.message);
        return sendJson(500, { error: 'Não foi possível registrar o XP agora. Sua campanha foi concluída; tente atualizar o ranking em instantes.' });
      }
    });
    return;
  }
  if (pth === '/api/leilao-voice/token' && q.method === 'POST') {
    const sendJson = (code, data) => { s.writeHead(code, { ...hdr, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); s.end(JSON.stringify(data)); };
    let raw = '', tooLarge = false;
    q.on('data', chunk => { if (raw.length + chunk.length > 4096) tooLarge = true; else raw += chunk; });
    q.on('end', async () => {
      if (tooLarge) return sendJson(413, { error: 'Solicitação muito grande.' });
      let body; try { body = JSON.parse(raw || '{}'); } catch { return sendJson(400, { error: 'Dados inválidos.' }); }
      const code = String(body.code || '').toUpperCase().trim().slice(0, 8);
      const playerId = String(body.playerId || '').slice(0, 32);
      const auctionRoom = rooms[code];
      const player = auctionRoom && auctionRoom.players.find(p => p.id === playerId);
      if (!auctionRoom || !player || !player.ws || player.ws.readyState !== 1) return sendJson(403, { error: 'Entre primeiro em uma sala online do Leilão de Futebol.' });
      if (!process.env.LIVEKIT_URL || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
        return sendJson(503, { error: 'O serviço de voz ainda não foi configurado no servidor.' });
      }
      try {
        const voiceRoom = 'leilao-' + code.toLowerCase();
        const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, { identity: player.id, name: player.name, ttl: '10m' });
        token.addGrant({ roomJoin: true, room: voiceRoom, canPublish: true, canSubscribe: true });
        const participantToken = await token.toJwt();
        return sendJson(200, { server_url: process.env.LIVEKIT_URL, participant_token: participantToken, room: voiceRoom });
      } catch (e) {
        console.error('Erro ao gerar token de voz do Leilão:', e.message);
        return sendJson(500, { error: 'Não foi possível preparar a conexão de voz.' });
      }
    });
    return;
  }
  if (pth === '/api/chess-voice/token' && q.method === 'POST') {
    const sendJson = (code, data) => { s.writeHead(code, { ...hdr, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); s.end(JSON.stringify(data)); };
    let raw = '', tooLarge = false;
    q.on('data', chunk => { if (raw.length + chunk.length > 4096) tooLarge = true; else raw += chunk; });
    q.on('end', async () => {
      if (tooLarge) return sendJson(413, { error: 'Solicitação muito grande.' });
      let body; try { body = JSON.parse(raw || '{}'); } catch { return sendJson(400, { error: 'Dados inválidos.' }); }
      const participant = chessServer.getVoiceParticipant(body.code, body.playerId, body.reconnectToken);
      if (!participant) return sendJson(403, { error: 'Entre em uma partida online com os dois jogadores conectados antes de ativar o Voice.' });
      if (!process.env.LIVEKIT_URL || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) return sendJson(503, { error: 'O serviço de voz ainda não foi configurado no servidor.' });
      try {
        const voiceRoom = 'chess-' + participant.code.toLowerCase();
        const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, { identity: participant.id, name: participant.name, ttl: '10m' });
        token.addGrant({ roomJoin: true, room: voiceRoom, canPublish: true, canSubscribe: true });
        const participantToken = await token.toJwt();
        return sendJson(200, { server_url: process.env.LIVEKIT_URL, participant_token: participantToken, room: voiceRoom });
      } catch (e) {
        console.error('[Resenha Chess] Erro ao gerar token Voice:', e.message);
        return sendJson(500, { error: 'Não foi possível preparar a chamada de voz.' });
      }
    });
    return;
  }
  if (pth === '/api/resenha-voice/token' && q.method === 'POST') {
    const sendJson = (code, data) => { s.writeHead(code, { ...hdr, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); s.end(JSON.stringify(data)); };
    let raw = '', tooLarge = false;
    q.on('data', chunk => { if (raw.length + chunk.length > 4096) tooLarge = true; else raw += chunk; });
    q.on('end', async () => {
      if (tooLarge) return sendJson(413, { error: 'Solicitação muito grande.' });
      let body; try { body = JSON.parse(raw || '{}'); } catch { return sendJson(400, { error: 'Dados inválidos.' }); }
      const code = String(body.code || '').toUpperCase().trim().slice(0, 8);
      const playerId = String(body.playerId || '').slice(0, 32);
      const mode = body.mode === 'team' ? 'team' : 'all';
      const room = beatball.rooms.get(code);
      const player = room && room.players.get(playerId);
      if (!room || !player || !player.ws || player.ws.readyState !== 1) return sendJson(403, { error: 'Entre primeiro em uma sala online do Resenha Ball.' });
      if (!process.env.LIVEKIT_URL || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
        return sendJson(503, { error: 'O serviço de voz ainda não foi configurado no servidor.' });
      }
      try {
        const voiceRoom = mode === 'team' ? 'resenha-' + code.toLowerCase() + '-team-' + player.team : 'resenha-' + code.toLowerCase();
        const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
          identity: player.id, name: player.name, ttl: '10m',
          metadata: JSON.stringify({ team: player.team })
        });
        token.addGrant({ roomJoin: true, room: voiceRoom, canPublish: true, canSubscribe: true });
        const participantToken = await token.toJwt();
        return sendJson(200, { server_url: process.env.LIVEKIT_URL, participant_token: participantToken, room: voiceRoom });
      } catch (e) {
        console.error('Erro ao gerar token Resenha Voice:', e.message);
        return sendJson(500, { error: 'Não foi possível preparar a conexão de voz.' });
      }
    });
    return;
  }
  if (pth === '/palpites-teste') { hdr['X-Robots-Tag'] = 'noindex, nofollow, noarchive'; }
  if (pth === '/robots.txt') { s.writeHead(200, { ...hdr, 'Content-Type': 'text/plain; charset=utf-8' }); return s.end(`User-agent: *\nAllow: /\nDisallow: /manager-teste\nDisallow: /*?sala=\n\nSitemap: ${site}/sitemap.xml\n`); }
  if (pth === '/sitemap.xml') {
    s.writeHead(200, { ...hdr, 'Content-Type': 'application/xml; charset=utf-8' });
    return s.end('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ['/', '/leilao', '/dado', '/selecoes', '/beatball', '/jogos/leilao-de-futebol', '/jogos/dado-da-copa', '/jogos/resenha-ball', '/jogos/resenha-manager', '/jogos/resenha-x', '/jogos/resenha-scout', '/scout', '/resenha-x', '/plataforma', '/sobre', '/conta', '/ranking'].map(u => `<url><loc>${site}${u}</loc></url>`).join('') + '</urlset>');
  }
  const clubLogoMatch = pth.match(/^\/club-logos\/(\d+)\.png$/);
  if (clubLogoMatch && q.method === 'GET') {
    const allowedClubLogoIds = new Set([127,131,121,126,128,133,130,119,135,1065,541,529,50,40,33,157,85,42,49,496]);
    const teamId = Number(clubLogoMatch[1]);
    if (!allowedClubLogoIds.has(teamId)) { s.writeHead(404, hdr); return s.end('Not found'); }
    try {
      const upstream = await fetch('https://media.api-sports.io/football/teams/' + teamId + '.png', { signal: AbortSignal.timeout(8000) });
      if (!upstream.ok) { s.writeHead(502, { ...hdr, 'Cache-Control': 'no-store' }); return s.end('Logo indisponível'); }
      const image = Buffer.from(await upstream.arrayBuffer());
      const contentType = upstream.headers.get('content-type') || 'image/png';
      if (!contentType.startsWith('image/')) { s.writeHead(502, hdr); return s.end('Resposta de imagem inválida'); }
      s.writeHead(200, { ...hdr, 'Content-Type': contentType, 'Cache-Control': 'public, max-age=604800', 'Content-Length': image.length });
      return s.end(image);
    } catch (error) {
      console.error('Falha ao obter escudo do clube ' + teamId + ':', error.message);
      s.writeHead(502, { ...hdr, 'Cache-Control': 'no-store' }); return s.end('Falha ao obter escudo');
    }
  }
  const f = FILES[pth];
  if (!f) { s.writeHead(404, { ...hdr, 'Content-Type': 'text/plain; charset=utf-8' }); return s.end('404'); }
  fs.readFile(path.join(__dirname, f), (e, d) => {
    if (e) { s.writeHead(404, hdr); return s.end('404'); }
    const type = f.endsWith('.js') ? 'text/javascript; charset=utf-8' : f.endsWith('.png') ? 'image/png' : f.endsWith('.ico') ? 'image/x-icon' : f.endsWith('.webmanifest') ? 'application/manifest+json; charset=utf-8' : 'text/html; charset=utf-8';
    if (type.startsWith('text/html')) {
      let h = d.toString('utf8').split('{{SITE}}').join(site);
      if (f === 'selecoes.html') h = h.replace('<!--SQUADS-->', squadsHtml()).replace('{{N_SQUADS}}', SQUADS.length).replace('{{N_TEAMS}}', new Set(SQUADS.map(x => x.t)).size);
      d = Buffer.from(h);
    }
    s.writeHead(200, { ...hdr, 'Content-Type': type, 'Cache-Control': type.startsWith('image') || type.includes('manifest') ? 'public, max-age=86400' : type.includes('javascript') ? 'public, max-age=3600' : 'no-cache' }); s.end(d);
  });
});
const wss = new WebSocketServer({ server, maxPayload: 4096, verifyClient: ({ origin, req }) => {
  if (!origin) return true; // clientes que não são navegador
  try { const h = new URL(origin).host; return h === req.headers.host || (!!SITE_URL && h === new URL(SITE_URL).host); } catch { return false; }
} });

wss.on('connection', (ws, req) => {
  const wsPath = new URL(req.url, 'http://x').pathname;
  // O heartbeat precisa valer também para o Resenha Ball.
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('error', e => console.error('[WS] Erro:', wsPath, e.message));
  console.log('[WS] Conexão aberta:', wsPath, req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'IP desconhecido');
  if (wsPath === '/resenha-ball-ws') return beatball.connect(ws);
  if (wsPath === '/resenha-chess-ws') return chessServer.connect(ws);
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  ipConns[ip] = (ipConns[ip] || 0) + 1;
  ws.on('close', () => { ipConns[ip] = Math.max(0, (ipConns[ip] || 1) - 1); });
  if (ipConns[ip] > MAX_CONN_IP) return ws.close(1008, 'Muitas conexões');
  let msgs = 0, win = Date.now(), r, p;
  const err = text => send(ws, { t: 'err', text });
  const handle = async d => {
    let m; try { m = JSON.parse(d); } catch { return; }
    if (m.t === 'join') {
      const authUser = await verifyAuctionUser(String(m.accessToken || ''));
      const code = String(m.room || '').toUpperCase().trim().slice(0, 8), name = String(m.name || '').trim().replace(/\s+/g, ' ').slice(0, 16);
      if (!code || !name) return err('Informe seu nome e o código da sala.');
      if (!NAME_RE.test(name)) return err('Nome inválido: use de 2 a 16 letras, números ou espaços.');
      if (clean(name) !== name) return err('Nome não permitido.');
      if (!rooms[code] && m.re) return err('Essa sala não existe mais (o servidor reiniciou). Crie uma nova sala.');
      if (!rooms[code]) {
        if (Object.keys(rooms).length >= MAX_ROOMS) return err('O servidor está cheio no momento. Tente de novo em alguns minutos.');
        const t = ipRooms[ip] = (ipRooms[ip] || []).filter(x => Date.now() - x < 3600e3); if (t.length >= MAX_NEW_ROOMS_IP_HOUR) return err('Muitas salas criadas. Tente mais tarde.'); t.push(Date.now());
      }
      r = rooms[code] || (rooms[code] = { code, players: [], phase: 'lobby', queue: [], lot: null, log: [], chat: [], host: null, timer: null, timers: [], sales: [], copaRes: null, torneio: null, unsold: [], round: 1, warned: {}, banned: [], cfg: { ...DEFAULT_CFG } });
      if (r.banned.includes(name)) { r = null; return err('Você foi removido desta sala.'); }
      p = authUser ? r.players.find(x => x.supabaseUserId === authUser.id) : r.players.find(x => !x.supabaseUserId && x.token && m.token === x.token);
      const sameName = r.players.find(x => x.name.toLowerCase() === name.toLowerCase() && (authUser ? x.supabaseUserId !== authUser.id : x.token !== m.token));
      if (sameName) return err('Esse apelido já está sendo usado por outra conta nesta sala. Escolha outro.');
      if (p) {
        if (p.token && m.token !== p.token && p.ws && p.ws.readyState === 1) return err('Esta conta já está conectada à sala em outra janela.');
        p.name = name; p.token = newToken();
        const old = p.ws; p.ws = ws; if (old && old !== ws) { try { old.close(); } catch (e) {} }
      }
      else if (r.phase !== 'lobby' || r.players.length >= MAX_PLAYERS) { r = null; return err('Sala em andamento ou cheia.'); }
      else { p = { id: Math.random().toString(36).slice(2, 8), name, token: newToken(), supabaseUserId: authUser ? authUser.id : null, hasValidBid: false, ws, budget: r.cfg.budget, squad: [] }; r.players.push(p); }
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
      if (r.players.length < 2) return err('São necessários pelo menos dois jogadores para iniciar o leilão.');
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
      l.bid = a; l.bidder = p.id; l.hist.push({ bidder: p.id, bid: a }); p.hasValidBid = true; l.end = Math.max(l.end, Date.now() + RESET_MS); arm(r);
      say(r, `${p.name} dá ${mi(a)} por ${l.n}!`, 'bid');
    }
  };
  ws.on('message', d => { const now = Date.now(); if (now - win > 1000) { win = now; msgs = 0; } if (++msgs > 30) return ws.close(1008, 'Muitas mensagens'); Promise.resolve(handle(d)).catch(e => console.error('Erro ao tratar mensagem:', e)); });
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
setInterval(() => { // apaga salas sem ninguém online há mais de 3 horas
  for (const [c, r] of Object.entries(rooms)) if (!r.players.some(p => p.ws) && Date.now() - (r.touched || 0) > 3 * 3600e3) { clearTimeout(r.timer); (r.timers || []).forEach(clearTimeout); delete rooms[c]; }
  save();
}, 10 * 60e3);
restore();
server.listen(process.env.PORT || 3000, () => console.log('Leilão de Futebol no ar!'));
