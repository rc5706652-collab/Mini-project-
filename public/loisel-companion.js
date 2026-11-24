// Loisel Buddy: a tiny across-workspace assistant with playful peeking.
// Conversation/voice remains opt-in; no surprise sounds or microphone access.
// CSS-only character intentionally avoids WebGL and external model downloads.
const el=(tag,className,text)=>{
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text!==undefined)node.textContent=text;
 return node;
};
const root=el("aside","loisel-buddy");
root.id="loisel-buddy";root.dataset.open="false";root.dataset.hidden="false";
root.dataset.active="false";root.dataset.peek="false";
root.setAttribute("aria-label","Loisel mini companion");
const words=el("div","loisel-buddy-words","Hi! I'm mini Loisel. I'll be here when you switch workspaces. ✨");
words.id="loisel-buddy-words";words.setAttribute("role","status");words.setAttribute("aria-live","polite");
const panel=el("section","loisel-buddy-panel");panel.id="loisel-buddy-panel";panel.hidden=true;
const title=el("strong","","Loisel, at your side");
const description=el("p","","Need help? I can show you the chat or point you to a lecture quiz.");
const actions=el("div","loisel-buddy-actions");
const ask=el("button","","💬 Ask Loisel");ask.type="button";ask.id="loisel-buddy-ask";
const quiz=el("button","","◇ Quiz Studio");quiz.type="button";quiz.id="loisel-buddy-quiz";
const audio=el("button","","🔇 Voice off");audio.type="button";audio.id="loisel-buddy-audio";
audio.setAttribute("aria-pressed","false");
const close=el("button","","Close");close.type="button";close.id="loisel-buddy-close";
actions.append(ask,quiz,audio,close);panel.append(title,description,actions);
const controls=el("div","loisel-buddy-controls");
const quiet=el("button","loisel-buddy-quiet","×");
quiet.id="loisel-buddy-quiet";quiet.type="button";quiet.setAttribute("aria-label","Hide mini Loisel");
quiet.title="Hide or restore mini Loisel";
const toggle=el("button","loisel-buddy-toggle");
toggle.id="loisel-buddy-toggle";toggle.type="button";
toggle.setAttribute("aria-label","Talk to Loisel mini companion");
toggle.setAttribute("aria-expanded","false");toggle.setAttribute("aria-controls","loisel-buddy-panel");
toggle.title="Loisel says hello. Tap to ask for help.";
const antenna=el("span","loisel-buddy-antenna");
const head=el("span","loisel-buddy-head");
const face=el("span","loisel-buddy-face");
face.append(el("i","loisel-buddy-eye"),el("i","loisel-buddy-eye"),el("i","loisel-buddy-smile"));
head.append(face,el("i","loisel-buddy-cheek left"),el("i","loisel-buddy-cheek right"));
const body=el("span","loisel-buddy-body");
body.append(el("i","loisel-buddy-arm left"),el("i","loisel-buddy-arm right"),el("i","loisel-buddy-heart","✦"));
toggle.append(antenna,head,body,el("span","loisel-buddy-feet"));
controls.append(quiet,toggle);root.append(words,panel,controls);document.body.append(root);
let currentSection="studio",soundEnabled=false,hidden=false,peekTimer=0,hideMessageTimer=0;
const canSpeak=typeof window.speechSynthesis!=="undefined";
if(!canSpeak){audio.disabled=true;audio.title="Speech playback is not supported on this device";}
const messages={
 studio:["Hey, welcome back to AI Studio! ✨","I'll help you turn recordings into knowledge.","Got a question? Tap my face!"],
 library:["Shh… your lecture library is right here. 📚","I can help explain any notes you open!"],
 quiz:["Quiz time! I believe in you. 🌟","Upload a lecture PDF and I'll help you practise!","Stuck on a question? We'll learn it together."]
};
let index={studio:0,library:0,quiz:0};
function route(){
 if(!document.getElementById("quiz-hub-view")?.classList.contains("hidden"))return "quiz";
 if(!document.getElementById("saved-panel")?.classList.contains("hidden"))return "library";
 return "studio";
}
function speak(text){
 if(!soundEnabled||!canSpeak)return;
 try{
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(text.replace(/[\u{1F300}-\u{1FAFF}]/gu,""));
  utterance.rate=1.04;utterance.pitch=1.2;utterance.volume=.68;
  utterance.lang="en-US";
  window.speechSynthesis.speak(utterance);
 }catch{}
}
function showWords(text,withSpeech=false){
 if(hidden)return;
 words.textContent=text;
 words.hidden=false;
 root.dataset.active="true";
 clearTimeout(hideMessageTimer);
 if(withSpeech)speak(text);
 hideMessageTimer=setTimeout(()=>{root.dataset.active="false";},2400);
}
function peek(){
 if(hidden||document.documentElement.dataset.motion==="reduced"||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 clearTimeout(peekTimer);
 root.dataset.peek="false";
 void root.offsetWidth;root.dataset.peek="true";
 peekTimer=setTimeout(()=>{root.dataset.peek="false";},1550);
}
function sectionChanged(){
 const next=route();
 if(next===currentSection)return;
 currentSection=next;index[next]=(index[next]+1)%messages[next].length;
 // A short contextual message and playful peek, without stealing keyboard focus.
 showWords(messages[next][index[next]],true);peek();
 closePanel();
}
function closePanel(){
 panel.hidden=true;root.dataset.open="false";toggle.setAttribute("aria-expanded","false");
}
function openPanel(){
 panel.hidden=false;root.dataset.open="true";toggle.setAttribute("aria-expanded","true");
 showWords("Hey there! What would you like to do?",false);
}
toggle.addEventListener("click",()=>{
 if(hidden)return;
 if(panel.hidden)openPanel();else closePanel();
});
close.addEventListener("click",()=>{closePanel();toggle.focus();});
quiet.addEventListener("click",()=>{
 hidden=!hidden;root.dataset.hidden=String(hidden);
 quiet.textContent=hidden?"✦":"×";
 quiet.setAttribute("aria-label",hidden?"Show mini Loisel":"Hide mini Loisel");
 quiet.title=hidden?"Show mini Loisel":"Hide mini Loisel";
 if(hidden){
  closePanel();try{window.speechSynthesis?.cancel();}catch{}
 }else{showWords("Peekaboo! I'm back. 👀");peek();}
});
audio.addEventListener("click",()=>{
 if(!canSpeak)return;
 soundEnabled=!soundEnabled;
 audio.setAttribute("aria-pressed",String(soundEnabled));
 audio.textContent=soundEnabled?"🔊 Voice on":"🔇 Voice off";
 if(!soundEnabled)window.speechSynthesis.cancel();
 showWords(soundEnabled?"I'll speak greetings as you move between sections!":"I'll use quiet text bubbles instead.");
});
ask.addEventListener("click",()=>{
 closePanel();
 if(route()!=="studio")document.getElementById("nav-new")?.click();
 const chat=document.getElementById("pip-chat");
 chat?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
 const question=document.getElementById("pip-question");
 question?.focus({preventScroll:true});
 showWords("Ask me anything about your lecture!");
});
quiz.addEventListener("click",()=>{
 closePanel();
 const nav=document.getElementById("nav-quiz");
 nav?.click();
 showWords("Choose a lecture or upload a PDF, then let's practise. ✨");
 peek();
});
document.addEventListener("keydown",event=>{
 if(event.key==="Escape"&&!panel.hidden){closePanel();toggle.focus();}
});
document.addEventListener("pointerdown",event=>{
 if(!root.contains(event.target))closePanel();
});
const watch=new MutationObserver(sectionChanged);
for(const id of ["main-view","saved-panel","quiz-hub-view"]){
 const target=document.getElementById(id);
 if(target)watch.observe(target,{attributes:true,attributeFilter:["class"]});
}
document.addEventListener("notewave:quiz-navigation",sectionChanged);
document.addEventListener("notewave:notes-ready",()=>{if(route()==="studio")showWords("Nice work! Your new notes are ready to explore. ✨");});
document.addEventListener("notewave:motion-change",event=>{
 if(event.detail?.reduced){clearTimeout(peekTimer);root.dataset.peek="false";}
});
window.addEventListener("pagehide",()=>{
 clearTimeout(peekTimer);clearTimeout(hideMessageTimer);
 try{window.speechSynthesis?.cancel();}catch{}
},{once:true});
