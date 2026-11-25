// A browser-local profile, not a server authentication or authorization layer.
export const PROFILE_KEY="notewave-device-profile-v1",SESSION_KEY="notewave-device-session-v1";
export const ITERATIONS=600000;
export function normalizeUsername(value){const name=String(value??"").trim();if(!/^[a-zA-Z0-9._-]{3,32}$/.test(name))throw Error("Use 3–32 letters, numbers, dots, underscores or hyphens.");return name.toLowerCase();}
function hex(bytes){return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");}
function unhex(value){if(!/^[0-9a-f]{32}$/i.test(value))throw Error("Invalid local profile.");return Uint8Array.from(value.match(/../g),x=>parseInt(x,16));}
async function derive(password,salt,crypto=globalThis.crypto){
 if(!crypto?.subtle)throw Error("A secure browser connection is required.");
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
 return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations:ITERATIONS},key,256));
}
export async function createProfile(username,password,crypto=globalThis.crypto){
 const name=normalizeUsername(username);if(typeof password!=="string"||password.length<12||password.length>128)throw Error("Choose a password of 12–128 characters.");
 const salt=crypto.getRandomValues(new Uint8Array(16));return {version:1,name,salt:hex(salt),verifier:await derive(password,salt,crypto)};
}
export async function verifyProfile(profile,username,password,crypto=globalThis.crypto){
 let name;try{name=normalizeUsername(username);}catch{return false;}
 if(!profile||profile.version!==1||profile.name!==name||!/^([0-9a-f]{64})$/.test(profile.verifier)||typeof password!=="string"||password.length>128)return false;
 const hash=await derive(password,unhex(profile.salt),crypto);
 let difference=0;for(let i=0;i<hash.length;i++)difference|=hash.charCodeAt(i)^profile.verifier.charCodeAt(i);return difference===0;
}
export function readProfile(storage=globalThis.localStorage){try{const p=JSON.parse(storage.getItem(PROFILE_KEY));return p?.version===1&&typeof p.name==="string"?p:null;}catch{return null;}}
export function sessionName(profile,storage=globalThis.sessionStorage){try{return profile&&storage.getItem(SESSION_KEY)===profile.name?profile.name:null;}catch{return null;}}
