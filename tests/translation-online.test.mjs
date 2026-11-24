import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {MAX_FAST_BYTES,MAX_CHUNK_BYTES,utf8Length,splitForTranslation,validateFastTranslation,translateOnlineWithConsent} from "../public/translation-online.js";
const plan={sourceCode:"hin_Deva",targetCode:"tam_Taml"};
const sample="Renewable energy helps students understand solar panels. Scientists measure voltage and current. Wind turbines use moving air to generate electricity.";
test("UTF-8 chunks never exceed the 500-byte third-party request limit and preserve content",()=>{
 const text=("தமிழ் மற்றும் ಕನ್ನಡ ಭಾಷೆ solar energy power. ").repeat(45);
 const pieces=splitForTranslation(text);
 assert.ok(pieces.length>5);
 for(const piece of pieces)assert.ok(utf8Length(piece)<=MAX_CHUNK_BYTES,"Chunk exceeds cap");
 assert.equal(pieces.join(" ").replace(/\s+/g," "),text.trim().replace(/\s+/g," "));
 assert.throws(()=>splitForTranslation("ABC",0),/Invalid/);
});
test("online limits reject oversize instead of silently truncating a lecture",()=>{
 assert.deepEqual(validateFastTranslation(sample,plan),{sourceLanguage:"hi",targetLanguage:"ta"});
 assert.throws(()=>validateFastTranslation("अ".repeat(MAX_FAST_BYTES),plan),/4,200/);
 assert.throws(()=>validateFastTranslation(sample,{sourceCode:null,targetCode:"tam_Taml"}),/two different/);
});
test("explicit online translation uses no credentials and all chunks, retaining Unicode",async()=>{
 const calls=[];const large=sample.repeat(13);
 const result=await translateOnlineWithConsent(large,plan,{
  fetchImpl:async(url,options)=>{
   const u=new URL(url);calls.push({u,options});
   assert.equal(u.origin,"https://api.mymemory.translated.net");
   assert.equal(u.searchParams.get("langpair"),"hi|ta");
   assert.equal(options.credentials,"omit");
   assert.equal(options.referrerPolicy,"no-referrer");
   return {ok:true,async json(){return {responseStatus:200,responseData:{translatedText:"தமிழ் பாடம் சூரிய ஆற்றல்."}}}};
  }
 });
 assert.ok(calls.length>=2);
 assert.equal(result.split("தமிழ்").length-1,calls.length);
 assert.ok(calls.every(x=>utf8Length(x.u.searchParams.get("q"))<=MAX_CHUNK_BYTES));
});
test("partial remote replies are never represented as complete translation",async()=>{
 let count=0;
 await assert.rejects(()=>translateOnlineWithConsent(sample.repeat(12),plan,{
  fetchImpl:async()=>{
   count++;
   if(count===1)return {ok:true,json:async()=>({responseStatus:200,responseData:{translatedText:"தமிழ் முதல் பகுதி"}})};
   return {ok:false,status:429};
  }
 }),/quota|rate limit/);
});
test("requests stop on cancellation and timeouts; original notes are handled separately",async()=>{
 const controller=new AbortController();controller.abort();
 await assert.rejects(()=>translateOnlineWithConsent(sample,plan,{signal:controller.signal}),/cancelled/);
 await assert.rejects(()=>translateOnlineWithConsent(sample,plan,{timeoutMs:20,fetchImpl:(_url,opts)=>new Promise((_resolve,reject)=>{
  opts.signal.addEventListener("abort",()=>reject(Object.assign(Error("Abort"),{name:"AbortError"})),{once:true});
 })}),/timed out/);
});
test("production application must not automatically request giant NLLB model weights",async()=>{
 const app=await readFile(new URL("../public/app.js",import.meta.url),"utf8");
 assert.ok(app.includes("translateOnlineWithConsent"));
 assert.ok(app.includes('translation-online-now'));
 assert.ok(!app.includes('new Worker("./translation-worker.js"'),"The >500 MB model must never be invoked from the recording flow");
 assert.ok(app.includes('translationPrompt(state.pendingTranslation)'));
});
