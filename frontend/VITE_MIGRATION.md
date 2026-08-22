# Vite 移行メモ

このプロジェクトは Create React App から Vite へ移行済みです。
現在は運用フェーズのため、本書は「背景と差分の要約」に絞っています。

## 変更の要点

- ビルドツール: `react-scripts` から `vite` へ変更
- テスト実行: Jest から Vitest へ変更
- 環境変数: `REACT_APP_*` から `VITE_*` へ変更
- 開発起動: `npm start` ではなく `npm run dev`

## 現在の主要コマンド

```bash
# 開発
npm run dev

# テスト
npm test
npm run test:coverage

# 型チェック
npm run type-check

# ビルド
npm run build
npm run build:check
```

## 注意点

### 型チェック

Vite の `build` は型チェックを実行しません。型エラー検出は `npm run type-check` または `make check-all` で行います。

### 環境変数

- `.env` は frontend ルートに配置
- 参照可能なのは `VITE_` で始まる変数のみ

例:

```env
VITE_API_URL=http://localhost:8000
```

### Docker 開発時

- `npm run dev -- --host 0.0.0.0` で外部アクセス可能にする
- 必要に応じて `CHOKIDAR_USEPOLLING=true` を使用する
- `package-lock.json` を除外すると `npm ci` が失敗するため除外しない

## 関連ドキュメント

- フロントエンド開発: [README.md](README.md)
- テスト全体: [../docs/testing.md](../docs/testing.md)
- Docker 開発環境: [../docs/deployment/docker-development.md](../docs/deployment/docker-development.md)
