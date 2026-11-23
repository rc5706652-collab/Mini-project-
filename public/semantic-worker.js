// Optional on-device semantic retrieval (no hosted inference, no generated claims).
// Lazy model download happens only when the user asks a question.
import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";

let extractorPromise=null, indexedKey="", indexed=[];
async function extractor() {
  if (!extractorPromise) {
    postMessage({ type:"stage", message:"Downloading local semantic search model (first use only)…" });
    extractorPromise=pipeline("feature-extraction","Xenova/all-MiniLM-L6-v2",{
      device:"wasm", dtype:"q8",
      progress_callback:p=>{
        if(p.status==="progress"&&Number.isFinite(p.progress))postMessage({type:"download",progress:Math.round(p.progress)});
      }
    }).catch(e=>{extractorPromise=null;throw e;});
  }
  return extractorPromise;
}
function splitTensor(tensor,count){
  const data=tensor.data, stride=data.length/count, out=[];
  for(let i=0;i<count;i++)out.push(Float32Array.from(data.subarray(i*stride,(i+1)*stride)));
  return out;
}
async function embed(items,pipe) {
  const vectors=[];
  for(let i=0;i<items.length;i+=8){
    const batch=items.slice(i,i+8);
    const output=await pipe(batch,{pooling:"mean",normalize:true});
    vectors.push(...splitTensor(output,batch.length));
    postMessage({type:"index-progress",progress:Math.round(100*Math.min(items.length,i+8)/items.length)});
  }
  return vectors;
}
function similarity(a,b){let score=0;for(let i=0;i<Math.min(a.length,b.length);i++)score+=a[i]*b[i];return score;}
self.onmessage=async({data})=>{
  if(data?.type!=="query")return;
  const {question,documents,cacheKey,requestId}=data;
  try{
    if(!Array.isArray(documents)||!documents.length||!String(question).trim())throw Error("Enter a question about your transcript.");
    const pipe=await extractor();
    if(cacheKey!==indexedKey){
      postMessage({type:"stage",message:"Building a private index of your transcript…"});
      indexed=await embed(documents,pipe);
      indexedKey=cacheKey;
    }
    const q=(await pipe([question],{pooling:"mean",normalize:true})).data;
    const matches=indexed.map((vector,index)=>({index,score:similarity(q,vector)}))
      .filter(entry=>entry.score>=.27)
      .sort((a,b)=>b.score-a.score).slice(0,3);
    postMessage({type:"answer",requestId,matches});
  }catch(err){
    postMessage({type:"error",requestId,message:err?.message||"Semantic model unavailable."});
  }
};
