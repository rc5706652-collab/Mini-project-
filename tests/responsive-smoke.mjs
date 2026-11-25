import assert from "node:assert/strict";
import {startStaticServer} from "./static-server.mjs";
import {seedProfile} from "./profile-fixture.mjs";
import {chromium,webkit} from "playwright";

// Responsive UI regression suite. WebKit approximates Safari rendering on CI;
// actual iPhone and Android hardware performance must still be tested separately.
const PORT=8766,root="http://127.0.0.1:"+PORT;
const server=await startStaticServer(PORT);
const sample="Renewable energy uses solar panels and wind turbines to generate electricity. The engineering class studied the energy conversion process and battery storage. Students must submit the solar energy research report by Friday. The teacher explained that solar panels convert sunlight into electrical energy. The prototype demonstration measured twenty five watts during the experiment. Battery storage allows students to compare power output over several sessions.";
let chromiumBrowser,webkitBrowser;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function ready(){
 for(let n=0;n<50;n++){
  try{if((await fetch(root)).ok)return;}catch{}
  await sleep(250);
 }
 throw Error("Could not start static UI preview");
}
async function scenario(browser,width,height,{ios=false,landscape=false}={}){
 const page=await browser.newPage({viewport:{width,height},isMobile:width<730,hasTouch:width<730,deviceScaleFactor:Math.min(2,width<730?2:1),reducedMotion:"reduce"});
 const crashes=[];
 page.on("pageerror",err=>crashes.push(err.message));
 try{
  if(width>=730)await page.mouse.move(Math.floor(width/2),Math.floor(height/2));
  await seedProfile(page);
 await page.goto(root,{waitUntil:"domcontentloaded"});
  await page.locator("#nw-command-open").waitFor({state:"visible",timeout:9000});
  assert.equal(await page.locator("html").getAttribute("data-motion"),"reduced");
  assert.ok(await page.locator("#hero-title").isVisible());
  const centerpiece=await page.evaluate(()=>{
   const hero=document.querySelector(".hero"),stage=document.querySelector("#orb-stage"),core=document.querySelector(".knowledge-assembly");
   const h=hero.getBoundingClientRect(),s=stage.getBoundingClientRect(),c=core.getBoundingClientRect();
   return {heroCenter:h.x+h.width/2,coreCenter:c.x+c.width/2,stageWidth:s.width,heroWidth:h.width,stageHeight:s.height,coreHeight:c.height,background:getComputedStyle(stage).backgroundColor,shadows:getComputedStyle(stage).boxShadow,chips:stage.querySelectorAll(".float-chip").length,animation:getComputedStyle(core).animationName};
  });
  assert.ok(Math.abs(centerpiece.coreCenter-centerpiece.heroCenter)<3,"Sculpture must be horizontally centered");
  assert.ok(centerpiece.stageWidth>=centerpiece.heroWidth-3,"Scene must span the hero width");
  assert.ok(centerpiece.coreHeight<=centerpiece.stageHeight+3,"Sculpture must fit its scene");
  assert.equal(centerpiece.background,"rgba(0, 0, 0, 0)");
  assert.equal(centerpiece.shadows,"none");
  assert.equal(centerpiece.chips,0);
  assert.equal(centerpiece.animation,"none");
  const panel=page.locator("#create-panel");
  assert.equal(await panel.isVisible(),false);
  assert.equal(await page.locator("#pip-chat").isVisible(),false);
  assert.equal(await page.locator("#workspace-sidebar").getAttribute("data-open"),"false");
  if(width>940&&await page.evaluate(()=>matchMedia("(hover: hover) and (pointer: fine)").matches)){
   await page.mouse.move(Math.floor(width/2),150);await page.mouse.move(Math.floor(width/2)+10,150);await page.mouse.move(1,120,{steps:5});
   await page.waitForFunction(()=>document.getElementById("workspace-sidebar").dataset.open==="true");
   await page.mouse.move(120,120);await page.mouse.move(width-20,120);
   await page.waitForFunction(()=>document.getElementById("workspace-sidebar").dataset.open==="false");
  }
  await page.locator("#home-start").click();assert.ok(await panel.isVisible());
  assert.equal(await page.locator("#home-view").isVisible(),false);
  await page.locator("#workspace-menu").click();await page.locator("#nav-chat").click();
  assert.ok(await page.locator("#pip-chat").isVisible());assert.equal(await panel.isVisible(),false);
  await page.goBack();await panel.waitFor({state:"visible"});
  await page.goForward();await page.locator("#pip-chat").waitFor({state:"visible"});
  await page.goBack();await panel.waitFor({state:"visible"});

  // Navigation: bottom dock on touch screens, command palette everywhere.
  if(width<=760||landscape){
   const dock=page.locator("#nw-dock");
   assert.ok(await dock.isVisible(),"Mobile dock not visible: "+width);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const size=await page.locator("#nw-dock-library").boundingBox();
   assert.ok(size.height>=43.5,"Mobile dock target measured "+size.height+" CSS pixels (expected ≥44, allowing 0.5px rounding)");
   await page.locator("#nw-dock-library").click();
   assert.ok(await page.locator("#saved-panel").isVisible());
   await page.locator("#nw-dock-studio").click();
   assert.ok(await panel.isVisible());
  }
  await page.locator("#nw-command-open").click();
  assert.ok(await page.locator("#nw-command-palette").isVisible());
  await page.locator("#nw-command-query").fill("library");
  assert.ok((await page.locator("#nw-palette-list button").count())>=1);
  await page.locator(".nw-palette-close").click();
  assert.equal(await page.locator("#nw-command-palette").isVisible(),false);

  await page.locator("#text-tab").click();
  await page.locator("#pasted").fill(sample);
  await page.locator("#generate").click();
  await page.locator("#results").waitFor({state:"visible",timeout:12000});
  assert.ok((await page.locator("#summary").innerText()).length>30);
  await page.locator("#quiz-tab").waitFor({state:"attached",timeout:9000});
  await page.locator("#quiz-tab").click();
  assert.ok(await page.locator("#quiz-panel").isVisible());
  await page.locator("#galaxy-tab").click();
  assert.ok(await page.locator("#galaxy-panel").isVisible());
  assert.ok((await page.locator(".galaxy-node").count())>=3);
  // Studio navigation must preserve an unsaved active note; only "New" clears it.
  if(width<=760&&!landscape){
   await page.locator("#nw-dock-library").click();
   assert.ok(await page.locator("#saved-panel").isVisible());
   await page.locator("#nw-dock-studio").click();
   assert.ok(await page.locator("#results").isVisible());
   assert.ok((await page.locator("#editor").inputValue()).includes("Renewable energy"));
  }
  // Layout must never scroll sideways at any supported width.
  const metrics=await page.evaluate(()=>({
   viewport:document.documentElement.clientWidth,
   scrollWidth:document.documentElement.scrollWidth,
   bodyWidth:document.body.getBoundingClientRect().width,
   inputFont:parseFloat(getComputedStyle(document.querySelector("#pasted")).fontSize),
   safeArea:getComputedStyle(document.querySelector(".nw-dock")).paddingBottom
  }));
  assert.ok(metrics.scrollWidth<=metrics.viewport+3,"Horizontal overflow "+width+"x"+height+": "+JSON.stringify(metrics));
  if(width<730)assert.ok(metrics.inputFont>=16,"iOS/mobile input text smaller than 16px: "+JSON.stringify(metrics));
  assert.deepEqual(crashes,[],"JavaScript exceptions on "+(ios?"WebKit":"Chromium")+" "+width+"x"+height);
  console.log("PASS",ios?"WebKit":"Chromium",width+"x"+height,landscape?"landscape":"portrait/desktop");
 }finally{await page.close();}
}
try{
 await ready();
 chromiumBrowser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 for(const [width,height] of [[320,740],[375,812],[390,844],[430,932],[768,1024],[1024,768],[1440,900],[1920,1080]]){
  await scenario(chromiumBrowser,width,height);
 }
 await scenario(chromiumBrowser,844,390,{landscape:true});
 // Linux WebKit checks the Safari layout/JS engine; true iOS remains manual QA.
 webkitBrowser=await webkit.launch({headless:true});
 await scenario(webkitBrowser,390,844,{ios:true});
 await scenario(webkitBrowser,1280,800,{ios:true});
 console.log("PASS enterprise frontend: 11 responsive desktop/tablet/mobile/WebKit scenarios");
}finally{
 await chromiumBrowser?.close();
 await webkitBrowser?.close();
 await new Promise(resolve=>server.close(resolve));
}
