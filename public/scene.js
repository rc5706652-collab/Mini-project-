// Genuine interactive WebGL sound sculpture. Lazy-loaded, with DOM/CSS fallback.
// Geometry budget and pixel ratio are capped for mobile devices.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js";

export function createSonicCore(host) {
  const canvas = host.querySelector("canvas");
  if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduced") {
    return { setMode() {}, setEnergy() {}, setPaused() {}, destroy() {} };
  }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  } catch {
    host.classList.add("orb-fallback");
    return { setMode() {}, setEnergy() {}, setPaused() {}, destroy() {} };
  }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
  camera.position.z = 7.5;
  renderer.setClearColor(0x000000, 0);
  const maxDpr = () => Number(document.documentElement.style.getPropertyValue("--nw-max-dpr")) || (innerWidth < 700 ? 1.15 : 1.5);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr()));
  const group = new THREE.Group();
  scene.add(group);
  const uniform = { uTime: { value: 0 }, uEnergy: { value: 0.12 }, uMode: { value: 0 } };
  const shader = new THREE.ShaderMaterial({
    uniforms: uniform,
    vertexShader: [
      "uniform float uTime; uniform float uEnergy; varying vec3 vNormal; varying vec3 vPosition;",
      "void main(){",
      "float a = sin(position.x*5.0+uTime*1.25)*sin(position.y*4.4-uTime*.9)*.065;",
      "float b = sin(position.z*8.0-uTime*.7)*.038;",
      "vec3 p = position + normal*(a+b)*(1.0+uEnergy*2.5);",
      "vNormal=normalize(normalMatrix*normal); vPosition=p;",
      "gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);",
      "}"
    ].join("\n"),
    fragmentShader: [
      "uniform float uTime; uniform float uEnergy; uniform float uMode;",
      "varying vec3 vNormal; varying vec3 vPosition;",
      "void main(){",
      "float fresnel=pow(1.0-abs(dot(normalize(vNormal),vec3(0.0,0.0,1.0))),2.1);",
      "float field=sin(vPosition.y*5.0+uTime*.65)*.5+.5;",
      "vec3 violet=vec3(.35,.26,.95); vec3 aqua=vec3(.12,.75,.99);",
      "vec3 c=mix(violet,aqua,clamp(field*.8+uEnergy*.18,0.0,1.0));",
      "c=c*(.66+fresnel*.92)+vec3(.16,.13,.29)*pow(1.0-field,2.0);",
      "c+=vec3(.13,.28,.38)*pow(1.0-abs(vPosition.y),6.0);",
      "gl_FragColor=vec4(c, .93);",
      "}"
    ].join("\n"),
    transparent: true
  });
  const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 5), shader);
  group.add(sphere);

  const wire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.392, 3),
    new THREE.MeshBasicMaterial({ color: 0x8ac9ff, wireframe: true, transparent: true, opacity: .11, depthWrite: false })
  );
  group.add(wire);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.62, 30, 20),
    new THREE.MeshBasicMaterial({ color: 0x8274ff, side: THREE.BackSide, transparent: true, opacity: .075, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  group.add(halo);

  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.9 + i*.24, .011, 6, 150),
      new THREE.MeshBasicMaterial({ color: i===1 ? 0x6bdcf4 : 0x918aff, transparent: true, opacity: .5-i*.11, depthWrite: false })
    );
    ring.rotation.set(.7+i*.42, .34+i*.6, i*.6);
    group.add(ring); rings.push(ring);
  }
  const amount = innerWidth < 700 ? 115 : 230;
  const positions = new Float32Array(amount*3);
  for (let i=0;i<amount;i++){
    const a=i*2.399963, radius=2.0+Math.sqrt((i+.5)/amount)*1.25, y=Math.sin(i*1.31)*1.8;
    positions.set([Math.cos(a)*radius, y, Math.sin(a)*radius*.55],i*3);
  }
  const particlesGeometry = new THREE.BufferGeometry();
  particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions,3));
  const particles = new THREE.Points(particlesGeometry,
    new THREE.PointsMaterial({ color: 0x9acfff, size: .027, transparent:true, opacity:.75, sizeAttenuation:true }));
  group.add(particles);

  let mode="idle", energy=.12, current=.12, active=true, visible=true, paused=false, motionPaused=false, raf=0, pointerX=0, pointerY=0, lastFrame=0;
  let idleFps=innerWidth<700?24:40,activeFps=innerWidth<700?30:60;
  const clock = new THREE.Clock();
  function resize() {
    const w=Math.max(1,host.clientWidth), h=Math.max(1,host.clientHeight);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,maxDpr()));
    renderer.setSize(w,h,false);
  }
  const observer=new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const intersection=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;if(visible)request();});
  intersection.observe(host);
  const onVisibility=()=>{if(!document.hidden)request();};
  const onPointer=e=>{
    const rect=host.getBoundingClientRect();
    pointerX=(e.clientX-rect.left)/Math.max(1,rect.width)-.5;
    pointerY=(e.clientY-rect.top)/Math.max(1,rect.height)-.5;
  };
  host.addEventListener("pointermove",onPointer,{passive:true});
  document.addEventListener("visibilitychange",onVisibility);
  const onMotionChange = event => {
    const settings=event.detail||{};
    motionPaused=Boolean(settings.reduced);
    if(Number.isFinite(settings.idleFps))idleFps=settings.idleFps;
    if(Number.isFinite(settings.activeFps))activeFps=settings.activeFps;
    if(motionPaused){cancelAnimationFrame(raf);raf=0;}
    else request();
  };
  document.addEventListener("notewave:motion-change",onMotionChange);
  function request(){if(active && visible && !paused && !motionPaused && !document.hidden && !raf)raf=requestAnimationFrame(frame);}
  function frame(timestamp){
    raf=0;
    if(!active || !visible || paused || motionPaused || document.hidden)return;
    const engaged=mode==="listening"||mode==="processing";
    const fps=engaged?activeFps:idleFps;
    if(lastFrame && timestamp-lastFrame<1000/Math.max(8,fps)){request();return;}
    lastFrame=timestamp;
    const t=clock.getElapsedTime();
    const baseline=mode==="processing"?.55:mode==="listening"?.27:mode==="complete"?.42:.12;
    current+=(Math.max(energy,baseline)-current)*.07;
    uniform.uEnergy.value=current;
    uniform.uTime.value=t;
    uniform.uMode.value=mode==="processing"?1:0;
    sphere.rotation.y=t*.13+pointerX*.27;
    sphere.rotation.x=Math.sin(t*.16)*.15-pointerY*.18;
    wire.rotation.y=-t*.08;
    rings.forEach((r,i)=>{r.rotation.z+=.0013*(i%2?1:-1);r.rotation.y+=.0006;});
    particles.rotation.y=t*.02;
    group.scale.setScalar(1+Math.min(.08,current*.07));
    renderer.render(scene,camera);
    request();
  }
  request();
  return {
    setMode(value){mode=value;host.dataset.mode=value;},
    setEnergy(value){energy=Math.max(0,Math.min(1,Number(value)||0));},
    setPaused(value){paused=Boolean(value);if(paused){cancelAnimationFrame(raf);raf=0;}else request();},
    destroy(){
      active=false;cancelAnimationFrame(raf);observer.disconnect();intersection.disconnect();
      host.removeEventListener("pointermove",onPointer);
      document.removeEventListener("visibilitychange",onVisibility);
      document.removeEventListener("notewave:motion-change",onMotionChange);
      sphere.geometry.dispose();shader.dispose();wire.geometry.dispose();wire.material.dispose();halo.geometry.dispose();halo.material.dispose();
      rings.forEach(r=>{r.geometry.dispose();r.material.dispose();});particles.geometry.dispose();particles.material.dispose();renderer.dispose();
    }
  };
}
