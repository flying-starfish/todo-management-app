# Railway デプロイガイド

このガイドでは、TodoアプリケーションをRailwayにデプロイする手順を説明します。

## 📋 目次

1. [事前準備](#事前準備)
2. [Railwayアカウント作成](#railwayアカウント作成)
3. [バックエンドのデプロイ](#バックエンドのデプロイ)
4. [PostgreSQLデータベースの追加](#postgresqlデータベースの追加)
5. [フロントエンドのデプロイ](#フロントエンドのデプロイ)
6. [環境変数の設定](#環境変数の設定)
7. [デプロイ確認](#デプロイ確認)
8. [トラブルシューティング](#トラブルシューティング)

---

## 事前準備

### 必要なもの

- GitHubアカウント
- このリポジトリがGitHubにpush済み
- Railway用の設定ファイル（既に準備済み）
  - `railway.toml`
  - `Procfile`
  - `backend/requirements.txt`（psycopg2-binary追加済み）

### ローカルでの確認

デプロイ前に、変更をGitHubにpushします：

```bash
git add .
git commit -m "Add Railway deployment configuration"
git push origin main
```

---

## Railwayアカウント作成

### Step 1: サインアップ

1. [Railway.app](https://railway.app/) にアクセス
2. 「Start a New Project」または「Login」をクリック
3. **GitHub認証でログイン**（推奨）
   - GitHubアカウントでログインすると、リポジトリとの連携が簡単

### Step 2: 無料枠の確認

- **無料枠**: 月$5のクレジット + 500時間の実行時間
- クレジットカード登録なしで開始可能
- 小規模アプリなら無料枠で十分

---

## バックエンドのデプロイ

### Step 1: 新規プロジェクト作成

1. Railwayダッシュボードで「New Project」をクリック
2. 「Deploy from GitHub repo」を選択
3. あなたの `todo-management-app` リポジトリを選択

### Step 2: サービスの設定

Railway が自動的にリポジトリを検出します。

#### ルートディレクトリの指定

1. デプロイされたサービスをクリック
2. 「Settings」タブに移動
3. 「Root Directory」を `backend` に設定
   - これで `backend/requirements.txt` が認識されます

#### 環境変数の設定（一時的）

1. 「Variables」タブに移動
2. 以下の環境変数を追加：

```bash
ENVIRONMENT=production
SECRET_KEY=<強力なランダム文字列を生成>
```

**SECRET_KEYの生成**（ローカルで実行）:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

生成された文字列をコピーして、`SECRET_KEY`に設定します。

#### デプロイの実行

- 環境変数を設定すると、自動的に再デプロイが始まります
- デプロイログを確認して、エラーがないかチェック

---

## PostgreSQLデータベースの追加

### Step 1: データベースの追加

1. プロジェクトダッシュボードで「New」をクリック
2. 「Database」→「Add PostgreSQL」を選択
3. データベースが自動的にプロビジョニングされます

### Step 2: データベースURLの取得

1. 作成されたPostgreSQLサービスをクリック
2. 「Variables」タブで `DATABASE_URL` を確認
3. この値は自動的に他のサービスに共有されます

### Step 3: バックエンドへの接続

1. バックエンドサービスに戻る
2. 「Variables」タブで `DATABASE_URL` が自動追加されているか確認
   - 自動追加されない場合は、手動で追加：
   ```
   DATABASE_URL=postgresql://postgres:password@hostname:port/railway
   ```

### Step 4: データベーステーブルの作成

Railway上でテーブルを作成する方法は2つ：

#### 方法1: 自動作成（推奨）

アプリケーションは起動時に `init_db()` を実行し、テーブルを自動作成します。
（`backend/app/main.py` で `init_db()` が呼ばれています）

#### 方法2: 手動作成（オプション）

Railwayのデータベースコンソールで手動実行：

1. PostgreSQLサービスの「Data」タブを開く
2. SQLクエリを実行してテーブル作成

---

## フロントエンドのデプロイ

Railwayでフロントエンドをデプロイするには2つの方法があります。

### オプション1: 静的サイトホスティング（推奨）

#### Vercelでフロントエンドをホスト

1. [Vercel](https://vercel.com/) にアクセス
2. GitHubでログイン
3. 「New Project」→ リポジトリを選択
4. **Root Directory** を `frontend` に設定
5. **Framework Preset** で「Vite」を選択
6. **Environment Variables** に追加：
   ```
   VITE_API_URL=<RailwayのバックエンドURL>
   ```
7. 「Deploy」をクリック

### オプション2: RailwayでSPAをホスト

フロントエンドもRailwayでホストする場合：

1. プロジェクトで「New Service」→「GitHub Repo」を選択
2. 同じリポジトリを選択
3. 「Settings」で以下を設定：
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Start Command**: `npx serve -s build -l $PORT`
4. 「Variables」タブで環境変数を追加：
   ```
   VITE_API_URL=<RailwayのバックエンドURL>
   ```

---

## 環境変数の設定

### バックエンドの環境変数

Railwayのバックエンドサービスで以下を設定：

```bash
# 必須
ENVIRONMENT=production
SECRET_KEY=<生成した強力な文字列>
DATABASE_URL=<PostgreSQLから自動設定>

# オプション
FRONTEND_URL=<フロントエンドのURL（Vercel等）>
```

### フロントエンドの環境変数

Vercel または Railway のフロントエンドサービスで：

```bash
VITE_API_URL=<RailwayのバックエンドURL>
```

**例**:
```bash
VITE_API_URL=https://todo-backend-production-xxxx.up.railway.app
```

---

## デプロイ確認

### Step 1: バックエンドの動作確認

1. RailwayのバックエンドサービスURLを開く
   - 例: `https://todo-backend-production-xxxx.up.railway.app`

2. ヘルスチェックエンドポイントにアクセス：
   ```
   https://your-backend-url.railway.app/api/health
   ```

   **期待される応答**:
   ```json
   {
     "status": "healthy",
     "timestamp": "2024-12-07T12:00:00",
     "environment": "production",
     "version": "1.0.0"
   }
   ```

### Step 2: フロントエンドの動作確認

1. Vercel（またはRailway）のフロントエンドURLを開く
2. ログイン画面が表示されることを確認
3. 新規ユーザー登録を試す
4. Todoの作成・編集・削除を試す

### Step 3: データベースの確認

1. RailwayのPostgreSQLサービスを開く
2. 「Data」タブでテーブルを確認：
   - `users` テーブル
   - `todos` テーブル
3. 作成したデータが保存されているか確認

---

## トラブルシューティング

### 問題1: デプロイが失敗する

**症状**: ビルドエラーやデプロイエラー

**解決策**:
1. Railwayの「Deployments」タブでログを確認
2. `requirements.txt` に必要なパッケージが含まれているか確認
3. `railway.toml` の `startCommand` が正しいか確認

### 問題2: データベースに接続できない

**症状**: `connection refused` または `cannot connect to database`

**解決策**:
1. `DATABASE_URL` 環境変数が設定されているか確認
2. PostgreSQLサービスが起動しているか確認
3. データベースURLの形式を確認：
   ```
   postgresql://user:password@host:port/database
   ```

### 問題3: CORSエラー

**症状**: フロントエンドからAPIにアクセスできない

**解決策**:
1. バックエンドの `FRONTEND_URL` 環境変数を設定
2. フロントエンドのURLを正確に指定（末尾のスラッシュなし）
3. Railwayで再デプロイ

### 問題4: 環境変数が反映されない

**症状**: SECRET_KEYやDATABASE_URLが読み込まれない

**解決策**:
1. 環境変数を設定後、手動で再デプロイ
2. Railwayの「Deployments」→「Redeploy」をクリック

### 問題5: ヘルスチェックが失敗する

**症状**: Railway がサービスを "unhealthy" と判定

**解決策**:
1. `/api/health` エンドポイントが正しく動作しているか確認
2. データベース接続が確立されているか確認
3. `railway.toml` の `healthcheckPath` を確認

---

## 費用の目安

### 無料枠内で運用する場合

- **PostgreSQL**: 約$1/月（512MB）
- **バックエンド（Webサービス）**: 約$2-3/月
- **合計**: 約$3-4/月

**無料枠（$5/月）内で収まります！**

### 節約のコツ

1. 開発中以外はサービスを停止
2. データベースサイズを小さく保つ
3. 不要なログを削減

---

## 次のステップ

### 1. カスタムドメインの設定

Railwayで独自ドメインを設定：
1. バックエンドサービスの「Settings」→「Domains」
2. 「Add Custom Domain」でドメインを追加
3. DNSレコードを設定

### 2. 継続的デプロイ（CD）の活用

GitHubにpushすると自動的に再デプロイされます。

### 3. 監視とログ

Railwayの「Observability」タブでログとメトリクスを確認。

### 4. スケーリング

トラフィックが増えたら：
- Railwayの「Settings」→「Resources」でスペックを増強

---

## サポートリソース

- [Railway公式ドキュメント](https://docs.railway.app/)
- [Railway Discord](https://discord.gg/railway)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)

---

## まとめ

✅ Railwayアカウント作成
✅ バックエンドとPostgreSQLのデプロイ
✅ フロントエンドのデプロイ（Vercel推奨）
✅ 環境変数の設定
✅ 動作確認

デプロイが完了したら、実際のURLをREADME.mdに追加しましょう！

**Happy Deploying! 🚀**
