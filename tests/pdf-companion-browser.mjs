import assert from "node:assert/strict";
import {chromium,webkit} from "playwright";
import {startStaticServer} from "./static-server.mjs";
const PORT=8776,root="http://127.0.0.1:"+PORT;
const server=await startStaticServer(PORT);
const lecture=[
 "Solar panels convert sunlight into electricity using photovoltaic cells during clear daytime conditions.",
 "Energy storage batteries save electricity for later use when sunlight is unavailable.",
 "A solar inverter changes direct current into alternating current for common household devices.",
 "Renewable energy technologies help reduce dependence on fossil fuel sources in modern cities.",
 "Wind turbines generate electrical power from moving air through rotating blades and generators.",
 "Engineers measure voltage and current to study how well solar modules perform in experiments.",
 "Students should submit the renewable energy project report by Friday after reviewing their tests.",
 "Scientific experiments compare different materials to understand energy conversion efficiency.",
 "Power transmission networks deliver electricity from generating stations to distant users.",
 "Smart controllers help regulate the flow of stored electricity between batteries and appliances."
];
// A real one-page PDF document, not a renamed plain-text file.
function makePdf(lines){
 const safe=value=>String(value).replace(/[\\()]/g,"\\$&");
 const operators=["BT","/F1 12 Tf","45 747 Td"];
 for(let i=0;i<lines.length;i++){
  if(i)operators.push("0 -23 Td");
  operators.push("("+safe(lines[i])+") Tj");
 }
 operators.push("ET");
 const stream=operators.join("\n")+"\n";
 const objects=[
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  "<< /Length "+Buffer.byteLength(stream,"latin1")+" >>\nstream\n"+stream+"endstream"
 ];
 let pdf="%PDF-1.4\n",offsets=[0];
 for(let i=0;i<objects.length;i++){
  offsets.push(Buffer.byteLength(pdf,"latin1"));
  pdf+=(i+1)+" 0 obj\n"+objects[i]+"\nendobj\n";
 }
 const xref=Buffer.byteLength(pdf,"latin1");
 pdf+="xref\n0 "+(objects.length+1)+"\n0000000000 65535 f \n";
 for(const off of offsets.slice(1))pdf+=String(off).padStart(10,"0")+" 00000 n \n";
 pdf+="trailer\n<< /Root 1 0 R /Size "+(objects.length+1)+" >>\nstartxref\n"+xref+"\n%%EOF\n";
 return Buffer.from(pdf,"latin1");
}
const validPdf=makePdf(lecture);
let chrome,safari;
async function testFlow(browser,{mobile=false,mockPDF=false}={}){
 const context=await browser.newContext({
  viewport:mobile?{width:390,height:844}:{width:1370,height:860},
  hasTouch:mobile,isMobile:mobile,reducedMotion:mobile?"reduce":"no-preference"
 });
 const page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 if(mockPDF){
  await page.route("**/pdfjs-dist@4.10.38/build/pdf.mjs",route=>route.fulfill({
   status:200,headers:{"access-control-allow-origin":"*","content-type":"text/javascript"},
   body:"export const GlobalWorkerOptions={workerSrc:''};"+
   "export const getDocument=()=>({promise:Promise.resolve({"+
    "numPages:1,getPage:async()=>({getTextContent:async()=>({items:"+
     JSON.stringify(lecture.map(x=>({str:x,hasEOL:true})))+
    "}),cleanup(){}}),destroy:async()=>{}})});"
  }));
 }
 try{
  await page.goto(root,{waitUntil:"domcontentloaded"});
  const logo=page.locator(".loisel-letter-mark svg"),buddy=page.locator("#loisel-buddy-toggle");
  assert.ok(await logo.isVisible(),"Missing cinematic L");
  assert.equal(await page.locator(".loisel-hero-photo").count(),0);
  await buddy.waitFor({state:"visible"});
  assert.equal(await page.locator("#loisel-buddy-audio").getAttribute("aria-pressed"),"false");
  await buddy.click();assert.ok(await page.locator("#loisel-buddy-panel").isVisible());
  await page.locator("#loisel-buddy-quiz").click();
  assert.ok(await page.locator("#quiz-hub-view").isVisible());
  assert.ok(await buddy.isVisible(),"Mini companion must persist in Quiz Studio");
  await page.locator("#quiz-lecture").selectOption("pdf");
  assert.ok(await page.locator("#quiz-pdf-group").isVisible());
  await page.locator("#quiz-pdf-file").setInputFiles({name:"solar-lecture.pdf",mimeType:"application/pdf",buffer:validPdf});
  await page.getByText(/characters extracted locally/).waitFor({timeout:30000});
  const info=await page.locator("#quiz-pdf-info").innerText();
  assert.match(info,/1 page/);
  await page.locator("#quiz-build").click();
  await page.locator(".quiz-hub-question").first().waitFor({state:"visible",timeout:12000});
  assert.ok(await page.locator(".quiz-hub-question").count()>=2,"Extracted lecture should generate questions");
  await page.locator(".quiz-hub-question").first().locator("input[type=radio]").first().check();
  await page.locator("#quiz-submit").click();
  await page.locator(".quiz-pdf-citation").first().waitFor({state:"visible"});
  assert.match(await page.locator(".quiz-pdf-citation").first().innerText(),/Page 1/);
  assert.ok(await page.locator(".quiz-video-link").count()>0);
  await buddy.click();
  await page.locator("#loisel-buddy-ask").click();
  assert.ok(await page.locator("#pip-chat").isVisible(),"Mini companion should open chat in Studio");
  assert.equal(await page.locator("#quiz-hub-view").isVisible(),false);
  await page.locator(mobile?"#nw-dock-library":"#nav-saved").click();
  assert.ok(await page.locator("#saved-panel").isVisible());
  assert.ok(await buddy.isVisible(),"Mini companion should persist in Library");
  // The redesigned rounded sprite really hides behind its book and moves spots.
  assert.ok(await page.locator(".loisel-pocket-shell").isVisible());
  await buddy.click();
  await page.locator("#loisel-buddy-game").click();
  assert.equal(await page.locator("#loisel-buddy").getAttribute("data-game"),"seek");
  assert.ok(await page.locator(".loisel-pocket-hide-cover").isVisible());
  let previous=await page.locator("#loisel-buddy").getAttribute("data-spot");
  for(let round=0;round<3;round++){
   await buddy.click();
   const current=await page.locator("#loisel-buddy").getAttribute("data-spot");
   assert.notEqual(current,previous,"Lumi must find a new hiding spot after being caught");
   previous=current;
  }
  assert.equal(await page.locator("#loisel-buddy").getAttribute("data-game"),"celebrate");
  assert.match(await page.locator("#loisel-buddy-words").innerText(),/found me three times/i);

  await page.locator("#loisel-buddy-quiet").click();
  assert.equal(await page.locator("#loisel-buddy").getAttribute("data-hidden"),"true");
  await page.locator("#loisel-buddy-quiet").click();
  assert.equal(await page.locator("#loisel-buddy").getAttribute("data-hidden"),"false");
  assert.ok(await buddy.isVisible());
  const dimension=await page.evaluate(()=>({
   scroll:document.documentElement.scrollWidth,
   available:document.documentElement.clientWidth
  }));
  assert.ok(dimension.scroll<=dimension.available+3,"Horizontal overflow "+JSON.stringify(dimension));
  assert.deepEqual(errors,[],"Unexpected browser exceptions: "+errors.join("; "));
  console.log("PASS",mobile?"WebKit-mobile":"Chromium-desktop","PDF lecture quiz, source-page citation, mini Loisel across sections");
 }finally{await context.close();}
}
try{
 chrome=await chromium.launch({headless:true,args:["--no-sandbox"]});
 await testFlow(chrome,{mobile:false,mockPDF:false});
 safari=await webkit.launch({headless:true});
 await testFlow(safari,{mobile:true,mockPDF:true});
}finally{
 await chrome?.close();await safari?.close();
 await new Promise(resolve=>server.close(resolve));
}
