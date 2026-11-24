import assert from "node:assert/strict";
import {chromium,webkit} from "playwright";
import {startStaticServer} from "./static-server.mjs";
const PORT=8774,url="http://127.0.0.1:"+PORT;
const server=await startStaticServer(PORT);
const transcript="Solar panels convert sunlight into electricity during clear days. Engineers measured electrical voltage from a small solar panel prototype. Renewable energy technologies can reduce dependence on fossil fuels. Students should submit the solar energy project by Friday. Energy storage batteries help save electricity for later use. Wind turbines generate electricity from moving air. A solar inverter changes direct current to alternating current. Scientists use controlled experiments to evaluate energy conversion efficiency.";
function wavFixture(){
 const frames=16000,b=Buffer.alloc(44+frames*2);b.write("RIFF",0);b.writeUInt32LE(36+frames*2,4);
 b.write("WAVE",8);b.write("fmt ",12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);
 b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);
 b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write("data",36);b.writeUInt32LE(frames*2,40);
 for(let i=0;i<frames;i++)b.writeInt16LE(Math.round(Math.sin(i*.05)*1500),44+2*i);
 return b;
}
let chrome,safari;
async function quizScenario(browser,width,height){
 const page=await browser.newPage({viewport:{width,height},isMobile:width<700,hasTouch:width<700,reducedMotion:"reduce"});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto(url,{waitUntil:"domcontentloaded"});
  assert.match(await page.locator("#hero-title").innerText(),/Loisel/);
  await page.locator("#pip-chat-title").waitFor({state:"visible",timeout:8000});
  assert.match(await page.locator("#pip-chat-title").innerText(),/Loisel/);
  const img=page.locator(".loisel-hero-photo");
  assert.ok(await img.isVisible());
  assert.ok(await img.evaluate(el=>el.complete&&el.naturalWidth>=200),"Loisel portrait missing or invalid");
  assert.equal(await page.locator(".pip-css").count(),0,"old generated robot still rendered");
  if(width<700){await page.locator("#nw-dock-quiz-studio").click();}
  else{await page.locator("#nav-quiz").click();}
  assert.ok(await page.locator("#quiz-hub-view").isVisible());
  await page.locator("#quiz-lecture").selectOption("paste");
  await page.locator("#quiz-lecture-text").fill(transcript);
  await page.locator("#quiz-build").click();
  await page.locator(".quiz-hub-question").first().waitFor({state:"visible",timeout:8000});
  assert.ok(await page.locator(".quiz-hub-question").count()>=2);
  await page.locator(".quiz-hub-question").first().locator("input[type='radio']").first().check();
  await page.locator("#quiz-submit").click();
  await page.locator("#quiz-hub-results h3").waitFor({state:"visible"});
  assert.ok(await page.locator(".quiz-hub-review").count()>=2);
  assert.ok(await page.locator(".quiz-video-link").count()>=1,"weak topic should link to learning video search");
  const urlString=await page.locator(".quiz-video-link").first().getAttribute("href");
  assert.ok(new URL(urlString).hostname==="www.youtube.com");
  const w=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
  assert.ok(w.scroll<=w.viewport+3,"Horizontal overflow: "+JSON.stringify(w));
  assert.deepEqual(errors,[],"Unexpected errors "+errors.join("; "));
  console.log("PASS",browser===safari?"WebKit":"Chromium",width+"x"+height,"Loisel portrait, quiz, weak-topic and videos");
 }finally{await page.close();}
}
async function translatedAudioScenario(browser){
 const page=await browser.newPage({viewport:{width:1280,height:830},reducedMotion:"reduce"});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.addInitScript(()=>{
  globalThis.Worker=class FakeWorker{
   constructor(path){this.path=String(path);this.onmessage=null;this.cancelled=false;}
   postMessage(message){
    if(message.type==="transcribe"){
     globalThis.__speechRequest={language:message.language,output:message.output};
     setTimeout(()=>{
      if(this.cancelled)return;
      const text="Solar panels produce electricity from sunlight. Energy storage batteries save power for later use. Wind turbines produce electricity from moving air.";
      this.onmessage?.({data:{type:"complete",text,segments:[{text,start:0,end:1}]}});
     },100);
    }
    if(message.type==="translate"){
     globalThis.__translationRequest={sourceCode:message.sourceCode,targetCode:message.targetCode};
     setTimeout(()=>{
      if(this.cancelled)return;
      this.onmessage?.({data:{type:"complete",requestId:message.requestId,text:"சூரிய சக்தி மின்சாரத்தை உருவாக்குகிறது. காற்றாலை மின்சாரத்தை உருவாக்குகிறது."}});
     },90);
    }
   }
   terminate(){this.cancelled=true;}
  };
 });
 try{
  await page.goto(url,{waitUntil:"domcontentloaded"});
  await page.locator("#audio-language").selectOption("hi");
  await page.locator("#audio-output").selectOption("ta");
  await page.locator("#file").setInputFiles({name:"lecture.wav",mimeType:"audio/wav",buffer:wavFixture()});
  await page.locator("#generate").click();
  await page.locator("#results").waitFor({state:"visible",timeout:12000});
  assert.deepEqual(await page.evaluate(()=>window.__speechRequest),{language:"hi",output:"original"});
  assert.deepEqual(await page.evaluate(()=>window.__translationRequest),{sourceCode:"hin_Deva",targetCode:"tam_Taml"});
  assert.ok((await page.locator("#editor").inputValue()).includes("சூரிய"));
  assert.ok(await page.locator("#source-transcript-panel").isVisible());
  assert.ok((await page.locator("#source-transcript-text").innerText()).includes("Solar panels"));
  assert.deepEqual(errors,[]);
  console.log("PASS Chromium multilingual recognition/translation worker contract and original-source retention");
 }finally{await page.close();}
}
try{
 chrome=await chromium.launch({headless:true,args:["--no-sandbox"]});
 await quizScenario(chrome,1440,900);
 await quizScenario(chrome,390,844);
 await translatedAudioScenario(chrome);
 safari=await webkit.launch({headless:true});
 await quizScenario(safari,390,844);
 console.log("PASS Loisel browser integration");
}finally{
 await chrome?.close();await safari?.close();
 await new Promise(resolve=>server.close(resolve));
}
