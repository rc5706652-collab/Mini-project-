import test from "node:test";import assert from "node:assert/strict";import {webcrypto} from "node:crypto";
import {createProfile,verifyProfile,normalizeUsername,sessionName} from "../public/account-core.js";
test("local profiles use salted derived verifiers, not stored passwords",async()=>{
 const secret="example-only-passphrase",a=await createProfile("Student",secret,webcrypto),b=await createProfile("Student",secret,webcrypto);
 assert.equal(a.name,"student");assert.notEqual(a.salt,b.salt);assert.notEqual(a.verifier,b.verifier);
 assert.equal(JSON.stringify(a).includes(secret),false);assert.equal(await verifyProfile(a,"STUDENT",secret,webcrypto),true);assert.equal(await verifyProfile(a,"Student","wrong-password",webcrypto),false);
 assert.equal(await verifyProfile(a,"Other",secret,webcrypto),false);
});
test("invalid names and weak passwords are rejected; session is tab-local",async()=>{
 assert.throws(()=>normalizeUsername("bad name"));await assert.rejects(()=>createProfile("student","short",webcrypto));
 assert.equal(sessionName({name:"student"},{getItem:()=>"student"}),"student");assert.equal(sessionName({name:"student"},{getItem:()=>null}),null);
});
