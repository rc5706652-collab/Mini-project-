import test from "node:test";
import assert from "node:assert/strict";
import {WHISPER_MODEL,MULTILINGUAL_MODEL,LANGUAGES,resolveWhisperModel,whisperCallOptions} from "../public/whisper-config.js";
test("English-only Whisper omits task and language options",()=>{
 assert.equal(WHISPER_MODEL,"Xenova/whisper-tiny.en");
 assert.deepEqual(whisperCallOptions(),{});
 assert.equal("task" in whisperCallOptions(),false);
 assert.equal("language" in whisperCallOptions(),false);
});
test("multilingual models receive explicit recognition or translation task",()=>{
 assert.equal(resolveWhisperModel("hi"),MULTILINGUAL_MODEL);
 assert.equal(resolveWhisperModel("kn"),MULTILINGUAL_MODEL);
 assert.equal(resolveWhisperModel("te"),MULTILINGUAL_MODEL);
 assert.deepEqual(whisperCallOptions(MULTILINGUAL_MODEL,"hi"),{task:"transcribe",language:"hindi"});
 assert.deepEqual(whisperCallOptions(MULTILINGUAL_MODEL,"kn","english"),{task:"translate",language:"kannada"});
 assert.deepEqual(whisperCallOptions(MULTILINGUAL_MODEL,"auto"),{task:"transcribe"});
});
test("English-only model used by default",()=>{
 assert.equal(resolveWhisperModel(),WHISPER_MODEL);
 assert.equal(LANGUAGES.te,"telugu");
});
