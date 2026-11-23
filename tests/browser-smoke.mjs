import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port=8765, url="http://127.0.0.1:"+port;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1","--directory","public"],{stdio:"ignore"});
let browser;
const transcript="The class explored renewable energy and solar panels. Students must submit the research report by Friday. The test system produced 25 watts of power in the demonstration. Our key conclusion is that solar panels can reduce electricity costs.";
async function ready(){
 for(let retry=0;retry<60;retry++){
   try{const res=await fetch(url);if(res.ok)return;}catch{}
   await new Promise(resolve=>setTimeout(resolve,250));
 }
 throw Error("Local static server failed to start");
}
try{
 await ready();
 browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1380,height:900},acceptDownloads:true});
 const crashes=[];
 page.on("pageerror",error=>crashes.push(error.message));
 await page.goto(url,{waitUntil:"domcontentloaded"});
 await page.locator("#text-tab").click();
 await page.locator("#pasted").fill(transcript);
 await page.locator("#generate").click();
 await page.locator("#results").waitFor({state:"visible",timeout:10000});
 assert.ok((await page.locator("#summary").innerText()).length>15);
 assert.ok((await page.locator("#points li").count())>0);
 assert.ok((await page.locator("#actions").innerText()).includes("submit"));
 assert.ok((await page.locator("#details").innerText()).includes("25 watts"));
 await page.locator("#cards-tab").click();
 assert.equal(await page.locator("#flashcard").isDisabled(),false);
 await page.locator("#flashcard").click();
 assert.ok(await page.locator("#flashcard").evaluate(node=>node.classList.contains("revealed")));
 await page.locator("#chapters-tab").click();
 assert.ok((await page.locator("#chapter-list").innerText()).includes("Pasted text"));
 const dl=page.waitForEvent("download");
 await page.locator("#export").click();
 assert.equal((await dl).suggestedFilename(),"NoteWave-notes.md");
 await page.locator("#save").click();
 await page.locator("#nav-saved").click();
 assert.ok((await page.locator("#saved-list").innerText()).includes("words"));
 await page.locator("#saved-list button").first().click();
 await page.locator("#results").waitFor({state:"visible"});
 assert.ok((await page.locator("#editor").inputValue()).includes("solar panels"));
 assert.deepEqual(crashes,[]);

 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1});
 const mobileErrors=[];
 mobile.on("pageerror",err=>mobileErrors.push(err.message));
 await mobile.goto(url,{waitUntil:"domcontentloaded"});
 await mobile.locator("#text-tab").click();
 await mobile.locator("#pasted").fill(transcript);
 await mobile.locator("#generate").click();
 await mobile.locator("#results").waitFor({state:"visible"});
 const widths=await mobile.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
 assert.ok(widths.scroll<=widths.viewport+2,"Mobile horizontal overflow: "+JSON.stringify(widths));
 assert.deepEqual(mobileErrors,[]);
 console.log("PASS: desktop notes, key details, flashcards, chapters fallback, export, persistence, mobile layout");
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
