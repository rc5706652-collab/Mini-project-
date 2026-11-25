import {SESSION_KEY,readProfile,sessionName,createProfile,verifyProfile,findProfile,saveProfile,normalizeUsername,MIN_PASSWORD_LENGTH} from "./account-core.js";
const $=id=>document.getElementById(id);
const signup=new URLSearchParams(location.search).get("mode")==="signup",form=$("account-form"),password=$("password"),confirm=$("confirm-password"),status=$("account-status"),submit=$("account-submit");
let name=null;try{name=sessionName(readProfile());}catch{}
function signedIn(value){$("account-back").hidden=false;document.title="Account | NoteWave";form.hidden=true;$("account-switch-line").hidden=true;$("account-signed-in").hidden=false;$("account-title").textContent="You're signed in";$("account-intro").textContent="Local profile on this browser.";$("account-welcome").textContent="Welcome, "+value+".";}
if(name)signedIn(name);
else if(signup){
 document.title="Sign up | NoteWave";$("account-title").textContent="Create your profile";$("account-intro").textContent="Start your own learning journey.";
 $("confirm-group").hidden=false;confirm.required=true;password.autocomplete="new-password";password.minLength=MIN_PASSWORD_LENGTH;password.placeholder="At least 8 characters";
 submit.textContent="Create profile ↗";$("account-switch-line").replaceChildren(document.createTextNode("Already have a profile? "));const a=document.createElement("a");a.href="./account.html";a.textContent="Sign in";$("account-switch-line").append(a);
}
$("password-toggle").addEventListener("click",()=>{const visible=password.type==="password";password.type=visible?"text":"password";$("password-toggle").textContent=visible?"Hide":"Show";$("password-toggle").setAttribute("aria-pressed",String(visible));$("password-toggle").setAttribute("aria-label",visible?"Hide password":"Show password");});
function explain(error){if(error?.name==="QuotaExceededError")return "Browser storage is full or disabled. Free some browser storage and retry.";if(error?.name==="SecurityError")return "This browser blocks local storage. Allow site storage or open NoteWave in a regular browser tab.";return error?.message||"Could not open the local profile.";}
form.addEventListener("submit",async event=>{
 event.preventDefault();if(submit.disabled)return;status.textContent="";
 const label=signup?"Create profile ↗":"Sign in ↗";
 try{
  const username=normalizeUsername($("username").value);
  if(!password.value)throw Error("Enter your password.");
  if(password.value.length>128)throw Error("Password must be at most 128 characters.");
  if(signup&&password.value.length<MIN_PASSWORD_LENGTH)throw Error("Choose a password with at least 8 characters.");
  if(signup&&password.value!==confirm.value)throw Error("Passwords do not match.");
  submit.disabled=true;submit.textContent=signup?"Creating profile…":"Signing in…";
  let current=findProfile(username);
  if(signup){
   if(current)throw Error("That username already exists on this browser. Sign in instead.");
   current=await createProfile(username,password.value);
   saveProfile(current);
  }else if(!await verifyProfile(current,username,password.value))throw Error("Incorrect username or password. Profiles are specific to this browser.");
  sessionStorage.setItem(SESSION_KEY,current.name);
  if(sessionName(readProfile())!==current.name)throw Error("Your browser could not save the sign-in session.");
  sessionStorage.setItem("notewave-workspace-entry-v1",current.name);form.reset();location.replace("./");
 }catch(error){status.textContent=explain(error);}
 finally{submit.disabled=false;submit.textContent=label;}
});
for(const link of [$("account-back"),$("account-signed-in").querySelector("a.submit")])link.addEventListener("click",event=>{event.preventDefault();try{const active=sessionName(readProfile());if(!active){location.replace("./account.html");return;}sessionStorage.setItem("notewave-workspace-entry-v1",active);location.replace("./");}catch(error){status.textContent=explain(error);}});
$("account-signout").addEventListener("click",()=>{try{sessionStorage.removeItem(SESSION_KEY);sessionStorage.removeItem("notewave-workspace-entry-v1");location.replace("./account.html");}catch(error){status.textContent=explain(error);}});
