# テストガイド

このドキュメントでは、バックエンドとフロントエンドのテストの実行方法について説明します。

> 💡 **関連ドキュメント**: [Backend Development Guide](backend/DEVELOPMENT.md) - より詳細な開発ガイド

## 📋 目次

- [バックエンドテスト](#バックエンドテスト)
- [フロントエンドテスト](#フロントエンドテスト)
- [CI/CD](#cicd)
- [テストカバレッジ](#テストカバレッジ)
- [テストのベストプラクティス](#テストのベストプラクティス)

## 🐍 バックエンドテスト

### セットアップ

```bash
cd backend

# 本番用依存関係のみ
pip install -r requirements.txt

# 開発用依存関係（テストツール含む）- 推奨
pip install -r requirements-dev.txt
```

### テストの実行

#### Makefileを使用（推奨）

```bash
cd backend

# テストのみ実行
make test

# カバレッジレポート付き（HTMLレポート生成）
make test-cov

# すべてのチェック（フォーマット、Lint、セキュリティ、テスト）
make check-all
```

#### 直接pytestを使用

```bash
# すべてのテストを実行
pytest

# 詳細な出力で実行
pytest -v

# カバレッジレポート付きで実行
pytest --cov=app --cov-report=html --cov-report=term

# 特定のテストファイルを実行
pytest tests/test_todo.py

# 特定のテストクラスを実行
pytest tests/test_todo.py::TestTodoEndpoints

# 特定のテスト関数を実行
pytest tests/test_todo.py::TestTodoEndpoints::test_create_todo

# 並列実行（高速化）
pytest -n auto
```

### テストカバレッジの確認

```bash
# HTMLレポートを生成して開く
pytest --cov=app --cov-report=html
open htmlcov/index.html  # macOS
# または
xdg-open htmlcov/index.html  # Linux
```

### Dockerコンテナ内でテストを実行

```bash
# コンテナをビルド
docker-compose build backend

# テストを実行
docker-compose run --rm backend pytest

# カバレッジ付きで実行
docker-compose run --rm backend pytest --cov=app --cov-report=term

# Makefileコマンドも使用可能
docker-compose run --rm backend make test-cov
```

> 📚 **詳細情報**: [Pytest Guide](backend/PYTEST_GUIDE.md) - Pytestの詳細な使い方

## ⚛️ フロントエンドテスト

### セットアップ

```bash
cd frontend
npm install
```

### テストの実行

```bash
# インタラクティブモードでテストを実行
npm test

# すべてのテストを一度だけ実行
npm test -- --watchAll=false

# カバレッジレポート付きで実行
npm run test:coverage

# 特定のテストファイルを実行
npm test -- TodoList.test.tsx

# 特定のテストケースを実行
npm test -- -t "renders todo list title"
```

### テストカバレッジの確認

```bash
# カバレッジレポートを生成
npm run test:coverage

# HTMLレポートを開く
open coverage/lcov-report/index.html  # macOS
# または
xdg-open coverage/lcov-report/index.html  # Linux
```

### Dockerコンテナ内でテストを実行

```bash
# コンテナをビルド
docker-compose build frontend

# テストを実行
docker-compose run --rm frontend npm test -- --watchAll=false

# カバレッジ付きで実行
docker-compose run --rm frontend npm run test:coverage
```

## 🔄 CI/CD

このプロジェクトではGitHub Actionsを使用して、プッシュやプルリクエスト時に自動的にテストを実行します。

### ワークフローの構成

`.github/workflows/ci.yml` に以下のジョブが定義されています：

1. **backend-test**: バックエンドのテストを実行（pytest + coverage）
2. **frontend-test**: フロントエンドのテストを実行（Jest + coverage）
3. **backend-lint**: コードスタイルチェック（flake8, black, isort, mypy）
4. **frontend-lint**: フロントエンドLint（準備中）
5. **security-scan**: セキュリティスキャン（pip-audit, npm audit）
6. **docker-build**: Dockerイメージのビルドをテスト

### ローカルでCI環境を再現

#### バックエンド（推奨: Makefileを使用）

```bash
cd backend

# CI/CDと同じチェックをすべて実行
make check-all

# 個別に実行
pip install -r requirements-dev.txt
make format-check  # フォーマットチェック
make lint          # flake8, mypy
make security      # pip-audit
make test-cov      # pytest + coverage
```

#### フロントエンド

```bash
cd frontend
npm ci
npm run test:coverage
```

#### Docker

```bash
docker build -t todo-backend:test ./backend
docker build -t todo-frontend:test ./frontend
```

> 💡 **Tip**: コミット前に `cd backend && make check-all` を実行することで、CI/CDでのエラーを防げます。

## 📊 テストカバレッジ

### カバレッジ目標

- **バックエンド**: 80%以上
- **フロントエンド**: 70%以上

### カバレッジレポートの見方

#### バックエンド（pytest-cov）

```bash
pytest --cov=app --cov-report=term-missing
```

出力例：
```
Name                              Stmts   Miss  Cover   Missing
---------------------------------------------------------------
app/__init__.py                       0      0   100%
app/main.py                          25      2    92%   45-46
app/endpoints/todo.py                85      5    94%   120, 145-148
app/endpoints/auth.py                60      3    95%   75-77
---------------------------------------------------------------
TOTAL                               170     10    94%
```

#### フロントエンド（Jest）

```bash
npm run test:coverage
```

出力例：
```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   85.5  |   78.2   |   82.1  |   86.3  |
 components/        |   88.2  |   82.5   |   85.7  |   89.1  |
  TodoList.tsx      |   90.5  |   85.3   |   88.9  |   91.2  |
  Login.tsx         |   85.3  |   78.9   |   81.8  |   86.5  |
 utils/             |   75.8  |   65.2   |   70.5  |   77.1  |
  apiClient.ts      |   80.2  |   70.8   |   75.0  |   81.5  |
--------------------|---------|----------|---------|---------|
```

## 🔍 テストのベストプラクティス

### バックエンド

1. **Arrange-Act-Assert パターン**を使用
   ```python
   def test_create_todo(client, auth_headers):
       # Arrange: テストデータを準備
       todo_data = {"title": "Test Todo", "description": "Test", "completed": False}
       
       # Act: 実行
       response = client.post("/todos", json=todo_data, headers=auth_headers)
       
       # Assert: 検証
       assert response.status_code == 200
       assert response.json()["title"] == "Test Todo"
   ```

2. **フィクスチャ**を活用してコードの重複を削減
   - `conftest.py` で共通のフィクスチャを定義
   - 認証ヘッダー、テストクライアント、データベースセッションなど

3. **エッジケース**もテスト
   - 空の入力、不正な形式
   - 認証なしのアクセス
   - 存在しないリソースへのアクセス
   - 境界値のテスト

4. **テストクラス**で関連するテストをグループ化
   ```python
   class TestTodoEndpoints:
       def test_create_todo(self, client, auth_headers):
           ...
       
       def test_get_todos(self, client, auth_headers):
           ...
   ```

> 📚 **詳細**: [Pytest Guide](backend/PYTEST_GUIDE.md) でより詳しいパターンを紹介

### フロントエンド

1. **ユーザーの視点**でテストを書く（実装詳細ではなく動作をテスト）
   ```typescript
   // ❌ 悪い例
   expect(component.state.todos).toHaveLength(3);
   
   // ✅ 良い例
   expect(screen.getAllByRole('listitem')).toHaveLength(3);
   ```

2. **React Testing Libraryのクエリ優先度**に従う
   - `getByRole` > `getByLabelText` > `getByPlaceholderText` > `getByText` > `getByTestId`

3. **非同期処理**は`waitFor`で適切にハンドリング

## 🐛 トラブルシューティング

### バックエンド

**問題**: `ModuleNotFoundError: No module named 'app'`

**解決**: backendディレクトリから実行するか、pytest.iniの設定を確認
```bash
cd backend
pytest
```

**問題**: `flake8: command not found`

**解決**: 開発用依存関係をインストール
```bash
cd backend
pip install -r requirements-dev.txt
```

**問題**: テストは通るがカバレッジが低い

**解決**: カバレッジレポートで未テスト箇所を確認
```bash
make test-cov
open htmlcov/index.html
```

### フロントエンド

**問題**: `Cannot find module 'msw'`

**解決**: 依存関係を再インストール
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**問題**: テストがタイムアウトする

**解決**: タイムアウト時間を延長
```typescript
await waitFor(() => {
  expect(screen.getByText(/loaded/i)).toBeInTheDocument();
}, { timeout: 5000 });
```

## 📚 参考リソース

### プロジェクト内ドキュメント
- **[Backend Development Guide](backend/DEVELOPMENT.md)** - コード品質、Lint、セキュリティ
- **[Pytest Guide](backend/PYTEST_GUIDE.md)** - Pytestの詳細な使い方とパターン
- **[Docker Guide](DOCKER.md)** - Docker環境でのテスト実行

### 外部リソース

#### バックエンド
- [pytest公式ドキュメント](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [pytest-cov](https://pytest-cov.readthedocs.io/)

#### フロントエンド
- [React Testing Library](https://testing-library.com/react)
- [Jest](https://jestjs.io/)
- [MSW (Mock Service Worker)](https://mswjs.io/)

## 🎯 次のステップ

現在の状態：
1. ✅ ユニットテストの実装
2. ✅ CI/CDパイプラインの構築（GitHub Actions）
3. ✅ コードカバレッジ測定
4. ✅ Lint・フォーマットチェック
5. ✅ セキュリティスキャン

今後の改善案：
1. 🔄 E2Eテストの追加（Playwright/Cypress）
2. 🔄 パフォーマンステストの実装
3. 🔄 ビジュアルリグレッションテスト
4. 🔄 テストカバレッジ90%以上を目指す

---

## 🔗 関連ドキュメント

- [README.md](README.md) - プロジェクト全体の概要
- [DOCS.md](DOCS.md) - ドキュメントナビゲーション
- [Backend Development Guide](backend/DEVELOPMENT.md) - 開発ガイド
- [Docker Guide](DOCKER.md) - Docker環境
