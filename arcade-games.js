/* Gene Boo standalone arcade runtime. No Three.js dependency. */
export const gameNames = {
				game_synth: 'Synth Lab',
				game_drums: 'Drum Machine',
				game_pong: 'Neon Pong',
				game_letters: 'Letter Rain',
				game_racer: 'Neon Racer',
				game_1943: "Gene's Space Shooter",
				game_breakout: 'Plasma Breakout',
				game_snake: 'Circuit Snake',
				game_memory: 'Beat Memory',
				game_blackjack: 'Blackjack',
				game_hangman: 'Hangman',
				game_match3: 'Match-3',
				game_tetris: 'Neon Tetris',
				game_spellicopter: 'Spellicopter',
				game_pacman: 'Neon Maze',
				game_bubble: 'Bubble Burst'
			};
			const LB = 'gene_arcade_leaderboard_v3';

			function loadLB() {
				try {
					return JSON.parse(localStorage.getItem(LB)) || {};
				} catch {
					return {};
				}
			}

			function saveLB(db) {
				localStorage.setItem(LB, JSON.stringify(db));
			}

			function addScore(id, ini, score) {
				const db = loadLB();
				db[id] ??= [];
				db[id].push({
					ini: String(ini || 'GBD').toUpperCase().slice(0, 3).padEnd(3, 'X'),
					score: Math.round(score),
					date: new Date().toLocaleString([], {
						year: 'numeric',
						month: '2-digit',
						day: '2-digit',
						hour: '2-digit',
						minute: '2-digit'
					})
				});
				db[id].sort((a, b) => b.score - a.score);
				db[id] = db[id].slice(0, 10);
				saveLB(db);
			}

			function submitHTML(id, score) {
				return `
										<div class="initials">
											<strong>SCORE ${Math.round(score)}</strong>
											<input id="ini" maxlength="3" value="GBD"/>
											<button class="arcbtn" id="saveScore">SAVE INITIALS</button>
											<button class="arcbtn" id="showOneLb">SHOW TABLE</button>
										</div>`;
			}

			function wireSubmit(id, score) {
				document.getElementById('ini')?.focus();
				document.getElementById('saveScore')?.addEventListener('click', () => {
					addScore(id, document.getElementById('ini')?.value, score);
					document.getElementById('inner').innerHTML = leaderboardHTML(id);
				});
				document.getElementById('showOneLb')?.addEventListener('click', () => document.getElementById('inner').innerHTML = leaderboardHTML(id));
			}

			function leaderboardHTML(one = null) {
				const db = loadLB();
				const ids = one ? [one] : Object.keys(gameNames);
				let h = `
										<div class="modal-title">🏆 Arcade Leaderboards</div>
										<div class="modal-subtitle">3-letter initials · persistent local arcade scores</div>`;
				ids.forEach(id => {
					h += `
										<h3 style="font-family:Orbitron;color:var(--accent);margin-top:18px">${gameNames[id] || id}</h3>
										<table class="lbtable">
											<thead>
												<tr>
													<th>#</th>
													<th>INI</th>
													<th>SCORE</th>
													<th>DATE</th>
												</tr>
											</thead>
											<tbody>`;
					const rows = db[id] || [];
					if (!rows.length) h += `
												<tr>
													<td colspan="4" style="color:#888">No scores yet.</td>
												</tr>`;
					rows.forEach((r, i) => h += `
												<tr>
													<td>${i + 1}</td>
													<td>${String(r.ini).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}</td>
													<td>${r.score}</td>
													<td>${r.date}</td>
												</tr>`);
					h += `
											</tbody>
										</table>`;
				});
				return h;
			}

class AudioManager {
  constructor(){ this.ctx=null; this.master=null; this.capture=null; this.recorder=null; this.chunks=[]; }
  ensure(){ if(!this.ctx){ this.ctx=new (window.AudioContext||window.webkitAudioContext)(); this.master=this.ctx.createGain(); this.master.gain.value=.82; this.master.connect(this.ctx.destination); if(this.ctx.createMediaStreamDestination){ this.capture=this.ctx.createMediaStreamDestination(); this.master.connect(this.capture); } } if(this.ctx.state==='suspended') this.ctx.resume(); return this.ctx; }
  out(){ this.ensure(); return this.master; }
  startRecording(){ this.ensure(); if(!this.capture||!window.MediaRecorder) return false; if(this.recorder?.state==='recording') return true; this.chunks=[]; this.recorder=new MediaRecorder(this.capture.stream); this.recorder.ondataavailable=e=>{if(e.data.size)this.chunks.push(e.data)}; this.recorder.start(); return true; }
  stopRecording(name='gene-arcade-recording.webm'){ return new Promise(resolve=>{ if(!this.recorder||this.recorder.state==='inactive'){resolve(false);return;} this.recorder.onstop=()=>{const blob=new Blob(this.chunks,{type:this.recorder.mimeType||'audio/webm'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);resolve(true)};this.recorder.stop(); }); }
}

				const audioMgr = new AudioManager();
				
export class UIManager {
					constructor(stationData = {}, stationHTML = () => '', elements = {}) {
						this.stationData = stationData;
						this.stationHTML = stationHTML;
						this.stationData = stationData;
						this.stationHTML = stationHTML;
						this.overlay = elements.overlay || document.getElementById('overlay');
						this.inner = elements.inner || document.getElementById('inner');
						this.closeBtn = elements.closeButton || document.getElementById('close');
						this.hint = elements.hint || document.getElementById('hint') || {style:{}};
						this.lbbtn = document.getElementById('lbbtn');
						this.activeGameId = null;
						this.gameCleanup = [];
						this.gameRAF = null;
						if (this.closeBtn) this.closeBtn.onclick = () => this.close();
						this.overlay?.addEventListener('pointerdown', e => {
							if (e.target === this.overlay) this.close();
						});
						document.addEventListener('keydown', e => {
							if (e.key === 'Escape' && this.overlay?.classList.contains('active')) this.close();
						});
						if (this.lbbtn) this.lbbtn.onclick = () => {
							this.openHTML(leaderboardHTML());
						};
					}
					openHTML(html) {
						this.cleanupGame();
						this.inner.innerHTML = html;
						this.overlay?.classList.add('active');
						this.hint.style.opacity = '0';
					}
					close() {
						this.cleanupGame();
						this.overlay?.classList.remove('active');
						this.hint.style.opacity = '1';
					}
					cleanupGame() {
						this.gameCleanup.forEach(fn => {
							try {
								fn();
							} catch {}
						});
						this.gameCleanup = [];
						this.activeGameId = null;
						if (this.gameRAF) cancelAnimationFrame(this.gameRAF);
						this.gameRAF = null;
					}
					addCleanup(fn) {
						this.gameCleanup.push(fn);
					}
					finishGame(id, score) {
						if (score >= 777) this.unlockGameEgg(id, score);
						const el = document.getElementById('submit');
						if (el) {
							el.innerHTML = submitHTML(id, score);
							wireSubmit(id, score);
						}
					}
					unlockGameEgg(id, score) {
						const key='gene_arcade_eggs_v1', db=JSON.parse(localStorage.getItem(key)||'{}');
						if(db[id]) return; db[id]={score,date:new Date().toISOString()}; localStorage.setItem(key,JSON.stringify(db));
						const egg=document.createElement('div'); egg.className='combochip easter-egg'; egg.textContent='🥚 SECRET UNLOCKED: '+(gameNames[id]||id)+' OVERDRIVE';
						document.getElementById('submit')?.prepend(egg);
					}

					checkEasterEgg(level) {
						if (level === 30) {
							this.openHTML(`
																															<div class="modal-title easter-egg">🔓 LEVEL 30 EASTER EGG!</div>
																															<div class="modal-subtitle">// GENE BOO // MAXIMUM OVERDRIVE //</div>
																															<div style="font-family:Roboto Mono;white-space:pre-wrap;padding:20px;background:rgba(255,255,255,0.05);border-left:4px solid var(--accent);margin:20px 0">You have reached the theoretical limit.
																																<br>The stack is clean. The noise is zero.
																																	<br>Old whip, ancient keys, but the signal is pure.
																																		<br>
																																			<br>⚡ INNOVATION UNDER CONSTRAINTS ⚡
																																			</div>`);
						}
					}
					openStation(id) {
						if (this.stationData[id]) this.openHTML(this.stationHTML(this.stationData[id]));
					}
					openGame(id) {
						const html = this.renderGameHTML(id);
						this.openHTML(html);
						this.activeGameId = id;
						setTimeout(() => this.initGameEngine(id), 70);
					}
					renderGameHTML(id) {
						switch (id) {
							case 'game_synth':
								return this.synthHTML();
							case 'game_drums':
								return this.drumsHTML();
							case 'game_memory':
								return this.memoryHTML();
							default:
								return this.canvasHTML(id, gameNames[id] || id, 'Click to start. Arrow keys / Mouse. 3-5 lives depending on mode.', 560, 340);
						}
					}
					canvasHTML(id, title, hintText, w = 560, h = 340) {
						return `
																																			<div class="arcade">
																																				<div class="arc-title">${title}</div>
																																				<canvas id="gameCanvas" class="gamecanvas" width="${w}" height="${h}" tabindex="0"></canvas>
																																				<div class="hudrow">
																																					<span id="score">Score 0</span>
																																					<span id="level">Level 1</span>
																																					<span id="status">Ready</span>
																																				</div>
																																				<div class="touchhelp">${hintText}</div>
																																				<div id="submit"></div>
																																			</div>`;
					}
					memoryHTML() {
						const labels = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C5'];
						const keys = ['A', 'S', 'D', 'F', 'J', 'K', 'L', ';'];
						return `
																																			<div class="arcade">
																																				<div class="arc-title">🧠 BEAT MEMORY · SYNTH + DRUM SIMON</div>
																																				<div class="hudrow">
																																					<span class="combochip">Keyboard: ${keys.join(' ')}</span>
																																					<span class="combochip">2 attempts per level · fail twice = game over</span>
																																					<span class="combochip">Later levels add chords / combos</span>
																																				</div>
																																				<div class="hudrow">
																																					<button class="arcbtn" id="modeSynth">🎹 Synth tones</button>
																																					<button class="arcbtn" id="modeDrum">🥁 Drum hits</button>
																																					<button class="arcbtn" id="startMem">START</button>
																																				</div>
																																				<div id="memgrid" class="padgrid" tabindex="0">${labels.map((p,i)=>`
																																					<button class="drumpad" data-mem="${i}">${p}
																																						<br>
																																							<small>${keys[i]}</small>
																																						</button>`).join('')}
																																					</div>
																																					<div class="hudrow">
																																						<span id="score">Score 0</span>
																																						<span id="level">Level 1</span>
																																						<span id="lives">Lives 3</span>
																																						<span id="status">Choose a mode and start</span>
																																					</div>
																																					<div id="submit"></div>
																																				</div>`;
					}
					synthHTML() {
						return `
																																				<div class="arcade">
																																					<div class="arc-title">🎹 SYNTH LAB · 60s</div>
																																					<div class="hudrow">QWERTY: A W S E D F T G Y H U J K O L P ; [ ' ]</div>
																																					<div id="piano" class="piano" tabindex="0"></div>
																																					<div class="controls">${this.ctrl('pitch','Pitch',-12,12,0,0.1)}${this.ctrl('cutoff','Cutoff',120,16000,9000,1)}${this.ctrl('resonance','Resonance',0.1,18,0.7,0.1)}${this.ctrl('lfoRate','LFO Rate',0.1,18,4,0.1)}${this.ctrl('lfoDepth','LFO Depth',0,1,0,0.01)}${this.ctrl('morph','Wave Morph',0,1,0.15,0.01)}${this.sel('wave0','Wave A','sine')}${this.sel('wave1','Wave B','triangle')}${this.sel('wave2','Wave C','sawtooth')}${this.sel('wave3','Wave D','square')}</div>
																																					<div class="hudrow">
																																						<button class="arcbtn" id="synthMemory">🧠 Start Synth Memory</button><button class="arcbtn" id="startRec">⏺ Record</button><button class="arcbtn" id="stopRec">⏹ Stop & Save</button>
																																						<span id="score">Score 0</span>
																																						<span id="timer">60s</span>
																																					</div>
																																					<div id="submit"></div>
																																				</div>`;
					}
					ctrl(id, l, min, max, val, step) {
						return `
																																				<div class="ctrl">
																																					<label>${l}
																																						<span id="${id}v">${val}</span>
																																					</label>
																																					<input id="${id}" type="range" min="${min}" max="${max}" value="${val}" step="${step}">
																																					</div>`;
					}
					sel(id, l, val) {
						return `
																																					<div class="ctrl">
																																						<label>${l}</label>
																																						<select id="${id}">
																																							<option>sine</option>
																																							<option>triangle</option>
																																							<option>sawtooth</option>
																																							<option>square</option>
																																						</select>
																																					</div>`;
					}
					drumsHTML() {
						const kits = ['808', '909', 'Jazz', 'Electro', 'DnB', 'House', 'Techno', 'Acoustic'];
						return `
																																					<div class="arcade">
																																						<div class="arc-title">🥁 DRUM MACHINE · 60s
																																							<select id="kitSelect" style="margin-left:1em;font-size:0.8em;">${kits.map(k=>`
																																								<option value="${k}">${k}</option>`).join('')}
																																							</select>
																																						</div>
																																						<div class="hudrow">
																																							<button class="arcbtn" id="drumMemory">🧠 Start Drum Memory</button><button class="arcbtn" id="startRec">⏺ Record</button><button class="arcbtn" id="stopRec">⏹ Stop & Save</button>
																																						</div>
																																						<div id="padgrid" class="padgrid" tabindex="0">${['KICK','SNARE','CLAP','HAT','TOM','RIM','COW','PERC','KICK2','SNARE2','OPEN','CRASH','ZAP','SUB','CLICK','NOISE'].map((p,i) => `
																																							<button class="drumpad" data-pad="${i}">${p}
																																								<br>
																																									<small>${['1','2','3','4','Q','W','E','R','A','S','D','F','Z','X','C','V'][i]}</small>
																																								</button>`).join('')}
																																							</div>
																																							<div class="hudrow">
																																								<span id="score">Score 0</span>
																																								<span id="timer">60s</span>
																																							</div>
																																							<div id="submit"></div>
																																						</div>`;
					}
					initGameEngine(id) {
						const map = {
							game_synth: () => this.initSynth(),
							game_drums: () => this.initDrums(),
							game_pong: () => this.initPong(),
							game_letters: () => this.initLetters(),
							game_racer: () => this.initRacer(),
							game_1943: () => this.init1943(),
							game_breakout: () => this.initBreakout(),
							game_snake: () => this.initSnake(),
							game_memory: () => this.initMemory(),
							game_blackjack: () => this.initBlackjack(),
							game_hangman: () => this.initHangman(),
							game_match3: () => this.initMatch3(),
							game_tetris: () => this.initTetris(),
							game_spellicopter: () => this.initSpellicopter(),
							game_pacman: () => this.initPacman(),
							game_bubble: () => this.initBubble()
						};
						if (map[id]) map[id]();
					}
					/* ── Canvas Games Helper ── */
					initCanvasKeys() {
						const c = document.getElementById('gameCanvas');
						const keys = {};
						const kd = e => {
							keys[e.key] = true;
							if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'a', 'd', 'w', 's'].includes(e.key)) e.preventDefault();
						};
						const ku = e => {
							keys[e.key] = false;
						};
						document.addEventListener('keydown', kd);
						document.addEventListener('keyup', ku);
						this.addCleanup(() => {
							document.removeEventListener('keydown', kd);
							document.removeEventListener('keyup', ku);
						});
						setTimeout(() => c?.focus(), 50);
						return [c, c?.getContext('2d'), keys];
					}
					/* ── Synth Lab ── */
					initSynth() {
						document.getElementById('startRec')?.addEventListener('click',()=>{ const ok=audioMgr.startRecording(); const t=document.getElementById('timer'); if(t) t.textContent=ok?'REC':'Recording unsupported'; });
						document.getElementById('stopRec')?.addEventListener('click',()=>audioMgr.stopRecording('synth-jam.webm'));
						const synthKeys = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j', 'k', 'o', 'l', 'p', ';', '[', '\'', ']'];
						const synthLabels = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5'];
						const synthFreq = synthLabels.map((_, i) => 440 * Math.pow(2, (60 + i - 69) / 12));
						let synthState = {
							pitch: 0,
							cutoff: 9000,
							resonance: 0.7,
							lfoRate: 4,
							lfoDepth: 0,
							morph: 0.15,
							waves: ['sine', 'triangle', 'sawtooth', 'square'],
							score: 0,
							timeLeft: 60
						};
						document.getElementById('synthMemory')?.addEventListener('click', () => {
							this.openGame('game_memory');
							setTimeout(() => document.getElementById('modeSynth')?.click(), 120);
						});
						const p = document.getElementById('piano');
						if (!p) return;
						p.innerHTML = '';
						const white = [];
						synthLabels.forEach((n, i) => {
							if (!n.includes('#')) white.push(i);
						});
						white.forEach(i => {
							const b = document.createElement('button');
							b.className = 'whitekey';
							b.dataset.note = i;
							b.textContent = synthLabels[i] + '\n' + synthKeys[i].toUpperCase();
							p.appendChild(b);
						});
						synthLabels.forEach((n, i) => {
							if (n.includes('#')) {
								const b = document.createElement('button');
								b.className = 'blackkey';
								b.dataset.note = i;
								b.textContent = synthKeys[i].toUpperCase();
								const before = white.filter(x => x < i).length;
								b.style.left = `calc(50% - ${(white.length*42)/2}px + ${before*42-14}px)`;
								p.appendChild(b);
							}
						});
						const playNote = (i) => {
							audioMgr.ensure();
							if (synthState.timeLeft <= 0) return;
							synthState.score += 10;
							const sc = document.getElementById('score');
							if (sc) sc.textContent = `Score ${synthState.score}`;
							const ctx = audioMgr.ctx,
								now = ctx.currentTime,
								f = synthFreq[i] * Math.pow(2, synthState.pitch / 12);
							const out = ctx.createGain(),
								filter = ctx.createBiquadFilter();
							filter.type = 'lowpass';
							filter.frequency.value = synthState.cutoff;
							filter.Q.value = synthState.resonance;
							filter.connect(out);
							out.connect(audioMgr.out());
							const lfo = ctx.createOscillator(),
								lg = ctx.createGain();
							lfo.frequency.value = synthState.lfoRate;
							lg.gain.value = synthState.lfoDepth * 1000;
							lfo.connect(lg);
							lg.connect(filter.frequency);
							lfo.start(now);
							lfo.stop(now + 0.8);
							const weights = [0, 0, 0, 0];
							const x = Math.max(0, Math.min(1, synthState.morph)) * 3;
							const b = Math.floor(x),
								frac = x - b;
							weights[b] = 1 - frac;
							weights[Math.min(3, b + 1)] += frac;
							weights.forEach((wt, j) => {
								if (wt <= 0) return;
								const o = ctx.createOscillator(),
									g = ctx.createGain();
								o.type = synthState.waves[j];
								o.frequency.value = f;
								g.gain.value = wt * 0.24;
								o.connect(g);
								g.connect(filter);
								o.start(now);
								o.stop(now + 0.72);
							});
							out.gain.setValueAtTime(0, now);
							out.gain.linearRampToValueAtTime(0.9, now + 0.015);
							out.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
							const el = document.querySelector(`[data-note="${i}"]`);
							if (el) {
								el.classList.add('active');
								setTimeout(() => el.classList.remove('active'), 130);
							}
						};
						p.querySelectorAll('[data-note]').forEach(k => k.addEventListener('pointerdown', e => {
							e.preventDefault();
							playNote(+k.dataset.note);
							p.focus();
						}));
						['pitch', 'cutoff', 'resonance', 'lfoRate', 'lfoDepth', 'morph'].forEach(id => {
							const el = document.getElementById(id),
								v = document.getElementById(id + 'v');
							if (el) el.oninput = () => {
								synthState[id] = +el.value;
								if (v) v.textContent = (+el.value).toFixed(id === 'cutoff' ? 0 : 2);
							};
						});
						[0, 1, 2, 3].forEach(i => {
							const el = document.getElementById('wave' + i);
							if (el) {
								el.value = synthState.waves[i];
								el.onchange = () => {
									synthState.waves[i] = el.value;
									p.focus();
								};
							}
						});
						const timer = setInterval(() => {
							synthState.timeLeft--;
							const t = document.getElementById('timer');
							if (t) t.textContent = synthState.timeLeft + 's';
							if (synthState.timeLeft <= 0) {
								clearInterval(timer);
								this.finishGame('game_synth', synthState.score);
							}
						}, 1000);
						this.addCleanup(() => clearInterval(timer));
						const onKey = (e) => {
							if (this.activeGameId !== 'game_synth') return;
							if (['INPUT', 'SELECT'].includes(document.activeElement?.tagName)) return;
							const i = synthKeys.indexOf(e.key.toLowerCase());
							if (i >= 0) {
								e.preventDefault();
								e.stopPropagation();
								playNote(i);
							}
						};
						document.addEventListener('keydown', onKey, true);
						this.addCleanup(() => document.removeEventListener('keydown', onKey, true));
						setTimeout(() => p.focus(), 80);
					}
					/* ── Drum Machine ── */
					initDrums() {
						document.getElementById('startRec')?.addEventListener('click',()=>{ const ok=audioMgr.startRecording(); const t=document.getElementById('timer'); if(t) t.textContent=ok?'REC':'Recording unsupported'; });
						document.getElementById('stopRec')?.addEventListener('click',()=>audioMgr.stopRecording('drum-jam.webm'));
						let drum = {
							score: 0,
							timeLeft: 60,
							kit: '808'
						};
						const padKeys = ['1', '2', '3', '4', 'q', 'w', 'e', 'r', 'a', 's', 'd', 'f', 'z', 'x', 'c', 'v'];
						const grid = document.getElementById('padgrid');
						const kitSelect = document.getElementById('kitSelect');
						if (kitSelect) kitSelect.addEventListener('change', e => {
							drum.kit = e.target.value;
						});
						document.getElementById('drumMemory')?.addEventListener('click', () => {
							this.openGame('game_memory');
							setTimeout(() => document.getElementById('modeDrum')?.click(), 120);
						});
						const trigger = (i) => {
							audioMgr.ensure();
							if (drum.timeLeft <= 0) return;
							drum.score += 5;
							const s = document.getElementById('score');
							if (s) s.textContent = `Score ${drum.score}`;
							const ctx = audioMgr.ctx,
								t = ctx.currentTime;
							const playTone = (type, freq, endFreq, ramp, gainVal, decay) => {
								const o = ctx.createOscillator(),
									g = ctx.createGain();
								o.type = type;
								o.frequency.setValueAtTime(freq, t);
								o.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 0.01), t + ramp);
								g.gain.setValueAtTime(gainVal, t);
								g.gain.exponentialRampToValueAtTime(0.001, t + decay);
								o.connect(g);
								g.connect(audioMgr.out());
								o.start(t);
								o.stop(t + decay + 0.05);
							};
							const playNoise = (filterType, freq, gainVal, decay) => {
								const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
								const d = buf.getChannelData(0);
								for (let j = 0; j < d.length; j++) d[j] = Math.random() * 2 - 1;
								const src = ctx.createBufferSource();
								src.buffer = buf;
								const f = ctx.createBiquadFilter();
								f.type = filterType;
								f.frequency.value = freq;
								const g = ctx.createGain();
								g.gain.setValueAtTime(gainVal, t);
								g.gain.exponentialRampToValueAtTime(0.001, t + decay);
								src.connect(f);
								f.connect(g);
								g.connect(audioMgr.out());
								src.start(t);
								src.stop(t + decay + 0.05);
							};
							const k = drum.kit;
							if (i === 0 || i === 8) {
								const p = {
									'808': [150, 0.01, 0.4, 1, 0.5],
									'909': [400, 55, 0.08, 1, 0.25],
									'Jazz': [90, 65, 0.05, 0.8, 0.15],
									'Electro': [120, 45, 0.1, 1, 0.2],
									'DnB': [80, 35, 0.12, 1, 0.3],
									'House': [110, 35, 0.25, 1, 0.35],
									'Techno': [120, 45, 0.1, 1, 0.2],
									'Acoustic': [100, 40, 0.08, 0.9, 0.25]
								} [k] || [150, 0.01, 0.4, 1, 0.5];
								playTone('sine', i === 8 ? p[0] * 0.6 : p[0], p[1], p[2], p[3], p[4]);
							} else if (i === 1 || i === 9) {
								const p = {
									'808': [150, 50, 0.05, 0.4, 0.12, 800, 0.5, 0.2],
									'909': [200, 70, 0.04, 0.5, 0.1, 1000, 0.6, 0.15],
									'Jazz': [100, 40, 0.03, 0.25, 0.08, 600, 0.2, 0.1],
									'Electro': [160, 55, 0.04, 0.5, 0.1, 900, 0.6, 0.12],
									'DnB': [140, 40, 0.05, 0.45, 0.14, 750, 0.55, 0.25],
									'House': [150, 50, 0.05, 0.45, 0.13, 850, 0.5, 0.18],
									'Techno': [160, 55, 0.04, 0.5, 0.1, 900, 0.6, 0.12],
									'Acoustic': [130, 45, 0.04, 0.4, 0.1, 700, 0.45, 0.15]
								} [k] || [150, 50, 0.05, 0.4, 0.12, 800, 0.5, 0.2];
								playTone('triangle', i === 9 ? p[0] * 1.2 : p[0], i === 9 ? p[1] * 1.2 : p[1], p[2], p[3], p[4]);
								playNoise('bandpass', i === 9 ? p[5] * 1.5 : p[5], p[6], p[7]);
							} else if (i === 2) {
								const p = {
									'808': [0.5, 0.15, 3, 2000, 1500],
									'909': [0.6, 0.12, 2, 2200, 1600],
									'Jazz': [0.3, 0.1, 2, 2500, 1800],
									'Electro': [0.4, 0.1, 3, 2100, 1500],
									'DnB': [0.5, 0.15, 4, 1900, 1400],
									'House': [0.55, 0.15, 3, 2000, 1500],
									'Techno': [0.4, 0.1, 3, 2100, 1500],
									'Acoustic': [0.35, 0.12, 2, 2300, 1700]
								} [k] || [0.5, 0.15, 3, 2000, 1500];
								playNoise('bandpass', p[3], p[0], p[1]);
								for (let n = 0; n < p[2]; n++) playNoise('bandpass', p[4], p[0] * 0.3, p[1] * 0.5);
							} else if (i === 3 || i === 10) {
								const g = ctx.createGain(),
									f = ctx.createBiquadFilter();
								f.type = 'highpass';
								f.frequency.value = 7000;
								g.gain.setValueAtTime(0.5, t);
								g.gain.exponentialRampToValueAtTime(0.001, t + (i === 10 ? 0.15 : 0.06));
								f.connect(g);
								g.connect(audioMgr.out());
								[2, 3, 4.16, 5.43].forEach(r => {
									const o = ctx.createOscillator();
									o.type = 'square';
									o.frequency.value = 40 * r;
									o.connect(f);
									o.start(t);
									o.stop(t + 0.06);
								});
							} else if (i === 4) playTone('triangle', 200, 80, 0.15, 0.7, 0.2);
							else if (i === 5) playTone('square', 800, 400, 0.03, 0.4, 0.08);
							else if (i === 6) playTone('triangle', 587, 587, 0.001, 0.5, 0.08);
							else if (i === 7 || i === 11) playNoise('highpass', 5000, 0.5, i === 11 ? 0.4 : 0.12);
							else if (i === 12) playTone('square', 2000, 50, 0.05, 0.4, 0.08);
							else if (i === 13) playTone('sine', 40, 0.01, 0.6, 0.8, 0.5);
							else if (i === 14) playTone('sine', 3000, 3000, 0.001, 0.3, 0.03);
							else if (i === 15) playNoise('allpass', 1000, 0.6, 0.1);
							const b = document.querySelector(`[data-pad="${i}"]`);
							if (b) {
								b.classList.add('active');
								setTimeout(() => b.classList.remove('active'), 100);
							}
						};
						if (grid) grid.querySelectorAll('[data-pad]').forEach(p => p.addEventListener('pointerdown', e => {
							e.preventDefault();
							trigger(+p.dataset.pad);
							grid.focus();
						}));
						const onKey = (e) => {
							if (this.activeGameId !== 'game_drums') return;
							const i = padKeys.indexOf(e.key.toLowerCase());
							if (i >= 0) {
								e.preventDefault();
								e.stopPropagation();
								trigger(i);
								if (grid) grid.focus();
							}
						};
						document.addEventListener('keydown', onKey, true);
						this.addCleanup(() => document.removeEventListener('keydown', onKey, true));
						const timer = setInterval(() => {
							drum.timeLeft--;
							const tm = document.getElementById('timer');
							if (tm) tm.textContent = drum.timeLeft + 's';
							if (drum.timeLeft <= 0) {
								clearInterval(timer);
								this.finishGame('game_drums', drum.score);
							}
						}, 1000);
						this.addCleanup(() => clearInterval(timer));
						if (grid) setTimeout(() => grid.focus(), 80);
					}
					/* ── Neon Pong (with game-over at 5) ── */
					initPong() {
						const [c, x, keys] = this.initCanvasKeys();
						if (!c) return;
						let py = c.height / 2 - 42,
							cy = c.height / 2 - 42,
							score = 0,
							ps = 0,
							cs = 0,
							running = true;
						const ph = 84;
						let ball = {
							x: c.width / 2,
							y: c.height / 2,
							vx: 4,
							vy: 2.2
						};
						let power = null,
							shield = 0;
						const reset = (dir) => {
							ball = {
								x: c.width / 2,
								y: c.height / 2,
								vx: dir * (4 + ps * 0.15),
								vy: (Math.random() - 0.5) * 4
							};
						};
						c.addEventListener('mousemove', e => py = Math.max(0, Math.min(c.height - ph, e.offsetY - ph / 2)));
						c.addEventListener('touchmove', e => {
							const r = c.getBoundingClientRect();
							py = Math.max(0, Math.min(c.height - ph, e.touches[0].clientY - r.top - ph / 2));
							e.preventDefault();
						}, {
							passive: false
						});
						const paddleHit = (px, top, isPlayer) => {
							const rel = ((ball.y - top) / ph - 0.5) * 2;
							ball.vx = (isPlayer ? -1 : 1) * Math.abs(ball.vx) * 1.045;
							ball.vy += rel * 3.2;
							score += isPlayer ? 15 : 0;
							if (Math.random() < 0.15 && !power) power = {
								x: c.width / 2,
								y: 40 + Math.random() * (c.height - 80),
								type: Math.random() < 0.5 ? 'SLOW' : 'SHIELD'
							};
						};
						const loop = () => {
							if (!running) return;
							x.fillStyle = '#070711';
							x.fillRect(0, 0, c.width, c.height);
							cy += (ball.y - (cy + ph / 2)) * (0.06 + ps * 0.005);
							ball.x += ball.vx;
							ball.y += ball.vy;
							if (ball.y < 7 || ball.y > c.height - 7) ball.vy *= -1;
							if (ball.x < 23 && ball.y > cy && ball.y < cy + ph) paddleHit(18, cy, false);
							if (ball.x > c.width - 23 && ball.y > py && ball.y < py + ph) paddleHit(c.width - 18, py, true);
							if (power) {
								x.fillStyle = power.type === 'SLOW' ? '#00E5FF' : '#FFBE0B';
								x.beginPath();
								x.arc(power.x, power.y, 13, 0, Math.PI * 2);
								x.fill();
								if (Math.hypot(ball.x - power.x, ball.y - power.y) < 20) {
									if (power.type === 'SLOW') {
										ball.vx *= 0.7;
										ball.vy *= 0.7;
									} else shield = 1;
									score += 80;
									power = null;
								}
							}
							if (ball.x < 0) {
								ps++;
								reset(1);
							}
							if (ball.x > c.width) {
								if (shield) {
									shield = 0;
									reset(-1);
								} else {
									cs++;
									reset(-1);
								}
							}
							if (cs >= 5) {
								running = false;
								this.finishGame('game_pong', score);
								return;
							}
							x.strokeStyle = '#333';
							x.setLineDash([10, 10]);
							x.beginPath();
							x.moveTo(c.width / 2, 0);
							x.lineTo(c.width / 2, c.height);
							x.stroke();
							x.setLineDash([]);
							x.fillStyle = '#FF006E';
							x.fillRect(10, cy, 12, ph);
							x.fillStyle = '#00E5FF';
							x.fillRect(c.width - 22, py, 12, ph);
							x.fillStyle = '#FFBE0B';
							x.beginPath();
							x.arc(ball.x, ball.y, 7, 0, Math.PI * 2);
							x.fill();
							x.fillStyle = '#fff';
							x.font = '18px Orbitron';
							x.fillText(`${ps} : ${cs}`, c.width / 2 - 32, 26);
							document.getElementById('score').textContent = `Score ${score}`;
							document.getElementById('level').textContent = `Level ${ps+1}`;
							document.getElementById('status').textContent = shield ? 'Shield active' : (power ? `Powerup ${power.type}` : 'Curve by paddle impact');
							this.gameRAF = requestAnimationFrame(loop);
						};
						loop();
						this.addCleanup(() => {
							running = false;
							this.finishGame('game_pong', score);
						});
					}
					/* ── Letter Rain ── */
					initLetters() {
						const [c, x, keys] = this.initCanvasKeys();
						if (!c) return;
						let score = 0,
							combo = 0,
							frame = 0,
							time = 90,
							running = true;
						const drops = [];
						const timer = setInterval(() => {
							time--;
							if (time <= 0) {
								clearInterval(timer);
								running = false;
								this.finishGame('game_letters', score);
							}
						}, 1000);
						this.addCleanup(() => clearInterval(timer));
						const loop = () => {
							if (!running) return;
							x.fillStyle = '#070711';
							x.fillRect(0, 0, c.width, c.height);
							x.fillStyle = 'rgba(0,255,120,0.14)';
							x.fillRect(0, 245, c.width, 42);
							x.fillStyle = 'rgba(255,190,11,0.13)';
							x.fillRect(0, 287, c.width, 32);
							if (frame % Math.max(12, 45 - Math.floor(score / 150)) === 0) drops.push({
								x: 25 + Math.random() * (c.width - 50),
								y: -20,
								ch: Math.random() < 0.08 ? '💣' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' [Math.floor(Math.random() * 26)],
								v: 1.4 + Math.random() * 1.2 + score / 900
							});
							for (let i = drops.length - 1; i >= 0; i--) {
								const d = drops[i];
								d.y += d.v;
								x.font = d.ch === '💣' ? '24px Orbitron' : '22px Orbitron';
								x.fillStyle = d.ch === '💣' ? '#FF006E' : '#fff';
								x.fillText(d.ch, d.x, d.y);
								const k = d.ch !== '💣' && keys[d.ch.toLowerCase()] || keys[d.ch];
								if (k && d.y > 245 && d.y < 319) {
									keys[d.ch.toLowerCase()] = false;
									keys[d.ch] = false;
									combo++;
									score += (d.y < 287 ? 30 : 10) * Math.max(1, Math.floor(combo / 5));
									drops.splice(i, 1);
									continue;
								}
								if (d.ch === '💣' && d.y > 245 && d.y < 319 && Object.values(keys).some(Boolean)) {
									score = Math.max(0, score - 100);
									combo = 0;
									drops.splice(i, 1);
									continue;
								}
								if (d.y > c.height + 30) {
									combo = 0;
									drops.splice(i, 1);
								}
							}
							document.getElementById('score').textContent = `Score ${score}`;
							document.getElementById('level').textContent = `Combo ${combo}`;
							document.getElementById('status').textContent = `Time ${time}s`;
							frame++;
							this.gameRAF = requestAnimationFrame(loop);
						};
						loop();
					}
					/* ── Precision Racer: slower, smoother, more realistic avoidance ── */
					initRacer() {
						const [c, x, keys] = this.initCanvasKeys();
						if (!c) return;
						let lane = 0,
							laneTarget = 0,
							carX = 0,
							frame = 0,
							score = 0,
							level = 1,
							speed = 2.15,
							roadV = 0,
							running = true,
							dead = false;
						let obs = [],
							bonuses = [];
						const lanes = [-110, -55, 0, 55, 110];
						const spawnObstacle = () => obs.push({
							lane: Math.floor(Math.random() * lanes.length),
							z: -0.05,
							w: 28 + Math.random() * 12,
							h: 38 + Math.random() * 18,
							type: Math.random() < 0.22 ? 'cone' : 'traffic'
						});
						const project = (obj) => {
							const z = Math.max(.05, obj.z);
							const scale = Math.pow(z, 1.65);
							return {
								x: c.width / 2 + (lanes[obj.lane] - carX) * scale,
								y: 55 + (c.height - 80) * scale,
								s: scale
							};
						};
						const loop = () => {
							if (!running) return;
							x.fillStyle = '#03101a';
							x.fillRect(0, 0, c.width, c.height);
							if (!dead) {
								if ((keys.ArrowLeft || keys.a) && frame % 8 === 0) laneTarget = Math.max(0, laneTarget - 1);
								if ((keys.ArrowRight || keys.d) && frame % 8 === 0) laneTarget = Math.min(lanes.length - 1, laneTarget + 1);
								lane += (laneTarget - lane) * 0.10;
								carX += (lanes[laneTarget] - carX) * 0.075;
								roadV += speed * 0.018;
								if (frame % Math.max(38, 86 - level * 3) === 0) spawnObstacle();
								if (frame % 260 === 0) bonuses.push({
									lane: Math.floor(Math.random() * lanes.length),
									z: -0.05
								});
								obs.forEach(o => o.z += 0.0065 * speed);
								bonuses.forEach(o => o.z += 0.0065 * speed);
								for (const o of obs)
									if (o.z > .82 && o.z < .99 && Math.abs(o.lane - laneTarget) < .45) {
										dead = true;
										setTimeout(() => {
											running = false;
											this.finishGame('game_racer', score);
										}, 450);
									}
								for (const b of bonuses)
									if (b.z > .82 && b.z < .99 && Math.abs(b.lane - laneTarget) < .45) {
										score += 250;
										b.dead = true;
									}
								obs = obs.filter(o => o.z < 1.18);
								bonuses = bonuses.filter(o => !o.dead && o.z < 1.18);
								score += Math.round(1 + speed * .45);
								if (frame % 780 === 0 && frame > 0) {
									level++;
									speed = Math.min(5.6, speed + .22);
									if (level === 30) this.checkEasterEgg(level);
								}
							}
							const horizon = 58,
								rd = 330;
							x.fillStyle = '#10121c';
							x.beginPath();
							x.moveTo(c.width / 2 - 70, horizon);
							x.lineTo(c.width / 2 + 70, horizon);
							x.lineTo(c.width / 2 + rd, c.height);
							x.lineTo(c.width / 2 - rd, c.height);
							x.closePath();
							x.fill();
							for (let i = 0; i < 18; i++) {
								const z = ((i / 18 + roadV) % 1);
								const y = horizon + (c.height - horizon) * Math.pow(z, 1.65);
								const w = 90 + rd * Math.pow(z, 1.65);
								x.strokeStyle = i % 2 ? 'rgba(255,255,255,.16)' : 'rgba(99,242,255,.22)';
								x.lineWidth = 2;
								x.beginPath();
								x.moveTo(c.width / 2 - w, y);
								x.lineTo(c.width / 2 + w, y);
								x.stroke();
							}
							for (const lx of [-82, -27, 28, 83]) {
								x.strokeStyle = 'rgba(255,190,11,.45)';
								x.setLineDash([18, 18]);
								x.beginPath();
								x.moveTo(c.width / 2 + lx * .55, horizon);
								x.lineTo(c.width / 2 + (lx - carX) * 1.85, c.height);
								x.stroke();
								x.setLineDash([]);
							}
							obs.forEach(o => {
								const p = project(o);
								x.fillStyle = o.type === 'cone' ? '#FFBE0B' : '#FF4500';
								x.fillRect(p.x - o.w * p.s / 2, p.y - o.h * p.s, o.w * p.s, o.h * p.s);
								x.fillStyle = 'rgba(0,0,0,.35)';
								x.fillRect(p.x - o.w * p.s / 2, p.y - 4 * p.s, o.w * p.s, 4 * p.s);
							});
							bonuses.forEach(b => {
								const p = project(b);
								x.fillStyle = '#00E5FF';
								x.beginPath();
								x.arc(p.x, p.y - 22 * p.s, 13 * p.s, 0, Math.PI * 2);
								x.fill();
							});
							const cx = c.width / 2,
								cy = c.height - 48;
							x.fillStyle = '#00E5FF';
							x.beginPath();
							x.moveTo(cx, cy - 26);
							x.lineTo(cx - 22, cy + 22);
							x.lineTo(cx + 22, cy + 22);
							x.closePath();
							x.fill();
							x.strokeStyle = '#fff';
							x.stroke();
							if (dead) {
								x.fillStyle = 'rgba(0,0,0,.55)';
								x.fillRect(0, 0, c.width, c.height);
								x.fillStyle = '#FF006E';
								x.font = '32px Orbitron';
								x.textAlign = 'center';
								x.fillText('COLLISION!', c.width / 2, c.height / 2);
								x.textAlign = 'left';
							}
							document.getElementById('score').textContent = `Score ${score}`;
							document.getElementById('level').textContent = `Level ${level}`;
							document.getElementById('status').textContent = `Speed ${speed.toFixed(1)} · Smooth lane changes`;
							frame++;
							if (!dead) this.gameRAF = requestAnimationFrame(loop);
						};
						loop();
					}
					/* ── Gene's Space Shooter: richer weapons and powerups ── */
					init1943() {
						const [c, x, keys] = this.initCanvasKeys();
						if (!c) return;
						let p = {
								x: c.width / 2,
								y: c.height - 55,
								hp: 4,
								shield: 0,
								weapon: 'spread',
								weaponT: 0,
								bomb: 1,
								drone: 0
							},
							bul = [],
							ebul = [],
							en = [],
							pow = [],
							stars = [],
							frame = 0,
							score = 0,
							level = 1,
							running = true,
							dead = false;
						for (let i = 0; i < 90; i++) stars.push({
							x: Math.random() * c.width,
							y: Math.random() * c.height,
							s: Math.random() * 2 + 0.5
						});
						const fire = () => {
							const w = p.weaponT > 0 ? p.weapon : 'single';
							const add = (dx, dy, kind = 'bolt') => bul.push({
								x: p.x,
								y: p.y - 22,
								vx: dx,
								vy: dy,
								kind,
								life: 90
							});
							if (w === 'laser') add(0, -10, 'laser');
							else if (w === 'spread')[-2.6, 0, 2.6].forEach(dx => add(dx, -8, 'bolt'));
							else if (w === 'missile') {
								add(-1.2, -6, 'missile');
								add(1.2, -6, 'missile');
							} else add(0, -8, 'bolt');
						};
						const loop = () => {
							if (!running) return;
							x.fillStyle = '#01030a';
							x.fillRect(0, 0, c.width, c.height);
							stars.forEach(s => {
								s.y += s.s * .8 + level * .03;
								if (s.y > c.height) {
									s.y = 0;
									s.x = Math.random() * c.width;
								}
								x.fillStyle = `rgba(255,255,255,${.25+s.s*.2})`;
								x.fillRect(s.x, s.y, s.s, s.s);
							});
							if (!dead) {
								if (keys.ArrowLeft || keys.a) p.x -= 4.2;
								if (keys.ArrowRight || keys.d) p.x += 4.2;
								if (keys.ArrowUp || keys.w) p.y -= 3.8;
								if (keys.ArrowDown || keys.s) p.y += 3.8;
								p.x = Math.max(18, Math.min(c.width - 18, p.x));
								p.y = Math.max(25, Math.min(c.height - 20, p.y));
								if ((keys[' '] || keys.Space) && frame % (p.weapon === 'laser' && p.weaponT > 0 ? 4 : 8) === 0) fire();
								if (keys.b && p.bomb > 0) {
									p.bomb--;
									en.forEach(e => e.dead = true);
									ebul = [];
									score += en.length * 55;
								}
								if (frame % Math.max(16, 42 - level * 2) === 0) en.push({
									x: 25 + Math.random() * (c.width - 50),
									y: -20,
									v: 1.2 + level * .18,
									hp: Math.random() < .2 + level * .01 ? 3 : 1,
									zig: Math.random() * 6,
									shoot: Math.random() < .35
								});
								if (frame % 300 === 0) pow.push({
									x: 25 + Math.random() * (c.width - 50),
									y: -15,
									t: ['S', 'L', 'B', 'M', 'D', 'H'][Math.floor(Math.random() * 6)]
								});
								bul.forEach(b => {
									if (b.kind === 'missile') {
										const target = en.find(e => !e.dead);
										if (target) {
											b.vx += Math.sign(target.x - b.x) * .12;
											b.vx = Math.max(-3, Math.min(3, b.vx));
										}
									}
									b.x += b.vx;
									b.y += b.vy;
									b.life--;
								});
								en.forEach(e => {
									e.y += e.v;
									e.x += Math.sin(frame * .04 + e.zig) * .55;
									if (e.shoot && frame % 55 === 0) ebul.push({
										x: e.x,
										y: e.y + 14,
										vx: (p.x - e.x) / 95,
										vy: 2.8 + level * .05
									});
								});
								ebul.forEach(b => {
									b.x += b.vx;
									b.y += b.vy;
								});
								pow.forEach(o => o.y += 1.7);
								for (const b of bul)
									for (const e of en)
										if (!e.dead && Math.hypot(b.x - e.x, b.y - e.y) < 18) {
											e.hp -= b.kind === 'laser' ? 1.15 : (b.kind === 'missile' ? 2 : 1);
											b.dead = b.kind !== 'laser';
											if (e.hp <= 0) {
												e.dead = true;
												score += 70;
											}
										}
								for (const e of en)
									if (!e.dead && Math.hypot(p.x - e.x, p.y - e.y) < 22) {
										e.dead = true;
										if (p.shield) p.shield--;
										else p.hp--;
									}
								for (const b of ebul)
									if (Math.hypot(p.x - b.x, p.y - b.y) < 16) {
										b.dead = true;
										if (p.shield) p.shield--;
										else p.hp--;
									}
								for (const o of pow)
									if (Math.hypot(p.x - o.x, p.y - o.y) < 24) {
										if (o.t === 'S') p.shield = 5;
										if (o.t === 'L') {
											p.weapon = 'laser';
											p.weaponT = 520;
										}
										if (o.t === 'M') {
											p.weapon = 'missile';
											p.weaponT = 520;
										}
										if (o.t === 'D') p.drone = 520;
										if (o.t === 'B') p.bomb++;
										if (o.t === 'H') p.hp = Math.min(5, p.hp + 1);
										o.dead = true;
										score += 160;
									}
								if (p.drone > 0 && frame % 11 === 0) {
									p.drone--;
									bul.push({
										x: p.x - 28,
										y: p.y - 12,
										vx: 0,
										vy: -7,
										kind: 'bolt',
										life: 80
									}, {
										x: p.x + 28,
										y: p.y - 12,
										vx: 0,
										vy: -7,
										kind: 'bolt',
										life: 80
									});
								}
								if (p.weaponT > 0) p.weaponT--;
								if (p.weaponT === 0) p.weapon = 'single';
								bul = bul.filter(b => !b.dead && b.life > 0 && b.y > -40 && b.x > -40 && b.x < c.width + 40);
								ebul = ebul.filter(b => !b.dead && b.y < c.height + 30);
								en = en.filter(e => !e.dead && e.y < c.height + 40);
								pow = pow.filter(o => !o.dead && o.y < c.height + 20);
								if (p.hp <= 0) {
									dead = true;
									running = false;
									this.finishGame('game_1943', score);
								}
								if (frame % 720 === 0 && frame > 0) {
									level++;
									score += 450;
									if (level === 30) this.checkEasterEgg(level);
								}
							}
							x.fillStyle = '#00E5FF';
							x.beginPath();
							x.moveTo(p.x, p.y - 20);
							x.lineTo(p.x - 16, p.y + 16);
							x.lineTo(p.x, p.y + 8);
							x.lineTo(p.x + 16, p.y + 16);
							x.closePath();
							x.fill();
							if (p.shield) {
								x.strokeStyle = '#FFBE0B';
								x.lineWidth = 2;
								x.beginPath();
								x.arc(p.x, p.y, 28, 0, Math.PI * 2);
								x.stroke();
							}
							bul.forEach(b => {
								x.fillStyle = b.kind === 'laser' ? '#63F2FF' : b.kind === 'missile' ? '#FF006E' : '#FFBE0B';
								x.fillRect(b.x - 2, b.y - 12, b.kind === 'laser' ? 6 : 4, b.kind === 'laser' ? 34 : 15);
							});
							ebul.forEach(b => {
								x.fillStyle = '#FF4081';
								x.beginPath();
								x.arc(b.x, b.y, 4, 0, Math.PI * 2);
								x.fill();
							});
							en.forEach(e => {
								x.fillStyle = e.hp > 2 ? '#FF006E' : e.hp > 1 ? '#FFBE0B' : '#FF4500';
								x.beginPath();
								x.moveTo(e.x, e.y + 15);
								x.lineTo(e.x - 14, e.y - 12);
								x.lineTo(e.x + 14, e.y - 12);
								x.closePath();
								x.fill();
							});
							pow.forEach(o => {
								x.fillStyle = {
									S: '#FFBE0B',
									L: '#63F2FF',
									B: '#FF006E',
									M: '#69F0AE',
									D: '#8A7BFF',
									H: '#38ef7d'
								} [o.t];
								x.font = 'bold 20px Orbitron';
								x.fillText(o.t, o.x - 7, o.y);
							});
							document.getElementById('score').textContent = `Score ${score}`;
							document.getElementById('level').textContent = `Level ${level}`;
							document.getElementById('status').textContent = `HP ${p.hp} Shield ${p.shield} Bomb ${p.bomb} Weapon ${p.weapon}${p.weaponT>0?' '+Math.ceil(p.weaponT/60)+'s':''}`;
							frame++;
							if (!dead) this.gameRAF = requestAnimationFrame(loop);
						};
						loop();
					}
					/* ── Plasma Breakout ── */
					initBreakout() {
						const [c, x, keys] = this.initCanvasKeys();
						if (!c) return;
						let paddle = {
								x: c.width / 2 - 50,
								y: c.height - 24,
								w: 100
							},
							balls = [{
								x: c.width / 2,
								y: c.height - 70,
								vx: 3.2,
								vy: -3.6
							}],
							score = 0,
							level = 1,
							br = [],
							running = true;
						const make = () => {
							br = [];
							for (let r = 0; r < 6; r++)
								for (let col = 0; col < 10; col++) br.push({
									x: 35 + col * 50,
									y: 35 + r * 24,
									w: 44,
									h: 16,
									hue: (r * 45 + col * 12) % 360
								});
						};
						make();
						c.addEventListener('mousemove', e => paddle.x = e.offsetX - paddle.w / 2);
						c.addEventListener('touchmove', e => {
							const r = c.getBoundingClientRect();
							paddle.x = e.touches[0].clientX - r.left - paddle.w / 2;
							e.preventDefault();
						}, {
							passive: false
						});
						const loop = () => {
							if (!running) return;
							x.fillStyle = '#070711';
							x.fillRect(0, 0, c.width, c.height);
							paddle.x = Math.max(0, Math.min(c.width - paddle.w, paddle.x));
							balls.forEach(b => {
								b.x += b.vx;
								b.y += b.vy;
								if (b.x < 6 || b.x > c.width - 6) b.vx *= -1;
								if (b.y < 6) b.vy *= -1;
								if (b.y > c.height) b.dead = true;
								if (b.y > paddle.y - 7 && b.x > paddle.x && b.x < paddle.x + paddle.w) {
									const rel = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
									b.vx += rel * 2;
									b.vy = -Math.abs(b.vy);
								}
								br.forEach(k => {
									if (!k.dead && b.x > k.x && b.x < k.x + k.w && b.y > k.y && b.y < k.y + k.h) {
										k.dead = true;
										b.vy *= -1;
										score += 40;
										if (Math.random() < 0.08) balls.push({
											x: b.x,
											y: b.y,
											vx: -b.vx,
											vy: b.vy
										});
									}
								});
							});
							balls = balls.filter(b => !b.dead);
							br = br.filter(k => !k.dead);
							if (!balls.length) {
								running = false;
								this.finishGame('game_breakout', score);
								return;
							}
							if (!br.length) {
								level++;
								score += 500;
								make();
								balls = [{
									x: c.width / 2,
									y: c.height - 70,
									vx: 3.2 + level * 0.2,
									vy: -3.7 - level * 0.2
								}];
								if (level === 30) this.checkEasterEgg(level);
							}
							br.forEach(k => {
								x.fillStyle = `hsl(${k.hue},90%,55%)`;
								x.fillRect(k.x, k.y, k.w, k.h);
							});
							x.fillStyle = '#00E5FF';
							x.fillRect(paddle.x, paddle.y, paddle.w, 10);
							balls.forEach(b => {
								x.fillStyle = '#FFBE0B';
								x.beginPath();
								x.arc(b.x, b.y, 7, 0, Math.PI * 2);
								x.fill();
							});
							document.getElementById('score').textContent = `Score ${score}`;
							document.getElementById('level').textContent = `Level ${level}`;
							document.getElementById('status').textContent = `Balls ${balls.length}`;
							this.gameRAF = requestAnimationFrame(loop);
						};
						loop();
					}
					/* ── Circuit Snake ── */
					initSnake() {
						const [c, x, keys] = this.initCanvasKeys();
						if (!c) return;
						c.focus();
						const cell = 20;
						const cols = Math.floor(c.width / cell);
						const rows = Math.floor(c.height / cell);
						let snake = [{
							x: 12,
							y: 8
						}, {
							x: 11,
							y: 8
						}, {
							x: 10,
							y: 8
						}];
						let dir = {
								x: 1,
								y: 0
							},
							next = {
								x: 1,
								y: 0
							},
							food = {
								x: 18,
								y: 9
							},
							score = 0,
							dead = false,
							last = 0,
							started = false,
							paused = false,
							touchStart = null,
							running = true;
						const setDir = (dx, dy) => {
							if (dead) return;
							if (dir.x === -dx && dir.y === -dy) return;
							next = {
								x: dx,
								y: dy
							};
							started = true;
							c.focus();
						};
						const localKey = e => {
							const k = e.key.toLowerCase();
							if (['arrowleft', 'a'].includes(k)) {
								e.preventDefault();
								setDir(-1, 0);
							}
							if (['arrowright', 'd'].includes(k)) {
								e.preventDefault();
								setDir(1, 0);
							}
							if (['arrowup', 'w'].includes(k)) {
								e.preventDefault();
								setDir(0, -1);
							}
							if (['arrowdown', 's'].includes(k)) {
								e.preventDefault();
								setDir(0, 1);
							}
							if (k === ' ' || k === 'p') {
								e.preventDefault();
								paused = !paused;
								c.focus();
							}
							if (dead && k === 'enter') {
								e.preventDefault();
								this.initSnake();
								running = false;
							}
						};
						document.addEventListener('keydown', localKey);
						this.addCleanup(() => document.removeEventListener('keydown', localKey));
						c.addEventListener('pointerdown', e => {
							c.focus();
							started = true;
							const r = c.getBoundingClientRect();
							const mx = e.clientX - r.left;
							const my = e.clientY - r.top;
							const head = snake[0];
							const hx = head.x * cell + cell / 2;
							const hy = head.y * cell + cell / 2;
							const dx = mx - hx;
							const dy = my - hy;
							if (Math.abs(dx) > Math.abs(dy)) {
								setDir(dx > 0 ? 1 : -1, 0);
							} else {
								setDir(0, dy > 0 ? 1 : -1);
							}
						});
						c.addEventListener('touchstart', e => {
							const t = e.touches[0];
							if (!t) return;
							touchStart = {
								x: t.clientX,
								y: t.clientY
							};
							c.focus();
							started = true;
						}, {
							passive: true
						});
						c.addEventListener('touchmove', e => {
							if (!touchStart || !e.touches[0]) return;
							const t = e.touches[0];
							const dx = t.clientX - touchStart.x;
							const dy = t.clientY - touchStart.y;
							if (Math.hypot(dx, dy) > 24) {
								if (Math.abs(dx) > Math.abs(dy)) {
									setDir(dx > 0 ? 1 : -1, 0);
								} else {
									setDir(0, dy > 0 ? 1 : -1);
								}
								touchStart = {
									x: t.clientX,
									y: t.clientY
								};
							}
							e.preventDefault();
						}, {
							passive: false
						});
						const newFood = () => {
							let f;
							do {
								f = {
									x: Math.floor(Math.random() * cols),
									y: Math.floor(Math.random() * rows)
								};
							} while (snake.some(s => s.x === f.x && s.y === f.y));
							return f;
						};
						const drawGrid = () => {
							x.strokeStyle = 'rgba(0,229,255,0.08)';
							x.lineWidth = 1;
							for (let gx = 0; gx < c.width; gx += cell) {
								x.beginPath();
								x.moveTo(gx, 0);
								x.lineTo(gx, c.height);
								x.stroke();
							}
							for (let gy = 0; gy < c.height; gy += cell) {
								x.beginPath();
								x.moveTo(0, gy);
								x.lineTo(c.width, gy);
								x.stroke();
							}
						};
						const loop = (t) => {
							if (!running) return;
							x.fillStyle = '#05050a';
							x.fillRect(0, 0, c.width, c.height);
							drawGrid();
							if (started && !paused && !dead && t - last > 105) {
								last = t;
								dir = next;
								const head = {
									x: snake[0].x + dir.x,
									y: snake[0].y + dir.y
								};
								const hitWall = head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows;
								const hitSelf = snake.some(s => s.x === head.x && s.y === head.y);
								if (hitWall || hitSelf) {
									dead = true;
									this.finishGame('game_snake', score);
								} else {
									snake.unshift(head);
									if (head.x === food.x && head.y === food.y) {
										score += 100;
										food = newFood();
									} else {
										snake.pop();
									}
								}
							}
							const pulse = 1 + Math.sin(t * 0.012) * 0.18;
							x.fillStyle = '#FFBE0B';
							x.shadowColor = '#FFBE0B';
							x.shadowBlur = 14;
							x.beginPath();
							x.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, 8 * pulse, 0, Math.PI * 2);
							x.fill();
							x.shadowBlur = 0;
							snake.forEach((s, i) => {
								x.fillStyle = i === 0 ? '#00E5FF' : `hsl(${140+i*8},90%,50%)`;
								x.fillRect(s.x * cell + 2, s.y * cell + 2, cell - 4, cell - 4);
							});
							if (!started) {
								x.fillStyle = 'rgba(0,0,0,0.62)';
								x.fillRect(0, 0, c.width, c.height);
								x.fillStyle = '#00E5FF';
								x.font = '22px Orbitron';
								x.textAlign = 'center';
								x.fillText('CLICK / TAP / ARROW KEYS TO START', c.width / 2, c.height / 2 - 8);
								x.fillStyle = '#aaa';
								x.font = '13px Orbitron';
								x.fillText('Arrow keys or WASD · Click direction · Swipe on touch · P to pause', c.width / 2, c.height / 2 + 24);
								x.textAlign = 'left';
							}
							if (paused && !dead) {
								x.fillStyle = 'rgba(0,0,0,0.55)';
								x.fillRect(0, 0, c.width, c.height);
								x.fillStyle = '#FFBE0B';
								x.font = '28px Orbitron';
								x.textAlign = 'center';
								x.fillText('PAUSED', c.width / 2);
								x.textAlign = 'left';
							}
							if (dead) {
								x.fillStyle = 'rgba(0,0,0,0.55)';
								x.fillRect(0, 0, c.width, c.height);
								x.fillStyle = '#FF006E';
								x.font = '28px Orbitron';
								x.textAlign = 'center';
								x.fillText('GAME OVER', c.width / 2, c.height / 2 - 10);
								x.fillStyle = '#fff';
								x.font = '13px Orbitron';
								x.fillText('Press ENTER to restart', c.width / 2, c.height / 2 + 22);
								x.textAlign = 'left';
							}
							document.getElementById('score').textContent = `Score ${score}`;
							document.getElementById('level').textContent = `Length ${snake.length}`;
							document.getElementById('status').textContent = dead ? 'Game over' : paused ? 'Paused' : started ? 'Running' : 'Waiting for input';
							if (!dead) this.gameRAF = requestAnimationFrame(loop);
						};
						this.gameRAF = requestAnimationFrame(loop);
					}
					/* ── Beat Memory / Simon with keyboard, drums, chords and leaderboard ── */
					initMemory() {
						const grid = document.getElementById('memgrid');
						if (!grid) return;
						const keyMap = ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'];
						const freqs = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
						let mode = 'synth',
							sequence = [],
							inputIndex = 0,
							accepting = false,
							playing = false;
						let level = 1,
							score = 0,
							lives = 2,
							streak = 0;
						const status = document.getElementById('status'),
							scoreEl = document.getElementById('score'),
							levelEl = document.getElementById('level'),
							livesEl = document.getElementById('lives');
						const setHud = (msg = '') => {
							scoreEl.textContent = `Score ${score}`;
							levelEl.textContent = `Level ${level}`;
							livesEl.textContent = `Lives ${lives}`;
							if (msg) status.textContent = msg;
						};
						const flash = (i, ms = 220) => {
							const b = grid.querySelector(`[data-mem="${i}"]`);
							if (b) {
								b.classList.add('active', 'memory-flash');
								setTimeout(() => b.classList.remove('active', 'memory-flash'), ms);
							}
						};
						const sound = (i, dur = 0.24) => {
							audioMgr.ensure();
							const ctx = audioMgr.ctx,
								t = ctx.currentTime;
							if (mode === 'drum') {
								const o = ctx.createOscillator(),
									g = ctx.createGain(),
									f = ctx.createBiquadFilter();
								o.type = i % 3 === 0 ? 'sine' : (i % 3 === 1 ? 'triangle' : 'square');
								o.frequency.setValueAtTime([95, 180, 260, 520, 720, 110, 1450, 65][i], t);
								if (i === 0 || i === 7) o.frequency.exponentialRampToValueAtTime(30, t + 0.15);
								f.type = i % 2 ? 'bandpass' : 'lowpass';
								f.frequency.value = [180, 900, 1500, 6000, 420, 1100, 2600, 80][i];
								g.gain.setValueAtTime(0.75, t);
								g.gain.exponentialRampToValueAtTime(0.001, t + dur);
								o.connect(f);
								f.connect(g);
								g.connect(audioMgr.out());
								o.start(t);
								o.stop(t + dur + 0.03);
							} else {
								const o = ctx.createOscillator(),
									g = ctx.createGain();
								o.type = level > 7 ? 'sawtooth' : 'triangle';
								o.frequency.value = freqs[i];
								g.gain.setValueAtTime(0.0001, t);
								g.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
								g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
								o.connect(g);
								g.connect(audioMgr.out());
								o.start(t);
								o.stop(t + dur + 0.04);
							}
						};
						const makeStep = () => {
							const chordChance = Math.min(0.38, Math.max(0, (level - 4) * 0.055));
							if (Math.random() < chordChance) {
								const a = Math.floor(Math.random() * 8);
								let b = Math.floor(Math.random() * 8);
								if (b === a) b = (b + 3) % 8;
								return [a, b].sort();
							}
							return [Math.floor(Math.random() * 8)];
						};
						const addLevel = () => {
							sequence.push(makeStep());
							if (level > 8 && Math.random() < 0.30) sequence.push(makeStep());
						};
						const playSeq = async () => {
							playing = true;
							accepting = false;
							inputIndex = 0;
							setHud('Watch the sequence...');
							await new Promise(r => setTimeout(r, 450));
							for (const step of sequence) {
								step.forEach(i => {
									flash(i, 300);
									sound(i, 0.28);
								});
								await new Promise(r => setTimeout(r, step.length > 1 ? 680 : 480));
							}
							accepting = true;
							playing = false;
							setHud('Your turn: repeat it with mouse or physical keyboard.');
							grid.focus();
						};
						const start = () => {
							sequence = [];
							level = 1;
							score = 0;
							lives = 2;
							streak = 0;
							addLevel();
							setHud('Starting...');
							playSeq();
						};
						const wrong = () => {
							lives--;
							streak = 0;
							setHud('Wrong! Try the sequence again.');
							if (lives <= 0) {
								accepting = false;
								status.textContent = 'Game over - save your score.';
								this.finishGame('game_memory', score);
							} else setTimeout(playSeq, 700);
						};
						const handleEvent = (arr) => {
							if (!accepting || playing || lives <= 0) return;
							const target = sequence[inputIndex];
							const norm = [...arr].sort().join(','),
								targ = [...target].sort().join(',');
							arr.forEach(i => {
								flash(i);
								sound(i);
							});
							if (norm === targ) {
								score += 50 + level * 10 + (target.length > 1 ? 75 : 0);
								streak++;
								inputIndex++;
								if (inputIndex >= sequence.length) {
									score += 150 + level * 25 + streak * 5;
									level++;
									lives = 2;
									addLevel();
									setHud('Correct! Attempts reset. Next level...');
									if (level === 10 || level === 20 || level === 30) this.checkEasterEgg?.(level);
									setTimeout(playSeq, 700);
								} else setHud(`Good. ${sequence.length-inputIndex} steps left.`);
							} else wrong();
						};
						grid.querySelectorAll('[data-mem]').forEach(btn => btn.addEventListener('pointerdown', e => {
							e.preventDefault();
							handleEvent([+btn.dataset.mem]);
						}));
						let chordBuf = new Set(),
							chordTimer = null;
						const kd = e => {
							if (this.activeGameId !== 'game_memory') return;
							const idx = keyMap.indexOf(e.key.toLowerCase());
							if (idx < 0) return;
							e.preventDefault();
							e.stopPropagation();
							chordBuf.add(idx);
							clearTimeout(chordTimer);
							chordTimer = setTimeout(() => {
								handleEvent([...chordBuf]);
								chordBuf.clear();
							}, 115);
						};
						document.getElementById('modeSynth')?.addEventListener('click', () => {
							mode = 'synth';
							setHud('Synth tone mode selected.');
							grid.focus();
						});
						document.getElementById('modeDrum')?.addEventListener('click', () => {
							mode = 'drum';
							setHud('Drum hit mode selected.');
							grid.focus();
						});
						document.getElementById('startMem')?.addEventListener('click', start);
						document.addEventListener('keydown', kd, true);
						this.addCleanup(() => document.removeEventListener('keydown', kd, true));
						setHud('Choose synth or drum mode, then press START.');
						setTimeout(() => grid.focus(), 80);
					}
					/* ── Blackjack ── */
					initBlackjack() {
						const [c, x, keys] = this.initCanvasKeys();
						if (!c) return;
						let deck = [],
							playerHand = [],
							dealerHand = [],
							score = 500,
							gameOver = false,
							message = 'Hit or Stand?',
							running = true;
						const suits = ['♠', '♥', '♦', '♣'];
						const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
						const newDeck = () => {
							deck = [];
							for (const s of suits)
								for (const v of values) deck.push({
									s,
									v
								});
							for (let i = deck.length - 1; i > 0; i--) {
								const j = Math.floor(Math.random() * (i + 1));
								[deck[i], deck[j]] = [deck[j], deck[i]];
							}
						};
						const cardValue = (c) => {
							if (['J', 'Q', 'K'].includes(c.v)) return 10;
							if (c.v === 'A') return 11;
							return parseInt(c.v);
						};
						const handValue = (hand) => {
							let total = hand.reduce((s, c) => s + cardValue(c), 0);
							let aces = hand.filter(c => c.v === 'A').length;
							while (total > 21 && aces > 0) {
								total -= 10;
								aces--;
							}
							return total;
						};
						const drawCard = () => deck.pop();
						const deal = () => {
							newDeck();
							playerHand = [drawCard(), drawCard()];
							dealerHand = [drawCard(), drawCard()];
							gameOver = false;
							message = 'Hit or Stand?';
						};
						deal();
						const hit = () => {
							if (gameOver) return;
							playerHand.push(drawCard());
							if (handValue(playerHand) > 21) {
								gameOver = true;
								score -= 50;
								message = 'Bust! Click to deal again.';
								if (score <= 0) {
									running = false;
									this.finishGame('game_blackjack', Math.max(0, score));
								}
							}
						};
						const stand = () => {
							if (gameOver) return;
							gameOver = true;
							while (handValue(dealerHand) < 17) dealerHand.push(drawCard());
							const pv = handValue(playerHand),
								dv = handValue(dealerHand);
							if (dv > 21 || pv > dv) {
								score += 100;
								message = 'You win! Click to deal again.';
							} else if (pv === dv) {
								message = 'Push! Click to deal again.';
							} else {
								score -= 50;
								message = 'Dealer wins. Click to deal again.';
								if (score <= 0) {
									running = false;
									this.finishGame('game_blackjack', Math.max(0, score));
								}
							}
						};
						const draw = () => {
							x.fillStyle = '#070711';
							x.fillRect(0, 0, c.width, c.height);
							x.fillStyle = '#fff';
							x.font = '16px Orbitron';
							x.fillText('Dealer: ' + dealerHand.map(c => c.v + c.s).join(' ') + ' (' + handValue(dealerHand) + ')', 20, 40);
							x.fillText('Player: ' + playerHand.map(c => c.v + c.s).join(' ') + ' (' + handValue(playerHand) + ')', 20, 120);
							x.fillStyle = '#FFBE0B';
							x.font = '18px Orbitron';
							x.fillText(message, 20, 200);
							x.fillStyle = '#00E5FF';
							x.font = '14px Orbitron';
							x.fillText('Click canvas: left=Hit, right=Stand', 20, 240);
							x.fillText('Score: ' + score, 20, 265);
							document.getElementById('score').textContent = `Score ${score}`;
							document.getElementById('status').textContent = message;
						};
						c.addEventListener('click', e => {
							const rect = c.getBoundingClientRect();
							if (e.clientX - rect.left < c.width / 2) {
								if (gameOver) deal();
								else hit();
							} else {
								if (gameOver) deal();
								else stand();
							}
							draw();
							c.focus();
						});
						const loop = () => {
							if (this.activeGameId === 'game_blackjack' && running) {
								draw();
								this.gameRAF = requestAnimationFrame(loop);
							}
						};
						loop();
						this.addCleanup(() => {
							running = false;
							this.finishGame('game_blackjack', score);
						});
					}
					/* ── Hangman ── */
					initHangman() {
						const [c, x, keys] = this.initCanvasKeys();
						if (!c) return;
						const words = ['QUANTUM', 'PYTHON', 'VECTOR', 'SIGMA', 'MATRIX', 'CODEX', 'NEURON', 'CIPHER', 'ALPHA', 'DELTA', 'GAMMA', 'CURVE', 'SPECTRAL', 'TENSOR', 'FOURIER'];
						let word = words[Math.floor(Math.random() * words.length)],
							guessed = [],
							wrong = 0,
							maxWrong = 6,
							score = 600,
							gameOver = false,
							running = true;
						const usedKeys = {};
						const draw = () => {
							x.fillStyle = '#070711';
							x.fillRect(0, 0, c.width, c.height);
							x.fillStyle = '#fff';
							x.font = '28px Orbitron';
							const display = word.split('').map(l => guessed.includes(l) ? l : '_').join(' ');
							x.fillText(display, 20, 80);
							x.fillStyle = '#FF006E';
							x.font = '18px Orbitron';
							x.fillText('Wrong: ' + wrong + '/' + maxWrong + '  Score: ' + score, 20, 150);
							x.fillStyle = '#FFBE0B';
							x.font = '14px Orbitron';
							x.fillText('Type letters to guess. Guessed: ' + guessed.join(''), 20, 200);
							if (gameOver) {
								x.fillStyle = wrong >= maxWrong ? '#FF006E' : '#00E5FF';
								x.font = '22px Orbitron';
								x.fillText(wrong >= maxWrong ? 'YOU LOSE! Word: ' + word : 'YOU WIN!', 20, 250);
								x.fillText('Click to play again', 20, 280);
							}
							document.getElementById('score').textContent = `Score ${score}`;
							document.getElementById('status').textContent = gameOver ? 'Game Over' : 'Guess a letter';
						};
						const keyHandler = e => {
							if (this.activeGameId !== 'game_hangman' || gameOver || !running) return;
							const k = e.key.toUpperCase();
							if (k.length === 1 && k >= 'A' && k <= 'Z' && !usedKeys[k]) {
								usedKeys[k] = true;
								if (word.includes(k)) {
									guessed.push(k);
									if (word.split('').every(l => guessed.includes(l))) {
										gameOver = true;
										score += 200;
										this.finishGame('game_hangman', score);
									}
								} else {
									wrong++;
									score -= 50;
									if (wrong >= maxWrong) {
										gameOver = true;
										score = Math.max(0, score);
										this.finishGame('game_hangman', score);
									}
								}
								draw();
							}
						};
						document.addEventListener('keydown', keyHandler);
						this.addCleanup(() => document.removeEventListener('keydown', keyHandler));
						c.addEventListener('click', () => {
							if (gameOver) {
								word = words[Math.floor(Math.random() * words.length)];
								guessed = [];
								wrong = 0;
								gameOver = false;
								score = Math.max(100, score);
								Object.keys(usedKeys).forEach(k => delete usedKeys[k]);
								draw();
								c.focus();
							}
						});
						draw();
						setTimeout(() => c.focus(), 50);
					}
					/* ── Match 3 ── */
					initMatch3() {
						const [c, x, keys] = this.initCanvasKeys();
						if (!c) return;
						const COLS = 6,
							ROWS = 6,
							cellSize = 55;
						const colors = ['#FF006E', '#00E5FF', '#FFBE0B', '#38ef7d', '#9B5DE5', '#FF4500'];
						let grid = [],
							score = 0,
							selected = null,
							moves = 20,
							running = true;
						for (let r = 0; r < ROWS; r++) {
							grid[r] = [];
							for (let cl = 0; cl < COLS; cl++) grid[r][cl] = Math.floor(Math.random() * colors.length);
						}
						const draw = () => {
							x.fillStyle = '#070711';
							x.fillRect(0, 0, c.width, c.height);
							const ox = (c.width - COLS * cellSize) / 2,
								oy = 30;
							for (let r = 0; r < ROWS; r++)
								for (let cl = 0; cl < COLS; cl++) {
									x.fillStyle = colors[grid[r][cl]];
									x.fillRect(ox + cl * cellSize + 2, oy + r * cellSize + 2, cellSize - 4, cellSize - 4);
									if (selected && selected.r === r && selected.c === cl) {
										x.strokeStyle = '#fff';
										x.lineWidth = 3;
										x.strokeRect(ox + cl * cellSize + 1, oy + r * cellSize + 1, cellSize - 2, cellSize - 2);
										x.lineWidth = 1;
									}
								}
							x.fillStyle = '#fff';
							x.font = '16px Orbitron';
							x.fillText('Score: ' + score + '  Moves: ' + moves, 20, oy + ROWS * cellSize + 30);
							document.getElementById('score').textContent = `Score ${score}`;
							document.getElementById('status').textContent = `Moves left: ${moves}`;
						};
						const findMatches = () => {
							const m = [];
							for (let r = 0; r < ROWS; r++) {
								for (let cl = 0; cl < COLS - 2; cl++) {
									if (grid[r][cl] === grid[r][cl + 1] && grid[r][cl] === grid[r][cl + 2]) {
										m.push([r, cl], [r, cl + 1], [r, cl + 2]);
									}
								}
							}
							for (let cl = 0; cl < COLS; cl++) {
								for (let r = 0; r < ROWS - 2; r++) {
									if (grid[r][cl] === grid[r + 1][cl] && grid[r][cl] === grid[r + 2][cl]) {
										m.push([r, cl], [r + 1, cl], [r + 2, cl]);
									}
								}
							}
							return m;
						};
						const removeMatches = () => {
							const m = findMatches();
							if (!m.length) return 0;
							m.forEach(([r, cl]) => grid[r][cl] = -1);
							for (let cl = 0; cl < COLS; cl++) {
								let wr = ROWS - 1;
								for (let r = ROWS - 1; r >= 0; r--) {
									if (grid[r][cl] !== -1) {
										grid[wr][cl] = grid[r][cl];
										wr--;
									}
								}
								for (let r = wr; r >= 0; r--) grid[r][cl] = Math.floor(Math.random() * colors.length);
							}
							return m.length;
						};
						const processMatches = () => {
							let total = 0,
								count;
							do {
								count = removeMatches();
								total += count;
							} while (count > 0);
							score += total * 15;
							if (total > 0) moves--;
						};
						const swap = (r1, c1, r2, c2) => {
							[grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
							processMatches();
							draw();
							if (moves <= 0) {
								running = false;
								this.finishGame('game_match3', score);
							}
						};
						c.addEventListener('click', e => {
							if (moves <= 0 || !running) return;
							const rect = c.getBoundingClientRect();
							const ox = (c.width - COLS * cellSize) / 2,
								oy = 30;
							const cl = Math.floor((e.clientX - rect.left - ox) / cellSize);
							const r = Math.floor((e.clientY - rect.top - oy) / cellSize);
							if (cl < 0 || cl >= COLS || r < 0 || r >= ROWS) return;
							if (!selected) {
								selected = {
									r,
									c: cl
								};
							} else {
								const dr = Math.abs(selected.r - r),
									dc = Math.abs(selected.c - cl);
								if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
									swap(selected.r, selected.c, r, cl);
									selected = null;
								} else {
									selected = {
										r,
										c: cl
									};
								}
							}
							draw();
							c.focus();
						});
						processMatches();
						draw();
						setTimeout(() => c.focus(), 50);
					}
					/* ── Neon Tetris ── */
					initTetris() {
						const [c, x, keys] = this.initCanvasKeys();
						if (!c) return;
						const COLS = 10,
							ROWS = 20,
							cell = 26;
						const pieces = [{
							shape: [
								[1, 1, 1, 1]
							],
							color: '#00E5FF'
						}, {
							shape: [
								[1, 1],
								[1, 1]
							],
							color: '#FFBE0B'
						}, {
							shape: [
								[0, 1, 0],
								[1, 1, 1]
							],
							color: '#9B5DE5'
						}, {
							shape: [
								[1, 1, 0],
								[0, 1, 1]
							],
							color: '#FF4500'
						}, {
							shape: [
								[0, 1, 1],
								[1, 1, 0]
							],
							color: '#38ef7d'
						}, {
							shape: [
								[1, 0, 0],
								[1, 1, 1]
							],
							color: '#3A86FF'
						}, {
							shape: [
								[0, 0, 1],
								[1, 1, 1]
							],
							color: '#FF006E'
						}];
						let board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
						let current = null,
							next = null,
							score = 0,
							level = 1,
							lines = 0,
							running = true,
							paused = false,
							dropTimer = 0,
							dropInterval = 800,
							gameOver = false;
						const newPiece = () => {
							const p = pieces[Math.floor(Math.random() * pieces.length)];
							return {
								shape: p.shape.map(r => [...r]),
								color: p.color,
								x: Math.floor(COLS / 2) - 1,
								y: 0
							};
						};
						const rotate = (p) => {
							const rows = p.shape.length,
								cols = p.shape[0].length;
							const res = Array(cols).fill(null).map(() => Array(rows).fill(0));
							for (let r = 0; r < rows; r++)
								for (let cl = 0; cl < cols; cl++) res[cl][rows - 1 - r] = p.shape[r][cl];
							return {
								...p,
								shape: res
							};
						};
						const valid = (p, ox, oy) => {
							for (let r = 0; r < p.shape.length; r++)
								for (let cl = 0; cl < p.shape[0].length; cl++)
									if (p.shape[r][cl]) {
										const nx = p.x + cl + ox,
											ny = p.y + r + oy;
										if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
										if (ny >= 0 && board[ny][nx]) return false;
									} return true;
						};
						const lock = (p) => {
							p.shape.forEach((row, r) => row.forEach((cell, cl) => {
								if (cell) {
									const by = p.y + r;
									if (by >= 0) board[by][p.x + cl] = p.color;
								}
							}));
						};
						const clearLines = () => {
							let cleared = 0;
							for (let r = ROWS - 1; r >= 0; r--) {
								if (board[r].every(c => c !== 0)) {
									board.splice(r, 1);
									board.unshift(Array(COLS).fill(0));
									cleared++;
									r++;
								}
							}
							if (cleared > 0) {
								lines += cleared;
								score += [0, 100, 300, 500, 800][cleared] * level;
								level = Math.floor(lines / 10) + 1;
								dropInterval = Math.max(100, 800 - (level - 1) * 70);
								if (level === 30) this.checkEasterEgg(level);
							}
						};
						const draw = () => {
							x.fillStyle = '#070711';
							x.fillRect(0, 0, c.width, c.height);
							const ox = (c.width - COLS * cell) / 2;
							for (let r = 0; r < ROWS; r++)
								for (let cl = 0; cl < COLS; cl++) {
									if (board[r][cl]) {
										x.fillStyle = board[r][cl];
										x.fillRect(ox + cl * cell + 1, r * cell + 1, cell - 2, cell - 2);
									}
								}
							if (current) current.shape.forEach((row, r) => row.forEach((cell, cl) => {
								if (cell) {
									x.fillStyle = current.color;
									x.fillRect(ox + (current.x + cl) * cell + 1, (current.y + r) * cell + 1, cell - 2, cell - 2);
								}
							}));
							x.fillStyle = '#fff';
							x.font = '14px Orbitron';
							x.fillText(`Score: ${score}  Level: ${level}  Lines: ${lines}`, 10, c.height - 10);
							if (next) {
								x.fillText('Next:', 10, 20);
								next.shape.forEach((row, r) => row.forEach((cell, cl) => {
									if (cell) {
										x.fillStyle = next.color;
										x.fillRect(10 + cl * cell, 30 + r * cell, cell - 2, cell - 2);
									}
								}));
							}
							document.getElementById('score').textContent = `Score ${score}`;
							document.getElementById('level').textContent = `Level ${level}`;
							document.getElementById('status').textContent = paused ? 'Paused' : gameOver ? 'Game Over' : 'Running';
						};
						const hardDrop = () => {
							while (valid(current, 0, 1)) current.y++;
							lock(current);
							clearLines();
							current = next;
							next = newPiece();
							if (!valid(current, 0, 0)) {
								gameOver = true;
								running = false;
								this.finishGame('game_tetris', score);
							}
						};
						const update = (dt) => {
							if (paused || gameOver || !running) return;
							dropTimer += dt;
							if (dropTimer >= dropInterval) {
								dropTimer = 0;
								if (valid(current, 0, 1)) {
									current.y++;
								} else {
									lock(current);
									clearLines();
									current = next;
									next = newPiece();
									if (!valid(current, 0, 0)) {
										gameOver = true;
										running = false;
										this.finishGame('game_tetris', score);
									}
								}
							}
						};
						const keyHandler = e => {
							if (this.activeGameId !== 'game_tetris' || gameOver || !running) return;
							const k = e.key.toLowerCase();
							if (k === 'arrowleft' || k === 'a') {
								if (valid(current, -1, 0)) current.x--;
							}
							if (k === 'arrowright' || k === 'd') {
								if (valid(current, 1, 0)) current.x++;
							}
							if (k === 'arrowdown' || k === 's') {
								if (valid(current, 0, 1)) {
									current.y++;
									score += 1;
								}
							}
							if (k === 'arrowup' || k === 'w' || k === ' ') {
								e.preventDefault();
								const rotated = rotate(current);
								if (valid(rotated, 0, 0)) current = rotated;
							}
							if (k === 'p') {
								paused = !paused;
							}
							if (k === 'x') {
								hardDrop();
							}
						};
						document.addEventListener('keydown', keyHandler);
						this.addCleanup(() => document.removeEventListener('keydown', keyHandler));
						current = newPiece();
						next = newPiece();
						let last = performance.now();
						const loop = (now) => {
							if (!running) return;
							const dt = now - last;
							last = now;
							update(dt);
							draw();
							this.gameRAF = requestAnimationFrame(loop);
						};
						this.gameRAF = requestAnimationFrame(loop);
					}
					/* ── Spellicopter ── */
					initSpellicopter() {
						const [c, x, keys] = this.initCanvasKeys();
						if (!c) return;
						const words = ['PYTHON', 'VECTOR', 'MATRIX', 'SIGMA', 'PI', 'DELTA', 'GAMMA', 'CODEX', 'NEURON', 'CIPHER', 'TENSOR', 'FOURIER', 'LAPLACE', 'CUDA', 'RUST'];
						let word = words[Math.floor(Math.random() * words.length)],
							target = 0,
							score = 0,
							level = 1,
							frame = 0,
							running = true,
							time = 60;
						let letters = [],
							px = c.width / 2,
							py = c.height - 60;
						const timer = setInterval(() => {
							time--;
							if (time <= 0) {
								clearInterval(timer);
								running = false;
								this.finishGame('game_spellicopter', score);
							}
						}, 1000);
						this.addCleanup(() => clearInterval(timer));
						const spawnLetter = () => {
							const needed = word[target] || 'A';
							const wrong = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' [Math.floor(Math.random() * 26)];
							letters.push({
								x: 30 + Math.random() * (c.width - 60),
								y: -30,
								ch: Math.random() < 0.4 ? needed : wrong,
								v: 1.5 + level * 0.3,
								good: false
							});
						};
						const loop = () => {
							if (!running) return;
							x.fillStyle = '#020814';
							x.fillRect(0, 0, c.width, c.height);
							x.fillStyle = '#FFBE0B';
							x.font = '20px Orbitron';
							x.textAlign = 'center';
							x.fillText('Spell: ' + word.split('').map((l, i) => i < target ? l : '_').join(' '), c.width / 2, 30);
							x.textAlign = 'left';
							if (keys.ArrowLeft || keys.a) px -= 5;
							if (keys.ArrowRight || keys.d) px += 5;
							px = Math.max(20, Math.min(c.width - 20, px));
							x.fillStyle = '#00E5FF';
							x.beginPath();
							x.moveTo(px, py - 15);
							x.lineTo(px - 12, py + 12);
							x.lineTo(px + 12, py + 12);
							x.fill();
							if (frame % Math.max(30, 60 - level * 3) === 0) spawnLetter();
							for (let i = letters.length - 1; i >= 0; i--) {
								const l = letters[i];
								l.y += l.v;
								x.fillStyle = l.ch === word[target] ? '#00E5FF' : '#FF006E';
								x.font = '22px Orbitron';
								x.fillText(l.ch, l.x, l.y);
								if (Math.hypot(px - l.x, py - l.y) < 22) {
									if (l.ch === word[target]) {
										target++;
										score += 100;
										if (target >= word.length) {
											level++;
											score += 500;
											target = 0;
											word = words[Math.floor(Math.random() * words.length)];
											if (level === 30) this.checkEasterEgg(level);
										}
									} else {
										score = Math.max(0, score - 50);
									}
									letters.splice(i, 1);
								}
								if (l.y > c.height + 20) letters.splice(i, 1);
							}
							document.getElementById('score').textContent = `Score ${score}`;
							document.getElementById('level').textContent = `Level ${level}`;
							document.getElementById('status').textContent = `Time ${time}s`;
							frame++;
							this.gameRAF = requestAnimationFrame(loop);
						};
						loop();
					}
					/* ── Neon Maze / Pacman with super biscuit powerups ── */
					initPacman() {
						const [c, x, keys] = this.initCanvasKeys();
						if (!c) return;
						const baseMaze = ['####################', '#o.......#........o#', '#.####.#.#.#######.#', '#.#....#...#.....#.#', '#.#.########.###.#.#', '#...#........#...#.#', '###.#.######.#.###.#', '#.....#....#.#.....#', '#.#####.##.#.#####.#', '#o......#........o.#', '####################'];
						let maze = baseMaze.map(r => r.split(''));
						const ROWS = maze.length,
							COLS = maze[0].length,
							cell = 26;
						let px = 1,
							py = 1,
							score = 0,
							level = 1,
							ghosts = [],
							power = 0,
							running = true,
							frame = 0,
							dots = 0;
						const countDots = () => {
							dots = 0;
							for (let r = 0; r < ROWS; r++)
								for (let cl = 0; cl < COLS; cl++)
									if (maze[r][cl] === '.' || maze[r][cl] === 'o') dots++;
						};
						countDots();
						const resetGhosts = () => {
							ghosts = [{
								x: 9,
								y: 5,
								color: '#FF006E',
								home: [9, 5]
							}, {
								x: 10,
								y: 5,
								color: '#00E5FF',
								home: [10, 5]
							}, {
								x: 9,
								y: 6,
								color: '#FFBE0B',
								home: [9, 6]
							}, {
								x: 10,
								y: 6,
								color: '#69F0AE',
								home: [10, 6]
							}];
						};
						resetGhosts();
						const resetLevel = () => {
							maze = baseMaze.map(r => r.split(''));
							countDots();
							px = 1;
							py = 1;
							resetGhosts();
						};
						const can = (x0, y0) => maze[y0]?.[x0] && maze[y0][x0] !== '#';
						const moveGhosts = () => ghosts.forEach(g => {
							let dirs = [
								[0, 1],
								[0, -1],
								[1, 0],
								[-1, 0]
							].filter(d => can(g.x + d[0], g.y + d[1]));
							if (power > 0) dirs.sort((a, b) => Math.hypot(g.x + b[0] - px, g.y + b[1] - py) - Math.hypot(g.x + a[0] - px, g.y + a[1] - py));
							else dirs.sort((a, b) => Math.hypot(g.x + a[0] - px, g.y + a[1] - py) - Math.hypot(g.x + b[0] - px, g.y + b[1] - py));
							const d = dirs[Math.floor(Math.random() * Math.min(2, dirs.length))] || dirs[0];
							if (d) {
								g.x += d[0];
								g.y += d[1];
							}
						});
						const draw = () => {
							x.fillStyle = '#070711';
							x.fillRect(0, 0, c.width, c.height);
							const ox = (c.width - COLS * cell) / 2,
								oy = 20;
							for (let r = 0; r < ROWS; r++)
								for (let cl = 0; cl < COLS; cl++) {
									const ch = maze[r][cl];
									if (ch === '#') {
										x.fillStyle = '#1a1a3a';
										x.fillRect(ox + cl * cell, oy + r * cell, cell, cell);
										x.strokeStyle = '#3a3a6a';
										x.strokeRect(ox + cl * cell, oy + r * cell, cell, cell);
									} else if (ch === '.' || ch === 'o') {
										x.fillStyle = ch === 'o' ? '#FFFFFF' : '#FFBE0B';
										x.beginPath();
										x.arc(ox + cl * cell + cell / 2, oy + r * cell + cell / 2, ch === 'o' ? 7 : 3, 0, Math.PI * 2);
										x.fill();
									}
								}
							const mouth = Math.abs(Math.sin(frame * .15)) * .4;
							x.fillStyle = power > 0 ? '#fff' : '#FFBE0B';
							x.beginPath();
							x.arc(ox + px * cell + cell / 2, oy + py * cell + cell / 2, cell * .4, mouth, Math.PI * 2 - mouth);
							x.lineTo(ox + px * cell + cell / 2, oy + py * cell + cell / 2);
							x.fill();
							ghosts.forEach(g => {
								x.fillStyle = power > 0 ? '#3A86FF' : g.color;
								x.beginPath();
								x.arc(ox + g.x * cell + cell / 2, oy + g.y * cell + cell / 2, cell * .35, Math.PI, 0);
								x.lineTo(ox + g.x * cell + cell, oy + g.y * cell + cell);
								x.lineTo(ox + g.x * cell, oy + g.y * cell + cell);
								x.fill();
							});
							document.getElementById('score').textContent = `Score ${score}`;
							document.getElementById('level').textContent = `Level ${level}`;
							document.getElementById('status').textContent = power > 0 ? `SUPER BISCUIT ${Math.ceil(power/60)}s · eat ghosts!` : `Dots ${dots}`;
						};
						const keyHandler = e => {
							if (this.activeGameId !== 'game_pacman' || !running) return;
							const k = e.key.toLowerCase();
							let nx = px,
								ny = py;
							if (k === 'arrowleft' || k === 'a') nx--;
							if (k === 'arrowright' || k === 'd') nx++;
							if (k === 'arrowup' || k === 'w') ny--;
							if (k === 'arrowdown' || k === 's') ny++;
							if (nx !== px || ny !== py) e.preventDefault();
							if (can(nx, ny)) {
								px = nx;
								py = ny;
								const ch = maze[py][px];
								if (ch === '.' || ch === 'o') {
									maze[py][px] = ' ';
									dots--;
									score += ch === 'o' ? 80 : 10;
									if (ch === 'o') power = 600;
									if (dots <= 0) {
										level++;
										score += 500;
										resetLevel();
										if (level === 30) this.checkEasterEgg(level);
									}
								}
							}
						};
						document.addEventListener('keydown', keyHandler);
						this.addCleanup(() => document.removeEventListener('keydown', keyHandler));
						c.focus();
						const loop = () => {
							if (!running) return;
							frame++;
							if (frame % (power > 0 ? 22 : 16) === 0) moveGhosts();
							if (power > 0) power--;
							ghosts.forEach(g => {
								if (g.x === px && g.y === py) {
									if (power > 0) {
										score += 250;
										g.x = g.home[0];
										g.y = g.home[1];
									} else {
										running = false;
										this.finishGame('game_pacman', score);
									}
								}
							});
							draw();
							this.gameRAF = requestAnimationFrame(loop);
						};
						loop();
					}
					/* ── Bubble Burst: working bubble shooter with 3+ popping, falling clusters and faster levels ── */
					initBubble() {
						const [c, x, keys] = this.initCanvasKeys();
						if (!c) return;
						const COLS = 10,
							ROWS = 13,
							R = 13,
							DY = Math.sqrt(3) * R,
							COLORS = ['#FF006E', '#00E5FF', '#FFBE0B', '#38ef7d', '#9B5DE5', '#FF4500'];
						let grid = Array.from({
							length: ROWS
						}, () => Array(COLS).fill(null));
						let shooter = {
								x: c.width / 2,
								y: c.height - 32,
								angle: -Math.PI / 2
							},
							shot = null,
							score = 0,
							level = 1,
							threshold = 650,
							running = true,
							dropTimer = 0,
							dropInterval = 9000,
							nextColor = COLORS[Math.floor(Math.random() * COLORS.length)],
							curColor = COLORS[Math.floor(Math.random() * COLORS.length)];
						for (let r = 0; r < 5; r++)
							for (let cl = 0; cl < COLS; cl++)
								if (Math.random() < .72) grid[r][cl] = COLORS[Math.floor(Math.random() * COLORS.length)];
						const origin = () => ({
							x: (c.width - (COLS * 2 * R + R)) / 2 + R,
							y: 38
						});
						const pos = (r, cl) => {
							const o = origin();
							return {
								x: o.x + cl * 2 * R + (r % 2 ? R : 0),
								y: o.y + r * DY
							};
						};
						const cellAt = (x0, y0) => {
							let best = {
								r: 0,
								cl: 0,
								d: 1e9
							};
							for (let r = 0; r < ROWS; r++)
								for (let cl = 0; cl < COLS; cl++) {
									const p = pos(r, cl),
										d = Math.hypot(x0 - p.x, y0 - p.y);
									if (d < best.d) best = {
										r,
										cl,
										d
									};
								}
							return best;
						};
						const neighbors = (r, cl) => {
							const even = r % 2 === 0;
							return [
								[r, cl - 1],
								[r, cl + 1],
								[r - 1, cl],
								[r + 1, cl],
								[r - 1, cl + (even ? -1 : 1)],
								[r + 1, cl + (even ? -1 : 1)]
							].filter(([rr, cc]) => rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS);
						};
						const cluster = (r, cl, color = null) => {
							const seen = new Set(),
								out = [],
								stack = [
									[r, cl]
								];
							while (stack.length) {
								const [rr, cc] = stack.pop(), key = rr + ',' + cc;
								if (seen.has(key) || !grid[rr]?.[cc] || (color && grid[rr][cc] !== color)) continue;
								seen.add(key);
								out.push([rr, cc]);
								neighbors(rr, cc).forEach(n => stack.push(n));
							}
							return out;
						};
						const popAndDrop = (r, cl) => {
							const same = cluster(r, cl, grid[r][cl]);
							if (same.length >= 3) {
								same.forEach(([rr, cc]) => grid[rr][cc] = null);
								score += same.length * 35;
								const attached = new Set();
								for (let cc = 0; cc < COLS; cc++)
									if (grid[0][cc]) cluster(0, cc).forEach(([rr, c2]) => attached.add(rr + ',' + c2));
								for (let rr = 0; rr < ROWS; rr++)
									for (let cc = 0; cc < COLS; cc++)
										if (grid[rr][cc] && !attached.has(rr + ',' + cc)) {
											grid[rr][cc] = null;
											score += 15;
										} if (score >= threshold) {
									level++;
									threshold += 650 + level * 240;
									dropInterval = Math.max(2600, 9000 - level * 520);
									if (level === 30) this.checkEasterEgg(level);
								}
							};
							const addRow = () => {
								for (let r = ROWS - 1; r > 0; r--)
									for (let cl = 0; cl < COLS; cl++) grid[r][cl] = grid[r - 1][cl];
								for (let cl = 0; cl < COLS; cl++) grid[0][cl] = Math.random() < .68 ? COLORS[Math.floor(Math.random() * Math.min(COLORS.length, 4 + Math.floor(level / 3)))] : null;
								if (grid[ROWS - 1].some(Boolean)) {
									running = false;
									this.finishGame('game_bubble', score);
								}
							};
							const attach = (s) => {
								const cell = cellAt(s.x, s.y);
								let r = cell.r,
									cl = cell.cl;
								if (grid[r][cl]) {
									let best = null;
									neighbors(r, cl).forEach(([rr, cc]) => {
										if (!grid[rr][cc]) {
											const p = pos(rr, cc),
												d = Math.hypot(s.x - p.x, s.y - p.y);
											if (!best || d < best.d) best = {
												r: rr,
												cl: cc,
												d
											};
										}
									});
									if (best) {
										r = best.r;
										cl = best.cl;
									} else return;
								}
								grid[r][cl] = s.color;
								popAndDrop(r, cl);
								curColor = nextColor;
								nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];
							};
							const drawBubble = (cx, cy, color, rad = R) => {
								x.fillStyle = color;
								x.beginPath();
								x.arc(cx, cy, rad, 0, Math.PI * 2);
								x.fill();
								x.strokeStyle = 'rgba(255,255,255,.72)';
								x.stroke();
								x.fillStyle = 'rgba(255,255,255,.25)';
								x.beginPath();
								x.arc(cx - rad * .32, cy - rad * .32, rad * .28, 0, Math.PI * 2);
								x.fill();
							};
							const draw = () => {
								x.fillStyle = '#071021';
								x.fillRect(0, 0, c.width, c.height);
								for (let r = 0; r < ROWS; r++)
									for (let cl = 0; cl < COLS; cl++)
										if (grid[r][cl]) {
											const p = pos(r, cl);
											drawBubble(p.x, p.y, grid[r][cl]);
										} x.strokeStyle = '#63F2FF';
								x.lineWidth = 2;
								x.beginPath();
								x.moveTo(shooter.x, shooter.y);
								x.lineTo(shooter.x + Math.cos(shooter.angle) * 55, shooter.y + Math.sin(shooter.angle) * 55);
								x.stroke();
								drawBubble(shooter.x, shooter.y, curColor, R + 1);
								if (shot) drawBubble(shot.x, shot.y, shot.color);
								drawBubble(c.width - 42, c.height - 30, nextColor, 10);
								document.getElementById('score').textContent = `Score ${score}`;
								document.getElementById('level').textContent = `Level ${level}`;
								document.getElementById('status').textContent = `Aim with mouse/arrows · Next bubble shown right · Drop ${Math.ceil((dropInterval-dropTimer)/1000)}s`;
							};
							c.addEventListener('mousemove', e => {
								const r = c.getBoundingClientRect();
								const mx = e.clientX - r.left,
									my = e.clientY - r.top;
								shooter.angle = Math.max(-Math.PI + .2, Math.min(-.2, Math.atan2(my - shooter.y, mx - shooter.x)));
							});
							c.addEventListener('click', () => {
								if (!shot && running) shot = {
									x: shooter.x,
									y: shooter.y,
									vx: Math.cos(shooter.angle) * 7.2,
									vy: Math.sin(shooter.angle) * 7.2,
									color: curColor
								};
							});
							let last = performance.now();
							const loop = (now) => {
								if (!running) return;
								const dt = now - last;
								last = now;
								if (keys.ArrowLeft || keys.a) shooter.angle -= .045;
								if (keys.ArrowRight || keys.d) shooter.angle += .045;
								shooter.angle = Math.max(-Math.PI + .2, Math.min(-.2, shooter.angle));
								if ((keys[' '] || keys.Space) && !shot) shot = {
									x: shooter.x,
									y: shooter.y,
									vx: Math.cos(shooter.angle) * 7.2,
									vy: Math.sin(shooter.angle) * 7.2,
									color: curColor
								};
								if (shot) {
									shot.x += shot.vx;
									shot.y += shot.vy;
									if (shot.x < R || shot.x > c.width - R) shot.vx *= -1;
									let hit = shot.y < 42;
									for (let r = 0; r < ROWS && !hit; r++)
										for (let cl = 0; cl < COLS; cl++)
											if (grid[r][cl]) {
												const p = pos(r, cl);
												if (Math.hypot(shot.x - p.x, shot.y - p.y) < R * 1.85) hit = true;
											} if (hit) {
										attach(shot);
										shot = null;
									}
								}
								dropTimer += dt;
								if (dropTimer >= dropInterval) {
									dropTimer = 0;
									addRow();
								}
								draw();
								this.gameRAF = requestAnimationFrame(loop);
							};
							this.gameRAF = requestAnimationFrame(loop);
						}
					}
				}



const arcadeDescriptions={game_synth:'Play, shape and record synth sounds.',game_drums:'Perform and record beats across eight kits.',game_pong:'Return the neon ball and survive five misses.',game_letters:'Type falling letters in the scoring zone.',game_racer:'Smooth lane changes, pickups and survival.',game_1943:'Weapons, shields, drones and escalating waves.',game_breakout:'Break every plasma brick and multiply balls.',game_snake:'Grow the circuit without crossing the signal.',game_memory:'Repeat synth and drum patterns, including chords.',game_blackjack:'Protect the bankroll against the dealer.',game_hangman:'Decode technical words before six misses.',game_match3:'Build cascades in twenty scoring moves.',game_tetris:'Clear lines with level-weighted scoring.',game_spellicopter:'Collect letters in the correct word order.',game_pacman:'Clear the maze and turn on the ghosts.',game_bubble:'Pop clusters and drop detached bubbles.'};
export function createArcadePortal(opts={}){
 const ui=new UIManager({},()=>'',{overlay:opts.overlay,inner:opts.inner,closeButton:opts.closeButton,hint:opts.hint});
 const baseClose=ui.close.bind(ui);
 ui.close=()=>{baseClose();opts.overlay?.classList.remove('active');opts.overlay?.setAttribute('aria-hidden','true');opts.onClose?.();};
 if(opts.closeButton) opts.closeButton.onclick=ui.close;
 const best=id=>(loadLB()[id]?.[0]?.score??0);
 const lobby=()=>`<div class="arcade-lobby-title">🕹️ Gene's After-Hours Arcade</div><div class="modal-subtitle">16 games · local top-10 scores · shared across both portfolio views</div><div class="arcade-toolbar"><button data-arc-lb>🏆 Leaderboards</button><button data-arc-random>🎲 Random Game</button><button data-arc-secrets>🥚 Secrets</button></div><div class="arcade-grid">${Object.entries(gameNames).map(([id,name])=>`<article class="arcade-card"><div style="font-size:1.8rem">${id==='game_synth'?'🎹':id==='game_drums'?'🥁':'🎮'}</div><h3>${name}</h3><p>${arcadeDescriptions[id]||'Arcade challenge.'}</p><div class="arcade-best">Personal best: ${best(id).toLocaleString()}</div><button class="game-launch" data-arc-game="${id}">PLAY</button></article>`).join('')}</div>`;
 const reveal=html=>{ui.openHTML(html);opts.overlay?.classList.add('active');opts.overlay?.setAttribute('aria-hidden','false');opts.onOpen?.();};
 const wire=()=>{ui.inner.querySelectorAll('[data-arc-game]').forEach(b=>b.onclick=()=>api.openGame(b.dataset.arcGame));ui.inner.querySelector('[data-arc-lb]')?.addEventListener('click',()=>api.openLeaderboards());ui.inner.querySelector('[data-arc-random]')?.addEventListener('click',()=>api.openRandom());ui.inner.querySelector('[data-arc-secrets]')?.addEventListener('click',()=>{const eggs=JSON.parse(localStorage.getItem('gene_arcade_eggs_v1')||'{}');reveal(`<div class="modal-title">🥚 Unlocked Secrets</div><div class="modal-subtitle">Overdrive unlocks at 777+ points</div><div class="arcade-grid">${Object.keys(gameNames).map(id=>`<div class="arcade-card"><h3>${gameNames[id]}</h3><p>${eggs[id]?`Unlocked · ${eggs[id].score} points`:'Still hidden'}</p></div>`).join('')}</div>`);});};
 const api={ui,openLobby(){reveal(lobby());wire();},openGame(id){reveal(ui.renderGameHTML(id));ui.activeGameId=id;setTimeout(()=>ui.initGameEngine(id),70);},openLeaderboards(){reveal(leaderboardHTML());},openRandom(){const ids=Object.keys(gameNames);api.openGame(ids[Math.floor(Math.random()*ids.length)]);},close(){ui.close();}};
 return api;
}
