# NoteWave — Automated Notes Maker Using Audio Recordings

A responsive speech-to-text and automatic note generation website for students, teachers, and meeting participants.

## Features
- Upload audio files supported by your browser (MP3, WAV, M4A, WebM, etc.).
- Record microphone audio with a timer.
- Convert English audio to text with client-side Whisper Tiny via Transformers.js.
- Produce extractive NLP notes: overview, key takeaways, action items, important dates/numbers, and keywords.
- Correct the transcript and regenerate notes.
- Copy notes, export as Markdown, or use Print to save as PDF.
- Save or delete the latest 12 sets of notes in local browser storage.
- Mobile-responsive dark interface.

## Local development

Run a static HTTP server from the repository root:

    python3 -m http.server 8000 --directory public

Open http://localhost:8000 in a modern browser.

Run NLP tests:

    node --test tests/*.test.mjs

Requires no paid API key, no database, and no backend.

## Deploy to Render

Connect GitHub repository rc5706652-collab/Mini-project- in the Render dashboard.
Create a **Static Site** using:
- Branch: main
- Build command: echo "No build required"
- Publish directory: public

The repository also includes render.yaml for optional Blueprint-based provisioning.

## How it works

An audio recording is decoded by the browser and converted to 16 kHz mono samples. A Web Worker loads the pretrained Xenova/whisper-tiny.en model and transcribes 25-second chunks. The transcript is processed by an extractive NLP module using sentence scoring and rules to identify action items, dates, numbers and keywords.

This is **extractive** rather than generative AI summarization: note sentences come from the recognized transcript so the tool avoids inventing details. Whisper transcription may still have recognition mistakes and should be reviewed.

## Privacy and limitations

- Audio remains on the client; no audio upload to a custom server.
- First use requires network access to download JavaScript and AI model weights from external providers. Subsequent runs may use browser cache.
- Saved transcripts/notes are held in localStorage (not encrypted), not synced between devices.
- Browser-supported audio codecs and memory vary by device; large files may be slow or fail. Maximum duration is 30 minutes.
- Speech model is English-only. Multilingual recognition requires a different model.
- No cloud AI backend or generative LLM summaries. Explicit action item extraction can miss implied tasks.
- Important information should be verified against the recording before use.
