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

## データベースのリセット
```bash
docker-compose down -v
docker-compose up --build
```

## トラブルシューティング

### ポートが既に使用されている場合
`docker-compose.yml`のポート番号を変更してください。

### ファイル変更が反映されない場合
```bash
docker-compose down
docker-compose up --build
```
