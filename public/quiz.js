import {splitSentences,tokenize} from "./notes.js";
export function makeQuiz(notes,limit=6){
 const lines=splitSentences(notes?.transcript||"");
 const terms=[...new Set([...(notes?.keywords||[]),...tokenize(notes?.transcript||"")])].filter(w=>w.length>=4);
 const output=[];
 for(const answer of terms){
   if(output.length>=limit)break;
   const evidence=lines.find(line=>new Set(tokenize(line)).has(answer)&&line.trim().split(/\s+/).length>=6&&line.length<340);
   if(!evidence)continue;
   const other=terms.filter(t=>t!==answer&&!new Set(tokenize(evidence)).has(t)).slice(0,3);
   if(other.length!==3)continue;
   const rx=new RegExp("(^|[^\\p{L}\\p{N}])("+answer.replace(/[|\\{}()[\]^$+*?.]/g,"\\$&")+")(?=$|[^\\p{L}\\p{N}])","iu");
   const prompt=evidence.replace(rx,(match,prefix)=>prefix+"______");
   if(prompt===evidence)continue;
   const index=output.length,options=[answer,...other];
   const choices=[...options.slice((index+1)%4),...options.slice(0,(index+1)%4)];
   output.push({id:"q"+(index+1),question:prompt,answer,choices,evidence});
 }
 return output;
}
export function gradeQuiz(questions,answers){
 let correct=0;
 const results=questions.map(q=>{const selected=answers?.[q.id]||null,ok=selected===q.answer;if(ok)correct++;return {id:q.id,selected,correct:ok,answer:q.answer,evidence:q.evidence};});
 return {correct,total:questions.length,results};
}
