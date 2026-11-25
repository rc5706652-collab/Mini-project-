import assert from "node:assert/strict";import {chromium,webkit} from "playwright";import {startStaticServer} from "./static-server.mjs";
const port=8790,server=await startStaticServer(port),root="http://127.0.0.1:"+port;
async function run(browser,viewport,scheme){const context=await browser.newContext({viewport,colorScheme:scheme,reducedMotion:"reduce"}),page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));try{
 await page.goto(root);await page.waitForURL("**/account.html");await page.locator("#account-form").waitFor();
 assert.equal(await page.locator("#account-title").innerText(),"Sign in");assert.equal(await page.locator("#account-back").isVisible(),false);assert.equal(await page.locator("html").getAttribute("data-theme"),scheme);
 const contrast=await page.evaluate(()=>{const luminance=rgb=>{const parts=rgb.match(/\d+(?:\.\d+)?/g).slice(0,3).map(Number).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return parts[0]*.2126+parts[1]*.7152+parts[2]*.0722;};const field=document.querySelector(".field"),input=field.querySelector("input"),bg=luminance(getComputedStyle(field).backgroundColor),fg=luminance(getComputedStyle(input).color),hint=luminance(getComputedStyle(input,"::placeholder").color);return {text:(Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05),placeholder:(Math.max(bg,hint)+.05)/(Math.min(bg,hint)+.05)};});assert.ok(contrast.text>=4.5&&contrast.placeholder>=4.5,"Account input text contrast: "+JSON.stringify(contrast));
 assert.equal(await page.locator(".account-sphere").count(),4);
 assert.equal(await page.locator(".account-ribbons").count(),0);
 const glass=await page.locator(".account-glass").evaluate(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {radius:s.borderTopLeftRadius,w:r.width,h:r.height};});
 if(viewport.width>660){assert.equal(glass.radius,"50%");assert.ok(Math.abs(glass.w-glass.h)<3,"Circular desktop glass panel");}
 assert.equal(await page.locator(".account-sphere").first().evaluate(el=>getComputedStyle(el).animationName),"none");

 await page.goto(root+"/#quiz-studio");await page.waitForURL("**/account.html");
 await page.locator("#account-switch").click();await page.locator("#confirm-password").waitFor();await page.locator("#username").fill("Student");await page.locator("#password").fill("sample-passphrase-42");await page.locator("#confirm-password").fill("sample-passphrase-42");await page.locator("#account-submit").click();
 await page.waitForURL(root+"/");await page.locator("#home-view").waitFor();await page.waitForFunction(()=>document.getElementById("account-link")?.textContent==="Account");
 assert.equal(await page.evaluate(()=>JSON.stringify(localStorage).includes("sample-passphrase-42")),false);
 await page.reload();await page.locator("#home-view").waitFor();
 await page.locator("#account-link").click();await page.locator("#account-signed-in").waitFor();await page.locator("#account-signout").click();await page.locator("#account-form").waitFor();
 await page.goto(root);await page.waitForURL("**/account.html");await page.locator("#username").fill("student");await page.locator("#password").fill("wrong-password");await page.locator("#account-submit").click();await page.getByText(/Incorrect username or password/).waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.locator("#password").fill("sample-passphrase-42");await page.locator("#account-submit").click();await page.waitForURL(root+"/");await page.locator("#home-view").waitFor();assert.deepEqual(errors,[]);
 }finally{await context.close();}}
let c,w;try{c=await chromium.launch({headless:true,args:["--no-sandbox"]});await run(c,{width:1440,height:900},"dark");await run(c,{width:390,height:844},"light");w=await webkit.launch();await run(w,{width:390,height:844},"dark");console.log("PASS login-first entry, direct link redirect, registration, wrong password, sign-in/out, refresh and theme");}finally{await c?.close();await w?.close();await new Promise(r=>server.close(r));}
