'use strict';
const crypto = require('crypto');
const { Chess } = require('chess.js');
const rooms = new Map();
const playerRooms = new WeakMap();
const send = (ws, data) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(data)); };
const cleanName = value => String(value || 'Jogador').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16) || 'Jogador';
const makeCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();
const makeToken = () => crypto.randomBytes(24).toString('base64url');
async function verifyUser(accessToken) {
  if (!accessToken || !process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return null;
  try {
    const response = await fetch(process.env.SUPABASE_URL.replace(/\/$/, '') + '/auth/v1/user', {
      headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + accessToken }
    });
    if (!response.ok) return null;
    const user = await response.json();
    return user && user.id && user.email_confirmed_at ? user : null;
  } catch (error) { console.error('[Resenha Chess] Falha ao validar conta:', error.message); return null; }
}
function publicState(room) {
  const result = room.result || (room.game.isCheckmate()
    ? (room.game.turn() === 'w' ? 'Vitória das pretas por xeque-mate' : 'Vitória das brancas por xeque-mate')
    : room.game.isDraw() ? 'Empate' : null);
  return { type: 'state', code: room.code, phase: room.phase, fen: room.game.fen(), pgn: room.game.pgn(),
    turn: room.game.turn(), result, lastMove: room.lastMove || null,
    players: room.players.map(p => ({ id: p.id, name: p.name, color: p.color, online: !!p.ws, authenticated: !!p.userId, wantsRematch: !!p.wantsRematch })) };
}
function broadcast(room) { const state = publicState(room); room.players.forEach(p => send(p.ws, state)); }
function closeRoom(room, reason) {
  if (!room || room.closed) return;
  room.closed = true; clearTimeout(room.expiry); rooms.delete(room.code);
  room.players.forEach(p => { if (p.ws) { playerRooms.delete(p.ws); send(p.ws, { type: 'room_closed', reason }); try { p.ws.close(1000, 'Sala encerrada'); } catch (_) {} } });
}
function addPlayer(room, ws, data, color) {
  const p = { id: crypto.randomBytes(8).toString('hex'), name: cleanName(data.name), color,
    userId: data.user ? data.user.id : null, ws, reconnectToken: makeToken(), disconnectedAt: null, lastMoveAt: 0, wantsRematch: false };
  room.players.push(p); playerRooms.set(ws, { room, player: p });
  send(ws, { type: 'joined', code: room.code, color, reconnectToken: p.reconnectToken, name: p.name });
  return p;
}
async function connect(ws) {
  const fail = message => send(ws, { type: 'error', message });
  const handle = async raw => {
    let m; try { m = JSON.parse(raw.toString()); } catch (_) { return fail('Mensagem inválida.'); }
    if (!m || typeof m.type !== 'string') return fail('Comando inválido.');
    if (m.type === 'create' || m.type === 'join') {
      if (playerRooms.has(ws)) return fail('Você já está em uma sala.');
      const user = await verifyUser(String(m.accessToken || ''));
      const name = cleanName(m.name);
      if (m.type === 'create') {
        let code = makeCode(); while (rooms.has(code)) code = makeCode();
        const room = { code, phase: 'waiting', game: new Chess(), players: [], createdAt: Date.now(), lastActivity: Date.now(), lastMove: null, result: null, expiry: null, closed: false };
        rooms.set(code, room); addPlayer(room, ws, { name, user }, 'w');
        send(ws, { type: 'room_created', code, message: 'Sala criada. Compartilhe o código com seu adversário.' }); broadcast(room); return;
      }
      const code = String(m.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      const room = rooms.get(code);
      if (!room || room.closed) return fail('Sala não encontrada. Confira o código.');
      if (room.phase !== 'waiting' || room.players.length >= 2) return fail('Essa sala já está completa ou a partida já começou.');
      if (room.players.some(p => p.userId && user && p.userId === user.id)) return fail('Você não pode jogar contra a mesma conta.');
      addPlayer(room, ws, { name, user }, 'b'); room.phase = 'playing'; room.lastActivity = Date.now(); clearTimeout(room.expiry); broadcast(room); return;
    }
    if (m.type === 'reconnect') {
      const code = String(m.code || '').toUpperCase().slice(0, 6), room = rooms.get(code);
      const p = room && room.players.find(x => x.reconnectToken === String(m.reconnectToken || ''));
      if (!p || p.ws) return fail('Não foi possível recuperar a conexão. Crie ou entre em uma sala novamente.');
      p.ws = ws; p.disconnectedAt = null; clearTimeout(room.expiry); playerRooms.set(ws, { room, player: p });
      send(ws, { type: 'reconnected', code, color: p.color, reconnectToken: p.reconnectToken, name: p.name }); broadcast(room); return;
    }
    const membership = playerRooms.get(ws);
    if (!membership) return fail('Crie ou entre em uma sala primeiro.');
    const { room, player } = membership;
    if (room.closed || !room.players.includes(player)) return fail('Essa sala não está mais disponível.');
    room.lastActivity = Date.now();
    if (m.type === 'move') {
      if (room.phase !== 'playing') return fail('A partida ainda não começou.');
      if (room.game.turn() !== player.color) return fail('Não é a sua vez.');
      if (Date.now() - player.lastMoveAt < 120) return fail('Aguarde um instante antes da próxima jogada.');
      const from = String(m.from || ''), to = String(m.to || ''), promotion = ['q','r','b','n'].includes(m.promotion) ? m.promotion : 'q';
      if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) return fail('Jogada inválida.');
      try {
        const move = room.game.move({ from, to, promotion });
        player.lastMoveAt = Date.now(); room.lastMove = { from: move.from, to: move.to, san: move.san, color: move.color };
        if (room.game.isGameOver()) room.phase = 'finished';
        broadcast(room);
      } catch (_) { return fail('Jogada ilegal. O servidor não aceitou esse movimento.'); }
      return;
    }
    if (m.type === 'resign') {
      if (room.phase !== 'playing') return fail('Não há partida em andamento.');
      room.phase = 'finished'; room.result = player.color === 'w' ? 'Vitória das pretas por desistência' : 'Vitória das brancas por desistência'; broadcast(room); return;
    }
    if (m.type === 'rematch') {
      if (room.phase !== 'finished') return fail('A partida ainda não terminou.');
      player.wantsRematch = true;
      if (room.players.length === 2 && room.players.every(p => p.wantsRematch)) {
        room.players.forEach(p => { p.wantsRematch = false; p.color = p.color === 'w' ? 'b' : 'w'; });
        room.players.sort((a, b) => a.color === 'w' ? -1 : 1);
        room.game = new Chess(); room.phase = 'playing'; room.lastMove = null; room.result = null;
      }
      broadcast(room); return;
    }
    if (m.type === 'leave') closeRoom(room, 'Um jogador saiu da sala.');
  };
  ws.on('message', raw => { handle(raw).catch(error => { console.error('[Resenha Chess] Erro:', error); fail('Ocorreu um erro ao processar a solicitação.'); }); });
  ws.on('close', () => {
    const membership = playerRooms.get(ws); if (!membership) return;
    const { room, player } = membership; playerRooms.delete(ws); player.ws = null; player.disconnectedAt = Date.now(); broadcast(room);
    room.expiry = setTimeout(() => { if (room.players.some(p => !p.ws)) closeRoom(room, 'A sala expirou após uma desconexão.'); }, 60000);
  });
}
module.exports = { connect };
