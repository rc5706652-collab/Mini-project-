import assert from "node:assert/strict";
import {chromium,webkit} from "playwright";
import {startStaticServer} from "./static-server.mjs";
const PORT=8771,root="http://127.0.0.1:"+PORT;
const server=await startStaticServer(PORT);
const sample="Solar panels convert sunlight into electricity. Engineers tested a working solar panel prototype during the demonstration. Students must submit the research report by Friday. Renewable energy can reduce dependence on fossil fuels.";
async function open(browser,{width=1280,height=850,reduced=false,voice=false}={}){
 const page=await browser.newPage({viewport:{width,height},isMobile:width<720,hasTouch:width<720,reducedMotion:reduced?"reduce":"no-preference"});
 const pageErrors=[];page.on("pageerror",err=>pageErrors.push(err.message));
 await page.addInitScript(({fakeVoice})=>{
  // No model weights downloaded in CI. We test the UI/Worker contract, not model accuracy.
  class FakeWorker{
   constructor(path){this.path=String(path);this.stopped=false;this.onmessage=null;}
   postMessage(data){
    globalThis.__pipLastWorkerMessage=data;
    if(data.type==="ask"){
     setTimeout(()=>{if(!this.stopped)this.onmessage?.({data:{type:"stage",requestId:data.requestId,message:"Thinking on device"}});},10);
     setTimeout(()=>{if(!this.stopped)this.onmessage?.({data:{type:"answer",requestId:data.requestId,answer:"AI means computers learning patterns from data."}});},65);
    }
    if(data.type==="transcribe"){
     setTimeout(()=>{if(!this.stopped)this.onmessage?.({data:{type:"complete",text:"What is machine learning?",segments:[{text:"What is machine learning?",start:0,end:1}]}});},40);
    }
   }
   terminate(){this.stopped=true;}
  }
  globalThis.Worker=FakeWorker;
  if(fakeVoice){
   const bytes=new ArrayBuffer(44+16000*2),v=new DataView(bytes),w=(offset,str)=>{for(let i=0;i<str.length;i++)v.setUint8(offset+i,str.charCodeAt(i));};
   w(0,"RIFF");v.setUint32(4,36+16000*2,true);w(8,"WAVE");w(12,"fmt ");v.setUint32(16,16,true);
   v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);v.setUint32(28,32000,true);
   v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,"data");v.setUint32(40,32000,true);
   for(let i=0;i<16000;i++)v.setInt16(44+i*2,Math.round(Math.sin(i*.2)*2000),true);
   Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})}});
   globalThis.MediaRecorder=class{
    static isTypeSupported(){return false;}
    constructor(){this.state="inactive";this.mimeType="audio/wav";this.ondataavailable=null;this.onstop=null;}
    start(){this.state="recording";}
    stop(){
     if(this.state!=="recording")return;
     this.state="inactive";
     this.ondataavailable?.({data:new Blob([bytes],{type:"audio/wav"})});
     this.onstop?.();
    }
   };
  }
 },{fakeVoice:voice});
 await page.goto(root,{waitUntil:"domcontentloaded"});
 assert.ok(await page.locator("#orb-stage").isVisible());
 assert.equal(await page.locator("#pip-chat").isVisible(),false);
 await page.locator("#home-chat").click();
 await page.locator("#pip-chat").waitFor({state:"visible",timeout:10000});
 return {page,pageErrors};
}
let chrome,safari;
try{
 chrome=await chromium.launch({headless:true,args:["--no-sandbox"]});
 {
  const {page,pageErrors}=await open(chrome,{width:1440,height:900,reduced:true});
  assert.equal(await page.locator("#orb-stage").isVisible(),false);
  assert.ok((await page.locator("#pip-chat-title").innerText()).includes("Talk to Loisel"));
  assert.equal(await page.locator(".loisel-knowledge-scene").isVisible(),false);
  assert.equal(await page.locator("#loisel-buddy-toggle").count(),0);
  await page.locator("#pip-question").fill("hello");
  await page.locator("#pip-send").click();
  assert.ok((await page.locator("#pip-messages").innerText()).includes("Loisel"));
  await page.locator("#pip-question").fill("What is artificial intelligence?");
  await page.locator("#pip-send").click();
  await page.getByText("AI means computers learning patterns from data.").waitFor({timeout:6000});
  assert.equal((await page.locator("#pip-model").inputValue()),"fast");
  await page.locator("#workspace-menu").click();await page.locator("#nav-new").click();
  await page.locator("#text-tab").click();
  await page.locator("#pasted").fill(sample);
  await page.locator("#generate").click();
  await page.locator("#results").waitFor({state:"visible",timeout:10000});
  assert.equal(await page.locator("#pip-mode").inputValue(),"notes");
  await page.locator("#workspace-menu").click();await page.locator("#nav-chat").click();
  await page.locator("#pip-question").fill("What do solar panels convert?");
  await page.locator("#pip-send").click();
  await page.locator(".pip-citation").first().waitFor({timeout:7000});
  assert.match(await page.locator(".pip-citation").first().innerText(),/Solar panels/);
  await page.locator("#pip-clear").click();
  assert.equal(await page.locator(".pip-user").count(),0);
  assert.deepEqual(pageErrors,[]);
  await page.close();
 }
 {
  const {page,pageErrors}=await open(chrome,{width:390,height:844,reduced:false,voice:true});
  assert.ok(await page.locator("#pip-chat").isVisible());
  await page.locator("#pip-mic").click();
  await page.getByText(/Listening… tap the stop button/).waitFor({timeout:5000});
  assert.equal(await page.locator("#pip-mic").getAttribute("aria-pressed"),"true");
  await page.locator("#pip-mic").click();
  await page.getByText("AI means computers learning patterns from data.").waitFor({timeout:11000});
  assert.match(await page.locator("#pip-messages").innerText(),/What is machine learning/);
  const size=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
  assert.ok(size.document<=size.viewport+3,"Mobile overflow: "+JSON.stringify(size));
  await page.locator("#nav-new").evaluate(el=>el.click());
  assert.equal(await page.locator("#studio-cinematic").getAttribute("data-active"),"true");
  assert.deepEqual(pageErrors,[]);
  await page.close();
 }
 safari=await webkit.launch({headless:true});
 {
  const {page,pageErrors}=await open(safari,{width:390,height:844,reduced:true});
  await page.locator("#pip-question").fill("What is artificial intelligence?");
  await page.locator("#pip-send").click();
  await page.getByText("AI means computers learning patterns from data.").waitFor({timeout:8000});
  const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));
  assert.ok(size.scroll<=size.width+3,"WebKit mobile overflow: "+JSON.stringify(size));
  assert.deepEqual(pageErrors,[]);
  await page.close();
 }
 console.log("PASS: Pip robot, general AI chat, grounded note citations, local voice orchestration, cinematic portal, mobile WebKit");
}finally{
 await chrome?.close();await safari?.close();
 await new Promise(resolve=>server.close(resolve));
}
