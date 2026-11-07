const crypto=require('crypto');
const rooms=new Map(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),send=(w,d)=>w&&w.readyState===1&&w.send(JSON.stringify(d));
const code=()=>crypto.randomBytes(3).toString('hex').toUpperCase(),name=s=>String(s||'Jogador').replace(/[<>]/g,'').trim().slice(0,16)||'Jogador';
function view(r){const humans=[...r.players.values()].map(p=>({id:p.id,name:p.name,team:p.team,online:!!p.ws}));const bots=r.bots.map(p=>({id:p.id,name:p.name,team:p.team,bot:true,online:false}));return {type:'state',code:r.code,host:r.host,phase:r.phase,humanCount:humans.length,players:[...humans,...bots],score:r.score,time:r.time,duration:r.duration,ball:r.ball,actors:[...r.players.values(),...r.bots].map(p=>({id:p.id,x:p.x,y:p.y}))};}
function bc(r){const s=view(r);for(const p of r.players.values())send(p.ws,s);}
function reset(r){r.score=[0,0];r.time=r.duration;r.ball={x:500,y:300,vx:0,vy:0};for(const p of [...r.players.values(),...r.bots]){p.x=p.team?740:260;p.y=150+Math.random()*300;p.kickAt=0;}}
function fillBots(r){r.bots=[];const counts=[0,0];for(const p of r.players.values())counts[p.team]++;const target=Math.max(2,counts[0],counts[1]);for(let team=0;team<2;team++){while(counts[team]<target){const slot=counts[team]++;r.bots.push({id:'bot-'+team+'-'+slot,name:'BOT '+(slot+1),team,x:team?740:260,y:180+slot*80,vx:0,vy:0,kickAt:0,bot:true});}}}
function create(duration){let c=code();while(rooms.has(c))c=code();const r={code:c,host:null,phase:'lobby',players:new Map(),bots:[],score:[0,0],duration:[60,90,180,300].includes(+duration)?+duration:90,time:90,ball:{x:500,y:300,vx:0,vy:0},last:Date.now(),timer:null};rooms.set(c,r);return r;}
function start(r){if(r.players.size<1)return false;fillBots(r);r.phase='playing';reset(r);r.last=Date.now();r.timer=setInterval(()=>tick(r),33);bc(r);return true;}
function goal(r,t){r.score[t]++;r.ball={x:500,y:300,vx:0,vy:0};for(const p of [...r.players.values(),...r.bots]){p.x=p.team?740:260;p.y=150+Math.random()*300;}if(r.phase==='golden_goal'){r.phase='finished';clearInterval(r.timer);r.timer=null;}bc(r);}
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
 }else{x=p.input.x;y=p.input.y;kick=p.input.kick;}
 const d=Math.hypot(x,y)||1;p.vx=x/d*(p.bot?190:230);p.vy=y/d*(p.bot?190:230);
 p.x=clamp(p.x+p.vx*dt,24,976);p.y=clamp(p.y+p.vy*dt,24,576);
 let dx=b.x-p.x,dy=b.y-p.y,dist=Math.hypot(dx,dy);
 if(dist<30){
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
const previousX=b.x;b.x+=b.vx*dt;b.y+=b.vy*dt;b.vx*=Math.pow(.985,dt*60);b.vy*=Math.pow(.985,dt*60);if(b.y<27||b.y>573){b.y=clamp(b.y,27,573);b.vy*=-.82;}const inGoalMouth=b.y>=252&&b.y<=348;if(previousX>12&&b.x<=12&&inGoalMouth)return goal(r,1);if(previousX<988&&b.x>=988&&inGoalMouth)return goal(r,0);if(b.x<12){b.x=12;b.vx=Math.abs(b.vx)*.8;}else if(b.x>988){b.x=988;b.vx=-Math.abs(b.vx)*.8;}if(r.phase==='playing'&&r.time<=0){if(r.score[0]===r.score[1])r.phase='golden_goal';else{r.phase='finished';clearInterval(r.timer);r.timer=null;}}bc(r);}
function connect(ws){
let r=null,p=null;
const err=t=>send(ws,{type:'error',message:t});
console.log('[Resenha Ball] Cliente conectado');
ws.on('error',e=>console.error('[Resenha Ball] Erro no socket:',e.message));
ws.on('message',raw=>{let m;try{m=JSON.parse(raw);}catch(e){console.warn('[Resenha Ball] Mensagem JSON inválida:',e.message);return;}
if(m.type==='create'||m.type==='join'){
if(r)return err('Você já está em uma sala.');
const requestedCode=String(m.code||'').toUpperCase();
r=m.type==='create'?create(m.duration):rooms.get(requestedCode);
if(!r){console.warn('[Resenha Ball] Sala não encontrada:',requestedCode);return err('Sala não encontrada.');}
if(r.phase!=='lobby')return err('A partida já começou.');
if(r.players.size>=8)return err('Sala cheia. Máximo de 8 jogadores.');
const id=crypto.randomBytes(5).toString('hex'),a=[...r.players.values()].filter(x=>x.team===0).length,b=[...r.players.values()].filter(x=>x.team===1).length;
p={id,name:name(m.name),team:a<=b?0:1,ws,x:260,y:300,vx:0,vy:0,input:{x:0,y:0,kick:false},kickAt:0};
r.players.set(id,p);if(!r.host)r.host=id;
console.log('[Resenha Ball] Jogador entrou:',{room:r.code,player:p.name,id:p.id,players:r.players.size});
send(ws,{type:'joined',code:r.code,id,host:r.host===id});bc(r);return;}
if(!r||!p)return;if(m.type==='team'&&r.phase==='lobby'){const team=Number(m.team);if(team!==0&&team!==1)return;const occupied=[...r.players.values()].filter(x=>x.id!==p.id&&x.team===team).length;if(occupied>=4)return err('Essa equipe já está completa. Escolha a outra equipe.');p.team=team;bc(r);}else if(m.type==='input'&&r.phase==='playing')p.input={x:clamp(+m.x||0,-1,1),y:clamp(+m.y||0,-1,1),kick:!!m.kick};else if(m.type==='start'&&p.id===r.host){if(!start(r))err('São necessários pelo menos 2 jogadores.');}else if(m.type==='back'&&p.id===r.host){clearInterval(r.timer);r.timer=null;r.phase='lobby';r.bots=[];bc(r);}});
ws.on('close',(code,reason)=>{
console.warn('[Resenha Ball] Socket fechado:',{code,reason:reason&&reason.toString(),room:r&&r.code,player:p&&p.name,id:p&&p.id,readyState:ws.readyState});
if(!r||!p)return;
r.players.delete(p.id);
if(!r.players.size){clearInterval(r.timer);rooms.delete(r.code);return;}
if(r.host===p.id)r.host=r.players.keys().next().value;
bc(r);
});
}
module.exports={connect,rooms};