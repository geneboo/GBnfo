import { stationData } from '../data.js';
import { leaderboardHTML } from './leaderboard.js';
import { renderGame, initGame, cleanupActiveGame } from '../games/gameHub.js';

const overlay = document.getElementById('content-overlay');
const panelInner = document.getElementById('panel-inner');
const closeBtn = document.getElementById('panel-close');
const hudHint = document.getElementById('hud-hint');

function renderLinks(links){
  if(!links?.length) return '';
  return `<div class="links-grid">${links.map(l=>`<a href="${l.url}" target="_blank" rel="noopener">${l.text}</a>`).join('')}</div>`;
}
export function renderStationHTML(data){
  let html = `<div class="modal-title">${data.title}</div><div class="modal-subtitle">${data.subtitle}</div><div class="modal-body">${data.body||''}</div>`;
  if(data.cards){
    html += '<div class="modal-card-grid">';
    data.cards.forEach(card=> html += `<div class="modal-card"><div class="modal-card-icon">${card.icon||'✨'}</div><h3>${card.title}</h3><p>${card.desc}</p>${renderLinks(card.links)}</div>`);
    html += '</div>';
  }
  html += renderLinks(data.links);
  return html;
}
export function openOverlayHTML(html){
  cleanupActiveGame();
  panelInner.innerHTML = html;
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden','false');
  hudHint.style.opacity = '0';
}
export function openContentForId(id){
  if(id?.startsWith('game_')){
    openOverlayHTML(renderGame(id));
    setTimeout(()=>initGame(id),90);
    return;
  }
  if(stationData[id]) openOverlayHTML(renderStationHTML(stationData[id]));
}
export function showLeaderboard(gameId=null){ openOverlayHTML(leaderboardHTML(gameId)); }
export function closeOverlay(e){
  if(e){ e.preventDefault(); e.stopPropagation(); }
  cleanupActiveGame();
  overlay.classList.remove('active');
  overlay.setAttribute('aria-hidden','true');
  hudHint.style.opacity = '1';
}
closeBtn.addEventListener('pointerdown', closeOverlay, {capture:true});
closeBtn.addEventListener('click', closeOverlay, {capture:true});
overlay.addEventListener('pointerdown', e=>{ if(e.target===overlay) closeOverlay(e); }, {capture:true});
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && overlay.classList.contains('active')) closeOverlay(e); });
