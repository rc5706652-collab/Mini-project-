import test from "node:test";
import assert from "node:assert/strict";
import {speechPlan,translationChunks,normalizeTargetLanguage} from "../public/speech-languages.js";
import {buildLectureQuiz,diagnoseQuiz,focusLecture,lessonSearchUrl} from "../public/lecture-quiz-core.js";
const lecture="Solar panels convert sunlight into electricity during clear days. Engineers measured electrical voltage from a small solar panel prototype. Renewable energy technologies can reduce dependence on fossil fuels. Students should submit the solar energy project by Friday. Energy storage batteries help save electricity for later use. Wind turbines generate electricity from moving air. A solar inverter changes direct current to alternating current. Scientists use controlled experiments to evaluate energy conversion efficiency.";
test("multilingual speech plan handles auto, translation and backwards compatibility",()=>{
 assert.equal(speechPlan("hi","original").translate,false);
 assert.equal(speechPlan("hi","english").whisperOutput,"english");
 assert.equal(speechPlan("en","hi").translate,true);
 assert.equal(speechPlan("auto","ta").bridgeEnglish,true);
 assert.equal(speechPlan("auto","ta").sourceCode,"eng_Latn");
 assert.equal(speechPlan("auto","en").translate,false);
 assert.equal(normalizeTargetLanguage("english"),"en");
});
test("translation chunks avoid empty or oversized blocks for normal sentences",()=>{
 const text=Array(50).fill("Solar energy is useful").join(" ");
 const blocks=translationChunks(text,92);
 assert.ok(blocks.length>2);assert.ok(blocks.every(s=>s.length<=92));
 assert.equal(blocks.join(" "),text);
});
test("quizzes stay grounded in supplied lecture and track mistakes",()=>{
 const quiz=buildLectureQuiz(lecture,{count:5});
 assert.equal(quiz.error,null);assert.ok(quiz.questions.length>=2);
 for(const q of quiz.questions)assert.ok(lecture.includes(q.evidence));
 const answers=Object.fromEntries(quiz.questions.map((q,i)=>[q.id,i===0?q.answer:"deliberately wrong"]));
 const score=diagnoseQuiz(quiz.questions,answers);
 assert.equal(score.correct,1);
 assert.equal(score.weak.length,score.total-1);
 assert.ok(score.weak.every(x=>lecture.includes(x.evidence)));
});
test("topic focus refuses unrelated lecture topics and video links are search URLs",()=>{
 assert.equal(focusLecture(lecture,"quantum theory"),"");
 assert.match(buildLectureQuiz(lecture,{topic:"quantum theory"}).error,/No passage/);
 const u=new URL(lessonSearchUrl("solar inverter","solar energy","hi"));
 assert.equal(u.hostname,"www.youtube.com");
 assert.equal(u.pathname,"/results");
 assert.ok(u.searchParams.get("search_query").includes("Hindi"));
});
