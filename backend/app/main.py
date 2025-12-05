# filepath: backend/app/main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.endpoints.auth import router as auth_router
from app.endpoints.todo import router as todo_router

app = FastAPI()

# Initialize the database
init_db()

app.include_router(todo_router, prefix="/api", tags=["todos"])
app.include_router(auth_router, prefix="/api/auth", tags=["authentication"])


# セキュリティヘッダーのミドルウェア
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)

    # XSS対策: ブラウザのMIMEタイプスニッフィングを防止
    response.headers["X-Content-Type-Options"] = "nosniff"

    # クリックジャッキング対策: iframe内での表示を禁止
    response.headers["X-Frame-Options"] = "DENY"

    # XSS対策: ブラウザの組み込みXSSフィルターを有効化
    response.headers["X-XSS-Protection"] = "1; mode=block"

    # HTTPS強制（本番環境用）: 将来のリクエストをHTTPSに制限
    response.headers["Strict-Transport-Security"] = settings.get_hsts_header()

    # リファラーポリシー: クロスオリジンリクエスト時の情報漏洩を防止
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # 機能ポリシー: 不要なブラウザ機能へのアクセスを制限
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

    # Content Security Policy: 環境に応じた設定を適用
    # 開発環境: ViteのHMR対応（unsafe-inline, unsafe-eval許可）
    # 本番環境: 厳格な設定（unsafe-inline, unsafe-eval禁止）
    response.headers["Content-Security-Policy"] = settings.get_csp_policy()

    return response


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """リクエストとレスポンスのログを記録するミドルウェア"""
    print(f"yeah!Request: {request.method} {request.url}")
    response = await call_next(request)
    print(f"Response: {response.status_code}")
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # ローカル開発環境
        "http://frontend:3000",  # Docker環境
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}
