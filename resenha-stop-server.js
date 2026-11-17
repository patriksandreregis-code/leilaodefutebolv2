'use strict';
const crypto = require('crypto');
const rooms = new Map();
const memberships = new WeakMap();
const send = (ws, data) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(data)); };
const makeCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();
const makeToken = () => crypto.randomBytes(24).toString('base64url');
const cleanName = value => String(value || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
const norm = value => String(value || '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const CATEGORIES = {
  football: [
    ['player','Jogador'],['club','Clube de futebol'],['stadium','Estádio'],['country','País'],['coach','Técnico'],['position','Posição'],['competition','Competição'],['nickname','Apelido de jogador']
  ],
  classic: [
    ['name','Nome'],['city','Cidade'],['animal','Animal'],['fruit','Fruta'],['food','Comida'],['object','Objeto'],['profession','Profissão'],['country','País']
  ]
};
async function verifyUser(accessToken) {
  if (!accessToken || !process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return null;
  try {
    const response = await fetch(process.env.SUPABASE_URL.replace(/\/$/, '') + '/auth/v1/user', {
      headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + accessToken }
    });
    if (!response.ok) return null;
    const user = await response.json();
    return user && user.id && user.email_confirmed_at ? user : null;
  } catch (error) { console.error('[Resenha Stop] Falha ao validar conta:', error.message); return null; }
}
function playerView(p) { return { id:p.id, name:p.name, online:!!p.ws, host:!!p.host, authenticated:!!p.userId, xpEligible:!!p.userId, score:p.score, submitted:!!p.submitted }; }
function reviewProgress(room) {
  return room.players.map(voter=>{
    let required=0,completed=0;
    for(const target of room.players){
      if(target===voter)continue;
      for(const category of room.categories){
        const answer=String((target.answers||{})[category.id]||'').trim();
        if(!answer)continue;
        required++;
        const votes=room.reviewVotes&&room.reviewVotes[target.id]&&room.reviewVotes[target.id][category.id];
        if(votes&&Object.prototype.hasOwnProperty.call(votes,voter.id))completed++;
      }
    }
    return {id:voter.id,name:voter.name,required,completed,done:completed>=required};
  });
}
function publicState(room) {
  return {
    type:'state', code:room.code, mode:room.mode, phase:room.phase, round:room.round, totalRounds:room.totalRounds,
    letter:room.letter, deadline:room.deadline, categories:room.categories, allowedLetters:room.allowedLetters,
    players:room.players.map(playerView),
    reviewProgress:room.phase==='review'?reviewProgress(room):[],
    answers:['review','results'].includes(room.phase) ? room.players.map(p=>({id:p.id,name:p.name,answers:p.answers,points:p.roundPoints,votes:Object.fromEntries(room.categories.map(c=>{const answer=norm(String((p.answers||{})[c.id]||''));const votes=(room.reviewVotes&&room.reviewVotes[p.id]&&room.reviewVotes[p.id][c.id])||{};const values=Object.values(votes);return [c.id,{votes,valid:values.filter(Boolean).length,invalid:values.filter(v=>!v).length,accepted:room.phase==='results'?answer.length>=2&&answer[0]===norm(room.letter)[0]&&values.filter(Boolean).length>values.filter(v=>!v).length:false}];}))})) : [],
    scores:room.players.map(p=>({id:p.id,name:p.name,score:p.score})).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'pt-BR')),
    winner:room.winner || null, chatMessages:(room.chatMessages||[]).slice(-60)
  };
}
function broadcast(room) { const state=publicState(room); room.players.forEach(p=>send(p.ws,state)); }
function clearRoundTimer(room) { if(room.timer) clearTimeout(room.timer); room.timer=null; }
function closeRoom(room, reason) {
  if(!room || room.closed) return;
  room.closed=true; clearRoundTimer(room); clearTimeout(room.expiry); rooms.delete(room.code);
  room.players.forEach(p=>{ if(p.ws){memberships.delete(p.ws);send(p.ws,{type:'closed',message:reason||'Sala encerrada.'});try{p.ws.close(1000,'Sala encerrada');}catch(_){}}});
}
function addPlayer(room,ws,user,name) {
  const p={id:crypto.randomBytes(8).toString('hex'),userId:user?.id||null,authenticated:!!user,name,ws,host:room.players.length===0,score:0,roundPoints:0,answers:{},reconnectToken:makeToken(),submitted:false};
  room.players.push(p);memberships.set(ws,{room,player:p});
  send(ws,{type:'joined',code:room.code,playerId:p.id,reconnectToken:p.reconnectToken,name:p.name,authenticated:p.authenticated});
}
function finishRound(room,reason) {
  if(room.phase!=='playing') return;
  clearRoundTimer(room);
  room.phase='review';
  room.winner=reason||'Tempo encerrado';
  room.reviewVotes={};
  broadcast(room);
}
function closeReview(room) {
  if(room.phase!=='review') return;
  const totals=new Map();
  const acceptedAnswers=[];
  for(const p of room.players) for(const c of room.categories){
    const answer=String((p.answers||{})[c.id]||'').trim();
    if(!answer) continue;
    const votes=(room.reviewVotes&&room.reviewVotes[p.id]&&room.reviewVotes[p.id][c.id])||{};
    const values=Object.values(votes);
    const accepted=norm(answer).length>=2&&norm(answer)[0]===norm(room.letter)[0]&&values.filter(Boolean).length>values.filter(v=>!v).length;
    if(!accepted) continue;
    acceptedAnswers.push({playerId:p.id,categoryId:c.id,answer});
    const key=c.id+'|'+norm(answer);
    totals.set(key,(totals.get(key)||0)+1);
  }
  for(const p of room.players){
    p.roundPoints=0;
    for(const item of acceptedAnswers){
      if(item.playerId!==p.id) continue;
      const key=item.categoryId+'|'+norm(item.answer);
      p.roundPoints+=(totals.get(key)===1?10:5);
    }
    p.score+=p.roundPoints;
  }
  room.phase='results';
  broadcast(room);
}
function removePlayerVotes(room,playerId) {
  if(!room.reviewVotes)return;
  delete room.reviewVotes[playerId];
  for(const targetVotes of Object.values(room.reviewVotes))
    for(const categoryVotes of Object.values(targetVotes)) delete categoryVotes[playerId];
}
function startRound(room) {
  clearRoundTimer(room);
  room.phase='countdown';
  const pool=room.allowedLetters&&room.allowedLetters.length?room.allowedLetters:LETTERS;
  if(!Array.isArray(room.letterBag)||room.letterBag.length===0){
    room.letterBag=[...pool];
    for(let i=room.letterBag.length-1;i>0;i--){const j=crypto.randomInt(i+1);[room.letterBag[i],room.letterBag[j]]=[room.letterBag[j],room.letterBag[i]];}
    if(room.letterBag.length>1&&room.letterBag[room.letterBag.length-1]===room.previousLetter){
      const swapIndex=room.letterBag.findIndex(letter=>letter!==room.previousLetter);
      if(swapIndex>=0)[room.letterBag[room.letterBag.length-1],room.letterBag[swapIndex]]=[room.letterBag[swapIndex],room.letterBag[room.letterBag.length-1]];
    }
  }
  room.letter=room.letterBag.pop();
  room.previousLetter=room.letter;
  room.deadline=Date.now()+3000; room.winner=null;
  room.players.forEach(p=>{p.answers={};p.roundPoints=0;p.submitted=false;});
  room.timer=setTimeout(()=>{
    if(room.phase!=='countdown')return;
    room.phase='playing';
    room.deadline=Date.now()+60000;
    room.timer=setTimeout(()=>finishRound(room,'Tempo esgotado'),60000);
    broadcast(room);
  },3500);
  broadcast(room);
}
async function connect(ws) {
  let messageWindow=Date.now(),messageCount=0;
  const fail=message=>send(ws,{type:'error',message});
  const handle=async raw=>{
    let m;try{m=JSON.parse(raw.toString());}catch(_){return fail('Mensagem inválida.');}
    if(!m||typeof m.type!=='string')return fail('Comando inválido.');
    if(m.type==='create'||m.type==='join'){
      if(memberships.has(ws))return fail('Você já está em uma sala.');
      const user=await verifyUser(String(m.accessToken||''));
      const name=cleanName(m.name);
      if(name.length<2)return fail('Informe um nome com pelo menos 2 caracteres.');
      if(m.type==='create'){
        if(!user)return fail('Para criar uma sala, entre em uma conta com e-mail confirmado.');
        if(rooms.size>=150)return fail('O servidor atingiu o limite de salas. Tente novamente em alguns minutos.');
        const mode=m.mode==='football'?'football':'classic';
        let code=makeCode();while(rooms.has(code))code=makeCode();
        const room={code,mode,phase:'lobby',players:[],categories:CATEGORIES[mode].map(([id,label])=>({id,label})),allowedLetters:[...LETTERS],letterBag:[],previousLetter:'',round:0,totalRounds:[3,5,7,10].includes(Number(m.rounds))?Number(m.rounds):5,letter:'',deadline:0,timer:null,winner:null,reviewVotes:{},chatMessages:[],createdAt:Date.now(),expiry:null,closed:false};
        rooms.set(code,room);addPlayer(room,ws,user,name);broadcast(room);return;
      }
      const code=String(m.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
      const room=rooms.get(code);
      if(!room||room.closed)return fail('Sala não encontrada. Confira o código.');
      if(room.phase!=='lobby'||room.players.length>=8)return fail('Essa sala já começou ou está cheia.');
      if(user&&room.players.some(p=>p.userId===user.id))return fail('Você já está nesta sala.');
      if(room.players.some(p=>p.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR')))return fail('Esse apelido já está sendo usado na sala. Escolha outro.');
      addPlayer(room,ws,user,name);broadcast(room);return;
    }
    if(m.type==='reconnect'){
      const code=String(m.code||'').toUpperCase().slice(0,6),room=rooms.get(code);
      const p=room&&room.players.find(x=>x.reconnectToken===String(m.reconnectToken||''));
      if(!p)return fail('Não foi possível recuperar a sala. Crie ou entre novamente.');
      if(p.ws){memberships.delete(p.ws);try{p.ws.close(4001,'Sessão reconectada');}catch(_){}}
      p.ws=ws;if(room.players.every(x=>x.ws)){clearTimeout(room.expiry);room.expiry=null;}memberships.set(ws,{room,player:p});send(ws,{type:'joined',code:room.code,playerId:p.id,reconnectToken:p.reconnectToken,name:p.name});broadcast(room);return;
    }
    const membership=memberships.get(ws);
    if(!membership)return fail('Crie ou entre em uma sala primeiro.');
    const {room,player}=membership;
    if(room.closed||!room.players.includes(player))return fail('Sala indisponível.');
    if(m.type==='chat'){const text=String(m.text||'').replace(/[\\u0000-\\u001f\\u007f]/g,' ').trim().slice(0,180);if(!text)return;if(!Array.isArray(room.chatMessages))room.chatMessages=[];room.chatMessages.push({name:player.name,text,at:Date.now(),system:false});if(room.chatMessages.length>60)room.chatMessages=room.chatMessages.slice(-60);broadcast(room);return;}
    if(m.type==='letters_update'){
      if(!player.host)return fail('Somente o anfitrião pode escolher as letras.');
      if(room.phase!=='lobby')return fail('As letras só podem ser alteradas antes da partida.');
      const requested=Array.isArray(m.letters)?m.letters:[];
      const selected=[...new Set(requested.map(x=>String(x).toUpperCase()).filter(x=>LETTERS.includes(x)))];
      if(!selected.length)return fail('Mantenha pelo menos uma letra selecionada.');
      room.allowedLetters=selected;room.letterBag=[];room.previousLetter='';broadcast(room);return;
    }
    if(m.type==='category_add'){
      if(!player.host)return fail('Somente o anfitrião pode alterar as categorias.');
      if(room.phase!=='lobby')return fail('As categorias só podem ser alteradas antes da partida.');
      const label=cleanName(m.label).slice(0,24);
      if(label.length<2)return fail('Digite uma categoria com pelo menos 2 caracteres.');
      if(room.categories.length>=16)return fail('A sala permite no máximo 16 categorias.');
      if(room.categories.some(c=>norm(c.label)===norm(label)))return fail('Essa categoria já existe.');
      room.categories.push({id:'custom_'+crypto.randomBytes(4).toString('hex'),label});broadcast(room);return;
    }
    if(m.type==='category_remove'){
      if(!player.host)return fail('Somente o anfitrião pode alterar as categorias.');
      if(room.phase!=='lobby')return fail('As categorias só podem ser alteradas antes da partida.');
      if(room.categories.length<=1)return fail('A partida precisa ter pelo menos uma categoria.');
      const index=room.categories.findIndex(c=>c.id===String(m.categoryId||''));
      if(index<0)return fail('Categoria não encontrada.');
      room.categories.splice(index,1);broadcast(room);return;
    }
    if(m.type==='kick'){
      if(!player.host)return fail('Somente o anfitrião pode expulsar jogadores.');
      const target=room.players.find(p=>p.id===String(m.playerId||''));
      if(!target||target===player)return fail('Jogador não encontrado.');
      removePlayerVotes(room,target.id);
      room.players=room.players.filter(p=>p!==target);
      target.reconnectToken=makeToken();
      if(target.ws){memberships.delete(target.ws);send(target.ws,{type:'removed',message:'O anfitrião removeu você da sala.'});try{target.ws.close(4003,'Removido da sala');}catch(_){}}
      broadcast(room);return;
    }
    if(m.type==='start'){
      if(!player.host)return fail('Somente o anfitrião pode iniciar.');
      if(room.phase!=='lobby'||room.players.length<2)return fail('É necessário ter pelo menos 2 jogadores para começar.');
      if(!room.allowedLetters||!room.allowedLetters.length)return fail('Selecione pelo menos uma letra.');
      room.round=1;startRound(room);return;
    }
    if(m.type==='vote'){
      if(room.phase!=='review')return fail('A votação não está aberta.');
      const targetId=String(m.playerId||''),categoryId=String(m.categoryId||'');
      const target=room.players.find(p=>p.id===targetId);
      if(!target||target===player)return fail('Você só pode avaliar respostas de outros jogadores.');
      if(!room.categories.some(c=>c.id===categoryId))return fail('Categoria inválida.');
      const answer=String((target.answers||{})[categoryId]||'').trim();
      if(!answer)return fail('Não há resposta para avaliar.');
      if(typeof m.valid!=='boolean')return fail('Voto inválido.');
      if(!room.reviewVotes)room.reviewVotes={};
      if(!room.reviewVotes[targetId])room.reviewVotes[targetId]={};
      if(!room.reviewVotes[targetId][categoryId])room.reviewVotes[targetId][categoryId]={};
      room.reviewVotes[targetId][categoryId][player.id]=m.valid;
      broadcast(room);return;
    }
    if(m.type==='close_review'){
      if(!player.host)return fail('Somente o anfitrião pode encerrar a avaliação.');
      if(room.phase!=='review')return fail('A avaliação não está aberta.');
      closeReview(room);return;
    }
    if(m.type==='draft'){
      if(room.phase!=='playing'||player.submitted)return;
      const incoming=m.answers&&typeof m.answers==='object'?m.answers:{};
      const allowed=new Set(room.categories.map(x=>x.id));
      const answers={};
      for(const [id,value] of Object.entries(incoming))if(allowed.has(id))answers[id]=String(value||'').trim().slice(0,60);
      player.answers=answers;return;
    }
    if(m.type==='submit'){
      if(room.phase!=='playing'||player.submitted)return fail('Esta rodada já foi encerrada para você.');
      const incoming=m.answers&&typeof m.answers==='object'?m.answers:{};
      const allowed=new Set(room.categories.map(x=>x.id));
      const answers={};
      for(const [id,value] of Object.entries(incoming))if(allowed.has(id))answers[id]=String(value||'').trim().slice(0,60);
      player.answers=answers;player.submitted=true;
      if(room.players.every(p=>p.submitted))finishRound(room,'Todos responderam');
      else broadcast(room);
      return;
    }
    if(m.type==='stop'){
      if(room.phase!=='playing')return fail('A rodada já terminou.');
      if(player.submitted)return fail('Você já enviou suas respostas.');
      const incoming=m.answers&&typeof m.answers==='object'?m.answers:{};
      const allowed=new Set(room.categories.map(x=>x.id));
      player.answers={};
      for(const [id,value] of Object.entries(incoming))if(allowed.has(id))player.answers[id]=String(value||'').trim().slice(0,60);
      player.submitted=true;finishRound(room,player.name+' apertou STOP!');return;
    }
    if(m.type==='next'){
      if(!player.host)return fail('Somente o anfitrião pode avançar.');
      if(room.phase!=='results')return fail('A rodada ainda está em andamento.');
      if(room.round>=room.totalRounds){room.phase='finished';broadcast(room);return;}
      room.round++;startRound(room);return;
    }
    if(m.type==='leave'){
      if(player.host){closeRoom(room,player.name+' encerrou a sala.');return;}
      removePlayerVotes(room,player.id);room.players=room.players.filter(p=>p!==player);memberships.delete(ws);player.reconnectToken=makeToken();send(ws,{type:'closed',message:'Você saiu da sala.'});try{ws.close(1000,'Saiu da sala');}catch(_){}broadcast(room);return;
    }
  };
  ws.on('message',raw=>{
    const now=Date.now();if(now-messageWindow>10000){messageWindow=now;messageCount=0;}
    if(++messageCount>35){fail('Muitas solicitações em pouco tempo.');ws.close(1008,'Limite de mensagens');return;}
    handle(raw).catch(error=>{console.error('[Resenha Stop] Erro:',error);fail('Ocorreu um erro ao processar a solicitação.');});
  });
  ws.on('close',()=>{
    const membership=memberships.get(ws);if(!membership)return;
    const {room,player}=membership;memberships.delete(ws);player.ws=null;
    if(!room.closed){if(player.host){const next=room.players.find(p=>p.ws);if(next){player.host=false;next.host=true;}}broadcast(room);clearTimeout(room.expiry);room.expiry=setTimeout(()=>{if(room.players.some(p=>!p.ws))closeRoom(room,'A sala foi encerrada porque um jogador não retornou.');},60000);}
  });
}
module.exports={connect};
