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
 const target=Math.max(3,Math.min(12,Number(count)||6));
 const questions=makeQuiz(notes,target);
 if(questions.length<target){
  for(const q of shortPassageQuestions(scoped,transcript,target)){
   if(questions.length>=target)break;
   if(questions.some(old=>old.question===q.question||old.answer===q.answer))continue;
   questions.push({...q,id:"q"+(questions.length+1)});
  }
 }
 if(!questions.length)return {error:"This lecture needs more readable facts for a reliable quiz. Try another topic or add more lecture text.",notes,questions:[]};
 return {error:null,notes,questions:questions.map(q=>({...q,topic:q.answer}))};
}
// Short bullet lines and wrapped PDF text often lack the long sentences
// required by makeQuiz. Keep answers and alternatives drawn from the lecture.
function shortPassageQuestions(scoped,full,target){
 const pool=[...new Set(tokenize(full))].filter(t=>t.length>=3);
 const out=[],used=new Set();
 for(const evidence of splitSentences(scoped)){
  if(evidence.trim().split(/\s+/).length<3||evidence.length>500)continue;
  const words=[...new Set(tokenize(evidence))].filter(t=>t.length>=3);
  for(const answer of words){
   if(used.has(answer))continue;
   const escaped=answer.replace(/[|\\{}()[\]^$+*?.]/g,"\\$&");
   const re=new RegExp("(^|[^\\p{L}\\p{M}\\p{N}])("+escaped+")(?=$|[^\\p{L}\\p{M}\\p{N}])","iu");
   const question=evidence.replace(re,(_,prefix)=>prefix+"______");
   if(question===evidence)continue;
   const others=pool.filter(t=>t!==answer&&!words.includes(t)).slice(0,3);
   if(!others.length)continue;
   const choices=[answer,...others],offset=(out.length+1)%choices.length;
   out.push({id:"fallback"+(out.length+1),question,answer,evidence,choices:[...choices.slice(offset),...choices.slice(0,offset)]});
   used.add(answer);
   break;
  }
  if(out.length>=target)break;
 }
 return out;
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
