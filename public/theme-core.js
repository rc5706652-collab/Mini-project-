// Pure theme contract: accessible palette, persisted preference, and OS fallback.
export const THEME_KEY="notewave-theme-v1";
export const PREFERENCES=Object.freeze(["system","dark","light"]);
export const THEME_COLORS=Object.freeze({dark:"#0b1021",light:"#f3f6fc"});
export function normalizePreference(value){
  return PREFERENCES.includes(value)?value:"system";
}
export function resolveTheme(value,systemIsDark=false){
  const preference=normalizePreference(value);
  return preference==="system"?(systemIsDark?"dark":"light"):preference;
}
export function metaThemeColor(theme){
  return THEME_COLORS[theme==="light"?"light":"dark"];
}
function channel(x){const n=x/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}
export function contrastRatio(foreground,background){
  function luminance(hex){
    const h=String(hex).replace(/^#/,"");
    if(!/^[0-9a-f]{6}$/i.test(h))throw Error("Use 6-digit hex colors");
    const c=[0,2,4].map(i=>channel(parseInt(h.slice(i,i+2),16)));
    return c[0]*.2126+c[1]*.7152+c[2]*.0722;
  }
  const a=luminance(foreground),b=luminance(background);
  return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}
export const THEME_PALETTE=Object.freeze({
  dark:{text:"#f3f5ff",subtext:"#aabbd9",surface:"#151e3b",canvas:"#0b1021",border:"#556487",accent:"#c4b7ff"},
  light:{text:"#17233f",subtext:"#485c79",surface:"#ffffff",canvas:"#f3f6fc",border:"#bac8df",accent:"#5142ad"}
});
