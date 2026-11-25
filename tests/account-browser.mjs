import assert from "node:assert/strict";import {chromium,webkit} from "playwright";import {startStaticServer} from "./static-server.mjs";
const port=8790,server=await startStaticServer(port),root="http://127.0.0.1:"+port;
async function run(browser,viewport,scheme){const context=await browser.newContext({viewport,colorScheme:scheme,reducedMotion:"reduce"}),page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));try{
 await page.goto(root);await page.waitForURL("**/account.html");await page.locator("#account-form").waitFor();
 assert.equal(await page.locator("#account-title").innerText(),"Sign in");assert.equal(await page.locator("#account-back").isVisible(),false);assert.equal(await page.locator("html").getAttribute("data-theme"),scheme);
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
