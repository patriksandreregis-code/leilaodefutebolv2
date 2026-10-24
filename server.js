const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');

// ===== CONFIGURAÇÃO (mude à vontade) =====
const SLOTS = { GK: 1, DEF: 3, MID: 3, ATT: 2 }; // vagas por posição
const TOTAL = Object.values(SLOTS).reduce((a, b) => a + b, 0);
const BUDGET = 200;      // milhões por jogador
const BID_MS = 12000;    // tempo inicial de cada jogador
const RESET_MS = 6000;   // tempo mínimo restante após um lance
const NAME = { GK: 'goleiro', DEF: 'defensor', MID: 'meia', ATT: 'atacante' };

// [nome, posição, nota]
const POOL = [
  ['Buffon','GK',91],['Casillas','GK',90],['Neuer','GK',90],['Courtois','GK',90],['Alisson','GK',89],['Ederson','GK',88],['Oblak','GK',88],['Donnarumma','GK',88],
  ['Maldini','DEF',93],['Roberto Carlos','DEF',91],['Sergio Ramos','DEF',91],['Cafu','DEF',90],['Dani Alves','DEF',90],['Cannavaro','DEF',90],['Nesta','DEF',90],['Van Dijk','DEF',90],['Rúben Dias','DEF',89],['Puyol','DEF',89],['Marcelo','DEF',88],['Thiago Silva','DEF',88],['Lúcio','DEF',88],['Piqué','DEF',88],['Marquinhos','DEF',87],['Militão','DEF',86],['Hakimi','DEF',86],['Trent Alexander-Arnold','DEF',86],['Alaba','DEF',85],['Theo Hernández','DEF',85],
  ['Zidane','MID',95],['Iniesta','MID',92],['Kaká','MID',91],['Xavi','MID',91],['De Bruyne','MID',91],['Rodri','MID',91],['Pirlo','MID',90],['Gerrard','MID',90],['Modrić','MID',89],['Kroos','MID',89],['Bellingham','MID',89],['Lampard','MID',89],['Busquets','MID',89],['Seedorf','MID',87],['Pedri','MID',87],['Valverde','MID',87],['Fabregas','MID',87],['Casemiro','MID',86],
  ['Ronaldo Fenômeno','ATT',96],['Messi','ATT',96],['Cristiano Ronaldo','ATT',95],['Ronaldinho Gaúcho','ATT',93],['Mbappé','ATT',93],['Henry','ATT',92],['Romário','ATT',92],['Haaland','ATT',92],['Neymar','ATT',91],['Rivaldo','ATT',91],['Salah','ATT',90],['Vini Jr','ATT',90],['Lewandowski','ATT',90],['Benzema','ATT',90],['Ibrahimović','ATT',90],['Suárez','ATT',90],['Kane','ATT',90],['Drogba','ATT',88],
];

const rooms = {};
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const need = (p, pos) => SLOTS[pos] - p.squad.filter(x => x.pos === pos).length;
const maxBid = p => { const r = TOTAL - p.squad.length; return r <= 0 ? 0 : p.budget - (r - 1); }; // reserva 1M por vaga restante
const score = p => p.squad.reduce((s, x) => s + x.r, 0);
const send = (ws, m) => ws && ws.readyState === 1 && ws.send(JSON.stringify(m));

function view(r) {
  return {
    code: r.code, phase: r.phase, host: r.host, slots: SLOTS, total: TOTAL, log: r.log.slice(-6),
    players: r.players.map(p => ({
      id: p.id, name: p.name, budget: p.budget, squad: p.squad, on: !!p.ws, max: maxBid(p),
      need: Object.fromEntries(Object.keys(SLOTS).map(k => [k, need(p, k)])),
    })),
    lot: r.lot && { n: r.lot.n, pos: r.lot.pos, r: r.lot.r, base: r.lot.base, bid: r.lot.bid, bidder: r.lot.bidder, left: r.lot.end - Date.now(),
      skips: [...r.lot.skips], skipNeed: r.players.filter(x => x.ws && need(x, r.lot.pos) > 0).length },
  };
}
const bc = r => r.players.forEach(p => send(p.ws, { t: 'state', you: p.id, ...view(r) }));
const say = (r, text) => { r.log.push(text); r.players.forEach(p => send(p.ws, { t: 'say', text })); bc(r); };
const arm = r => { clearTimeout(r.timer); r.timer = setTimeout(() => close(r), Math.max(0, r.lot.end - Date.now())); };

function nextLot(r) {
  let x;
  // pula jogadores que ninguém pode comprar (sem vaga ou sem dinheiro)
  while ((x = r.queue.shift()) && !r.players.some(p => need(p, x[1]) > 0 && maxBid(p) >= Math.max(1, x[2] - 80)));
  if (!x) {
    r.phase = 'end'; r.lot = null;
    const w = [...r.players].sort((a, b) => score(b) - score(a) || b.budget - a.budget)[0];
    return say(r, `Fim do leilão! O campeão é ${w.name}!`);
  }
  const base = Math.max(1, x[2] - 80);
  r.lot = { n: x[0], pos: x[1], r: x[2], base, bid: 0, bidder: null, skips: new Set(), end: Date.now() + BID_MS };
  say(r, `Próximo jogador: ${x[0]}, ${NAME[x[1]]}, nota ${x[2]}. Lance inicial: ${base} milhões!`);
  arm(r);
}

function close(r) {
  clearTimeout(r.timer);
  const l = r.lot; r.lot = null;
  if (l.bidder) {
    const p = r.players.find(p => p.id === l.bidder);
    p.budget -= l.bid; p.squad.push({ n: l.n, pos: l.pos, r: l.r, price: l.bid });
    say(r, `Vendido! ${l.n} vai para ${p.name} por ${l.bid} milhões!`);
  } else say(r, `Ninguém quis ${l.n}. Vamos ao próximo!`);
  setTimeout(() => nextLot(r), 3500);
}

const FILES = { '/': 'index.html', '/leilao': 'leilao.html', '/dado': 'dado.html', '/selecoes': 'selecoes.html', '/dados.js': 'dados.js' };
const server = http.createServer((q, s) => {
  const f = FILES[new URL(q.url, 'http://x').pathname];
  if (!f) { s.writeHead(404); return s.end('404'); }
  fs.readFile(path.join(__dirname, f), (e, d) => {
    s.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8' }); s.end(d);
  });
});
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  let r, p;
  ws.on('message', d => {
    let m; try { m = JSON.parse(d); } catch { return; }
    if (m.t === 'join') {
      const code = String(m.room || '').toUpperCase().trim().slice(0, 8), name = String(m.name || '').trim().slice(0, 16);
      if (!code || !name) return send(ws, { t: 'err', text: 'Informe seu nome e o código da sala.' });
      r = rooms[code] || (rooms[code] = { code, players: [], phase: 'lobby', queue: [], lot: null, log: [], host: null, timer: null });
      p = r.players.find(x => x.name === name); // mesmo nome = reconexão
      if (p) p.ws = ws;
      else if (r.phase !== 'lobby' || r.players.length >= 8) { r = null; return send(ws, { t: 'err', text: 'Sala em andamento ou cheia.' }); }
      else { p = { id: Math.random().toString(36).slice(2, 8), name, ws, budget: BUDGET, squad: [] }; r.players.push(p); r.host = r.host || p.id; }
      bc(r);
    } else if (!r || !p) return;
    else if (m.t === 'start' && p.id === r.host && r.phase === 'lobby') {
      r.phase = 'auction'; r.log = [];
      r.queue = shuffle([...POOL]); // ordem aleatória, qualquer posição
      say(r, 'O leilão vai começar! Boa sorte, cartolas!');
      setTimeout(() => nextLot(r), 3000);
    } else if (m.t === 'again' && p.id === r.host && r.phase === 'end') {
      r.phase = 'lobby'; r.log = []; r.players.forEach(x => { x.budget = BUDGET; x.squad = []; }); bc(r);
    } else if (m.t === 'skip') {
      const l = r.lot;
      if (!l || l.bidder || need(p, l.pos) < 1) return;
      l.skips.add(p.id);
      const el = r.players.filter(x => x.ws && need(x, l.pos) > 0);
      if (el.every(x => l.skips.has(x.id))) close(r); // todos que poderiam comprar querem pular
      else bc(r);
    } else if (m.t === 'bid') {
      const l = r.lot, a = Math.floor(+m.amount);
      if (!l || !(a > 0) || p.id === l.bidder || need(p, l.pos) < 1 || a > maxBid(p) || a < (l.bidder ? l.bid + 1 : l.base))
        return send(ws, { t: 'err', text: 'Lance inválido.' });
      l.bid = a; l.bidder = p.id; l.end = Math.max(l.end, Date.now() + RESET_MS); arm(r);
      say(r, `${p.name} dá ${a} milhões por ${l.n}!`);
    }
  });
  ws.on('close', () => { if (p && p.ws === ws) { p.ws = null; if (r) bc(r); } });
});

server.listen(process.env.PORT || 3000, () => console.log('Leilão de Futebol no ar!'));
