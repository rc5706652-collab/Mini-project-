// Animated, original 3D NoteWave companion. One WebGL renderer / scene.
// Created lazily; if WebGL isn't available the CSS robot remains visible and functional.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js";

export function createRobot(host) {
  const canvas=host.querySelector("#orb-canvas");
  const empty={setMode(value){host.dataset.robotState=value;},setEnergy(){},setPaused(){},destroy(){}};
  if(!canvas || matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion==="reduced"){
    host.classList.add("robo-fallback");return empty;
  }
  let renderer;
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:"low-power"});
  }catch{
    host.classList.add("robo-fallback");return empty;
  }
  renderer.setClearColor(0x000000,0);
  const maxDpr=()=>Math.min(devicePixelRatio||1,Number(document.documentElement.style.getPropertyValue("--nw-max-dpr"))||1.5);
  renderer.setPixelRatio(maxDpr());
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,100);
  camera.position.set(0,.2,9.3);
  const ambient=new THREE.HemisphereLight(0xf2f2ff,0x343b77,2.45);scene.add(ambient);
  const keyLight=new THREE.DirectionalLight(0xd4dcff,3.5);keyLight.position.set(-3,6,6);scene.add(keyLight);
  const rimLight=new THREE.PointLight(0x6bcdf7,48,18);rimLight.position.set(3,1,3);scene.add(rimLight);
  const magenta=new THREE.PointLight(0xaf82ff,36,14);magenta.position.set(-4,1,1);scene.add(magenta);
  const shell=new THREE.MeshPhysicalMaterial({color:0xdce8ff,roughness:.26,metalness:.15,clearcoat:.86,clearcoatRoughness:.17});
  const dark=new THREE.MeshPhysicalMaterial({color:0x1c254b,metalness:.32,roughness:.22,clearcoat:.8});
  const accent=new THREE.MeshStandardMaterial({color:0x8b75ff,metalness:.6,roughness:.21,emissive:0x22136a,emissiveIntensity:.6});
  const cyan=new THREE.MeshStandardMaterial({color:0x66e4ff,metalness:.12,roughness:.3,emissive:0x35bfff,emissiveIntensity:.9});
  const pupils=new THREE.MeshBasicMaterial({color:0x101638});
  const blush=new THREE.MeshBasicMaterial({color:0xffb6d9,transparent:true,opacity:.68});
  const muted=new THREE.MeshStandardMaterial({color:0x8093c3,roughness:.35,metalness:.3});
  const group=new THREE.Group();scene.add(group);
  const body=new THREE.Group();body.position.y=-.6;group.add(body);
  function sphere(parent,x,y,z,sx,sy,sz,material,detail=28){
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,detail,20),material);
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh;
  }
  function bar(parent,x,y,z,rad,length,material){
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad,length,14),material);
    mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  sphere(body,0,-.44,0,.86,.94,.57,shell);
  sphere(body,0,-.25,.545,.48,.4,.08,dark);
  sphere(body,0,-.22,.605,.30,.16,.035,cyan);
  sphere(body,0,-.91,.555,.16,.07,.03,accent);
  const chestRing=new THREE.Mesh(new THREE.TorusGeometry(.25,.032,8,48),accent);
  chestRing.position.set(0,-.21,.641);body.add(chestRing);
  sphere(body,-.47,-1.15,.18,.30,.16,.36,dark);
  sphere(body,.47,-1.15,.18,.30,.16,.36,dark);
  const leftArm=new THREE.Group();leftArm.position.set(-.83,.1,-.05);body.add(leftArm);
  sphere(leftArm,-.08,-.19,0,.24,.45,.24,shell);
  sphere(leftArm,-.12,-.53,.05,.22,.20,.24,accent);
  const rightArm=new THREE.Group();rightArm.position.set(.83,.1,-.05);body.add(rightArm);
  sphere(rightArm,.08,-.19,0,.24,.45,.24,shell);
  sphere(rightArm,.11,-.53,.05,.22,.21,.24,accent);
  const head=new THREE.Group();head.position.y=.85;group.add(head);
  sphere(head,0,.02,0,1.48,1.12,.92,shell);
  sphere(head,0,.04,.74,1.22,.83,.24,dark);
  // Reflective eye bulbs in their glossy face panel.
  const eyes=[],pupilMeshes=[];
  for(const x of [-.55,.55]){
    const eye=sphere(head,x,.16,.965,.22,.34,.08,cyan);eyes.push(eye);
    const pupil=sphere(head,x,.14,1.035,.087,.14,.028,pupils,18);pupilMeshes.push(pupil);
    sphere(head,x*1.51,-.29,.929,.19,.11,.025,blush,18);
  }
  const mouth=sphere(head,0,-.49,1.012,.23,.048,.03,cyan,24);
  const smile=new THREE.Mesh(new THREE.TorusGeometry(.2,.018,8,30,Math.PI),cyan);
  smile.rotation.z=Math.PI;smile.position.set(0,-.41,1.02);head.add(smile);
  sphere(head,-1.44,-.01,.07,.23,.42,.48,accent);
  sphere(head,1.44,-.01,.07,.23,.42,.48,accent);
  sphere(head,-1.56,.04,.12,.11,.18,.2,cyan);
  sphere(head,1.56,.04,.12,.11,.18,.2,cyan);
  bar(head,0,1.24,-.05,.07,.36,muted);
  const antenna=sphere(head,0,1.49,-.05,.18,.18,.18,cyan);
  const crown=new THREE.Mesh(new THREE.TorusGeometry(1.5,.01,6,120),new THREE.MeshBasicMaterial({color:0x9fb9ff,transparent:true,opacity:.24}));
  crown.position.y=.85;crown.rotation.x=1.18;group.add(crown);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.45,.022,7,150),new THREE.MeshBasicMaterial({color:0x7acbff,transparent:true,opacity:.37,depthWrite:false}));
  ring.rotation.x=.9;ring.rotation.y=.25;group.add(ring);
  const ring2=new THREE.Mesh(new THREE.TorusGeometry(2.75,.012,7,150),new THREE.MeshBasicMaterial({color:0xa996ff,transparent:true,opacity:.3,depthWrite:false}));
  ring2.rotation.x=-.45;ring2.rotation.y=.3;group.add(ring2);
  // Stars are batched as one Points call, not hundreds of individual meshes.
  const mobile=innerWidth<700,amount=mobile?75:145;
  const starPos=new Float32Array(amount*3);
  for(let i=0;i<amount;i++){
    const a=i*2.399963,r=2.8+((i*31)%53)/53*1.8;
    starPos[i*3]=Math.cos(a)*r;
    starPos[i*3+1]=Math.sin(a)*r*.8;
    starPos[i*3+2]=Math.sin(i*.8)*1.15-.85;
  }
  const starsGeo=new THREE.BufferGeometry();
  starsGeo.setAttribute("position",new THREE.BufferAttribute(starPos,3));
  const stars=new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0xa9c8ff,size:.025,transparent:true,opacity:.8,depthWrite:false}));
  scene.add(stars);
  let active=true,visible=true,paused=false,motionPaused=false,mode="idle",energy=0,
      pointerX=0,pointerY=0,frameId=0,last=0,time=0,blinkAt=2.3,frame=0;
  const timer=new THREE.Clock();
  function resize(){
    if(!active)return;
    const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
    camera.aspect=w/h;camera.updateProjectionMatrix();
    renderer.setPixelRatio(maxDpr());renderer.setSize(w,h,false);
  }
  const ro=new ResizeObserver(resize);ro.observe(host);resize();
  const io=new IntersectionObserver(([entry])=>{visible=entry?.isIntersecting??true;if(visible)request();});
  io.observe(host);
  const onVisibility=()=>request();
  const onPointer=e=>{
    if(matchMedia("(pointer: coarse)").matches)return;
    const b=host.getBoundingClientRect();
    pointerX=((e.clientX-b.left)/Math.max(1,b.width)-.5);
    pointerY=((e.clientY-b.top)/Math.max(1,b.height)-.5);
  };
  const onMotion=e=>{
    motionPaused=Boolean(e.detail?.reduced);
    if(motionPaused){cancelAnimationFrame(frameId);frameId=0;}
    else request();
  };
  host.addEventListener("pointermove",onPointer,{passive:true});
  document.addEventListener("visibilitychange",onVisibility);
  document.addEventListener("notewave:motion-change",onMotion);
  function request(){
    if(active&&visible&&!paused&&!motionPaused&&!document.hidden&&!frameId)frameId=requestAnimationFrame(draw);
  }
  function draw(timestamp){
    frameId=0;
    if(!active||!visible||paused||motionPaused||document.hidden)return;
    const fps=mode==="listening"||mode==="speaking"?36:mobile?22:36;
    if(last&&timestamp-last<1000/fps){request();return;}
    last=timestamp;time=timer.getElapsedTime();
    const excited=mode==="happy"||mode==="speaking",curious=mode==="thinking";
    group.position.y=Math.sin(time*1.8)*.10+(excited?Math.sin(time*6)*.035:0);
    group.rotation.y=Math.sin(time*.55)*.13+pointerX*.19;
    group.rotation.x=Math.sin(time*.66)*.045-pointerY*.15;
    head.rotation.z=curious?.08*Math.sin(time*2):Math.sin(time*.7)*.035;
    head.rotation.x=mode==="listening"?.07:0;
    rightArm.rotation.z=excited?-.45+Math.sin(time*9)*.32:Math.sin(time*1.6)*.10;
    leftArm.rotation.z=mode==="listening"?.18:Math.sin(time*.91)*.06;
    ring.rotation.z=time*.075;ring2.rotation.z=-time*.05;
    crown.rotation.z=time*.09;
    stars.rotation.y=time*.006;
    antenna.scale.setScalar(1+(mode==="listening"?.17:mode==="thinking"?.12:0)*Math.sin(time*7));
    const blink=Math.abs(Math.sin(time*1.16))>.988?.10:1;
    eyes.forEach((eye,i)=>{
      eye.scale.y=.34*blink;
      pupilMeshes[i].scale.y=.14*blink;
      pupilMeshes[i].position.x=(i===0?-.55:.55)+pointerX*.052;
      pupilMeshes[i].position.y=.14-pointerY*.04;
    });
    mouth.scale.y=mode==="speaking"?.11+Math.abs(Math.sin(time*14))*.14:.04;
    smile.visible=mode!=="speaking"&&mode!=="thinking";
    ring.material.opacity=mode==="listening"?.48:mode==="thinking"?.35:.27;
    renderer.render(scene,camera);request();
  }
  host.classList.add("robo-rendering");
  host.classList.remove("robo-fallback");
  request();
  return {
    setMode(value){mode=String(value||"idle");host.dataset.robotState=mode;request();},
    setEnergy(value){energy=Math.min(1,Math.max(0,Number(value)||0));},
    setPaused(value){paused=Boolean(value);if(paused){cancelAnimationFrame(frameId);frameId=0;}else request();},
    destroy(){
      active=false;cancelAnimationFrame(frameId);ro.disconnect();io.disconnect();
      host.removeEventListener("pointermove",onPointer);
      document.removeEventListener("visibilitychange",onVisibility);
      document.removeEventListener("notewave:motion-change",onMotion);
      const geo=new Set(),mats=new Set();
      scene.traverse(object=>{
        if(object.geometry)geo.add(object.geometry);
        if(object.material){const values=Array.isArray(object.material)?object.material:[object.material];values.forEach(m=>mats.add(m));}
      });
      geo.forEach(x=>x.dispose());mats.forEach(x=>x.dispose());renderer.dispose();
      host.classList.remove("robo-rendering");
    }
  };
}
