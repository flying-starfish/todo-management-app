# Railway デプロイガイド

このドキュメントは、Railway へのデプロイ手順を最短でまとめた統合版です。

## 1. 事前準備

- リポジトリを GitHub に push 済み
- `backend/railway.toml`, `backend/Procfile`, `backend/nixpacks.toml` を維持

## 2. バックエンドをデプロイ

1. Railway で「Deploy from GitHub repo」を選択
2. バックエンドサービスの Root Directory を `backend` に設定
3. 環境変数を設定

必須環境変数:

```env
ENVIRONMENT=production
SECRET_KEY=<64文字以上のランダム文字列>
DATABASE_URL=<Railway の PostgreSQL URL>
```

`SECRET_KEY` 生成例:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

## 3. PostgreSQL を追加

1. Railway プロジェクトで PostgreSQL サービスを作成
2. 発行された `DATABASE_URL` をバックエンドに設定
3. 起動ログで接続成功を確認

## 4. フロントエンドをデプロイ

推奨は Vercel、Railway でも可。いずれの場合も以下を設定:

```env
VITE_API_URL=<バックエンド公開URL>
```

## 5. 動作確認

- `GET /api/health` が 200 を返す
- ユーザー登録/ログイン/Todo 作成がブラウザで実行できる

## 6. よくある失敗

- Root Directory 未設定（`backend` になっていない）
- `DATABASE_URL` の設定漏れ
- `VITE_API_URL` の誤設定
