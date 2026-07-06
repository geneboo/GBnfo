import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const container = document.getElementById('three-container');
export const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2('#05050A', 0.014);
export const camera = new THREE.PerspectiveCamera(58, window.innerWidth/window.innerHeight, .1, 120);
camera.position.set(0,7,16);
export const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);
export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = .06; controls.maxPolarAngle = Math.PI/2+.12; controls.minDistance=3; controls.maxDistance=32; controls.target.set(0,2,0);

scene.add(new THREE.AmbientLight('#242448',1.6));
const spot = new THREE.SpotLight('#fff',42,45,Math.PI/4.2,.45,1); spot.position.set(0,18,0); spot.castShadow=true; scene.add(spot);
export const interactiveObjects = [];
export const updatables = [];
export const roomGroups = {};
export const raycaster = new THREE.Raycaster();
export const mouse = new THREE.Vector2();

export function makeRoomGroup(name, x, z){ const g = new THREE.Group(); g.name=name; g.position.set(x,0,z); scene.add(g); roomGroups[name]=g; return g; }
export function createLabel(text, position, color='#fff', parent=scene){
  const c=document.createElement('canvas'); c.width=768; c.height=128; const ctx=c.getContext('2d');
  ctx.font='bold 44px Orbitron'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle=color; ctx.shadowColor=color; ctx.shadowBlur=18; ctx.fillText(text,384,64);
  const tex=new THREE.CanvasTexture(c); tex.minFilter=THREE.LinearFilter;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false,depthWrite:false}));
  sp.position.copy(position); sp.scale.set(4.6,.78,1); sp.renderOrder=10; parent.add(sp); return sp;
}
export function addHitbox(group, id, size=[2,2,2], y=1){
  const box = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshBasicMaterial({visible:false}));
  box.position.y = y; box.userData={id, group}; group.add(box); interactiveObjects.push(box); return box;
}
export function createNeonBox({parent, id, label, color='#00E5FF', pos=[0,1,0], size=[2,2,2]}){
  const group=new THREE.Group(); group.position.set(...pos); group.userData={interactive:true,hovered:false,color}; parent.add(group);
  const mat=new THREE.MeshStandardMaterial({color:'#111118',metalness:.85,roughness:.26,emissive:color,emissiveIntensity:.18});
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),mat); mesh.castShadow=true; group.add(mesh);
  const edge=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color,transparent:true,opacity:.75})); group.add(edge);
  const light=new THREE.PointLight(color,2.2,8); light.position.y=size[1]*.7; group.add(light);
  addHitbox(group,id,[size[0]*1.35,size[1]*1.35,size[2]*1.35],0);
  createLabel(label, new THREE.Vector3(pos[0], pos[1]+size[1]*.75+1.0, pos[2]), color, parent);
  updatables.push(t=>{group.rotation.y += .006; group.position.y = pos[1]+Math.sin(t*1.8+pos[0])*.08; mat.emissiveIntensity=group.userData.hovered?.85:.18; light.intensity=group.userData.hovered?6:2.2;});
  return group;
}
export function goToRoom(name){
  const map = { main:{pos:[0,7,16],target:[0,2,0]}, engineer:{pos:[29,7,12],target:[26,2,0]}, writer:{pos:[-29,7,12],target:[-26,2,0]}, arcade:{pos:[0,8,-25],target:[0,2,-32]} };
  const m = map[name] || map.main; camera.position.set(...m.pos); controls.target.set(...m.target); controls.update();
}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight);});
