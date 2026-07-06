export class SynthEngine{
  constructor(){
    this.ctx=null; this.cutoff=9000; this.resonance=.6; this.pitch=0; this.lfoRate=4; this.lfoDepth=0; this.morph=.15;
    this.waveA='sine'; this.waveB='triangle'; this.waveC='sawtooth'; this.waveD='square';
  }
  ensure(){ if(!this.ctx) this.ctx=new (window.AudioContext||window.webkitAudioContext)(); if(this.ctx.state==='suspended') this.ctx.resume(); }
  setParam(k,v){ this[k]=Number.isFinite(+v)?+v:v; }
  play(freq, dur=.55, velocity=.75){
    this.ensure(); const now=this.ctx.currentTime; const out=this.ctx.createGain(); out.gain.value=0; out.connect(this.ctx.destination);
    const filter=this.ctx.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value=this.cutoff; filter.Q.value=this.resonance; filter.connect(out);
    const lfo=this.ctx.createOscillator(); const lfoGain=this.ctx.createGain(); lfo.frequency.value=this.lfoRate; lfoGain.gain.value=this.lfoDepth*900; lfo.connect(lfoGain); lfoGain.connect(filter.frequency); lfo.start(now); lfo.stop(now+dur+.15);
    const waves=[this.waveA,this.waveB,this.waveC,this.waveD];
    const weights=this.weights(this.morph); const oscs=[];
    waves.forEach((w,i)=>{ const osc=this.ctx.createOscillator(); const g=this.ctx.createGain(); osc.type=w; osc.frequency.value=freq*Math.pow(2,this.pitch/12); g.gain.value=weights[i]*.22*velocity; osc.connect(g); g.connect(filter); osc.start(now); osc.stop(now+dur+.15); oscs.push(osc); });
    out.gain.setValueAtTime(0,now); out.gain.linearRampToValueAtTime(.9*velocity,now+.015); out.gain.exponentialRampToValueAtTime(.001,now+dur);
  }
  weights(m){
    const x=Math.max(0,Math.min(1,Number(m))); const seg=x*3; const base=Math.floor(seg); const frac=seg-base; const w=[0,0,0,0]; w[base]=1-frac; w[Math.min(3,base+1)]+=frac; return w;
  }
}
export const synthEngine=new SynthEngine();
