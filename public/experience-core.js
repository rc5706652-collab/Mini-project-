// Pure responsive and motion policy: shared by rendering, interactions, and tests.
// Never require a GPU, WebGL, localStorage, or browser globals for these functions.
export function experienceBudget({width=1024,deviceMemory=4,saveData=false,reducedMotion=false,pointerCoarse=false}={}){
 const w=Math.max(0,Number(width)||0);
 const compact=w<720,tablet=w>=720&&w<1120,lowMemory=Number.isFinite(deviceMemory)&&deviceMemory<=2;
 const economical=Boolean(reducedMotion||saveData||lowMemory);
 return {
  breakpoint:compact?"compact":tablet?"tablet":"desktop",
  economical,
  enableTilt:!economical&&!pointerCoarse&&w>=1024,
  useMotion:!reducedMotion,
  quality:economical?"minimal":compact?"balanced":"enhanced",
  maxDpr:economical?1:compact?1.15:tablet?1.35:1.5,
  idleFps:economical?12:compact?24:tablet?30:40,
  activeFps:economical?20:compact?30:tablet?45:60
 };
}
export function effectiveReducedMotion(systemReduced,preference="system"){
 if(preference==="reduce")return true;
 if(preference==="full")return false;
 return Boolean(systemReduced);
}
export function tiltFromPointer(x,y,width,height,maxAngle=3){
 const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1);
 const nx=Math.min(1,Math.max(-1,(Number(x)/w-.5)*2));
 const ny=Math.min(1,Math.max(-1,(Number(y)/h-.5)*2));
 const strength=Math.max(0,Math.min(6,Number(maxAngle)||0));
 return {x:Number((-ny*strength).toFixed(2)),y:Number((nx*strength).toFixed(2))};
}
export const paletteCommands=Object.freeze([
 {id:"home",label:"Home",description:"Return to the NoteWave landing page",shortcut:"H"},
 {id:"chat",label:"Loisel chat",description:"Ask your AI companion about a lecture or PDF",shortcut:"C"},
 {id:"studio",label:"AI Studio",description:"Go to your recording workspace",shortcut:"S"},
 {id:"new",label:"New session",description:"Start a fresh recording or transcript",shortcut:"N"},
 {id:"library",label:"Library · Knowledge Memory",description:"Search saved notes and recordings",shortcut:"L"},
 {id:"quiz-studio",label:"Quiz Studio",description:"Choose lectures and review weak concepts with video lessons",shortcut:"Q"},
 {id:"galaxy",label:"Knowledge Galaxy",description:"Explore your generated concept map",shortcut:"G",requiresNotes:true},
 {id:"quiz",label:"Quiz Arena",description:"Practice with source-grounded questions",shortcut:"Q",requiresNotes:true},
 {id:"tutor",label:"Personal Tutor",description:"Ask about the current recording",shortcut:"T",requiresNotes:true},
 {id:"export",label:"Export notes",description:"Save the current summary as Markdown",shortcut:"E",requiresNotes:true}
]);
export function filterCommands(query,hasNotes=false){
 const q=String(query||"").trim().toLowerCase();
 return paletteCommands.filter(x=>(!x.requiresNotes||hasNotes)&&(!q||(x.label+" "+x.description).toLowerCase().includes(q)));
}
