import test from "node:test";
import assert from "node:assert/strict";
import {particleBudget,fibonacciSphere,scatteredCloud,letterCloud,blendCloud,easing} from "../public/alchemy-shapes.js";

test("particle budget favors battery/data constrained devices",()=>{
 assert.equal(particleBudget(1200,8,false),2200);
 assert.equal(particleBudget(390,8,false),720);
 assert.equal(particleBudget(1200,2,false),440);
 assert.equal(particleBudget(1200,8,true),440);
});
test("sphere and disintegrated points are finite and correctly sized",()=>{
 for(const count of [0,100,440,2200]){
  const sphere=fibonacciSphere(count),scatter=scatteredCloud(count);
  assert.equal(sphere.length,count*3);
  assert.equal(scatter.length,count*3);
  assert.ok([...sphere,...scatter].every(Number.isFinite));
  assert.deepEqual(Array.from(blendCloud(sphere,scatter,0)),Array.from(sphere));
  assert.deepEqual(Array.from(blendCloud(sphere,scatter,1)),Array.from(scatter));
 }
});
test("rasterized letters map safely to target particle positions",()=>{
 const rgba=new Uint8ClampedArray(24*12*4);
 for(let y=3;y<9;y++)for(let x=4;x<20;x++)rgba[(y*24+x)*4+3]=255;
 const letters=letterCloud(rgba,24,12,300);
 assert.equal(letters.length,900);
 assert.ok([...letters].every(Number.isFinite));
 assert.ok(letters.some(x=>x!==0));
 assert.ok(Math.max(...letters)<3.1);
 assert.ok(Math.min(...letters)>-3.1);
});
test("animation blends are bounded and reject mismatched arrays",()=>{
 assert.equal(easing(-1),0);assert.equal(easing(1),1);
 assert.equal(easing(.5),.5);
 assert.throws(()=>blendCloud(new Float32Array(3),new Float32Array(4),.5),/equal lengths/);
});
