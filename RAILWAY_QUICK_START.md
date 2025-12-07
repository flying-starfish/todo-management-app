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
3. 無料枠: 月$5クレジット + 500時間

### 3. バックエンドのデプロイ

1. 「New Project」→「Deploy from GitHub repo」
2. `todo-management-app` リポジトリを選択
3. **Settings** で以下を設定:
   - **Root Directory**: `backend`
4. **Variables** で環境変数を追加:
   ```bash
   ENVIRONMENT=production
   SECRET_KEY=<python3 -c "import secrets; print(secrets.token_urlsafe(64))" で生成>
   ```

### 4. PostgreSQLの追加

1. 「New」→「Database」→「Add PostgreSQL」
2. `DATABASE_URL` が自動的にバックエンドに追加される
3. テーブルは自動作成される（`init_db()` が実行される）

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
  "timestamp": "2024-12-07T12:00:00",
  "environment": "production"
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

- ✅ `railway.toml` - Railway設定
- ✅ `Procfile` - 起動コマンド
- ✅ `backend/requirements.txt` - psycopg2-binary追加済み
- ✅ `backend/app/core/database.py` - PostgreSQL対応
- ✅ `backend/app/main.py` - ヘルスチェック追加

---

## 🎯 次のステップ

1. カスタムドメインの設定
2. 継続的デプロイ（GitHub push で自動デプロイ）
3. 監視とログの確認
4. パフォーマンス最適化

Happy Deploying! 🚀
