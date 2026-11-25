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
  const logo=page.locator(".loisel-knowledge-scene"),buddy=page.locator("#loisel-buddy-toggle");
  assert.ok(await logo.isVisible(),"Missing animated knowledge core");
  assert.equal(await page.locator(".loisel-hero-photo").count(),0);
  assert.equal(await buddy.count(),0);
  if(!mobile)await page.locator("#workspace-menu").click();
  await page.locator(mobile?"#nw-dock-quiz-studio":"#nav-quiz").click();
  assert.ok(await page.locator("#quiz-hub-view").isVisible());
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
  await page.locator("#quiz-pdf-ask").click();
  assert.ok(await page.locator("#pip-chat").isVisible());
  assert.equal(await page.locator("#main-view").isVisible(),false);
  assert.equal(await page.locator("#home-view").isVisible(),false);
  assert.equal(await page.locator("#pip-mode").inputValue(),"pdf");
  await page.locator("#pip-question").fill("What do solar panels convert?");
  await page.locator("#pip-send").click();
  await page.locator(".pip-citation").first().waitFor({state:"visible"});
  assert.match(await page.locator(".pip-citation").first().innerText(),/Page 1/);
  assert.match(await page.locator("#pip-messages").innerText(),/sunlight into electricity/);
  if(!mobile)await page.locator("#workspace-menu").click();
  await page.locator(mobile?"#nw-dock-library":"#nav-saved").click();
  assert.ok(await page.locator("#saved-panel").isVisible());
  assert.equal(await buddy.count(),0);
  if(!mobile)await page.locator("#workspace-menu").click();
  await page.locator(mobile?"#nw-dock-quiz-studio":"#nav-quiz").click();
  await page.locator("#quiz-pdf-clear").click();
  assert.ok(await page.locator("#quiz-pdf-ask").isDisabled());
  assert.equal(await page.locator('#pip-mode option[value="pdf"]').evaluate(option=>option.disabled&&option.hasAttribute("disabled")),true);
  assert.notEqual(await page.locator("#pip-mode").inputValue(),"pdf");
  assert.match(await page.locator("#pip-messages").textContent(),/PDF removed/);
  assert.equal(await page.locator(".pip-citation").count(),0);
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
