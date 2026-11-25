// A browser-local profile, not a server authentication or authorization layer.
export const PROFILE_KEY="notewave-device-profile-v1",SESSION_KEY="notewave-device-session-v1";
export const ITERATIONS=600000, MIN_PASSWORD_LENGTH=8;
export const PROFILE_PREFIX="notewave-profile-v2:";
export function normalizeUsername(value){const name=String(value??"").trim();if(!/^[a-zA-Z0-9._-]{3,32}$/.test(name))throw Error("Use 3–32 letters, numbers, dots, underscores or hyphens.");return name.toLowerCase();}
function hex(bytes){return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");}
function unhex(value){if(!/^[0-9a-f]{32}$/i.test(value))throw Error("Invalid local profile.");return Uint8Array.from(value.match(/../g),x=>parseInt(x,16));}
async function derive(password,salt,crypto=globalThis.crypto){
 if(!crypto?.subtle)throw Error("A secure browser connection is required.");
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
 return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations:ITERATIONS},key,256));
}
export async function createProfile(username,password,crypto=globalThis.crypto){
 const name=normalizeUsername(username);if(typeof password!=="string"||password.length<MIN_PASSWORD_LENGTH||password.length>128)throw Error("Choose a password of 8–128 characters. A longer unique passphrase is recommended.");
 const salt=crypto.getRandomValues(new Uint8Array(16));return {version:1,name,salt:hex(salt),verifier:await derive(password,salt,crypto)};
}
export async function verifyProfile(profile,username,password,crypto=globalThis.crypto){
 let name;try{name=normalizeUsername(username);}catch{return false;}
 if(!profile||profile.version!==1||profile.name!==name||!/^([0-9a-f]{64})$/.test(profile.verifier)||typeof password!=="string"||password.length>128)return false;
 const hash=await derive(password,unhex(profile.salt),crypto);
 let difference=0;for(let i=0;i<hash.length;i++)difference|=hash.charCodeAt(i)^profile.verifier.charCodeAt(i);return difference===0;
}
function validProfile(p,name){return p?.version===1&&p.name===name&&/^[0-9a-f]{32}$/i.test(p.salt)&&/^[0-9a-f]{64}$/.test(p.verifier);}
export function findProfile(username,storage=globalThis.localStorage){
 const name=normalizeUsername(username);
 const record=storage.getItem(PROFILE_PREFIX+name);
 if(record){const p=JSON.parse(record);if(!validProfile(p,name))throw Error("This saved profile is damaged.");return p;}
 const old=JSON.parse(storage.getItem(PROFILE_KEY)||"null");
 return validProfile(old,name)?old:null;
}
export function saveProfile(profile,storage=globalThis.localStorage){
 if(!validProfile(profile,normalizeUsername(profile?.name)))throw Error("Invalid profile.");
 if(findProfile(profile.name,storage))throw Error("That username already exists on this browser. Sign in instead.");
 // One storage entry per account; legacy profile is preserved.
 storage.setItem(PROFILE_PREFIX+profile.name,JSON.stringify(profile));
}
export function readProfile(storage=globalThis.localStorage,sessions=globalThis.sessionStorage){
 try{const name=sessions.getItem(SESSION_KEY);return name?findProfile(name,storage):null;}catch{return null;}
}
export function sessionName(profile,storage=globalThis.sessionStorage){try{return profile&&storage.getItem(SESSION_KEY)===profile.name?profile.name:null;}catch{return null;}}
