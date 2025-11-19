# テストガイド

このドキュメントでは、バックエンドとフロントエンドのテストの実行方法について説明します。

## 📋 目次

- [バックエンドテスト](#バックエンドテスト)
- [フロントエンドテスト](#フロントエンドテスト)
- [CI/CD](#cicd)
- [テストカバレッジ](#テストカバレッジ)

## 🐍 バックエンドテスト

### セットアップ

```bash
cd backend
pip install -r requirements.txt
```

### テストの実行

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
```

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

1. **backend-test**: バックエンドのテストを実行
2. **frontend-test**: フロントエンドのテストを実行
3. **lint**: コードの静的解析を実行
4. **docker-build**: Dockerイメージのビルドをテスト

### ローカルでCI環境を再現

```bash
# バックエンド
cd backend
pip install -r requirements.txt
pytest --cov=app --cov-report=xml
flake8 app/ --max-line-length=120

# フロントエンド
cd frontend
npm ci
npm run test:coverage

# Docker
docker build -t todo-backend:test ./backend
docker build -t todo-frontend:test ./frontend
```

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
       todo_data = {"title": "Test", "completed": False}
       
       # Act: 実行
       response = client.post("/api/todos", json=todo_data, headers=auth_headers)
       
       # Assert: 検証
       assert response.status_code == 200
   ```

2. **フィクスチャ**を活用してコードの重複を削減

3. **エッジケース**もテスト（空の入力、不正な形式など）

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

**解決**: PYTHONPATHを設定するか、backendディレクトリから実行
```bash
cd backend
PYTHONPATH=. pytest
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

### バックエンド
- [pytest公式ドキュメント](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [pytest-cov](https://pytest-cov.readthedocs.io/)

### フロントエンド
- [React Testing Library](https://testing-library.com/react)
- [Jest](https://jestjs.io/)
- [MSW (Mock Service Worker)](https://mswjs.io/)

## 🎯 次のステップ

1. ✅ ユニットテストの実装
2. ✅ CI/CDパイプラインの構築
3. 🔄 E2Eテストの追加（Playwright/Cypress）
4. 🔄 パフォーマンステストの実装
5. 🔄 セキュリティテストの追加
