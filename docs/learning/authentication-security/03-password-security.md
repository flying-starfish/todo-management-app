# 03. パスワードはどう安全に保管されるか

パスワードを安全に扱うことは、認証システムの最優先事項です。

このプロジェクトでは、平文のパスワードは保存せず、ハッシュ化して保存します。

## 1. なぜ平文保存が危険なのか

もし DB に平文パスワードが入っていると、以下のリスクがあります。

- DB が漏洩したときにそのまま漏れる
- 管理者が見えないようにしても不正利用可能
- ほかのサービスで同じパスワードを使っている場合、連鎖被害になる

このため、パスワードは一方向変換される必要があります。

## 2. `get_password_hash()` の役割

[backend/app/core/security.py](../../../backend/app/core/security.py) では、

```python
def get_password_hash(password: str) -> str:
    return ph.hash(password)
```

という実装があります。

`PasswordHasher` は Argon2 を使っています。

Argon2 は、一般に bcrypt より強いハッシュとして知られています。

## 3. 一方向性の意味

パスワードをハッシュ化すると、元の値を逆引きできません。

つまり、

- ログイン時に入力された平文パスワードをハッシュ化
- DB に保存されているハッシュと比較
- 一致したら正しいパスワードと判断

という仕組みです。

## 4. `verify_password()` の中身

```python
def verify_password(plain_password: str, hashed_password: str) -> Tuple[bool, bool]:
    if _is_argon2_hash(hashed_password):
        ph.verify(hashed_password, plain_password)
        needs_rehash = ph.check_needs_rehash(hashed_password)
        return True, needs_rehash
    elif _is_bcrypt_hash(hashed_password):
        is_valid = bcrypt.checkpw(...)
        return is_valid, is_valid
```

ここで重要なのは、

- 既存の bcrypt ハッシュも読み取れる
- Argon2 の新しいハッシュにも対応する
- 既存ユーザーが古いハッシュなら再ハッシュする

という点です。

## 5. bcrypt から Argon2 への移行

このプロジェクトでは、古い bcrypt パスワードを Argon2 に再ハッシュする処理が入っています。

```python
if needs_rehash:
    user.hashed_password = get_password_hash(form_data.password)
    db.commit()
```

これは、

- セキュリティを強化する
- 既存ユーザーの認証を壊さない
- 徐々により安全な方式へ移行する

ための工程です。

## 6. パスワード検証を理解するための図

```text
Client input password
  ↓
plain password
  ↓
Argon2 hash compare
  ↓
match? yes/no
  ↓
ログイン許可 / 拒否
```

これは、DB から取り出したハッシュと入力値を比較するだけで、
平文のパスワードそのものを保存しなくて済むようにしています。

## 7. なぜ「再ハッシュ」が必要なのか

パスワードアルゴリズムは年々強化されます。昔の bcrypt から、今は Argon2 が推奨されるケースが多いです。

もし古いハッシュ方式のままで放置すると、

- 将来の攻撃に脆弱になる
- セキュリティ基準が変わったときに追いつけない

といった問題が起きます。

そのため、`needs_rehash` を見て、必要なときだけ更新を行う設計が有効です。

## 8. 認証は「安全な保存」と「安全な比較」の両方が必要

このプロジェクトでは、

- 保存時: `get_password_hash()`
- 照合時: `verify_password()`

という 2 つのフェーズを分けて設計しています。

これは、認証の基本原理です。

> パスワードの比較は平文で行わず、ハッシュ化した値で比較する

これが安全なシステムの土台になります。

## 9. まとめ

パスワードの取り扱いは、認証システムの「信頼性」を決める根幹です。

このプロジェクトでは、

- 平文保存を避ける
- Argon2 を採用する
- 既存 bcrypt も互換性のために受け入れる
- ログイン時に安全に比較する
- 必要に応じて再ハッシュする

といった考え方が入っています。

これは、実務的に非常に重要な設計です。
