# セキュリティ強化 - 実施計画

## 📋 現状のセキュリティ状態

### ✅ 実装済み
- ✅ JWT認証（access token + refresh token）
- ✅ パスワードハッシュ化（bcrypt）
- ✅ CORS設定
- ✅ 依存関係の脆弱性スキャン（pip-audit, npm audit）
- ✅ セキュリティスキャンのCI/CD統合（high以上でビルド失敗）
- ✅ Vite移行完了（react-scriptsの脆弱性解消）

### ⚠️ 不足している重要なセキュリティ対策

#### 1. **HTTPSの強制化**
現状: HTTP通信のみ対応
- [ ] 本番環境でのHTTPS強制
- [ ] HSTS (HTTP Strict Transport Security) ヘッダー設定
- [ ] Secure Cookie属性の設定

#### 2. **セキュリティヘッダーの不足**
現状: ✅ **実装完了（2025-11-27）**
- [x] Content-Security-Policy (CSP) ✅
- [x] X-Content-Type-Options ✅
- [x] X-Frame-Options ✅
- [x] X-XSS-Protection ✅
- [x] Referrer-Policy ✅
- [x] Permissions-Policy ✅

#### 3. **レート制限の未実装**
現状: API呼び出しの制限なし（DoS/ブルートフォース攻撃に脆弱）
- [ ] ログインエンドポイントのレート制限
- [ ] API全体のレート制限
- [ ] IPベースの制限

#### 4. **入力検証の強化**
現状: 基本的なバリデーションのみ
- [ ] SQLインジェクション対策の強化
- [ ] XSS対策の強化
- [ ] パストラバーサル対策
- [ ] ファイルアップロード検証（将来の機能拡張時）

#### 5. **認証・認可の強化**
現状: 基本的なJWT認証のみ
- [ ] トークンのブラックリスト機能
- [ ] セッション管理の改善
- [ ] 多要素認証（MFA/2FA）の検討
- [ ] パスワードポリシーの強化
- [ ] アカウントロックアウト機能

#### 6. **ログ・監視の不足**
現状: 最小限のログのみ
- [ ] セキュリティイベントのログ記録
- [ ] 異常検知の仕組み
- [ ] 監査ログの実装
- [ ] ログの安全な保管

#### 7. **環境変数・シークレット管理**
現状: .envファイルのみ
- [ ] シークレットの暗号化
- [ ] シークレット管理サービスの利用検討（AWS Secrets Manager, HashiCorp Vault等）
- [ ] .envファイルの保護強化

#### 8. **データベースセキュリティ**
現状: 基本的な設定のみ
- [ ] データベース接続の暗号化
- [ ] 最小権限の原則の適用
- [ ] データベースバックアップの暗号化
- [ ] 個人情報の暗号化検討

## 🎯 優先度付き実施計画

### 🔴 高優先度（即座に実施）

#### 1. **セキュリティヘッダーの実装**
**目的**: XSS、クリックジャッキング等の一般的な攻撃を防御

**実装箇所**: `backend/app/main.py`

```python
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.cors import CORSMiddleware

# セキュリティヘッダーのミドルウェア追加
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'"
    return response
```

**フロントエンド対応**: `frontend/index.html` のCSP調整が必要

#### 2. **レート制限の実装**
**目的**: ブルートフォース攻撃、DoS攻撃を防御

**推奨ライブラリ**: `slowapi` または `fastapi-limiter`

```bash
cd backend
pip install slowapi
```

**実装例**:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ログインエンドポイントに適用
@app.post("/api/auth/login")
@limiter.limit("5/minute")  # 1分間に5回まで
async def login(request: Request, ...):
    ...
```

**設定**:
- ログイン: 5回/分
- API全体: 100回/分
- リフレッシュトークン: 10回/時間

#### 3. **パスワードポリシーの強化**
**目的**: 脆弱なパスワードの使用を防止

**実装箇所**: `backend/app/endpoints/auth.py`

**要件**:
- 最小8文字
- 大文字・小文字・数字・記号を各1文字以上含む
- 一般的なパスワード（"password123"等）の禁止
- パスワード履歴の保持（過去3つは再利用不可）

```python
import re
from typing import List

COMMON_PASSWORDS = ["password", "12345678", "password123", "admin123"]

def validate_password_strength(password: str) -> tuple[bool, str]:
    if len(password) < 8:
        return False, "パスワードは8文字以上必要です"
    
    if not re.search(r'[A-Z]', password):
        return False, "大文字を1文字以上含めてください"
    
    if not re.search(r'[a-z]', password):
        return False, "小文字を1文字以上含めてください"
    
    if not re.search(r'\d', password):
        return False, "数字を1文字以上含めてください"
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "記号を1文字以上含めてください"
    
    if password.lower() in COMMON_PASSWORDS:
        return False, "このパスワードは一般的すぎるため使用できません"
    
    return True, "OK"
```

### 🟡 中優先度（短期的に実施）

#### 4. **トークンブラックリスト機能**
**目的**: ログアウト時のトークン無効化、セキュリティ侵害時の迅速な対応

**実装方法**:
- Redis等のインメモリストアを使用
- ログアウト時にトークンをブラックリストに追加
- トークン検証時にブラックリストをチェック

**必要パッケージ**:
```bash
pip install redis
pip install fastapi-cache2[redis]
```

**実装例**:
```python
from redis import Redis

redis_client = Redis(host='localhost', port=6379, decode_responses=True)

def blacklist_token(token: str, expires_in: int):
    redis_client.setex(f"blacklist:{token}", expires_in, "true")

def is_token_blacklisted(token: str) -> bool:
    return redis_client.exists(f"blacklist:{token}") > 0
```

#### 5. **セキュリティログの実装**
**目的**: セキュリティイベントの追跡、インシデント調査

**ログ対象イベント**:
- ログイン成功/失敗
- パスワード変更
- トークンリフレッシュ
- 認証エラー
- レート制限超過
- 不審なアクセスパターン

**実装箇所**: `backend/app/core/security_logger.py` (新規作成)

```python
import logging
from datetime import datetime
from typing import Optional

security_logger = logging.getLogger("security")
security_logger.setLevel(logging.INFO)

# ファイルハンドラー
handler = logging.FileHandler("logs/security.log")
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
handler.setFormatter(formatter)
security_logger.addHandler(handler)

def log_login_attempt(username: str, success: bool, ip: str):
    security_logger.info(
        f"Login {'successful' if success else 'failed'} - "
        f"User: {username}, IP: {ip}"
    )

def log_rate_limit_exceeded(endpoint: str, ip: str):
    security_logger.warning(
        f"Rate limit exceeded - Endpoint: {endpoint}, IP: {ip}"
    )
```

#### 6. **入力検証の強化**
**目的**: インジェクション攻撃の防御

**実装内容**:
- Pydanticスキーマの厳格化
- サニタイゼーションの追加
- 最大長の制限

**例**: `backend/app/schemas/user.py`
```python
from pydantic import BaseModel, Field, validator
import re

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    
    @validator('username')
    def validate_username(cls, v):
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('ユーザー名は英数字、ハイフン、アンダースコアのみ使用できます')
        return v
    
    @validator('email')
    def validate_email(cls, v):
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
            raise ValueError('有効なメールアドレスを入力してください')
        return v
```

### 🟢 低優先度（長期的に検討）

#### 7. **多要素認証（MFA）の実装**
**目的**: アカウント乗っ取りのリスク低減

**推奨方式**:
- TOTP（Time-based One-Time Password）
- SMS認証
- メール認証

**ライブラリ**: `pyotp`

#### 8. **シークレット管理の改善**
**目的**: 環境変数・APIキーの安全な管理

**オプション**:
- AWS Secrets Manager
- HashiCorp Vault
- Docker Secrets
- Kubernetes Secrets

#### 9. **データベース暗号化**
**目的**: データ漏洩時の影響最小化

**実装内容**:
- パスワード以外の機密情報の暗号化
- データベース接続のTLS化
- カラムレベルの暗号化

#### 10. **セキュリティテストの自動化**
**目的**: 脆弱性の継続的な検出

**ツール**:
- OWASP ZAP（動的スキャン）
- Bandit（Pythonコード静的解析）
- Safety（依存関係チェック）
- Trivy（コンテナイメージスキャン）

## 📝 実装チェックリスト

### Phase 1: 基礎セキュリティ強化
- [x] **セキュリティヘッダーの実装** ✅ 完了（2025-11-27）
  - [x] X-Content-Type-Options: nosniff
  - [x] X-Frame-Options: DENY
  - [x] X-XSS-Protection: 1; mode=block
  - [x] Strict-Transport-Security: 環境別設定（開発/本番）
  - [x] Referrer-Policy: strict-origin-when-cross-origin
  - [x] Permissions-Policy: geolocation=(), microphone=(), camera=()
  - [x] Content-Security-Policy: 環境別設定
    - 開発環境: Vite HMR対応（unsafe-inline, unsafe-eval, WebSocket許可）
    - 本番環境: 厳格な設定（unsafe-*, WebSocket削除、追加保護）
  - [x] 環境変数による動的切り替え機能（`app/core/config.py`）
- [ ] レート制限の実装（slowapi導入）
- [ ] パスワードポリシーの強化
- [ ] セキュリティログの実装
- [ ] 入力検証の強化

### Phase 2: 認証・認可の改善
- [ ] トークンブラックリスト機能
- [ ] アカウントロックアウト機能
- [ ] パスワードリセット機能の追加
- [ ] セッション管理の改善

### Phase 3: インフラ・運用セキュリティ
- [ ] HTTPS強制化（本番環境）
- [ ] 環境変数の暗号化
- [ ] データベース接続のTLS化
- [ ] ログの集約・監視システム

### Phase 4: 高度なセキュリティ機能
- [ ] 多要素認証（MFA）
- [ ] シークレット管理サービス統合
- [ ] セキュリティテスト自動化
- [ ] 侵入検知システム（IDS）

## 🔧 必要なパッケージ

### バックエンド
```bash
pip install slowapi  # レート制限
pip install redis  # トークンブラックリスト
pip install python-jose[cryptography]  # JWT（既存）
pip install passlib[bcrypt]  # パスワードハッシュ（既存）
pip install pyotp  # MFA（将来）
```

### requirements.txtに追加
```txt
slowapi==0.1.9
redis==5.0.1
```

## 📊 セキュリティ評価指標

### 現在のスコア
| カテゴリ | 現状 | 目標 | 進捗 |
|---------|------|------|------|
| 認証・認可 | ⭐⭐⭐☆☆ | ⭐⭐⭐⭐⭐ | - |
| 入力検証 | ⭐⭐⭐☆☆ | ⭐⭐⭐⭐⭐ | - |
| 通信セキュリティ | ⭐⭐⭐⭐☆ | ⭐⭐⭐⭐⭐ | ✅ 改善（セキュリティヘッダー実装） |
| レート制限 | ⭐☆☆☆☆ | ⭐⭐⭐⭐⭐ | - |
| ログ・監視 | ⭐⭐☆☆☆ | ⭐⭐⭐⭐☆ | - |
| データ保護 | ⭐⭐⭐☆☆ | ⭐⭐⭐⭐☆ | - |

**総合評価**: ⭐⭐⭐☆☆ (3.0/5.0) → 目標: ⭐⭐⭐⭐⭐ (4.5/5.0)

**最近の改善**:
- 2025-11-27: セキュリティヘッダー全面実装
  - 通信セキュリティ: 2.0 → 4.0 に向上

## 🔗 参考資料

### OWASP Top 10 (2021)
1. Broken Access Control
2. Cryptographic Failures
3. Injection
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable and Outdated Components
7. Identification and Authentication Failures
8. Software and Data Integrity Failures
9. Security Logging and Monitoring Failures
10. Server-Side Request Forgery (SSRF)

### 参考ドキュメント
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/)

## 🎬 次のアクション

### ✅ 完了したタスク
1. ~~**セキュリティヘッダーの実装**~~ ✅ 完了（2025-11-27）
   - 全セキュリティヘッダー実装
   - 環境別設定（開発/本番）
   - 動的CSP切り替え機能

### 🔜 次に実施すべきタスク

新しいチャットで以下の順序で実施してください：

1. **レート制限の実装**（1時間）← 次はこれ
   - slowapiのインストールと設定
   - ログインエンドポイントへの適用（5回/分）
   - API全体への適用（100回/分）
   - テスト実装

2. **パスワードポリシーの強化**（30分）
   - パスワード強度検証関数の実装
   - 一般的なパスワードのブロック
   - エラーメッセージの改善

3. **セキュリティログの実装**（1時間）
   - security_logger.pyの作成
   - ログインイベントの記録
   - レート制限超過の記録

4. **入力検証の強化**（1時間）
   - Pydanticバリデータの追加
   - スキーマの厳格化
   - サニタイゼーション実装

**推定時間**: 合計3.5時間

各実装後にテストを実行し、CI/CDが正常に動作することを確認してください。
