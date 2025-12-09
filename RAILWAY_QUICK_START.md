# Railway デプロイ用クイックスタート

## 🚀 Railwayへのデプロイ（5分で完了）

### 1. 事前準備

```bash
# 変更をGitHubにプッシュ
git add .
git commit -m "Add Railway deployment configuration"
git push origin main
```

### 2. Railwayアカウント作成

1. https://railway.app/ にアクセス
2. GitHubアカウントでログイン
3. 無料枠: 月$5クレジット

### 3. バックエンドのデプロイ

1. 「New Project」→「Deploy from GitHub repo」
2. `todo-management-app` リポジトリを選択
3. **重要: Settings で Root Directory を設定**
   - **Settings** タブ → **Source** セクション
   - **Root Directory**: `backend` と入力
   - これを設定しないとビルドが失敗します
4. **Variables** で環境変数を追加:
   ```bash
   ENVIRONMENT=production
   SECRET_KEY=<python3 -c "import secrets; print(secrets.token_urlsafe(64))" で生成>
   ```
   例: `5WRsTLXOPtuFV3_gdzWVeIwPH30guTebFbUp7ZK3CzHwnbufOABrlDZbcIsMuiOqVM1sOIjM81D26MVejTLmrQ`

### 4. PostgreSQLの追加

1. 「New」→「Database」→「Add PostgreSQL」
2. PostgreSQLサービスが作成される（サービス名は「Postgres」など）
3. **重要: DATABASE_URLの設定**
   - PostgreSQLサービスの「Variables」タブまたは「Connect」タブを開く
   - `DATABASE_URL`の値をコピー（公開ホスト名を使用）
   - 例: `postgresql://postgres:password@monorail.proxy.rlwy.net:12345/railway`
   - **注意**: `postgres.railway.internal`ではなく、`*.proxy.rlwy.net`形式のホストを使用
4. **バックエンドサービスの Variables タブで設定**
   - `DATABASE_URL=<コピーしたURL>`を追加
   - 変数参照（`${{Postgres.DATABASE_URL}}`）がうまく動作しない場合は直接URLをコピー
5. テーブルは自動作成される（`init_db()` が実行される）

### 5. フロントエンドのデプロイ（Vercel推奨）

#### Option A: Vercel（推奨・無料）

1. https://vercel.com/ にアクセス
2. GitHubでログイン
3. 「New Project」→ リポジトリを選択
4. **Root Directory**: `frontend`
5. **Framework Preset**: Vite
6. **Environment Variables**:
   ```bash
   VITE_API_URL=<RailwayのバックエンドURL>
   ```

#### Option B: Railway

1. 「New Service」→「GitHub Repo」
2. **Root Directory**: `frontend`
3. **Build Command**: `npm run build`
4. **Start Command**: `npx serve -s build -l $PORT`
5. **Environment Variables**:
   ```bash
   VITE_API_URL=<RailwayのバックエンドURL>
   ```

### 6. 動作確認

```bash
# バックエンドのヘルスチェック
curl https://your-backend-url.railway.app/api/health

# 期待される応答
{
  "status": "healthy",
  "timestamp": "2025-12-09T12:00:00.000000",
  "environment": "production",
  "version": "1.0.0"
}
```

フロントエンドURLにアクセスして、ログイン・Todo作成を試す。

---

## 📝 詳細なガイド

詳しい手順、トラブルシューティング、カスタムドメイン設定などは、
**[RAILWAY_DEPLOY_GUIDE.md](./RAILWAY_DEPLOY_GUIDE.md)** を参照してください。

---

## 💰 費用

- **無料枠**: 月$5クレジット
- **実際の使用**: 約$3-4/月（PostgreSQL + Webサービス）
- **無料枠内で運用可能！**

---

## 🔧 設定ファイル

デプロイに必要なファイルは既に準備済み：

- ✅ `backend/railway.toml` - Railway設定（Root Directory内に配置）
- ✅ `backend/Procfile` - 起動コマンド
- ✅ `backend/nixpacks.toml` - Nixpacksビルド設定（venv使用）
- ✅ `backend/requirements.txt` - psycopg2-binary追加済み
- ✅ `backend/app/core/database.py` - PostgreSQL対応（URL形式変換含む）
- ✅ `backend/app/main.py` - ヘルスチェック追加（SQLAlchemy text()使用）
- ✅ `backend/docker/` - Dockerfileは別ディレクトリに配置（Nixpacks優先）

---

## 🎯 次のステップ

1. フロントエンドのデプロイ（Vercel推奨）
2. カスタムドメインの設定
3. 継続的デプロイ（GitHub push で自動デプロイ）
4. 監視とログの確認

## ⚠️ 重要な注意事項

### 課金について
- サービスが**起動している間は課金対象**です
- 無料枠: 月$5クレジット（約7-10日で消費）
- 使わない時はサービスまたはプロジェクトを削除してください

### サービスの停止方法
1. **個別削除**: 各サービスの Settings → 最下部の「Delete Service」
2. **プロジェクト削除**: プロジェクト Settings → 「Delete Project」
3. 後日再開する場合は、同じ手順で再作成できます（設定はコードで保存済み）

Happy Deploying! 🚀
