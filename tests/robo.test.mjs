import test from "node:test";
import assert from "node:assert/strict";
import {robotIntent,evidenceFor,fallbackAnswer,chatPrompt,robotStateLabel} from "../public/robo-core.js";
const notes={transcript:"Solar panels convert sunlight into electricity. Students must submit their project report by Friday. A battery stores energy from solar panels."};
test("robot routes explicit voice commands, not arbitrary questions",()=>{
 assert.equal(robotIntent("Open AI studio"),"studio");
 assert.equal(robotIntent("show the quiz arena"),"quiz");
 assert.equal(robotIntent("go to my library"),"library");
 assert.equal(robotIntent("Create a new session"),"new");
 assert.equal(robotIntent("What is solar energy?"),"question");
 assert.equal(robotIntent("hi"),"hello");
});
test("transcript answers are exact sourced evidence",()=>{
 const passages=evidenceFor("What do solar panels convert?",notes);
 assert.ok(passages.length>0);
 assert.ok(passages.every(x=>notes.transcript.includes(x)));
 const found=fallbackAnswer("What do solar panels convert?",notes);
 assert.equal(found.kind,"source");
 assert.ok(found.sources.length>0);
 const absent=fallbackAnswer("Explain volcano tectonic",notes);
 assert.equal(absent.kind,"unsupported");
 assert.deepEqual(absent.sources,[]);
});
test("local model prompt is bounded and grounded when evidence exists",()=>{
 const relevant=chatPrompt("What is solar electricity?",notes);
 assert.equal(relevant.grounded,true);
 assert.ok(relevant.prompt.includes("lecture excerpt"));
 const general=chatPrompt("What is a computer?",null,[{role:"user",text:"hello"}]);
 assert.equal(general.grounded,false);
 assert.ok(general.prompt.includes("Question: What is a computer?"));
 assert.ok(chatPrompt("q".repeat(10000),notes).prompt.length<=1190);
 assert.equal(robotStateLabel("listening"),"Listening to you");
});
