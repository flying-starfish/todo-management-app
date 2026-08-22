# ローカル本番シミュレート

このガイドは、ローカルで本番相当の構成（PostgreSQL/Redis/Nginx）を確認するための最小手順です。

## 起動

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

## 確認

- アプリ: http://localhost
- API ヘルスチェック: http://localhost/api/health

## 停止

```bash
docker-compose -f docker-compose.prod.yml down
```

## 完全リセット

```bash
docker-compose -f docker-compose.prod.yml down -v
```

## 関連

- 本番化チェック: [production-readiness.md](production-readiness.md)
- Railway デプロイ: [railway.md](railway.md)
