# フロントエンド開発ガイド

このフロントエンドは React + TypeScript + Vite 構成です。

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# テスト（ウォッチ）
npm test

# テスト（カバレッジ）
npm run test:coverage

# 型チェック
npm run type-check

# 本番ビルド
npm run build

# 型チェック後にビルド
npm run build:check

# 本番ビルドをローカル確認
npm run preview
```

開発サーバー URL: http://localhost:3000

## 環境変数

環境変数は frontend 直下の `.env` に定義し、`VITE_` プレフィックスを付けます。

```env
VITE_API_URL=http://localhost:8000
```

利用例:

```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

## 品質チェック

```bash
# 整形・Lint・型チェック・テスト・セキュリティチェック
make check-all
```

## 関連ドキュメント

- 移行履歴: [VITE_MIGRATION.md](./VITE_MIGRATION.md)
- テスト全体: [../docs/testing.md](../docs/testing.md)
- ルート案内: [../DOCS.md](../DOCS.md)
