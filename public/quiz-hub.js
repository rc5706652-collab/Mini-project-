// Separate, transcript-grounded lecture quiz workspace.
// No cloud quiz generation or fabricated video results. Questions and weak
// concepts are derived from the actual lecture content only.
import {buildLectureQuiz,diagnoseQuiz,lessonSearchUrl} from "./lecture-quiz-core.js";
import {LANGUAGE_LABELS} from "./speech-languages.js";
const $=id=>document.getElementById(id);
const create=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;};
let current=null,quiz=[],answers={},quizNotes=null,sourceTitle="",quizLanguage="en";
function notify(text){$("quiz-hub-status").textContent=text;}
function toggleView(showQuiz){
 $("quiz-hub-view").classList.toggle("hidden",!showQuiz);
 if(showQuiz){
  $("main-view").classList.add("hidden");$("saved-panel").classList.add("hidden");
  $("breadcrumb").textContent="Quiz studio";
  $("nav-quiz").classList.add("selected");
  $("nav-new").classList.remove("selected");$("nav-saved").classList.remove("selected");
  document.dispatchEvent(new Event("notewave:quiz-navigation"));
  refreshLectures();
  window.scrollTo({top:0,behavior:"instant"});
 }else{
  $("nav-quiz").classList.remove("selected");
 }
}
$("nav-quiz").addEventListener("click",()=>toggleView(true));
$("nav-new").addEventListener("click",()=>toggleView(false));
$("nav-saved").addEventListener("click",()=>toggleView(false));
$("top-create").addEventListener("click",()=>toggleView(false));
$("quiz-go-studio").addEventListener("click",()=>{toggleView(false);$("nav-new").click();});
document.addEventListener("notewave:notes-ready",event=>{
 current=event.detail?.notes||null;
 refreshLectures();
});
document.addEventListener("notewave:notes-reset",()=>{current=null;refreshLectures();});
function refreshLectures(){
 const dropdown=$("quiz-lecture"),old=dropdown.value;
 dropdown.replaceChildren(new Option("Choose a lecture…",""));
 if(current?.transcript)dropdown.add(new Option("Current recording · "+current.title.slice(0,45),"current"));
 let history=[];
 try{history=JSON.parse(localStorage.getItem("notewave-history-v1")||"[]");}catch{}
 for(const item of history.filter(x=>x?.notes?.transcript).slice(0,12)){
  dropdown.add(new Option("Saved · "+String(item.notes.title||item.source).slice(0,48),"saved:"+item.id));
 }
 dropdown.add(new Option("Paste my own lecture text","paste"));
 if([...dropdown.options].some(x=>x.value===old))dropdown.value=old;
 else dropdown.value=current?.transcript?"current":"paste";
 updateSourceMode();
}
function updateSourceMode(){
 const pasted=$("quiz-lecture").value==="paste";
 $("quiz-paste-group").classList.toggle("hidden",!pasted);
}
$("quiz-lecture").addEventListener("change",updateSourceMode);
function lecture(){
 const value=$("quiz-lecture").value;
 if(value==="paste"){
  return {text:$("quiz-lecture-text").value.trim(),title:"Pasted lecture",language:"en"};
 }
 if(value==="current"&&current?.transcript){
  return {text:current.transcript,title:current.title,language:current.outputLanguage||"en"};
 }
 if(value.startsWith("saved:")){
  let rows=[];
  try{rows=JSON.parse(localStorage.getItem("notewave-history-v1")||"[]");}catch{}
  const selected=rows.find(x=>String(x.id)===value.slice(6));
  if(selected?.notes?.transcript){
   return {text:selected.notes.transcript,title:selected.notes.title||selected.source,language:selected.language||"en"};
  }
 }
 return {text:"",title:"",language:"en"};
}
function clearQuiz(){
 quiz=[];answers={};quizNotes=null;
 $("quiz-hub-questions").replaceChildren();
 $("quiz-hub-results").replaceChildren();
 $("quiz-hub-results").classList.add("hidden");
 $("quiz-submit").classList.add("hidden");
 $("quiz-retry").classList.add("hidden");
}
$("quiz-form").addEventListener("submit",event=>{
 event.preventDefault();clearQuiz();
 const chosen=lecture();
 if(chosen.text.length<80){notify("Choose a lecture with at least a short paragraph of information. A topic name alone is not a reliable source for a quiz.");return;}
 sourceTitle=chosen.title;quizLanguage=chosen.language;
 const focus=$("quiz-topic").value.trim();
 const attempt=buildLectureQuiz(chosen.text,{topic:focus,count:Number($("quiz-count").value)});
 if(attempt.error){notify(attempt.error);return;}
 quiz=attempt.questions;quizNotes=attempt.notes;
 renderQuiz();
 notify("Ready: "+quiz.length+" source-grounded questions from "+sourceTitle+". Submit answers to reveal explanations and weak concepts.");
});
function renderQuiz(){
 answers={};$("quiz-hub-questions").replaceChildren();
 quiz.forEach((q,index)=>{
  const card=create("fieldset","quiz-hub-question");
  const legend=create("legend","",String(index+1)+". "+q.question);
  card.append(legend);
  q.choices.forEach((choice,optionIndex)=>{
   const label=create("label","quiz-hub-option");
   const input=create("input");input.type="radio";input.name="lecture-q-"+index;
   input.value=choice;input.checked=answers[q.id]===choice;
   input.addEventListener("change",()=>{answers[q.id]=choice;notify(Object.keys(answers).length+" / "+quiz.length+" answered");});
   const text=create("span","",choice);
   label.append(input,text);card.append(label);
  });
  $("quiz-hub-questions").append(card);
 });
 $("quiz-submit").classList.remove("hidden");$("quiz-retry").classList.remove("hidden");
}
$("quiz-retry").addEventListener("click",()=>{
 if(!quiz.length)return;
 $("quiz-hub-results").classList.add("hidden");
 $("quiz-hub-results").replaceChildren();
 renderQuiz();
 notify("Try again. Review weak topics after submitting your answers.");
});
$("quiz-submit").addEventListener("click",()=>{
 if(!quiz.length)return;
 const grade=diagnoseQuiz(quiz,answers),holder=$("quiz-hub-results");
 holder.replaceChildren();
 holder.classList.remove("hidden");
 holder.append(create("h3","","Your learning report — "+grade.correct+" / "+grade.total+" ("+grade.score+"%)"));
 const overview=create("p","muted",
  "Based on this practice quiz, "+grade.weak.length+" concept"+(grade.weak.length===1?" needs":"s need")+" review. This is not a formal learning assessment.");
 holder.append(overview);
 for(const question of quiz){
  const result=grade.results.find(x=>x.id===question.id);
  const item=create("article","quiz-hub-review "+(result.correct?"review-correct":"review-weak"));
  item.append(create("strong","",result.correct?"✓ Understood: "+question.answer:"Review: "+question.answer));
  item.append(create("p","","Correct answer: "+question.answer+". Your answer: "+(result.selected||"Not answered")+"."));
  item.append(create("blockquote","",question.evidence));
  if(!result.correct){
   const why=create("p","quiz-hub-explain","Loisel's simple explanation: The lecture states that “"+question.evidence+"”. "+question.answer+" is the missing key concept. Reread that passage, then attempt the question again.");
   item.append(why);
   const row=create("div","quiz-hub-review-actions");
   const videos=create("a","quiz-video-link","▶ Find lesson videos");
   videos.href=lessonSearchUrl(question.answer,sourceTitle,quizLanguage);
   videos.target="_blank";videos.rel="noopener noreferrer";
   videos.setAttribute("aria-label","Search YouTube for lessons on "+question.answer+" (external site)");
   const ask=create("button","soft-button","Ask Loisel to explain");
   ask.type="button";ask.addEventListener("click",()=>{
    const excerpt=quizNotes;
    document.dispatchEvent(new CustomEvent("notewave:quiz-help",{detail:{
     question:"Please explain "+question.answer+" in simple steps using this lecture: "+question.evidence,
     notes:excerpt
    }}));
    toggleView(false);$("nav-new").click();
    $("pip-chat").scrollIntoView({behavior:"smooth",block:"start"});
   });
   row.append(videos,ask);item.append(row);
  }
  holder.append(item);
 }
 if(!grade.weak.length)holder.append(create("p","quiz-hub-success","Great work! You answered all these questions. Try a different lecture to test broader understanding."));
 $("quiz-submit").classList.add("hidden");
 notify("Quiz completed. Review evidence and follow video lessons for your weaker concepts.");
 holder.scrollIntoView({block:"start",behavior:"smooth"});
});
refreshLectures();
