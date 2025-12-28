from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.connection_manager import ConnectionManager

router = APIRouter()
manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Simple echo WebSocket for Phase 1."""
    await manager.connect(websocket)
    await manager.send_personal_message("connected", websocket)
    try:
        while True:
            data = await websocket.receive_text()
            print(f"WebSocket message received: {data}")
            await manager.send_personal_message(f"echo: {data}", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as exc:
        manager.disconnect(websocket)
        print(f"WebSocket error: {exc}")
