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

## 8. まとめ

JWT は、API の「本人確認」を安全に行うための仕組みです。

- ログインで発行
- request の header に含める
- FastAPI が自動で抽出
- 署名と期限を検証
- DB でユーザーを照合
- その結果が endpoint で利用される

この流れを理解できると、認証周りのコードが「ただのトークン文字列」ではなく、
実際に安全なアクセス制御を実現している仕組みとして見えます。
