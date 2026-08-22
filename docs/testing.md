# テストガイド

このドキュメントは、日常開発で必要なテスト実行コマンドだけをまとめています。

## バックエンド（pytest）

```bash
cd backend

# 通常実行
pytest

# カバレッジ付き
pytest --cov=app

# 推奨（整形・Lint・セキュリティ・テスト）
make check-all
```

詳細は [backend/PYTEST_GUIDE.md](../backend/PYTEST_GUIDE.md) を参照してください。

## フロントエンド（Vitest）

```bash
cd frontend

# ウォッチ実行
npm test

# 1回実行
npm test -- --run

# カバレッジ付き
npm run test:coverage

# 推奨（整形・Lint・型チェック・テスト・セキュリティ）
make check-all
```

## CI で確認している主な観点

- バックエンドのテスト
- フロントエンドのテスト
- Lint / フォーマット
- 型チェック
- 脆弱性スキャン
