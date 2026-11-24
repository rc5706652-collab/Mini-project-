// Novi — real voice-to-text (Whisper), optional local text generation and source-aware questions.
// No automatic microphone activation. Conversation exists only in memory.
import {robotIntent,evidenceFor,fallbackAnswer,chatPrompt,robotStateLabel} from "./robo-core.js";
const $=id=>document.getElementById(id);
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el;};
const state={notes:null,messages:[],open:false,busy:false,listening:false,recorder:null,stream:null,chunks:[],timer:null,
  modelWorker:null,asrWorker:null,requestId:0,speaking:false,utterance:null};
const MOTION=()=>matchMedia("(prefers-reduced-motion: reduce)").matches||document.documentElement.dataset.motion==="reduced";
function robotMood(mode){
 document.dispatchEvent(new CustomEvent("notewave:robot-state",{detail:{state:mode}}));
 document.querySelectorAll("[data-novi-state]").forEach(el=>el.dataset.noviState=mode);
 if($("robo-state-label"))$("robo-state-label").textContent=robotStateLabel(mode);
}
function tell(message){if($("robo-status"))$("robo-status").textContent=message;}
function setBusy(value){
 state.busy=value;
 for(const id of ["robo-chat-input","robo-mic","robo-send"]){if($(id))$(id).disabled=value;}
}
function message(role,text,sources=[]){
 state.messages.push({role,text:String(text).slice(0,1300)});
 if(state.messages.length>22)state.messages.shift();
 const item=make("article","robo-message "+(role==="user"?"robo-user":"robo-assistant"));
 item.append(make("span","robo-message-label",role==="user"?"YOU":"✦ NOVI"),make("p","",text));
 if(sources.length){
  const detail=make("details","robo-sources"),summary=make("summary","","Source evidence · "+sources.length);
  detail.append(summary);
  for(const excerpt of sources.slice(0,3))detail.append(make("blockquote","",excerpt));
  item.append(detail);
 }
 $("robo-messages").append(item);
 while($("robo-messages").children.length>35)$("robo-messages").firstElementChild.remove();
 $("robo-messages").scrollTop=$("robo-messages").scrollHeight;
}
function open(focus=true){
 state.open=true;$("robo-chat").hidden=false;
 document.body.classList.add("robo-chat-open");
 $("robo-launcher").setAttribute("aria-expanded","true");
 if(focus)$("robo-chat-input").focus({preventScroll:true});
}
function close(){
 if(state.listening){
  state.listening=false;
  clearTimeout(state.timer);
  const recorder=state.recorder;
  if(recorder?.state==="recording")recorder.stop();
  state.stream?.getTracks().forEach(track=>track.stop());state.stream=null;
  state.chunks=[];
 }
 state.open=false;$("robo-chat").hidden=true;document.body.classList.remove("robo-chat-open");
 $("robo-launcher").setAttribute("aria-expanded","false");
 window.speechSynthesis?.cancel();state.speaking=false;
 if(!state.busy&&!state.listening)robotMood("idle");
}
function speak(answer,requestedFromVoice){
 if(!$("robo-speak").checked||!window.speechSynthesis||!window.SpeechSynthesisUtterance||(!requestedFromVoice&&!state.open)){
  robotMood("happy");return;
 }
 window.speechSynthesis.cancel();
 const utterance=new SpeechSynthesisUtterance(String(answer).replace(/https?:\/\/\S+/g,"").slice(0,360));
 utterance.rate=1.04;utterance.pitch=1.16;utterance.volume=.92;
 utterance.onstart=()=>{state.speaking=true;robotMood("speaking");};
 utterance.onend=()=>{state.speaking=false;robotMood("happy");};
 utterance.onerror=()=>{state.speaking=false;robotMood("idle");};
 try{window.speechSynthesis.speak(utterance);state.utterance=utterance;}
 catch{robotMood("idle");}
}
function navigate(action){
 const map={studio:"nav-new",new:"top-create",library:"nav-saved",quiz:"quiz-tab",galaxy:"galaxy-tab",tutor:"tutor-tab"};
 if(["quiz","galaxy","tutor"].includes(action) && ($("results")?.classList.contains("hidden")||$("main-view")?.classList.contains("hidden"))){
  return "Open or generate notes first. Then I can show you that learning tool.";
 }
 const target=$(map[action]);
 if(!target)return "That feature isn't ready here.";
 if(["quiz","galaxy","tutor"].includes(action))$("nav-new")?.click();
 target.click();
 const replies={studio:"Opening AI Studio! ✨",new:"Starting a fresh session.",library:"Here are your saved notes.",
  quiz:"Opening Quiz Arena.",galaxy:"Opening Knowledge Galaxy.",tutor:"Opening your AI tutor."};
 return replies[action]||"Done!";
}
async function generate(prompt){
 return new Promise((resolve,reject)=>{
  try{state.modelWorker??=new Worker("./tutor-worker.js",{type:"module"});}catch(err){reject(err);return;}
  const worker=state.modelWorker,id=++state.requestId;
  worker.onmessage=({data})=>{
   if(data?.requestId!==id)return;
   if(data.type==="progress")tell("Downloading small local AI: "+data.progress+"% · one-time download");
   if(data.type==="result")resolve(String(data.answer||"").trim());
   if(data.type==="error")reject(Error(data.message||"AI model unavailable"));
  };
  worker.onerror=()=>{
   worker.terminate();state.modelWorker=null;reject(Error("Your browser couldn't start the local language model."));
  };
  worker.postMessage({type:"explain",requestId:id,prompt});
 });
}
async function send(text,voice=false){
 const question=String(text||"").trim().slice(0,450);
 if(!question||state.busy)return;
 open(false);message("user",question);
 const intent=robotIntent(question);
 if(intent!=="question"){
  const answer=intent==="hello"?"Hey! I'm Novi. What shall we learn today?":intent==="thanks"?"You're welcome! I'm ready when you need me.":navigate(intent);
  message("assistant",answer);tell("Ready for your next question");speak(answer,voice);return;
 }
 const notes=state.notes?.transcript?state.notes:null;
 const mode=$("robo-answer-mode").value;
 const source=evidenceFor(question,notes);
 if(mode==="notes" && (!notes||!source.length)){
  const answer=notes?"I couldn't find that answer in the current recording. Try a phrase from your transcript.":"Generate or open notes before choosing recording-only answers.";
  message("assistant",answer);tell("Recording evidence only");speak(answer,voice);return;
 }
 const useSource=mode!=="general"&&source.length>0;
 const context=chatPrompt(question,useSource?notes:null,state.messages.slice(-6));
 setBusy(true);robotMood("thinking");tell(useSource?"Searching your lecture and generating a grounded explanation…":"Asking a small local AI model. Model download may take time…");
 try{
  let answer,label;
  try{
   const generated=await generate(context.prompt);
   const clean=generated.replace(/^(?:Answer:|Assistant:)\s*/i,"").trim();
   if(clean.length<5)throw Error("The local model produced no reliable reply.");
   answer=clean;
   label=useSource?"AI-drafted explanation · check the transcript evidence":"General local model reply · may be inaccurate";
  }catch(err){
   if(useSource){
    answer=fallbackAnswer(question,notes).text;label="Exact transcript evidence (model unavailable)";
   }else{
    answer="I couldn't generate a general answer on this device. You can retry or ask about a recording. "+String(err.message||"Model unavailable");
    label="Small local model unavailable";
   }
  }
  message("assistant",answer,useSource?source:[]);
  tell(label);speak(answer,voice);
 }finally{setBusy(false);if(!state.speaking)robotMood("happy");}
}
async function decodeAudio(blob){
 const C=window.AudioContext||window.webkitAudioContext;
 if(!C)throw Error("Audio decoding is unavailable on this browser.");
 const ctx=new C();
 try{
  const buffer=await ctx.decodeAudioData(await blob.arrayBuffer());
  if(!buffer.length||buffer.duration>23)throw Error("Record a short, clear question under 20 seconds.");
  if(window.OfflineAudioContext){
   const offline=new OfflineAudioContext(1,Math.max(1,Math.ceil(buffer.duration*16000)),16000);
   const src=offline.createBufferSource();src.buffer=buffer;src.connect(offline.destination);src.start();
   return new Float32Array((await offline.startRendering()).getChannelData(0));
  }
  const channel=buffer.getChannelData(0),samples=new Float32Array(Math.max(1,Math.ceil(buffer.duration*16000)));
  for(let i=0;i<samples.length;i++)samples[i]=channel[Math.min(channel.length-1,Math.floor(i*buffer.sampleRate/16000))];
  return samples;
 }finally{await ctx.close();}
}
async function recognize(blob){
 const samples=await decodeAudio(blob);
 return new Promise((resolve,reject)=>{
  const worker=new Worker("./worker.js",{type:"module"});state.asrWorker=worker;
  function finish(result,isError){worker.terminate();state.asrWorker=null;isError?reject(result):resolve(result);}
  worker.onmessage=({data})=>{
   if(data.type==="stage")tell(data.message||"Recognizing speech locally…");
   if(data.type==="download")tell("Downloading Whisper model: "+data.progress+"%");
   if(data.type==="complete")finish(String(data.text||"").trim(),false);
   if(data.type==="error")finish(Error(data.message||"Transcription failed"),true);
  };
  worker.onerror=()=>finish(Error("Whisper could not load. Try typing your question."),true);
  worker.postMessage({type:"transcribe",samples,language:"en",output:"original"},[samples.buffer]);
 });
}
async function startVoice(){
 if(state.busy||state.listening)return;
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){
  tell("Microphone recording isn't supported here. Please type your question.");return;
 }
 try{
  window.speechSynthesis?.cancel();
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
  const mime=["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(t=>MediaRecorder.isTypeSupported(t));
  state.stream=stream;state.chunks=[];
  const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:{});
  state.recorder=recorder;state.listening=true;
  recorder.ondataavailable=event=>{if(event.data.size)state.chunks.push(event.data);};
  recorder.onerror=()=>tell("Recording failed. Try typing instead.");
  recorder.onstop=async()=>{
   if(!state.open){stream.getTracks().forEach(track=>track.stop());return;}
   clearTimeout(state.timer);state.listening=false;
   stream.getTracks().forEach(track=>track.stop());state.stream=null;
   $("robo-mic").textContent="🎤";$("robo-mic").setAttribute("aria-pressed","false");
   $("robo-mic").setAttribute("aria-label","Start microphone recording");
   if(!state.chunks.length){tell("No audio captured.");robotMood("idle");return;}
   setBusy(true);robotMood("thinking");tell("Transcribing your voice locally with Whisper…");
   try{
    const result=await recognize(new Blob(state.chunks,{type:recorder.mimeType||"audio/webm"}));
    if(!result)throw Error("I couldn't recognize the words. Try speaking clearly.");
    setBusy(false);await send(result,true);
   }catch(err){tell(err.message||"Speech recognition failed");robotMood("error");}
   finally{setBusy(false);}
  };
  recorder.start(500);robotMood("listening");
  $("robo-mic").textContent="■";$("robo-mic").setAttribute("aria-pressed","true");
  $("robo-mic").setAttribute("aria-label","Stop recording and send voice question");
  tell("Listening… tap ■ to ask Novi (maximum 20 seconds)");
  state.timer=setTimeout(()=>{if(recorder.state==="recording")recorder.stop();},20000);
 }catch(err){
  state.stream?.getTracks().forEach(track=>track.stop());state.stream=null;
  tell(err.name==="NotAllowedError"?"Microphone denied. Enable permission in your browser settings.":"Microphone error: "+err.message);
  robotMood("error");
 }
}
function cinematic(){
 const overlay=$("robo-cinematic");
 let timer=null;
 const finish=()=>{clearTimeout(timer);overlay.hidden=true;overlay.classList.remove("playing");};
 $("robo-skip-cinematic").onclick=finish;
 function play(){
  if(MOTION())return;
  finish();overlay.hidden=false;
  void overlay.offsetWidth;overlay.classList.add("playing");
  timer=setTimeout(finish,1550);
 }
 for(const id of ["nav-new","top-create","nw-dock-studio","nw-dock-new"]){
  $(id)?.addEventListener("click",play);
 }
 document.addEventListener("click",event=>{if(event.target?.closest?.('a[href="#create-panel"]'))play();});
}
async function init(){
 if($("robo-chat"))return;
 try{
  const response=await fetch("./robo-ui.html");
  if(!response.ok)throw Error("Failed to load Novi UI");
  const html=await response.text();
  const fragment=document.createElement("div");
  fragment.innerHTML=html;
  for(const child of [...fragment.children])document.body.append(child);
 }catch(err){console.warn("Novi could not initialize",err);return;}
 $("robo-launcher").onclick=()=>state.open?close():open();
 $("robo-close").onclick=close;
 $("robo-open-hero")?.addEventListener("click",()=>open());
 $("robo-stage-talk")?.addEventListener("click",()=>open());
 $("robo-chat-form").onsubmit=event=>{
  event.preventDefault();
  const text=$("robo-chat-input").value.trim();
  if(!text||state.busy||state.listening)return;
  $("robo-chat-input").value="";send(text,false);
 };
 $("robo-chat-input").addEventListener("keydown",event=>{
  if(event.key==="Enter"&&!event.shiftKey&&!event.isComposing){
   event.preventDefault();$("robo-chat-form").requestSubmit();
  }
 });
 $("robo-mic").onclick=()=>state.listening?(state.recorder?.state==="recording"&&state.recorder.stop()):startVoice();
 document.addEventListener("keydown",event=>{if(event.key==="Escape"&&state.open)close();});
 document.addEventListener("notewave:notes-updated",event=>{state.notes=event.detail?.notes||null;});
 document.addEventListener("notewave:session-reset",()=>{state.notes=null;});
 if($("editor")?.value&&!$("results")?.classList.contains("hidden"))state.notes={transcript:$("editor").value};
 message("assistant","Hi, I'm Novi! ✨ I can explain your recording, answer general questions with a small local AI model, and listen to voice questions. Try saying ‘Open AI Studio’!");
 robotMood("idle");cinematic();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
