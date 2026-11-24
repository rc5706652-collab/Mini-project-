import assert from "node:assert/strict";
import {startStaticServer} from "./static-server.mjs";
import {chromium,webkit} from "playwright";
const PORT=8791,base="http://127.0.0.1:"+PORT;
const server=await startStaticServer(PORT);
const lecture="Solar panels convert sunlight into electricity. Students must submit the solar energy project by Friday. The engineering team measured 25 watts. The teacher explained renewable energy systems in the lecture.";
let chrome,safari;
async function fakeAI(page){
 await page.addInitScript(()=>{
  const OriginalWorker=window.Worker;
  window.Worker=function(url,options){
   const path=String(url);
   if(path.includes("tutor-worker.js")){
    const w={onmessage:null,onerror:null,terminate(){}};
    w.postMessage=({requestId})=>setTimeout(()=>w.onmessage?.({data:{type:"result",requestId,answer:"Solar panels turn sunlight into electrical energy."}}),90);
    return w;
   }
   if(path.includes("worker.js") && !path.includes("tutor-worker") && !path.includes("semantic")){
    const w={onmessage:null,onerror:null,terminate(){}};
    w.postMessage=()=>setTimeout(()=>w.onmessage?.({data:{type:"complete",text:"What is solar energy?",segments:[]}}),100);
    return w;
   }
   return new OriginalWorker(url,options);
  };
 });
}
async function check(browser,width,height,{isWebkit=false}={}){
 const page=await browser.newPage({viewport:{width,height},isMobile:width<700,hasTouch:width<700,reducedMotion:"reduce"});
 const crashes=[];
 page.on("pageerror",e=>crashes.push(e.message));
 try{
  await fakeAI(page);
  await page.goto(base,{waitUntil:"domcontentloaded"});
  await page.locator("#robo-launcher").waitFor({state:"visible",timeout:10000});
  assert.ok(await page.locator("#hero-title").isVisible());
  assert.ok(await page.locator(".robo-css-fallback").isVisible());
  assert.equal(await page.locator("#robo-chat").isVisible(),false);
  await page.locator("#robo-open-hero").click();
  assert.ok(await page.locator("#robo-chat").isVisible());
  await page.locator("#robo-speak").uncheck();
  await page.locator("#robo-chat-input").fill("hello");
  await page.locator("#robo-send").click();
  assert.ok((await page.locator("#robo-messages").innerText()).includes("What shall we learn"));
  await page.locator("#robo-chat-input").fill("What is electricity?");
  await page.locator("#robo-send").click();
  await page.locator(".robo-message.robo-assistant").last().locator("p").getByText("Solar panels turn sunlight into electrical energy.").waitFor({timeout:8000});
  await page.locator("#robo-close").click();
  assert.equal(await page.locator("#robo-chat").isVisible(),false);

  await page.locator("#text-tab").click();
  await page.locator("#pasted").fill(lecture);
  await page.locator("#generate").click();
  await page.locator("#results").waitFor({state:"visible",timeout:9000});
  await page.locator("#robo-launcher").click();
  await page.locator("#robo-answer-mode").selectOption("notes");
  await page.locator("#robo-chat-input").fill("What do solar panels convert?");
  await page.locator("#robo-send").click();
  const evidence=page.locator(".robo-sources");
  await evidence.last().waitFor({state:"attached",timeout:8000});
  assert.ok((await evidence.last().innerText()).includes("Source evidence"));
  await page.locator("#robo-chat-input").fill("Open AI Studio");
  await page.locator("#robo-send").click();
  assert.ok((await page.locator("#robo-messages").innerText()).includes("Opening AI Studio"));
  assert.ok(await page.locator("#results").isVisible());
  const metrics=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(metrics.scroll<=metrics.width+3,"Horizontal overflow "+JSON.stringify(metrics));
  assert.deepEqual(crashes,[]);
  console.log("PASS Novi",isWebkit?"WebKit":"Chromium",width+"x"+height);
 }finally{await page.close();}
}
try{
 chrome=await chromium.launch({headless:true,args:["--no-sandbox"]});
 await check(chrome,1365,900);
 await check(chrome,390,844);
 safari=await webkit.launch({headless:true});
 await check(safari,390,844,{isWebkit:true});
 console.log("PASS Novi chatbot, transcript grounding, commands, robot fallback and mobile/Safari layout");
}finally{
 await chrome?.close();await safari?.close();
 await new Promise(resolve=>server.close(resolve));
}
