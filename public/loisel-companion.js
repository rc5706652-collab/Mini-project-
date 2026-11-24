// Loisel Pocket Sprite (v2). A distinctly new, pearl-like robot with a real
// 3-find hide-and-seek interaction. No WebGL, image downloads, or automatic voice.
// Fixed, accessible hit targets; all motion is optional and CSS-only.
const node=(tag,cls,text)=>{
 const x=document.createElement(tag);
 if(cls)x.className=cls;
 if(text!==undefined)x.textContent=text;
 return x;
};
const root=node("aside","loisel-buddy");
root.id="loisel-buddy";root.dataset.open="false";root.dataset.hidden="false";
root.dataset.peek="false";root.dataset.spot="right";root.dataset.game="idle";
root.setAttribute("aria-label","Loisel pocket companion");
const bubble=node("div","loisel-buddy-words");
bubble.id="loisel-buddy-words";bubble.hidden=true;
bubble.setAttribute("role","status");bubble.setAttribute("aria-live","polite");
const panel=node("section","loisel-buddy-panel");panel.id="loisel-buddy-panel";panel.hidden=true;
panel.append(node("strong","","Meet Lumi, Loisel's playful little helper"));
panel.append(node("p","","I can help you study or play three quick rounds of hide-and-seek."));
const actions=node("div","loisel-buddy-actions");
const ask=node("button","","💬 Ask Loisel");ask.id="loisel-buddy-ask";ask.type="button";
const quiz=node("button","","◇ Quiz Studio");quiz.id="loisel-buddy-quiz";quiz.type="button";
const game=node("button","","👀 Play hide & seek");game.id="loisel-buddy-game";game.type="button";
const voice=node("button","","🔇 Voice off");voice.id="loisel-buddy-audio";voice.type="button";
voice.setAttribute("aria-pressed","false");
const close=node("button","","Close");close.id="loisel-buddy-close";close.type="button";
actions.append(ask,quiz,game,voice,close);panel.append(actions);
const controls=node("div","loisel-buddy-controls");
const quiet=node("button","loisel-buddy-quiet","×");quiet.id="loisel-buddy-quiet";quiet.type="button";
quiet.setAttribute("aria-label","Hide mini Loisel");quiet.title="Hide or show the mini companion";
const toggle=node("button","loisel-buddy-toggle");toggle.id="loisel-buddy-toggle";toggle.type="button";
toggle.setAttribute("aria-label","Talk to Loisel pocket companion");toggle.title="A tiny companion: tap to talk or play";
toggle.setAttribute("aria-expanded","false");toggle.setAttribute("aria-controls","loisel-buddy-panel");
// This character is structurally and visually different from the old angular robot.
// Round porcelain shell, glowing galaxy visor, comet antenna, soft fins, tiny feet.
const sprite=node("span","loisel-pocket-sprite");sprite.setAttribute("aria-hidden","true");
const halo=node("span","loisel-pocket-halo");
const antenna=node("span","loisel-pocket-antenna");
const shell=node("span","loisel-pocket-shell");
const earLeft=node("span","loisel-pocket-ear left"),earRight=node("span","loisel-pocket-ear right");
const visor=node("span","loisel-pocket-visor");
visor.append(node("span","loisel-pocket-eye left"),node("span","loisel-pocket-eye right"),node("span","loisel-pocket-mouth"));
const glow=node("span","loisel-pocket-core","✦");
shell.append(earLeft,earRight,visor,glow);
const fins=node("span","loisel-pocket-fins");
fins.append(node("span","loisel-pocket-fin left"),node("span","loisel-pocket-fin right"));
const feet=node("span","loisel-pocket-feet");
feet.append(node("span","loisel-pocket-foot left"),node("span","loisel-pocket-foot right"));
sprite.append(halo,antenna,shell,fins,feet);
const book=node("span","loisel-pocket-hide-cover","✦");book.setAttribute("aria-hidden","true");
toggle.append(sprite,book);
controls.append(quiet,toggle);
root.append(bubble,panel,controls);document.body.append(root);
const spots=["right","left","high-right"];
let spotIndex=0,hideTimer=null,bubbleTimer=null,peekTimer=null,gameRound=0;
let currentSection="studio",hidden=false,soundEnabled=false;
const reduced=()=>matchMedia("(prefers-reduced-motion: reduce)").matches||
 document.documentElement.dataset.motion==="reduced";
const canSpeak=!!window.speechSynthesis;
if(!canSpeak){voice.disabled=true;voice.title="Speech playback unavailable";}
function section(){
 if(!document.getElementById("quiz-hub-view")?.classList.contains("hidden"))return "quiz";
 if(!document.getElementById("saved-panel")?.classList.contains("hidden"))return "library";
 return "studio";
}
function speak(msg){
 if(!soundEnabled||!canSpeak)return;
 try{
  speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(msg.replace(/[\u{1F300}-\u{1FAFF}]/gu,""));
  utterance.lang="en-US";utterance.pitch=1.16;utterance.rate=1.02;utterance.volume=.6;
  speechSynthesis.speak(utterance);
 }catch{}
}
function message(msg,voiceAllowed=false){
 if(hidden)return;
 bubble.textContent=msg;bubble.hidden=false;
 clearTimeout(bubbleTimer);
 if(voiceAllowed)speak(msg);
 bubbleTimer=setTimeout(()=>{bubble.hidden=true;},4200);
}
function closePanel(){
 panel.hidden=true;root.dataset.open="false";toggle.setAttribute("aria-expanded","false");
}
function openPanel(){
 if(hidden)return;
 panel.hidden=false;root.dataset.open="true";toggle.setAttribute("aria-expanded","true");
 message("Hi! I'm Lumi. Want to play hide-and-seek? ✨");
}
function nextSpot(){
 spotIndex=(spotIndex+1)%spots.length;
 root.dataset.spot=spots[spotIndex];
}
function peek(){
 if(hidden||reduced())return;
 root.dataset.peek="false";
 clearTimeout(peekTimer);
 // Remove/reinsert CSS class to replay a tiny peek animation.
 void sprite.offsetWidth;
 root.dataset.peek="true";
 peekTimer=setTimeout(()=>{root.dataset.peek="false";},1350);
}
function stopGame(){
 gameRound=0;root.dataset.game="idle";game.textContent="👀 Play hide & seek";
}
function startGame(){
 if(hidden)return;
 gameRound=0;root.dataset.game="seek";game.textContent="End game";
 closePanel();nextSpot();peek();
 message("Psst! I'm hiding behind a tiny book. Tap my glowing eyes! (0 / 3)");
}
function found(){
 gameRound++;
 if(gameRound>=3){
  stopGame();
  root.dataset.game="celebrate";nextSpot();
  message("You found me three times! ✨ High five, superstar!",true);
  peek();
  clearTimeout(hideTimer);
  hideTimer=setTimeout(()=>{root.dataset.game="idle";},2400);
  return;
 }
 nextSpot();peek();message("You caught me! Round "+gameRound+" / 3. Where am I now? 👀");
}
function routeChanged(){
 const destination=section();
 if(destination===currentSection)return;
 currentSection=destination;closePanel();
 nextSpot();peek();
 const greeting={
  studio:"Peekaboo! Let's turn that lecture into something brilliant.",
  library:"Shh… I hid near your saved notes. Can you spot me? 📚",
  quiz:"Found me! I love a quiz. Ready to practise? ⭐"
 }[destination];
 if(root.dataset.game!=="seek")message(greeting,true);
 else message("You changed sections, but I'm still hiding. Find me!");
}
toggle.addEventListener("click",()=>{
 if(hidden)return;
 if(root.dataset.game==="seek"){found();return;}
 if(panel.hidden)openPanel();else closePanel();
});
game.addEventListener("click",()=>{
 if(root.dataset.game==="seek"){stopGame();message("We'll play again later!");closePanel();}
 else startGame();
});
close.addEventListener("click",()=>{closePanel();toggle.focus();});
quiet.addEventListener("click",()=>{
 hidden=!hidden;root.dataset.hidden=String(hidden);
 quiet.textContent=hidden?"✦":"×";
 quiet.setAttribute("aria-label",hidden?"Show mini Loisel":"Hide mini Loisel");
 if(hidden){stopGame();closePanel();bubble.hidden=true;try{speechSynthesis?.cancel();}catch{}}
 else{root.dataset.spot="right";spotIndex=0;message("I'm back! Missed me? ✨");peek();}
});
voice.addEventListener("click",()=>{
 if(!canSpeak)return;
 soundEnabled=!soundEnabled;
 voice.setAttribute("aria-pressed",String(soundEnabled));
 voice.textContent=soundEnabled?"🔊 Voice on":"🔇 Voice off";
 if(!soundEnabled)try{speechSynthesis.cancel();}catch{}
 message(soundEnabled?"Voice greetings are on!":"Back to quiet text greetings.");
});
ask.addEventListener("click",()=>{
 stopGame();closePanel();
 if(section()!=="studio")document.getElementById("nav-new")?.click();
 const chat=document.getElementById("pip-chat");
 chat?.scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"});
 document.getElementById("pip-question")?.focus({preventScroll:true});
 message("Ask Loisel any question about your lesson!");
});
quiz.addEventListener("click",()=>{
 stopGame();closePanel();
 document.getElementById("nav-quiz")?.click();
 message("Choose a recording or upload a PDF and let's practise!");
 peek();
});
document.addEventListener("keydown",event=>{
 if(event.key==="Escape"&&!panel.hidden){closePanel();toggle.focus();}
});
document.addEventListener("pointerdown",event=>{
 if(!root.contains(event.target))closePanel();
});
const observer=new MutationObserver(routeChanged);
for(const id of ["main-view","saved-panel","quiz-hub-view"]){
 const target=document.getElementById(id);
 if(target)observer.observe(target,{attributes:true,attributeFilter:["class"]});
}
document.addEventListener("notewave:quiz-navigation",routeChanged);
document.addEventListener("notewave:notes-ready",()=>{
 if(section()==="studio"&&root.dataset.game!=="seek")message("New notes are ready! Let's learn something new. ✨");
});
document.addEventListener("notewave:motion-change",event=>{
 if(event.detail?.reduced){root.dataset.peek="false";clearTimeout(peekTimer);}
});
window.addEventListener("pagehide",()=>{
 clearTimeout(bubbleTimer);clearTimeout(peekTimer);clearTimeout(hideTimer);
 try{speechSynthesis?.cancel();}catch{}
},{once:true});
