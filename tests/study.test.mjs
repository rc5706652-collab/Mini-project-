import test from "node:test";
import assert from "node:assert/strict";
import { makeFlashcards, lexicalEvidence, makeChapters, formatTime } from "../public/study.js";
import { createNotes } from "../public/notes.js";

const source = "Our team reviewed the automatic notes maker. The notes maker uses speech recognition to transcribe recorded lectures. Students should submit the machine learning report by Friday. The model processed 25 audio recordings for evaluation. The most important objective is reliable note organization.";
test("review cards conceal only genuine transcript words", () => {
 const cards = makeFlashcards(createNotes(source));
 assert.ok(cards.length > 0);
 for (const card of cards) {
   assert.ok(card.prompt.includes("________"));
   assert.ok(source.includes(card.evidence));
   assert.ok(card.evidence.toLowerCase().includes(card.answer));
 }
});
test("question evidence returns only transcript quotes", () => {
 const results = lexicalEvidence("What did the model process?",source);
 assert.ok(results.length);
 assert.ok(results.every(r=>source.includes(r.text)));
 assert.deepEqual(lexicalEvidence("unrelated zyxwvut",source),[]);
});
test("chapters respect real segment starts, not fabricated timestamps", () => {
 const chapters = makeChapters([
  {start:0,end:25,text:"Our class learned about machine learning."},
  {start:25,end:50,text:"Neural networks perform pattern recognition."},
  {start:100,end:125,text:"We should finish the report on Friday."},
 ]);
 assert.equal(chapters.length,2);
 assert.equal(chapters[0].start,0);
 assert.equal(chapters[1].start,100);
 assert.equal(formatTime(chapters[1].start),"01:40");
 assert.deepEqual(makeChapters([]),[]);
});
