import { splitSentences } from "./notes.js";
import { makeFlashcards, lexicalEvidence, makeChapters, formatTime } from "./study.js";
const $=id=>document.getElementById(id);
const set=(id,value)=>{$(id).textContent=String(value??"");};
function evidenceList(items,label) {
  const container=$("ask-output");container.replaceChildren();
  if(!items.length){
    const p=document.createElement("p");p.className="muted";
    p.textContent="No supported passage was found. Try different terms from the recording; no answer has been invented.";
    container.append(p);return;
  }
  for(let i=0;i<items.length;i++){
    const card=document.createElement("article");card.className="evidence-item";
    const head=document.createElement("div");head.className="eyebrow";
    const marker=document.createElement("span");marker.textContent="EVIDENCE "+String(i+1).padStart(2,"0");
    const method=document.createElement("span");method.textContent=label;
    head.append(marker,method);
    const p=document.createElement("p");p.textContent=items[i].text;
    card.append(head,p);container.append(card);
  }
}
function documentsFor(transcript) {
  const sentences=splitSentences(transcript);
  const stride=Math.max(1,Math.ceil(sentences.length/160));
  const output=[];
  for(let i=0;i<sentences.length;i+=stride)output.push(sentences.slice(i,i+stride).join(" ").slice(0,1000));
  return output;
}
export function createLearningStudio() {
  let notes=null,segments=[],audioURL=null,cards=[],cardIndex=0,revealed=false,worker=null,request=0,busy=false;
  const switchTab=name=>{
    for(const tab of ["ask","cards","chapters"]){
      $(tab+"-panel").classList.toggle("hidden",name!==tab);
      $(tab+"-tab").classList.toggle("active",name===tab);
      $(tab+"-tab").setAttribute("aria-selected",String(name===tab));
    }
  };
  ["ask","cards","chapters"].forEach(tab=>$(tab+"-tab").addEventListener("click",()=>switchTab(tab)));
  function renderCard() {
    const card=cards[cardIndex];
    $("flashcard").disabled=!card;
    $("flashcard").classList.toggle("revealed",Boolean(card)&&revealed);
    $("prev-card").disabled=!card||cardIndex===0;
    $("next-card").disabled=!card||cardIndex>=cards.length-1;
    set("flashcard-kicker",revealed?"THE ANSWER":"FILL IN THE BLANK");
    set("flashcard-text",card?(revealed?card.answer:card.prompt):"Not enough key concepts for cards. Try a longer transcript.");
    set("flashcard-hint",revealed?"Tap to see the question":"Tap to reveal the answer");
    set("card-progress",card?(cardIndex+1)+" / "+cards.length:"0 / 0");
  }
  $("flashcard").addEventListener("click",()=>{revealed=!revealed;renderCard();});
  $("prev-card").addEventListener("click",()=>{if(cardIndex>0){cardIndex--;revealed=false;renderCard();}});
  $("next-card").addEventListener("click",()=>{if(cardIndex<cards.length-1){cardIndex++;revealed=false;renderCard();}});
  function renderChapters(){
    const target=$("chapter-list");target.replaceChildren();
    const chapters=makeChapters(segments);
    if(!chapters.length){
      const p=document.createElement("p");p.className="muted";
      p.textContent="Chapters appear after you process audio. Pasted text does not contain reliable timestamps.";
      target.append(p);return;
    }
    if(!audioURL){
      const p=document.createElement("p");p.className="muted tiny";
      p.textContent="Chapter markers are saved, but raw audio is not. Upload the original audio again for playback.";
      target.append(p);
    }
    for(const chapter of chapters){
      const node=document.createElement(audioURL?"button":"div");
      node.className="chapter";if(audioURL)node.type="button";
      const time=document.createElement("time");time.textContent=formatTime(chapter.start);
      const body=document.createElement("div");
      const title=document.createElement("strong");title.textContent=chapter.title;
      const excerpt=document.createElement("small");excerpt.textContent=chapter.excerpt;
      body.append(title,excerpt);node.append(time,body);
      if(audioURL)node.addEventListener("click",()=>{
        const audio=$("preview-audio");audio.currentTime=chapter.start;audio.play().catch(()=>{});
      });
      target.append(node);
    }
  }
  function semantic(question){
    return new Promise((resolve,reject)=>{
      try{worker??=new Worker("./semantic-worker.js",{type:"module"});}catch(error){reject(error);return;}
      const id=++request,docs=documentsFor(notes.transcript);
      worker.onmessage=({data})=>{
        if(data.type==="stage")set("ask-status",data.message);
        if(data.type==="download")set("ask-status","Downloading local semantic AI: "+data.progress+"%…");
        if(data.type==="index-progress")set("ask-status","Indexing your transcript: "+data.progress+"%…");
        if(data.type==="answer"&&data.requestId===id)resolve(data.matches.map(m=>({text:docs[m.index],score:m.score})));
        if(data.type==="error"&&data.requestId===id)reject(new Error(data.message));
      };
      worker.onerror=()=>{worker?.terminate();worker=null;reject(Error("Semantic model unavailable."));};
      worker.postMessage({type:"query",question,documents:docs,cacheKey:notes.transcript,requestId:id});
    });
  }
  async function ask(question){
    if(busy||!notes)return;
    if(!question.trim()){set("ask-status","Enter a question about your recording.");return;}
    busy=true;$("ask-button").disabled=true;set("ask-status","Searching for grounded evidence…");
    $("ask-output").replaceChildren();
    try{
      const matches=await semantic(question.trim());
      if(matches.length){
        evidenceList(matches,"SEMANTIC MATCH");
        set("ask-status","On-device semantic model found passages from your original transcript.");
      }else{
        evidenceList(lexicalEvidence(question,notes.transcript),"KEYWORD MATCH");
        set("ask-status","No strong semantic match; only exact keyword matches are shown.");
      }
    }catch{
      evidenceList(lexicalEvidence(question,notes.transcript),"KEYWORD MATCH");
      set("ask-status","Semantic model unavailable. Used transcript keyword matching; no cloud AI was called.");
    }finally{busy=false;$("ask-button").disabled=false;}
  }
  $("ask-form").addEventListener("submit",event=>{event.preventDefault();ask($("ask-input").value);});
  document.querySelectorAll("[data-question]").forEach(button=>button.addEventListener("click",()=>{
    $("ask-input").value=button.dataset.question;ask(button.dataset.question);
  }));
  return {
    update(nextNotes,nextSegments,nextAudioURL) {
      // Avoid stale evidence from the previous transcript.
      request++;
      notes=nextNotes;
      segments=nextSegments||[];
      audioURL=nextAudioURL||null;
      cards=makeFlashcards(notes);cardIndex=0;revealed=false;
      $("ask-output").replaceChildren();
      const placeholder=document.createElement("p");placeholder.className="muted";
      placeholder.textContent="Ask a question to retrieve supporting passages from your transcript.";
      $("ask-output").append(placeholder);set("ask-status","");
      renderCard();renderChapters();
    }
  };
}
