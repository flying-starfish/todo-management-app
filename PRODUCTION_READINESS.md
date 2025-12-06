# 本番化チェックリスト

学習目的でTodoアプリケーションを本番環境にデプロイするための包括的なガイドです。

## 📋 目次

1. [セキュリティ対策](#1-セキュリティ対策)
2. [データベース設定](#2-データベース設定)
3. [環境変数管理](#3-環境変数管理)
4. [本番ビルド設定](#4-本番ビルド設定)
5. [デプロイ方法](#5-デプロイ方法)
6. [監視・ログ](#6-監視ログ)
7. [パフォーマンス最適化](#7-パフォーマンス最適化)
8. [バックアップ戦略](#8-バックアップ戦略)

---

## 1. セキュリティ対策

### 🔴 必須事項

#### 1.1 HTTPS の強制化

**現状**: HTTP通信のみ
**必要な対応**:

```python
# backend/app/main.py に追加

from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

# 本番環境でのみHTTPS強制
if os.getenv("ENVIRONMENT") == "production":
    app.add_middleware(HTTPSRedirectMiddleware)
```

**デプロイ時の設定**:
- リバースプロキシ（Nginx）でSSL終端
- Let's Encrypt で無料SSL証明書取得
- または、クラウドプロバイダーのマネージド証明書を使用

#### 1.2 セキュリティヘッダーの追加

```python
# backend/app/main.py

from fastapi import Request

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # 本番環境のセキュリティヘッダー
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    
    # Content Security Policy
    csp = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self' data:; "
        "connect-src 'self'"
    )
    response.headers["Content-Security-Policy"] = csp
    
    return response
```

#### 1.3 CORS の本番設定

```python
# backend/app/main.py

from fastapi.middleware.cors import CORSMiddleware

# 現在の設定（開発用）
# origins = ["http://localhost:3000"]

# 本番用の設定
if os.getenv("ENVIRONMENT") == "production":
    origins = [
        os.getenv("FRONTEND_URL"),  # 例: https://yourdomain.com
    ]
else:
    origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

#### 1.4 レート制限の実装

**パッケージ追加**:
```bash
pip install slowapi
```

**実装**:
```python
# backend/app/main.py

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 認証エンドポイントに適用
# backend/app/endpoints/auth.py

@router.post("/login")
@limiter.limit("5/minute")  # ログインは1分間に5回まで
async def login(request: Request, ...):
    ...
```

#### 1.5 Secure Cookie の設定

```python
# backend/app/core/security.py

from fastapi import Response

def set_secure_cookie(response: Response, key: str, value: str, max_age: int = 3600):
    """本番環境でSecure/HttpOnly/SameSiteを設定したCookieをセット"""
    is_production = os.getenv("ENVIRONMENT") == "production"
    
    response.set_cookie(
        key=key,
        value=value,
        max_age=max_age,
        httponly=True,  # JavaScriptからアクセス不可
        secure=is_production,  # HTTPS必須（本番のみ）
        samesite="lax",  # CSRF対策
    )
```

#### 1.6 環境変数のバリデーション

```python
# backend/app/core/config.py (新規作成)

from pydantic import BaseModel, validator
import os

class Settings(BaseModel):
    # 必須の環境変数
    SECRET_KEY: str
    DATABASE_URL: str
    ENVIRONMENT: str = "development"
    
    # オプション
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    
    @validator("SECRET_KEY")
    def secret_key_must_be_strong(cls, v):
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v
    
    @validator("ENVIRONMENT")
    def environment_must_be_valid(cls, v):
        if v not in ["development", "staging", "production"]:
            raise ValueError("ENVIRONMENT must be development, staging, or production")
        return v
    
    class Config:
        env_file = ".env"

settings = Settings()
```

---

## 2. データベース設定

### 2.1 SQLiteから本番DBへの移行

**現状**: SQLite (開発用)
**本番推奨**: PostgreSQL または MySQL

#### PostgreSQL のセットアップ

**パッケージ追加**:
```bash
pip install psycopg2-binary
```

**接続設定**:
```python
# backend/app/core/database.py

import os

# 環境に応じてDB URLを切り替え
if os.getenv("ENVIRONMENT") == "production":
    SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
    # 例: postgresql://user:password@localhost:5432/todo_db
else:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./db/todos.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)
```

#### データベース接続プールの設定

```python
# backend/app/core/database.py

from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    poolclass=QueuePool,
    pool_size=5,          # 同時接続数
    max_overflow=10,      # プールが満杯時の追加接続数
    pool_timeout=30,      # 接続待機タイムアウト（秒）
    pool_recycle=3600,    # 接続の再利用時間（秒）
)
```

### 2.2 データベースマイグレーション

**Alembic のセットアップ**:
```bash
cd backend
pip install alembic
alembic init alembic
```

**設定**:
```python
# backend/alembic/env.py

from app.core.database import Base
from app.models import todo, user

target_metadata = Base.metadata
```

**マイグレーション作成・適用**:
```bash
# マイグレーションファイル作成
alembic revision --autogenerate -m "Initial migration"

# マイグレーション適用
alembic upgrade head
```

---

## 3. 環境変数管理

### 3.1 本番環境の環境変数

**`.env.production`** (本番用、Gitには含めない):
```bash
# 環境
ENVIRONMENT=production

# セキュリティ
SECRET_KEY=<64文字以上のランダム文字列>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# データベース
DATABASE_URL=postgresql://user:password@db-host:5432/todo_db

# CORS
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com

# Redis (レート制限、セッション管理)
REDIS_URL=redis://localhost:6379

# ログ
LOG_LEVEL=INFO
```

**強力なSECRET_KEYの生成**:
```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

### 3.2 環境変数のロード

```python
# backend/app/main.py

from dotenv import load_dotenv
import os

# 環境に応じて.envファイルを読み込み
env_file = f".env.{os.getenv('ENVIRONMENT', 'development')}"
load_dotenv(env_file)
```

---

## 4. 本番ビルド設定

### 4.1 バックエンドの本番設定

#### Uvicorn の本番起動

**開発時**:
```bash
uvicorn app.main:app --reload
```

**本番時**:
```bash
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --no-access-log \
  --log-level info
```

#### Gunicorn + Uvicorn (推奨)

```bash
pip install gunicorn
```

```bash
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile - \
  --log-level info
```

### 4.2 フロントエンドの本番ビルド

#### Vite 本番ビルド

```bash
cd frontend

# 本番ビルド
npm run build

# ビルド成果物は frontend/build/ に生成される
```

#### 環境変数の設定

**`.env.production`** (frontend):
```bash
VITE_API_URL=https://api.yourdomain.com
```

#### 静的ファイルの配信

**オプション1: Nginxで配信（推奨）**
**オプション2: FastAPIで配信**

```python
# backend/app/main.py

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# フロントエンドのビルドファイルを配信
if os.path.exists("../frontend/build"):
    app.mount("/static", StaticFiles(directory="../frontend/build/static"), name="static")
    
    @app.get("/")
    async def serve_frontend():
        return FileResponse("../frontend/build/index.html")
```

---

## 5. デプロイ方法

### 5.1 オプション1: VPS (DigitalOcean, AWS EC2等)

#### 必要なソフトウェア
```bash
# Ubuntu 22.04の場合

# PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Nginx
sudo apt install nginx

# Python 3.11
sudo apt install python3.11 python3.11-venv python3-pip

# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# Redis
sudo apt install redis-server
```

#### アプリケーションのデプロイ

```bash
# リポジトリをクローン
cd /var/www
sudo git clone https://github.com/yourusername/todo-management-app.git
cd todo-management-app

# バックエンドのセットアップ
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn psycopg2-binary alembic

# 環境変数設定
sudo nano .env.production

# データベースマイグレーション
alembic upgrade head

# フロントエンドのビルド
cd ../frontend
npm install
npm run build
```

#### Systemd サービス作成

**`/etc/systemd/system/todo-backend.service`**:
```ini
[Unit]
Description=Todo App Backend
After=network.target postgresql.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/todo-management-app/backend
Environment="ENVIRONMENT=production"
ExecStart=/var/www/todo-management-app/backend/venv/bin/gunicorn \
  app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable todo-backend
sudo systemctl start todo-backend
sudo systemctl status todo-backend
```

#### Nginx 設定

**`/etc/nginx/sites-available/todo-app`**:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # HTTPSへリダイレクト
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL証明書 (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # セキュリティヘッダー
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # フロントエンド (静的ファイル)
    location / {
        root /var/www/todo-management-app/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # バックエンド API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/todo-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Let's Encrypt SSL証明書

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 5.2 オプション2: Docker + Docker Compose (推奨)

#### 本番用 Docker Compose

**`docker-compose.prod.yml`**:
```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: todouser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: todo_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  redis:
    image: redis:7-alpine
    restart: always

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      ENVIRONMENT: production
      DATABASE_URL: postgresql://todouser:${DB_PASSWORD}@db:5432/todo_db
      REDIS_URL: redis://redis:6379
      SECRET_KEY: ${SECRET_KEY}
    depends_on:
      - db
      - redis
    restart: always

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    environment:
      VITE_API_URL: https://api.yourdomain.com
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - frontend_build:/usr/share/nginx/html
    depends_on:
      - backend
      - frontend
    restart: always

volumes:
  postgres_data:
  frontend_build:
```

#### 本番用 Dockerfile (Backend)

**`backend/Dockerfile.prod`**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 依存関係のインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn psycopg2-binary

# アプリケーションコード
COPY . .

# 本番環境で実行
CMD ["gunicorn", "app.main:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000"]
```

#### 本番用 Dockerfile (Frontend)

**`frontend/Dockerfile.prod`**:
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 5.3 オプション3: クラウドPaaS

#### Heroku
```bash
# Heroku CLI インストール後
heroku login
heroku create todo-app-yourname

# PostgreSQLアドオン
heroku addons:create heroku-postgresql:mini

# 環境変数設定
heroku config:set SECRET_KEY=your-secret-key
heroku config:set ENVIRONMENT=production

# デプロイ
git push heroku main
```

#### Railway / Render / Fly.io
これらのPaaSは似たようなワークフローで簡単にデプロイできます。

---

## 6. 監視・ログ

### 6.1 アプリケーションログ

**構造化ログの実装**:
```python
# backend/app/core/logging_config.py

import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
        }
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)

def setup_logging():
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    
    logger = logging.getLogger("app")
    logger.setLevel(logging.INFO)
    logger.addHandler(handler)
    
    return logger

logger = setup_logging()
```

### 6.2 ヘルスチェックエンドポイント

```python
# backend/app/main.py

@app.get("/health")
async def health_check():
    """ヘルスチェックエンドポイント"""
    try:
        # データベース接続確認
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
```

### 6.3 アクセスログとエラーログ

**Gunicorn の設定**:
```bash
gunicorn app.main:app \
  --access-logfile /var/log/todo-app/access.log \
  --error-logfile /var/log/todo-app/error.log \
  --log-level info
```

### 6.4 監視ツール

**推奨オプション**:
- **Sentry**: エラー追跡
- **Prometheus + Grafana**: メトリクス監視
- **Uptime Robot**: 稼働監視（無料）
- **Datadog / New Relic**: 総合的なAPM（有料）

**Sentry のセットアップ**:
```bash
pip install sentry-sdk
```

```python
# backend/app/main.py

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

if os.getenv("ENVIRONMENT") == "production":
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        integrations=[FastApiIntegration()],
        traces_sample_rate=1.0,
    )
```

---

## 7. パフォーマンス最適化

### 7.1 バックエンド最適化

#### データベースクエリの最適化

```python
# N+1問題の回避（joinedloadを使用）
from sqlalchemy.orm import joinedload

todos = db.query(Todo).options(joinedload(Todo.user)).all()
```

#### レスポンスキャッシュ

```bash
pip install fastapi-cache2[redis]
```

```python
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache

@app.on_event("startup")
async def startup():
    redis = aioredis.from_url("redis://localhost")
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")

@app.get("/todos")
@cache(expire=60)  # 60秒間キャッシュ
async def get_todos():
    ...
```

### 7.2 フロントエンド最適化

#### コード分割

Viteはデフォルトで最適化されていますが、さらに調整可能：

```typescript
// frontend/src/App.tsx
import { lazy, Suspense } from 'react';

const TodoList = lazy(() => import('./components/Todo/TodoList'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TodoList />
    </Suspense>
  );
}
```

#### 画像・アセット最適化

```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 本番ではconsole.logを削除
      },
    },
  },
});
```

#### CDN の活用

静的ファイルをCDN経由で配信（Cloudflare, AWS CloudFront等）

---

## 8. バックアップ戦略

### 8.1 データベースバックアップ

**自動バックアップスクリプト**:
```bash
#!/bin/bash
# /usr/local/bin/backup-db.sh

BACKUP_DIR="/var/backups/todo-app"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/todo_db_$DATE.sql.gz"

# PostgreSQLバックアップ
pg_dump -U todouser todo_db | gzip > $BACKUP_FILE

# 7日以上古いバックアップを削除
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

# S3にアップロード（オプション）
# aws s3 cp $BACKUP_FILE s3://your-bucket/backups/
```

**Cronで定期実行**:
```bash
# 毎日午前3時にバックアップ
0 3 * * * /usr/local/bin/backup-db.sh
```

### 8.2 アプリケーションコードのバックアップ

Git + GitHub/GitLabで自動的にバックアップ済み

---

## 9. 実施チェックリスト

### Phase 1: セキュリティ基盤 (必須)
- [ ] HTTPS設定（SSL証明書取得）
- [ ] セキュリティヘッダーの追加
- [ ] CORS本番設定
- [ ] 強力なSECRET_KEY生成
- [ ] 環境変数のバリデーション
- [ ] レート制限の実装

### Phase 2: データベース
- [ ] PostgreSQL/MySQLのセットアップ
- [ ] データベース接続プールの設定
- [ ] Alembicマイグレーションのセットアップ
- [ ] バックアップスクリプトの作成

### Phase 3: デプロイ設定
- [ ] 本番用Dockerfileの作成
- [ ] docker-compose.prod.ymlの作成
- [ ] Nginx設定
- [ ] Systemdサービスの作成（VPS使用時）
- [ ] 本番ビルドの実行とテスト

### Phase 4: 監視・ログ
- [ ] 構造化ログの実装
- [ ] ヘルスチェックエンドポイント
- [ ] Sentry等のエラー追跡ツール導入
- [ ] アクセスログの保存設定

### Phase 5: 最適化
- [ ] データベースクエリの最適化
- [ ] レスポンスキャッシュの実装
- [ ] フロントエンドのコード分割
- [ ] CDN設定（オプション）

### Phase 6: 運用準備
- [ ] 自動バックアップの設定
- [ ] 監視アラートの設定
- [ ] デプロイ手順書の作成
- [ ] ロールバック手順の確認

---

## 10. 学習用の簡易デプロイ

学習目的で素早くデプロイしたい場合の推奨方法：

### 推奨: Railway（無料枠あり、簡単）

1. **Railway にサインアップ**: https://railway.app/
2. **GitHubリポジトリを連携**
3. **PostgreSQL アドオンを追加**
4. **環境変数を設定**:
   - `SECRET_KEY`
   - `ENVIRONMENT=production`
   - `DATABASE_URL` (自動設定される)
5. **デプロイ実行**（自動）

### 推奨: Render（無料枠あり）

1. **Render にサインアップ**: https://render.com/
2. **New Web Service** でリポジトリを選択
3. **バックエンド設定**:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000`
4. **フロントエンド設定**:
   - Build Command: `npm install && npm run build`
   - Publish Directory: `build`
5. **PostgreSQL データベースを追加**

---

## 11. トラブルシューティング

### よくある問題

**問題1: CORS エラー**
- 解決: `FRONTEND_URL`環境変数を正しく設定

**問題2: データベース接続エラー**
- 解決: `DATABASE_URL`の形式を確認（PostgreSQL: `postgresql://user:password@host:port/dbname`）

**問題3: 静的ファイルが404**
- 解決: Nginxの`root`パスが正しいか確認

**問題4: Let's Encrypt証明書取得失敗**
- 解決: ドメインのDNSレコードが正しく設定されているか確認（Aレコード）

---

## 12. 参考リソース

- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Nginx Security](https://www.nginx.com/blog/mitigating-ddos-attacks-with-nginx-and-nginx-plus/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

---

## 📞 次のステップ

学習目的での実施順序：

1. **ローカルで本番ビルドをテスト** (1-2時間)
   - Docker Composeで本番環境をシミュレート
   
2. **Railway/Renderで簡易デプロイ** (1-2時間)
   - 無料で素早く本番環境を体験
   
3. **VPSで本格的なデプロイ** (4-8時間)
   - より実践的な環境構築を学習

どの方法から始めるか教えていただければ、詳細な手順を提供します！
