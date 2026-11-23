// The Hugging Face English-only Whisper checkpoints reject task/language overrides.
export const WHISPER_MODEL = "Xenova/whisper-tiny.en";
export function whisperCallOptions(modelId = WHISPER_MODEL) {
  return /\.en$/i.test(modelId) ? {} : { task: "transcribe" };
}
