'use strict';

// Contador público de partidas online concluídas. Não consulta nem altera XP/ranking.
async function recordCompletedMatch(gameKey, eventKey) {
  const base = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !secret || !['leilao', 'resenha_ball', 'resenha_chess'].includes(gameKey) || !eventKey) {
    console.warn('[Resenha Activity] Configuração ausente ou evento inválido; partida não contabilizada.');
    return false;
  }
  const response = await fetch(base.replace(/\/$/, '') + '/rest/v1/resenha_match_completions', {
    method: 'POST',
    headers: {
      apikey: secret,
      Authorization: 'Bearer ' + secret,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=minimal'
    },
    body: JSON.stringify({ event_key: String(eventKey).slice(0, 180), game_key: gameKey })
  });
  if (!response.ok) {
    throw new Error('resenha_match_completions HTTP ' + response.status + ': ' + (await response.text()).slice(0, 250));
  }
  return true;
}

module.exports = { recordCompletedMatch };
