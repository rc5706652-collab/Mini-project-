import {lexicalEvidence} from "./study.js";
export function tutorContext(question,notes){
 const q=String(question||"").trim();
 if(!q||!notes?.transcript)return {question:q,evidence:[],prompt:""};
 const evidence=lexicalEvidence(q,notes.transcript,3).map(row=>row.text);
 const prompt=evidence.length?[
 "Explain the following lecture evidence simply, using only the passage. If the passage lacks an answer, say so.",
 "Question: "+q.slice(0,220),
 "Passage: "+evidence.join(" ").slice(0,700),
 "Explain in two short sentences:"
 ].join("\n"):"";
 return {question:q,evidence,prompt};
}
export function tutorFallback(question,notes){
 const context=tutorContext(question,notes);
 return context.evidence.length?{
  text:"Here's the closest passage from your recording. Read it, then try explaining the idea in your own words. Which part would you like to explore?",
  evidence:context.evidence,mode:"evidence"
 }:{text:"I couldn't find a supported explanation in this recording. Try asking about a topic mentioned in it.",evidence:[],mode:"evidence"};
}
