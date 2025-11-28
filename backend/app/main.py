# filepath: backend/app/main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

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
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    # リファラーポリシー: クロスオリジンリクエスト時の情報漏洩を防止
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # 機能ポリシー: 不要なブラウザ機能へのアクセスを制限
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    
    # Content Security Policy: XSS攻撃を防ぐための厳格なポリシー
    # 開発環境ではViteのHMRとReactの動作を考慮した設定
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "  # Vite HMRとReactには'unsafe-eval'が必要
        "style-src 'self' 'unsafe-inline'; "  # インラインスタイルを許可
        "img-src 'self' data: https:; "
        "font-src 'self' data:; "
        "connect-src 'self' ws: wss:; "  # WebSocket接続を許可（Vite HMR用）
        "frame-ancestors 'none'"  # X-Frame-Optionsと同等の保護
    )
    
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
