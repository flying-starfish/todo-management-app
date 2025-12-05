# セキュリティ設定の環境別切り替え

## 概要

本アプリケーションでは、**開発環境**と**本番環境**で異なるセキュリティポリシーを適用します。

## Content Security Policy (CSP) の違い

### 開発環境
```
script-src 'self' 'unsafe-inline' 'unsafe-eval';  ← Vite HMR対応
style-src 'self' 'unsafe-inline';
connect-src 'self' ws: wss:;  ← WebSocket（HMR用）
```

### 本番環境
```
script-src 'self';  ← unsafe-inline, unsafe-eval を削除
style-src 'self';  ← unsafe-inline を削除
connect-src 'self';  ← WebSocket を削除
+ base-uri 'self';
+ form-action 'self';
+ upgrade-insecure-requests
```

## 環境の切り替え方法

### 方法1：環境変数で指定

```bash
# 開発環境
export ENVIRONMENT=development
python -m uvicorn app.main:app --reload

# 本番環境
export ENVIRONMENT=production
python -m uvicorn app.main:app
```

### 方法2：.envファイルを使用

#### 開発環境
```bash
# .env ファイル
ENVIRONMENT=development
DEBUG=True
```

#### 本番環境
```bash
# .env ファイル
ENVIRONMENT=production
DEBUG=False
SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxx  # 必ず変更！
```

### 方法3：Dockerで環境変数を指定

```yaml
# docker-compose.yml
services:
  backend:
    environment:
      - ENVIRONMENT=production
      - SECRET_KEY=${SECRET_KEY}
```

## 動作確認

### 現在の設定を確認
```bash
# 開発環境
ENVIRONMENT=development python -c \
  "from app.core.config import settings; \
   print('CSP:', settings.get_csp_policy())"

# 本番環境
ENVIRONMENT=production python -c \
  "from app.core.config import settings; \
   print('CSP:', settings.get_csp_policy())"
```

### サーバー起動時の確認
```bash
# サーバーを起動
uvicorn app.main:app

# 別ターミナルでヘッダーを確認
curl -I http://localhost:8000/ | grep -i "content-security-policy"
```

## 本番環境でのチェックリスト

- [ ] `ENVIRONMENT=production` を設定
- [ ] `DEBUG=False` を設定
- [ ] `SECRET_KEY` を強力なランダム値に変更
- [ ] CSPに `unsafe-inline` / `unsafe-eval` が含まれないことを確認
- [ ] HTTPSを有効化
- [ ] CORS設定を本番ドメインに限定

## トラブルシューティング

### Reactアプリが本番環境で動かない場合

**原因**: 本番環境のCSPが厳しすぎる

**解決策**:
1. Reactをビルドして、インラインスクリプトを排除
2. 必要に応じてnonceやハッシュを使用

```python
# nonce を使う場合（高度）
nonce = generate_nonce()
csp = f"script-src 'self' 'nonce-{nonce}';"
```

### Vite開発サーバーが動かない場合

**原因**: 環境変数が`production`になっている

**解決策**:
```bash
# 環境変数を確認
echo $ENVIRONMENT

# 開発環境に変更
export ENVIRONMENT=development
```

## セキュリティベストプラクティス

### 1. 本番環境では必ず厳格なCSP

```python
# ❌ 本番環境でこれは危険
"script-src 'unsafe-inline' 'unsafe-eval';"

# ✅ 本番環境ではこれを使う
"script-src 'self';"
```

### 2. 段階的な移行

```
開発 → ステージング → 本番
       ↑
       ここで厳格なCSPをテスト
```

### 3. CSP違反のレポート（将来的に）

```python
# CSP違反を検知
"report-uri /api/csp-report;"
```

## 参考資料

- [Content Security Policy Reference](https://content-security-policy.com/)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [MDN - Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
