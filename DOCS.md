# 📚 Documentation Overview

プロジェクトのドキュメントは目的別に整理されています。

## 🎯 どのドキュメントを読めばいい？

### 初めての方
👉 **[README.md](README.md)** - プロジェクト全体の概要とクイックスタート

### バックエンド開発者
👉 **[backend/DEVELOPMENT.md](backend/DEVELOPMENT.md)** - Lint、テスト、コード品質管理の完全ガイド

### フロントエンド開発者
👉 **[frontend/README.md](frontend/README.md)** - React開発の基本コマンド  
👉 **[frontend/Makefile](frontend/Makefile)** - Lint、フォーマット、型チェックのコマンド

### テストを書く・実行する
👉 **[TESTING.md](TESTING.md)** - テスト戦略とベストプラクティス  
👉 **[backend/PYTEST_GUIDE.md](backend/PYTEST_GUIDE.md)** - Pytestの詳細ガイド

### Docker環境で開発する
👉 **[DOCKER.md](DOCKER.md)** - Docker/Docker Composeの使い方

---

## 📁 ドキュメント一覧

### ルートディレクトリ
| ファイル | 内容 |
|---------|------|
| **README.md** | プロジェクト全体の概要、セットアップ、基本的な使い方 |
| **TESTING.md** | テスト戦略、実行方法、ベストプラクティス |
| **DOCKER.md** | Docker環境でのセットアップと運用 |
| **DOCS.md** | このファイル（ドキュメント案内） |

### backend/
| ファイル | 内容 |
|---------|------|
| **DEVELOPMENT.md** | 開発環境セットアップ、Lint/テスト/コード品質管理 |
| **PYTEST_GUIDE.md** | Pytestの使い方、テストパターン、Tips |
| **requirements.txt** | 本番用依存関係 |
| **requirements-dev.txt** | 開発用依存関係（Lintツール等） |
| **pyproject.toml** | black/isort/mypy/pytest設定 |
| **.flake8** | flake8設定 |
| **Makefile** | 便利コマンド集 |

### frontend/
| ファイル | 内容 |
|---------|------|
| **README.md** | React開発の基本コマンドと依存関係 |
| **Makefile** | Lint/フォーマット/型チェック便利コマンド |
| **package.json** | npm依存関係とスクリプト |
| **tsconfig.json** | TypeScript設定 |
| **.eslintrc.json** | ESLint設定 |
| **.prettierrc.json** | Prettier設定 |

### .github/workflows/
| ファイル | 内容 |
|---------|------|
| **ci.yml** | CI/CDパイプライン設定（自動テスト・Lint） |

---

## 🔍 トピック別ガイド

### セットアップ
1. [README.md](README.md) - 最初に読む
2. [backend/DEVELOPMENT.md](backend/DEVELOPMENT.md) - 開発ツールのセットアップ

### コード品質
1. [backend/DEVELOPMENT.md](backend/DEVELOPMENT.md) - バックエンドのLint/フォーマット/型チェック
2. [backend/Makefile](backend/Makefile) - バックエンドの便利コマンド
3. [frontend/Makefile](frontend/Makefile) - フロントエンドの便利コマンド

### テスト
1. [TESTING.md](TESTING.md) - 全体戦略
2. [backend/PYTEST_GUIDE.md](backend/PYTEST_GUIDE.md) - 詳細ガイド

### デプロイ
1. [DOCKER.md](DOCKER.md) - Docker環境
2. [.github/workflows/ci.yml](.github/workflows/ci.yml) - CI/CD設定

---

## ❓ よくある質問

### Q: Lintツールの使い方は？
A: [backend/DEVELOPMENT.md](backend/DEVELOPMENT.md) の「コード品質チェック」セクションを参照

### Q: テストの書き方は？
A: [backend/PYTEST_GUIDE.md](backend/PYTEST_GUIDE.md) と [TESTING.md](TESTING.md) を参照

### Q: CI/CDで何がチェックされている？
A: [backend/DEVELOPMENT.md](backend/DEVELOPMENT.md) の「CI/CDとの連携」セクションを参照

### Q: コミット前に何をすべき？
A: バックエンドの変更なら `cd backend && make check-all` を実行（format, lint, security, test）  
A: フロントエンドの変更なら `cd frontend && make check-all` を実行（format, lint, type-check, test, security）

### Q: セキュリティスキャンで問題が検出されたら？
A: バックエンドは `pip-audit`、フロントエンドは `npm audit` の結果を確認。重大度に応じて対応を検討してください。フロントエンドの一部の脆弱性は `react-scripts` の古い依存関係によるもので、直接修正が困難な場合があります。

---

## 🔄 ドキュメントの更新

新機能や変更を追加する際は、関連ドキュメントも更新してください：

- 新しい依存関係 → README.md と該当の DEVELOPMENT.md
- 新しいMakeコマンド → backend/Makefile と DEVELOPMENT.md
- 新しいテストパターン → TESTING.md または PYTEST_GUIDE.md
- CI/CD変更 → .github/workflows/ci.yml と DEVELOPMENT.md
