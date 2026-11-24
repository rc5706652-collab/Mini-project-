// Fast path: use an ALREADY INSTALLED browser translation language pack.
// Never auto-download another language pack; no paid API and no data sent to a server.
// Browsers without this feature fall back to the smaller local q4 NLLB model.
import {NLLB_CODES,translationChunks} from "./speech-languages.js";
const codeToLocale=Object.fromEntries(Object.entries(NLLB_CODES).map(([locale,code])=>[code,locale]));
export function translationLocales(plan){
 const sourceLanguage=codeToLocale[plan?.sourceCode];
 const targetLanguage=codeToLocale[plan?.targetCode];
 if(!sourceLanguage||!targetLanguage||sourceLanguage===targetLanguage)return null;
 return {sourceLanguage,targetLanguage};
}
export async function translateAlreadyInstalled(text,plan,{api=globalThis.Translator,onProgress=()=>{},isCurrent=()=>true}={}){
 const languages=translationLocales(plan);
 if(!languages||!api||typeof api.availability!=="function"||typeof api.create!=="function")return null;
 let engine=null;
 try{
  // 'downloadable' and 'downloading' aren't the fast path and can require a user gesture.
  const status=await api.availability(languages);
  if(!isCurrent())throw Error("Translation cancelled.");
  if(status!=="available")return null;
  engine=await api.create(languages);
  if(!isCurrent())throw Error("Translation cancelled.");
  const blocks=translationChunks(text,1400),output=[];
  for(let i=0;i<blocks.length;i++){
   if(!isCurrent())throw Error("Translation cancelled.");
   onProgress({index:i+1,total:blocks.length,provider:"browser"});
   const translated=String(await engine.translate(blocks[i])||"").trim();
   if(!isCurrent())throw Error("Translation cancelled.");
   if(!translated)return null;
   output.push(translated);
  }
  return output.join(" ").trim()||null;
 }catch(error){
  if(!isCurrent()||error?.message==="Translation cancelled.")throw error;
  // Installed pack was unavailable/broken: let the local fallback handle it.
  return null;
 }finally{
  try{engine?.destroy?.();}catch{}
 }
}
