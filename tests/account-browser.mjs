import assert from "node:assert/strict";import {chromium,webkit} from "playwright";import {startStaticServer} from "./static-server.mjs";
const port=8790,server=await startStaticServer(port),root="http://127.0.0.1:"+port;
async function run(browser,viewport){const context=await browser.newContext({viewport,reducedMotion:"reduce"}),page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));try{
 await page.goto(root+"/account.html");await page.locator("#account-switch").click();await page.locator("#username").fill("Student");await page.locator("#password").fill("sample-passphrase-42");await page.locator("#confirm-password").fill("sample-passphrase-42");await page.locator("#account-submit").click();await page.locator("#account-signed-in").waitFor({state:"visible"});
 assert.equal(await page.evaluate(()=>JSON.stringify(localStorage).includes("sample-passphrase-42")),false);
 await page.locator("#account-signout").click();await page.locator("#account-form").waitFor({state:"visible"});
 await page.locator("#username").fill("student");await page.locator("#password").fill("wrong-password");await page.locator("#account-submit").click();await page.getByText(/Incorrect username or password/).waitFor();
 await page.locator("#password").fill("sample-passphrase-42");await page.locator("#account-submit").click();await page.locator("#account-signed-in").waitFor({state:"visible"});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.getByRole("link",{name:"Open workspace"}).click();await page.locator("#account-link").waitFor();assert.equal(await page.locator("#account-link").innerText(),"Account");assert.ok(await page.locator("#home-view").isVisible());assert.deepEqual(errors,[]);
 }finally{await context.close();}}
let c,w;try{c=await chromium.launch({headless:true,args:["--no-sandbox"]});await run(c,{width:1440,height:900});await run(c,{width:390,height:844});w=await webkit.launch();await run(w,{width:390,height:844});console.log("PASS local profile registration, wrong password, sign-in/out, navigation and mobile layout");}finally{await c?.close();await w?.close();await new Promise(r=>server.close(r));}
