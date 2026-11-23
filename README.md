# NoteWave 2.0 — Sonic AI Learning Studio

Turn spoken English audio into structured notes you can explore, search, and study.

NoteWave combines an interactive Sonic Core 3D experience with Liquid Glass Aurora panels. It offers genuine in-browser speech recognition, extractive NLP notes, and on-device semantic retrieval. No paid AI API key or database is required.


## NoteWave 3.0 — Interactive Learning Universe

Five new modules build on the current Sonic Core 3D, Particle Alchemy, Liquid Glass design, and the original recording/transcription/study workflows:

1. **Knowledge Galaxy**: up to ten interactive CSS 3D concepts. Stars and connecting lines come from transcript words and sentence co-mentions. Co-mention does not prove a causal relationship. No additional WebGL context is used, so the 3D map remains lightweight on phones.
2. **Quiz Arena**: up to six multiple-choice questions built from source sentence blanks and source-derived distractors. Scores, correct answers and evidence appear immediately. If insufficient distinct concepts exist, the app explains why the quiz cannot be generated.
3. **AI Personal Tutor**: starts with evidence retrieval using transcript keywords; its default response quotes source material. An opt-in locally downloads Xenova/flan-t5-small and drafts a simple **English** explanation. It may hallucinate, so the UI labels generated text as unverified and presents original evidence. It is designed for desktop use and may be slow on mobile.
4. **AI Knowledge Memory**: IndexedDB stores session text records, not raw audio, with cross-session search. Prior localStorage history is migrated automatically. Notes remain on the same browser profile; clearing storage, private browsing or quota eviction may delete them.
5. **Multilingual Notes**: English uses Xenova/whisper-tiny.en. Auto, Hindi, Kannada, Telugu, Tamil and Malayalam use Xenova/whisper-tiny with transcription into the spoken language or Whisper's audio-to-English translation task. Native-script transcripts are tokenized for extractive summaries and keywords. This is not a general-purpose translator for arbitrary pasted text, and recognition/translation accuracy is especially limited for lower-resource languages and noisy audio.

### Compute, privacy and availability

- This remains a static Render site; no paid model APIs, tokens, backend inference service or account are needed.
- The existing Whisper Worker, optional semantic worker and optional tutor worker are independent modules. Only the selected models are downloaded, and optional tutor generation is never automatic.
- The quiz and graph involve only small amounts of text and no heavyweight inference. The 3D Galaxy uses CSS perspective rather than a second WebGL renderer. Reduced-motion and mobile styles are included.
- The first use of speech recognition, semantic search or optional tutor generation fetches model weights and JavaScript libraries from external providers; this means internet access may be required even though recording data stays local. The models are not guaranteed to be available offline.
- Do not assume generative explanations are factual. Verify any important claim against the source quote.
- The multilingual Tiny model may produce errors or incorrect English translations. Always inspect the editable transcript.
- GitHub browser smoke tests simulate Whisper output to verify interface and worker option wiring. They do not measure true accuracy of any downloadable AI model; real-device audio tests are still needed.

### New files

- public/knowledge.js, public/quiz.js, public/tutor.js: pure, independently testable data processing.
- public/memory.js: IndexedDB persistence, migration, and keyword search.
- public/advanced-ui.js and public/advanced-template.html: lazy-loaded learning suite interface.
- public/tutor-worker.js: optional on-device FLAN-T5 explanation model.
- public/whisper-config.js and public/worker.js: language-selected multilingual ASR or speech translation.
- tests/new-features.test.mjs: graph, quiz, tutor and memory tests.


## Features

1. Upload audio, record through the microphone, or paste a transcript.
2. Whisper Tiny English transcribes locally in a Web Worker using approximate 25-second audio segments.
3. Extractive NLP selects summary sentences, key points, actions, dates, numbers, and keywords.
4. Study tools:
   - **Ask Your Recording**: On-device MiniLM embeddings find relevant original transcript passages. If the model is unavailable, keyword evidence retrieval takes over. It never invents answers.
   - **Recall Flashcards**: Fill-in-the-blank review cards made from real transcript sentences.
   - **Audio Chapters**: Approximate timed chapter markers derived from Whisper chunk positions, with audio playback navigation.
5. Edit or regenerate the transcript, copy notes, download Markdown, print/save to PDF, and save notes locally.


## Particle Alchemy (Sonic Core transition)

When you press **Generate intelligence**, the processing card displays an interactive three-dimensional particle transition:

1. A dense sphere appears as the recording enters speech recognition. As work continues, its points scatter into a floating purple/cyan particle cloud.
2. After the transcript is ready, particles converge into **NOTES READY**, followed by depth-animated summary, takeaway, action and keyword cards.
3. The normal Sonic Core pauses while the effect runs, and resumes after it finishes. Generation is not blocked if the 3D library cannot load.

This is an actual GPU-batched Three.js point cloud, with a deterministic geometry module (public/alchemy-shapes.js) and a dedicated renderer (public/alchemy.js), not just a decorative video. The renderer is lazy-loaded only upon generating notes; its GPU resources are released afterward. Particle counts are capped (2,200 desktop, 720 mobile, 440 on low-memory or data-saving devices). There is a CSS fallback, a reduced-motion experience, and a maximum render rate of roughly 30 FPS on mobile.

No audio data is submitted to the animation engine, and the effect does not call an AI API. The existing private English-only Whisper transcription, extractive notes, flashcards, semantic evidence retrieval and chapter navigator are unchanged.

The browser CI test uses a deterministic fake speech-recognition worker for the audio workflow so it can verify UI orchestration without downloading the real Whisper model. Actual Whisper model inference still requires testing in a real browser with a recording.

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
