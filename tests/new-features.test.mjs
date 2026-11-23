import test from "node:test";
import assert from "node:assert/strict";
import {makeGalaxy,galaxyCoordinates} from "../public/knowledge.js";
import {makeQuiz,gradeQuiz} from "../public/quiz.js";
import {searchSessions} from "../public/memory.js";
import {tutorContext,tutorFallback} from "../public/tutor.js";
import {createNotes} from "../public/notes.js";
const transcript="Neural networks learn patterns from data in machine learning. Machine learning helps engineers build speech recognition applications. The lecture explains neural networks using labeled training examples. Students should submit the neural networks assignment by Friday. Engineers compare model accuracy using evaluation data. Data quality is essential for reliable speech recognition.";
const notes=createNotes(transcript);
test("galaxy uses transcript-only concepts and co-mentions",()=>{
 const graph=makeGalaxy(notes);assert.ok(graph.nodes.length>=4);
 assert.ok(graph.nodes.every(n=>transcript.includes(n.evidence)));
 assert.ok(graph.edges.every(e=>transcript.includes(e.evidence)));
 assert.equal(galaxyCoordinates(graph.nodes.length).length,graph.nodes.length);
});
test("MCQ answers and distractors are source-derived",()=>{
 const quiz=makeQuiz(notes);assert.ok(quiz.length);
 for(const q of quiz){assert.equal(q.choices.length,4);assert.equal(new Set(q.choices).size,4);assert.ok(q.choices.includes(q.answer));assert.ok(transcript.includes(q.evidence));}
 assert.equal(gradeQuiz(quiz,Object.fromEntries(quiz.map(q=>[q.id,q.answer]))).correct,quiz.length);
 assert.equal(gradeQuiz(quiz,{}).correct,0);
});
test("tutor shows evidence and refuses unsupported answers",()=>{
 const relevant=tutorContext("What are neural networks?",notes);assert.ok(relevant.evidence.length);
 assert.ok(relevant.evidence.every(s=>transcript.includes(s)));
 assert.equal(tutorFallback("volcanic tectonic plates",notes).evidence.length,0);
});
test("cross-session search keeps provenance",()=>{
 const items=[{source:"Lecture A",notes:{title:"Neural",transcript}},{source:"History",notes:{title:"Roman Empire",transcript:"Ancient roads."}}];
 assert.equal(searchSessions("neural",items).length,1);
 assert.equal(searchSessions("unknown",items).length,0);
});
