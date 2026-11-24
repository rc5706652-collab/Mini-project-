import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {translationLocales,translateAlreadyInstalled} from "../public/translation-fastpath.js";
const plan={sourceCode:"hin_Deva",targetCode:"tam_Taml"};
test("existing NLLB codes map to browser-language identifiers",()=>{
 assert.deepEqual(translationLocales(plan),{sourceLanguage:"hi",targetLanguage:"ta"});
 assert.equal(translationLocales({sourceCode:"eng_Latn",targetCode:"eng_Latn"}),null);
 assert.equal(translationLocales({sourceCode:null,targetCode:"tam_Taml"}),null);
});
test("available native translator handles long text without an extra model download",async()=>{
 let checked=null,created=null,calls=0,destroyed=0,progress=[];
 const api={
  async availability(pair){checked=pair;return "available";},
  async create(pair){created=pair;return {async translate(input){calls++;return "Translated "+input.slice(0,10);},destroy(){destroyed++;}};}
 };
 const input=Array(350).fill("Solar cells generate electricity").join(" ");
 const result=await translateAlreadyInstalled(input,plan,{api,onProgress:x=>progress.push(x)});
 assert.deepEqual(checked,{sourceLanguage:"hi",targetLanguage:"ta"});
 assert.deepEqual(created,checked);
 assert.ok(calls>2);
 assert.ok(result.startsWith("Translated "));
 assert.equal(progress.length,calls);
 assert.equal(destroyed,1);
});
test("native downloadable packs are skipped rather than silently starting another download",async()=>{
 let created=false;
 const api={async availability(){return "downloadable";},async create(){created=true;}};
 assert.equal(await translateAlreadyInstalled("Hello",plan,{api}),null);
 assert.equal(created,false);
});
test("unsupported browsers, unavailable pairs and native translation failures safely use local fallback",async()=>{
 assert.equal(await translateAlreadyInstalled("Hello",plan,{api:null}),null);
 assert.equal(await translateAlreadyInstalled("Hello",plan,{api:{availability:async()=>"unavailable",create(){throw Error("should not call");}}}),null);
 let destroyed=0;
 assert.equal(await translateAlreadyInstalled("Solar energy",plan,{api:{
  availability:async()=>"available",
  create:async()=>({translate:async()=>{throw Error("broken pack");},destroy:()=>{destroyed++;}})
 }}),null);
 assert.equal(destroyed,1);
});
test("canceled translations never return stale text",async()=>{
 let allowed=true;
 const api={availability:async()=>"available",create:async()=>({
  translate:async()=>{allowed=false;return "Wrong stale result";},destroy(){}
 })};
 await assert.rejects(()=>translateAlreadyInstalled("Solar power",plan,{api,isCurrent:()=>allowed}),/cancelled/);
});
test("translation fallback uses the confirmed compact 4-bit model and browser cache",async()=>{
 const src=await readFile(new URL("../public/translation-worker.js",import.meta.url),"utf8");
 assert.match(src,/dtype:"q4"/);
 assert.match(src,/env\.useBrowserCache=true/);
 assert.doesNotMatch(src,/dtype:"q8"/);
 assert.match(src,/NLLB|nllb/);
});
