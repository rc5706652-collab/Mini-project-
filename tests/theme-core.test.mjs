import test from "node:test";
import assert from "node:assert/strict";
import {THEME_KEY,PREFERENCES,THEME_COLORS,THEME_PALETTE,contrastRatio,normalizePreference,resolveTheme,metaThemeColor} from "../public/theme-core.js";
test("three preferences are explicit and unknown values are safe",()=>{
 assert.deepEqual([...PREFERENCES],["system","dark","light"]);
 assert.equal(THEME_KEY,"notewave-theme-v1");
 assert.equal(normalizePreference("invalid"),"system");
 assert.equal(normalizePreference("light"),"light");
});
test("explicit choice overrides OS while system follows OS",()=>{
 assert.equal(resolveTheme("system",true),"dark");
 assert.equal(resolveTheme("system",false),"light");
 assert.equal(resolveTheme("dark",false),"dark");
 assert.equal(resolveTheme("light",true),"light");
 assert.equal(resolveTheme("other",true),"dark");
 assert.equal(metaThemeColor("light"),THEME_COLORS.light);
});
test("enterprise text and supporting text meet WCAG AA on surfaces",()=>{
 for(const [theme,palette] of Object.entries(THEME_PALETTE)){
  assert.ok(contrastRatio(palette.text,palette.surface)>=7,theme+" primary text contrast");
  assert.ok(contrastRatio(palette.subtext,palette.surface)>=4.5,theme+" secondary text contrast");
  assert.ok(contrastRatio(palette.accent,palette.surface)>=4.5,theme+" accent text contrast");
 }
});
