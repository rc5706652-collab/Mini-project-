import test from "node:test";import assert from "node:assert/strict";import {webcrypto} from "node:crypto";
import {createProfile,verifyProfile,normalizeUsername,sessionName,findProfile,saveProfile,readProfile,PROFILE_KEY,SESSION_KEY} from "../public/account-core.js";
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

test("multiple named profiles persist independently; legacy profile stays usable",async()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const old=await createProfile("legacy","legacy-pass",webcrypto);storage.setItem(PROFILE_KEY,JSON.stringify(old));
 const a=await createProfile("student1","student-1",webcrypto),b=await createProfile("student2","student-2",webcrypto);
 saveProfile(a,storage);saveProfile(b,storage);assert.throws(()=>saveProfile(a,storage));
 assert.equal(findProfile("LEGACY",storage).name,"legacy");assert.equal(findProfile("STUDENT1",storage).name,"student1");
 assert.equal(readProfile(storage,{getItem:k=>k===SESSION_KEY?"student2":null}).name,"student2");
 assert.equal(await verifyProfile(findProfile("student2",storage),"student2","student-2",webcrypto),true);
 assert.equal(await verifyProfile(findProfile("student1",storage),"student1","student-2",webcrypto),false);
});
