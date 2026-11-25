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
  assert.equal(await page.locator("#pip-chat-title").isVisible(),false);
  const logo=page.locator(".loisel-knowledge-scene");
  assert.ok(await logo.isVisible(),"Cinematic L hero mark is missing");
  assert.equal(await page.locator(".loisel-hero-photo").count(),0,"Old full-size android image must not render");
  assert.equal(await page.locator(".pip-css").count(),0,"Old full-size generated robot must not render");
  assert.equal(await page.locator("#loisel-buddy-toggle").count(),0);
  if(width<700){await page.locator("#nw-dock-quiz-studio").click();}
  else{await page.locator("#workspace-menu").click();await page.locator("#nav-quiz").click();}
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
  console.log("PASS",browser===safari?"WebKit":"Chromium",width+"x"+height,"Loisel L emblem, mini companion, quiz, weak-topic and videos");
 }finally{await page.close();}
}
async function translatedAudioScenario(browser){
 const page=await browser.newPage({viewport:{width:1280,height:830},reducedMotion:"reduce"});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.addInitScript(()=>{
  // No local pack installed; never download NLLB weights in this path.
  globalThis.Translator=undefined;
  globalThis.__fastRequests=0;globalThis.__unexpectedWeightDownload=false;
  const originalFetch=globalThis.fetch.bind(globalThis);
  globalThis.fetch=async(input,options)=>{
   const url=String(input);
   if(url.startsWith("https://api.mymemory.translated.net/get?")){
    globalThis.__fastRequests++;
    return {ok:true,status:200,async json(){return {
     responseStatus:200,responseData:{translatedText:"சூரிய சக்தி மின்சாரத்தை உருவாக்குகிறது. காற்றாலைகள் மின்சாரத்தை உருவாக்குகின்றன. புதுப்பிக்கத்தக்க ஆற்றல் முக்கியமானது."}
    }}};
   }
   return originalFetch(input,options);
  };
  globalThis.Worker=class FakeWorker{
   constructor(path){this.path=String(path);this.onmessage=null;this.cancelled=false;}
   postMessage(message){
    if(message.type==="transcribe"){
     globalThis.__speechRequest={language:message.language,output:message.output};
     setTimeout(()=>{
      if(this.cancelled)return;
      const text="Solar panels produce electricity from sunlight. Energy storage batteries save power for later use. Wind turbines produce electricity from moving air.";
      this.onmessage?.({data:{type:"complete",text,segments:[{text,start:0,end:1}]}});
     },50);
    }
    if(message.type==="translate"){globalThis.__unexpectedWeightDownload=true;throw Error("Do not automatically download NLLB");}
   }
   terminate(){this.cancelled=true;}
  };
 });
 try{
  await page.goto(url+"#studio",{waitUntil:"domcontentloaded"});
  await page.locator("#audio-language").selectOption("hi");
  await page.locator("#audio-output").selectOption("ta");
  await page.locator("#file").setInputFiles({name:"lecture.wav",mimeType:"audio/wav",buffer:wavFixture()});
  await page.locator("#generate").click();
  await page.locator("#results").waitFor({state:"visible",timeout:13000});
  assert.equal(await page.evaluate(()=>window.__fastRequests),0,"No remote request without explicit consent");
  assert.notEqual(await page.evaluate(()=>window.__unexpectedWeightDownload),true,"No background NLLB download");
  assert.ok(await page.locator("#translation-choice").isVisible(),"Provide fast translation choice after original notes");
  assert.match(await page.locator("#editor").inputValue(),/Solar panels/);
  assert.match(await page.locator("#translation-choice-info").innerText(),/original transcript/i);
  await page.locator("#translation-online-now").click();
  await page.locator("#translation-choice").waitFor({state:"hidden",timeout:12000});
  assert.ok((await page.locator("#editor").inputValue()).includes("சூரிய"));
  assert.ok(await page.locator("#source-transcript-panel").isVisible());
  await page.locator("#source-transcript-title").click();
  assert.match(await page.locator("#source-transcript-text").innerText(),/Solar panels/);
  assert.ok(await page.evaluate(()=>window.__fastRequests)>=1);
  assert.notEqual(await page.evaluate(()=>window.__unexpectedWeightDownload),true);
  assert.deepEqual(errors,[]);
  console.log("PASS explicit-consent translation: notes finish, no model download, source preserved");
 }finally{await page.close();}
}
async function installedBrowserTranslationScenario(browser){
 const page=await browser.newPage({viewport:{width:1280,height:820},reducedMotion:"reduce"});
 const exceptions=[];page.on("pageerror",e=>exceptions.push(e.message));
 await page.addInitScript(()=>{
  globalThis.Translator={
   async availability({sourceLanguage,targetLanguage}){
    globalThis.__nativeRequested={sourceLanguage,targetLanguage};
    return "available";
   },
   async create(){
    globalThis.__nativeCreated=true;
    return {
     async translate(){
      return "சூரிய மின்சாரம் சூரிய ஒளியிலிருந்து உருவாகிறது. மின்கலங்கள் மின்சாரத்தை சேமித்து வைக்கின்றன. காற்றாலைகள் நகரும் காற்றிலிருந்து மின்சாரத்தை தயாரிக்கின்றன. இந்த அறிவியல் பாடத்தில் மாணவர்கள் புதுப்பிக்கத்தக்க ஆற்றலை கற்கிறார்கள்.";
     },
     destroy(){globalThis.__nativeDisposed=true;}
    };
   }
  };
  globalThis.Worker=class FakeAudioWorker{
   constructor(){this.onmessage=null;this.cancelled=false;}
   postMessage(data){
    if(data.type==="transcribe"){
     setTimeout(()=>{
      if(this.cancelled)return;
      const text="Solar cells generate electricity from sunlight. Renewable batteries store electricity for later use. A wind turbine produces power using moving air. Scientists study energy conversion to reduce the use of fossil fuels.";
      this.onmessage?.({data:{type:"complete",text,segments:[{start:0,end:1,text}]}});
     },50);
    }
    if(data.type==="translate"){
     globalThis.__unexpectedFallback=true;
     throw Error("A cached browser translator must skip NLLB downloads");
    }
   }
   terminate(){this.cancelled=true;}
  };
 });
 try{
  await page.goto(url+"#studio",{waitUntil:"domcontentloaded"});
  await page.locator("#audio-language").selectOption("hi");
  await page.locator("#audio-output").selectOption("ta");
  await page.locator("#file").setInputFiles({name:"lesson.wav",mimeType:"audio/wav",buffer:wavFixture()});
  await page.locator("#generate").click();
  await page.locator("#results").waitFor({state:"visible",timeout:12000});
  assert.deepEqual(await page.evaluate(()=>globalThis.__nativeRequested),{sourceLanguage:"hi",targetLanguage:"ta"});
  assert.equal(await page.evaluate(()=>globalThis.__nativeCreated),true);
  assert.equal(await page.evaluate(()=>globalThis.__nativeDisposed),true);
  assert.notEqual(await page.evaluate(()=>globalThis.__unexpectedFallback),true);
  assert.match(await page.locator("#editor").inputValue(),/சூரிய/);
  assert.deepEqual(exceptions,[],"Native translator browser errors");
  console.log("PASS Chromium installed browser translator skips giant NLLB model download");
 }finally{await page.close();}
}
try{
 chrome=await chromium.launch({headless:true,args:["--no-sandbox"]});
 await quizScenario(chrome,1440,900);
 await quizScenario(chrome,390,844);
 await translatedAudioScenario(chrome);
 await installedBrowserTranslationScenario(chrome);
 safari=await webkit.launch({headless:true});
 await quizScenario(safari,390,844);
 console.log("PASS Loisel browser integration");
}finally{
 await chrome?.close();await safari?.close();
 await new Promise(resolve=>server.close(resolve));
}
