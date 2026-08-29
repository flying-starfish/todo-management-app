# フロントエンド開発ガイド

このフロントエンドは React + TypeScript + Vite 構成です。

## 学習目的

- 認証つき SPA の基本構成を理解する
- 型安全な API 連携と状態管理の設計を学ぶ
- リアルタイム更新（WebSocket）の扱い方を実践する

## アーキテクチャ方針

### 1. ルーティングで責務を分離

- 未認証ユーザーは認証画面へ
- 認証済みユーザーだけ Todo 画面へ

この分離により、認証まわりと業務画面の責務を明確にします。

### 2. Context で横断状態を管理

- AuthContext: ログイン状態、トークン、ユーザー情報
- WebSocketContext: 接続状態、受信メッセージ、送信関数

単純な props 受け渡しではなく、横断関心を明示した構造を採用しています。

### 3. 実装詳細より利用者の振る舞いを重視

コンポーネントは UI 部品として分割し、テストでは内部実装よりユーザー操作の結果を確認します。

## 主要コンポーネント構成

- 認証: `components/Auth/`
- Todo 画面: `components/Todo/`
- 共通レイアウト: `components/Layout/`
- WebSocket 表示: `components/WebSocket/`
- 状態管理: `contexts/`

## データフローの考え方

1. 認証成功時にトークンを保持
2. API 呼び出しにトークンを付与
3. 認証状態に応じて WebSocket 接続 URL を組み立て
4. サーバーイベントを UI 状態に反映

この流れを明示することで、障害時の切り分け（認証か通信かUIか）がしやすくなります。

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

## なぜ Vite を使うのか

- 開発起動と再読み込みが速い
- TypeScript + React の構成がシンプル
- 学習時に「ビルドツールの複雑さ」で詰まりにくい

一方で、`npm run build` に型チェックが含まれないため、`npm run type-check` を併用します。

## 環境変数

環境変数は frontend 直下の `.env` に定義し、`VITE_` プレフィックスを付けます。

```env
VITE_API_URL=http://localhost:8000
```

利用例:

```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

### 設計意図

- `VITE_API_URL`: バックエンド API の接続先を明示
- `VITE_WS_URL`（任意）: WebSocket 接続先を API とは独立して切り替え可能

環境差分をコードに埋め込まず、設定で切り替えることを重視しています。

## 品質チェック

```bash
# 整形・Lint・型チェック・テスト・セキュリティチェック
make check-all
```

## 学習観点: よくある落とし穴

### 1. 認証状態と画面遷移の不整合

失敗例:
- ログアウト後も保護画面に残る

対策:
- 認証状態を単一のソース（AuthContext）で管理する

### 2. API エラー時のユーザー体験不足

失敗例:
- 失敗しても何も表示されない

対策:
- トーストやエラーメッセージで復旧導線を示す

### 3. WebSocket 接続条件の曖昧さ

失敗例:
- 未認証でも接続しようとする

対策:
- 認証状態に応じて接続可否を制御する

## 関連ドキュメント

- 移行履歴: [VITE_MIGRATION.md](./VITE_MIGRATION.md)
- テスト全体: [../docs/testing.md](../docs/testing.md)
- ルート案内: [../DOCS.md](../DOCS.md)
