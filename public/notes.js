// Extractive NLP: notes are derived from actual transcript sentences.
const STOP = new Set(("a an and are as at be been being but by can could did do does for from had has have he her hers him his how i if in into is it its me my nor not of on or our ours she should so than that the their them there these they this those through to too under until up us was we were what when where which while who why will with would you your yours about above across after again against all also am any because before below between both during each few further here itself just more most much no once only other out over own same some such then very via").split(" "));
const ACTION = /\b(action item|action point|todo|to-do|next step|must|need to|needs to|should|assigned|assignment|submit|send|prepare|review|complete|finish|follow up|follow-up|deliver|deadline|by tomorrow|by monday|by tuesday|by wednesday|by thursday|by friday|by saturday|by sunday|responsible for)\b/i;
const DETAIL = /\b(?:\d+(?:[.,]\d+)*(?:%|am|pm|hrs?|hours?|days?|weeks?|months?|years?|rupees?|dollars?|gb|mb)?|january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|yesterday)\b/i;

export function cleanText(value) {
  return String(value ?? "").replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
export function tokenize(value) {
  return (String(value).toLocaleLowerCase().match(/[\p{L}][\p{L}\p{M}\p{N}'-]{1,}/gu) || [])
    .map(w => w.replace(/^'+|'+$/g, ""))
    .filter(w => !STOP.has(w) && w.length > 2);
}
export function splitSentences(value) {
  const text = cleanText(value);
  if (!text) return [];
  const parts = text.split(/(?<=[.!?।॥؟。])\s*|\n+/).map(x => x.trim()).filter(Boolean);
  const output = [];
  for (const part of parts) {
    if (part.length <= 320) { output.push(part); continue; }
    const words = part.split(/\s+/);
    for (let i = 0; i < words.length; i += 38) output.push(words.slice(i, i + 38).join(" "));
  }
  return output;
}
function unique(items) { return [...new Set(items)]; }
function rankSentences(sentences) {
  const tokens = sentences.map(tokenize);
  const corpus = new Map();
  for (const words of tokens) for (const w of unique(words)) corpus.set(w, (corpus.get(w) || 0) + 1);
  const N = sentences.length;
  return tokens.map((words, i) => {
    if (!words.length) return { i, score: 0 };
    let score = 0;
    for (const w of words) score += 1 + Math.log((N + 1) / ((corpus.get(w) || 0) + 1));
    score /= Math.sqrt(words.length);
    if (i === 0) score *= 1.14;
    if (/\b(important|key|main|conclusion|because|therefore|result|decided|means|purpose|recommend)\b/i.test(sentences[i])) score *= 1.18;
    if (words.length < 4) score *= 0.55;
    return { i, score };
  }).sort((a, b) => b.score - a.score);
}
export function createNotes(transcript) {
  const text = cleanText(transcript);
  const sentences = splitSentences(text);
  if (!sentences.length) return null;
  const ranked = rankSentences(sentences);
  const pick = count => ranked.slice(0, Math.min(count, sentences.length)).sort((a, b) => a.i - b.i).map(x => sentences[x.i]);
  const counts = new Map();
  tokenize(text).forEach(w => counts.set(w, (counts.get(w) || 0) + 1));
  const keywords = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 7).map(([word]) => word);
  const actions = unique(sentences.filter(s => ACTION.test(s))).slice(0, 6);
  const details = unique(sentences.filter(s => DETAIL.test(s) && !actions.includes(s))).slice(0, 5);
  const points = pick(Math.max(1, Math.min(6, Math.ceil(sentences.length * 0.45))));
  const summary = pick(Math.max(1, Math.min(3, Math.ceil(sentences.length * 0.22)))).join(" ");
  const title = keywords.length ? keywords.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" · ") : "Recording Notes";
  return { title, summary, points, actions, details, keywords, transcript: text, wordCount: text.split(/\s+/).filter(Boolean).length, sentenceCount: sentences.length };
}
export function toMarkdown(notes, name = "Recording") {
  if (!notes) return "";
  const section = (heading, items, fallback) =>
    "## " + heading + "\n\n" + (items.length ? items.map(x => "- " + x).join("\n") : fallback) + "\n\n";
  return "# " + notes.title + "\n\n" +
    "**Source:** " + String(name).replace(/[\n\r]/g, " ") + "\n\n" +
    "## Overview\n\n" + notes.summary + "\n\n" +
    section("Key Points", notes.points, "No key points found.") +
    section("Action Items", notes.actions, "No explicit action items detected.") +
    section("Important Details", notes.details, "No dates or numerical details detected.") +
    "## Keywords\n\n" + notes.keywords.join(", ") + "\n\n" +
    "## Full Transcript\n\n" + notes.transcript + "\n";
}
