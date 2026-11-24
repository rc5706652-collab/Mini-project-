// Source language -> desired transcript language. No browser/network side effects.
export const LANGUAGE_LABELS=Object.freeze({
 auto:"Detect automatically",en:"English",hi:"Hindi",kn:"Kannada",te:"Telugu",ta:"Tamil",
 ml:"Malayalam",bn:"Bengali",mr:"Marathi",gu:"Gujarati",pa:"Punjabi",ur:"Urdu",
 es:"Spanish",fr:"French",de:"German",ar:"Arabic",pt:"Portuguese",ja:"Japanese"
});
export const NLLB_CODES=Object.freeze({
 en:"eng_Latn",hi:"hin_Deva",kn:"kan_Knda",te:"tel_Telu",ta:"tam_Taml",
 ml:"mal_Mlym",bn:"ben_Beng",mr:"mar_Deva",gu:"guj_Gujr",pa:"pan_Guru",ur:"urd_Arab",
 es:"spa_Latn",fr:"fra_Latn",de:"deu_Latn",ar:"arb_Arab",pt:"por_Latn",ja:"jpn_Jpan"
});
export function normalizeSpeechLanguage(code){
 return Object.hasOwn(LANGUAGE_LABELS,code)?code:"auto";
}
export function normalizeTargetLanguage(code){
 if(code==="original")return "original";
 if(code==="english")return "en"; // backwards compatibility with existing workflow
 return Object.hasOwn(NLLB_CODES,code)?code:"original";
}
export function speechPlan(source,requested){
 const language=normalizeSpeechLanguage(source);
 const target=normalizeTargetLanguage(requested);
 // Source-auto + another output must first use Whisper's English translation
 // because Whisper doesn't surface a reliable source language code.
 const bridge=language==="auto"&&target!=="original"&&target!=="en";
 const whisperOutput=bridge||target==="en"&&language!=="en"?"english":"original";
 const from=bridge?"en":language;
 const translate=target!=="original"&&target!==from&&whisperOutput!=="english";
 const secondStage=bridge&&target!=="en";
 return {source:language,target,whisperOutput,bridgeEnglish:bridge,translate:translate||secondStage,sourceCode:NLLB_CODES[from]||null,targetCode:NLLB_CODES[target]||null,
 originalIsBridge:bridge};
}
export function translationChunks(value,maxChars=480){
 const text=String(value||"").trim();
 const words=text.split(/\s+/),parts=[];let block="";
 for(const w of words){
  if(!w)continue;
  if(block.length+w.length+1>maxChars&&block){parts.push(block);block="";}
  block=block?block+" "+w:w;
 }
 if(block)parts.push(block);
 return parts;
}
export function languageName(code){return LANGUAGE_LABELS[code]||LANGUAGE_LABELS.en;}
