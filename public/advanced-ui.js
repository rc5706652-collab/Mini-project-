import {makeGalaxy,galaxyCoordinates} from "./knowledge.js";
import {makeQuiz,gradeQuiz} from "./quiz.js";
import {tutorContext,tutorFallback} from "./tutor.js";
import {saveSession,deleteSession,clearSessions,migrateLegacy,listSessions,searchSessions} from "./memory.js";
const $=id=>document.getElementById(id);
function el(tag,name,text){const item=document.createElement(tag);if(name)item.className=name;if(text!==undefined)item.textContent=String(text);return item;}

export async function createAdvancedStudio({openSaved,onDelete}){
 const response=await fetch("./advanced-template.html");
 if(!response.ok)throw Error("Learning interface failed to load");
 const template=await response.text();
 const [section,other]=template.split("<!-- AUDIO_LANGUAGE -->");
 const [language,memory]=other.split("<!-- MEMORY -->");
 $("results").querySelector(".transcript").insertAdjacentHTML("beforebegin",section);
 $("create-panel").querySelector(".tabs").insertAdjacentHTML("afterend",language);
 $("saved-list").insertAdjacentHTML("beforebegin",memory);
 const scene=$("galaxy-scene"),space=$("galaxy-space");
 let notes=null,quiz=[],answers={},saved=[],rotX=-13,rotY=16,drag=null,tutorWorker=null,loading=false,requestId=0;
 function rotate(){space.style.transform="rotateX("+rotX+"deg) rotateY("+rotY+"deg)";}
 rotate();
 scene.addEventListener("pointerdown",e=>{
  if(e.target.closest("button"))return;
  drag={x:e.clientX,y:e.clientY,id:e.pointerId};
  scene.setPointerCapture(e.pointerId);
 });
 scene.addEventListener("pointermove",e=>{
  if(!drag||drag.id!==e.pointerId)return;
  rotY+=(e.clientX-drag.x)*.4;rotX=Math.min(48,Math.max(-48,rotX-(e.clientY-drag.y)*.3));
  drag.x=e.clientX;drag.y=e.clientY;rotate();
 });
 for(const type of ["pointerup","pointercancel"])scene.addEventListener(type,()=>drag=null);
 for(const tab of ["galaxy","quiz","tutor"]){
  $(tab+"-tab").onclick=()=>{
   for(const t of ["galaxy","quiz","tutor"]){
    $(t+"-tab").classList.toggle("active",t===tab);
    $(t+"-tab").setAttribute("aria-selected",String(t===tab));
    $(t+"-panel").classList.toggle("hidden",t!==tab);
   }
  };
 }
 function galaxy(){
  space.replaceChildren();
  const graph=makeGalaxy(notes),mobile=scene.clientWidth<600,scale=mobile?64:106;
  if(!graph.nodes.length){space.append(el("p","muted","Not enough concepts to map."));return;}
  const positions=galaxyCoordinates(graph.nodes.length);
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.setAttribute("class","galaxy-lines");svg.setAttribute("viewBox","0 0 1000 650");
  const positionById=new Map(graph.nodes.map((n,i)=>[n.id,positions[i]]));
  for(const edge of graph.edges.slice(0,25)){
   const a=positionById.get(edge.from),b=positionById.get(edge.to);
   if(!a||!b)continue;
   const line=document.createElementNS("http://www.w3.org/2000/svg","line");
   line.setAttribute("x1",500+a.x*scale);line.setAttribute("y1",325+a.y*scale);
   line.setAttribute("x2",500+b.x*scale);line.setAttribute("y2",325+b.y*scale);
   svg.append(line);
  }
  space.append(svg);
  for(let i=0;i<graph.nodes.length;i++){
   const n=graph.nodes[i],p=positions[i],button=el("button","galaxy-node",n.term);
   button.type="button";
   button.style.left="50%";button.style.top="50%";
   button.style.transform="translate(-50%,-50%) translate3d("+(p.x*scale)+"px,"+(p.y*scale)+"px,"+(p.z*scale)+"px)";
   button.style.setProperty("--star-size",String(Math.min(1.2,.78+n.weight*.08)));
   button.setAttribute("aria-label","Concept: "+n.term+". Show source evidence");
   button.onclick=()=>{
    $("galaxy-evidence").replaceChildren(el("strong","",n.term),el("p","",n.evidence));
    space.querySelectorAll(".galaxy-node").forEach(x=>x.classList.remove("active"));
    button.classList.add("active");
   };
   space.append(button);
  }
  $("galaxy-evidence").replaceChildren(el("strong","",graph.nodes[0].term),el("p","",graph.nodes[0].evidence));
 }
 function renderQuiz(){
  quiz=makeQuiz(notes);answers={};
  $("quiz-questions").replaceChildren();
  if(!quiz.length){
   $("quiz-questions").append(el("p","muted","Not enough distinct concepts for a 4-option quiz. Try a longer lecture."));
   $("quiz-score").textContent="";return;
  }
  for(const q of quiz){
   const article=el("article","quiz-card"),title=el("h4","",q.question),options=el("div","quiz-options"),feedback=el("p","quiz-feedback","");
   for(const choice of q.choices){
    const option=el("button","quiz-choice",choice);option.type="button";
    option.onclick=()=>{
     answers[q.id]=choice;
     options.querySelectorAll("button").forEach(node=>{
      node.classList.toggle("correct",node.textContent===q.answer);
      node.classList.toggle("incorrect",node.textContent===choice&&choice!==q.answer);
     });
     feedback.textContent=(choice===q.answer?"Correct. ":"The correct concept is "+q.answer+". ")+"Evidence: "+q.evidence;
     const grade=gradeQuiz(quiz,answers);
     $("quiz-score").textContent="Score "+grade.correct+" / "+grade.total+" · Answered "+Object.keys(answers).length+" / "+grade.total;
    };
    options.append(option);
   }
   article.append(title,options,feedback);$("quiz-questions").append(article);
  }
  $("quiz-score").textContent="0 / "+quiz.length+" · Choose an answer for each question";
 }
 $("quiz-restart").onclick=renderQuiz;
 function showTutor(result,warning){
  const holder=$("tutor-result");holder.replaceChildren(el("p","tutor-answer",result.text));
  if(warning)holder.append(el("p","tutor-warning",warning));
  for(const passage of result.evidence)holder.append(el("blockquote","tutor-citation",passage));
 }
 $("tutor-form").onsubmit=async e=>{
  e.preventDefault();
  if(loading||!notes)return;
  const question=$("tutor-question").value.trim();
  if(!question){$("tutor-status").textContent="Enter your question.";return;}
  const context=tutorContext(question,notes),fallback=tutorFallback(question,notes);
  showTutor(fallback);
  if(!$("tutor-generative").checked||!context.evidence.length){
   $("tutor-status").textContent=context.evidence.length?"Showing original source evidence. Opt in for a generated explanation.":"No evidence for this question in your recording.";
   return;
  }
  loading=true;$("tutor-submit").disabled=true;
  const id=++requestId;$("tutor-status").textContent="Preparing local English explanation model…";
  try{
   tutorWorker??=new Worker("./tutor-worker.js",{type:"module"});
   const answer=await new Promise((resolve,reject)=>{
    tutorWorker.onmessage=({data})=>{
     if(data.requestId!==id)return;
     if(data.type==="progress")$("tutor-status").textContent="Downloading local tutor model: "+data.progress+"%";
     if(data.type==="result")resolve(data.answer);
     if(data.type==="error")reject(Error(data.message));
    };
    tutorWorker.onerror=()=>{tutorWorker.terminate();tutorWorker=null;reject(Error("Tutor model unavailable"))};
    tutorWorker.postMessage({type:"explain",requestId:id,prompt:context.prompt});
   });
   if(requestId===id){
    showTutor({text:answer||fallback.text,evidence:context.evidence},"AI-generated draft. Verify every claim against the quoted passage.");
    $("tutor-status").textContent="Explanation produced on this device.";
   }
  }catch(error){showTutor(fallback);$("tutor-status").textContent="Tutor model unavailable: "+error.message+". Showing verified source text instead.";}
  finally{loading=false;$("tutor-submit").disabled=false;}
 };
 function update(nextNotes){
  notes=nextNotes;requestId++;
  galaxy();renderQuiz();
  $("tutor-result").textContent="Ask about the recording to begin.";
  $("tutor-status").textContent="";
 }
 function renderMemory(){
  const rows=searchSessions($("memory-search").value,saved,40),holder=$("memory-results");
  holder.replaceChildren();
  $("memory-status").textContent=rows.length+" matching · "+saved.length+" saved sessions";
  if(!rows.length){holder.append(el("p","muted","No matching recordings found."));return;}
  for(const item of rows){
   const card=el("article","saved-item"),title=el("h3","",item.notes.title||item.source);
   const date=el("p","",item.source+" · "+new Date(item.created).toLocaleDateString());
   const description=el("p","memory-excerpt",String(item.notes.summary||item.notes.transcript).slice(0,190));
   const open=el("button","","Open notes");open.onclick=()=>openSaved(item);
   const remove=el("button","","Delete");remove.onclick=async()=>{
    try{await deleteSession(item.id);onDelete(item.id);await refreshMemory();}
    catch(error){$("memory-status").textContent=error.message;}
   };
   card.append(title,date,description,open,remove);holder.append(card);
  }
 }
 $("memory-search").oninput=renderMemory;
 async function refreshMemory(){
  try{saved=await listSessions();$("saved-list").classList.add("hidden");renderMemory();}
  catch(error){$("memory-status").textContent="IndexedDB unavailable: "+error.message;$("saved-list").classList.remove("hidden");}
 }
 async function init(){
  try{await migrateLegacy();await refreshMemory();}
  catch(error){$("memory-status").textContent="Local knowledge indexing unavailable; original saved notes remain accessible.";}
 }
 async function save(item){try{await saveSession(item);await refreshMemory();}catch(e){$("memory-status").textContent="Could not index note: "+e.message;}}
 async function remove(id){try{await deleteSession(id);await refreshMemory();}catch{}}
 async function clear(){try{await clearSessions();await refreshMemory();}catch{}}
 return {update,init,save,remove,clear,refreshMemory};
}
