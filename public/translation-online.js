// Optional fast online translation. Never called without an explicit user's click.
// IMPORTANT PRIVACY: sends transcript TEXT (not audio) to a third-party service.
// No secret keys or paid APIs. MyMemory's anonymous limit is ~5000 chars/day;
// 500 BYTES per query. We stay below both and NEVER silently truncate.
import {translationLocales} from "./translation-fastpath.js";
export const TRANSLATION_ENDPOINT="https://api.mymemory.translated.net/get";
export const MAX_FAST_BYTES=4200;
export const MAX_CHUNK_BYTES=430;
export const MAX_TOTAL_MS=45000;
export function utf8Length(text){return new TextEncoder().encode(String(text||"")).length;}
export function splitForTranslation(text,maxBytes=MAX_CHUNK_BYTES){
 if(!Number.isInteger(maxBytes)||maxBytes<4)throw Error("Invalid translation chunk size");
 const out=[];let part="",size=0;
 for(const codepoint of String(text??"").trim()){
  const width=utf8Length(codepoint);
  if(size+width>maxBytes&&part){
   const splitAt=part.lastIndexOf(" ");
   if(splitAt>=part.length*.4&&splitAt>0){
    out.push(part.slice(0,splitAt).trim());part=part.slice(splitAt+1);size=utf8Length(part);
   }else{out.push(part.trim());part="";size=0;}
  }
  part+=codepoint;size+=width;
 }
 if(part.trim())out.push(part.trim());
 return out.filter(Boolean);
}
export function validateFastTranslation(text,plan){
 const languages=translationLocales(plan);
 if(!languages)throw Error("Select two different supported languages for translation.");
 const bytes=utf8Length(text);
 if(!bytes)throw Error("The transcript is empty.");
 if(bytes>MAX_FAST_BYTES)throw Error("Free online translation supports up to 4,200 UTF-8 bytes per request session. Your full transcript remains available in its original language; split the lecture into smaller sections or use an installed browser translator.");
 return languages;
}
function decodeEntities(s){
 return String(s).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(0x10ffff,Number(n))))
  .replace(/&#x([a-f0-9]+);/gi,(_,n)=>String.fromCodePoint(Math.min(0x10ffff,parseInt(n,16))))
  .replace(/&(?:amp|quot|apos|lt|gt|#39);/g,entity=>({"&amp;":"&","&quot;":'"',"&apos;":"'","&lt;":"<","&gt;":">","&#39;":"'"}[entity]||entity));
}
export async function translateOnlineWithConsent(text,plan,{
 fetchImpl=fetch,onProgress=()=>{},signal,timeoutMs=10000
}={}){
 const pair=validateFastTranslation(text,plan);
 if(signal?.aborted)throw Error("Translation cancelled.");
 const segments=splitForTranslation(text);
 const output=[],start=Date.now();
 for(let i=0;i<segments.length;i++){
  if(signal?.aborted)throw Error("Translation cancelled.");
  if(Date.now()-start>MAX_TOTAL_MS)throw Error("The free translation service is taking too long. Your original notes remain ready.");
  const url=new URL(TRANSLATION_ENDPOINT);
  url.searchParams.set("q",segments[i]);
  url.searchParams.set("langpair",pair.sourceLanguage+"|"+pair.targetLanguage);
  const controller=new AbortController();
  const abort=()=>controller.abort();
  signal?.addEventListener("abort",abort,{once:true});
  const timer=setTimeout(()=>controller.abort(),Math.min(timeoutMs,Math.max(1000,MAX_TOTAL_MS-(Date.now()-start))));
  try{
   onProgress({index:i+1,total:segments.length,provider:"mymemory"});
   const response=await fetchImpl(url.toString(),{
    method:"GET",headers:{"Accept":"application/json"},signal:controller.signal,
    credentials:"omit",cache:"no-store",referrerPolicy:"no-referrer"
   });
   if(!response?.ok)throw Error(response?.status===429?"Free translation quota or rate limit reached.":"Translation service temporarily unavailable.");
   const body=await response.json();
   if(body?.responseStatus!==200||typeof body?.responseData?.translatedText!=="string")
    throw Error("Translation service returned an unsupported response or reached its usage limit.");
   const translated=decodeEntities(body.responseData.translatedText).trim();
   if(!translated)throw Error("Translation service returned empty text.");
   output.push(translated);
  }catch(error){
   if(signal?.aborted)throw Error("Translation cancelled.");
   if(controller.signal.aborted)throw Error("The translation request timed out. The original transcript and notes are safe.");
   throw error;
  }finally{
   clearTimeout(timer);
   signal?.removeEventListener("abort",abort);
  }
 }
 return output.join(" ").trim();
}
