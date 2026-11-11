const crypto=require('crypto');
const { recordCompletedMatch } = require('./activity-counter.js');
const rooms=new Map(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),send=(w,d)=>w&&w.readyState===1&&w.send(JSON.stringify(d));
const code=()=>crypto.randomBytes(3).toString('hex').toUpperCase(),name=s=>String(s||'Jogador').replace(/[<>]/g,'').trim().slice(0,16)||'Jogador';
const activeAccounts=new Map();
async function verifyBallUser(accessToken){
 if(!accessToken||!process.env.SUPABASE_URL||!process.env.SUPABASE_PUBLISHABLE_KEY)return null;
 try{
  const response=await fetch(process.env.SUPABASE_URL.replace(/\/$/,'')+'/auth/v1/user',{headers:{apikey:process.env.SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+accessToken}});
  if(!response.ok)return null;
  const user=await response.json();
  return user&&user.id&&user.email_confirmed_at?user:null;
 }catch(e){console.error('[Resenha Ball] Falha ao validar conta:',e.message);return null;}
}
async function awardMatchXP(r){
 if(r.xpAwarded||!r.matchId||Date.now()-r.matchStartedAt<30000)return;
 const players=[...r.players.values()];
 const authenticated=players.filter(p=>p.userId&&r.matchUserIds&&r.matchUserIds.has(p.userId)&&(p.activeMs||0)>=5000);
 if(authenticated.length<2||new Set(authenticated.map(p=>p.userId)).size<2||!authenticated.some(a=>authenticated.some(b=>a.team!==b.team&&a.userId!==b.userId))){for(const p of players)send(p.ws,{type:'xp',awarded:false,reason:'eligible_opponents'});return;}
 r.xpAwarded=true;
 const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!secret||!process.env.SUPABASE_URL){console.warn('[Resenha Ball XP] SUPABASE_SECRET_KEY não configurada.');return;}
 const endpoint=process.env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/rpc/award_resenha_ball_xp';
 for(const p of authenticated){
  const result=r.score[p.team]>r.score[1-p.team]?'win':r.score[p.team]===r.score[1-p.team]?'draw':'loss';
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify({p_user_id:p.userId,p_match_id:r.matchId,p_result_code:result})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error('RPC HTTP '+response.status+': '+JSON.stringify(data).slice(0,250));
   send(p.ws,{type:'xp',...data,result});
  }catch(e){console.error('[Resenha Ball XP] Falha ao registrar para',p.userId,e.message);send(p.ws,{type:'xp',awarded:false,error:'Não foi possível registrar o XP agora.'});}
 }
}
function view(r){const humans=[...r.players.values()].map(p=>({id:p.id,name:p.name,team:p.team,online:!!p.ws,acceptBots:p.acceptBots===true}));const bots=r.bots.map(p=>({id:p.id,name:p.name,team:p.team,bot:true,online:false}));const botsAccepted=humans.length>0&&humans.every(p=>p.acceptBots);return {type:'state',code:r.code,host:r.host,phase:r.phase,humanCount:humans.length,botsAccepted,players:[...humans,...bots],score:r.score,time:r.time,duration:r.duration,ball:r.ball,stats:{scorers:[...r.goalStats.values()].sort((a,b)=>b.goals-a.goals||a.name.localeCompare(b.name)),lastGoal:r.lastGoal},actors:[...r.players.values(),...r.bots].map(p=>({id:p.id,x:p.x,y:p.y}))};}
function bc(r){const s=view(r);for(const p of r.players.values())send(p.ws,s);}
function reset(r){r.score=[0,0];r.time=r.duration;r.goalStats=new Map();r.lastGoal=null;r.lastTouch=null;r.ball={x:500,y:300,vx:0,vy:0};for(const p of [...r.players.values(),...r.bots]){p.x=p.team?740:260;p.y=150+Math.random()*300;p.kickAt=0;}}
function fillBots(r){r.bots=[];const counts=[0,0];for(const p of r.players.values())counts[p.team]++;const target=Math.max(2,counts[0],counts[1]);for(let team=0;team<2;team++){while(counts[team]<target){const slot=counts[team]++;r.bots.push({id:'bot-'+team+'-'+slot,name:'BOT '+(slot+1),team,x:team?740:260,y:180+slot*80,vx:0,vy:0,kickAt:0,bot:true});}}}
function create(duration){let c=code();while(rooms.has(c))c=code();const r={code:c,host:null,phase:'lobby',players:new Map(),bots:[],score:[0,0],goalStats:new Map(),lastGoal:null,lastTouch:null,duration:[60,90,180,300].includes(+duration)?+duration:90,time:90,ball:{x:500,y:300,vx:0,vy:0},last:Date.now(),timer:null};rooms.set(c,r);return r;}
function start(r){if(r.phase!=='lobby')return false;if(r.timer){clearInterval(r.timer);r.timer=null;}const humans=[...r.players.values()];const botsAccepted=humans.length>0&&humans.every(p=>p.acceptBots===true);if(humans.length<2&&!botsAccepted)return false;if(botsAccepted)fillBots(r);else r.bots=[];r.phase='playing';reset(r);r.matchId=crypto.randomBytes(16).toString('hex');r.matchStartedAt=Date.now();r.matchUserIds=new Set([...r.players.values()].filter(p=>p.userId).map(p=>p.userId));r.players.forEach(p=>p.activeMs=0);r.xpAwarded=false;r.last=Date.now();r.timer=setInterval(()=>tick(r),33);bc(r);return true;}
function finish(r){if(r.phase==='finished')return;r.phase='finished';clearInterval(r.timer);r.timer=null;bc(r);if(r.matchId)recordCompletedMatch('resenha_ball','resenha_ball:'+r.matchId).catch(e=>console.error('[Resenha Activity] Resenha Ball:',e.message));awardMatchXP(r).catch(e=>console.error('[Resenha Ball XP]',e));}
function goal(r,t){r.score[t]++;const touch=r.lastTouch&&Date.now()-r.lastTouch.at<8000?r.lastTouch:null;if(touch){if(touch.team===t){const old=r.goalStats.get(touch.id)||{id:touch.id,name:touch.name,team:touch.team,bot:!!touch.bot,goals:0};old.goals++;r.goalStats.set(touch.id,old);}r.lastGoal={name:touch.name,team:t,bot:!!touch.bot,ownGoal:touch.team!==t};}else r.lastGoal={name:'Autor não identificado',team:t,bot:false};r.lastTouch=null;r.ball={x:500,y:300,vx:0,vy:0};for(const p of [...r.players.values(),...r.bots]){p.x=p.team?740:260;p.y=150+Math.random()*300;}if(r.phase==='golden_goal')finish(r);bc(r);}
function tick(r){if(r.phase!=='playing'&&r.phase!=='golden_goal')return;const now=Date.now(),dt=clamp((now-r.last)/1000,0,.05);r.last=now;if(r.phase==='playing')r.time=Math.max(0,r.time-dt);const b=r.ball;
const all=[...r.players.values(),...r.bots];
for(const p of all){
 let x=0,y=0,kick=false;
 if(p.bot){
   const teammates=r.bots.filter(q=>q.team===p.team);
   const chaser=[...r.players.values(),...teammates].filter(q=>q.team===p.team).sort((a,c)=>Math.hypot(b.x-a.x,b.y-a.y)-Math.hypot(b.x-c.x,b.y-c.y))[0];
   if(chaser&&chaser.id===p.id){const dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy)||1;x=dx/d;y=dy/d;}
   else{const slot=teammates.indexOf(p);const homeX=p.team?790-slot*34:210+slot*34,homeY=190+slot*105;const dx=homeX-p.x,dy=homeY-p.y,d=Math.hypot(dx,dy)||1;if(d>12){x=dx/d;y=dy/d;}}
   const distToBall=Math.hypot(b.x-p.x,b.y-p.y);
   if(distToBall<58&&now-p.kickAt>650){kick=true;}
 }else{x=p.input.x;y=p.input.y;kick=p.input.kick;if(Math.abs(x)+Math.abs(y)>0||kick)p.activeMs=(p.activeMs||0)+dt*1000;}
 const d=Math.hypot(x,y)||1;p.vx=x/d*(p.bot?190:230);p.vy=y/d*(p.bot?190:230);
 p.x=clamp(p.x+p.vx*dt,24,976);p.y=clamp(p.y+p.vy*dt,24,576);
 let dx=b.x-p.x,dy=b.y-p.y,dist=Math.hypot(dx,dy);
 if(dist<30){
  r.lastTouch={id:p.id,name:p.name,team:p.team,bot:!!p.bot,at:now};
  let nx,ny;if(dist<.001){const speed=Math.hypot(p.vx,p.vy)||1;nx=p.vx/speed;ny=p.vy/speed;}else{nx=dx/dist;ny=dy/dist;}
  const penetration=30-dist;b.x+=nx*(penetration+.5);b.y+=ny*(penetration+.5);
  const playerNormal=p.vx*nx+p.vy*ny,ballNormal=b.vx*nx+b.vy*ny;
  if(ballNormal<playerNormal){const minimumExitSpeed=Math.max(105,playerNormal+115);const impulse=Math.max(minimumExitSpeed,ballNormal)-ballNormal;b.vx+=impulse*nx;b.vy+=impulse*ny;}
 }
 if(kick&&now-p.kickAt>(p.bot?650:450)&&dist<70){
  let nx,ny;
  if(p.bot){const goalX=p.team?0:1000;const kx=goalX-b.x,ky=300-b.y,kd=Math.hypot(kx,ky)||1;nx=kx/kd;ny=ky/kd;}
  else{nx=dist<.001?p.vx/(Math.hypot(p.vx,p.vy)||1):dx/dist;ny=dist<.001?p.vy/(Math.hypot(p.vx,p.vy)||1):dy/dist;}
  p.kickAt=now;b.vx+=nx*(p.bot?430:520)+p.vx*.5;b.vy+=ny*(p.bot?430:520)+p.vy*.5;
 }
}
const previousX=b.x;b.x+=b.vx*dt;b.y+=b.vy*dt;b.vx*=Math.pow(.985,dt*60);b.vy*=Math.pow(.985,dt*60);if(b.y<27||b.y>573){b.y=clamp(b.y,27,573);b.vy*=-.82;}const inGoalMouth=b.y>=252&&b.y<=348;if(previousX>12&&b.x<=12&&inGoalMouth)return goal(r,1);if(previousX<988&&b.x>=988&&inGoalMouth)return goal(r,0);if(b.x<12){b.x=12;b.vx=Math.abs(b.vx)*.8;}else if(b.x>988){b.x=988;b.vx=-Math.abs(b.vx)*.8;}if(r.phase==='playing'&&r.time<=0){if(r.score[0]===r.score[1])r.phase='golden_goal';else{finish(r);return;}}bc(r);}
function connect(ws){
let r=null,p=null;
const err=t=>send(ws,{type:'error',message:t});
console.log('[Resenha Ball] Cliente conectado');
ws.on('error',e=>console.error('[Resenha Ball] Erro no socket:',e.message));
ws.on('message',async raw=>{let m;try{m=JSON.parse(raw);}catch(e){console.warn('[Resenha Ball] Mensagem JSON inválida:',e.message);return;}
if(m.type==='create'||m.type==='join'){
if(r)return err('Você já está em uma sala.');
const authUser=await verifyBallUser(String(m.accessToken||''));
if(authUser){const existing=activeAccounts.get(authUser.id);if(existing&&existing.ws&&existing.ws.readyState===1)return err('Esta conta já está conectada a outra partida.');}
const requestedCode=String(m.code||'').toUpperCase();
r=m.type==='create'?create(m.duration):rooms.get(requestedCode);
if(!r){console.warn('[Resenha Ball] Sala não encontrada:',requestedCode);return err('Sala não encontrada.');}
if(r.phase!=='lobby')return err('A partida já começou.');
if(r.players.size>=8)return err('Sala cheia. Máximo de 8 jogadores.');
const id=crypto.randomBytes(5).toString('hex'),a=[...r.players.values()].filter(x=>x.team===0).length,b=[...r.players.values()].filter(x=>x.team===1).length;
p={id,name:name(m.name),team:a<=b?0:1,ws,userId:authUser?authUser.id:null,x:260,y:300,vx:0,vy:0,input:{x:0,y:0,kick:false},kickAt:0,acceptBots:false};
r.players.set(id,p);if(p.userId)activeAccounts.set(p.userId,p);if(!r.host)r.host=id;
console.log('[Resenha Ball] Jogador entrou:',{room:r.code,player:p.name,id:p.id,players:r.players.size});
send(ws,{type:'joined',code:r.code,id,host:r.host===id});bc(r);return;}
if(!r||!p)return;if(m.type==='bots'&&r.phase==='lobby'){p.acceptBots=!!m.accept;bc(r);}else if(m.type==='team'&&r.phase==='lobby'){const team=Number(m.team);if(team!==0&&team!==1)return;const occupied=[...r.players.values()].filter(x=>x.id!==p.id&&x.team===team).length;if(occupied>=4)return err('Essa equipe já está completa. Escolha a outra equipe.');p.team=team;bc(r);}else if(m.type==='input'&&(r.phase==='playing'||r.phase==='golden_goal'))p.input={x:clamp(+m.x||0,-1,1),y:clamp(+m.y||0,-1,1),kick:!!m.kick};else if(m.type==='start'&&p.id===r.host){if(!start(r))err('São necessários 2 jogadores ou que todos os participantes aceitem jogar com bots.');}else if(m.type==='back'&&p.id===r.host){if(r.phase!=='finished')return err('A partida precisa terminar antes de voltar à sala.');clearInterval(r.timer);r.timer=null;r.phase='lobby';r.bots=[];r.score=[0,0];r.time=r.duration;r.goalStats=new Map();r.lastGoal=null;r.lastTouch=null;r.ball={x:500,y:300,vx:0,vy:0};r.players.forEach(player=>{player.input={x:0,y:0,kick:false};player.activeMs=0;player.acceptBots=false;});bc(r);}});
ws.on('close',(code,reason)=>{
console.warn('[Resenha Ball] Socket fechado:',{code,reason:reason&&reason.toString(),room:r&&r.code,player:p&&p.name,id:p&&p.id,readyState:ws.readyState});
if(!r||!p)return;
r.players.delete(p.id);if(p.userId&&activeAccounts.get(p.userId)===p)activeAccounts.delete(p.userId);
if(!r.players.size){clearInterval(r.timer);rooms.delete(r.code);return;}
if(r.host===p.id)r.host=r.players.keys().next().value;
bc(r);
});
}
module.exports={connect,rooms};