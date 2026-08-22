from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.connection_manager import connection_manager
from app.core.security import verify_token

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint with simple echo and JWT-based user identification.

    Phase 2 では、ここで特定ユーザーへのブロードキャストなどを行う土台になる。
    """

    # クエリ文字列から JWT トークンを取得（例: /ws?token=...）
    token = websocket.query_params.get("token")
    user_email = verify_token(token) if token else None

    if not token or not user_email:
        # トークンが無い、または検証に失敗した場合は接続を拒否
        await websocket.close(code=4401)
        return

    await connection_manager.connect(websocket, user_key=user_email)
    await connection_manager.send_personal_message("connected", websocket)

    try:
        while True:
            data = await websocket.receive_text()
            print(f"WebSocket message received from {user_email or '-'}: {data}")
            # Phase 1 相当のエコー動作は維持
            await connection_manager.send_personal_message(f"echo: {data}", websocket)
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
    except Exception as exc:
        connection_manager.disconnect(websocket)
        print(f"WebSocket error: {exc}")

