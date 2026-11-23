import test from "node:test";
import assert from "node:assert/strict";
import { WHISPER_MODEL, whisperCallOptions } from "../public/whisper-config.js";
test("English-only Whisper omits task and language options", () => {
  assert.equal(WHISPER_MODEL, "Xenova/whisper-tiny.en");
  assert.deepEqual(whisperCallOptions(), {});
  assert.equal("task" in whisperCallOptions(), false);
  assert.equal("language" in whisperCallOptions(), false);
});
test("Multilingual checkpoints may request transcription", () => {
  assert.deepEqual(whisperCallOptions("Xenova/whisper-tiny"), { task: "transcribe" });
});
