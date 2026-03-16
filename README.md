# EDGE — Invisible AI Conversation Intelligence

> Your invisible AI co-pilot for conversations too important to lose.

EDGE is a real-time conversation intelligence agent that listens to your calls, watches your screen, and **whispers coaching directly into your ear** — completely invisible to screen recording and the other party. Built for the **Gemini Live Agent Challenge**.

## How It Works

```
Electron Desktop App
  ├── Microphone audio (PCM 16kHz) ──────┐
  ├── Screen capture (desktopCapturer) ───┤
  │                                       ▼
  │                           FastAPI Backend (WebSocket)
  │                                       │
  │                           Gemini Live 2.5 Flash
  │                           (Native Audio Model)
  │                           on Google Cloud Vertex AI
  │                                       │
  │                           Strategy Agent
  │                           (detects 8 critical signals)
  │                                       │
  ├── Audio whisper ← ────────────────────┘
  │   (PCM 24kHz, played in ear)
  │
  └── Invisible Overlay (setContentProtection=true)
      (floating HUD, hidden from screen share)
```

## What Makes EDGE Different

- **Invisible overlay** — `setContentProtection(true)` makes the coaching HUD invisible to screen recording, Zoom share, and screenshots. Only YOU see it.
- **Audio whispers** — Gemini's native audio model whispers coaching directly in your ear via the Live API. No text-to-speech conversion needed.
- **Screen awareness** — Captures your screen (CRM, LinkedIn, contracts) and feeds it to Gemini as video context for personalized advice.
- **Smart timing** — Only intervenes at 8 critical moments: budget objections, competitor mentions, stall tactics, buying signals, hidden decision makers, energy drops, confusion, and power moments. Stays silent otherwise.

## Tech Stack

- **Desktop**: Electron (invisible overlay + screen capture + mic)
- **Backend**: FastAPI, Python 3.12, WebSocket
- **AI**: Gemini Live 2.5 Flash Native Audio on **Vertex AI**
- **SDK**: Google GenAI SDK (`google-genai`)
- **Auth**: Google Cloud Application Default Credentials (ADC)

## Quick Start

### Prerequisites

- Node.js 18+, Python 3.11+
- Google Cloud project with Vertex AI enabled
- `gcloud auth application-default login`

### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Set your GCP project
echo "GOOGLE_CLOUD_PROJECT=your-project-id" > .env

python3 main.py
# → Backend running on ws://localhost:8080
```

### Electron App

```bash
cd electron
npm install
npx electron .
```

Click **Start Live Session** — EDGE connects to the backend, streams your mic + screen to Gemini, and whispers coaching in your ear.

## Gemini APIs Used

| API | Purpose |
|-----|---------|
| **Gemini Live API** (Vertex AI) | Real-time bidirectional audio streaming — mic input → audio coaching output |
| **Native Audio Model** (`gemini-live-2.5-flash-native-audio`) | Direct audio-to-audio generation without text intermediary |
| **Multimodal Input** | Simultaneous audio + video (screen capture) for context-aware coaching |
| **Google GenAI SDK** (`client.aio.live.connect()`) | Async Live session management with `send_realtime_input()` |

## The 8 Critical Signals

EDGE's Strategy Agent detects these moments and intervenes:

1. **Budget Objection** — "Too expensive", price concerns
2. **Competitor Signal** — Other vendors mentioned
3. **Stall Tactic** — "Let me think about it"
4. **Buying Signal** — Implementation questions, timeline asks
5. **Hidden Decision Maker** — "Need to check with my boss"
6. **Energy Drop** — Flat responses, disengagement
7. **Confusion** — Same question repeated
8. **Power Moment** — Pain point revealed, deadline mentioned

## Why This Wins

The $10B+ conversation intelligence market is stuck on **post-call analysis**. EDGE solves the problem that actually matters: **real-time coaching during the call that changes the outcome.**

Built specifically for the Gemini Live Agent Challenge — leveraging Gemini's unique native audio + live streaming + multimodal capabilities that no other model offers.

## License

MIT
