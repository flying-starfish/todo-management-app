# Frontend (React + TypeScript + Vite)

⚡ このプロジェクトは [Vite](https://vitejs.dev/) を使用しています（Create React Appから移行済み）

## 🚀 Available Scripts

### `npm run dev`
開発サーバーを起動します。
- URL: http://localhost:3000
- 高速なホットモジュールリプレースメント（HMR）

### `npm test`
Vitestをウォッチモードで起動します。

### `npm run test:coverage`
カバレッジレポート付きでテストを実行します。

### `npm run build`
本番用ビルドを `build/` フォルダに生成します。

### `npm run preview`
本番ビルドをローカルでプレビューします。

### `npm run type-check`
TypeScriptの型チェックを実行します（ビルドなし）。

### `npm run build:check`
型チェック後にビルドを実行します。

## 📦 主な依存関係

- **React 19** - UIライブラリ
- **TypeScript** - 型安全性
- **Vite** - 次世代ビルドツール
- **React Router** - ルーティング
- **Axios** - HTTP通信
- **@dnd-kit** - ドラッグ&ドロップ
- **react-toastify** - トースト通知

## 🧪 Testing

- **Vitest** - 高速なテストランナー
- **Testing Library** - コンポーネントテスト

## 🔧 環境変数

環境変数は`.env`ファイルで定義し、`VITE_`プレフィックスを使用します。

```env
VITE_API_URL=http://localhost:8000
```

コード内での使用:
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

## 📖 移行ガイド

CRAからViteへの移行詳細は [VITE_MIGRATION.md](./VITE_MIGRATION.md) を参照してください。

## 📚 Learn More

- [Vite documentation](https://vitejs.dev/)
- [Vitest documentation](https://vitest.dev/)
- [React documentation](https://react.dev/)
