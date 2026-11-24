// Compact local fallback for languages not already available to the browser.
// 4-bit weights reduce first-load bytes compared with the previous >1 GB q8 model.
// Hugging Face cache avoids repeated downloads on the same browser/profile.
// Original recognized speech is preserved even if this optional translation fails.
import {pipeline,env} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";
import {translationChunks} from "./speech-languages.js";
env.useBrowserCache=true;
const MODEL="Xenova/nllb-200-distilled-600M";
let translator=null,loading=null;
function reportFile(progress,requestId){
 if(progress?.status!=="progress")return;
 const amount=Number(progress.progress);
 if(!Number.isFinite(amount))return;
 // Each model file reports its own progress. Never label it as whole-model %.
 const file=String(progress.file||"Model component").split("/").pop().slice(0,80);
 self.postMessage({type:"progress",requestId,progress:Math.max(0,Math.min(100,Math.round(amount))),file});
}
self.onmessage=async({data})=>{
 if(data?.type!=="translate")return;
 const {requestId,text,sourceCode,targetCode}=data;
 try{
  if(!sourceCode||!targetCode)throw Error("Choose a specific recording language for translation.");
  if(!translator){
   self.postMessage({type:"stage",requestId,message:"Loading the compact 4-bit offline translation model. First use still needs a download; later uses reuse the browser cache."});
   loading??=pipeline("translation",MODEL,{
    device:"wasm",dtype:"q4",progress_callback:p=>reportFile(p,requestId)
   });
   translator=await loading;
   loading=null;
  }
  const chunks=translationChunks(text,500),output=[];
  for(let i=0;i<chunks.length;i++){
   self.postMessage({type:"stage",requestId,message:"Translating section "+(i+1)+" of "+chunks.length+" locally…"});
   const result=await translator(chunks[i],{src_lang:sourceCode,tgt_lang:targetCode,max_new_tokens:320});
   const translated=String(result?.[0]?.translation_text||"").trim();
   if(!translated)throw Error("Translation returned no text.");
   output.push(translated);
  }
  self.postMessage({type:"complete",requestId,text:output.join(" ").trim()});
 }catch(error){
  loading=null;
  self.postMessage({type:"error",requestId,message:error?.message||"The compact translation model could not load. Your original transcript is safe."});
 }
};
