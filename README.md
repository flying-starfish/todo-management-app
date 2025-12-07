# Todo Management App

A full-stack todo management application built with FastAPI (backend) and React (frontend).

> Practice React, FastAPI etc.

## 📚 Documentation

**👉 [ドキュメント一覧・ナビゲーション (DOCS.md)](DOCS.md)** ← 迷ったらここから！

よく使うドキュメント：
- **[Backend Development Guide](backend/DEVELOPMENT.md)** - バックエンド開発の詳細ガイド（Lint、テスト、コード品質）
- **[Testing Guide](TESTING.md)** - テスト戦略とベストプラクティス
- **[Docker Guide](DOCKER.md)** - Docker環境での開発・デプロイ

## 🏗️ Project Structure

```
todo-management-app/
├── .github/
│   └── workflows/
│       └── ci.yml          # CI/CDパイプライン
├── backend/                # FastAPI backend
│   ├── app/               # Application code
│   ├── tests/             # テストコード
│   ├── requirements.txt   # 本番用依存関係
│   ├── requirements-dev.txt  # 開発用依存関係（Lint含む）
│   ├── pyproject.toml     # ツール設定（black, isort, mypy, pytest）
│   ├── .flake8           # flake8設定
│   ├── Makefile          # 便利コマンド集
│   ├── DEVELOPMENT.md    # 開発ガイド
│   └── db/               # SQLiteデータベース
├── frontend/              # React frontend
│   ├── src/              # React components
│   ├── public/           # Static assets
│   └── coverage/         # テストカバレッジレポート
└── venv/                 # Python仮想環境（Git管理外）
```

## 🚀 Getting Started

### Prerequisites

- Python 3.11 or higher
- Node.js 16 or higher
- npm or yarn

### 1. Clone the Repository

```bash
git clone https://github.com/flying-starfish/todo-management-app.git
cd todo-management-app
```

### 2. Set up Backend

```bash
# 仮想環境作成
python -m venv venv

# 仮想環境有効化
source venv/bin/activate  # On macOS/Linux
# venv\Scripts\activate   # On Windows

# 依存関係インストール
cd backend
pip install -r requirements.txt

# 開発用ツール（Lint、テストツール）もインストールする場合
pip install -r requirements-dev.txt
```

**データベース設定**:
- 開発環境ではSQLiteを使用します（`backend/db/todos.db`に自動作成）
- データベースファイルはGit管理外です
- 初回起動時に自動的にテーブルが作成されます

詳細は [Backend Development Guide](backend/DEVELOPMENT.md) を参照。

### 3. Set up Frontend

```bash
cd frontend
npm install
```

## 🏃‍♂️ Running the Application

### Start Backend Server

```bash
# Make sure you're in the project root and virtual environment is activated
source venv/bin/activate  # On macOS/Linux
cd backend
uvicorn app.main:app --reload
```

The backend will be available at: http://localhost:8000

### Start Frontend Development Server

```bash
# In a new terminal
cd frontend
npm start
```

The frontend will be available at: http://localhost:3000

## 📦 Dependencies

### Backend (Python)
- **FastAPI**: Modern web framework for building APIs
- **Uvicorn**: ASGI server for running FastAPI
- **SQLAlchemy**: SQL toolkit and ORM
- **Pydantic**: Data validation using Python type annotations

### Frontend (React)
- **React**: JavaScript library for building user interfaces
- **TypeScript**: Typed superset of JavaScript

## 🛠️ Development

### Backend Development

**クイックコマンド（要: `pip install -r requirements-dev.txt`）:**
```bash
cd backend

# すべてのチェック（フォーマット、Lint、セキュリティ、テスト）
make check-all

# コード自動整形
make format

# Lintチェック
make lint

# テスト（カバレッジ付き）
make test-cov
```

**詳細情報:**
- API documentation: http://localhost:8000/docs (Swagger UI)
- Database: SQLite (`backend/db/todos.db`) - 開発環境専用
- [開発ガイド](backend/DEVELOPMENT.md) - Lint、テスト、コード品質管理

**データベースに関する注意事項:**
- 開発環境: SQLite（`backend/db/todos.db`）
- 本番環境: PostgreSQL（Docker Composeで管理）
- データベースファイル（`.db`）はGit管理対象外です
- 開発データをリセットする場合: `rm backend/db/todos.db` 後、サーバー再起動

### Frontend Development

**クイックコマンド:**
```bash
cd frontend

# すべてのチェック（フォーマット、Lint、型チェック、テスト、セキュリティ）
make check-all

# コード自動整形
make format

# Lintチェック
make lint

# 型チェック
make type-check

# セキュリティスキャン
make security

# テスト（カバレッジ付き）
make test-cov
```

**開発環境の特徴:**
- Hot reload is enabled in development mode
- TypeScript is configured for type checking
- ESLint + Prettier for code quality
- CSS modules are available for component styling

## 📝 API Endpoints

- `GET /todos` - Get all todos
- `POST /todos` - Create a new todo
- `PUT /todos/{id}` - Update a todo
- `DELETE /todos/{id}` - Delete a todo

## ✅ Code Quality

このプロジェクトでは以下のツールでコード品質を保証しています：

### Backend (Python)
- **Linting**: flake8（PEP8準拠）
- **Formatting**: black, isort
- **Type Checking**: mypy
- **Testing**: pytest（カバレッジ測定付き）
- **Security**: pip-audit

### Frontend (TypeScript/React)
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier
- **Type Checking**: TypeScript compiler
- **Testing**: Jest + React Testing Library
- **Security**: npm audit

### CI/CD
- **GitHub Actions**: 自動テスト・Lint・型チェック・セキュリティスキャン

> **Note**: フロントエンドの脆弱性スキャンで検出される問題の多くは `react-scripts@5.0.1` の古い依存関係によるものです。これは既知の問題で、将来的にViteやNext.jsなどのモダンなビルドツールへの移行を検討する必要があります。

詳細は [Backend Development Guide](backend/DEVELOPMENT.md) を参照。

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest                      # 通常のテスト
pytest --cov=app           # カバレッジ付き
make test-cov              # HTMLレポート生成

# Frontend tests
cd frontend
npm test                    # インタラクティブモード
npm run test:coverage       # カバレッジ付き
```

詳細は [TESTING.md](TESTING.md) を参照。

## 🐳 Docker

### 開発環境（Docker）

Docker Composeで簡単に起動できます：

```bash
# 開発環境を起動
docker-compose up

# データベース含めて完全リセット
docker-compose down -v
docker-compose up --build
```

**データベース:**
- 開発環境: SQLite（コンテナ内でのみ使用）
- データはボリュームに永続化されません（コンテナ削除時に消失）

### 本番環境シミュレート（Docker）

本番に近い環境をローカルで体験できます：

```bash
# 本番環境を起動
docker-compose -f docker-compose.prod.yml up -d --build
```

**データベース:**
- PostgreSQL 15（本番相当）
- データはDockerボリュームに永続化（コンテナ再起動してもデータ保持）
- Redis（キャッシュ・セッション管理）も含む

詳細は以下を参照：
- 開発環境: [DOCKER.md](DOCKER.md)
- 本番環境シミュレート: [LOCAL_PRODUCTION_SETUP.md](LOCAL_PRODUCTION_SETUP.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. **コミット前に品質チェック**: `cd backend && make check-all`
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.