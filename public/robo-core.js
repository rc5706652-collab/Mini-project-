// Pure robot intent + grounded answer helpers. No browser, GPU or API dependency.
import { lexicalEvidence } from "./study.js";
const nice = text => String(text||"").trim().slice(0,450);
export function robotIntent(input) {
 const value=nice(input).toLowerCase().replace(/[?.!,]/g," ").replace(/\s+/g," ").trim();
 if(/^(?:hi|hello|hey|hey robo|hello robo|good morning|good evening|namaste)$/.test(value))return "hello";
 if(/^(?:thank you|thanks|thank you robo|thanks robo)$/.test(value))return "thanks";
 if(/^(?:open|go to|show|take me to|launch) (?:the )?(?:ai )?studio$/.test(value))return "studio";
 if(/^(?:start|make|create|open) (?:a )?new (?:recording|session|note)$/.test(value))return "new";
 if(/^(?:open|show|go to) (?:my |the )?(?:library|saved notes|knowledge memory)$/.test(value))return "library";
 if(/^(?:open|show|go to) (?:the )?(?:quiz|quiz arena)$/.test(value))return "quiz";
 if(/^(?:open|show|go to) (?:the )?(?:galaxy|knowledge galaxy)$/.test(value))return "galaxy";
 if(/^(?:open|show|go to) (?:the )?(?:tutor|ai tutor)$/.test(value))return "tutor";
 return "question";
}
export function evidenceFor(question,notes,limit=3) {
 if(!notes?.transcript)return [];
 return lexicalEvidence(nice(question),notes.transcript,limit).map(e=>e.text).filter(e=>notes.transcript.includes(e));
}
export function fallbackAnswer(question,notes) {
 const sources=evidenceFor(question,notes);
 if(!sources.length)return {text:"I couldn't find that in your current recording. I can try a small local AI answer instead, but please verify important details.",sources:[],kind:"unsupported"};
 return {text:"From your recording: "+sources[0],sources,kind:"source"};
}
export function chatPrompt(question,notes,history=[]) {
 const input=nice(question);
 const source=evidenceFor(question,notes);
 const recent=history.filter(turn=>turn?.role==="user"||turn?.role==="assistant")
   .slice(-4).map(turn=>(turn.role==="user"?"User: ":"Assistant: ")+String(turn.text||"").slice(0,110)).join("\n");
 const context=source.length ? source.join(" ").slice(0,760) : "";
 const prompt=context?[
  "Answer this question using ONLY the provided lecture excerpt. If not answered there, say that it is not covered. Give one or two short clear sentences.",
  "Lecture excerpt: "+context,"Question: "+input,"Answer:"
 ]:[
  "Answer this question in a short clear friendly way. If you do not know, say you are not sure. Do not pretend to know current events.",
  recent,"Question: "+input,"Answer:"
 ];
 return {prompt:prompt.filter(Boolean).join("\n").slice(0,1190),sources:source,grounded:source.length>0};
}
export function robotStateLabel(state) {
 return ({idle:"Here to help",listening:"Listening to you",thinking:"Thinking locally",speaking:"Talking to you",happy:"Ready for more",error:"Something went wrong"})[state]||"Here to help";
}
