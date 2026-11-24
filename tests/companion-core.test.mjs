import test from "node:test";
import assert from "node:assert/strict";
import {quickAnswer,prepareQuestion,sanitizeModelAnswer,CHAT_MODELS} from "../public/companion-core.js";
const notes={transcript:"Solar panels convert sunlight into electricity. The science students must submit the solar project report by Friday. Renewable energy can lower electricity costs."};
test("Pip has truthful zero-model onboarding answers",()=>{
 assert.match(quickAnswer("hello"),/Pip/);
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
