# Docker 開発環境ガイド

このドキュメントは「Docker コマンドの一覧」ではなく、開発で Docker を使う意味を理解するためのガイドです。

## 学習目的

- ローカル差異を減らし、再現可能な開発環境を作る考え方を学ぶ
- アプリ・依存関係・実行環境を分離する設計の意図を理解する
- 本番に近い構成へ段階的に移行する流れを把握する

## このプロジェクトで Docker を使う理由

### 1. 環境差分の吸収

OS やローカル設定の差による「自分の環境でだけ動く」を減らします。

### 2. 学習サイクルの安定化

チームや複数端末で、同じ手順で同じ状態を再現しやすくなります。

### 3. 本番構成への橋渡し

開発では軽量構成、検証では本番相当構成という段階的な学習が可能です。

## Vite を Docker で起動する意味

Vite 開発サーバーは基本的に開発専用です。
そのため「本番で Vite 開発サーバーを動かす」ことは想定していません。

それでも Docker で Vite を起動する理由は、**本番運用のため**ではなく、**開発プロセスの再現性を高めるため**です。

### 期待できる効果

- Node/npm バージョン差異の吸収
- 新規参加者の環境構築を簡略化
- Backend と Frontend を同じ手順で同時起動できる
- チームで「同じ環境」を共有しやすい

### 注意点

- ローカル直起動より遅くなる場合がある
- Docker ボリューム環境ではファイル監視調整（例: ポーリング設定）が必要になる

## 開発と本番の違い（重要）

- 開発: Vite 開発サーバー（HMR あり）
- 本番: `vite build` で生成した静的ファイルを Web サーバーで配信

つまり、このドキュメントで扱う Vite + Docker は「開発体験の統一」のための構成です。

## 前提

- Docker
- Docker Compose

## 起動

```bash
docker-compose up --build
```

`--build` を付けるのは、依存関係や Dockerfile 変更を確実に反映するためです。

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

開発 Docker は SQLite を使用し、コンテナ削除でデータが消える前提です。
学習時は「再作成できる構成」を意図的に選んでいます。

## ログ確認

```bash
docker-compose logs
docker-compose logs -f
docker-compose logs backend
docker-compose logs frontend
```

## 開発構成の仕様

- バックエンド: FastAPI
- フロントエンド: React + Vite
- DB: SQLite（開発速度優先）

## 設計上のトレードオフ

### メリット

- セットアップの再現性が高い
- 新規参加者が環境構築で詰まりにくい

### デメリット

- ネイティブ実行より起動が遅い場合がある
- ファイル監視設定によってはホットリロードが不安定になる

## 企業開発での使い分け

「ローカル直起動（uvicorn + Vite）」と「Docker 開発」は、どちらか一方ではなく併用されることが多いです。

### よくある運用パターン

- 日常実装はローカル直起動で高速に開発
- PR 前や結合確認では Docker で再現性を確認
- 新規メンバーの環境構築は Docker を基準にする

### なぜ併用するのか

- 直起動は開発ループが速い
- Docker は環境差分を吸収しやすい
- 両方使うことで「速度」と「再現性」を両立できる

### このプロジェクトでの推奨フロー

1. 実装中はローカル直起動で機能開発を進める
2. 機能がまとまったら Docker で動作確認する
3. 本番寄り確認は [local-production-simulation.md](local-production-simulation.md) で行う

この流れを習慣化すると、開発効率を落とさずに本番移行時の事故を減らせます。

## よくあるつまずき

### 1. 変更が反映されない

原因候補:
- イメージ未再ビルド
- ボリュームやキャッシュの不整合

対策:

```bash
docker-compose down
docker-compose up --build
```

### 2. ポート競合

原因候補:
- 3000 / 8000 が既に使用中

対策:
- `docker-compose.yml` のポート設定を変更する

## 補足

- 開発 Docker は SQLite を利用
- 本番相当構成（PostgreSQL/Redis/Nginx）は [local-production-simulation.md](local-production-simulation.md) を参照

## 関連ドキュメント

- 本番相当の検証: [local-production-simulation.md](local-production-simulation.md)
- 本番化の観点: [production-readiness.md](production-readiness.md)
