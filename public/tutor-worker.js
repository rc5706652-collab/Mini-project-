// Optional local generative explanations; downloaded on first explicit request.
import {pipeline} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";
let loading=null;
self.onmessage=async({data})=>{
 if(data?.type!=="explain")return;
 const {requestId,prompt}=data;
 try{
  if(!loading)loading=pipeline("text2text-generation","Xenova/flan-t5-small",{
    device:"wasm",dtype:"q8",
    progress_callback:p=>{if(p.status==="progress"&&Number.isFinite(p.progress))self.postMessage({type:"progress",requestId,progress:Math.round(p.progress)})}
  }).catch(e=>{loading=null;throw e});
  const model=await loading;
  const result=await model(String(prompt).slice(0,1100),{max_new_tokens:110});
  self.postMessage({type:"result",requestId,answer:String(result?.[0]?.generated_text||"").trim()});
 }catch(e){self.postMessage({type:"error",requestId,message:e.message||"Local tutor model unavailable"});}
};
