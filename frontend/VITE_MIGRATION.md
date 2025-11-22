# Vite移行ガイド

## 概要
このプロジェクトをCreate React App (CRA)からViteへ移行しました。

## 主な変更点

### 1. ビルドツールの変更
- **変更前**: `react-scripts` (Webpack ベース)
- **変更後**: `vite` + `@vitejs/plugin-react`

### 2. スクリプトコマンドの変更
```json
{
  "dev": "vite",              // 旧: npm start
  "build": "vite build",      // 旧: npm run build (型チェックなし・高速)
  "build:check": "tsc && vite build", // 型チェック付きビルド
  "type-check": "tsc --noEmit", // 型チェックのみ（CI/CDで使用）
  "preview": "vite preview",   // 新規: ビルド後のプレビュー
  "test": "vitest"            // Jest → Vitest
}
```

**重要**: Viteはビルド時に型チェックを行わないため、型チェックは`type-check`コマンドで別途実行します。CI/CDでは`make check-all`により自動的に型チェックが実行されます。

### 3. 環境変数の変更
- **変更前**: `REACT_APP_*` プレフィックス
- **変更後**: `VITE_*` プレフィックス

例:
```javascript
// 旧
const API_URL = process.env.REACT_APP_API_URL;

// 新
const API_URL = import.meta.env.VITE_API_URL;
```

### 4. 設定ファイル

#### 新規追加されたファイル
- `vite.config.ts` - Viteの設定ファイル
- `vitest.config.ts` - Vitestの設定ファイル
- `tsconfig.node.json` - Node.js環境用のTypeScript設定（`vite.config.ts`用）
- `src/vite-env.d.ts` - Vite環境変数の型定義
- `index.html` - プロジェクトルートに移動（`public/`から）
- `.env` - 環境変数ファイル

**tsconfig.node.jsonが必要な理由**:
- `vite.config.ts`はNode.js環境で実行されるため、ブラウザ用の`tsconfig.json`とは異なる設定が必要
- DOM型とNode.js型の衝突を防ぐため、TypeScript Project Referencesで分離
- `tsconfig.json`の`references`で参照関係を定義し、適切な型チェックを実現

#### 更新されたファイル
- `tsconfig.json` - Vite用に最適化
- `package.json` - 依存関係とスクリプトを更新

### 5. HTMLエントリーポイント
- `index.html`をプロジェクトルートに配置
- `%PUBLIC_URL%`を削除
- スクリプトタグを`<script type="module" src="/src/index.tsx"></script>`に変更

### 6. テストフレームワーク
- **変更前**: Jest + React Testing Library
- **変更後**: Vitest + React Testing Library

テストコードの変更:
```typescript
// 旧
import { jest } from '@jest/globals';
jest.fn();
jest.mock();

// 新
import { vi } from 'vitest';
vi.fn();
vi.mock();
```

## 開発コマンド

```bash
# 開発サーバー起動（ポート3000）
npm run dev

# ビルド
npm run build

# ビルドのプレビュー
npm run preview

# テスト実行
npm test

# カバレッジ付きテスト
npm run test:coverage
```

## パフォーマンスの改善

Viteへの移行により、以下のパフォーマンス改善が期待できます：

1. **高速な起動**: 開発サーバーの起動が劇的に速くなります
2. **即時のHMR**: Hot Module Replacementがほぼ瞬時に反映されます
3. **高速なビルド**: 本番ビルドがRollupベースで最適化されます
4. **効率的なコード分割**: 自動的に最適なコード分割を行います

## 注意事項

### ポート番号
開発サーバーのデフォルトポートは3000に設定されています（`vite.config.ts`で変更可能）。

### 環境変数
すべての環境変数は`VITE_`プレフィックスが必要です。`.env`ファイルに定義してください。

**重要**: `.env`ファイルの配置場所
- **CRA**: プロジェクトルート（`/`）または`public/`ディレクトリの両方で動作
- **Vite**: プロジェクトルート（`/`）のみ対応。`public/`には配置できません

### TypeScript
Viteは`tsconfig.json`の`moduleResolution: "bundler"`を使用します。これはNode.jsとWebの両方に最適化されています。

**重要**: Viteはビルド時に型チェックを実行しません（速度優先の設計）。型エラーがあってもビルドは成功します。開発中は以下のコマンドで型チェックを実行してください：

```bash
# 型チェックのみ
npm run type-check

# すべてのチェック（フォーマット、Lint、型チェック、テスト）
make check-all
```

## Docker環境での変更

### 1. Dockerfile の更新
```dockerfile
# 変更前
CMD ["npm", "start"]

# 変更後
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

### 2. docker-compose.yml の更新
環境変数を変更：
```yaml
# 変更前
environment:
  - REACT_APP_API_URL=http://localhost:8000
  - WATCHPACK_POLLING=true  # Webpack用のファイル監視設定

# 変更後
environment:
  - VITE_API_URL=http://localhost:8000
  - CHOKIDAR_USEPOLLING=true  # Vite用のファイル監視設定（Dockerボリューム対応）
```

**CHOKIDAR_USEPOLLINGの理由**:
- ViteはChokidarをファイル監視に使用（WebpackはWatchpackを使用）
- Dockerボリュームマウント環境では、ネイティブファイル監視イベントがホストOSからコンテナに伝わらない
- `CHOKIDAR_USEPOLLING=true`でポーリング方式に切り替え、定期的にファイル変更をチェック
- これによりホットリロード（HMR）が正常に動作します

### 3. vite.config.ts の Docker対応
```typescript
server: {
  host: '0.0.0.0',      // Dockerコンテナ外からアクセス可能に
  port: 3000,
  open: false,          // コンテナ内では自動ブラウザ起動しない
  watch: {
    usePolling: true,   // Dockerボリューム内でHMRを有効化
  },
}
```

### 4. .dockerignore の更新
```diff
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
- package-lock.json  # この行を削除（npm ciに必要）
yarn.lock
```

**理由**: `package-lock.json`をDockerイメージに含める必要があります：
- `npm ci`コマンドは`package-lock.json`を必要とします
- `npm ci`は`npm install`より高速で、依存関係のバージョンを厳密に固定します
- これにより、ローカル環境とDocker環境で同じバージョンの依存関係が保証されます
- `package-lock.json`を除外すると、`npm ci`が失敗し、"vite: not found"などのエラーが発生します

### Docker環境での起動
```bash
# Dockerコンテナのビルドと起動
docker-compose up --build

# バックグラウンドで起動
docker-compose up -d

# 停止
docker-compose down
```

### 重要な設定ポイント

1. **host: '0.0.0.0'**: Dockerコンテナ内で全てのネットワークインターフェースをリッスン。これがないとコンテナ外からアクセスできません。

2. **watch.usePolling: true**: Dockerボリュームマウント時のファイル変更検知に必要。これによりホットリロードが正常に動作します。

3. **package-lock.json**: Dockerイメージに含めることで、`npm ci`が使用でき、依存関係のバージョンが固定されます。

## トラブルシューティング

### ビルドエラーが発生する場合
```bash
# node_modulesとキャッシュをクリア
rm -rf node_modules package-lock.json
npm install
```

### Docker環境で"vite: not found"エラーが出る場合
```bash
# .dockerignoreでpackage-lock.jsonが除外されていないか確認
# Dockerイメージを再ビルド
docker-compose down
docker-compose up --build
```

### TypeScriptエラーが発生する場合
型チェックは`tsc --noEmit`で実行されます。ビルド前に型エラーを修正してください。

## 参考リンク
- [Vite公式ドキュメント](https://vitejs.dev/)
- [Vitest公式ドキュメント](https://vitest.dev/)
- [ViteへのCRA移行ガイド](https://vitejs.dev/guide/migration.html)
