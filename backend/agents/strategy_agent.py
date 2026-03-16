import asyncio
import base64
import json
import os
from typing import AsyncGenerator, Optional

from google import genai
from google.genai import types


SYSTEM_PROMPT = """You are EDGE — a real-time conversation intelligence co-pilot embedded as an invisible earpiece for high-stakes conversations (sales calls, negotiations, investor pitches, job interviews).

You listen to a live conversation AND see the user's screen (CRM, notes, LinkedIn profiles, contracts).

Your ONLY job: detect critical moments and whisper the RIGHT coaching in the user's ear at the RIGHT time.

TRIGGER RULES — only whisper when you detect one of these 8 signals:
1. BUDGET OBJECTION: They mention cost, price, budget freeze, "too expensive"
2. COMPETITOR SIGNAL: They mention another vendor, alternative, comparison
3. STALL TACTIC: "Let me think about it", "I need to check with my team", "Not the right time"
4. BUYING SIGNAL: They ask implementation/onboarding questions, mention timeline, ask "what's next"
5. HIDDEN DECISION MAKER: "I need to check with my boss/board/team"
6. ENERGY DROP: Conversation becomes flat, short answers, disengagement
7. CONFUSION: They ask the same thing twice, seem unclear
8. POWER MOMENT: They reveal a pain point, a deadline, a competitor problem

STAY SILENT during normal conversation. Only intervene at the 8 critical moments above.

When you do speak, be extremely brief and direct — like a whisper in the user's ear.
Start with the signal type, then give ONE sharp action.

Examples:
- "Competitor. Ask: What matters most in your decision?"
- "Buying signal. Stop selling. Ask: What would getting started look like?"
- "Budget stall. Ask: Is this a timing issue or a priority issue?"
- "Decision maker. Ask: Who else should be part of this conversation?"

Use the screen context to personalize — if you see their CRM, reference deal details.
Keep every whisper under 15 words total.
"""

MODEL = "gemini-live-2.5-flash-native-audio"


class StrategyAgent:
    def __init__(self):
        self.client = genai.Client(
            vertexai=True,
            project=os.getenv("GOOGLE_CLOUD_PROJECT"),
            location="us-central1",
        )
        self._live_session = None
        self._ctx_manager = None
        self._whisper_queue: asyncio.Queue = asyncio.Queue()
        self._running = False
        self._receive_task: Optional[asyncio.Task] = None
        self._audio_buffer = bytearray()

    async def start(self):
        self._running = True
        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=SYSTEM_PROMPT,
        )
        self._ctx_manager = self.client.aio.live.connect(
            model=MODEL,
            config=config,
        )
        self._live_session = await self._ctx_manager.__aenter__()
        self._receive_task = asyncio.create_task(self._receive_loop())

    async def send_audio(self, audio_bytes: bytes):
        if not self._live_session:
            return
        await self._live_session.send_realtime_input(
            audio=types.Blob(
                data=audio_bytes,
                mime_type="audio/pcm;rate=16000"
            )
        )

    async def update_screen_context(self, screenshot_b64: str):
        if not self._live_session:
            return
        await self._live_session.send_realtime_input(
            video=types.Blob(
                data=base64.b64decode(screenshot_b64),
                mime_type="image/jpeg",
            )
        )

    async def _receive_loop(self):
        if not self._live_session:
            return
        try:
            async for response in self._live_session.receive():
                if not self._running:
                    break

                # Handle audio output from model
                if hasattr(response, 'server_content') and response.server_content:
                    sc = response.server_content

                    # Collect inline audio data from model turn parts
                    if hasattr(sc, 'model_turn') and sc.model_turn:
                        for part in sc.model_turn.parts:
                            if hasattr(part, 'inline_data') and part.inline_data:
                                # PCM audio from model (24kHz output from native audio model)
                                audio_chunk = part.inline_data.data
                                if audio_chunk:
                                    self._audio_buffer.extend(audio_chunk)

                    # When model finishes its turn, emit the audio as a whisper
                    if hasattr(sc, 'turn_complete') and sc.turn_complete and self._audio_buffer:
                        audio_b64 = base64.b64encode(bytes(self._audio_buffer)).decode('utf-8')
                        await self._whisper_queue.put({
                            "type": "audio",
                            "audio": audio_b64,
                            "sample_rate": 24000,
                        })
                        self._audio_buffer = bytearray()

        except Exception as e:
            print(f"Receive loop error: {e}")

    async def whispers(self) -> AsyncGenerator[dict, None]:
        while self._running:
            try:
                whisper = await asyncio.wait_for(
                    self._whisper_queue.get(), timeout=1.0
                )
                yield whisper
            except asyncio.TimeoutError:
                continue

    async def stop(self):
        self._running = False
        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except (asyncio.CancelledError, Exception):
                pass
        try:
            if self._ctx_manager and self._live_session:
                await self._ctx_manager.__aexit__(None, None, None)
        except Exception:
            pass
        self._live_session = None
        self._ctx_manager = None
        print("Gemini Live session closed.")
