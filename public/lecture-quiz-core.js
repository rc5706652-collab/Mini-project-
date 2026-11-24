import {makeQuiz,gradeQuiz} from "./quiz.js";
import {createNotes,splitSentences,tokenize} from "./notes.js";
export function focusLecture(transcript,topic=""){
 const source=String(transcript||"").trim(),needle=tokenize(topic).slice(0,8);
 if(!needle.length)return source;
 const sentences=splitSentences(source);
 return sentences.filter(s=>{
  const terms=new Set(tokenize(s));return needle.some(t=>terms.has(t));
 }).join(" ");
}
export function buildLectureQuiz(transcript,{topic="",count=6}={}){
 const scoped=focusLecture(transcript,topic);
 if(!scoped)return {error:"No passage matched the selected topic. Try a topic mentioned in the lecture.",notes:null,questions:[]};
 const notes=createNotes(scoped);
 const questions=makeQuiz(notes,Math.max(3,Math.min(12,Number(count)||6)));
 if(questions.length<2)return {error:"This lecture needs more distinct facts for a reliable quiz. Add more lecture content.",notes,questions:[]};
 return {error:null,notes,questions:questions.map(q=>({...q,topic:q.answer}))};
}
export function diagnoseQuiz(questions,answers){
 const graded=gradeQuiz(questions,answers);
 const weak=graded.results.filter(x=>!x.correct).map(x=>{
  const q=questions.find(p=>p.id===x.id);
  return {id:q.id,topic:q.topic||q.answer,question:q.question,evidence:q.evidence,expected:q.answer,selected:x.selected};
 });
 const mastered=graded.results.filter(x=>x.correct).map(x=>questions.find(q=>q.id===x.id).topic);
 return {...graded,weak,mastered,score:graded.total?Math.round(graded.correct/graded.total*100):0};
}
export function lessonSearchUrl(topic,context="",lang="en"){
 const query=[String(topic).slice(0,75),String(context).slice(0,65),"tutorial explanation",lang==="hi"?"Hindi":lang==="kn"?"Kannada":lang==="te"?"Telugu":lang==="ta"?"Tamil":""].filter(Boolean).join(" ");
 return "https://www.youtube.com/results?search_query="+encodeURIComponent(query);
}
