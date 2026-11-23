// Whisper runs in a worker, avoiding UI freezes.
import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";
let recognizer;
let modelPromise;
const CHUNK_SECONDS = 25;
async function loadModel() {
  if (recognizer) return recognizer;
  if (!modelPromise) {
    self.postMessage({ type: "stage", message: "Loading Whisper model. The first download may take a while…" });
    modelPromise = pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en", {
      device: "wasm", dtype: "q8",
      progress_callback: p => {
        if (p.status === "progress" && typeof p.progress === "number") self.postMessage({ type: "download", progress: Math.round(p.progress) });
      }
    }).catch(err => { modelPromise = null; throw err; });
  }
  recognizer = await modelPromise;
  return recognizer;
}
self.onmessage = async event => {
  const { type, samples } = event.data || {};
  if (type !== "transcribe" || !samples) return;
  try {
    const asr = await loadModel();
    const size = 16000 * CHUNK_SECONDS;
    const total = Math.max(1, Math.ceil(samples.length / size));
    const segments = [];
    for (let i = 0; i < total; i++) {
      self.postMessage({ type: "stage", message: "Transcribing segment " + (i + 1) + " of " + total + "…" });
      const slice = samples.slice(i * size, Math.min(samples.length, (i + 1) * size));
      const result = await asr(slice, { task: "transcribe" });
      const text = (result?.text || "").trim();
      if (text) segments.push(text);
      self.postMessage({ type: "segment", index: i + 1, total, text, progress: Math.round(((i + 1) / total) * 100) });
    }
    self.postMessage({ type: "complete", text: segments.join(" ").trim() });
  } catch (err) {
    self.postMessage({ type: "error", message: err?.message || "Speech recognition failed." });
  }
};
