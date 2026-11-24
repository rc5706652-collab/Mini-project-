// Pure helpers. Only the current transcript is used as evidence; no fabricated citations.
import {lexicalEvidence} from "./study.js";
export const CHAT_MODELS=Object.freeze({
 fast:{id:"Xenova/flan-t5-small",label:"Fast local · small CPU model"},
 enhanced:{id:"onnx-community/Qwen2.5-0.5B-Instruct",label:"Enhanced · WebGPU required"}
});
export function quickAnswer(input){
 const text=String(input||"").trim().toLowerCase().replace(/[!?.,]/g,"");
 if(/^(hi|hello|hey|hey pip|hi pip|good morning)$/.test(text))
  return "Hi! I'm Pip, your NoteWave study companion. Ask a question, tell me about a topic, or generate notes from a recording. ✨";
 if(/^(who are you|what are you|what can you do|help|how can you help)$/.test(text))
  return "I'm Pip! I can answer general questions using an optional on-device language model, explain concepts from your recording, and help you find notes, flashcards, and quizzes. Press the microphone to ask with your voice.";
 if(/^(how do i record|how to record|how do i upload audio|how to upload audio)$/.test(text))
  return "Open AI Studio, choose Record live or Upload audio, then select Generate intelligence. Once the transcript is ready, you can ask me questions about it.";
 return null;
}
export function prepareQuestion(question,{mode="general",notes=null,history=[]}={}){
 const text=String(question||"").trim().slice(0,450);
 if(!text)return {error:"Type or speak a question first.",evidence:[],prompt:"",messages:[]};
 if(mode==="notes"){
  if(!notes?.transcript)return {error:"Generate or open a recording first, then choose Ask my recording.",evidence:[],prompt:"",messages:[]};
  const matches=lexicalEvidence(text,notes.transcript,3);
  const evidence=matches.map(x=>x.text).slice(0,3);
  if(!evidence.length)return {error:"I couldn't find that information in your recording. Try a phrase mentioned in it.",evidence:[],prompt:"",messages:[]};
  const passage=evidence.join(" ").slice(0,900);
  const instruction="Answer the question using ONLY the lecture excerpt below. If the answer isn't in the excerpt, say it is not in the recording. Keep it concise.";
  const prompt=instruction+"\nExcerpt: "+passage+"\nQuestion: "+text+"\nAnswer:";
  return {error:null,evidence,prompt,messages:[
   {role:"system",content:"You are Pip, a careful study assistant. Only answer from the supplied recording excerpt. If uncertain, say you don't know. Answer in 2-4 sentences."},
   {role:"user",content:"Recording excerpt: "+passage+"\nQuestion: "+text}
  ]};
 }
 if(/\b(right now|live score|today's weather|current stock price)\b/i.test(text))
  return {error:"I don't have live internet information. I can answer general study questions, but I can't verify real-time facts.",evidence:[],prompt:"",messages:[]};
 const recent=history.filter(x=>(x.role==="user"||x.role==="assistant")&&x.content).slice(-4)
  .map(x=>(x.role==="user"?"User: ":"Assistant: ")+String(x.content).slice(0,160)).join("\n");
 return {error:null,evidence:[],prompt:"Answer this question accurately in 2-4 clear sentences. If unsure, say you don't know.\n"+recent+"\nQuestion: "+text+"\nAnswer:",
 messages:[{role:"system",content:"You are Pip, a friendly concise learning assistant. Answer accurately; admit uncertainty. You have no live internet."},
 ...history.filter(x=>x.role==="user"||x.role==="assistant").slice(-4).map(x=>({role:x.role,content:String(x.content).slice(0,250)})),
 {role:"user",content:text}]};
}
export function sanitizeModelAnswer(value,maximum=1400){
 const raw=String(value??"").trim();
 return raw.replace(/^(assistant|answer)\s*:\s*/i,"").slice(0,maximum).trim();
}
