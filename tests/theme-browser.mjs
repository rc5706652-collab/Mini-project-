import assert from "node:assert/strict";
import {chromium,webkit} from "playwright";
import {startStaticServer} from "./static-server.mjs";
const PORT=8772,url="http://127.0.0.1:"+PORT;
const server=await startStaticServer(PORT);
let chrome,safari;
const transcript="Solar panels convert sunlight into electricity. Engineers measured solar energy efficiency with a laboratory experiment. Students should submit the renewable energy assignment by Friday. Storage batteries can retain electrical energy for future use. Wind turbines produce electricity from moving air. Clean energy technologies help reduce fossil fuel consumption.";
function numericColor(value){
 const m=/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(value);
 return m?[+m[1],+m[2],+m[3]]:null;
}
function lum(rgb){
 return rgb.map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4)
  .reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
}
async function verify(browser,{width=1440,height=900,systemDark=true,saved,webkitEngine=false,exercise=false}={}){
 const context=await browser.newContext({viewport:{width,height},colorScheme:systemDark?"dark":"light",reducedMotion:"reduce",hasTouch:width<720,isMobile:width<720,deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];
 page.on("pageerror",error=>errors.push(error.message));
 if(saved!==undefined)await page.addInitScript(theme=>{
  try{
   if(!sessionStorage.getItem("__nw_theme_seeded")){
    localStorage.setItem("notewave-theme-v1",theme);
    sessionStorage.setItem("__nw_theme_seeded","yes");
   }
  }catch{}
 },saved);
 try{
  await page.goto(url,{waitUntil:"domcontentloaded"});
  const chosen=saved||"system",resolved=chosen==="system"?(systemDark?"dark":"light"):chosen;
  assert.equal(await page.locator("html").getAttribute("data-theme"),resolved,"theme before first paint");
  await page.locator("#nw-theme-trigger").waitFor({state:"visible",timeout:9000});
  assert.equal(await page.locator("html").getAttribute("data-theme-preference"),chosen);
  assert.equal(await page.locator('meta[name="theme-color"]').getAttribute("content"),resolved==="light"?"#f3f6fc":"#0b1021");
  assert.equal(await page.locator("#nw-theme-trigger").getAttribute("aria-expanded"),"false");
  assert.ok(await page.locator("#pip-chat").isVisible());
  const trigger=page.locator("#nw-theme-trigger"),bounds=await trigger.boundingBox();
  assert.ok(bounds.height>=40&&bounds.width>=40,"appearance control must be touch sized");
  await trigger.click();
  assert.ok(await page.locator("#nw-theme-menu").isVisible());
  assert.equal(await trigger.getAttribute("aria-expanded"),"true");
  await page.locator('[data-theme-choice="light"]').click();
  assert.equal(await page.locator("html").getAttribute("data-theme"),"light");
  assert.equal(await page.locator("html").getAttribute("data-theme-preference"),"light");
  assert.equal(await page.evaluate(()=>localStorage.getItem("notewave-theme-v1")),"light");
  assert.equal(await page.locator("#nw-theme-menu").isVisible(),false);
  const lightColor=await page.locator(".pip-message.pip-assistant p").first().evaluate(e=>getComputedStyle(e).color);
  assert.ok(lum(numericColor(lightColor))<.2,"Chat answer should use dark ink in light theme: "+lightColor);
  const heroColor=await page.locator(".hero h1").evaluate(e=>getComputedStyle(e).color);
  assert.ok(lum(numericColor(heroColor))<.2,"Hero headline must be dark in light mode");
  await trigger.click();
  await page.locator('[data-theme-choice="dark"]').click();
  assert.equal(await page.locator("html").getAttribute("data-theme"),"dark");
  const darkColor=await page.locator(".pip-message.pip-assistant p").first().evaluate(e=>getComputedStyle(e).color);
  assert.ok(lum(numericColor(darkColor))>.65,"Chat answer should have pale foreground in dark mode: "+darkColor);
  await trigger.click();
  await page.locator('[data-theme-choice="system"]').click();
  assert.equal(await page.locator("html").getAttribute("data-theme"),systemDark?"dark":"light");
  await page.emulateMedia({colorScheme:systemDark?"light":"dark"});
  await page.waitForFunction(expected=>document.documentElement.dataset.theme===expected,systemDark?"light":"dark",{timeout:5000});
  await page.reload({waitUntil:"domcontentloaded"});
  assert.equal(await page.locator("html").getAttribute("data-theme-preference"),"system");
  await page.locator("#nw-theme-trigger").click();
  await page.locator('[data-theme-choice="light"]').click();
  await page.reload({waitUntil:"domcontentloaded"});
  assert.equal(await page.locator("html").getAttribute("data-theme"),"light","saved light preference survives reload");
  assert.equal(await page.locator("#nw-theme-trigger").getAttribute("aria-expanded"),"false");
  await page.locator("#nw-theme-trigger").click();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#nw-theme-menu").isVisible(),false,"Escape should close appearance popup");
  if(exercise){
    await page.locator("#text-tab").click();
    await page.locator("#pasted").fill(transcript);
    await page.locator("#generate").click();
    await page.locator("#results").waitFor({state:"visible",timeout:12000});
    await page.locator("#galaxy-tab").click();
    assert.ok(await page.locator("#galaxy-panel").isVisible());
    assert.ok((await page.locator(".galaxy-node").count())>=2);
    await page.locator("#quiz-tab").click();
    assert.ok(await page.locator("#quiz-panel").isVisible());
    await page.locator("#tutor-tab").click();
    assert.ok(await page.locator("#tutor-panel").isVisible());
    await page.locator(width<720?"#nw-dock-library":"#nav-saved").click();
    assert.ok(await page.locator("#saved-panel").isVisible());
    await page.locator(width<720?"#nw-dock-studio":"#nav-new").click();
    assert.ok(await page.locator("#results").isVisible(),"resume studio must preserve results");
    assert.equal(await page.locator("html").getAttribute("data-theme"),"light");
    const chatbot=page.locator("#pip-chat");
    assert.ok(await chatbot.isVisible());
  }
  const metrics=await page.evaluate(()=>({
    document:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,
    theme:getComputedStyle(document.documentElement).colorScheme,
    dock:window.innerWidth<720?getComputedStyle(document.querySelector("#nw-dock")).display:"not-mobile"
  }));
  assert.ok(metrics.document<=metrics.viewport+3,"horizontal overflow at "+width+": "+JSON.stringify(metrics));
  assert.equal(metrics.theme,"light");
  assert.deepEqual(errors,[],"Unexpected browser runtime errors "+JSON.stringify({width,height,webkitEngine,errors}));
  console.log("PASS",webkitEngine?"WebKit":"Chromium",width+"x"+height,"system dark?",systemDark,"saved?",saved||"no","study?",exercise);
 }finally{await context.close();}
}
try{
 chrome=await chromium.launch({headless:true,args:["--no-sandbox"]});
 await verify(chrome,{width:320,height:740,systemDark:false,exercise:true});
 await verify(chrome,{width:390,height:844,systemDark:true});
 await verify(chrome,{width:768,height:1024,systemDark:false});
 await verify(chrome,{width:1280,height:800,systemDark:true,saved:"light",exercise:true});
 await verify(chrome,{width:1920,height:1080,systemDark:true,saved:"dark"});
 safari=await webkit.launch({headless:true});
 await verify(safari,{width:390,height:844,systemDark:true,webkitEngine:true,exercise:true});
 await verify(safari,{width:1366,height:900,systemDark:false,webkitEngine:true});
 console.log("PASS enterprise appearance: 7 browser/viewport scenarios including persistent and system-color checks");
}finally{
 await chrome?.close();await safari?.close();
 await new Promise(resolve=>server.close(resolve));
}
