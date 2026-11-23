# NoteWave 2.0 — Sonic AI Learning Studio

Turn spoken English audio into structured notes you can explore, search, and study.

NoteWave combines an interactive Sonic Core 3D experience with Liquid Glass Aurora panels. It offers genuine in-browser speech recognition, extractive NLP notes, and on-device semantic retrieval. No paid AI API key or database is required.

## Features

1. Upload audio, record through the microphone, or paste a transcript.
2. Whisper Tiny English transcribes locally in a Web Worker using approximate 25-second audio segments.
3. Extractive NLP selects summary sentences, key points, actions, dates, numbers, and keywords.
4. Study tools:
   - **Ask Your Recording**: On-device MiniLM embeddings find relevant original transcript passages. If the model is unavailable, keyword evidence retrieval takes over. It never invents answers.
   - **Recall Flashcards**: Fill-in-the-blank review cards made from real transcript sentences.
   - **Audio Chapters**: Approximate timed chapter markers derived from Whisper chunk positions, with audio playback navigation.
5. Edit or regenerate the transcript, copy notes, download Markdown, print/save to PDF, and save notes locally.

## Architecture

- public/index.html + public/style.css: responsive 3D + glass interface.
- public/scene.js: lazy-loaded Three.js WebGL orb, particles, animated rings, and performance-aware fallback.
- public/app.js: audio capture, decoding, resampling, and app workflow.
- public/worker.js + public/whisper-config.js: Whisper inference. English-only models never receive task or language options (fixing the original transcription error).
- public/notes.js + public/study.js: extractive notes and flashcard/chapter processing.
- public/semantic-worker.js + public/learning-ui.js: on-demand MiniLM semantic retrieval, evidence display, and study mode.
- tests: NLP, model-option, and Chromium mobile/desktop smoke tests.
- render.yaml: optional infrastructure Blueprint. The existing Render static site publishes the public directory automatically from main.

## Run locally

Start an HTTP server in the repository root:

    python3 -m http.server 8000 --directory public

Open http://localhost:8000. Do not open the HTML file directly, because browser workers require HTTP.

Run unit tests:

    node --test tests/*.test.mjs

Optional browser smoke tests:

    npm install --no-save playwright@1.56.1
    npx playwright install chromium
    node tests/browser-smoke.mjs

CI runs Chromium on Ubuntu 24.04.

## GitHub and Render

- GitHub: https://github.com/rc5706652-collab/Mini-project-
- Published branch: main
- Render static site: https://audionotes-studio.onrender.com/
- Build command: echo 'No build required'
- Publish directory: public
- Auto-deploy on new commits to main.

## Privacy and limitations

- Whisper Tiny English is **English only**. Verify recognized text before important decisions.
- Notes use **extractive NLP**, not generative LLM composition. Semantic Q&A retrieves relevant original passages with clear labels rather than fabricating answers.
- The optional embedding model downloads on first Q&A use. If downloads or inference fail, lexical evidence is available.
- Audio stays in your browser and is never sent to an application backend. The browser still contacts external CDNs and Hugging Face to fetch JS, fonts, and pretrained model weights.
- Up to 12 recent text sessions are stored in localStorage. Audio is not persisted or synced across devices. Avoid shared-device storage for private conversations.
- Some audio formats may not decode on every browser; convert to WAV or MP3 where necessary.
- Each recording is limited to 30 minutes. Device memory and processing speed can be limiting, especially on phones.
- Chapters are approximate input-chunk positions, **not word-level timestamps**. Editing the transcript invalidates its original timing.
- WebGL is decorative: processing still works with CSS fallback or reduced motion.

## Model and library acknowledgements

- Transformers.js: https://huggingface.co/docs/transformers.js
- English Whisper: https://huggingface.co/Xenova/whisper-tiny.en
- Semantic embeddings: https://huggingface.co/Xenova/all-MiniLM-L6-v2
- Three.js: https://threejs.org/

## Problem statement

Manually listening to lengthy recordings and taking notes is slow and can miss important details. NoteWave combines speech recognition and NLP to provide concise notes, grounded evidence search, active-recall exercises, and recording navigation that help students and professionals learn from audio recordings.
