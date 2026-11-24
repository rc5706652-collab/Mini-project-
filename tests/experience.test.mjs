import test from "node:test";
import assert from "node:assert/strict";
import {experienceBudget,effectiveReducedMotion,tiltFromPointer,filterCommands} from "../public/experience-core.js";
test("mobile, tablet and desktop budgets cap visual cost",()=>{
 assert.equal(experienceBudget({width:390,pointerCoarse:true}).breakpoint,"compact");
 assert.equal(experienceBudget({width:768}).breakpoint,"tablet");
 assert.equal(experienceBudget({width:1440}).breakpoint,"desktop");
 assert.equal(experienceBudget({width:390,pointerCoarse:true}).enableTilt,false);
 assert.equal(experienceBudget({width:1440,pointerCoarse:false}).enableTilt,true);
 assert.equal(experienceBudget({width:390}).maxDpr<=1.15,true);
 assert.equal(experienceBudget({width:1440,deviceMemory:2}).quality,"minimal");
 assert.equal(experienceBudget({width:1440,saveData:true}).enableTilt,false);
});
test("system reduced motion is the default with explicit override",()=>{
 assert.equal(effectiveReducedMotion(true,"system"),true);
 assert.equal(effectiveReducedMotion(false,"reduce"),true);
 assert.equal(effectiveReducedMotion(true,"full"),false);
});
test("tilt math is stable and clamped",()=>{
 assert.deepEqual(tiltFromPointer(50,50,100,100),{x:0,y:0});
 const tilt=tiltFromPointer(500,-100,100,100,8);
 assert.equal(Math.abs(tilt.x)<=6,true);
 assert.equal(Math.abs(tilt.y)<=6,true);
});
test("command palette hides note-only actions until notes exist",()=>{
 assert.equal(filterCommands("galaxy",false).length,0);
 assert.equal(filterCommands("galaxy",true)[0].id,"galaxy");
 assert.equal(filterCommands("").length>=3,true);
});
