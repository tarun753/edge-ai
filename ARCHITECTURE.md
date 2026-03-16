# EDGE — Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S BROWSER (Next.js)                  │
│                                                               │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐  │
│  │  Microphone │    │    Screen    │    │  Whisper UI    │  │
│  │  (WebRTC)   │    │  Capture     │    │  Overlay       │  │
│  │  16kHz PCM  │    │  JPEG 4s     │    │  (WebSocket)   │  │
│  └──────┬──────┘    └──────┬───────┘    └───────▲────────┘  │
└─────────│─────────────────│───────────────────│────────────┘
          │  WebSocket      │                   │
          └────────┬────────┘                   │
                   ▼                            │
┌──────────────────────────────────────────────────────────────┐
│              GOOGLE CLOUD RUN (FastAPI Backend)               │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   Session Manager                       │  │
│  │              (WebSocket Handler)                        │  │
│  └──────────┬────────────────────┬────────────────────────┘  │
│             │                    │                            │
│             ▼                    ▼                            │
│  ┌──────────────────┐  ┌───────────────────┐                 │
│  │  Listening Agent │  │   Context Agent   │                 │
│  │                  │  │                   │                 │
│  │  Gemini 2.0      │  │  Gemini 2.0 Flash │                 │
│  │  Flash Live API  │  │  Vision           │                 │
│  │  (audio stream)  │  │  (screen analysis)│                 │
│  └──────────┬───────┘  └─────────┬─────────┘                │
│             │                    │                            │
│             └──────────┬─────────┘                           │
│                        ▼                                      │
│             ┌─────────────────────┐                          │
│             │   Strategy Agent    │                          │
│             │   (Google GenAI SDK)│                          │
│             │                     │                          │
│             │  Detects:           │                          │
│             │  · Budget objection │                          │
│             │  · Buying signal    │                          │
│             │  · Competitor eval  │                          │
│             │  · Stall tactics    │                          │
│             │  · Decision makers  │                          │
│             └──────────┬──────────┘                          │
└────────────────────────│────────────────────────────────────┘
                         │ WebSocket
                         ▼
                  ⚡ WHISPER DELIVERED
                  < 1 second latency
```

## Data Flow

1. **Audio** → Browser captures microphone at 16kHz mono PCM
2. **Screen** → Browser takes JPEG screenshot every 4 seconds
3. **Stream** → Both sent to Cloud Run via WebSocket
4. **Listen** → Gemini Live API processes audio stream continuously
5. **See** → Gemini Vision analyzes screen for CRM data, notes, context
6. **Decide** → Strategy Agent synthesizes both → fires only at critical moments
7. **Whisper** → Sent back to browser via WebSocket in <1 second

## Google Cloud Services Used

| Service | Purpose |
|---|---|
| Google Cloud Run | Backend hosting (auto-scaling, serverless) |
| Gemini 2.0 Flash Live API | Real-time audio stream processing |
| Gemini 2.0 Flash Vision | Screen context analysis |
| Google Cloud Build | Docker image building + deployment |
| Google GenAI SDK | Agent orchestration framework |
