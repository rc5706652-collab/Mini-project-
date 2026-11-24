// Optional true on-device model inference. It never posts questions to a backend.
// Fast mode uses FLAN-T5 Small on CPU; Enhanced mode uses quantized Qwen on WebGPU.
import {pipeline} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";
let current=null,loader=null,currentMode=null;
async function load(mode,requestId){
 if(current && currentMode===mode)return current;
 if(current){await current.dispose?.();current=null;}
 currentMode=mode;
 const enhanced=mode==="enhanced";
 if(enhanced && !self.navigator?.gpu)throw Error("Enhanced local AI requires a browser with WebGPU. Choose Fast local instead.");
 const name=enhanced?"onnx-community/Qwen2.5-0.5B-Instruct":"Xenova/flan-t5-small";
 loader=pipeline(enhanced?"text-generation":"text2text-generation",name,{
  device:enhanced?"webgpu":"wasm",dtype:enhanced?"q4":"q8",
  progress_callback:p=>{
   if(p.status==="progress"&&Number.isFinite(p.progress))
    self.postMessage({type:"progress",requestId,progress:Math.round(p.progress)});
  }
 });
 try{current=await loader;return current;}
 catch(e){currentMode=null;current=null;throw e;}
 finally{loader=null;}
}
self.onmessage=async({data})=>{
 if(data?.type!=="ask")return;
 const {requestId,mode="fast",prompt="",messages=[]}=data;
 try{
  self.postMessage({type:"stage",requestId,message:"Preparing local AI model…"});
  const model=await load(mode,requestId);
  self.postMessage({type:"stage",requestId,message:"Thinking on your device…"});
  let reply="";
  if(mode==="enhanced"){
   const result=await model(messages,{max_new_tokens:155,do_sample:false});
   const generated=result?.[0]?.generated_text;
   reply=Array.isArray(generated)?String(generated.at(-1)?.content||""):String(generated||"");
  }else{
   const result=await model(String(prompt).slice(0,1600),{max_new_tokens:145,do_sample:false});
   reply=String(result?.[0]?.generated_text||"");
  }
  self.postMessage({type:"answer",requestId,answer:reply.trim()});
 }catch(error){
  self.postMessage({type:"error",requestId,message:error?.message||"Local model couldn't run."});
 }
};
