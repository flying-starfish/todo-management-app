# Docker環境用README

## 前提条件
- Docker
- Docker Compose

## セットアップ手順

1. 環境変数ファイルの作成（必要に応じて）:
```bash
cp .env.example .env
```

2. Dockerコンテナのビルドと起動:
```bash
docker-compose up --build
```

3. バックグラウンドで起動する場合:
```bash
docker-compose up -d
```

## アクセス
- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8000
- APIドキュメント: http://localhost:8000/docs

## データベース

開発環境では**SQLite**を使用します：
- **場所**: バックエンドコンテナ内の`backend/db/todos.db`
- **永続化**: なし（コンテナ削除時にデータも削除）
- **利点**: セットアップ不要、軽量、開発に最適

本番環境シミュレートでは**PostgreSQL**を使用します：
- **場所**: 専用のPostgreSQLコンテナ
- **永続化**: Dockerボリューム（データ永続化）
- **アクセス**: [LOCAL_PRODUCTION_SETUP.md](LOCAL_PRODUCTION_SETUP.md)参照

### データベースのリセット（開発環境）

```bash
# コンテナを完全削除（データも削除）
docker-compose down

# 再起動（クリーンな状態）
docker-compose up --build
```

## コンテナの停止
```bash
docker-compose down
```

## ログの確認
```bash
# 全てのサービスのログ
docker-compose logs

# 特定のサービスのログ
docker-compose logs backend
docker-compose logs frontend

# リアルタイムでログを追跡
docker-compose logs -f
```

## データベースの操作

### データの確認

開発環境のSQLiteデータベースを確認する場合：

```bash
# コンテナ内に入る
docker-compose exec backend sh

# SQLiteに接続
sqlite3 db/todos.db

# テーブル一覧を表示
.tables

# データを確認
SELECT * FROM users;
SELECT * FROM todos;

# 終了
.exit
exit
```

### データの完全リセット

```bash
# コンテナとデータをすべて削除
docker-compose down -v

# クリーンな状態で再起動
docker-compose up --build
```

**注意**: 開発環境のSQLiteはボリューム管理されていないため、`-v`オプションなしでも`docker-compose down`でデータが削除されます。

## トラブルシューティング

### ポートが既に使用されている場合
`docker-compose.yml`のポート番号を変更してください。

### ファイル変更が反映されない場合
```bash
docker-compose down
docker-compose up --build
```
