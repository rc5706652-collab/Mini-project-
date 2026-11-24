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


## NoteWave 4.0 — Enterprise 3D Experience

The presentation layer uses **web-native ES modules, Three.js/WebGL, responsive CSS design tokens, Web Workers, and IndexedDB**. A framework migration was intentionally avoided for the current free Render static-site deployment: the speech and study modules already operate on-device and an extra server/build step would risk existing workflows. The visual architecture is modular and progressively enhanced instead.

- **Three spatial moments:** Sonic Core hero (scene.js), Particle Alchemy transformation (alchemy.js), and the transcript-grounded CSS 3D Knowledge Galaxy (advanced-ui.js). Existing AI engines remain unchanged.
- **Presentation layer:** enterprise.css defines design tokens, responsive 12-column notes, glass surfaces and mobile safe-area layout. enterprise-ui.js adds a command palette, mobile dock, motion controls, accessible keyboard tabs, optional 3D card tilt and context-loss fallbacks. experience-core.js contains pure, unit-tested performance and UX policies.
- **Shortcuts:** Ctrl/Cmd+K opens commands; outside form fields, N starts a session, S resumes Studio, L opens Library, and G/Q/T open the Galaxy, Quiz or Tutor when a note is open. Arrow keys/Home/End navigate accessible tabs.
- **Responsive:** viewport width scenarios include 320, 375, 390, 430, 768, 1024, 1440, 1920 CSS pixels plus landscape; safe-area dock padding uses env(safe-area-inset-bottom). Mobile form controls use 16px fonts to avoid iOS auto-zoom.
- **Adaptive performance:** WebGL pixel ratio and frame rate are capped for smaller devices. Hidden pages pause rendering. Reduced motion, low memory and data-saving conditions reduce visual cost; mobile uses a non-blurred glass alternative. The recording and notes UI works without WebGL.
- **Session safety:** AI Studio navigation resumes current unsaved results. New session explicitly resets the current workspace; save/restore/export controls remain.
- **Tests:** Node unit tests, existing NLP/Whisper/audio Chromium smoke tests, and a new Chromium + WebKit matrix validating critical actions and layout overflow.

### Device and accessibility release criteria

Automated tests target visual overflow, 44px mobile tap areas, 16px input fonts, reduced-motion operation, command navigation, saved-note recovery, and functioning Quiz/Galaxy controls. Linux WebKit uses Safari's engine but is not identical to physical iPhone/iPad Safari.

Before claiming a universal hardware pass, verify microphone permissions, model downloads, local-storage quota failures, orientation switching, TalkBack/VoiceOver, battery/performance and animation smoothness on real iOS and Android devices. A 60 FPS guarantee across all devices would not be responsible.


## Pip — 3D robot and local AI chatbot

NoteWave's previous animated sphere has been replaced by **Pip**, a small responsive Three.js robot with expressive eyes, a glowing heart, head turns, waving arms and distinct idle, listening, processing, thinking, speaking, and complete states. Existing audio/Whisper/Particle Alchemy and study tools remain unchanged. A CSS-only fallback renders Pip if WebGL is unavailable or reduced motion is enabled.

The **Pip Chat** panel is available even before recording:

- **Any topic:** short answers from an on-demand local model. Fast local uses Xenova/flan-t5-small on CPU; Enhanced uses onnx-community/Qwen2.5-0.5B-Instruct quantized on WebGPU, selected explicitly on a compatible device.
- **My recording:** questions use original transcript evidence, with supporting passages displayed beneath generated replies. Summary requests use the existing extractive notes. Unsupported questions never produce fake citations.
- **Voice questions:** tap the microphone to record an optional short voice question (maximum 12 seconds), then tap stop. Audio is decoded into 16 kHz PCM and transcribed by the existing English Whisper model in a separate Web Worker. This is not an always-on microphone or wake-word listener. Type a question if the microphone or decoder is unavailable.
- **Voice replies:** optional (off by default) through browser/device Speech Synthesis. Browser voices vary and may use OS/provider services.
- **Cinematic Studio entrance:** opening AI Studio or starting a session triggers a short 3D CSS portal scene. It never blocks input and is disabled for reduced motion.
- **Privacy:** prompts and voice audio are not sent to a NoteWave server. Scripts and AI models are downloaded from external hosts, including Hugging Face. Voice playback may use browser/OS services. Chat history is held only in the current tab's memory and is not saved to IndexedDB.
- **Performance:** model downloads and CPU/WebGPU requirements differ by hardware. Fast local is the mobile-friendly default; Enhanced requires WebGPU and substantially more memory. Pip's short voice-question recognition is English-only. AI Studio's existing multilingual recording mode is unchanged.
- **Accuracy:** local models can make mistakes, and Fast local is much smaller than cloud chat models. The source evidence is authoritative only for what the transcript actually contains; speech transcription itself can have errors.
- **Tests:** companion-core.test.mjs checks grounded prompts; companion-browser.mjs verifies mocked model/voice UI, notes citations and Chromium/WebKit layout. Actual voice recognition and real-model answer quality require separate device verification.

Files: public/robot.js, public/robot-chat.js, public/robot-chat.css, public/companion-core.js, public/companion-worker.js. No paid API or server database is introduced.


## Enterprise Appearance — Dark, Light and System

NoteWave now supports a full enterprise-grade color scheme across the studio, Pip chatbot, audio workflow, note cards, flashcards, tutor, Galaxy controls, library, mobile dock, command palette and dialogs. Existing AI processing, WebGL scenes and audio recording behavior are unchanged.

- **Light:** soft porcelain canvas, navy primary text, indigo-to-blue accents, accessible controls, layered white cards and restrained shadows. The 3D Galaxy remains a deliberate dark starfield, with accessible source panels outside it.
- **Dark:** the current midnight liquid-glass aesthetic, with indigo highlights and glowing 3D companions retained.
- **System:** the default. Follows the browser/device dark-mode setting, including changes while the page is open.
- **Persistence:** selections are stored only in this browser using the localStorage key notewave-theme-v1. Nothing is transmitted to a backend. Private mode or clearing browser data may reset the preference.
- **No theme flash:** a tiny inline script resolves the saved or OS mode before the first stylesheet paints. The theme controller only updates the theme attributes, meta theme-color, and accessible menu labels.
- **Keyboard and mobile:** Appearance opens an accessible menu with pointer, Enter, Arrow, Home/End, and Escape controls. The switcher remains available in the top toolbar at small widths, including iOS and Android, with a 44px minimum touch target.
- **Architecture:** public/theme-core.js contains pure theme resolution and contrast helpers, public/theme.js manages the preference and menu, and public/enterprise-themes.css is a final cascading theme layer that overrides hard-coded legacy colors without touching the AI modules. Dark/light text and secondary text colors are tested against WCAG AA contrast targets for solid enterprise surfaces.
- **Validation:** tests/theme-core.test.mjs and tests/theme-browser.mjs cover keyboard controls, persistence, automatic OS changes, responsive overflow, generation and study tool navigation in Chromium and WebKit. Automated checks are not the same as a visual/accessibility audit on every real iPhone and Android model.

The theme toggle changes appearance only, never the recording, transcription, generated notes, chatbot model or stored sessions.


## Loisel — multilingual lecture learning & Quiz Studio

The former Pip model is replaced by the user's uploaded futuristic silver/android portrait, displayed as a static image in the hero, chat avatar and existing Studio transition. The 3D Knowledge Galaxy and Particle Alchemy workflows remain intact.

**Multilingual recording:** choose the spoken language (including Auto, English, Hindi, Kannada, Telugu, Tamil, Malayalam, Bengali, Marathi, Gujarati, Punjabi, Urdu, Arabic, Spanish, French, German, Portuguese and Japanese). On-device Whisper transcribes the recording. Choose to keep the spoken language, translate to English, or choose a supported output language. Source recognition is preserved when a second translation is used and added to Markdown exports. Auto + non-English target uses an English translation bridge, not guaranteed verbatim original-language text. Accent and code-mixed speech recognition may be inaccurate. Review transcripts.

**Model sizing and privacy:** no paid API or account. First use needs network access to download AI models. Optional NLLB 600M translation is substantial (often 1 GB+ download and significant memory) and may be slow or unavailable on phones. If it fails, the source text is retained instead of inventing a translation. Loisel general chatbot still runs a small local model and is not guaranteed to reason accurately in every output language.

**Independent Quiz Studio:** sidebar/mobile dock links to separate lecture quizzes. Choose the current transcript, a previously saved lecture or paste a lecture. Optional focus must match a topic in that source. Four-choice questions use the existing source-grounded quiz engine. After submission, see accuracy, mistaken concepts, exact source passage, a simple explanation, and links to YouTube search pages for related lesson videos. The videos are search results, not individually curated or verified. The learning report reflects one quiz attempt, not a formal diagnosis of student ability. The Ask Loisel action pre-fills a source-grounded explanation question in the chat.

**Tests:** existing audio, NLP, companion and responsive suites remain. tests/loisel-learning.test.mjs validates speech planning, chunking, quiz grounding and score logic. tests/loisel-browser.mjs covers the portrait, lecture quiz, video search links and mocked multilingual workers in Chromium and WebKit. Real ASR/translator model inference and physical device performance require hands-on verification.
