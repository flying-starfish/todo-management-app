# 認証とセキュリティの理解

この章では、FastAPI アプリにおける認証とセキュリティを、"実際のコードの流れ"を軸に整理します。

## 目標

- 認証がどこで発生するのかを理解する
- JWT と Password Hashing の役割を理解する
- `Depends()` を使った権限チェックの流れを理解する
- このプロジェクトでどのファイルが何を担っているかを地図化する

## 参照ファイル

- [backend/app/endpoints/auth.py](../../../backend/app/endpoints/auth.py)
- [backend/app/core/dependencies.py](../../../backend/app/core/dependencies.py)
- [backend/app/core/security.py](../../../backend/app/core/security.py)
- [backend/app/models/user.py](../../../backend/app/models/user.py)
- [backend/app/main.py](../../../backend/app/main.py)

## 進め方

1. 認証の全体像を読む
2. JWT の発行と検証を読む
3. パスワードハッシュ化の意図を読む
4. `Depends()` による権限チェックの連鎖を読む

## 章構成

- [01-authentication-overview.md](01-authentication-overview.md)  
  認証がどこで設計されているか、全体図を把握する

- [02-jwt-token-flow.md](02-jwt-token-flow.md)  
  JWT の発行、保管、検証、そして API で使う流れを理解する

- [03-password-security.md](03-password-security.md)  
  パスワードをどう安全に保持するかを確認する

- [04-dependency-authorization.md](04-dependency-authorization.md)  
  `Depends()` を通した認証・認可の実際の動作を理解する

## 一番大事な見方

認証は 1 つの関数ではなく、以下の複数層の連携です。

- ユーザー登録
- パスワード検証
- JWT の生成
- Authorization ヘッダーの取得
- JWT の検証
- DB からユーザーの照合
- 有効ユーザーかの判定
- endpoint へのアクセス許可

この流れを意識すると、FastAPI の認証周りがかなり理解しやすくなります。
