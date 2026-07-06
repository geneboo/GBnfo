import { games } from '../data.js';

const KEY = 'gene_arcade_leaderboard_v2';
export function getLeaderboard(){
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
export function saveLeaderboard(db){ localStorage.setItem(KEY, JSON.stringify(db)); }
export function addScore(gameId, initials, score){
  const db = getLeaderboard();
  db[gameId] ??= [];
  db[gameId].push({ initials: String(initials || 'GBD').toUpperCase().slice(0,3).padEnd(3,'X'), score: Math.round(score), date: new Date().toISOString().slice(0,10) });
  db[gameId].sort((a,b)=>b.score-a.score);
  db[gameId] = db[gameId].slice(0,10);
  saveLeaderboard(db);
}
export function scoreSubmission(gameId, score, onSaved){
  return `<div class="initials-form"><strong>NEW SCORE ${Math.round(score)}</strong><input class="initials-input" id="initials-input" maxlength="3" value="GBD" /><button class="arcade-button" id="save-score-btn">SAVE</button></div>`;
}
export function wireScoreSubmission(gameId, score, onSaved){
  document.getElementById('save-score-btn')?.addEventListener('click',()=>{
    const initials = document.getElementById('initials-input')?.value || 'GBD';
    addScore(gameId, initials, score);
    onSaved?.();
  });
}
export function leaderboardHTML(gameId=null){
  const db = getLeaderboard();
  const ids = gameId ? [gameId] : games.map(g=>g.id);
  let html = `<div class="modal-title">🏆 Arcade Leaderboards</div><div class="modal-subtitle">Persistent local high scores with initials</div>`;
  for(const id of ids){
    const gameName = games.find(g=>g.id===id)?.name || id;
    const rows = db[id] || [];
    html += `<h3 style="font-family:Orbitron;color:var(--accent-color);margin-top:18px">${gameName}</h3><table class="leaderboard-table"><thead><tr><th>#</th><th>INI</th><th>SCORE</th><th>DATE</th></tr></thead><tbody>`;
    if(!rows.length) html += `<tr><td colspan="4" style="color:#888">No scores yet</td></tr>`;
    rows.forEach((r,i)=> html += `<tr><td>${i+1}</td><td>${r.initials}</td><td>${r.score}</td><td>${r.date}</td></tr>`);
    html += `</tbody></table>`;
  }
  return html;
}
