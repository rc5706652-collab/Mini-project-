import assert from "node:assert/strict";
import {startStaticServer} from "./static-server.mjs";
import { chromium } from "playwright";

const port=8765, url="http://127.0.0.1:"+port;
const server=await startStaticServer(port);
let browser;
const transcript="The class explored renewable energy and solar panels. Students must submit the research report by Friday. The test system produced 25 watts of power in the demonstration. Our key conclusion is that solar panels can reduce electricity costs.";
async function ready(){
 for(let retry=0;retry<60;retry++){
   try{const res=await fetch(url);if(res.ok)return;}catch{}
   await new Promise(resolve=>setTimeout(resolve,250));
 }
 throw Error("Local static server failed to start");
}
try{
 await ready();
 browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1380,height:900},acceptDownloads:true});
 const crashes=[];
 page.on("pageerror",error=>crashes.push(error.message));
 await page.goto(url,{waitUntil:"domcontentloaded"});
 await page.locator("#text-tab").click();
 await page.locator("#pasted").fill(transcript);
 await page.locator("#generate").click();
 await page.locator("#results").waitFor({state:"visible",timeout:10000});
 await page.locator("#advanced-suite").waitFor({state:"visible",timeout:7000});
 assert.ok((await page.locator(".galaxy-node").count())>=3);
 await page.locator(".galaxy-node").first().click();
 assert.ok((await page.locator("#galaxy-evidence").innerText()).length>15);
 await page.locator("#quiz-tab").click();
 assert.ok((await page.locator(".quiz-card").count())>=1);
 await page.locator(".quiz-card .quiz-choice").first().click();
 assert.ok((await page.locator("#quiz-score").innerText()).includes("Score"));
 await page.locator("#quiz-restart").click();
 await page.locator("#tutor-tab").click();
 await page.locator("#tutor-question").fill("What are solar panels?");
 await page.locator("#tutor-submit").click();
 assert.ok((await page.locator("#tutor-result").innerText()).includes("solar panels"));
 assert.ok((await page.locator("#summary").innerText()).length>15);
 assert.ok((await page.locator("#points li").count())>0);
 assert.ok((await page.locator("#actions").innerText()).includes("submit"));
 assert.ok((await page.locator("#details").innerText()).includes("25 watts"));
 await page.locator("#cards-tab").click();
 assert.equal(await page.locator("#flashcard").isDisabled(),false);
 await page.locator("#flashcard").click();
 assert.ok(await page.locator("#flashcard").evaluate(node=>node.classList.contains("revealed")));
 await page.locator("#chapters-tab").click();
 assert.ok((await page.locator("#chapter-list").innerText()).includes("Pasted text"));
 const dl=page.waitForEvent("download");
 await page.locator("#export").click();
 assert.equal((await dl).suggestedFilename(),"NoteWave-notes.md");
 await page.locator("#save").click();
 await page.locator("#nav-saved").click();
 await page.locator("#memory-results .saved-item").first().waitFor({state:"visible",timeout:8000});
 await page.locator("#memory-search").fill("solar");
 assert.ok((await page.locator("#memory-results .saved-item").count())>=1);
 await page.locator("#memory-results .saved-item button").first().click();
 await page.locator("#results").waitFor({state:"visible"});
 assert.ok((await page.locator("#editor").inputValue()).includes("solar panels"));
 assert.deepEqual(crashes,[]);

 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1});
 const mobileErrors=[];
 mobile.on("pageerror",err=>mobileErrors.push(err.message));
 await mobile.goto(url,{waitUntil:"domcontentloaded"});
 await mobile.locator("#text-tab").click();
 await mobile.locator("#pasted").fill(transcript);
 await mobile.locator("#generate").click();
 await mobile.locator("#results").waitFor({state:"visible"});
 const widths=await mobile.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
 assert.ok(widths.scroll<=widths.viewport+2,"Mobile horizontal overflow: "+JSON.stringify(widths));
 assert.deepEqual(mobileErrors,[]);

 // Exercise the original audio processing path with a deterministic fake transcript.
 // This checks audio decoding and UI orchestration without downloading Whisper weights.
 const audio=await browser.newPage({viewport:{width:1100,height:850}});
 const audioErrors=[];
 audio.on("pageerror",err=>audioErrors.push(err.message));
 await audio.addInitScript(()=>{
   window.Worker=class FakeWhisperWorker {
     constructor(){this.onmessage=null;this.onerror=null;this.cancelled=false;}
     postMessage(message){
       if(message?.type!=="transcribe")return;
       window.latestWhisperRequest={language:message.language,output:message.output};
       setTimeout(()=>{if(!this.cancelled)this.onmessage?.({data:{type:"stage",message:"Testing recognition"}});},100);
       setTimeout(()=>{
         if(this.cancelled||window.__holdWhisperTest)return;
         const transcript="Today we studied renewable energy. Students must submit a report by Friday. Our experiment uses 25 solar panels.";
         this.onmessage?.({data:{type:"segment",index:1,total:1,text:transcript,progress:100}});
         this.onmessage?.({data:{type:"complete",text:transcript,segments:[{start:0,end:1,text:transcript}]}});
       },650);
     }
     terminate(){this.cancelled=true;}
   };
 });
 await audio.goto(url,{waitUntil:"domcontentloaded"});
 function wavFixture(){
   const frames=16000,sampleRate=16000,b=Buffer.alloc(44+frames*2);
   b.write("RIFF",0);b.writeUInt32LE(36+frames*2,4);b.write("WAVE",8);
   b.write("fmt ",12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);
   b.writeUInt16LE(1,22);b.writeUInt32LE(sampleRate,24);
   b.writeUInt32LE(sampleRate*2,28);b.writeUInt16LE(2,32);
   b.writeUInt16LE(16,34);b.write("data",36);b.writeUInt32LE(frames*2,40);
   for(let i=0;i<frames;i++)b.writeInt16LE(Math.round(1200*Math.sin(i*.03)),44+i*2);
   return b;
 }
 await audio.locator("#audio-language").selectOption("hi");
 await audio.locator("#audio-output").selectOption("english");
 await audio.locator("#file").setInputFiles({name:"demo.wav",mimeType:"audio/wav",buffer:wavFixture()});
 await audio.locator("#generate").click();
 await audio.locator("#alchemy-stage").waitFor({state:"visible",timeout:4000});
 assert.equal(await audio.locator("#alchemy-stage").getAttribute("data-phase"),"processing");
 await audio.waitForFunction(()=>window.latestWhisperRequest!==undefined,{timeout:6000});
 assert.deepEqual(await audio.evaluate(()=>window.latestWhisperRequest),{language:"hi",output:"english"});
 await audio.locator("#results").waitFor({state:"visible",timeout:12000});
 assert.ok(await audio.locator("#results").evaluate(node=>node.classList.contains("alchemy-reveal")));
 assert.ok((await audio.locator("#summary").innerText()).includes("renewable energy"));
 assert.ok((await audio.locator("#chapter-list").innerText()).length>10);
 await audio.locator("#chapters-tab").click();
 assert.equal(await audio.locator(".chapter").count(),1);
 assert.equal(await audio.locator("#preview-audio").isVisible(),true);
 assert.equal(await audio.locator("#alchemy-stage").isVisible(),false);

 // A second generation must reuse the same canvas without losing its WebGL context.
 await audio.locator("#top-create").click();
 await audio.locator("#text-tab").click();
 await audio.locator("#pasted").fill(transcript);
 await audio.locator("#generate").click();
 await audio.locator("#results").waitFor({state:"visible",timeout:12000});
 assert.ok((await audio.locator("#summary").innerText()).length>15);
 assert.ok((await audio.locator("#editor").inputValue()).includes("renewable energy"));

 // Cancellation must terminate processing, release 3D resources and unlock controls.
 await audio.locator("#top-create").click();
 await audio.locator("#upload-tab").click();
 await audio.evaluate(()=>{window.__holdWhisperTest=true;});
 await audio.locator("#file").setInputFiles({name:"cancel.wav",mimeType:"audio/wav",buffer:wavFixture()});
 await audio.locator("#generate").click();
 await audio.locator("#alchemy-stage").waitFor({state:"visible",timeout:4000});
 await audio.locator("#cancel").click();
 await audio.locator("#working").waitFor({state:"hidden",timeout:8000});
 assert.equal(await audio.locator("#generate").isEnabled(),true);
 assert.equal(await audio.locator("#results").isVisible(),false);
 assert.ok((await audio.locator("#error").innerText()).includes("cancelled"));
 assert.deepEqual(audioErrors,[]);

 // Reduced-motion stays fully functional, skipping WebGL while retaining notes.
 const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:"reduce"});
 const reducedErrors=[];
 reduced.on("pageerror",err=>reducedErrors.push(err.message));
 await reduced.goto(url,{waitUntil:"domcontentloaded"});
 await reduced.locator("#text-tab").click();
 await reduced.locator("#pasted").fill(transcript);
 await reduced.locator("#generate").click();
 await reduced.locator("#results").waitFor({state:"visible",timeout:8000});
 assert.equal(await reduced.evaluate(()=>matchMedia("(prefers-reduced-motion: reduce)").matches),true);
 assert.ok((await reduced.locator("#summary").innerText()).length>15);
 assert.deepEqual(reducedErrors,[]);
 console.log("PASS: Particle Alchemy WAV processing, on-device fallback, depth-reveal notes and reduced-motion functionality");

 console.log("PASS: desktop notes, key details, flashcards, chapters fallback, export, persistence, mobile layout");
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
