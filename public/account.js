import {PROFILE_KEY,SESSION_KEY,readProfile,sessionName,createProfile,verifyProfile} from "./account-core.js";
const $=id=>document.getElementById(id);
const signup=new URLSearchParams(location.search).get("mode")==="signup",form=$("account-form"),password=$("password"),confirm=$("confirm-password"),status=$("account-status"),submit=$("account-submit");
const profile=readProfile(),name=sessionName(profile);
function signedIn(value){$("account-back").hidden=false;document.title="Account | NoteWave";form.hidden=true;$("account-switch-line").hidden=true;$("account-signed-in").hidden=false;$("account-title").textContent="You're signed in";$("account-intro").textContent="Local profile on this browser.";$("account-welcome").textContent="Welcome, "+value+".";}
if(name)signedIn(name);
else if(signup){
 document.title="Sign up | NoteWave";$("account-title").textContent="Create your profile";$("account-intro").textContent="Start your own learning journey.";
 $("confirm-group").hidden=false;confirm.required=true;password.autocomplete="new-password";password.minLength=12;password.placeholder="At least 12 characters";
 submit.textContent="Create profile ↗";$("account-switch-line").replaceChildren(document.createTextNode("Already have a profile? "));const a=document.createElement("a");a.href="./account.html";a.textContent="Sign in";$("account-switch-line").append(a);
}
$("password-toggle").addEventListener("click",()=>{const visible=password.type==="password";password.type=visible?"text":"password";$("password-toggle").textContent=visible?"Hide":"Show";$("password-toggle").setAttribute("aria-pressed",String(visible));$("password-toggle").setAttribute("aria-label",visible?"Hide password":"Show password");});
form.addEventListener("submit",async event=>{
 event.preventDefault();if(submit.disabled)return;
 const username=$("username").value;status.textContent="";submit.disabled=true;
 try{
  let current=readProfile();
  if(signup){
   if(current)throw Error("This browser already has a local profile. Sign in with that username instead.");
   if(password.value!==confirm.value)throw Error("Passwords do not match.");
   current=await createProfile(username,password.value);
   if(readProfile())throw Error("A profile already exists in this browser.");
   localStorage.setItem(PROFILE_KEY,JSON.stringify(current));
  }else if(!await verifyProfile(current,username,password.value))throw Error("Incorrect username or password. Profiles are specific to this browser.");
  sessionStorage.setItem(SESSION_KEY,current.name);form.reset();location.replace("./");
 }catch(error){status.textContent=error.message||"Could not open the local profile.";}
 finally{password.value="";confirm.value="";submit.disabled=false;}
});
$("account-signout").addEventListener("click",()=>{sessionStorage.removeItem(SESSION_KEY);location.replace("./account.html");});
