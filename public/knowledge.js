import {splitSentences,tokenize} from "./notes.js";
export function makeGalaxy(notes,limit=10){
 const lines=splitSentences(notes?.transcript||"");
 const freq=new Map();
 for(const line of lines)for(const word of new Set(tokenize(line)))freq.set(word,(freq.get(word)||0)+1);
 const candidates=[...new Set([...(notes?.keywords||[]),...[...freq].sort((a,b)=>b[1]-a[1]).map(x=>x[0])])].filter(x=>freq.has(x)).slice(0,limit);
 const nodes=candidates.map((term,i)=>({id:"k"+i,term,weight:freq.get(term),evidence:lines.find(line=>new Set(tokenize(line)).has(term))||""}));
 const edges=[];
 for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
   const evidence=lines.find(line=>{const words=new Set(tokenize(line));return words.has(nodes[i].term)&&words.has(nodes[j].term)});
   if(evidence)edges.push({from:nodes[i].id,to:nodes[j].id,evidence});
 }
 return {nodes,edges};
}
export function galaxyCoordinates(n){
 return Array.from({length:n},(_,i)=>{const a=i*2.399963,r=1.2+Math.sqrt(i)*.28;return {x:Math.cos(a)*r,y:Math.sin(a)*r*.76,z:Math.sin(i*1.43)*.58};});
}
