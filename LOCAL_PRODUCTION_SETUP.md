# ローカル本番環境シミュレート - 学習ガイド

本ドキュメントは、学習目的でローカル環境に本番環境を構築・体験するための実践的なガイドです。

## 🎯 このガイドの目的

- 本番環境と開発環境の違いを理解する
- Docker Composeを使った本番環境のシミュレート
- PostgreSQL、Redis、Nginx等の本番技術スタックの体験
- 実際のデプロイ前に安全に学習できる環境の構築

## 📋 前提条件

- Docker Desktop または Colima がインストール済み
- Node.js 18+ がインストール済み
- Python 3.11+ がインストール済み
- 基本的なターミナル操作の知識

## 🏗️ 本番環境の構成

今回構築する環境は以下の構成です：

```
┌─────────────────────────────────────────────┐
│  ブラウザ (http://localhost)                 │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
        ┌─────────────────┐
        │  Nginx :80      │  ← リバースプロキシ
        │  ・静的ファイル配信│
        │  ・APIプロキシ    │
        └────┬────────┬────┘
             │        │
    静的ファイル    API
             │        │
             ▼        ▼
   ┌────────────┐  ┌────────────────┐
   │ Frontend   │  │ Backend        │
   │ (ビルド済み)│  │ Gunicorn + Uvicorn│
   │ build/     │  │ 4 workers      │
   └────────────┘  └─────┬──────────┘
                         │
                    ┌────┴────┐
                    │         │
                    ▼         ▼
            ┌──────────┐ ┌───────┐
            │PostgreSQL│ │ Redis │
            │  :5432   │ │ :6379 │
            └──────────┘ └───────┘
```

## 🚀 Step 1: 環境変数ファイルの作成

### 1.1 強力なSECRET_KEYの生成

まず、本番用の強力な暗号化キーを生成します。

```bash
# ターミナルで実行
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

出力例：
```
VwPAuCpwlYKxvASkd8zGOHcU6NEiSpfJP-2kWCbVMrDWJsrpTjp0tIK5gk2gs_fTLfuMFfLX4sejb_YTg6gLbA
```

**💡 学習ポイント**：
- 本番環境では最低32文字、推奨64文字以上のランダムキーを使用
- このキーでJWTトークンを暗号化するため、漏洩すると全ユーザーのセッションが危険
- 開発環境と本番環境で必ず異なるキーを使用

### 1.2 バックエンド環境変数の作成

**`backend/.env`** (開発環境用):
```bash
# 開発環境用の環境変数
ENVIRONMENT=development

# セキュリティ
SECRET_KEY=dev-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# データベース（開発用はSQLite）
DATABASE_URL=sqlite:///./db/todos.db

# CORS（開発用）
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000

# ログレベル
LOG_LEVEL=DEBUG
```

**`backend/.env.production`** (本番シミュレート用):
```bash
# 本番環境用の環境変数（ローカルシミュレート用）
ENVIRONMENT=production

# セキュリティ（本番用の強力なキー）
SECRET_KEY=<生成した64文字のキーをここに貼り付け>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# データベース（PostgreSQL）
DATABASE_URL=postgresql://todouser:todopass123@db:5432/todo_db

# CORS（本番用 - Nginx経由でアクセス）
FRONTEND_URL=http://localhost
BACKEND_URL=http://localhost

# Redis（レート制限、キャッシュ用）
REDIS_URL=redis://redis:6379

# ログレベル
LOG_LEVEL=INFO
```

**💡 学習ポイント**：
- `ENVIRONMENT`で環境を明示的に区別
- 本番環境のトークン有効期限を短く設定（30分→15分）
- ログレベルを`DEBUG`→`INFO`に変更（パフォーマンス向上）

### 1.3 フロントエンド環境変数の作成

**`frontend/.env`** (開発環境用 - 既存):
```bash
# Vite環境変数設定ファイル（開発環境用）
VITE_API_URL=http://localhost:8000
```

**`frontend/.env.production`** (本番シミュレート用):
```bash
# 本番環境用の環境変数（ローカルシミュレート用）
# Nginx経由でアクセス（バックエンドのルートに/apiが既に含まれているため、ベースURLのみ）
VITE_API_URL=http://localhost
```

**💡 学習ポイント**：
- Viteの環境変数は`VITE_`プレフィックスが必須
- 本番ではNginx経由でアクセスするためポート番号なし
- ビルド時に環境変数が埋め込まれる（動的変更不可）

## 📦 Step 2: 本番用Dockerfileの作成

### 2.1 バックエンド用Dockerfile

**`backend/Dockerfile.prod`** を作成:

```dockerfile
# 本番環境用Dockerfile
FROM python:3.11-slim

# 作業ディレクトリを設定
WORKDIR /app

# システムパッケージの更新と必要なパッケージのインストール
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# 依存関係ファイルをコピー
COPY requirements.txt .

# 依存関係をインストール（キャッシュを使用しない、本番用パッケージ追加）
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn psycopg2-binary

# アプリケーションコードをコピー
COPY . .

# 非rootユーザーを作成して実行
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# ポート8000を公開
EXPOSE 8000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Gunicorn + Uvicornで本番起動
CMD ["gunicorn", "app.main:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info"]
```

**💡 学習ポイント**：
- **Gunicorn**: プロダクショングレードのWSGIサーバー
- **4 workers**: CPUコア数に応じて調整（通常は`(2 x CPU) + 1`）
- **非rootユーザー**: セキュリティのベストプラクティス
- **ヘルスチェック**: コンテナの正常性を自動監視

**開発環境との違い**:
| 項目 | 開発環境 | 本番環境 |
|------|---------|---------|
| サーバー | Uvicorn --reload | Gunicorn + Uvicorn |
| ワーカー数 | 1 | 4 |
| オートリロード | ✅ あり | ❌ なし |
| ユーザー | root | appuser（非root） |

### 2.2 フロントエンド用Dockerfile

**`frontend/Dockerfile.prod`** を作成:

```dockerfile
# マルチステージビルド: ビルドステージ
FROM node:18-alpine AS builder

WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール（本番用のみ）
RUN npm ci --only=production --ignore-scripts

# 開発用依存関係も一時的にインストール（ビルドに必要）
RUN npm install

# アプリケーションコードをコピー
COPY . .

# 環境変数を設定してビルド
ARG VITE_API_URL=http://localhost/api
ENV VITE_API_URL=${VITE_API_URL}

# 本番ビルドを実行
RUN npm run build

# 本番ステージ: Nginxで静的ファイルを配信
FROM nginx:alpine

# ビルド成果物をNginxのドキュメントルートにコピー
COPY --from=builder /app/build /usr/share/nginx/html

# ポート80を公開
EXPOSE 80

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Nginxをフォアグラウンドで起動
CMD ["nginx", "-g", "daemon off;"]
```

**💡 学習ポイント**：
- **マルチステージビルド**: 最終イメージを小さく保つテクニック
- **ビルドステージ**: Node.js環境でビルド（約1GB）
- **実行ステージ**: Nginx Alpineで配信（約50MB）
- 最終イメージにNode.jsが含まれないため軽量・安全

**イメージサイズ比較**:
- 開発環境（node:18）: 約1.1GB
- 本番環境（nginx:alpine）: 約50MB
- **削減率**: 約95%！

## 🐳 Step 3: Docker Compose本番用設定

### 3.1 Nginx設定ファイルの作成

まず、Nginxの設定ディレクトリとファイルを作成します。

```bash
# プロジェクトルートで実行
mkdir -p nginx
```

**`nginx/nginx.conf`** を作成:

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # ログ設定
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # パフォーマンス設定
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip圧縮
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript 
               application/xml+rss application/rss+xml 
               font/truetype font/opentype 
               application/vnd.ms-fontobject image/svg+xml;

    # アップストリーム定義（バックエンド）
    upstream backend {
        server backend:8000;
    }

    server {
        listen 80;
        server_name localhost;

        # セキュリティヘッダー
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # クライアントボディの最大サイズ
        client_max_body_size 10M;

        # API エンドポイント（バックエンドへプロキシ）
        location /api {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # タイムアウト設定
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # ヘルスチェックエンドポイント
        location /health {
            proxy_pass http://backend/health;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            access_log off;
        }

        # フロントエンド（静的ファイル）
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
            
            # キャッシュ設定（静的ファイル）
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
            
            # HTMLファイルはキャッシュしない
            location ~* \.html$ {
                expires -1;
                add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
            }
        }

        # エラーページ
        error_page 404 /index.html;
        error_page 500 502 503 504 /50x.html;
        location = /50x.html {
            root /usr/share/nginx/html;
        }
    }
}
```

**💡 学習ポイント**：
- **リバースプロキシ**: `/api` → バックエンド、`/` → フロントエンド
- **Gzip圧縮**: 転送データ量を60-80%削減
- **キャッシュ戦略**: 静的ファイルは1年、HTMLは常に最新
- **セキュリティヘッダー**: XSS、クリックジャッキング対策

### 3.2 Docker Compose設定

**`docker-compose.prod.yml`** を作成:

```yaml
version: '3.8'

services:
  # PostgreSQL データベース
  db:
    image: postgres:15-alpine
    container_name: todo-db-prod
    environment:
      POSTGRES_USER: todouser
      POSTGRES_PASSWORD: todopass123
      POSTGRES_DB: todo_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - todo-network-prod
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U todouser -d todo_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis (キャッシュ、セッション管理用)
  redis:
    image: redis:7-alpine
    container_name: todo-redis-prod
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - todo-network-prod
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # バックエンド (FastAPI)
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    container_name: todo-backend-prod
    env_file:
      - ./backend/.env.production
    environment:
      - DATABASE_URL=postgresql://todouser:todopass123@db:5432/todo_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - todo-network-prod
    restart: unless-stopped

  # Nginx (リバースプロキシ + 静的ファイル配信)
  nginx:
    image: nginx:alpine
    container_name: todo-nginx-prod
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./frontend/build:/usr/share/nginx/html:ro
    depends_on:
      - backend
    networks:
      - todo-network-prod
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  todo-network-prod:
    driver: bridge

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
```

**💡 学習ポイント**：
- **ヘルスチェック**: 依存関係の正しい起動順序を保証
- **永続化ボリューム**: データベースデータを保持
- **restart: unless-stopped**: コンテナが異常終了時に自動再起動
- **ネットワーク分離**: 本番環境用のネットワークを作成

## 🔧 Step 4: データベース設定の修正

PostgreSQLに対応するため、データベース接続設定を修正します。

**`backend/app/core/database.py`** を編集:

```python
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 環境変数からDATABASE_URLを取得、デフォルトはローカル用
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./db/todos.db")

# SQLiteの場合のみcheck_same_threadを設定
connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    # すべてのモデルをインポート（テーブル作成に必要）
    from app.models.todo import Todo  # noqa: F401
    from app.models.user import User  # noqa: F401

    Base.metadata.create_all(bind=engine)
```

**💡 学習ポイント**：
- `check_same_thread`はSQLite専用の設定
- PostgreSQLでは不要（むしろエラーになる）
- 環境変数で接続先を動的に切り替え

## 🚀 Step 5: ビルドと起動

### 5.1 フロントエンドのビルド

本番用の最適化されたビルドを作成します。

```bash
# プロジェクトルートで実行
cd frontend
npm run build
```

**期待される出力**:
```
vite v5.4.21 building for production...
✓ 114 modules transformed.
build/index.html                   0.76 kB │ gzip:   0.41 kB
build/assets/index-hSsnMUqn.css   27.21 kB │ gzip:   5.77 kB
build/assets/index-BfHHt778.js   362.27 kB │ gzip: 118.25 kB
✓ built in 981ms
```

**💡 学習ポイント**：
- Viteは自動的にコード分割、ミニファイ、Tree Shakingを実行
- Gzip圧縮後のサイズが表示される（実際の転送サイズ）
- `build/`ディレクトリに最適化されたファイルが生成される

### 5.2 Dockerの起動確認

```bash
# Dockerデーモンの確認
docker ps

# Colimaを使用している場合
colima status
```

### 5.3 開発環境の停止

既存の開発環境が起動している場合は停止します。

```bash
# プロジェクトルートで実行
docker-compose down
```

### 5.4 本番環境の起動

```bash
# プロジェクトルートで実行
docker-compose -f docker-compose.prod.yml up -d --build
```

**💡 学習ポイント**：
- `-f docker-compose.prod.yml`: 本番用設定ファイルを指定
- `-d`: デタッチモード（バックグラウンド実行）
- `--build`: イメージを再ビルド

**期待される出力**:
```
[+] Building 21.6s
[+] Running 5/5
 ✔ Network todo-network-prod     Created
 ✔ Container todo-db-prod        Healthy
 ✔ Container todo-redis-prod     Healthy
 ✔ Container todo-backend-prod   Started
 ✔ Container todo-nginx-prod     Started
```

### 5.5 コンテナの状態確認

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**期待される出力**:
```
NAMES               STATUS                             PORTS
todo-nginx-prod     Up 2 minutes (healthy)             0.0.0.0:80->80/tcp
todo-backend-prod   Up 2 minutes (healthy)             8000/tcp
todo-redis-prod     Up 2 minutes (healthy)             6379/tcp
todo-db-prod        Up 2 minutes (healthy)             5432/tcp
```

## 🧪 Step 6: 動作確認

### 6.1 ブラウザでアクセス

ブラウザで以下のURLを開きます：

```
http://localhost
```

フロントエンドが表示されるはずです。

### 6.2 ユーザー登録とログイン

1. **ユーザー登録**
   - メールアドレス、パスワードを入力
   - 「登録」ボタンをクリック

2. **ログイン**
   - 登録したメールアドレスとパスワードでログイン

3. **Todo作成**
   - Todoを追加してみる

### 6.3 データベースの確認

PostgreSQLに正しくデータが保存されているか確認します。

```bash
# ユーザーテーブルの確認
docker exec todo-db-prod psql -U todouser -d todo_db -c \
  "SELECT id, email, is_active, created_at FROM users ORDER BY created_at DESC;"

# Todoテーブルの確認
docker exec todo-db-prod psql -U todouser -d todo_db -c \
  "SELECT id, title, completed, position FROM todos ORDER BY position LIMIT 5;"
```

**期待される出力**:
```
 id |            email            | is_active |         created_at         
----+-----------------------------+-----------+----------------------------
  1 | your-email@example.com      | t         | 2025-12-06 17:41:27.574276
```

**💡 学習ポイント**：
- データはPostgreSQLのボリュームに永続化される
- コンテナを再起動してもデータは残る
- SQLiteと違い、複数接続を同時に処理できる

### 6.4 ログの確認

各サービスのログを確認します。

```bash
# バックエンドのログ
docker logs todo-backend-prod --tail 20

# Nginxのログ
docker logs todo-nginx-prod --tail 20

# PostgreSQLのログ
docker logs todo-db-prod --tail 20
```

## 🐛 Step 7: トラブルシューティング

### 問題1: ユーザー登録時に "NotFound" エラー

**症状**: ユーザー登録ボタンをクリックすると「NotFound」トーストが表示される

**原因**: フロントエンドの`VITE_API_URL`が誤っている

**解決方法**:

1. `frontend/.env.production`を確認：
```bash
# ❌ 間違い
VITE_API_URL=http://localhost/api

# ✅ 正しい
VITE_API_URL=http://localhost
```

2. フロントエンドを再ビルド：
```bash
cd frontend
npm run build
cd ..
```

3. Nginxを再起動：
```bash
docker-compose -f docker-compose.prod.yml restart nginx
```

**💡 学習ポイント**：
- バックエンドのルートが`/api/auth/register`
- フロントエンドが`/api`を追加するため、ベースURLは`/`のみ
- Viteの環境変数はビルド時に埋め込まれる（再ビルド必須）

### 問題2: データベース接続エラー

**症状**: バックエンドのログに "connection refused" エラー

**原因**: データベースが起動する前にバックエンドが起動した

**解決方法**:

```bash
# コンテナを再起動
docker-compose -f docker-compose.prod.yml restart backend
```

**💡 学習ポイント**：
- `depends_on`でヘルスチェックを設定しているが、初回起動時は順序が乱れることがある
- 本番環境では再試行ロジックを実装すべき

### 問題3: Nginxが unhealthy

**症状**: `docker ps`でNginxが "unhealthy" 表示

**原因**: フロントエンドのビルドファイルが見つからない

**解決方法**:

```bash
# フロントエンドをビルド
cd frontend
npm run build
cd ..

# Nginxを再起動
docker-compose -f docker-compose.prod.yml restart nginx
```

## 📊 Step 8: 開発環境 vs 本番環境の比較

実際に両方の環境を体験して違いを理解しましょう。

### 8.1 環境の切り替え

**本番環境 → 開発環境**:
```bash
# 本番環境を停止
docker-compose -f docker-compose.prod.yml down

# 開発環境を起動
docker-compose up -d
```

**開発環境 → 本番環境**:
```bash
# 開発環境を停止
docker-compose down

# 本番環境を起動
docker-compose -f docker-compose.prod.yml up -d
```

### 8.2 パフォーマンス比較

| 項目 | 開発環境 | 本番環境 | 差分 |
|------|---------|---------|------|
| **初回ロード時間** | ~2秒 | ~0.5秒 | **4倍高速** |
| **APIレスポンス** | 50-100ms | 10-30ms | **3-5倍高速** |
| **メモリ使用量** | ~500MB | ~200MB | **60%削減** |
| **転送データ量** | ~1.5MB | ~400KB | **73%削減** |

**💡 学習ポイント**：
- 本番ビルドは最適化され、Gzip圧縮される
- Gunicornのワーカープールで並行処理
- Nginxの静的ファイルキャッシュが効く

### 8.3 機能比較

| 機能 | 開発環境 | 本番環境 |
|------|---------|---------|
| **ホットリロード** | ✅ あり | ❌ なし |
| **ソースマップ** | ✅ 完全 | ⚠️ 最小限 |
| **エラー詳細** | ✅ 詳細 | ⚠️ 簡潔 |
| **セキュリティヘッダー** | ⚠️ 一部 | ✅ 完全 |
| **Gzip圧縮** | ❌ なし | ✅ あり |
| **ヘルスチェック** | ❌ なし | ✅ あり |

## 🧹 Step 9: クリーンアップ

### 9.1 本番環境の停止

```bash
# コンテナを停止・削除
docker-compose -f docker-compose.prod.yml down

# ボリュームも削除する場合（データが消えます！）
docker-compose -f docker-compose.prod.yml down -v
```

### 9.2 開発環境に戻す

```bash
# 開発環境を起動
docker-compose up -d
```

### 9.3 ディスク容量の確認

```bash
# Dockerイメージのサイズ確認
docker images | grep todo

# 未使用イメージの削除
docker image prune -a
```

## 📚 学んだこと

### 技術面

1. **マルチステージビルド**: イメージサイズを95%削減
2. **リバースプロキシ**: Nginxで静的ファイルとAPIを統合
3. **データベース移行**: SQLite → PostgreSQL
4. **環境変数管理**: 開発/本番で設定を分離
5. **ヘルスチェック**: コンテナの正常性監視
6. **セキュリティ**: 強力なキー、短いトークン期限、非rootユーザー

### アーキテクチャ面

1. **関心の分離**: 各サービスが独立したコンテナ
2. **スケーラビリティ**: Gunicornのワーカー数で簡単にスケール
3. **可用性**: ヘルスチェックと自動再起動
4. **保守性**: Dockerで環境を完全に再現可能

### 運用面

1. **ログ管理**: 構造化ログで問題を追跡
2. **デプロイ**: ダウンタイムなしの更新戦略
3. **バックアップ**: データベースの定期バックアップ
4. **監視**: メトリクスとアラート

## 🎓 次のステップ

### 初級者向け

1. ✅ **本番環境の動作確認** - 今回完了！
2. 📝 **ログの分析** - どんなリクエストが来ているか確認
3. 🔍 **データベースの探索** - SQLクエリを試す
4. 🎨 **フロントエンドのカスタマイズ** - 見た目を変えてビルド

### 中級者向け

1. 🔐 **セキュリティ強化** - `SECURITY_ENHANCEMENTS.md`を実装
2. 📊 **監視ツール導入** - Prometheus + Grafana
3. 🚀 **パフォーマンス最適化** - レスポンスキャッシュ、CDN
4. 🧪 **負荷テスト** - Locustで限界を確認

### 上級者向け

1. ☁️ **実際のクラウドデプロイ** - Railway/Render/AWS
2. 🔄 **CI/CD改善** - 自動デプロイパイプライン
3. 🌍 **マルチリージョン展開** - 複数データセンター
4. 📈 **スケーリング戦略** - Kubernetes、ロードバランサー

## 🔗 関連ドキュメント

- [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) - 本番化の包括的ガイド
- [SECURITY_ENHANCEMENTS.md](./SECURITY_ENHANCEMENTS.md) - セキュリティ強化計画
- [CI_CD_IMPROVEMENTS.md](./CI_CD_IMPROVEMENTS.md) - CI/CD改善案
- [TESTING.md](./TESTING.md) - テスト戦略
- [DOCKER.md](./DOCKER.md) - Docker基礎

## 💡 よくある質問

### Q1: 本番環境とローカルシミュレートの違いは？

**A**: 今回構築したのは本番環境の「シミュレート」です。

| 項目 | ローカルシミュレート | 実際の本番環境 |
|------|-------------------|--------------|
| **HTTPS** | ❌ HTTP | ✅ HTTPS (Let's Encrypt) |
| **ドメイン** | localhost | yourdomain.com |
| **スケール** | 単一ホスト | 複数サーバー |
| **監視** | なし | Sentry, Grafana等 |
| **バックアップ** | 手動 | 自動（cron） |

### Q2: データは永続化されますか？

**A**: はい、Dockerボリュームに永続化されます。

```bash
# ボリュームの確認
docker volume ls | grep todo

# ボリュームの詳細
docker volume inspect todo-management-app_postgres_data
```

コンテナを削除してもボリュームは残ります。ボリュームを削除するには：
```bash
docker-compose -f docker-compose.prod.yml down -v
```

### Q3: 本番環境は開発環境より本当に速いですか？

**A**: はい、以下の理由で高速です：

1. **コード最適化**: ミニファイ、Tree Shaking
2. **Gzip圧縮**: 転送データ量60-80%削減
3. **ワーカープール**: Gunicornが並行処理
4. **キャッシュ**: Nginxが静的ファイルをキャッシュ

実際に計測してみてください：
```bash
# ページロード時間を計測
curl -w "@curl-format.txt" -o /dev/null -s http://localhost
```

### Q4: 本番環境のコンテナが再起動し続ける場合は？

**A**: ログを確認して原因を特定します。

```bash
# ログの確認
docker logs todo-backend-prod --tail 50

# 最も一般的な原因：
# 1. データベース接続エラー → DATABASE_URLを確認
# 2. 環境変数の誤り → .env.productionを確認
# 3. ポートの競合 → 他のサービスが80番を使用していないか確認
```

### Q5: 本番環境を更新するには？

**A**: コードを変更した後、以下の手順で更新します。

```bash
# 1. フロントエンドの再ビルド（フロントエンド変更時）
cd frontend && npm run build && cd ..

# 2. コンテナの再ビルド・再起動
docker-compose -f docker-compose.prod.yml up -d --build

# 3. 特定のサービスのみ更新する場合
docker-compose -f docker-compose.prod.yml up -d --build backend
```

## 🎉 おめでとうございます！

本番環境のローカルシミュレートを完了しました！

あなたは以下のスキルを習得しました：
- ✅ Docker Composeでの本番環境構築
- ✅ マルチステージビルドの活用
- ✅ Nginxリバースプロキシの設定
- ✅ PostgreSQL + Redisの統合
- ✅ 環境変数による設定管理
- ✅ ヘルスチェックとログ管理

次は実際のクラウドへのデプロイに挑戦してみましょう！
