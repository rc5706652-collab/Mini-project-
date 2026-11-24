import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {THEME_PALETTE,THEME_COLORS,contrastRatio} from "../public/theme-core.js";

// Scope: disallow dimensions, typography, layout, animation and 3D changes.
const css=String(await readFile(new URL("../public/reference-palette.css",import.meta.url)));
const noComments=css.replace(/\/\*[\s\S]*?\*\//g,"");
const allowed=new Set([
 "color","color-scheme","background","background-color","background-image",
 "background-clip","-webkit-background-clip","border-color","outline-color",
 "box-shadow","text-shadow","caret-color","scrollbar-color","filter"
]);
test("reference site's confirmed colors are present",()=>{
 for(const token of ["#f5f4ef","#242c2b","#dce8d8","#e7e0f0","#f3ddd0","#dce7ef","#6e62bd"]){
  assert.ok(css.toLowerCase().includes(token),token+" missing");
 }
 assert.equal(THEME_COLORS.light,"#f5f4ef");
 assert.equal(THEME_COLORS.dark,"#171d1b");
});
test("theme stylesheet is color-only, with no layout or animation changes",()=>{
 const names=[...noComments.matchAll(/(?:\{|;)\s*([-\w]+)\s*:/g)].map(m=>m[1]);
 assert.ok(names.length>100,"Expected a full theme palette");
 const forbidden=names.filter(name=>!name.startsWith("--")&&!allowed.has(name));
 assert.deepEqual([...new Set(forbidden)],[],"Non-color CSS declarations found: "+forbidden.join(","));
});
test("primary and secondary text maintain contrast",()=>{
 for(const [mode,p] of Object.entries(THEME_PALETTE)){
  assert.ok(contrastRatio(p.text,p.surface)>=7,mode+" primary text below AAA");
  assert.ok(contrastRatio(p.subtext,p.surface)>=4.5,mode+" supporting text below AA");
  assert.ok(contrastRatio(p.accent,p.surface)>=4.5,mode+" accent text below AA");
 }
});
