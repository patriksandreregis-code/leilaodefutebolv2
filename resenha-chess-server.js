'use strict';
const crypto = require('crypto');
const { Chess } = require('chess.js');
const rooms = new Map();
const CHAT_BAD = new Set('porra caralho carai merda bosta foda foder fodido fodida fodase puta puto putaria fdp vsf vtnc tnc pqp cu cuzao buceta viado viada otario otaria idiota imbecil babaca arrombado arrombada corno corna escroto escrota vagabundo vagabunda cacete piranha vadia retardado mongol desgracado'.split(' '));
function normalizeChatWord(word) { return word.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[@4]/g,'a').replace(/3/g,'e').replace(/1/g,'i').replace(/0/g,'o').replace(/[$5]/g,'s').replace(/(.)\\1+/g,'$1'); }
function cleanChatText(value) { return String(value || '').replace(/[\\p{L}\\p{N}@$]+/gu, word => CHAT_BAD.has(normalizeChatWord(word)) ? '*'.repeat(Math.max(3, word.length)) : word).trim().slice(0, 180); }
const playerRooms = new WeakMap();
const send = (ws, data) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(data)); };
const ALLOWED_CLUBS = new Set(['Flamengo','Corinthians','Palmeiras','São Paulo','Santos','Vasco','Grêmio','Internacional','Cruzeiro','Atlético-MG','Real Madrid','Barcelona','Manchester City','Liverpool','Manchester United','Bayern de Munique','PSG','Arsenal','Chelsea','Juventus']);
const cleanClub = value => { const club=String(value||'Flamengo').trim(); return ALLOWED_CLUBS.has(club)?club:'Flamengo'; };
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
async function recordCompetitiveResult(room) {
  if (room.resultRecorded || room.players.length !== 2) return;
  const [a, b] = room.players;
  if (!a.userId || !b.userId || a.userId === b.userId) return;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const baseUrl = process.env.SUPABASE_URL;
  if (!secret || !baseUrl) { console.warn('[Resenha Chess] Supabase service key ausente; resultado não pontuado.'); return; }
  let winner = null, draw = false;
  if (room.game.isCheckmate()) winner = room.game.turn() === 'w' ? b : a;
  else if (room.result && /vitória das (brancas|pretas)/i.test(room.result)) winner = /brancas/i.test(room.result) ? a : b;
  else draw = room.game.isDraw() || !!(room.result && /empate/i.test(room.result));
  if (!winner && !draw) return;
  const matchId = room.matchId || crypto.randomUUID();
  room.matchId = matchId;
  const players = [a, b].map(p => ({
    match_id: matchId, user_id: p.userId,
    opponent_user_id: p === a ? b.userId : a.userId,
    club_key: p.club,
    result_code: draw ? 'draw' : p === winner ? 'win' : 'loss',
    points_awarded: draw ? 1 : p === winner ? 3 : 0,
    mode: 'online'
  }));
  const headers = { apikey: secret, Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' };
  const rest = baseUrl.replace(/\/$/, '') + '/rest/v1/';
  try {
    const clubResponse = await fetch(rest + 'chess_club_results', { method: 'POST', headers, body: JSON.stringify(players) });
    if (!clubResponse.ok) throw new Error('chess_club_results HTTP ' + clubResponse.status + ': ' + (await clubResponse.text()).slice(0, 250));
    for (const p of [a, b]) {
      const resultCode = draw ? 'draw' : p === winner ? 'win' : 'loss';
      const xp = 10 + (resultCode === 'win' ? 10 : 0);
      const eventId = 'resenha_chess:' + matchId + ':' + p.userId;
      const resultResponse = await fetch(rest + 'game_results', { method: 'POST', headers, body: JSON.stringify({
        user_id: p.userId, game_key: 'resenha_chess', result_code: resultCode,
        external_event_id: eventId, xp_awarded: xp
      }) });
      if (!resultResponse.ok) throw new Error('game_results HTTP ' + resultResponse.status + ': ' + (await resultResponse.text()).slice(0, 250));
      const xpResponse = await fetch(rest + 'xp_history', { method: 'POST', headers, body: JSON.stringify({
        user_id: p.userId, game_key: 'resenha_chess', event_key: 'chess_' + resultCode,
        description: resultCode === 'win' ? 'Vitória em partida online de Resenha Chess' : resultCode === 'draw' ? 'Empate em partida online de Resenha Chess' : 'Partida online de Resenha Chess concluída',
        xp_delta: xp, source_event_id: eventId
      }) });
      if (!xpResponse.ok) throw new Error('xp_history HTTP ' + xpResponse.status + ': ' + (await xpResponse.text()).slice(0, 250));
    }
    room.resultRecorded = true;
    console.log('[Resenha Chess] Resultado competitivo registrado:', matchId);
  } catch (error) {
    console.error('[Resenha Chess] Falha ao registrar resultado:', error.message);
  }
}
function publicState(room) {
  const result = room.result || (room.game.isCheckmate()
    ? (room.game.turn() === 'w' ? 'Vitória das pretas por xeque-mate' : 'Vitória das brancas por xeque-mate')
    : room.game.isDraw() ? 'Empate' : null);
  return { type: 'state', code: room.code, phase: room.phase, fen: room.game.fen(), pgn: room.game.pgn(), chat: room.chat || [],
    turn: room.game.turn(), result, drawOfferedBy: room.drawOfferedBy || null, lastMove: room.lastMove || null,
    players: room.players.map(p => ({ id: p.id, name: p.name, club: p.club, color: p.color, online: !!p.ws, authenticated: !!p.userId, wantsRematch: !!p.wantsRematch })) };
}
function broadcast(room) { const state = publicState(room); room.players.forEach(p => send(p.ws, state)); }
function closeRoom(room, reason) {
  if (!room || room.closed) return;
  room.closed = true; clearTimeout(room.expiry); clearTimeout(room.maxAgeTimer); rooms.delete(room.code);
  room.players.forEach(p => { if (p.ws) { playerRooms.delete(p.ws); send(p.ws, { type: 'room_closed', reason }); try { p.ws.close(1000, 'Sala encerrada'); } catch (_) {} } });
}
function addPlayer(room, ws, data, color) {
  const p = { id: crypto.randomBytes(8).toString('hex'), name: cleanName(data.name), club: cleanClub(data.club), color,
    userId: data.user ? data.user.id : null, ws, reconnectToken: makeToken(), disconnectedAt: null, lastMoveAt: 0, wantsRematch: false };
  room.players.push(p); playerRooms.set(ws, { room, player: p });
  send(ws, { type: 'joined', code: room.code, playerId: p.id, color, reconnectToken: p.reconnectToken, name: p.name, club: p.club });
  return p;
}
async function connect(ws) {
  let messageWindow = Date.now(), messageCount = 0;
  const fail = message => send(ws, { type: 'error', message });
  const handle = async raw => {
    let m; try { m = JSON.parse(raw.toString()); } catch (_) { return fail('Mensagem inválida.'); }
    if (!m || typeof m.type !== 'string') return fail('Comando inválido.');
    if (m.type === 'create' || m.type === 'join') {
      if (playerRooms.has(ws)) return fail('Você já está em uma sala.');
      const user = await verifyUser(String(m.accessToken || ''));
      const name = cleanName(m.name);
      if (m.type === 'create') {
        if (rooms.size >= 200) return fail('O servidor atingiu o limite de salas. Tente novamente em alguns minutos.');
        let code = makeCode(); while (rooms.has(code)) code = makeCode();
        const room = { code, phase: 'waiting', game: new Chess(), players: [], chat: [], createdAt: Date.now(), lastActivity: Date.now(), lastMove: null, result: null, expiry: null, maxAgeTimer: null, closed: false };
        rooms.set(code, room); room.maxAgeTimer = setTimeout(() => closeRoom(room, 'A sala expirou após três horas.'), 3 * 60 * 60 * 1000); addPlayer(room, ws, { name, user, club: m.club }, 'w');
        send(ws, { type: 'room_created', code, message: 'Sala criada. Compartilhe o código com seu adversário.' }); broadcast(room); return;
      }
      const code = String(m.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      const room = rooms.get(code);
      if (!room || room.closed) return fail('Sala não encontrada. Confira o código.');
      if (room.phase !== 'waiting' || room.players.length >= 2) return fail('Essa sala já está completa ou a partida já começou.');
      if (room.players.some(p => p.userId && user && p.userId === user.id)) return fail('Você não pode jogar contra a mesma conta.');
      addPlayer(room, ws, { name, user, club: m.club }, 'b'); room.phase = 'playing'; room.lastActivity = Date.now(); clearTimeout(room.expiry); broadcast(room); return;
    }
    if (m.type === 'reconnect') {
      const code = String(m.code || '').toUpperCase().slice(0, 6), room = rooms.get(code);
      const p = room && room.players.find(x => x.reconnectToken === String(m.reconnectToken || ''));
      if (!p) return fail('Não foi possível recuperar a conexão. Crie ou entre em uma sala novamente.');
      if (p.ws) { playerRooms.delete(p.ws); try { p.ws.close(4001, 'Sessão reconectada em outro dispositivo'); } catch (_) {} }
      p.ws = ws; p.disconnectedAt = null; clearTimeout(room.expiry); playerRooms.set(ws, { room, player: p });
      if (room.players.some(other => !other.ws)) room.expiry = setTimeout(() => { if (room.players.some(other => !other.ws)) closeRoom(room, 'A sala expirou após uma desconexão.'); }, 60000);
      send(ws, { type: 'reconnected', code, playerId: p.id, color: p.color, reconnectToken: p.reconnectToken, name: p.name }); broadcast(room); return;
    }
    const membership = playerRooms.get(ws);
    if (!membership) return fail('Crie ou entre em uma sala primeiro.');
    const { room, player } = membership;
    if (room.closed || !room.players.includes(player)) return fail('Essa sala não está mais disponível.');
    room.lastActivity = Date.now();
    if (m.type === 'chat') {
      if (room.phase === 'finished') return fail('A conversa desta partida foi encerrada.');
      const now = Date.now(), message = cleanChatText(m.text);
      if (!message) return;
      if (String(m.text || '').trim().length > 180) return fail('A mensagem deve ter no máximo 180 caracteres.');
      if (now - (player.lastChatAt || 0) < 700) return fail('Aguarde um instante antes de enviar outra mensagem.');
      player.lastChatAt = now;
      room.chat = room.chat || [];
      room.chat.push({ id: crypto.randomBytes(6).toString('hex'), playerId: player.id, name: player.name, text: message, at: now });
      if (room.chat.length > 50) room.chat.splice(0, room.chat.length - 50);
      const packet = { type: 'chat_message', message: room.chat[room.chat.length - 1] };
      room.players.forEach(p => send(p.ws, packet));
      return;
    }
    if (m.type === 'move') {
      if (room.phase !== 'playing') return fail('A partida ainda não começou.');
      if (room.game.turn() !== player.color) return fail('Não é a sua vez.');
      if (Date.now() - player.lastMoveAt < 120) return fail('Aguarde um instante antes da próxima jogada.');
      const from = String(m.from || ''), to = String(m.to || ''), promotion = ['q','r','b','n'].includes(m.promotion) ? m.promotion : 'q';
      if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) return fail('Jogada inválida.');
      try {
        const move = room.game.move({ from, to, promotion });
        player.lastMoveAt = Date.now(); room.lastMove = { from: move.from, to: move.to, san: move.san, color: move.color }; room.drawOfferedBy = null;
        if (room.game.isGameOver()) { room.phase = 'finished'; recordCompetitiveResult(room); }
        broadcast(room);
      } catch (_) { return fail('Jogada ilegal. O servidor não aceitou esse movimento.'); }
      return;
    }
    if (m.type === 'offer_draw') {
      if (room.phase !== 'playing') return fail('Não há partida em andamento.');
      if (room.drawOfferedBy) return fail('Já existe uma oferta de empate pendente.');
      room.drawOfferedBy = player.id; broadcast(room); return;
    }
    if (m.type === 'accept_draw') {
      if (room.phase !== 'playing' || !room.drawOfferedBy || room.drawOfferedBy === player.id) return fail('Não há oferta de empate do adversário.');
      room.phase = 'finished'; room.result = 'Empate por acordo'; room.drawOfferedBy = null; recordCompetitiveResult(room); broadcast(room); return;
    }
    if (m.type === 'decline_draw') {
      if (room.phase !== 'playing' || !room.drawOfferedBy || room.drawOfferedBy === player.id) return fail('Não há oferta de empate do adversário.');
      room.drawOfferedBy = null; broadcast(room); return;
    }
    if (m.type === 'resign') {
      if (room.phase !== 'playing') return fail('Não há partida em andamento.');
      room.phase = 'finished'; room.result = player.color === 'w' ? 'Vitória das pretas por desistência' : 'Vitória das brancas por desistência'; room.drawOfferedBy = null; recordCompetitiveResult(room); broadcast(room); return;
    }
    if (m.type === 'rematch') {
      if (room.phase !== 'finished') return fail('A partida ainda não terminou.');
      player.wantsRematch = true;
      if (room.players.length === 2 && room.players.every(p => p.wantsRematch)) {
        room.players.forEach(p => { p.wantsRematch = false; p.color = p.color === 'w' ? 'b' : 'w'; });
        room.players.sort((a, b) => a.color === 'w' ? -1 : 1);
        room.game = new Chess(); room.phase = 'playing'; room.lastMove = null; room.result = null; room.drawOfferedBy = null;
      }
      broadcast(room); return;
    }
    if (m.type === 'leave') closeRoom(room, 'Um jogador saiu da sala.');
  };
  ws.on('message', raw => {
    const now = Date.now(); if (now - messageWindow > 10000) { messageWindow = now; messageCount = 0; }
    if (++messageCount > 40) { fail('Muitas solicitações em pouco tempo.'); ws.close(1008, 'Limite de mensagens'); return; }
    handle(raw).catch(error => { console.error('[Resenha Chess] Erro:', error); fail('Ocorreu um erro ao processar a solicitação.'); });
  });
  ws.on('close', () => {
    const membership = playerRooms.get(ws); if (!membership) return;
    const { room, player } = membership; playerRooms.delete(ws); player.ws = null; player.disconnectedAt = Date.now(); broadcast(room);
    room.expiry = setTimeout(() => { if (room.players.some(p => !p.ws)) closeRoom(room, 'A sala expirou após uma desconexão.'); }, 60000);
  });
}
function getVoiceParticipant(code, playerId, reconnectToken) { const room = rooms.get(String(code || '').toUpperCase()); const player = room && room.players.find(p => p.id === String(playerId || '') && p.reconnectToken === String(reconnectToken || '')); if (!room || room.closed || room.phase !== 'playing' || room.players.length !== 2 || !player || !player.ws || player.ws.readyState !== 1 || room.players.some(p => !p.ws || p.ws.readyState !== 1)) return null; return { id: player.id, name: player.name, code: room.code }; }
module.exports = { connect, getVoiceParticipant };
