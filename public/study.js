import { createNotes, splitSentences, tokenize } from "./notes.js";

const unique = items => [...new Set(items)];
const ESCAPE_REGEX = /[|\\{}()[\]^$+*?.]/g;

/** Source-derived recall cards. Unicode boundaries work for Indian scripts. */
export function makeFlashcards(notes, limit = 8) {
  if (!notes?.transcript) return [];
  const sentences = splitSentences(notes.transcript);
  const terms = unique(notes.keywords || []).filter(term => term.length > 3);
  const cards = [];
  for (const term of terms) {
    const escaped = term.replace(ESCAPE_REGEX, "\\$&");
    const pattern = new RegExp("(?<![\\p{L}\\p{N}])" + escaped + "(?![\\p{L}\\p{N}])", "iu");
    const original = sentences.find(sentence =>
      pattern.test(sentence) && sentence.split(/\s+/).length >= 6 && sentence.length <= 340);
    if (!original) continue;
    const prompt = original.replace(pattern, "________");
    if (prompt === original || cards.some(card => card.prompt === prompt)) continue;
    cards.push({ prompt, answer: term, evidence: original });
    if (cards.length >= limit) break;
  }
  return cards;
}

/** Retrieval fallback for browsers where semantic inference is unavailable. */
export function lexicalEvidence(question, transcript, limit = 3) {
  const query = unique(tokenize(question));
  const sentences = splitSentences(transcript).filter(Boolean);
  if (!query.length || !sentences.length) return [];
  return sentences.map((text,index) => {
    const words = new Set(tokenize(text));
    const matches = query.filter(term => words.has(term)).length;
    return {index,text,matches,score:matches / Math.sqrt(Math.max(1,query.length * words.size))};
  }).filter(item => item.matches > 0)
    .sort((a,b) => b.score - a.score).slice(0,limit);
}
export function makeChapters(segments, windowSeconds = 75) {
  if (!Array.isArray(segments) || !segments.length) return [];
  const valid = segments.filter(s =>
    typeof s.text === "string" && Number.isFinite(s.start) &&
    Number.isFinite(s.end) && s.end > s.start);
  const groups = [], window = Math.max(25,windowSeconds);
  let current = null;
  for (const segment of valid) {
    if (!current || segment.start >= current.start + window) {
      if (current) groups.push(current);
      current = {start:segment.start,end:segment.end,parts:[]};
    }
    current.end = Math.max(current.end,segment.end);
    if (segment.text.trim()) current.parts.push(segment.text.trim());
  }
  if (current) groups.push(current);
  return groups.filter(x => x.parts.length).map((group,i) => {
    const transcript = group.parts.join(" ");
    const notes = createNotes(transcript);
    const title = notes?.keywords?.slice(0,2).map(
      term => term.charAt(0).toUpperCase() + term.slice(1)).join(" / ");
    return {start:group.start,end:group.end,
      title:title||"Chapter "+(i+1),excerpt:notes?.summary||transcript.slice(0,180),transcript};
  });
}
export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const sec = Math.floor(seconds);
  return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0");
}
