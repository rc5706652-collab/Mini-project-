// Large, optional browser-side NLLB translator, loaded only on explicit request.
// The original Whisper transcript is retained, even if translation fails.
import {pipeline} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";
let translator=null,loading=null;
const MODEL="Xenova/nllb-200-distilled-600M";
self.onmessage=async({data})=>{
 if(data?.type!=="translate")return;
 const {requestId,text,sourceCode,targetCode}=data;
 try{
  if(!sourceCode||!targetCode)throw Error("Choose a specific recording language for translation.");
  if(!translator){
   self.postMessage({type:"stage",requestId,message:"Downloading optional multilingual translation model. It can exceed 1 GB and may not fit on mobile devices."});
   loading??=pipeline("translation",MODEL,{
    device:"wasm",dtype:"q8",progress_callback:p=>{
     if(p.status==="progress"&&Number.isFinite(p.progress))self.postMessage({type:"progress",requestId,progress:Math.round(p.progress)});
    }
   });
   translator=await loading;
   loading=null;
  }
  const {translationChunks}=await import("./speech-languages.js");
  const chunks=translationChunks(text);
  const output=[];
  for(let i=0;i<chunks.length;i++){
   self.postMessage({type:"stage",requestId,message:"Translating section "+(i+1)+" of "+chunks.length});
   const result=await translator(chunks[i],{src_lang:sourceCode,tgt_lang:targetCode,max_new_tokens:320});
   const translated=String(result?.[0]?.translation_text||"").trim();
   if(!translated)throw Error("Translation returned no text.");
   output.push(translated);
  }
  self.postMessage({type:"complete",requestId,text:output.join(" ").trim()});
 }catch(error){
  loading=null;
  self.postMessage({type:"error",requestId,message:error?.message||"Translation unavailable."});
 }
};
