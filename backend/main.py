import asyncio
import base64
import json
import os
from typing import Optional

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from agents.strategy_agent import StrategyAgent

load_dotenv()

app = FastAPI(title="EDGE - Real-Time Conversation Intelligence")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "model": "gemini-live-2.5-flash-native-audio"}


@app.websocket("/ws/session")
async def session_websocket(websocket: WebSocket):
    await websocket.accept()
    agent = StrategyAgent()

    try:
        print("Starting Gemini Live session...")
        await agent.start()
        print("Gemini Live session active!")

        audio_chunks = 0
        screen_frames = 0

        async def receive_from_client():
            nonlocal audio_chunks, screen_frames
            async for message in websocket.iter_text():
                data = json.loads(message)

                if data["type"] == "audio":
                    audio_bytes = base64.b64decode(data["payload"])
                    await agent.send_audio(audio_bytes)
                    audio_chunks += 1
                    if audio_chunks % 50 == 0:
                        print(f"  Audio: {audio_chunks} chunks streamed to Gemini")

                elif data["type"] == "screen":
                    await agent.update_screen_context(data["payload"])
                    screen_frames += 1
                    print(f"  Screen: frame #{screen_frames} sent to Gemini")

                elif data["type"] == "stop":
                    print(f"Session ended. Total: {audio_chunks} audio chunks, {screen_frames} screen frames")
                    break

        async def receive_from_agent():
            async for whisper in agent.whispers():
                if whisper.get("type") == "audio":
                    # Send audio whisper to frontend for earpiece playback
                    await websocket.send_json({
                        "type": "audio_whisper",
                        "audio": whisper["audio"],
                        "sample_rate": whisper.get("sample_rate", 24000),
                    })
                else:
                    # Legacy text whisper
                    await websocket.send_json({
                        "type": "whisper",
                        "text": whisper.get("text", ""),
                        "urgency": whisper.get("urgency", "normal"),
                        "category": whisper.get("category", "insight"),
                    })

        await asyncio.gather(
            receive_from_client(),
            receive_from_agent(),
        )

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Session error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
        await websocket.close()
    finally:
        await agent.stop()


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
