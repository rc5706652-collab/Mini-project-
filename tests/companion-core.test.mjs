import test from "node:test";
import assert from "node:assert/strict";
import {quickAnswer,prepareQuestion,sanitizeModelAnswer,CHAT_MODELS} from "../public/companion-core.js";
const notes={transcript:"Solar panels convert sunlight into electricity. The science students must submit the solar project report by Friday. Renewable energy can lower electricity costs."};
test("Loisel has truthful zero-model onboarding answers",()=>{
 assert.match(quickAnswer("hello"),/Loisel/);
 assert.match(quickAnswer("what can you do?"),/on-device/);
 assert.equal(quickAnswer("Why is the sky blue?"),null);
});
test("note-aware prompts contain only transcript evidence",()=>{
 const r=prepareQuestion("What do solar panels convert?",{mode:"notes",notes});
 assert.equal(r.error,null);
 assert.ok(r.evidence.length>0);
 assert.ok(r.evidence.every(s=>notes.transcript.includes(s)));
 assert.match(r.prompt,/Solar panels/);
 assert.equal(prepareQuestion("volcanic lava magma",{mode:"notes",notes}).evidence.length,0);
});
test("no note means no unsupported answer",()=>{
 assert.match(prepareQuestion("Explain lectures",{mode:"notes"}).error,/recording first/);
 assert.ok(prepareQuestion("Explain solar power",{mode:"general"}).messages.length>0);
 assert.ok(prepareQuestion("What is today's weather?",{mode:"general"}).error);
});
test("chat history and model responses are size bounded",()=>{
 const r=prepareQuestion("Explain renewable energy",{mode:"general",history:Array.from({length:10},(_,i)=>({role:i%2?"assistant":"user",content:"Long message ".repeat(100)}))});
 assert.ok(r.prompt.length<2000);
 assert.equal(r.messages.length,6);
 assert.equal(sanitizeModelAnswer("Assistant: Hello world"),"Hello world");
 assert.equal(Object.keys(CHAT_MODELS).length,2);
});

test("PDF questions use selected document and carry real page references",()=>{
 const pdf={title:"lecture.pdf",pages:[{page:1,text:"Mitochondria produce energy for cells."},{page:2,text:"Chloroplasts convert sunlight into chemical energy."}]};
 const result=prepareQuestion("What do chloroplasts convert?",{mode:"pdf",pdf});
 assert.equal(result.error,null);
 assert.equal(result.citations[0].page,2);
 assert.match(result.evidence[0],/sunlight/);
 assert.ok(prepareQuestion("volcanic magma",{mode:"pdf",pdf}).error);
 assert.ok(prepareQuestion("What is biology?",{mode:"pdf"}).error);
});
