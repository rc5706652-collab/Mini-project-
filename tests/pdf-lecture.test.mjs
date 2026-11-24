import test from "node:test";
import assert from "node:assert/strict";
import {
 PDFJS_VERSION,MAX_PDF_BYTES,MAX_PDF_PAGES,
 validateLecturePdf,normalizePdfText,pageForEvidence,extractLecturePdf
} from "../public/pdf-lecture.js";
const makeFile=(name="lecture.pdf",size=1024)=>({
 name,type:"application/pdf",size,async arrayBuffer(){return new Uint8Array([37,80,68,70,45,49,46,55]).buffer;}
});
function pdfMock(pageStrings,{onDestroy=()=>{}}={}){
 const pdfPages=pageStrings.map(t=>({
  async getTextContent(){return {items:t.split(/\s+/).filter(Boolean).map((str,i,a)=>({str,hasEOL:i===a.length-1}))};},
  cleanup(){}
 }));
 return {
  GlobalWorkerOptions:{workerSrc:null},
  getDocument:()=>({promise:Promise.resolve({
   numPages:pdfPages.length,
   async getPage(n){return pdfPages[n-1];},
   async destroy(){onDestroy();}
  })})
 };
}
test("PDF size, name and empty file checks",()=>{
 assert.equal(validateLecturePdf(makeFile()),true);
 assert.throws(()=>validateLecturePdf(makeFile("image.png")),/Only PDF/);
 assert.throws(()=>validateLecturePdf(makeFile("oversized.pdf",MAX_PDF_BYTES+1)),/smaller than 15 MB/);
 assert.throws(()=>validateLecturePdf(makeFile("empty.pdf",0)),/empty/);
 assert.equal(PDFJS_VERSION,"4.10.38");
});
test("PDF extraction preserves pages, Unicode and operates solely on file buffers",async()=>{
 let destroyed=0;
 const text1="Solar panels convert sunlight into electrical energy and photovoltaic cells are used for solar power generation by engineers.";
 const text2="Renewable batteries store energy and students must submit their project report by Friday. Scientific experiments explain the results.";
 const events=[];
 const result=await extractLecturePdf(makeFile(),{
  library:pdfMock([text1,text2],{onDestroy(){destroyed++;}}),
  onProgress:e=>events.push(e)
 });
 assert.equal(result.pageCount,2);
 assert.equal(result.pages.length,2);
 assert.equal(destroyed,1);
 assert.ok(result.text.includes("Solar panels"));
 assert.ok(result.text.includes("Scientific experiments"));
 assert.equal(events[1].page,2);
 assert.equal(pageForEvidence(result.pages,text2),2);
 assert.equal(pageForEvidence(result.pages,"Solar panels convert sunlight into electrical energy"),1);
 assert.ok(/^https:\/\/cdn\.jsdelivr\.net\/npm\/pdfjs-dist@/.test((await import("../public/pdf-lecture.js")).PDFJS_VERSION ? "https://cdn.jsdelivr.net/npm/pdfjs-dist@"+PDFJS_VERSION:""));
});
test("PDF normalization does not destroy non-Latin lecture text",()=>{
 assert.equal(normalizePdfText("   ಕನ್ನಡ   ಭಾಷೆ. \n\n\n தமிழ்   மொழி.  "),"ಕನ್ನಡ ಭಾಷೆ.\n\nதமிழ் மொழி.");
 assert.equal(pageForEvidence([{page:3,text:"ಕನ್ನಡ ಭಾಷೆ ಕಲಿಯಿರಿ. ಮಕ್ಕಳಿಗೆ ಸಹಾಯ ಮಾಡಿ."}],"ಕನ್ನಡ ಭಾಷೆ ಕಲಿಯಿರಿ."),3);
});
test("PDF with no selectable text raises actionable OCR message",async()=>{
 await assert.rejects(()=>extractLecturePdf(makeFile(),{library:pdfMock(["",""])}),/selectable text/);
});
test("large PDFs are rejected without truncation",async()=>{
 const pages=new Array(MAX_PDF_PAGES+1).fill("Long scientific lecture text for practice.");
 await assert.rejects(()=>extractLecturePdf(makeFile(),{library:pdfMock(pages)}),/limit is 100/);
});
