export class DrumEngine{
  constructor(){this.ctx=null;this.master=null;this.filterCutoff=12000;this.drive=.0;this.delay=.15;this.kit='808';}
  ensure(){ if(!this.ctx){ this.ctx=new (window.AudioContext||window.webkitAudioContext)(); this.master=this.ctx.createGain(); this.master.gain.value=.8; this.master.connect(this.ctx.destination);} if(this.ctx.state==='suspended')this.ctx.resume(); }
  set(k,v){ this[k]=Number.isFinite(+v)?+v:v; }
  play(index, velocity=.9){
    this.ensure(); const map=['kick','snare','clap','hat','tom','rim','cow','perc','kick2','snare2','hatOpen','crash','zap','sub','click','noise']; const type=map[index%16];
    if(type.includes('kick')) return this.kick(velocity, type==='kick2');
    if(type.includes('snare')) return this.snare(velocity, type==='snare2');
    if(type==='clap') return this.noiseHit(.18,900,2.0,velocity);
    if(type.includes('hat')) return this.noiseHit(type==='hatOpen'?.45:.08,6000,5,velocity);
    if(type==='crash') return this.noiseHit(.75,7000,1.2,velocity);
    if(type==='sub') return this.tone(55,.35,'sine',velocity);
    if(type==='zap') return this.zap(velocity);
    return this.tone(180+index*45,.12,'triangle',velocity);
  }
  through(node){ const f=this.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=this.filterCutoff; f.Q.value=.8; node.connect(f); f.connect(this.master); return f; }
  kick(v,alt=false){ const now=this.ctx.currentTime; const osc=this.ctx.createOscillator(); const g=this.ctx.createGain(); osc.type='sine'; osc.frequency.setValueAtTime(alt?90:120,now); osc.frequency.exponentialRampToValueAtTime(alt?38:45,now+.32); g.gain.setValueAtTime(.9*v,now); g.gain.exponentialRampToValueAtTime(.001,now+.34); osc.connect(g); this.through(g); osc.start(now); osc.stop(now+.36); }
  snare(v,alt=false){ this.noiseHit(.17, alt?2200:1600, .9, v); this.tone(alt?230:185,.16,'triangle',v*.45); }
  noiseHit(dur,freq,q,v){ const now=this.ctx.currentTime; const len=this.ctx.sampleRate*dur; const b=this.ctx.createBuffer(1,len,this.ctx.sampleRate); const data=b.getChannelData(0); for(let i=0;i<data.length;i++) data[i]=Math.random()*2-1; const s=this.ctx.createBufferSource(); s.buffer=b; const bp=this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=freq; bp.Q.value=q; const g=this.ctx.createGain(); g.gain.setValueAtTime(.55*v,now); g.gain.exponentialRampToValueAtTime(.001,now+dur); s.connect(bp); bp.connect(g); this.through(g); s.start(now); s.stop(now+dur+.01); }
  tone(freq,dur,wave,v){ const now=this.ctx.currentTime; const o=this.ctx.createOscillator(); const g=this.ctx.createGain(); o.type=wave; o.frequency.value=freq; g.gain.setValueAtTime(.45*v,now); g.gain.exponentialRampToValueAtTime(.001,now+dur); o.connect(g); this.through(g); o.start(now); o.stop(now+dur+.02); }
  zap(v){ const now=this.ctx.currentTime; const o=this.ctx.createOscillator(); const g=this.ctx.createGain(); o.type='sawtooth'; o.frequency.setValueAtTime(900,now); o.frequency.exponentialRampToValueAtTime(90,now+.18); g.gain.setValueAtTime(.25*v,now); g.gain.exponentialRampToValueAtTime(.001,now+.2); o.connect(g); this.through(g); o.start(now); o.stop(now+.22); }
}
export const drumEngine=new DrumEngine();
