// Particle Alchemy — a GPU-batched 3D transition from an audio orb,
// through dispersed sound particles, into a readable "NOTES READY" point cloud.
// This renderer is loaded only after Generate is pressed and is disposed afterward.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js";
import { particleBudget, fibonacciSphere, scatteredCloud, letterCloud, blendCloud, easing } from "./alchemy-shapes.js";

export function createParticleAlchemy(host) {
  const canvas=host.querySelector("canvas");
  if(!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return { start(){},setProgress(){},complete(){return Promise.resolve();},destroy(){} };
  }
  const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);
  const saveData=Boolean(navigator.connection?.saveData);
  const count=particleBudget(window.innerWidth,navigator.deviceMemory,saveData);
  let renderer;
  try{
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:"low-power"});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,window.innerWidth<600?1:1.35));
  }catch{
    host.classList.add("alchemy-fallback");
    return {start(){},setProgress(){},complete(){return Promise.resolve();},destroy(){}};
  }
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,Math.max(1,width/height),.1,100);
  camera.position.z=8.5;
  renderer.setClearColor(0x000000,0);
  host.classList.add("alchemy-rendering");
  const geometry=new THREE.BufferGeometry();
  const sphere=fibonacciSphere(count),scatter=scatteredCloud(count);
  const position=new Float32Array(sphere);
  const colors=new Float32Array(count*3);
  const violet=new THREE.Color(0x9780ff), cyan=new THREE.Color(0x67d8ff),white=new THREE.Color(0xe6e8ff);
  for(let i=0;i<count;i++){
    const mix=(Math.sin(i*.073)+1)*.5;
    const col=i%13===0?white:(i%2===0?violet:cyan);
    colors[i*3]=col.r*(.8+mix*.2);
    colors[i*3+1]=col.g*(.8+mix*.2);
    colors[i*3+2]=col.b*(.8+mix*.2);
  }
  geometry.setAttribute("position",new THREE.BufferAttribute(position,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("color",new THREE.BufferAttribute(colors,3));
  const material=new THREE.ShaderMaterial({
    uniforms:{uSize:{value:window.innerWidth<600?14:17},uAlpha:{value:1}},
    vertexShader: [
      "varying vec3 vColor;",
      "uniform float uSize;",
      "void main(){",
      "  vColor=color;",
      "  vec4 mv=modelViewMatrix*vec4(position,1.0);",
      "  gl_PointSize=clamp(uSize*(7.0/-mv.z),1.7,12.0);",
      "  gl_Position=projectionMatrix*mv;",
      "}"
    ].join("\n"),
    fragmentShader: [
      "varying vec3 vColor;",
      "uniform float uAlpha;",
      "void main(){",
      "  float distanceToCenter=length(gl_PointCoord-vec2(.5));",
      "  float circle=1.0-smoothstep(.24,.5,distanceToCenter);",
      "  gl_FragColor=vec4(vColor,circle*uAlpha);",
      "}"
    ].join("\n"),
    transparent:true,depthWrite:false,vertexColors:true,blending:THREE.AdditiveBlending
  });
  const points=new THREE.Points(geometry,material);
  scene.add(points);
  const context=document.createElement("canvas");
  context.width=700;context.height=160;
  const ctx=context.getContext("2d",{willReadFrequently:true});
  let letters=scatter;
  if(ctx){
    ctx.clearRect(0,0,context.width,context.height);
    ctx.fillStyle="#fff";
    ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.font="900 90px Arial, sans-serif";
    ctx.fillText("NOTES READY",context.width/2,context.height/2,660);
    letters=letterCloud(ctx.getImageData(0,0,context.width,context.height).data,context.width,context.height,count);
  }
  const origin=new Float32Array(count*3);
  let alive=true,raf=0,phase="idle",phaseStarted=0,progress=.2,lastFrame=0;
  let finishResolve=null,finishTimer=0;
  let resizeObserver=null,visibility=true;
  function resize(){
    if(!alive)return;
    const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
    camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
  }
  resizeObserver=new ResizeObserver(resize);
  resizeObserver.observe(host);resize();
  const onVisibility=()=>{visibility=!document.hidden;if(visibility)request();};
  document.addEventListener("visibilitychange",onVisibility);
  function request(){if(alive&&visibility&&!raf)raf=requestAnimationFrame(frame);}
  function frame(timestamp){
    raf=0;
    if(!alive||!visibility)return;
    if(lastFrame&&timestamp-lastFrame<(window.innerWidth<700?32:20)){request();return;}
    lastFrame=timestamp;
    if(phase==="processing"){
      // The original sphere visibly breaks apart into a suspended, rotating cloud.
      const elapsed=timestamp-phaseStarted;
      const openness=Math.min(.92,Math.max(.05,elapsed/1700*.92));
      const drift=.04*Math.sin(elapsed*.0015);
      blendCloud(sphere,scatter,openness,position);
      for(let i=0;i<count;i++){
        position[i*3]+=.035*Math.sin(timestamp*.0014+i*.17);
        position[i*3+1]+=drift;
      }
      points.rotation.y=Math.sin(timestamp*.00019)*.16;
      material.uniforms.uAlpha.value=.87+.13*Math.sin(timestamp*.002);
    }else if(phase==="gather"){
      const t=Math.min(1,(timestamp-phaseStarted)/1200);
      blendCloud(origin,letters,t,position);
      points.rotation.y=(1-easing(t))*.13;
      material.uniforms.uAlpha.value=1;
      if(t>=1)finish();
    }else if(phase==="complete"){
      // The formed text settles without continuous GPU rendering.
      points.rotation.y=0;
    }
    geometry.attributes.position.needsUpdate=true;
    renderer.render(scene,camera);
    if(phase!=="complete")request();
  }
  function finish(){
    phase="complete";
    clearTimeout(finishTimer);
    if(finishResolve){finishResolve();finishResolve=null;}
  }
  return {
    start(){
      phase="processing";
      phaseStarted=performance.now();
      material.uniforms.uAlpha.value=1;
      request();
    },
    setProgress(value){
      progress=Math.max(0,Math.min(1,Number(value)||0));
      // Progress is intentionally not used as a time estimate; transcription speed varies.
    },
    complete(){
      if(!alive)return Promise.resolve();
      if(phase==="complete")return Promise.resolve();
      origin.set(position);
      phase="gather";phaseStarted=performance.now();
      return new Promise(resolve=>{
        finishResolve=resolve;
        // Guaranteed completion when the tab is hidden or rendering is throttled.
        finishTimer=setTimeout(finish,1850);
        request();
      });
    },
    destroy(){
      alive=false;
      cancelAnimationFrame(raf);clearTimeout(finishTimer);
      if(finishResolve){finishResolve();finishResolve=null;}
      resizeObserver?.disconnect();
      document.removeEventListener("visibilitychange",onVisibility);
      host.classList.remove("alchemy-rendering");
      geometry.dispose();material.dispose();renderer.dispose();
      renderer.forceContextLoss();
    }
  };
}
