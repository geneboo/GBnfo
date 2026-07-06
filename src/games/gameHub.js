import { synthEngine } from '../audio/synthEngine.js';
import { drumEngine } from '../audio/drumEngine.js';
import { addScore, scoreSubmission, wireScoreSubmission, leaderboardHTML } from '../ui/leaderboard.js';

let cleanupFns=[]; let raf=null;
function addCleanup(fn){ cleanupFns.push(fn); }
export function cleanupActiveGame(){ cleanupFns.forEach(fn=>{try{fn()}catch{}}); cleanupFns=[]; if(raf) cancelAnimationFrame(raf); raf=null; }

export function renderGame(id){
  if(id==='game_synth') return synthHTML();
  if(id==='game_drums') return drumsHTML();
  if(id==='game_pong') return canvasGameHTML('game_pong','NEON PONG','Move mouse/touch paddle. First to 5 scores.');
  if(id==='game_dice') return diceHTML();
  if(id==='game_reaction') return reactionHTML();
  if(id==='game_memory') return memoryHTML();
  return `<div class="arcade-container"><div class="arcade-title">Coming soon</div></div>`;
}
export function initGame(id){
  cleanupActiveGame();
  if(id==='game_synth') initSynth();
  if(id==='game_drums') initDrums();
  if(id==='game_pong') initPong();
  if(id==='game_dice') initDice();
  if(id==='game_reaction') initReaction();
  if(id==='game_memory') initMemory();
}
function canvasGameHTML(id,title,hint){ return `<div class="arcade-container"><div class="arcade-title">${title}</div><canvas id="game-canvas" class="game-canvas" width="520" height="300"></canvas><div class="score-row"><span id="game-score">Score 0</span><span id="game-level">Level 1</span></div><div style="color:#888;font-size:.75rem">${hint}</div><div id="score-submit"></div></div>`; }

// ---------------- SYNTH ----------------
const synthNotes = Array.from({length:20},(_,i)=>({
  midi:60+i, freq:440*Math.pow(2,(60+i-69)/12),
  key:['a','w','s','e','d','f','t','g','y','h','u','j','k','o','l','p',';','[','\'',']'][i],
  label:['C','C#','D','D#','E','F','F#','G','G#','A','A#','B','C5','C#5','D5','D#5','E5','F5','F#5','G5'][i]
}));
function synthHTML(){
  return `<div class="arcade-container"><div class="arcade-title">🎹 SYNTH LAB · 20 NOTE MORPH SYNTH</div><div class="synth-wrap"><div><div class="score-row">QWERTY: A W S E D F T G Y H U J K O L P ; [ ' ]</div><div id="piano" class="piano"></div></div><div class="knob-grid">
  ${ctrl('pitch','Pitch Wheel','range',-12,12,0,.1)}${ctrl('cutoff','Cutoff','range',120,16000,9000,1)}${ctrl('resonance','Resonance','range',.1,18,.6,.1)}${ctrl('lfoRate','LFO Rate','range',.1,18,4,.1)}${ctrl('lfoDepth','LFO Depth','range',0,1,0,.01)}${ctrl('morph','LFO/Wave Morph','range',0,1,.15,.01)}
  <div class="control-card"><label>Wave A<select id="waveA"><option>sine</option><option>triangle</option><option>sawtooth</option><option>square</option></select></label></div>
  <div class="control-card"><label>Wave B<select id="waveB"><option>triangle</option><option>sine</option><option>sawtooth</option><option>square</option></select></label></div>
  <div class="control-card"><label>Wave C<select id="waveC"><option>sawtooth</option><option>sine</option><option>triangle</option><option>square</option></select></label></div>
  <div class="control-card"><label>Wave D<select id="waveD"><option>square</option><option>sine</option><option>triangle</option><option>sawtooth</option></select></label></div>
</div></div><div style="color:#aaa;font-size:.75rem;margin-top:10px">Click/touch keys or use your computer keyboard. Pitch, filter and morph controls update in real time.</div></div>`;
}
function ctrl(id,label,type,min,max,value,step){ return `<div class="control-card"><label>${label}<span id="${id}-val">${value}</span></label><input id="${id}" type="${type}" min="${min}" max="${max}" value="${value}" step="${step}"></div>`; }
function initSynth(){
  const piano=document.getElementById('piano');
  const whiteIdx=[]; synthNotes.forEach((n,i)=>{ if(!n.label.includes('#')) whiteIdx.push(i); });
  whiteIdx.forEach((idx,wpos)=>{ const n=synthNotes[idx]; const key=document.createElement('button'); key.className='white-key'; key.dataset.idx=idx; key.textContent=`${n.label}\n${n.key.toUpperCase()}`; piano.appendChild(key); });
  synthNotes.forEach((n,i)=>{ if(n.label.includes('#')){ const b=document.createElement('button'); b.className='black-key'; b.dataset.idx=i; b.textContent=n.key.toUpperCase(); const before=whiteIdx.filter(x=>x<i).length; b.style.left=`calc(50% - ${(whiteIdx.length*44)/2}px + ${before*44-14}px)`; piano.appendChild(b); }});
  const playIdx=i=>{ const note=synthNotes[i]; if(!note)return; synthEngine.play(note.freq); const el=piano.querySelector(`[data-idx="${i}"]`); el?.classList.add('active'); setTimeout(()=>el?.classList.remove('active'),140); };
  piano.querySelectorAll('[data-idx]').forEach(el=> el.addEventListener('pointerdown',e=>{e.preventDefault(); playIdx(+el.dataset.idx);}));
  const onKey=e=>{ if(e.repeat || ['INPUT','SELECT'].includes(document.activeElement?.tagName)) return; const idx=synthNotes.findIndex(n=>n.key===e.key.toLowerCase()); if(idx>=0){e.preventDefault(); playIdx(idx);} };
  document.addEventListener('keydown',onKey); addCleanup(()=>document.removeEventListener('keydown',onKey));
  ['pitch','cutoff','resonance','lfoRate','lfoDepth','morph'].forEach(id=>{ const el=document.getElementById(id); const val=document.getElementById(`${id}-val`); el.addEventListener('input',()=>{ synthEngine.setParam(id, el.value); val.textContent=Number(el.value).toFixed(id==='cutoff'?0:2); }); synthEngine.setParam(id,el.value); });
  ['waveA','waveB','waveC','waveD'].forEach(id=>{ const el=document.getElementById(id); el.addEventListener('change',()=>synthEngine.setParam(id,el.value)); synthEngine.setParam(id,el.value); });
}

// ---------------- DRUMS ----------------
const padKeys=['1','2','3','4','q','w','e','r','a','s','d','f','z','x','c','v'];
const padNames=['KICK','SNARE','CLAP','HAT','TOM','RIM','COW','PERC','KICK2','SNARE2','OPEN','CRASH','ZAP','SUB','CLICK','NOISE'];
function drumsHTML(){ return `<div class="arcade-container"><div class="arcade-title">🥁 16 PAD DRUM MACHINE</div><div class="score-row"><label>Kit <select id="drum-kit"><option>808</option><option>909</option><option>Linn</option><option>Neurofunk</option></select></label></div><div class="pad-grid" id="pad-grid">${padNames.map((p,i)=>`<button class="drum-pad" data-idx="${i}">${p}<br><small>${padKeys[i].toUpperCase()}</small></button>`).join('')}</div><div class="knob-grid" style="max-width:520px;margin:12px auto">${ctrl('filterCutoff','Filter Cutoff','range',500,16000,12000,1)}${ctrl('drive','Drive','range',0,1,0,.01)}${ctrl('delay','Delay','range',0,1,.15,.01)}</div><div style="color:#aaa;font-size:.75rem">Keyboard rows: 1-4 / Q-R / A-F / Z-V. Click and touch supported.</div></div>`; }
function initDrums(){
  const trigger=i=>{ drumEngine.play(i); const el=document.querySelector(`.drum-pad[data-idx="${i}"]`); el?.classList.add('active'); setTimeout(()=>el?.classList.remove('active'),110); };
  document.querySelectorAll('.drum-pad').forEach(p=>p.addEventListener('pointerdown',e=>{e.preventDefault(); trigger(+p.dataset.idx);}));
  const onKey=e=>{ if(['INPUT','SELECT'].includes(document.activeElement?.tagName)) return; const idx=padKeys.indexOf(e.key.toLowerCase()); if(idx>=0){ e.preventDefault(); trigger(idx); } };
  document.addEventListener('keydown',onKey); addCleanup(()=>document.removeEventListener('keydown',onKey));
  document.getElementById('drum-kit').addEventListener('change',e=>drumEngine.set('kit',e.target.value));
  ['filterCutoff','drive','delay'].forEach(id=>{ const el=document.getElementById(id); const val=document.getElementById(`${id}-val`); el.addEventListener('input',()=>{drumEngine.set(id,el.value); val.textContent=Number(el.value).toFixed(id==='filterCutoff'?0:2);}); drumEngine.set(id,el.value); });
}

// ---------------- PONG ----------------
function initPong(){
  const c=document.getElementById('game-canvas'),ctx=c.getContext('2d'); let score=0,level=1,pScore=0,cScore=0,py=c.height/2-38,cy=c.height/2-38; const ball={x:c.width/2,y:c.height/2,vx:3.7,vy:2.5};
  const move=y=>py=Math.max(0,Math.min(c.height-76,y-38)); c.addEventListener('mousemove',e=>move(e.offsetY)); c.addEventListener('touchmove',e=>{const r=c.getBoundingClientRect();move(e.touches[0].clientY-r.top);e.preventDefault();},{passive:false});
  function reset(dir){ball.x=c.width/2;ball.y=c.height/2;ball.vx=dir*(3.6+level*.35);ball.vy=(Math.random()-.5)*5;}
  function loop(){ctx.fillStyle='#080812';ctx.fillRect(0,0,c.width,c.height); cy+=(ball.y-(cy+38))*(.055+level*.005); ball.x+=ball.vx; ball.y+=ball.vy; if(ball.y<6||ball.y>c.height-6)ball.vy*=-1; if(ball.x<25&&ball.y>cy&&ball.y<cy+76)ball.vx=Math.abs(ball.vx)*1.04; if(ball.x>c.width-25&&ball.y>py&&ball.y<py+76){ball.vx=-Math.abs(ball.vx)*1.04;score+=10;} if(ball.x<0){pScore++;reset(1)} if(ball.x>c.width){cScore++;reset(-1)} if(pScore>=5){level++;pScore=0;cScore=0;score+=100} ctx.fillStyle='#FF006E';ctx.fillRect(10,cy,10,76);ctx.fillStyle='#00E5FF';ctx.fillRect(c.width-20,py,10,76);ctx.fillStyle='#FFBE0B';ctx.beginPath();ctx.arc(ball.x,ball.y,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='18px Orbitron';ctx.fillText(`${cScore} : ${pScore}`,c.width/2-28,26);document.getElementById('game-score').textContent=`Score ${score}`;document.getElementById('game-level').textContent=`Level ${level}`;raf=requestAnimationFrame(loop)} loop(); addCleanup(()=>{document.getElementById('score-submit').innerHTML=scoreSubmission('game_pong',score);wireScoreSubmission('game_pong',score,()=>document.getElementById('score-submit').innerHTML=leaderboardHTML('game_pong'));});
}

// ---------------- DICE ----------------
function diceHTML(){return `<div class="arcade-container"><div class="arcade-title">🎲 DICE TOWER</div><div id="dice-display" style="font-size:42px;margin:16px">🎲</div><button class="arcade-button" id="dice-small">SMALL</button> <button class="arcade-button" id="dice-big">BIG</button><div class="score-row"><span id="dice-level">Level 1</span><span id="dice-streak">Streak 0</span><span id="dice-score">Score 0</span></div><div id="score-submit"></div></div>`;}
function initDice(){ let level=1,streak=0,score=0; const cfg=()=> level<10?[2,6]:level<20?[3,6]:level<30?[3,8]:level<40?[4,10]:level<50?[5,12]:[6,20]; function play(choice){const [n,s]=cfg();const rolls=Array.from({length:n},()=>1+Math.floor(Math.random()*s));const total=rolls.reduce((a,b)=>a+b,0),mid=Math.floor((n+n*s)/2),res=total<=mid?'small':'big';document.getElementById('dice-display').textContent=`${rolls.join(' + ')} = ${total}`; if(choice===res){streak++;score+=level*50;if(streak>=3){level++;streak=0;score+=500}}else streak=0; document.getElementById('dice-level').textContent=`Level ${level}`;document.getElementById('dice-streak').textContent=`Streak ${streak}`;document.getElementById('dice-score').textContent=`Score ${score}`;} document.getElementById('dice-small').onclick=()=>play('small');document.getElementById('dice-big').onclick=()=>play('big'); addCleanup(()=>{document.getElementById('score-submit').innerHTML=scoreSubmission('game_dice',score);wireScoreSubmission('game_dice',score,()=>document.getElementById('score-submit').innerHTML=leaderboardHTML('game_dice'));});}

// ---------------- REACTION ----------------
function reactionHTML(){return `<div class="arcade-container"><div class="arcade-title">⚡ REACTION</div><div id="react-arena" style="position:relative;height:250px;border:2px solid #FF9F1C;border-radius:12px;background:#080812;overflow:hidden"><button id="react-target" style="position:absolute;width:54px;height:54px;border-radius:50%;border:0;background:#FF9F1C;box-shadow:0 0 24px #FF9F1C;left:50%;top:50%"></button></div><div class="score-row"><span id="react-score">Score 0</span><span id="react-best">Best - ms</span></div><div id="score-submit"></div></div>`;}
function initReaction(){const arena=document.getElementById('react-arena'),target=document.getElementById('react-target');let score=0,best=99999,start=0;function spawn(){const r=arena.getBoundingClientRect();target.style.left=Math.random()*(r.width-60)+'px';target.style.top=Math.random()*(r.height-60)+'px';start=performance.now()} target.onclick=()=>{const rt=performance.now()-start;best=Math.min(best,rt);score+=Math.max(10,Math.round(500-rt));document.getElementById('react-score').textContent=`Score ${score}`;document.getElementById('react-best').textContent=`Best ${Math.round(best)} ms`;spawn()};spawn(); addCleanup(()=>{document.getElementById('score-submit').innerHTML=scoreSubmission('game_reaction',score);wireScoreSubmission('game_reaction',score,()=>document.getElementById('score-submit').innerHTML=leaderboardHTML('game_reaction'));});}

// ---------------- MEMORY ----------------
function memoryHTML(){return `<div class="arcade-container"><div class="arcade-title">🧠 MEMORY MATCH</div><div id="memory-grid" class="pad-grid"></div><div class="score-row"><span id="mem-moves">Moves 0</span><span id="mem-score">Score 0</span></div><div id="score-submit"></div></div>`;}
function initMemory(){const sy=['⚡','🎵','📊','🧠','🚀','🎲','💎','🔥'];const deck=[...sy,...sy].sort(()=>Math.random()-.5),grid=document.getElementById('memory-grid');let first=null,lock=false,moves=0,matched=0,score=1000;deck.forEach(s=>{const b=document.createElement('button');b.className='drum-pad';b.textContent='?';b.dataset.s=s;b.onclick=()=>{if(lock||b.classList.contains('matched')||b===first)return;b.textContent=s;b.classList.add('active');if(!first){first=b;return}moves++;score-=10;document.getElementById('mem-moves').textContent=`Moves ${moves}`;if(first.dataset.s===s){first.classList.add('matched');b.classList.add('matched');matched++;score+=150;first=null;if(matched===8){document.getElementById('score-submit').innerHTML=scoreSubmission('game_memory',score);wireScoreSubmission('game_memory',score,()=>document.getElementById('score-submit').innerHTML=leaderboardHTML('game_memory'));}}else{lock=true;setTimeout(()=>{first.textContent='?';b.textContent='?';first.classList.remove('active');b.classList.remove('active');first=null;lock=false},650)}document.getElementById('mem-score').textContent=`Score ${score}`};grid.appendChild(b);});}
