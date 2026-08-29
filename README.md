# Todo Management App

FastAPI（バックエンド）と React + Vite（フロントエンド）で構成された、学習用の Todo 管理アプリです。

## このアプリで学べること

このリポジトリは「Todo アプリを作る」こと自体よりも、次の実践スキルを学ぶための教材として設計しています。

- API 設計: 認証付き CRUD、ページネーション、フィルタ、並び替え
- フロントエンド設計: 型安全な状態管理、API 連携、テストしやすい UI 分割
- セキュリティ: JWT 認証、パスワードハッシュ、CORS/CSP、依存関係監査
- 運用: Docker 開発環境、CI/CD、自動チェック、デプロイ前チェック

## 設計の考え方

### 1. 学習用でも「本番を意識した最小構成」を採用

- 開発では SQLite で素早く回す
- 本番想定では PostgreSQL を使う
- どちらも同じ API 実装で動くように保つ

この方針で、学習初期の負荷を下げながら、本番に近い考え方へ段階的に移行できます。

### 2. 品質チェックを開発フローに組み込む

- 手元では Make コマンドでまとめて確認
- CI で同等のチェックを自動実行

「後から品質を足す」のではなく、最初から品質を守る流れを体験できる構成です。

### 3. ドキュメントを実行手順と学習解説に分離

- README は全体像
- docs 配下は目的別の詳細

コマンド集だけで終わらず、なぜそうするかを追えるようにしています。

## ドキュメント入口

- 総合ナビゲーション: [DOCS.md](DOCS.md)
- バックエンド開発: [backend/DEVELOPMENT.md](backend/DEVELOPMENT.md)
- フロントエンド開発: [frontend/README.md](frontend/README.md)

## おすすめの読み順（学習目的）

1. この README で全体像をつかむ
2. [DOCS.md](DOCS.md) で目的別の導線を確認する
3. テスト観点を先に押さえる: [docs/testing.md](docs/testing.md)
4. 開発環境の思想を理解する: [docs/deployment/docker-development.md](docs/deployment/docker-development.md)
5. 本番観点を確認する: [docs/deployment/production-readiness.md](docs/deployment/production-readiness.md)

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

### なぜ分けるのか

- SQLite: セットアップ不要で学習サイクルが速い
- PostgreSQL: 本番運用で必要な整合性・運用機能を学べる

学習段階では SQLite で実装を固め、運用段階で PostgreSQL に寄せる流れを想定しています。

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
