// NoteWave Enterprise Interaction Layer
// Progressive enhancement only; speech recognition, notes and study engines remain independent.
// Rendering is adaptive, accessible, and never required for core app functionality.
import {experienceBudget,effectiveReducedMotion,tiltFromPointer,filterCommands} from "./experience-core.js";

const $=id=>document.getElementById(id);
const mqReduced=window.matchMedia("(prefers-reduced-motion: reduce)");
const mqCoarse=window.matchMedia("(pointer: coarse)");
const motionKey="notewave-motion-v1";
let preference="system";
try{const stored=localStorage.getItem(motionKey);if(stored==="reduce")preference=stored;}catch{}
let state=null;
let lastView="home",lastResults=false;
let restoringRoute=false;
const make=(tag,css,text)=>{
 const node=document.createElement(tag);
 if(css)node.className=css;
 if(text!==undefined)node.textContent=text;
 return node;
};
function budget(){
 return experienceBudget({
  width:window.innerWidth,
  deviceMemory:navigator.deviceMemory||4,
  saveData:Boolean(navigator.connection?.saveData),
  reducedMotion:effectiveReducedMotion(mqReduced.matches,preference),
  pointerCoarse:mqCoarse.matches
 });
}
function setBudget(){
 state=budget();
 document.documentElement.dataset.nwQuality=state.quality;
 document.documentElement.dataset.nwViewport=state.breakpoint;
 document.documentElement.dataset.motion=state.useMotion?"full":"reduced";
 document.documentElement.style.setProperty("--nw-max-dpr",String(state.maxDpr));
 document.dispatchEvent(new CustomEvent("notewave:motion-change",{detail:{reduced:!state.useMotion,quality:state.quality,activeFps:state.activeFps,idleFps:state.idleFps,maxDpr:state.maxDpr}}));
 const toggle=$("nw-motion-toggle");
 if(toggle){
  toggle.setAttribute("aria-pressed",String(preference==="reduce"));
  toggle.title=preference==="reduce"?"Use system motion preference":"Reduce decorative motion";
  toggle.innerHTML=preference==="reduce"?"<span aria-hidden='true'>◌</span><span>Motion reduced</span>":"<span aria-hidden='true'>✦</span><span>Reduce motion</span>";
 }
}
function buildShell(){
 document.body.classList.add("nw-enterprise");
 const main=document.querySelector(".main");
 if(main){main.id="main-content";main.setAttribute("tabindex","-1");}
 const skip=make("a","nw-skip","Skip to main content");skip.href="#main-content";
 document.body.prepend(skip);
 const top=document.querySelector(".top-actions");
 if(top){
  const search=make("button","nw-command-open");
  search.id="nw-command-open";search.type="button";search.setAttribute("aria-label","Open quick navigation");
  search.innerHTML="<span aria-hidden='true'>⌕</span><span>Search</span><kbd>⌘ K</kbd>";
  const motion=make("button","nw-motion-toggle");
  motion.id="nw-motion-toggle";motion.type="button";motion.setAttribute("aria-label","Toggle reduced motion");
  top.insertBefore(search,top.querySelector(".top-create"));
  top.insertBefore(motion,top.querySelector(".top-create"));
  motion.addEventListener("click",()=>{
   preference=preference==="reduce"?"system":"reduce";
   try{localStorage.setItem(motionKey,preference);}catch{}
   setBudget();announce(preference==="reduce"?"Reduced motion enabled":"Using system motion settings");
  });
 }
 // Mobile bottom dock: large tap targets and safe-area padding; desktop sidebar is preserved.
 const dock=make("nav","nw-dock");
 dock.id="nw-dock";dock.setAttribute("aria-label","Quick mobile navigation");
 const items=[
  ["home","⌂","Home"],
  ["studio","✦","Studio"],
  ["chat","✧","Chat"],
  ["library","▤","Library"],
  ["quiz-studio","◇","Quiz"]
 ];
 for(const [key,glyph,label] of items){
  const btn=make("button","nw-dock-item");btn.id="nw-dock-"+key;btn.type="button";
  btn.innerHTML="<span aria-hidden='true'>"+glyph+"</span><span>"+label+"</span>";
  btn.addEventListener("click",()=>execute(key));
  dock.append(btn);
 }
 document.body.append(dock);
 // Native <dialog> gives iOS/Android/desktop focus containment and Escape.
 const dialog=make("dialog","nw-command-palette");dialog.id="nw-command-palette";
 dialog.setAttribute("aria-label","NoteWave quick commands");
 const wrapper=make("div","nw-palette-wrap");
 const heading=make("div","nw-palette-heading");
 heading.append(make("span","nw-palette-brand","✦ Quick actions"));
 const close=make("button","nw-palette-close","✕");close.type="button";close.setAttribute("aria-label","Close command palette");
 close.onclick=()=>dialog.close();heading.append(close);
 const input=make("input","nw-palette-input");input.id="nw-command-query";input.type="search";input.autocomplete="off";
 input.placeholder="What would you like to do?";input.setAttribute("aria-label","Search NoteWave commands");
 const list=make("div","nw-palette-list");list.id="nw-palette-list";list.setAttribute("role","group");
 list.setAttribute("aria-label","Available commands");
 const footer=make("div","nw-palette-footer","↑↓ Move · Enter select · Esc close");
 wrapper.append(heading,input,list,footer);dialog.append(wrapper);document.body.append(dialog);
 const toast=make("div","nw-toast");toast.id="nw-toast";toast.setAttribute("role","status");toast.setAttribute("aria-live","polite");
 document.body.append(toast);
 $("nw-command-open")?.addEventListener("click",openPalette);
 document.addEventListener("keydown",event=>{
  const key=event.key.toLowerCase();
  if((event.ctrlKey||event.metaKey)&&key==="k"){event.preventDefault();dialog.open?dialog.close():openPalette();return;}
  if(event.key==="Escape"&&dialog.open)dialog.close();
  if(event.target===input&&(event.key==="ArrowDown"||event.key==="ArrowUp")){
   const buttons=[...list.querySelectorAll("button:not([disabled])")];
   if(buttons.length){event.preventDefault();(event.key==="ArrowDown"?buttons[0]:buttons.at(-1)).focus();}
   return;
  }
  if(dialog.open && event.target?.closest?.("#nw-palette-list")&&(event.key==="ArrowDown"||event.key==="ArrowUp")){
   event.preventDefault();
   const buttons=[...list.querySelectorAll("button:not([disabled])")];
   const index=buttons.indexOf(event.target);
   if(index>=0)buttons[(index+(event.key==="ArrowDown"?1:-1)+buttons.length)%buttons.length].focus();
  }
 });
 input.addEventListener("input",renderPalette);
 dialog.addEventListener("close",()=>{input.value="";});
 function renderPalette(){
  const available=filterCommands(input.value,!$("results")?.classList.contains("hidden"));
  list.replaceChildren();
  if(!available.length)list.append(make("p","nw-palette-empty","No matching commands. Generate notes to unlock study actions."));
  for(const command of available){
   const button=make("button","nw-command-row");button.type="button";
   const content=make("span","nw-command-text");
   content.append(make("strong","",command.label),make("small","",command.description));
   const shortcut=make("kbd","",command.shortcut);
   button.append(content,shortcut);
   button.onclick=()=>{dialog.close();execute(command.id);};
   list.append(button);
  }
 }
 function openPalette(){
  renderPalette();
  if(typeof dialog.showModal==="function")dialog.showModal();
  else dialog.setAttribute("open","");
  input.focus();
 }
 // Essential keyboard shortcuts when the user isn't editing text.
 document.addEventListener("keydown",event=>{
  if(event.metaKey||event.ctrlKey||event.altKey||dialog.open)return;
  if(event.target?.closest?.("input,textarea,select,[contenteditable]"))return;
  const keys={s:"studio",n:"new",l:"library",g:"galaxy",q:"quiz-studio",t:"tutor",h:"home",c:"chat"};
  const cmd=keys[event.key.toLowerCase()];
  if(cmd){event.preventDefault();execute(cmd);}
 });
}
function execute(key){
 const targets={home:"nav-home",studio:"nav-new",chat:"nav-chat",library:"nav-saved"};
 if(targets[key]){
  $(targets[key])?.click();
 }else if(key==="new"){
  $("top-create")?.click();
 }else if(key==="quiz-studio"){
  $("nav-quiz")?.click();
 }else if(["galaxy","quiz","tutor"].includes(key)){
  if($("results")?.classList.contains("hidden")){announce("Open a note in the Studio to use learning tools");return;}
  if(lastView!=="studio")$("nav-new")?.click();
  if(lastView!=="studio")return;
  $(key+"-tab")?.click();
  $(key+"-panel")?.scrollIntoView({block:"nearest",behavior:state?.useMotion?"smooth":"auto"});
 }else if(key==="export"){
  if($("results")?.classList.contains("hidden"))announce("Generate notes before exporting");
  else $("export")?.click();
 }
 updateDock();
}
function announce(message){
 const toast=$("nw-toast");if(!toast)return;
 toast.textContent=message;toast.classList.add("visible");
 if(announce.timeout)clearTimeout(announce.timeout);
 announce.timeout=setTimeout(()=>toast.classList.remove("visible"),2900);
}
function updateDock(){
 for(const target of ["home","studio","chat","library","quiz-studio"]){
  const item=$("nw-dock-"+target);
  if(!item)continue;
  const current=target===lastView;
  item.classList.toggle("active",current);
  if(current)item.setAttribute("aria-current","page");
  else item.removeAttribute("aria-current");
 }
 const top=$("nw-command-open");
 if(top)top.setAttribute("title","Command palette (Ctrl/Cmd + K)");
}
// Page routing preserves local session state; only New session resets it.
const workspaceViews={
 home:{id:"home-view",nav:"nav-home",label:"Home"},studio:{id:"main-view",nav:"nav-new",label:"AI studio"},
 chat:{id:"chat-view",nav:"nav-chat",label:"Loisel chat"},library:{id:"saved-panel",nav:"nav-saved",label:"My library"},
 "quiz-studio":{id:"quiz-hub-view",nav:"nav-quiz",label:"Quiz studio"}
};
function routeFromLocation(){const hash=location.hash.slice(1);return hash==="create-panel"?"studio":Object.hasOwn(workspaceViews,hash)?hash:"home";}
function showWorkspace(view){
 if(!Object.hasOwn(workspaceViews,view))return;
 const changed=lastView!==view;lastView=view;document.body.dataset.workspaceView=view;
 for(const [name,page] of Object.entries(workspaceViews)){
  $(page.id).classList.toggle("hidden",name!==view);
  const nav=$(page.nav);nav.classList.toggle("selected",name===view);
  if(name===view)nav.setAttribute("aria-current","page");else nav.removeAttribute("aria-current");
 }
 $("breadcrumb").textContent=workspaceViews[view].label;
 document.title=view==="home"?"NoteWave | Loisel — Multilingual AI Study Companion":workspaceViews[view].label+" | NoteWave";
 if(!restoringRoute&&routeFromLocation()!==view)history.pushState(null,"","#"+view);
 if(changed)window.scrollTo({top:0,behavior:"instant"});updateDock();
}
function workspaceNavigation(){
 const sidebar=$("workspace-sidebar"),edge=$("workspace-edge"),menu=$("workspace-menu");
 let closeTimer=0,openedByClick=false,inside=false;
 const desktop=()=>matchMedia("(hover: hover) and (pointer: fine)").matches;
 const close=()=>{
  clearTimeout(closeTimer);openedByClick=false;
  if(sidebar.contains(document.activeElement))menu.focus({preventScroll:true});
  sidebar.dataset.open="false";sidebar.inert=true;
  menu.setAttribute("aria-expanded","false");menu.setAttribute("aria-label","Open workspace menu");
 };
 const open=(click=false)=>{
  clearTimeout(closeTimer);openedByClick=click||openedByClick;
  sidebar.inert=false;sidebar.dataset.open="true";
  menu.setAttribute("aria-expanded","true");menu.setAttribute("aria-label","Close workspace menu");
 };
 let lastX=null,lastY=null;
 document.addEventListener("pointermove",event=>{const moved=lastX!==null&&(lastX!==event.clientX||lastY!==event.clientY);lastX=event.clientX;lastY=event.clientY;if(desktop()&&event.pointerType!=="touch"&&sidebar.dataset.open!=="true"&&event.clientX<=10&&(moved||event.movementX||event.movementY))open();},{passive:true});
 edge.addEventListener("pointerleave",()=>{if(!openedByClick)closeTimer=setTimeout(()=>{if(!inside)close();},240);});
 sidebar.addEventListener("pointerenter",()=>{inside=true;clearTimeout(closeTimer);});
 sidebar.addEventListener("pointerleave",event=>{
  inside=false;if(desktop()&&event.pointerType!=="touch"&&!openedByClick)closeTimer=setTimeout(close,170);
 });
 menu.addEventListener("click",()=>{if(sidebar.dataset.open==="true")close();else{open(true);$("nav-home").focus({preventScroll:true});}});
 document.addEventListener("pointerdown",event=>{if(sidebar.dataset.open==="true"&&!sidebar.contains(event.target)&&!menu.contains(event.target)&&event.target!==edge)close();});
 document.addEventListener("keydown",event=>{if(event.key==="Escape"&&sidebar.dataset.open==="true")close();});
 sidebar.addEventListener("click",event=>{if(event.target.closest("button.side-link,button.recent-item"))close();});
 $("nav-home").addEventListener("click",()=>showWorkspace("home"));
 $("nav-chat").addEventListener("click",()=>showWorkspace("chat"));
 $("nav-session").addEventListener("click",()=>$("top-create").click());
 for(const [id,view] of [["home-start","studio"],["home-chat","chat"]])$(id).addEventListener("click",event=>{event.preventDefault();execute(view);});
 document.addEventListener("notewave:workspace-view",event=>showWorkspace(event.detail.view));
 document.addEventListener("notewave:quiz-navigation",()=>showWorkspace("quiz-studio"));
 function restore(){restoringRoute=true;const view=routeFromLocation();if(view==="home"||view==="chat")showWorkspace(view);else execute(view);restoringRoute=false;}
 window.addEventListener("popstate",restore);restore();
}
function keyboardTabs(){
 // WAI-ARIA Tabs keyboard navigation with arrows, Home, End. Works for dynamically added AI tabs.
 document.addEventListener("keydown",event=>{
  if(!["ArrowRight","ArrowLeft","Home","End"].includes(event.key))return;
  const current=event.target?.closest?.('[role="tab"]');
  if(!current)return;
  const list=[...current.parentElement.querySelectorAll('[role="tab"]:not(:disabled)')];
  if(list.length<2)return;
  event.preventDefault();
  const index=list.indexOf(current);
  const next=event.key==="Home"?0:event.key==="End"?list.length-1:
   (index+(event.key==="ArrowRight"?1:-1)+list.length)%list.length;
  list[next].focus();list[next].click();
 });
}
function responsive() {
 let pending=0;
 const update=()=>{
  pending=0;setBudget();updateDock();glassTilt();
  document.documentElement.style.setProperty("--nw-screen-height",String(window.visualViewport?.height||window.innerHeight)+"px");
 };
 const schedule=()=>{if(!pending)pending=requestAnimationFrame(update);};
 window.addEventListener("resize",schedule,{passive:true});
 window.visualViewport?.addEventListener("resize",schedule,{passive:true});
 mqReduced.addEventListener?.("change",schedule);
 mqCoarse.addEventListener?.("change",schedule);
 const header=document.querySelector(".topbar");
 let scrollFrame=0;
 window.addEventListener("scroll",()=>{
  if(scrollFrame)return;
  scrollFrame=requestAnimationFrame(()=>{
   scrollFrame=0;
   header?.classList.toggle("nw-scrolled",window.scrollY>24);
  });
 },{passive:true});
 setBudget();
}
function contentReveals(){
 if(!("IntersectionObserver" in window)||!state?.useMotion)return;
 const observer=new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting){
   entry.target.classList.add("nw-in-view");
   observer.unobserve(entry.target);
  }
 },{threshold:.065,rootMargin:"0px 0px 18px 0px"});
 function register(){
  document.querySelectorAll(".side-feature,.studio-heading,.notes-grid>.note,.creator-layout .composer,.results>.transcript,.hero-copy")
   .forEach(node=>{
    if(node.dataset.nwReveal)return;
    node.dataset.nwReveal="true";
    observer.observe(node);
  });
 }
 register();
 const watch=new MutationObserver(register);
 watch.observe($("results")||document.body,{subtree:true,childList:true});
 // Never leave content invisible if users change their motion preference.
 document.addEventListener("notewave:motion-change",event=>{
  if(event.detail?.reduced){
   document.querySelectorAll("[data-nw-reveal]").forEach(el=>el.classList.add("nw-in-view"));
  }
 });
}
function glassTilt(){
 if(!state?.enableTilt)return;
 const hoverTargets=document.querySelectorAll(".notes-grid>.note,.side-feature,.composer,.studio-panel");
 for(const panel of hoverTargets){
  if(panel.dataset.nwTilt)return;
  panel.dataset.nwTilt="true";
  let frame=0;
  panel.addEventListener("pointermove",e=>{
   if(!state.enableTilt||e.pointerType==="touch")return;
   if(frame)return;
   const x=e.clientX,y=e.clientY;
   frame=requestAnimationFrame(()=>{
    frame=0;const rect=panel.getBoundingClientRect();
    const angles=tiltFromPointer(x-rect.left,y-rect.top,rect.width,rect.height,2.5);
    panel.style.setProperty("--nw-tilt-x",angles.x+"deg");
    panel.style.setProperty("--nw-tilt-y",angles.y+"deg");
    panel.classList.add("nw-is-tilting");
   });
  },{passive:true});
  const leave=()=>{cancelAnimationFrame(frame);frame=0;panel.classList.remove("nw-is-tilting");panel.style.removeProperty("--nw-tilt-x");panel.style.removeProperty("--nw-tilt-y");};
  panel.addEventListener("pointerleave",leave,{passive:true});
  panel.addEventListener("pointercancel",leave,{passive:true});
 }
}
function observeWorkflow(){
 // Dynamic results and navigation are managed by existing app; mirror state without modifying it.
 const watcher=new MutationObserver(()=>{
  const visible=!$("results")?.classList.contains("hidden");
  if(visible!==lastResults){lastResults=visible;updateDock();glassTilt();}
  updateDock();
  const working=$("working");
  document.body.classList.toggle("nw-processing",Boolean(working&&!working.classList.contains("hidden")));
 });
 watcher.observe($("results"),{attributes:true,attributeFilter:["class"]});
 watcher.observe($("saved-panel"),{attributes:true,attributeFilter:["class"]});
 watcher.observe($("working"),{attributes:true,attributeFilter:["class"]});
 for(const id of ["save","copy"]){
  const button=$(id);
  if(!button)continue;
  const observer=new MutationObserver(()=>{
   if(button.textContent?.includes("✓"))announce(id==="save"?"Notes saved in your browser":"Notes copied to clipboard");
  });
  observer.observe(button,{childList:true,characterData:true,subtree:true});
 }
}
function handleWebGL(){
 for(const id of ["orb-canvas","alchemy-canvas"]){
  const canvas=$(id);if(!canvas)continue;
  canvas.addEventListener("webglcontextlost",()=>{
   canvas.closest(".orb-stage,.alchemy-stage")?.classList.add(id==="orb-canvas"?"orb-fallback":"alchemy-fallback");
  },{passive:true});
  canvas.addEventListener("webglcontextrestored",()=>{
   const stage=canvas.closest(".orb-stage,.alchemy-stage");
   stage?.classList.remove(id==="orb-canvas"?"orb-fallback":"alchemy-fallback");
  },{passive:true});
 }
}
function init(){
 if(document.body.classList.contains("nw-enterprise"))return;
 buildShell();
 workspaceNavigation();
 keyboardTabs();
 responsive();
 contentReveals();
 glassTilt();
 observeWorkflow();
 handleWebGL();
 updateDock();
 const reduced=state?.quality==="minimal";
 if(reduced)document.body.classList.add("nw-economy");
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
