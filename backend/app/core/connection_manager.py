from typing import Dict, List, Optional, Set

from fastapi import WebSocket


class ConnectionManager:
    """Manage active WebSocket connections.

    Phase 2 では、ユーザー単位で複数接続を管理できるように拡張する。
    """

    def __init__(self) -> None:
        # 全ての接続（デバッグや一括操作向けのフラットなリスト）
        self.active_connections: List[WebSocket] = []

        # ユーザーごとの接続一覧: user_key -> set(WebSocket)
        self.user_connections: Dict[str, Set[WebSocket]] = {}

        # WebSocket から user_key を逆引きするマップ（切断時に利用）
        self.socket_to_user: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, user_key: Optional[str] = None) -> None:
        """Accept a new WebSocket connection and register it.

        user_key はユーザーを一意に識別する値（例: email）。
        認証していない接続では None も許容しておき、将来の拡張に備える。
        """

        await websocket.accept()
        self.active_connections.append(websocket)

        if user_key is not None:
            if user_key not in self.user_connections:
                self.user_connections[user_key] = set()
            self.user_connections[user_key].add(websocket)
            self.socket_to_user[websocket] = user_key

        client = websocket.client
        print(
            f"WebSocket connected: {client.host}:{client.port if client else 'unknown'} user={user_key or '-'}"
        )

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection from all tracking structures."""

        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

        # ユーザーごとのマップからも削除
        user_key = self.socket_to_user.pop(websocket, None)
        if user_key is not None:
            connections = self.user_connections.get(user_key)
            if connections and websocket in connections:
                connections.remove(websocket)
                if not connections:
                    # そのユーザーの接続が空になったらエントリごと削除
                    self.user_connections.pop(user_key, None)

        client = websocket.client
        print(
            f"WebSocket disconnected: {client.host}:{client.port if client else 'unknown'} user={user_key or '-'}"
        )

    async def send_personal_message(self, message: str, websocket: WebSocket) -> None:
        await websocket.send_text(message)

    async def broadcast(self, message: str) -> None:
        """Send a message to all active connections."""

        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                # 送信失敗した接続は切断済みとみなし、管理対象から外す
                self.disconnect(connection)

    async def broadcast_to_user(self, user_key: str, message: str) -> None:
        """Send a message to all connections of a specific user."""

        connections = self.user_connections.get(user_key)
        if not connections:
            return

        for connection in list(connections):
            try:
                await connection.send_text(message)
            except Exception:
                # 送信失敗した接続は切断済みとみなし、管理対象から外す
                self.disconnect(connection)


# アプリ全体で共有する ConnectionManager インスタンス
# WebSocket エンドポイントや通常の HTTP エンドポイント（Todo CRUD など）から
# 共通の接続プールに対してメッセージを送信できるようにするためのシングルトン。
connection_manager = ConnectionManager()

