from typing import List

from fastapi import WebSocket


class ConnectionManager:
    """Manage active WebSocket connections."""

    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        client = websocket.client
        print(f"WebSocket connected: {client.host}:{client.port if client else 'unknown'}")

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        client = websocket.client
        print(f"WebSocket disconnected: {client.host}:{client.port if client else 'unknown'}")

    async def send_personal_message(self, message: str, websocket: WebSocket) -> None:
        await websocket.send_text(message)

    async def broadcast(self, message: str) -> None:
        for connection in list(self.active_connections):
            await connection.send_text(message)
