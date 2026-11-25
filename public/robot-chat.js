// Loisel AI Chat: on-device AI answers, voice questions via local Whisper, optional speech playback.
// Model download comes from Hugging Face; chat/recordings are not sent to any NoteWave server.
import {quickAnswer,prepareQuestion,sanitizeModelAnswer} from "./companion-core.js";
const $=id=>document.getElementById(id);
const messages=$("pip-messages"),form=$("pip-form"),question=$("pip-question"),sendButton=$("pip-send"),micButton=$("pip-mic"),status=$("pip-status");
let notes=null,pdfSource=null,history=[],busy=false,requestId=0,chatWorker=null;
let recorder=null,stream=null,voiceTimer=0,speechWorker=null,voiceBusy=false;
let speaking=false,cinematicTimer=0;
function robot(mode,label){
 document.dispatchEvent(new CustomEvent("notewave:robot-state",{detail:{mode}}));
 $("orb-stage").dataset.mode=mode;
 if(label)$("orb-label").textContent=label;
}
function setStatus(value){status.textContent=value;}
function addMessage(role,body,evidence=[],warning=""){
 const outer=document.createElement("div");outer.className="pip-message "+(role==="user"?"pip-user":"pip-assistant");
 const label=document.createElement("span");label.className="pip-speaker";label.textContent=role==="user"?"YOU":"LOISEL ✦";
 const p=document.createElement("p");p.textContent=body;
 outer.append(label,p);
 if(warning){
  const caution=document.createElement("small");caution.className="pip-source-label";caution.textContent=warning;
  outer.append(caution);
 }
 for(const piece of evidence.slice(0,3)){
  const quote=document.createElement("div");quote.className="pip-citation";
  const heading=document.createElement("span");heading.className="pip-source-label";heading.textContent="ORIGINAL RECORDING";
  const snippet=document.createElement("span");snippet.textContent=piece;
  quote.append(heading,snippet);outer.append(quote);
 }
 messages.append(outer);messages.scrollTop=messages.scrollHeight;
 return outer;
}
function updateBusy(value){
 busy=value;
 question.disabled=value;
 sendButton.disabled=false;
 sendButton.textContent=value?"Stop":"Send ↗";
 micButton.disabled=value||voiceBusy;
}
function say(value){
 if(!$("pip-speak").checked||!("speechSynthesis" in window)||!value)return;
 try{
  window.speechSynthesis.cancel();
  const speech=new SpeechSynthesisUtterance(String(value).slice(0,500));
  speech.rate=.98;speech.pitch=1.12;speech.volume=.93;
  speech.onstart=()=>{speaking=true;robot("speaking","Loisel is talking");};
  const finish=()=>{speaking=false;robot("complete","Loisel is ready");};
  speech.onend=finish;speech.onerror=finish;
  window.speechSynthesis.speak(speech);
 }catch{setStatus("This browser couldn't read the reply aloud. Text chat remains available.");}
}
function cancelGeneration(){
 requestId++;
 if(chatWorker){chatWorker.terminate();chatWorker=null;}
 updateBusy(false);
 setStatus("Stopped. Ask Loisel another question.");
 robot("idle","Loisel is ready");
}
function runLocalModel(input,timeoutMs=0){
 return new Promise((resolve,reject)=>{
  const expected=++requestId;
  try{chatWorker??=new Worker("./companion-worker.js",{type:"module"});}
  catch(e){reject(e);return;}
  const worker=chatWorker;
  let timer;const done=(error,value)=>{clearTimeout(timer);if(error)reject(error);else resolve(value);};
  if(timeoutMs)timer=setTimeout(()=>{worker.terminate();if(chatWorker===worker)chatWorker=null;done(Error("Local AI took too long."));},timeoutMs);
  worker.onmessage=({data})=>{
   if(data.requestId!==expected)return;
   if(data.type==="stage")setStatus(data.message);
   if(data.type==="progress")setStatus("Downloading on-device AI model: "+Math.max(0,Math.min(100,data.progress))+"% · first use only");
   if(data.type==="answer")done(null,data.answer);
   if(data.type==="error")done(new Error(data.message));
  };
  worker.onerror=()=>{worker.terminate();if(chatWorker===worker)chatWorker=null;done(new Error("Local AI model failed to initialize."));};
  worker.postMessage({type:"ask",requestId:expected,mode:$("pip-model").value,prompt:input.prompt,messages:input.messages});
 });
}
async function askQuestion(raw){
 const text=String(raw||"").trim();
 if(!text){setStatus("Type a question, or tap the microphone to speak one.");return;}
 if(busy){cancelGeneration();return;}
 if(voiceBusy)return;
 if("speechSynthesis" in window)window.speechSynthesis.cancel();
 addMessage("user",text);question.value="";
 const quick=quickAnswer(text);
 if(quick){
  addMessage("assistant",quick);history.push({role:"user",content:text},{role:"assistant",content:quick});
  history=history.slice(-12);setStatus("Loisel replied using built-in guidance.");robot("complete","Loisel answered your question");say(quick);return;
 }
 const mode=$("pip-mode").value;
 if(mode==="notes"&&notes){
  if(/^(summarize|summary|main points|key points|takeaways|summarize my recording|summarize the recording)$/i.test(text)){
   const answer=[notes.summary,...(notes.points||[]).slice(0,3)].filter(Boolean).join("\n• ");
   addMessage("assistant",answer||"No summary is available yet.");
   robot("complete","Loisel has your summary");setStatus("Extractive summary, taken from your recording.");
   say(answer);return;
  }
 }
 const prepared=prepareQuestion(text,{mode,notes,pdf:pdfSource,history});
 const pdfFallback=()=>prepared.citations.map(c=>c.text).join("\n\n");
 const appendSources=(outer)=>{
  for(const evidence of prepared.evidence){
   const quote=document.createElement("div");quote.className="pip-citation";
   const head=document.createElement("span");head.className="pip-source-label";
   const citation=prepared.citations?.find(c=>c.text===evidence);
   head.textContent=mode==="pdf"?"PDF · "+pdfSource.title+" · Page "+citation?.page:"SOURCE FROM YOUR RECORDING";
   const line=document.createElement("span");line.textContent=evidence;quote.append(head,line);outer.append(quote);
  }
 };
 if(prepared.error){
  addMessage("assistant",prepared.error);robot("idle","Loisel is ready");setStatus("No model needed for that answer.");return;
 }
 // All model prompts remain on the device. The optional Enhanced model requires WebGPU.
 const model=$("pip-model").value;
 if(mode==="pdf"&&(model==="fast"||(model==="enhanced"&&!navigator.gpu))){
  const answer=pdfFallback();const reply=addMessage("assistant",answer,[],"Relevant passages from your PDF · extractive answer");appendSources(reply);
  history.push({role:"user",content:text},{role:"assistant",content:answer});history=history.slice(-12);
  setStatus("Answered from your PDF locally. Enhanced AI can provide a synthesized explanation on supported devices.");robot("complete","Loisel found relevant PDF passages");say(answer);return;
 }
 if(model==="enhanced"&&!navigator.gpu){
  const info="Enhanced AI needs WebGPU. Choose Fast local for this browser, then ask me again.";
  addMessage("assistant",info);setStatus(info);robot("idle","Loisel is ready");return;
 }
 const placeholder=addMessage("assistant","Loisel is thinking…");
 updateBusy(true);robot("thinking","Loisel is thinking");
 setStatus("Preparing "+(model==="enhanced"?"enhanced WebGPU":"lightweight CPU")+" language model locally…");
 const started=requestId;
 try{
  const response=sanitizeModelAnswer(await runLocalModel(prepared,mode==="pdf"?20000:0));
  if(requestId!==started+1)return;
  const answer=response||"I'm not sure how to answer that yet. Try asking a shorter question.";
  placeholder.querySelector("p").textContent=answer;
  appendSources(placeholder);
  if(mode==="notes"||mode==="pdf"){
   const caution=document.createElement("small");caution.className="pip-source-label";
   caution.textContent="AI explanation — verify against the cited source passages.";
   placeholder.append(caution);
  }
  history.push({role:"user",content:text},{role:"assistant",content:answer});history=history.slice(-12);
  robot("complete","Loisel answered your question");
  setStatus("Generated locally with "+(model==="enhanced"?"WebGPU":"CPU")+". Check important information.");
  say(answer);
 }catch(error){
  if(requestId===started+1){
   if(mode==="pdf"){
    const answer=pdfFallback();placeholder.querySelector("p").textContent=answer;appendSources(placeholder);
    history.push({role:"user",content:text},{role:"assistant",content:answer});history=history.slice(-12);
    setStatus("AI unavailable; showing matching PDF passages instead.");robot("complete","Loisel found relevant PDF passages");return;
   }
   placeholder.querySelector("p").textContent="I couldn't run the local language model on this device. "+String(error?.message||"Please check storage, internet, or browser memory.")+" Try Fast local or a shorter question.";
   setStatus("AI unavailable. Other NoteWave tools still work.");robot("idle","Loisel is ready");
  }
 }finally{
  if(requestId===started+1)updateBusy(false);
 }
}
form.addEventListener("submit",event=>{
 event.preventDefault();
 if(busy){cancelGeneration();return;}
 askQuestion(question.value);
});
document.querySelectorAll("[data-pip-prompt]").forEach(button=>button.addEventListener("click",()=>{
 const query=button.dataset.pipPrompt;
 if(query==="Summarize my recording")$("pip-mode").value="notes";
 question.value=query;askQuestion(query);
}));
$("pip-clear").addEventListener("click",()=>{
 if(busy)cancelGeneration();
 if("speechSynthesis" in window)window.speechSynthesis.cancel();
 history=[];messages.replaceChildren();
 addMessage("assistant","Fresh start! I'm Loisel, ready for your next question. ✨");
 setStatus("Chat history cleared from this page.");robot("idle","Loisel is ready");
});
document.addEventListener("notewave:pdf-source",event=>{
 if(busy)cancelGeneration();pdfSource=event.detail?.source||null;
 const mode=$("pip-mode"),option=mode.querySelector('option[value="pdf"]');
 if(pdfSource){
  option.disabled=false;option.removeAttribute("disabled");history=[];messages.replaceChildren();mode.value="pdf";
  addMessage("assistant","I have your PDF: "+pdfSource.title+". Ask me about its contents.");setStatus("PDF ready for local questions.");
 }else{
  // Switch away from the selected option before disabling it. Clear PDF-derived
  // conversation regardless of which source mode was active.
  if(mode.value==="pdf")mode.value=notes?"notes":"general";
  option.disabled=true;option.setAttribute("disabled","");
  history=[];messages.replaceChildren();
  addMessage("assistant","PDF removed. Choose another lecture or ask a general question.");setStatus("PDF source cleared.");
 }
});
document.addEventListener("notewave:notes-ready",event=>{
 notes=event.detail?.notes||null;
 if(notes){$("pip-mode").value="notes";setStatus("Your recording is ready. Ask Loisel about it!");}
});
document.addEventListener("notewave:notes-reset",()=>{
 notes=null;$("pip-mode").value=pdfSource?"pdf":"general";setStatus("New session. Ask about any topic or generate a recording.");
});
document.addEventListener("notewave:quiz-help",event=>{
 const detail=event.detail||{};
 if(detail.pdf&&pdfSource){$("pip-mode").value="pdf";}
 else if(detail.notes?.transcript){notes=detail.notes;$("pip-mode").value="notes";}
 question.value=String(detail.question||"").slice(0,450);
 setStatus("Loisel is ready to help explain a concept from your quiz. Press Send.");
 question.focus({preventScroll:true});
});

function voiceOn(value){
 voiceBusy=value;micButton.setAttribute("aria-pressed",String(value));
 micButton.textContent=value?"■":"🎙";
 micButton.setAttribute("aria-label",value?"Stop voice question":"Start voice question recording");
 sendButton.disabled=value;question.disabled=value;micButton.disabled=busy;
}
function releaseMicrophone(){
 clearTimeout(voiceTimer);voiceTimer=0;
 stream?.getTracks().forEach(track=>track.stop());stream=null;
}
async function decodeSpeech(blob){
 const Context=window.AudioContext||window.webkitAudioContext;
 const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
 if(!Context||!Offline)throw new Error("Audio decoding is unavailable. Type your question instead.");
 const context=new Context();
 try{
  const decoded=await context.decodeAudioData(await blob.arrayBuffer());
  if(!decoded.length)throw Error("No microphone audio was captured.");
  const offline=new Offline(1,Math.ceil(decoded.duration*16000),16000);
  const source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start(0);
  const rendered=await offline.startRendering();
  return new Float32Array(rendered.getChannelData(0));
 }finally{await context.close().catch(()=>{});}
}
async function transcribeVoice(blob){
 const samples=await decodeSpeech(blob);
 return new Promise((resolve,reject)=>{
  let settled=false;
  const finish=(error,text)=>{
   if(settled)return;settled=true;
   speechWorker?.terminate();speechWorker=null;
   if(error)reject(error);else resolve(text);
  };
  try{speechWorker=new Worker("./worker.js",{type:"module"});}
  catch(error){finish(error);return;}
  speechWorker.onmessage=({data})=>{
   if(data.type==="download")setStatus("Downloading private Whisper speech model: "+Math.round(data.progress)+"%");
   if(data.type==="stage")setStatus(data.message);
   if(data.type==="complete")finish(null,String(data.text||"").trim());
   if(data.type==="error")finish(new Error(data.message));
  };
  speechWorker.onerror=()=>finish(new Error("Whisper speech transcription failed to load."));
  speechWorker.postMessage({type:"transcribe",samples,language:document.getElementById("audio-language")?.value||"auto",output:"original"},[samples.buffer]);
 });
}
async function startVoice(){
 if(busy||voiceBusy)return;
 if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){
  setStatus("This browser cannot record short voice questions. Type your question instead.");return;
 }
 try{
  const mic=await navigator.mediaDevices.getUserMedia({audio:true});
  stream=mic;
  const types=["audio/webm;codecs=opus","audio/webm","audio/mp4"];
  const type=types.find(t=>MediaRecorder.isTypeSupported(t));
  const record=new MediaRecorder(mic,type?{mimeType:type}:{});
  recorder=record;const chunks=[];
  record.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
  record.onerror=()=>setStatus("Microphone recording failed. Type your question instead.");
  record.onstop=async()=>{
   releaseMicrophone();voiceOn(false);
   if(!chunks.length){setStatus("No audio was captured. Try again or type.");robot("idle","Loisel is ready");return;}
   setStatus("Transcribing your short voice question locally…");robot("thinking","Loisel is understanding you");
   voiceOn(true);micButton.disabled=true;
   try{
    const recognized=await transcribeVoice(new Blob(chunks,{type:record.mimeType||"audio/webm"}));
    if(!recognized){setStatus("I couldn't hear clear speech. Try again or type.");return;}
    question.value=recognized;setStatus("Heard: "+recognized.slice(0,120));
    voiceOn(false);await askQuestion(recognized);
   }catch(error){setStatus("Local voice recognition failed: "+error.message+" You can still type.");}
   finally{voiceOn(false);micButton.disabled=false;if(!busy&&!speaking)robot("idle","Loisel is ready");}
  };
  record.start(500);
  voiceOn(true);robot("listening","Loisel is listening to your voice");
  setStatus("Listening… tap the stop button when done (maximum 12 seconds).");
  voiceTimer=setTimeout(()=>{if(record.state==="recording")record.stop();},12000);
 }catch(error){
  releaseMicrophone();voiceOn(false);robot("idle","Loisel is ready");
  setStatus(error.name==="NotAllowedError"?"Microphone permission denied. Allow it in your browser settings or type your question.":"Microphone unavailable: "+error.message);
 }
}
micButton.addEventListener("click",()=>{
 if(recorder?.state==="recording"){recorder.stop();return;}
 if(voiceBusy)return;
 startVoice();
});
document.addEventListener("visibilitychange",()=>{
 if(document.hidden&&recorder?.state==="recording")recorder.stop();
});
$("pip-speak").addEventListener("change",()=>{
 if(!$("pip-speak").checked&&"speechSynthesis" in window){window.speechSynthesis.cancel();speaking=false;robot("idle","Loisel is ready");}
});
function playCinematic(){
 const scene=$("studio-cinematic");
 if(!scene||matchMedia("(prefers-reduced-motion: reduce)").matches||document.documentElement.dataset.motion==="reduced")return;
 clearTimeout(cinematicTimer);
 scene.dataset.active="false";
 // Restart the CSS keyframes on each explicit Studio navigation.
 void scene.offsetWidth;
 scene.dataset.active="true";
 document.dispatchEvent(new CustomEvent("notewave:robot-state",{detail:{mode:"complete"}}));
 cinematicTimer=setTimeout(()=>{scene.dataset.active="false";},1160);
}
document.addEventListener("click",event=>{
 const trigger=event.target.closest?.("#nav-new,#nw-dock-studio,#top-create,a[href='#create-panel']");
 if(trigger)playCinematic();
},true);
