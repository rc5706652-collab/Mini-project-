// Per-language browser-side Whisper recognition. No audio upload to a backend.
import {pipeline} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";
import {resolveWhisperModel,whisperCallOptions} from "./whisper-config.js";
let recognizer=null,activeModel=null,loading=null;
const RATE=16000,CHUNK_SECONDS=25;
async function loadModel(id){
 if(recognizer&&activeModel===id)return recognizer;
 if(recognizer){await recognizer.dispose?.();recognizer=null;activeModel=null;}
 if(!loading){
  self.postMessage({type:"stage",message:"Loading "+(id.endsWith(".en")?"English":"multilingual")+" Whisper model…"});
  loading=pipeline("automatic-speech-recognition",id,{
   device:"wasm",dtype:"q8",
   progress_callback:p=>{if(p.status==="progress"&&Number.isFinite(p.progress))self.postMessage({type:"download",progress:Math.round(p.progress)})}
  }).catch(e=>{loading=null;throw e});
 }
 recognizer=await loading;activeModel=id;loading=null;return recognizer;
}
self.onmessage=async({data})=>{
 if(data?.type!=="transcribe"||!data.samples)return;
 const {language="en",output="original",samples}=data;
 try{
  const id=resolveWhisperModel(language,output),asr=await loadModel(id);
  const size=RATE*CHUNK_SECONDS,total=Math.max(1,Math.ceil(samples.length/size)),segments=[];
  for(let i=0;i<total;i++){
   self.postMessage({type:"stage",message:"Transcribing segment "+(i+1)+" of "+total});
   const chunk=samples.subarray(i*size,Math.min(samples.length,(i+1)*size));
   const result=await asr(chunk,whisperCallOptions(id,language,output));
   const text=String(result?.text||"").trim();
   if(text)segments.push({text,start:i*CHUNK_SECONDS,end:Math.min(samples.length/RATE,(i+1)*CHUNK_SECONDS)});
   self.postMessage({type:"segment",index:i+1,total,text,progress:Math.round((i+1)/total*100)});
  }
  self.postMessage({type:"complete",text:segments.map(s=>s.text).join(" ").trim(),segments,language,output});
 }catch(error){self.postMessage({type:"error",message:error?.message||"Speech recognition failed"});}
};
