import { createNotes, splitSentences, tokenize } from "./notes.js";

const uniquify = list => [...new Set(list)];
const ESCAPE_REGEX = /[|\\{}()[\]^$+*?.]/g;

/** Extractive review cards: never generate facts not present in the transcript. */
export function makeFlashcards(notes, limit = 8) {
  if (!notes?.transcript) return [];
  const sentences = splitSentences(notes.transcript);
  const terms = uniquify(notes.keywords || []).filter(w => w.length > 3);
  const cards = [];
  for (const term of terms) {
    const pattern = new RegExp("(?<![\\p{L}\\p{N}])" + term.replace(ESCAPE_REGEX, "\\const pattern = new RegExp("\\b" + term.replace(ESCAPE_REGEX, "\\$&") + "\\b", "i");") + "(?![\\p{L}\\p{N}])", "iu");
    const original = sentences.find(sentence => pattern.test(sentence) && sentence.split(/\s+/).length >= 6 && sentence.length <= 340);
    if (!original) continue;
    const prompt = original.replace(pattern, "________");
    if (prompt === original || cards.some(card => card.prompt === prompt)) continue;
    cards.push({ prompt, answer: term, evidence: original });
    if (cards.length >= limit) break;
  }
  return cards;
}

/** Keyword fallback for low-memory devices or when embedding model downloads fail. */
export function lexicalEvidence(question, transcript, limit = 3) {
  const query = uniquify(tokenize(question));
  const sentences = splitSentences(transcript).filter(Boolean);
  if (!query.length || !sentences.length) return [];
  const results = sentences.map((text, index) => {
    const words = new Set(tokenize(text));
    const matches = query.filter(word => words.has(word)).length;
    return { index, text, score: matches / Math.sqrt(Math.max(1, query.length * words.size)), matches };
  }).filter(item => item.matches > 0).sort((a,b) => b.score - a.score);
  return results.slice(0, limit);
}

/** Each chapter corresponds to real Whisper segments; times are approximate chunk starts. */
export function makeChapters(segments, windowSeconds = 75) {
  if (!Array.isArray(segments) || !segments.length) return [];
  const valid = segments.filter(s => typeof s.text === "string" && Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start);
  if (!valid.length) return [];
  const output = [], window = Math.max(25, windowSeconds);
  let current = null;
  for (const segment of valid) {
    if (!current || segment.start >= current.start + window) {
      if (current) output.push(current);
      current = { start: segment.start, end: segment.end, parts: [] };
    }
    current.end = Math.max(current.end, segment.end);
    if (segment.text.trim()) current.parts.push(segment.text.trim());
  }
  if (current) output.push(current);
  return output.filter(x => x.parts.length).map((part, i) => {
    const transcript = part.parts.join(" ");
    const notes = createNotes(transcript);
    return { start:part.start, end:part.end, title: notes?.keywords?.slice(0,2).map(capitalize).join(" / ") || "Chapter " + (i + 1), excerpt:notes?.summary || transcript.slice(0,180), transcript };
  });
}
function capitalize(value) { return value.charAt(0).toUpperCase()+value.slice(1); }
export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const sec = Math.floor(seconds);
  return String(Math.floor(sec/60)).padStart(2, "0") + ":" + String(sec%60).padStart(2, "0");
}
