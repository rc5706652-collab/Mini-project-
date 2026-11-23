import test from "node:test";
import assert from "node:assert/strict";
import { cleanText, splitSentences, tokenize, createNotes, toMarkdown } from "../public/notes.js";
test("normalizes whitespace and separates sentences", () => {
  assert.equal(cleanText("  Hello  world. \n\n\nNext "), "Hello world. \n\nNext");
  assert.deepEqual(splitSentences("First sentence. Second sentence!"), ["First sentence.", "Second sentence!"]);
});
test("creates grounded notes, actions and details", () => {
  const transcript = "Today we discussed the new science project. The science project uses speech recognition to create notes. Priya should prepare the presentation by Friday. The project has 25 sample recordings.";
  const notes = createNotes(transcript);
  assert.ok(notes?.summary);
  assert.ok(notes.points.length > 0);
  assert.ok(notes.actions.some(x => x.includes("Priya should prepare")));
  assert.ok(notes.details.some(x => x.includes("25 sample")));
  assert.ok(notes.keywords.includes("project"));
  assert.ok(notes.points.every(x => transcript.includes(x)));
  assert.ok(toMarkdown(notes).includes("## Full Transcript"));
});
test("does not fabricate notes for empty transcripts", () => {
  assert.equal(createNotes("  "), null);
  assert.deepEqual(tokenize("the is a and"), []);
});
test("handles punctuation-free long transcripts", () => {
  const sentence = Array.from({ length: 95 }, (_, i) => "concept" + i).join(" ");
  assert.ok(splitSentences(sentence).length >= 3);
  assert.equal(splitSentences(sentence).join(" "), sentence);
});
