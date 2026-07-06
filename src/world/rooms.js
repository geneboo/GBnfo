import * as THREE from 'three';
import { scene, makeRoomGroup, createNeonBox, createLabel, addHitbox, updatables, roomGroups } from '../core/scene.js';
import { games } from '../data.js';

export function buildWorld(){
  buildFloor(); buildMainHall(); buildEngineerDesk(); buildWriterDesk(); buildArcadeRoom(); buildStars();
}
function buildFloor(){
  const floorGeo = new THREE.PlaneGeometry(76,76,70,70); floorGeo.rotateX(-Math.PI/2);
  const floorMat = new THREE.MeshStandardMaterial({color:'#090914',roughness:.38,metalness:.55,emissive:'#030307',emissiveIntensity:.12,side:THREE.DoubleSide});
  const floor = new THREE.Mesh(floorGeo,floorMat); floor.position.y=-.55; floor.receiveShadow=true; scene.add(floor);
  const grid = new THREE.GridHelper(76,76,'#FF006E66','#1a1a2e33'); grid.position.y=-.52; grid.material.transparent=true; grid.material.opacity=.28; scene.add(grid);
  const orig = floorGeo.attributes.position.array.slice();
  updatables.push(t=>{ const arr=floorGeo.attributes.position.array; for(let i=0;i<arr.length;i+=3){ const x=arr[i], z=arr[i+2]; arr[i+1]=orig[i+1]+Math.sin(x*.35+t)*Math.cos(z*.28+t*.9)*.12; } floorGeo.attributes.position.needsUpdate=true; floorMat.color.lerp(new THREE.Color().setHSL((t*.025)%1,.7,.15),.02); grid.material.color.lerp(new THREE.Color().setHSL((t*.035+.1)%1,.9,.55),.03); });
}
function buildMainHall(){
  const g=makeRoomGroup('main',0,0); createLabel('MAIN HALL',new THREE.Vector3(0,6.4,0),'#FFBE0B',g);
  createNeonBox({parent:g,id:'about',label:'ABOUT',color:'#3A86FF',pos:[0,1.35,-3.5],size:[2.2,2.7,1.2]});
  createNeonBox({parent:g,id:'resume',label:'CVs & LETTERS',color:'#FFBE0B',pos:[-4,1.5,1.5],size:[2.7,3,1.2]});
  createNeonBox({parent:g,id:'arcadeIntro',label:'ARCADE MAP',color:'#FF006E',pos:[4,1.35,1.5],size:[2.7,2.7,1.2]});
  const arch = new THREE.Mesh(new THREE.TorusGeometry(5.5,.08,16,120),new THREE.MeshBasicMaterial({color:'#FFBE0B'})); arch.position.set(0,2.4,4); arch.rotation.x=Math.PI/2; g.add(arch);
}
function buildEngineerDesk(){
  const g=makeRoomGroup('engineer',26,0); createLabel("ENGINEER'S DESK",new THREE.Vector3(0,6.2,0),'#00E5FF',g);
  const table=new THREE.Mesh(new THREE.BoxGeometry(8,.35,3),new THREE.MeshStandardMaterial({color:'#15151c',metalness:.7,roughness:.4,emissive:'#001820',emissiveIntensity:.2})); table.position.y=1.1; table.castShadow=true; g.add(table);
  createNeonBox({parent:g,id:'projects',label:'APPS & SITES',color:'#00E5FF',pos:[0,2.5,-1.4],size:[4.5,2.5,.35]});
  for(let i=-3;i<=3;i+=2){ const m=new THREE.Mesh(new THREE.BoxGeometry(.8,.6,.8),new THREE.MeshStandardMaterial({color:'#111',emissive:i%4?'#FF006E':'#FFBE0B',emissiveIntensity:.35})); m.position.set(i,1.55,1); g.add(m); }
}
function buildWriterDesk(){
  const g=makeRoomGroup('writer',-26,0); createLabel("WRITER'S DESK",new THREE.Vector3(0,6.2,0),'#ffffff',g);
  const board=new THREE.Mesh(new THREE.PlaneGeometry(8,4),new THREE.MeshStandardMaterial({color:'#07150f',roughness:.8,emissive:'#001206',emissiveIntensity:.22})); board.position.set(0,3,-1.8); g.add(board);
  addHitbox(board,'written',[8.5,4.6,.8],0);
  createLabel('FFT · MGF · CUDA · VaR · ES · Autodiff',new THREE.Vector3(0,5.5,-1.8),'#FFBE0B',g);
  const chalk=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(8.3,4.3,.06)),new THREE.LineBasicMaterial({color:'#fff',transparent:true,opacity:.55})); chalk.position.copy(board.position); g.add(chalk);
}
function buildArcadeRoom(){
  const g=makeRoomGroup('arcade',0,-32); createLabel('ARCADE ROOM',new THREE.Vector3(0,7.2,0),'#FF006E',g);
  const carpet=new THREE.Mesh(new THREE.CircleGeometry(13,96),new THREE.MeshBasicMaterial({color:'#120018',transparent:true,opacity:.65})); carpet.rotation.x=-Math.PI/2; carpet.position.y=-.49; g.add(carpet);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(13,.06,16,160),new THREE.MeshBasicMaterial({color:'#00E5FF'})); ring.rotation.x=Math.PI/2; ring.position.y=-.39; g.add(ring);
  const positions=[[-7,1.4,-2],[-3.8,1.4,3.2],[0,1.4,-4.2],[3.8,1.4,3.2],[7,1.4,-2],[0,1.4,5.8]];
  games.forEach((game,i)=> createArcadeCabinet(g,game,positions[i%positions.length],i));
}
function createArcadeCabinet(parent,game,pos,i){
  const group=new THREE.Group(); group.position.set(...pos); group.userData={interactive:true,hovered:false,color:game.color}; parent.add(group);
  const body=new THREE.Mesh(new THREE.BoxGeometry(2,3,1.2),new THREE.MeshStandardMaterial({color:'#12121a',metalness:.55,roughness:.35,emissive:game.color,emissiveIntensity:.12})); body.castShadow=true; group.add(body);
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(1.55,.95),new THREE.MeshBasicMaterial({color:game.color,transparent:true,opacity:.78})); screen.position.set(0,.55,.61); group.add(screen);
  const marquee=new THREE.Mesh(new THREE.BoxGeometry(2.1,.45,1.3),new THREE.MeshBasicMaterial({color:game.color})); marquee.position.y=1.45; group.add(marquee);
  const light=new THREE.PointLight(game.color,2.5,7); light.position.set(0,1.5,1); group.add(light);
  addHitbox(group,game.id,[2.6,3.6,1.8],0);
  createLabel(game.name.toUpperCase(), new THREE.Vector3(pos[0],pos[1]+2.6,pos[2]), game.color, parent);
  updatables.push(t=>{ group.rotation.y=Math.sin(t*.45+i)*.08; body.material.emissiveIntensity=group.userData.hovered?.65:.12; light.intensity=group.userData.hovered?7:2.5; screen.material.opacity=.55+Math.sin(t*5+i)*.18; });
}
function buildStars(){
  const count=900; const geo=new THREE.BufferGeometry(); const pos=new Float32Array(count*3); const col=new Float32Array(count*3);
  for(let i=0;i<count;i++){ pos[i*3]=(Math.random()-.5)*70; pos[i*3+1]=Math.random()*22+2; pos[i*3+2]=(Math.random()-.5)*70; const c=new THREE.Color().setHSL(.55+Math.random()*.25,.8,.65); col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b; }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.setAttribute('color',new THREE.BufferAttribute(col,3)); const stars=new THREE.Points(geo,new THREE.PointsMaterial({size:.065,vertexColors:true,transparent:true,opacity:.72,blending:THREE.AdditiveBlending,depthWrite:false})); scene.add(stars); updatables.push(()=>{stars.rotation.y+=.00045;});
}
