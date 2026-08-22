# Docker 開発環境ガイド

## 前提

- Docker
- Docker Compose

## 起動

```bash
docker-compose up --build
```

バックグラウンド起動:

```bash
docker-compose up -d
```

## アクセス

- フロントエンド: http://localhost:3000
- バックエンド API: http://localhost:8000
- API ドキュメント: http://localhost:8000/docs

## 停止

```bash
docker-compose down
```

## ログ確認

```bash
docker-compose logs
docker-compose logs -f
docker-compose logs backend
docker-compose logs frontend
```

## 補足

- 開発 Docker は SQLite を利用
- 本番相当構成（PostgreSQL/Redis/Nginx）は [local-production-simulation.md](local-production-simulation.md) を参照
