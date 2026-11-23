// Whisper inference runs in a dedicated worker so the UI remains responsive.
import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";
import { whisperCallOptions, WHISPER_MODEL } from "./whisper-config.js";

let recognizer, modelPromise;
const RATE = 16000, CHUNK_SECONDS = 25;
async function loadModel() {
  if (recognizer) return recognizer;
  if (!modelPromise) {
    postMessage({ type: "stage", message: "Preparing on-device Whisper model…" });
    modelPromise = pipeline("automatic-speech-recognition", WHISPER_MODEL, {
      device: "wasm",
      dtype: "q8",
      progress_callback: progress => {
        if (progress.status === "progress" && Number.isFinite(progress.progress)) {
          postMessage({ type: "download", progress: Math.round(progress.progress) });
        }
      }
    }).catch(err => { modelPromise = null; throw err; });
  }
  recognizer = await modelPromise;
  return recognizer;
}

self.onmessage = async ({ data }) => {
  if (data?.type !== "transcribe" || !data.samples) return;
  try {
    const asr = await loadModel(), samples = data.samples;
    const chunkSize = RATE * CHUNK_SECONDS;
    const total = Math.max(1, Math.ceil(samples.length / chunkSize));
    const segments = [];
    for (let i = 0; i < total; i++) {
      postMessage({ type: "stage", message: "Transcribing segment " + (i + 1) + " of " + total });
      const chunk = samples.subarray(i * chunkSize, Math.min(samples.length, (i + 1) * chunkSize));
      // Critical: English-only .en models must NOT receive a task or language argument.
      const output = await asr(chunk, whisperCallOptions(WHISPER_MODEL));
      const text = (output?.text ?? "").trim();
      if (text) segments.push({ text, start: i * CHUNK_SECONDS, end: Math.min(samples.length / RATE, (i + 1) * CHUNK_SECONDS) });
      postMessage({ type: "segment", index: i + 1, total, text, progress: Math.round(100 * (i + 1) / total) });
    }
    postMessage({ type: "complete", text: segments.map(item => item.text).join(" ").trim(), segments });
  } catch (err) {
    postMessage({ type: "error", message: err?.message || "Speech recognition failed." });
  }
};
