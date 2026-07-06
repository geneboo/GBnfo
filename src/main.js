import * as THREE from 'three';
import { scene, camera, renderer, controls, interactiveObjects, updatables, raycaster, mouse, container, goToRoom } from './core/scene.js';
import { buildWorld } from './world/rooms.js';
import { openContentForId, showLeaderboard } from './ui/modal.js';

const themeData={
  default:{primary:'#FF006E',secondary:'#3A86FF',accent:'#FFBE0B',pattern:'url("https://www.transparenttextures.com/patterns/cartographer.png")'},
  ocean:{primary:'#2193b0',secondary:'#6dd5ed',accent:'#00d2ff',pattern:'url("https://www.transparenttextures.com/patterns/green-forest.png")'},
  sunset:{primary:'#ff7e5f',secondary:'#feb47b',accent:'#ff9a9e',pattern:'url("https://www.transparenttextures.com/patterns/bright-squares.png")'},
  forest:{primary:'#11998e',secondary:'#38ef7d',accent:'#5ee7df',pattern:'url("https://www.transparenttextures.com/patterns/beige-paper.png")'},
  royal:{primary:'#4776E6',secondary:'#8E54E9',accent:'#FFC75F',pattern:'url("https://www.transparenttextures.com/patterns/45-degree-fabric-light.png")'},
  dnb:{primary:'#00E5FF',secondary:'#FF4081',accent:'#7C4DFF',pattern:'url("https://www.transparenttextures.com/patterns/stardust.png")'}
};
function applyTheme(name){const t=themeData[name]||themeData.default;const r=document.documentElement.style;r.setProperty('--primary-color',t.primary);r.setProperty('--secondary-color',t.secondary);r.setProperty('--accent-color',t.accent);document.getElementById('vogue-bg').style.backgroundImage=t.pattern;document.querySelectorAll('.theme-dot').forEach(d=>d.classList.toggle('active',d.dataset.theme===name));}
document.querySelectorAll('.theme-dot').forEach(d=>d.addEventListener('click',()=>applyTheme(d.dataset.theme)));
document.querySelectorAll('.top-nav button').forEach(b=>b.addEventListener('click',()=>goToRoom(b.dataset.room)));
document.getElementById('leaderboard-btn').addEventListener('click',()=>showLeaderboard());
buildWorld(); applyTheme('default');
let hovered=null, hoveredGroup=null;
function setHover(obj){ if(hovered===obj)return; if(hoveredGroup)hoveredGroup.userData.hovered=false; hovered=obj; hoveredGroup=obj?.userData.group||obj?.parent||null; if(hoveredGroup)hoveredGroup.userData.hovered=true; }
function pick(x,y,click=false){ mouse.x=(x/innerWidth)*2-1; mouse.y=-(y/innerHeight)*2+1; raycaster.setFromCamera(mouse,camera); const hits=raycaster.intersectObjects(interactiveObjects,true); if(hits.length){ const target=hits[0].object; if(click){ openContentForId(target.userData.id); } else { setHover(target); container.classList.add('pointer-cursor'); } } else if(!click){ setHover(null); container.classList.remove('pointer-cursor'); } }
window.addEventListener('mousemove',e=>{ if(document.getElementById('content-overlay').classList.contains('active'))return; pick(e.clientX,e.clientY,false); });
window.addEventListener('click',e=>{ if(document.getElementById('content-overlay').classList.contains('active')||e.target.closest('#brand-header')||e.target.closest('#theme-dots')||e.target.closest('#leaderboard-btn'))return; pick(e.clientX,e.clientY,true); });
window.addEventListener('touchstart',e=>{ if(document.getElementById('content-overlay').classList.contains('active'))return; if(e.touches[0])pick(e.touches[0].clientX,e.touches[0].clientY,true); },{passive:true});
const clock=new THREE.Clock();
function animate(){ requestAnimationFrame(animate); const t=clock.getElapsedTime(); controls.update(); updatables.forEach(fn=>fn(t)); scene.traverse(obj=>{ if(obj.userData?.interactive){ const s=obj.userData.hovered?1.1:1; obj.scale.lerp(new THREE.Vector3(s,s,s),.12); } }); renderer.render(scene,camera); }
animate();
