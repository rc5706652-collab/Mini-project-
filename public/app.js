import { createNotes, toMarkdown } from "./notes.js";
import { createLearningStudio } from "./learning-ui.js";
import { formatTime } from "./study.js";
import { createAdvancedStudio } from "./advanced-ui.js";

const $=id=>document.getElementById(id);
const put=(id,value)=>{$(id).textContent=String(value??"");};
const show=(id,visible)=>$(id).classList.toggle("hidden",!visible);
const state={
  inputMode:"upload",file:null,source:"",notes:null,segments:[],audioURL:null,
  worker:null,rejectTranscription:null,busy:false,recorder:null,stream:null,
  chunks:[],recordTimer:null,elapsed:0,micContext:null,micSource:null,analyser:null,levelFrame:0,orb:null,operationId:0
};
const lab=createLearningStudio();

/* Particle Alchemy is presentation-only; failure to load WebGL never blocks transcription. */
const alchemy=(()=>{
  const stage=$("alchemy-stage");
  let instance=null,load=null,generation=0,active=false;
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function reset(){
    generation++;active=false;
    instance?.destroy();instance=null;load=null;
    show("alchemy-stage",false);
    stage.classList.remove("alchemy-rendering","alchemy-fallback");
    stage.dataset.phase="processing";
    state.orb?.setPaused?.(false);
  }
  function start(){
    reset();
    const current=++generation;
    active=true;
    stage.dataset.phase="processing";
    show("alchemy-stage",true);
    put("alchemy-phase-label","FROM SOUND TO KNOWLEDGE");
    state.orb?.setPaused?.(true);
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion==="reduced" || navigator.connection?.saveData){
      stage.classList.add("alchemy-fallback");return;
    }
    load=import("./alchemy.js").then(module=>{
      if(current!==generation||!active)return;
      instance=module.createParticleAlchemy(stage);
      instance.start();
    }).catch(()=>{
      if(current===generation&&active)stage.classList.add("alchemy-fallback");
    });
  }
  function setProgress(value){instance?.setProgress?.(value);}
  async function complete(){
    if(!active)return;
    const current=generation;
    stage.dataset.phase="ready";
    put("alchemy-phase-label","KNOWLEDGE ASSEMBLED");
    if(load)await Promise.race([load,delay(850)]);
    if(current!==generation)return;
    if(instance){
      try{await Promise.race([instance.complete(),delay(1900)]);}
      catch{stage.classList.add("alchemy-fallback");}
    }else{
      stage.classList.add("alchemy-fallback");
      await delay(380);
    }
    if(current!==generation)return;
    await delay(190);
    if(current===generation)reset();
  }
  return {start,complete,reset,setProgress};
})();

const STORE="notewave-history-v1";
let saved=[];
try{const data=JSON.parse(localStorage.getItem(STORE)||"[]");if(Array.isArray(data))saved=data.filter(item=>item?.notes?.transcript).slice(0,12);}catch{}
const advancedPromise=createAdvancedStudio({
 openSaved:item=>renderNotes(item.notes,item.source,item.segments||[]),
 onDelete:id=>{saved=saved.filter(entry=>entry.id!==id);persist();renderSaved();}
}).then(suite=>{suite.init();return suite;}).catch(error=>{console.warn("Advanced studio unavailable",error);return null;});
function persist(){
  try{localStorage.setItem(STORE,JSON.stringify(saved));return true;}
  catch{error("Browser storage is full or unavailable. Download your notes instead.");return false;}
}
function error(message){
  put("error",message);show("error",true);
  $("create-panel").scrollIntoView({behavior:"smooth",block:"nearest"});
}
function clearError(){show("error",false);}
function status(title,detail,percent){
  show("working",true);put("work-title",title);put("work-detail",detail);
  $("progress").style.width=Math.min(100,Math.max(0,Number(percent)||0))+"%";
  alchemy.setProgress((Number(percent)||0)/100);
}
function orbMode(mode){
  $("orb-stage").dataset.mode=mode;
  state.orb?.setMode(mode);
  put("orb-label",({idle:"Your ideas, amplified",ready:"Ready to understand",listening:"Listening to your voice",processing:"Turning sound into insight",complete:"Intelligence unlocked"})[mode]||"Your ideas, amplified");
}
import("./scene.js").then(m=>{
  state.orb=m.createSonicCore($("orb-stage"));
  state.orb.setMode($("orb-stage").dataset.mode||"idle");
  if(!$("alchemy-stage").classList.contains("hidden"))state.orb.setPaused?.(true);
}).catch(()=>$("orb-stage").classList.add("orb-fallback"));
function switchMode(mode){
  if(state.busy||state.recorder?.state==="recording")return;
  state.inputMode=mode;
  for(const t of ["upload","record","text"]){
    show(t+"-area",t===mode);
    $(t+"-tab").classList.toggle("active",t===mode);
    $(t+"-tab").setAttribute("aria-selected",String(t===mode));
  }
  if($("language-controls"))show("language-controls",mode!=="text");
  clearError();
}
["upload","record","text"].forEach(mode=>$(mode+"-tab").addEventListener("click",()=>switchMode(mode)));
function setFile(file){
  if(!file)return;
  if(file.size>150*1048576){error("Audio exceeds 150 MB. Try splitting it into shorter recordings.");return;}
  state.file=file;state.source=file.name;
  put("filename",file.name);put("filesize",(file.size/1048576).toFixed(2)+" MB · Ready to transcribe");
  show("file-info",true);clearError();orbMode("ready");
}
$("drop").addEventListener("click",()=>$("file").click());
$("drop").addEventListener("keydown",event=>{
  if(event.key==="Enter"||event.key===" "){event.preventDefault();$("file").click();}
});
$("file").addEventListener("change",event=>setFile(event.target.files[0]));
$("drop").addEventListener("dragover",event=>{event.preventDefault();$("drop").classList.add("drag");});
$("drop").addEventListener("dragleave",()=>$("drop").classList.remove("drag"));
$("drop").addEventListener("drop",event=>{
  event.preventDefault();$("drop").classList.remove("drag");setFile(event.dataTransfer.files[0]);
});
$("remove").addEventListener("click",()=>{
  state.file=null;$("file").value="";show("file-info",false);orbMode("idle");
});
function stopMeter(){
  cancelAnimationFrame(state.levelFrame);state.levelFrame=0;
  state.micSource?.disconnect();state.micSource=null;
  if(state.micContext)state.micContext.close().catch(()=>{});
  state.micContext=null;state.analyser=null;state.orb?.setEnergy(0);
}
function startMeter(stream){
  try{
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext)return;
    state.micContext=new AudioContext();
    state.micSource=state.micContext.createMediaStreamSource(stream);
    state.analyser=state.micContext.createAnalyser();state.analyser.fftSize=256;
    state.micSource.connect(state.analyser);
    const bins=new Uint8Array(state.analyser.frequencyBinCount);
    const loop=()=>{
      if(state.recorder?.state!=="recording")return;
      state.analyser.getByteFrequencyData(bins);
      const energy=bins.reduce((sum,value)=>sum+value,0)/(bins.length*255);
      state.orb?.setEnergy(Math.min(1,energy*4));
      state.levelFrame=requestAnimationFrame(loop);
    };
    loop();
  }catch{stopMeter();}
}
$("record").addEventListener("click",async()=>{
  if(state.recorder?.state==="recording"){state.recorder.stop();return;}
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){
    error("Microphone recording is not supported here. Use Chrome or Edge over HTTPS.");return;
  }
  try{
    clearError();
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    const type=["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(item=>MediaRecorder.isTypeSupported(item));
    state.stream=stream;state.chunks=[];
    const recorder=new MediaRecorder(stream,type?{mimeType:type}:{});
    state.recorder=recorder;
    recorder.ondataavailable=event=>{if(event.data.size)state.chunks.push(event.data);};
    recorder.onerror=()=>error("An error interrupted the microphone recording.");
    recorder.onstop=()=>{
      clearInterval(state.recordTimer);stopMeter();
      stream.getTracks().forEach(track=>track.stop());state.stream=null;
      $("mic").classList.remove("on");put("record","● Start recording");
      if(state.chunks.length){
        const ext=recorder.mimeType.includes("mp4")?"m4a":"webm";
        setFile(new File(state.chunks,"Recording-"+Date.now()+"."+ext,{type:recorder.mimeType}));
      }else{orbMode("idle");error("No audio was recorded. Please try again.");}
    };
    recorder.start(1000);
    state.elapsed=0;put("timer","00:00");put("record","■ Stop recording");
    $("mic").classList.add("on");orbMode("listening");
    state.recordTimer=setInterval(()=>{
      state.elapsed++;put("timer",formatTime(state.elapsed));
      if(state.elapsed>=1800&&recorder.state==="recording")recorder.stop();
    },1000);
    startMeter(stream);
  }catch(err){
    state.stream?.getTracks().forEach(track=>track.stop());stopMeter();orbMode("idle");
    error(err.name==="NotAllowedError"?"Microphone permission was denied. Allow it in your browser settings.":"Microphone unavailable: "+err.message);
  }
});
function toggleBusy(value){
  state.busy=value;
  ["generate","upload-tab","record-tab","text-tab","record","remove"].forEach(id=>$(id).disabled=value);
}
async function decodeAudio(file){
  status("Preparing audio","Decoding and converting to 16 kHz mono locally…",5);
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!Context)throw Error("Audio decoding isn't supported by this browser.");
  const context=new Context();
  try{
    const decoded=await context.decodeAudioData(await file.arrayBuffer());
    if(!decoded.length)throw Error("The audio file has no playable samples.");
    if(decoded.duration>1800)throw Error("Please split recordings longer than 30 minutes into shorter files.");
    if(window.OfflineAudioContext){
      const offline=new OfflineAudioContext(1,Math.max(1,Math.ceil(decoded.duration*16000)),16000);
      const source=offline.createBufferSource();source.buffer=decoded;
      source.connect(offline.destination);source.start();
      const rendered=await offline.startRendering();
      return new Float32Array(rendered.getChannelData(0));
    }
    const mono=new Float32Array(decoded.length);
    for(let ch=0;ch<decoded.numberOfChannels;ch++){
      const input=decoded.getChannelData(ch);
      for(let i=0;i<input.length;i++)mono[i]+=input[i]/decoded.numberOfChannels;
    }
    const factor=decoded.sampleRate/16000,pcm=new Float32Array(Math.ceil(mono.length/factor));
    for(let i=0;i<pcm.length;i++)pcm[i]=mono[Math.min(mono.length-1,Math.floor(i*factor))];
    return pcm;
  }finally{await context.close();}
}
function recognize(samples){
  return new Promise((resolve,reject)=>{
    state.worker??=new Worker("./worker.js",{type:"module"});
    const worker=state.worker;state.rejectTranscription=reject;
    worker.onmessage=({data})=>{
      const m=data||{};
      if(m.type==="stage")status("Whisper speech recognition",m.message,12);
      if(m.type==="download")status("Downloading local AI model","One-time download; keep the tab open.",Math.round(m.progress*.4));
      if(m.type==="segment")status("Transcribing your recording","Processed "+m.index+" / "+m.total+" segments.",40+Math.round(m.progress*.6));
      if(m.type==="complete"){state.rejectTranscription=null;resolve({transcript:m.text,segments:m.segments||[]});}
      if(m.type==="error"){state.rejectTranscription=null;reject(Error(m.message));}
    };
    worker.onerror=()=>{
      state.rejectTranscription=null;worker.terminate();state.worker=null;
      reject(Error("Whisper model failed to load. Check internet access and browser memory."));
    };
    worker.postMessage({type:"transcribe",samples,language:$("audio-language")?.value||"en",output:$("audio-output")?.value||"original"},[samples.buffer]);
  });
}
$("cancel").addEventListener("click",()=>{
  if(!state.busy)return;
  state.operationId++;
  state.worker?.terminate();state.worker=null;
  state.rejectTranscription?.(Error("Processing cancelled."));
  state.rejectTranscription=null;
  alchemy.reset();
});
function clearAudio(){
  if(state.audioURL)URL.revokeObjectURL(state.audioURL);
  state.audioURL=null;
  $("preview-audio").removeAttribute("src");$("preview-audio").load();
  show("preview-audio",false);
}
function renderBullets(id,items,placeholder){
  $(id).replaceChildren();
  for(const value of items.length?items:[placeholder]){
    const li=document.createElement("li");li.textContent=value;$(id).append(li);
  }
}
function renderNotes(note,source,segments=[],audioFile=null,fromAlchemy=false){
  if(!note){error("We couldn't find enough words to create notes.");return;}
  state.notes=note;state.source=source;state.segments=segments;
  clearAudio();
  if(audioFile){
    state.file=audioFile;
    state.audioURL=URL.createObjectURL(audioFile);
    $("preview-audio").src=state.audioURL;show("preview-audio",true);
  }
  put("result-title",note.title);put("metadata",note.wordCount+" words · "+source);
  put("summary",note.summary);
  renderBullets("points",note.points,"No key points detected.");
  renderBullets("actions",note.actions,"No explicit action items detected.");
  renderBullets("details",note.details,"No numerical or dated details found.");
  $("keywords").replaceChildren();
  for(const keyword of note.keywords){const span=document.createElement("span");span.textContent=keyword;$("keywords").append(span);}
  $("editor").value=note.transcript;
  $("results").classList.toggle("alchemy-reveal",fromAlchemy);
  show("main-view",true);show("saved-panel",false);show("results",true);
  put("breadcrumb","AI studio");
  $("nav-new").classList.add("selected");$("nav-saved").classList.remove("selected");
  put("save","♡ Save");
  lab.update(note,segments,state.audioURL);
  advancedPromise.then(suite=>suite?.update(note));
  orbMode("complete");$("results").scrollIntoView({behavior:"smooth",block:"start"});
}
$("generate").addEventListener("click",async()=>{
  if(state.busy)return;
  clearError();
  if(state.inputMode==="text"){
    const value=$("pasted").value.trim();
    if(!value){error("Paste a transcript to begin.");return;}
    toggleBusy(true);
    const operation=++state.operationId;
    status("Transforming words into knowledge","Building a grounded set of notes and study tools…",55);
    alchemy.start();
    try{
      const notes=createNotes(value);
      await alchemy.complete();
      if(operation!==state.operationId)throw Error("Processing cancelled.");
      renderNotes(notes,"Pasted transcript",[],null,true);
    }catch(err){error(err.message||"Unable to generate notes.");}
    finally{alchemy.reset();toggleBusy(false);show("working",false);}
    return;
  }
  if(state.recorder?.state==="recording"){error("Stop the recording first.");return;}
  if(!state.file){error("Upload or record an audio file first.");return;}
  const audioFile=state.file;
  toggleBusy(true);orbMode("processing");
  const operation=++state.operationId;
  status("Preparing Particle Alchemy","Turning your recording into organized knowledge…",2);
  alchemy.start();
  try{
    const pcm=await decodeAudio(audioFile);
    if(operation!==state.operationId)throw Error("Processing cancelled.");
    const result=await recognize(pcm);
    if(operation!==state.operationId)throw Error("Processing cancelled.");
    if(!result.transcript?.trim())throw Error("No speech detected. Use clear English audio or paste the transcript.");
    const notes=createNotes(result.transcript);
    await alchemy.complete();
    if(operation!==state.operationId)throw Error("Processing cancelled.");
    renderNotes(notes,audioFile.name,result.segments,audioFile,true);
  }catch(err){
    orbMode("ready");
    error(err.name==="EncodingError"?"Unsupported audio codec. Convert to WAV or MP3 and retry.":err.message||"Audio processing failed.");
  }finally{
    alchemy.reset();toggleBusy(false);show("working",false);
  }
});
$("regenerate").addEventListener("click",()=>{
  const corrected=$("editor").value.trim();
  if(!corrected){error("The transcript cannot be empty.");return;}
  const same=corrected===state.notes?.transcript;
  renderNotes(createNotes(corrected),state.source,same?state.segments:[],same&&state.audioURL?state.file:null);
});
const markdown=()=>toMarkdown(state.notes,state.source);
$("copy").addEventListener("click",async()=>{
  if(!state.notes)return;
  try{await navigator.clipboard.writeText(markdown());put("copy","✓ Copied");setTimeout(()=>put("copy","⧉ Copy"),1800);}
  catch{error("Clipboard access blocked. Export your notes instead.");}
});
$("export").addEventListener("click",()=>{
  if(!state.notes)return;
  const url=URL.createObjectURL(new Blob([markdown()],{type:"text/markdown;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="NoteWave-notes.md";document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
});
$("print").addEventListener("click",()=>window.print());
$("save").addEventListener("click",()=>{
  if(!state.notes)return;
  const session={id:String(Date.now()),source:state.source,notes:state.notes,segments:state.segments,language:$("audio-language")?.value||"en",created:new Date().toISOString()};
  saved.unshift(session);
  advancedPromise.then(suite=>suite?.save(session));
  saved=saved.slice(0,12);
  if(persist()){put("save","✓ Saved");renderSaved();}
});
function renderSaved(){
  put("count",saved.length);$("recent").replaceChildren();$("saved-list").replaceChildren();
  if(!saved.length){
    const p=document.createElement("p");p.className="muted tiny";p.textContent="Your saved notes appear here.";$("recent").append(p);
    const empty=document.createElement("p");empty.className="muted";empty.textContent="Nothing saved yet. Generate notes, then tap Save.";$("saved-list").append(empty);
  }
  for(const item of saved){
    const btn=document.createElement("button");btn.className="recent-item";btn.textContent="▤ "+item.notes.title;
    btn.onclick=()=>renderNotes(item.notes,item.source,item.segments||[]);
    $("recent").append(btn);
    const card=document.createElement("article");card.className="saved-item";
    const h=document.createElement("h3");h.textContent=item.notes.title;
    const p=document.createElement("p");p.textContent=new Date(item.created).toLocaleDateString()+" · "+(item.notes.wordCount||0)+" words";
    const open=document.createElement("button");open.textContent="Open";open.onclick=()=>renderNotes(item.notes,item.source,item.segments||[]);
    const remove=document.createElement("button");remove.textContent="Delete";remove.onclick=()=>{saved=saved.filter(row=>row.id!==item.id);persist();renderSaved();advancedPromise.then(suite=>suite?.remove(item.id));};
    card.append(h,p,open,remove);$("saved-list").append(card);
  }
}
function openStudio(){
  show("main-view",true);show("saved-panel",false);put("breadcrumb","AI studio");
  $("nav-new").classList.add("selected");$("nav-saved").classList.remove("selected");
}
function newSession(){
  if(state.busy||state.recorder?.state==="recording")return;
  alchemy.reset();
  openStudio();show("results",false);clearError();
  state.file=null;state.segments=[];state.notes=null;
  $("file").value="";$("pasted").value="";show("file-info",false);
  clearAudio();orbMode("idle");$("create-panel").scrollIntoView({behavior:"smooth"});
}
function resumeStudio(){
  if(state.busy||state.recorder?.state==="recording")return;
  openStudio();
  show("results",Boolean(state.notes));
  const destination=state.notes?$("results"):$("create-panel");
  destination.scrollIntoView({behavior:"smooth",block:"start"});
}
$("nav-new").addEventListener("click",resumeStudio);
$("top-create").addEventListener("click",newSession);
$("nav-saved").addEventListener("click",()=>{
  if(state.busy||state.recorder?.state==="recording")return;
  renderSaved();show("main-view",false);show("saved-panel",true);
  put("breadcrumb","My library");$("nav-new").classList.remove("selected");$("nav-saved").classList.add("selected");
  window.scrollTo({top:0,behavior:"smooth"});
});
$("clear").addEventListener("click",()=>{
  if(confirm("Delete every saved note from this browser, including Knowledge Memory?")){saved=[];persist();renderSaved();advancedPromise.then(suite=>suite?.clear());}
});
renderSaved();
