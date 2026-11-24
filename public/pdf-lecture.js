// Client-side text extraction only: PDF contents never leave this device.
// Use PDF.js's published browser build directly (not the problematic ESM wrapper).
export const PDFJS_VERSION="4.10.38";
const CDN="https://cdn.jsdelivr.net/npm/pdfjs-dist@"+PDFJS_VERSION+"/build/";
export const MAX_PDF_BYTES=15*1024*1024;
export const MAX_PDF_PAGES=100;
export const MAX_PDF_CHARS=120000;
export function validateLecturePdf(file){
 if(!file)throw Error("Choose a lecture PDF first.");
 if(file.size===0)throw Error("This PDF is empty.");
 if(file.size>MAX_PDF_BYTES)throw Error("Please choose a PDF smaller than 15 MB. You can split a larger lecture into chapters.");
 if(!/\.pdf$/i.test(String(file.name||"")) && file.type!=="application/pdf")
  throw Error("Only PDF files can be used for this quiz source.");
 return true;
}
export function normalizePdfText(value){
 return String(value??"").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g," ")
  .replace(/[ \t\u00a0]+/g," ").replace(/\s*\n\s*/g,"\n")
  .replace(/\n{3,}/g,"\n\n").trim();
}
export function pageForEvidence(pages,evidence){
 const excerpt=normalizePdfText(evidence).replace(/\s+/g," ").toLocaleLowerCase();
 if(!excerpt)return null;
 for(const p of pages||[]){
  const source=normalizePdfText(p.text).replace(/\s+/g," ").toLocaleLowerCase();
  if(source.includes(excerpt)||source.includes(excerpt.slice(0,Math.min(excerpt.length,85))))return p.page;
 }
 const tokens=excerpt.match(/[\p{L}\p{N}]+/gu)||[];
 let winner=null,score=0;
 for(const p of pages||[]){
  const source=normalizePdfText(p.text).toLocaleLowerCase();
  const count=tokens.filter(t=>t.length>=4&&source.includes(t)).length;
  if(count>score){score=count;winner=p.page;}
 }
 return score>=Math.min(3,tokens.length)?winner:null;
}
export async function extractLecturePdf(file,{onProgress=()=>{},library=null}={}){
 validateLecturePdf(file);
 let lib=library,loading=null,doc=null;
 if(!lib){
  try{lib=await import(CDN+"pdf.mjs");}
  catch{throw Error("PDF reader could not load. Check your internet connection and retry.");}
 }
 if(!lib?.getDocument)throw Error("PDF reader is unavailable.");
 if(lib.GlobalWorkerOptions)lib.GlobalWorkerOptions.workerSrc=CDN+"pdf.worker.mjs";
 try{
  loading=lib.getDocument({
   data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,
   useSystemFonts:true
  });
  doc=await loading.promise;
  if(doc.numPages>MAX_PDF_PAGES)throw Error("This PDF has "+doc.numPages+" pages; the current limit is 100. Split the lecture into smaller PDFs.");
  const pages=[],result=[];
  let total=0;
  for(let n=1;n<=doc.numPages;n++){
   const page=await doc.getPage(n);
   const contents=await page.getTextContent();
   const lines=[];let line="";
   for(const item of contents.items||[]){
    if(typeof item.str!=="string")continue;
    const word=item.str.trim();
    if(word)line+=(line?" ":"")+word;
    if(item.hasEOL && line){lines.push(line);line="";}
   }
   if(line)lines.push(line);
   const text=normalizePdfText(lines.join("\n"));
   pages.push({page:n,text});
   if(text){result.push(text);total+=text.length;}
   page.cleanup?.();
   if(total>MAX_PDF_CHARS)throw Error("The lecture contains over 120,000 characters. Split the PDF into shorter chapters.");
   onProgress({page:n,total:doc.numPages,characters:total});
  }
  const text=normalizePdfText(result.join("\n"));
  if(text.length<80)throw Error("This PDF has too little selectable text to create reliable questions. If it contains scanned pages or photos, please use a text/OCR version.");
  return {title:String(file.name||"Lecture PDF").slice(0,140),text,pages,pageCount:doc.numPages,characters:text.length};
 }catch(error){
  if(error?.name==="PasswordException")throw Error("This PDF is password-protected. Unlock it locally before uploading.");
  if(error?.name==="InvalidPDFException"||error?.name==="MissingPDFException")
   throw Error("This PDF cannot be read. Please check that the file is valid.");
  throw error;
 }finally{
  try{await doc?.destroy?.();}catch{}
  if(!doc)try{await loading?.destroy?.();}catch{}
 }
}
