// Enterprise theme controller. No dependency on inference/rendering code.
// Initial theme is assigned synchronously in index.html before styles load.
import {THEME_KEY,PREFERENCES,normalizePreference,resolveTheme,metaThemeColor} from "./theme-core.js";
const html=document.documentElement;
const os=window.matchMedia("(prefers-color-scheme: dark)");
const top=document.querySelector(".top-actions");
if(top){
 const control=document.createElement("div");
 control.className="nw-appearance";control.id="nw-appearance";
 const trigger=document.createElement("button");
 trigger.id="nw-theme-trigger";trigger.className="nw-theme-trigger";trigger.type="button";
 trigger.setAttribute("aria-label","Appearance: open color theme options");
 trigger.setAttribute("aria-expanded","false");trigger.setAttribute("aria-controls","nw-theme-menu");
 trigger.setAttribute("aria-haspopup","true");
 const icon=document.createElement("span");icon.className="nw-theme-icon";icon.setAttribute("aria-hidden","true");
 const caption=document.createElement("span");caption.className="nw-theme-caption";
 const chevron=document.createElement("span");chevron.className="nw-theme-chevron";chevron.setAttribute("aria-hidden","true");chevron.textContent="⌄";
 trigger.append(icon,caption,chevron);
 const menu=document.createElement("div");
 menu.id="nw-theme-menu";menu.className="nw-theme-menu";menu.hidden=true;
 menu.setAttribute("role","group");menu.setAttribute("aria-label","Select appearance");
 const variants=[
  ["light","☀","Light","Bright surfaces, crisp ink"],
  ["dark","☾","Dark","Midnight glass, soft glow"],
  ["system","◐","System","Follow your device setting"]
 ];
 let preference=normalizePreference(html.dataset.themePreference||"system");
 function sync(){
  const actual=resolveTheme(preference,os.matches);
  html.dataset.theme=actual;
  html.dataset.themePreference=preference;
  html.style.colorScheme=actual;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content",metaThemeColor(actual));
  icon.textContent=actual==="dark"?"☾":"☀";
  caption.textContent=preference==="system"?"System":preference==="dark"?"Dark":"Light";
  trigger.setAttribute("aria-label","Appearance: "+caption.textContent+". Change color theme");
  for(const button of menu.querySelectorAll("[data-theme-choice]")){
   const chosen=button.dataset.themeChoice===preference;
   button.setAttribute("aria-pressed",String(chosen));
   button.classList.toggle("selected",chosen);
  }
  document.dispatchEvent(new CustomEvent("notewave:theme-change",{detail:{preference,theme:actual}}));
 }
 function store(value){
  preference=normalizePreference(value);
  try{localStorage.setItem(THEME_KEY,preference);}catch{}
  sync();
 }
 function close(focus=false){
  if(menu.hidden)return;
  menu.hidden=true;
  trigger.setAttribute("aria-expanded","false");
  control.classList.remove("open");
  if(focus)trigger.focus();
 }
 function open(){
  menu.hidden=false;
  trigger.setAttribute("aria-expanded","true");
  control.classList.add("open");
  menu.querySelector('[aria-pressed="true"]')?.focus();
 }
 for(const [value,symbol,name,detail] of variants){
  const button=document.createElement("button");button.type="button";button.className="nw-theme-choice";
  button.dataset.themeChoice=value;
  const glyph=document.createElement("span");glyph.className="nw-theme-choice-glyph";glyph.textContent=symbol;glyph.setAttribute("aria-hidden","true");
  const words=document.createElement("span");words.className="nw-theme-choice-words";
  const title=document.createElement("strong");title.textContent=name;
  const sub=document.createElement("small");sub.textContent=detail;
  const check=document.createElement("span");check.className="nw-theme-check";check.setAttribute("aria-hidden","true");check.textContent="✓";
  words.append(title,sub);button.append(glyph,words,check);
  button.addEventListener("click",()=>{store(value);close(true);});
  menu.append(button);
 }
 trigger.addEventListener("click",()=>menu.hidden?open():close(true));
 trigger.addEventListener("keydown",event=>{
  if(event.key==="ArrowDown"){event.preventDefault();open();}
 });
 menu.addEventListener("keydown",event=>{
  if(event.key==="Escape"){event.preventDefault();close(true);return;}
  if(["ArrowDown","ArrowUp","Home","End"].includes(event.key)){
   event.preventDefault();
   const list=[...menu.querySelectorAll("button")],index=list.indexOf(document.activeElement);
   let next=0;
   if(event.key==="End")next=list.length-1;
   else if(event.key==="Home")next=0;
   else next=(index+(event.key==="ArrowDown"?1:-1)+list.length)%list.length;
   list[next].focus();
  }
 });
 document.addEventListener("pointerdown",event=>{
  if(!control.contains(event.target))close();
 });
 document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&!menu.hidden){event.stopPropagation();close(true);}
 });
 os.addEventListener?.("change",()=>{
  if(preference==="system")sync();
 });
 control.append(trigger,menu);
 top.insertBefore(control,top.querySelector("#top-create"));
 sync();
}
