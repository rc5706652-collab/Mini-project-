// IndexedDB document library; audio is never persisted or synced.
const DB="notewave-knowledge-v1",STORE="sessions",LEGACY="notewave-history-v1";
let opening=null;
async function database(){
 if(!globalThis.indexedDB)throw Error("IndexedDB is unavailable");
 if(!opening)opening=new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:"id"});};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error("IndexedDB cannot open"));
  req.onblocked=()=>reject(Error("Close other NoteWave tabs to update your library"));
 }).catch(e=>{opening=null;throw e});
 return opening;
}
function result(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function write(op,entry){
 const db=await database();return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,"readwrite");
  try{tx.objectStore(STORE)[op](...(entry===undefined?[]:[entry]));}
  catch(e){reject(e);return;}
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error||Error("Storage operation failed"));
  tx.onabort=()=>reject(tx.error||Error("Storage was aborted"));
 });
}
export async function saveSession(item){
 if(!item?.id||!item?.notes?.transcript)throw Error("No transcript to save");
 const session={id:String(item.id),source:String(item.source||"Recording"),notes:item.notes,segments:item.segments||[],created:item.created||new Date().toISOString(),language:item.language||"en"};
 await write("put",session);return session;
}
export async function deleteSession(id){return write("delete",String(id));}
export async function clearSessions(){return write("clear");}
export async function listSessions(){
 const db=await database();
 const rows=await result(db.transaction(STORE,"readonly").objectStore(STORE).getAll());
 return rows.filter(x=>x?.notes?.transcript).sort((a,b)=>String(b.created).localeCompare(String(a.created)));
}
export async function migrateLegacy(){
 let old=[];
 try{const list=JSON.parse(localStorage.getItem(LEGACY)||"[]");if(Array.isArray(list))old=list;}catch{}
 const present=new Set((await listSessions()).map(x=>String(x.id)));
 for(const session of old)if(session?.id&&session?.notes?.transcript&&!present.has(String(session.id)))await saveSession(session);
 return listSessions();
}
export function searchSessions(query,items,limit=40){
 const terms=String(query||"").toLocaleLowerCase().match(/[\p{L}\p{N}]{2,}/gu)||[];
 if(!terms.length)return items.slice(0,limit);
 return items.map(item=>{
  const str=String(item?.source||"")+" "+String(item?.notes?.title||"")+" "+String(item?.notes?.transcript||"");
  const corpus=str.toLocaleLowerCase(),score=terms.reduce((a,term)=>a+(corpus.includes(term)?1:0),0);
  return {item,score};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.item);
}
