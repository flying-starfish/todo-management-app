# Todo Management App

FastAPI（バックエンド）と React + Vite（フロントエンド）で構成された、学習用の Todo 管理アプリです。

## ドキュメント入口

- 総合ナビゲーション: [DOCS.md](DOCS.md)
- バックエンド開発: [backend/DEVELOPMENT.md](backend/DEVELOPMENT.md)
- フロントエンド開発: [frontend/README.md](frontend/README.md)

## クイックスタート

### 前提

- Python 3.11 以上
- Node.js 18 以上
- npm

### 1. リポジトリ取得

```bash
git clone https://github.com/flying-starfish/todo-management-app.git
cd todo-management-app
```

### 2. バックエンド準備

```bash
python -m venv venv
source venv/bin/activate
cd backend
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### 3. フロントエンド準備

```bash
cd frontend
npm install
```

## 開発サーバー起動

### バックエンド

```bash
source venv/bin/activate
cd backend
uvicorn app.main:app --reload
```

- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs

### フロントエンド（Vite）

```bash
cd frontend
npm run dev
```

- Web UI: http://localhost:3000

## よく使うコマンド

### バックエンド

```bash
cd backend
make format
make lint
make test-cov
make check-all
```

### フロントエンド

```bash
cd frontend
make format
make lint
make type-check
make test-cov
make check-all
```

## データベース

- 開発環境: SQLite（`backend/db/todos.db`）
- 本番想定: PostgreSQL

開発データを完全リセットする場合:

```bash
rm backend/db/todos.db
```

## テスト

- テストガイド: [docs/testing.md](docs/testing.md)
- 詳細（Pytest）: [backend/PYTEST_GUIDE.md](backend/PYTEST_GUIDE.md)

## Docker / デプロイ

- Docker 開発環境: [docs/deployment/docker-development.md](docs/deployment/docker-development.md)
- ローカル本番シミュレート: [docs/deployment/local-production-simulation.md](docs/deployment/local-production-simulation.md)
- Railway デプロイ: [docs/deployment/railway.md](docs/deployment/railway.md)

## ライセンス

MIT ライセンス
