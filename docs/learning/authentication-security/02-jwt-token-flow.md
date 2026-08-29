# 02. JWT の発行と検証の流れ

JWT は、"認証されたユーザーが誰か"を伝えるためのトークンです。

このプロジェクトでは、JWT は [backend/app/core/security.py](../../../backend/app/core/security.py) で定義されています。

## 1. JWT の作り方

```python
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```

この関数では、以下を行っています。

- payload にユーザー情報を入れる
- 有効期限を付与する
- 秘密鍵で署名する
- 文字列として返す

このプロジェクトでは、ログイン時に次のように使われます。

```python
access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
```

ここで `sub` は Subject の意味で、通常はユーザー識別子です。

## 2. JWT に含まれる情報

JWT は典型的に次のような形です。

```text
header.payload.signature
```

実際には base64 でエンコードされた文字列です。

例:

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

このトークンは、

- どのユーザーか
- いつまで使えるか

を含みます。

## 3. JWT の検証

次のコードで検証されます。

```python
def verify_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return email
    except JWTError:
        return None
```

この処理では、

- 署名が正しいか確認する
- 期限切れでないか確認する
- `sub` に user email が含まれているか確認する

を行っています。

## 4. Authorization ヘッダーとの関係

[backend/app/core/dependencies.py](../../../backend/app/core/dependencies.py) の `oauth2_scheme` は次のように定義されています。

```python
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")
```

この設定により、

- フロントエンドが `Authorization: Bearer <token>` を付ける
- FastAPI が自動的に token を取り出す
- その token を `get_current_user()` に渡す

という流れが成立します。

## 5. request の流れの例

```text
Client
  -> POST /api/auth/login
  -> response: {"access_token": "abc", "token_type": "bearer"}

次の request:
Client
  -> GET /api/todos
  -> Header: Authorization: Bearer abc
  -> FastAPI が token を抽出
  -> verify_token() で署名確認
  -> DB から user を検索
  -> endpoint 実行
```

このとき、パスワードそのものを毎回送る必要はありません。

トークンの検証だけで、本人確認が可能になります。

## 6. なぜ JWT なのか

JWT は、サーバー側でセッションを毎回保存しなくても、

- どのユーザーか
- いつまで有効か

をクライアント側に持たせられる点が利点です。

ただし、JWT には注意点もあります。

- 秘密鍵が漏れると偽造可能になる
- ユーザー削除後も token が有効な場合がある
- 有効期限を設定しないと長期間使え続ける

このプロジェクトでも `exp` が付与されているので、期限管理が入っています。

## 7. JWT と DB の関係

JWT だけで十分ではありません。実際には、

```python
user = db.query(User).filter(User.email == email).first()
```

のように DB でユーザーを再照会しています。

つまり、JWT は "証拠" であり、DB は "真実" です。

- token が正しいか
- そのユーザーが今も存在するか
- そのユーザーが無効化されていないか

は DB で最終確認されます。

## 8. JWT は「証拠」であり、「真実」ではない

JWT は非常に便利ですが、実際の運用では「JWT が正しいから、そのユーザーを信用してよい」という扱いをしてはいけません。

このプロジェクトでは、

```python
email = verify_token(token)
user = db.query(User).filter(User.email == email).first()
```

のように、JWT を検証したあとに DB を見ています。

つまり、JWT は「自分の主張をしている証拠」ですが、最終的に誰なのかを確定させるのは DB です。

### 重要な設計意図

- JWT で「この人はログイン済みだ」と主張させる
- DB で「そのユーザーが実際に存在しているか」を確認する
- そのユーザーが無効化されていないかを確認する

この順番でチェックすることで、単に token が有効なだけではなく、実際のアカウント状態にも対応しています。

---

## 9. JWT を信頼する時の境界線

JWT は署名が正しいかどうかを検証できますが、署名が正しければ 100% 安全というわけではありません。

以下の条件が揃うと、トークンの意味が変わります。

- 秘密鍵が安全に保管されている
- 発行されたトークンに必要な情報が入っている
- 有効期限が設計されている
- 失効やログアウトが考慮されている
- DB で再照会している

このプロジェクトでは「署名の整合性確認」と「DB 照合」を両方行うことで、信頼の境界が明確になっています。

---

## 10. `exp` は単なる日時設定ではない

JWT の `exp` は、「このトークンはこの時刻まで有効」とする値です。

このプロジェクトの `create_access_token` では、

```python
expire = datetime.utcnow() + expires_delta
to_encode.update({"exp": expire})
```

のように設定されています。

これは、

- 長期間の不正利用を防ぐ
- もし漏えいしても寿命がある
- 失効を制御しやすい

という意味があります。

### 重要な実務知識

トークンに有効期限がないと、

- 漏えいした token が永遠に使える
- 退職者や無効化ユーザーの token が長く残る
- セキュリティ事故の影響範囲が大きくなる

という問題が起きます。

---

## 11. `sub` に email を入れる意味

このプロジェクトでは、

```python
create_access_token(data={"sub": user.email})
```

のように `sub` に email を入れています。

これは、

- token だけでユーザーの識別子が分かる
- その後の検証で `payload.get("sub")` を取り出せる
- DB で `email` に対応するユーザーを探せる

という形です。

### ここでの設計上の利点

- `id` を token に埋め込むより、メールと照合しやすい
- 既存のユーザー情報と整合しやすい
- API のほとんどが email ベースの扱いに近い

一方で、メールアドレスは変更可能な値でもあるため、
運用上は `user.id` を主キーとして使う設計の方がより厳密なケースもあります。

このプロジェクトでは、実装の簡潔さと既存の設計に合わせて email を `sub` として使っています。

---

## 12. JWT を使うときに起こりやすい誤解

### 誤解 1: JWT があれば本人認証は完了している

違います。JWT はあくまで「署名済みの主張」であり、
その後に DB 照合や有効ユーザー確認が必要です。

### 誤解 2: JWT を平文にしても大丈夫

違います。header.payload.signature はベース64で見えるので、
秘密鍵が漏れると偽造可能です。

### 誤解 3: JWT の検証だけで十分

違います。実際に API が使う前に、ユーザーの状態や権限を再確認するのが安全です。

---

## 13. なぜ `Authorization: Bearer ...` なのか

HTTP の標準に従って、認証トークンは通常 `Authorization` header に入れます。

```text
Authorization: Bearer <token>
```

この形式は、

- どの認証方式を使っているかが明示できる
- 他の方式と区別できる
- HTTP 標準仕様に沿っている

という利点があります。

FastAPI の `OAuth2PasswordBearer` はこの慣習を前提にしているので、
`Bearer` 形式で token を渡すのが自然になります。

---

## 14. JWT は「認証の入口」であり、API の保護はその先にある

JWT はエンドポイントに入る前の「本人確認」の入口です。

それだけで API のアクセス制御が完成するわけではなく、
実際には次の 3 つが必要です。

1. token の妥当性確認
2. その token に対応するユーザーの存在確認
3. ユーザーが valid / active であるかの確認

この 3 段階を踏むことで、トークンだけを信じる脆弱な設計を避けられます。

---

## 15. 高度な観点: セキュリティモデルとしての JWT

JWT は、

- システム間での stateless な認証
- API サーバーの冪等な識別
- 一時的な承認証明

として使われることが多いです。

ただし、stateless アーキテクチャが万能ではないのと同様に、
JWT は指摘される限界もあります。

- トークンの失効が難しい
- 退職や権限変更への追従が遅れる
- ロール変更を即座に反映しにくい

このアプリでは DB での再照会により、その制約を緩和しています。

つまり、

> JWT を使うが、DB で状態を検証する

という設計が、そのままセキュリティの実務形態になっています。

---

## 16. まとめ

JWT は、FastAPI アプリにおける「本人確認の鍵」ですが、
本当に安全なのはその後にある検証処理です。

このプロジェクトで重要なのは、

- token は署名・期限・形式を確認する
- その token の `sub` から user を探す
- DB でユーザーの存在と状態を再確認する
- endpoint が実行可能かどうかを判断する

という構造です。

この流れを理解できると、JWT をただの文字列としてではなく、
API セキュリティの設計上の重要な要素として捉えられるようになります。

次の章では、パスワードを安全に保存する設計を見ていきます。
