# EDGE — Invisible AI Conversation Intelligence

## Inspiration

Every year, sales teams lose millions in revenue not because their product is bad, but because reps miss critical moments in conversations — a competitor mention they didn't catch, a buying signal they talked past, a budget objection they fumbled. The conversation intelligence market is worth $10B+, but every tool in the market does the same thing: post-call analysis. By then, the deal is already lost.

I wanted to build something that changes the outcome of the conversation while it's still happening. Not a transcript analyzer. Not a call summary tool. A real-time invisible AI that whispers the perfect move in your ear at the exact moment you need it — like having the world's best sales coach sitting next to you on every call.

## What it does

EDGE is an invisible AI conversation coaching agent that runs as a desktop app. During high-stakes calls (sales, negotiations, investor pitches), it:

- **Listens** to the live conversation through your microphone via Gemini Live API
- **Watches** your screen (CRM, LinkedIn, contracts) using Gemini's multimodal video input
- **Detects** 8 critical conversation signals: budget objections, competitor mentions, stall tactics, buying signals, hidden decision makers, energy drops, confusion, and power moments
- **Whispers** coaching directly into your ear as native audio — not text-to-speech, but Gemini's own voice coaching you in real-time
- **Stays invisible** — the overlay uses Electron's `setContentProtection(true)` so it's completely hidden from screen recording, Zoom share, and screenshots. Only you see it.

The key innovation: EDGE only speaks when it matters. It analyzes the conversation flow and stays completely silent during normal dialog, only intervening at the 8 critical moments that change deal outcomes.

## How we built it

**Architecture:**
- **Electron Desktop App** — Two-window architecture: a control panel for session management and an invisible floating overlay for visual coaching cues
- **FastAPI Backend** — WebSocket server that bridges the Electron client with Gemini Live API on Vertex AI
- **Gemini Live 2.5 Flash Native Audio** — The core AI model, running on Vertex AI. Receives bidirectional audio streams and screen captures via `send_realtime_input()`, outputs native audio coaching whispers
- **Google GenAI SDK** — Uses `client.aio.live.connect()` for async Live session management with the native audio model

**Key technical decisions:**
- Used `gemini-live-2.5-flash-native-audio` instead of text models because audio-to-audio has lower latency and feels like a natural whisper rather than a robotic TTS voice
- Screen capture via Electron's `desktopCapturer` API, compressed to JPEG and sent as video frames every 5 seconds for context
- PCM audio at 16kHz input (mic) and 24kHz output (Gemini) with proper Float32-to-Int16 conversion
- Invisible overlay using `setContentProtection(true)` + `setAlwaysOnTop(true, 'screen-saver')` + `setIgnoreMouseEvents(true)` — it floats above everything but is invisible to screen capture
- Strategy Agent with a carefully designed system prompt that teaches Gemini the 8 critical signals and enforces brevity (under 15 words per whisper)

## Challenges we ran into

- **Vertex AI model naming** — Finding the correct model identifier (`gemini-live-2.5-flash-native-audio`) took significant debugging. Several model names from documentation returned 404 errors.
- **Audio-only output** — Discovered that the native audio model on Vertex AI only supports `response_modalities=["AUDIO"]`, not TEXT. Had to redesign the entire backend from text JSON responses to audio buffer collection and base64 streaming.
- **macOS Electron permissions** — `systemPreferences.askForMediaAccess('microphone')` returned false and Electron didn't appear in System Privacy settings. Solved via TCC reset and custom permission handlers.
- **Timing intelligence** — The hardest problem wasn't technical but behavioral: making EDGE know WHEN to speak. Too frequent = annoying noise. Too rare = useless. The 8-signal framework with "stay silent otherwise" instruction creates the right balance.

## Accomplishments that we're proud of

- **True invisibility** — EDGE is genuinely invisible to the other party. Screen recording, Zoom share, screenshots — none of them capture the overlay. This makes it practical for real high-stakes calls.
- **Native audio coaching** — Using Gemini's native audio output feels like having a human coach whispering in your ear, not a robot reading text.
- **Sub-second coaching** — From detecting a critical moment to delivering the whisper takes under 1 second via the Live API bidirectional stream.
- **Premium UI** — Glassmorphism control panel and cinematic overlay with urgency-based glow effects, progress bars, and audio waveform indicators.

## What we learned

- Gemini's Live API with native audio is remarkably good at understanding conversation context and generating contextual coaching — the audio-to-audio pipeline preserves nuance that text intermediaries lose
- The "invisible overlay" pattern using Electron's content protection is powerful for building tools that augment the user without being visible to others
- Multimodal context (audio + screen) dramatically improves coaching quality — when EDGE can see the CRM showing a $500K deal, it coaches differently than for a $5K deal

## What's next for EDGE

- **Multi-language support** — Coach in the language of the conversation
- **CRM auto-updates** — Write meeting notes and action items directly to Salesforce/HubSpot after the call
- **Team analytics** — Aggregate coaching patterns across a sales team to identify training gaps
- **Custom coaching playbooks** — Let sales managers define custom trigger signals and coaching responses
- **Mobile companion** — Lightweight mobile app for in-person meetings using Bluetooth earpiece

## Built With

- electron
- gemini-live-api
- gemini-live-2.5-flash-native-audio
- vertex-ai
- google-genai-sdk
- google-cloud
- fastapi
- python
- websocket
- javascript

## Try it out

- **GitHub:** https://github.com/tarun753/edge-ai
