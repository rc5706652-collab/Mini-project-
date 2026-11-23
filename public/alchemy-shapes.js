// Deterministic particle layouts, independently testable without WebGL or DOM.
// All positions are in world space, not screen pixels.
function fract(v) { return v-Math.floor(v); }
function noise(index,seed=0) { return fract(Math.sin((index+1)*127.1+(seed+1)*311.7)*43758.5453123); }
export function particleBudget(viewportWidth, deviceMemory=4, saveData=false) {
  const width=Number.isFinite(viewportWidth)?viewportWidth:800;
  if(saveData || (Number.isFinite(deviceMemory)&&deviceMemory<=2))return 440;
  if(width<600)return 720;
  if(width<1000)return 1260;
  return 2200;
}
export function fibonacciSphere(count) {
  const n=Math.max(0,Math.floor(count));
  const out=new Float32Array(n*3);
  for(let i=0;i<n;i++){
    const y=1-(2*(i+.5)/n);
    const radius=Math.sqrt(Math.max(0,1-y*y));
    const angle=i*Math.PI*(3-Math.sqrt(5));
    const drift=.86+.12*noise(i,15);
    out[i*3]=Math.cos(angle)*radius*drift*1.02;
    out[i*3+1]=y*drift;
    out[i*3+2]=Math.sin(angle)*radius*drift;
  }
  return out;
}
export function scatteredCloud(count) {
  const n=Math.max(0,Math.floor(count));
  const out=new Float32Array(n*3);
  for(let i=0;i<n;i++){
    const t=(i+.5)/Math.max(1,n);
    const theta=i*2.399963229728653+noise(i,3)*.3;
    const distance=1.3+Math.sqrt(t)*2.2;
    out[i*3]=Math.cos(theta)*distance+(.5-noise(i,4))*.38;
    out[i*3+1]=Math.sin(theta)*distance*.55+(.5-noise(i,5))*.7;
    out[i*3+2]=(noise(i,6)-.5)*2.8;
  }
  return out;
}
/** Maps a raster alpha channel to 3D points spelling NOTES READY. */
export function letterCloud(alpha,width,height,count) {
  const w=Math.max(1,Math.floor(width)),h=Math.max(1,Math.floor(height));
  const n=Math.max(0,Math.floor(count)),out=new Float32Array(n*3),pixels=[];
  for(let y=0;y<h;y+=2){
    for(let x=0;x<w;x+=2){
      if(alpha[(y*w+x)*4+3]>110)pixels.push([x,y]);
    }
  }
  if(!pixels.length)return out;
  for(let i=0;i<n;i++){
    const point=pixels[(i*17+Math.floor(noise(i,8)*pixels.length))%pixels.length];
    out[i*3]=(point[0]/w-.5)*5.4;
    out[i*3+1]=(.5-point[1]/h)*1.7;
    out[i*3+2]=(noise(i,9)-.5)*.16;
  }
  return out;
}
export function easing(progress) {
  const t=Math.min(1,Math.max(0,Number(progress)||0));
  return t*t*(3-2*t);
}
export function blendCloud(a,b,progress,out) {
  const t=easing(progress),dest=out??new Float32Array(a.length);
  if(a.length!==b.length||dest.length!==a.length)throw Error("Particle arrays must have equal lengths");
  for(let i=0;i<a.length;i++)dest[i]=a[i]+(b[i]-a[i])*t;
  return dest;
}
