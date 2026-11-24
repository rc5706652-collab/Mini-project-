// Pip — a real low-poly 3D companion. No animated GIF, external character asset or audio upload.
// Single Three.js WebGL renderer, lazy import, quality caps, reduced-motion fallback.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js";
export function createRobotCompanion(host){
 const canvas=host?.querySelector("canvas");
 const noop={setMode(mode){if(host)host.dataset.mode=mode;},setEnergy(){},setPaused(){},destroy(){}};
 if(!canvas || matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion==="reduced" || (Number(navigator.deviceMemory)||4)<=2 || Boolean(navigator.connection?.saveData)){
  host?.classList.add("orb-fallback");return noop;
 }
 let renderer;
 try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:innerWidth>=700,powerPreference:"low-power"});}
 catch{host.classList.add("orb-fallback");return noop;}
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(37,1,.1,60);
 camera.position.set(0,.12,7.7);
 renderer.setClearColor(0x000000,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 const cap=()=>Math.min(devicePixelRatio||1,Number(document.documentElement.style.getPropertyValue("--nw-max-dpr"))||1.35);
 renderer.setPixelRatio(cap());
 const ambient=new THREE.AmbientLight(0x889dff,2.1),key=new THREE.PointLight(0xc6d9ff,60,17),rim=new THREE.PointLight(0x8067ff,65,14);
 key.position.set(-3,5,6);rim.position.set(4,-1,-2);
 scene.add(ambient,key,rim);
 const all=[];
 function material(color,{metal=.32,rough=.26,emissive=0x000000,intensity=0,transparent=false,opacity=1}={}){
  const m=new THREE.MeshPhysicalMaterial({color,metalness:metal,roughness:rough,clearcoat:.7,clearcoatRoughness:.16,emissive,emissiveIntensity:intensity,transparent,opacity});
  all.push(m);return m;
 }
 const pearl=material(0xdad9ff,{metal:.38,rough:.22});
 const white=material(0xf7fbff,{metal:.14,rough:.18});
 const shell=material(0x7773e8,{metal:.52,rough:.29});
 const blue=material(0x58bcfa,{metal:.48,rough:.21});
 const glass=material(0x121d3e,{metal:.44,rough:.09});
 const dark=material(0x161a42,{metal:.45,rough:.21});
 const neon=material(0x7ee7ff,{metal:.18,rough:.25,emissive:0x48c9f7,intensity:2.4});
 const pink=material(0xff93d9,{metal:.1,rough:.25,emissive:0xd467bb,intensity:.8});
 const handMat=material(0xeaeaff,{metal:.3,rough:.25});
 const stage=new THREE.Group();scene.add(stage);
 const robot=new THREE.Group();stage.add(robot);
 const parts=[];
 const geometry=(geo,mat,parent=robot,x=0,y=0,z=0,scale=[1,1,1])=>{
  const obj=new THREE.Mesh(geo,mat);obj.position.set(x,y,z);obj.scale.set(...scale);
  parent.add(obj);parts.push(obj);return obj;
 };
 function sphere(mat,parent,x,y,z,sx,sy,sz,segments=28){
  return geometry(new THREE.SphereGeometry(1,segments,20),mat,parent,x,y,z,[sx,sy,sz]);
 }
 function cylinder(mat,parent,x,y,z,rTop,rBottom,height){
  return geometry(new THREE.CylinderGeometry(rTop,rBottom,height,18),mat,parent,x,y,z);
 }
 // Feet, chest, and touch-sensitive glowing heart core.
 const leftFoot=sphere(dark,robot,-.43,-1.51,.21,.35,.18,.44);
 const rightFoot=sphere(dark,robot,.43,-1.51,.21,.35,.18,.44);
 sphere(shell,robot,0,-.82,0,.71,.74,.53);
 sphere(pearl,robot,0,-.72,.32,.57,.57,.25);
 sphere(glass,robot,0,-.66,.56,.31,.28,.07);
 const heart=sphere(neon,robot,0,-.64,.634,.145,.145,.045,24);
 const heartRing=geometry(new THREE.TorusGeometry(.21,.02,10,48),blue,robot,0,-.64,.63);
 // Arms use pivots so they can wave and respond to audio.
 function arm(side){
  const group=new THREE.Group();group.position.set(side*.73,-.59,0);robot.add(group);
  const upper=sphere(shell,group,side*.13,-.28,0,.26,.4,.26);
  upper.rotation.z=side*.22;
  sphere(handMat,group,side*.24,-.58,.07,.24,.23,.24);
  return group;
 }
 const leftArm=arm(-1),rightArm=arm(1);
 // Tiny hover jets beneath body (non-blocking aesthetic).
 const jets=[];
 for(const x of [-.38,.38]){
  sphere(blue,robot,x,-1.29,-.25,.17,.08,.15);
  jets.push(sphere(neon,robot,x,-1.44,-.24,.08,.12,.08));
 }
 // Head pivot for expressive movements, visor and eyes.
 const head=new THREE.Group();head.position.y=.72;robot.add(head);
 sphere(pearl,head,0,.15,0,1.12,.88,.76,44);
 sphere(shell,head,0,-.43,-.28,.95,.3,.48,36);
 const visor=sphere(glass,head,0,.12,.57,.96,.48,.26,44);
 // Subtle curved visor reflection.
 const shine=material(0x85c5ff,{metal:.05,rough:.02,emissive:0x3a6dd1,intensity:.28,transparent:true,opacity:.19});
 const line=geometry(new THREE.TorusGeometry(.67,.014,8,52,Math.PI*.88),shine,head,0,.38,.81);
 line.rotation.z=.12;
 const eyes=[];
 for(const sign of [-1,1]){
  const eye=sphere(neon,head,sign*.41,.2,.81,.155,.175,.065,32);eyes.push(eye);
  sphere(white,head,sign*.37,.27,.865,.035,.038,.02,16);
  sphere(pink,head,sign*.77,-.065,.735,.11,.04,.03,16);
  cylinder(shell,head,sign*1.06,.14,0,.23,.24,.18).rotation.z=Math.PI/2;
  sphere(blue,head,sign*1.15,.14,.04,.19,.22,.2,20);
 }
 // Smile drawn in 3D: a short luminous curved tube, never a texture.
 const smilePoints=[];
 for(let i=0;i<=12;i++){
  const t=-1+i/6;smilePoints.push(new THREE.Vector3(t*.24,-.11-(1-t*t)*.075,.835+(.015*(1-t*t))));
 }
 const smile=geometry(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(smilePoints),22,.017,7,false),neon,head);
 // Little antenna with luminous tip.
 cylinder(shell,head,0,1.06,-.08,.08,.12,.34);
 sphere(pink,head,0,1.29,-.08,.17,.17,.17);
 // Floating platform and orbit accents.
 const orbitMat=new THREE.MeshBasicMaterial({color:0x9591ff,transparent:true,opacity:.52,depthWrite:false});
 all.push(orbitMat);
 const platform=geometry(new THREE.TorusGeometry(1.56,.017,7,100),orbitMat,stage,0,-1.73,0);
 platform.rotation.x=1.2;
 const orbit=geometry(new THREE.TorusGeometry(2.09,.012,5,140),orbitMat,stage,0,.06,0);
 orbit.rotation.set(.48,.25,.28);
 const budget=innerWidth<600?65:130,starsPos=new Float32Array(budget*3);
 for(let i=0;i<budget;i++){
  const t=i*2.399963,r=2.0+Math.sqrt((i+.5)/budget)*1.33;
  starsPos.set([Math.cos(t)*r,(Math.sin(i*2.17))*1.84,Math.sin(t)*r*.41],i*3);
 }
 const starsGeo=new THREE.BufferGeometry();starsGeo.setAttribute("position",new THREE.BufferAttribute(starsPos,3));
 const starsMaterial=new THREE.PointsMaterial({color:0x9fd1ff,size:.024,transparent:true,opacity:.8,depthWrite:false});
 all.push(starsMaterial);const stars=new THREE.Points(starsGeo,starsMaterial);stage.add(stars);
 let active=true,paused=false,motionPaused=false,visible=true,mode="idle",energy=0,current=0,raf=0,lastFrame=0;
 let pointerX=0,pointerY=0,baseFps=innerWidth<720?24:40,activeFps=innerWidth<720?30:55;
 const clock=new THREE.Clock();
 function resize(){
  if(!active)return;
  const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
  camera.aspect=w/h;camera.updateProjectionMatrix();
  renderer.setPixelRatio(cap());renderer.setSize(w,h,false);
 }
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 const intersect=new IntersectionObserver(entries=>{visible=Boolean(entries[0]?.isIntersecting);schedule()},{threshold:0});
 intersect.observe(host);
 const pointer=e=>{const box=host.getBoundingClientRect();pointerX=(e.clientX-box.left)/box.width-.5;pointerY=(e.clientY-box.top)/box.height-.5;};
 const visibility=()=>schedule();
 const motion=e=>{
  motionPaused=Boolean(e.detail?.reduced);
  baseFps=e.detail?.idleFps||baseFps;activeFps=e.detail?.activeFps||activeFps;
  if(motionPaused){cancelAnimationFrame(raf);raf=0;}else schedule();
 };
 const robotEvent=e=>{const next=e.detail?.mode;if(next)setMode(next);};
 host.addEventListener("pointermove",pointer,{passive:true});
 document.addEventListener("visibilitychange",visibility);
 document.addEventListener("notewave:motion-change",motion);
 document.addEventListener("notewave:robot-state",robotEvent);
 function schedule(){if(active&&visible&&!paused&&!motionPaused&&!document.hidden&&!raf)raf=requestAnimationFrame(frame);}
 function setMode(next){mode=next;host.dataset.mode=next;schedule();}
 function frame(ts){
  raf=0;if(!active||!visible||paused||motionPaused||document.hidden)return;
  const lively=["listening","speaking","processing","thinking"].includes(mode);
  if(lastFrame&&ts-lastFrame<1000/(lively?activeFps:baseFps)){schedule();return;}lastFrame=ts;
  const t=clock.getElapsedTime(),target=lively?.48:.1;
  current+=(Math.max(energy,target)-current)*.09;
  // Idle breathing, hover, curious head turns, eye blinks and hand waves.
  robot.position.y=Math.sin(t*1.5)*(.05+.06*current);
  robot.rotation.y=Math.sin(t*.54)*.11+pointerX*.32;
  robot.rotation.z=Math.sin(t*.7)*.045;
  head.rotation.y=Math.sin(t*.92)*.1+pointerX*.43;
  head.rotation.x=Math.sin(t*.76)*.04-pointerY*.24+(mode==="thinking"?.11:0);
  const blink=Math.pow(Math.max(0,Math.cos(t*2.1)),44);
  const blinkScale=Math.max(.07,1-blink*.93);
  for(const eye of eyes)eye.scale.y=.175*blinkScale;
  rightArm.rotation.z=lively?Math.sin(t*4.0)*.38-.23:Math.sin(t*.9)*.075;
  leftArm.rotation.z=mode==="speaking"?Math.sin(t*4.6)*.3+.12:-Math.sin(t*.85)*.075;
  const beat=1+Math.min(.34,current*.28+Math.sin(t*4.8)*.05);
  heart.scale.set(.145*beat,.145*beat,.045*beat);
  for(const jet of jets)jet.scale.y=.12*(1+.35*Math.sin(t*6));
  orbit.rotation.y=t*.2;stars.rotation.y=t*.026;
  platform.rotation.z=t*.17;
  const sense=mode==="speaking"?1.6:mode==="listening"?1.8:mode==="thinking"?1.35:1.0;
  neon.emissiveIntensity=2+current*sense*1.4;
  renderer.render(scene,camera);schedule();
 }
 host.classList.add("robot-rendering");host.classList.remove("orb-fallback");
 schedule();
 return {
  setMode,setEnergy(value){energy=Math.max(0,Math.min(1,Number(value)||0));},
  setPaused(value){paused=Boolean(value);if(paused){cancelAnimationFrame(raf);raf=0;}else schedule();},
  destroy(){
   active=false;cancelAnimationFrame(raf);observer.disconnect();intersect.disconnect();
   host.removeEventListener("pointermove",pointer);
   document.removeEventListener("visibilitychange",visibility);
   document.removeEventListener("notewave:motion-change",motion);
   document.removeEventListener("notewave:robot-state",robotEvent);
   for(const part of parts)part.geometry.dispose();
   starsGeo.dispose();for(const mat of all)mat.dispose();
   renderer.dispose();host.classList.remove("robot-rendering");
  }
 };
}
