import {createProfile,PROFILE_KEY,SESSION_KEY} from "../public/account-core.js";import {webcrypto} from "node:crypto";
const fixture=await createProfile("ci-student","ci-only-profile-password",webcrypto);
export async function seedProfile(page){await page.addInitScript(({profile,profileKey,sessionKey})=>{try{if(!localStorage.getItem(profileKey))localStorage.setItem(profileKey,JSON.stringify(profile));sessionStorage.setItem(sessionKey,profile.name);sessionStorage.setItem("notewave-workspace-entry-v1",profile.name);}catch{}},{profile:fixture,profileKey:PROFILE_KEY,sessionKey:SESSION_KEY});}
