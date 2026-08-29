# 01. 認証の全体像

認証は、単に「ログインできるか」を扱うだけではなく、

- 誰がアクセスしているのか
- その人に権限があるのか
- どの API にアクセスしてよいのか

といった判断を行う仕組みです。

このアプリでは、認証は「ユーザーを作る」「ログインして token をもらう」「その token を使って保護された API にアクセスする」という流れで構成されています。

---

## 1. 初学者向け：認証って何をしているのか

Web アプリで認証は、サーバー側が「このユーザーは本人か？」を確認する処理です。

たとえば、Todo アプリでは次のようなことを判断します。

- このアクセスは誰のものなのか
- ユーザーがログインしているのか
- このユーザーが Todo を編集してよいか

このプロジェクトでは、認証は大きく 3 段階に分かれています。

1. ユーザーを登録する
2. ログインして JWT を受け取る
3. JWT を使って保護された API を呼ぶ

この順番を理解すると、認証コードが一連の流れとして見えます。

---

## 2. このプロジェクトで認証が分かれている場所

このプロジェクトでは、認証のコードは主に次のファイルに分かれています。

- [backend/app/endpoints/auth.py](../../../backend/app/endpoints/auth.py)
  - ルーティング定義
  - `/register` / `/login` / `/me`

- [backend/app/core/dependencies.py](../../../backend/app/core/dependencies.py)
  - `get_current_user()`
  - `get_current_active_user()`

- [backend/app/core/security.py](../../../backend/app/core/security.py)
  - パスワードハッシュ
  - JWT の作成と検証

- [backend/app/models/user.py](../../../backend/app/models/user.py)
  - User モデル
  - DB に保存されるユーザー情報

- [backend/app/main.py](../../../backend/app/main.py)
  - アプリの全体設定
  - router の登録
  - ミドルウェアの設定

この構造が重要です。認証は 1 つのファイルに閉じていないからです。

---

## 3. 認証と認可の違い

### 認証

> 「この人は誰か」を判断すること

例:

- email と password が一致しているか
- token が正しいか
- DB にそのユーザーが存在するか

### 認可

> 「この人はその処理をしてよいか」を判断すること

例:

- 有効なアカウントか
- 自分の Todo だけを編集できるか
- 管理者権限があるか

このプロジェクトでは、

```python
def get_current_user(...):
    ...


def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="無効なユーザーです")
```

といった形で、認証と認可が分離されています。

---

## 4. 実際の入口: `/register` と `/login`

[backend/app/endpoints/auth.py](../../../backend/app/endpoints/auth.py) では、ユーザー登録とログインが定義されています。

```python
@router.post("/register", response_model=UserSchema)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
```

```python
@router.post("/login", response_model=Token)
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
```

### 登録時の流れ

```text
Client -> POST /api/auth/register
  -> UserCreate を受け取る
  -> DB でメール重複チェック
  -> パスワードをハッシュ化
  -> User を保存
  -> 返却
```

### ログイン時の流れ

```text
Client -> POST /api/auth/login
  -> username/password を受け取る
  -> email でユーザー検索
  -> パスワード検証
  -> ユーザーが有効か確認
  -> JWT を作成
  -> access_token を返す
```

ここで大事なのは、`return` として返るのがパスワードではなく「token」だという点です。

ユーザーは次回以降、パスワードを毎回送るのではなく、token を使って本人確認を行います。

---

## 5. 登録とログインの間にある設計思想

認証システムでは、平文のパスワードをそのまま扱ってはいけません。

この理由は、以下のようなリスクがあるからです。

- DB 漏えいしたときにパスワード自体が見えてしまう
- 他のサービスでも同じパスワードを使っていた場合、連鎖的に危険になる
- メモリやログに平文が残る可能性がある

そのため、このアプリでは

- `get_password_hash()` でハッシュ化
- `verify_password()` で比較

という形を採用しています。

ここが認証の基本設計です。

---

## 6. 認証済みユーザーを決める依存関数

ログインが成功すると、クライアントは `access_token` を持ちます。

その token を使って API を呼ぶと、FastAPI は `Depends(get_current_user)` を使って現在のユーザーを特定します。

```python
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
```

この関数は、次の順で情報をたどります。

```text
Authorization ヘッダー
  ↓
Bearer token を抽出
  ↓
JWT を検証
  ↓
payload の email を取り出す
  ↓
DB からユーザーを探す
  ↓
見つかったユーザーを返す
```

ここで「見つからない」「期限切れ」「改ざんされている」場合は 401 を返します。

つまり、認証は「リクエストごとに本人確認をやり直す」仕組みです。

---

## 7. なぜ `Depends()` が重要なのか

`Depends()` は、API の endpoint 関数に対して「この依存が必要だ」と宣言するものです。

例えば、Todo の API では次のように使われます。

```python
def get_todos(
    ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
```

ここで重要なのは、

- `db` は DB セッション
- `current_user` は認証済みユーザー

が自動的に用意されることです。

この設計により、各 endpoint は「自分の業務ロジック」に集中できます。

認証の処理は依存関数にまとめられ、endpoint には必要な情報だけが渡されます。

---

## 8. 3つの重要な役割を持つ認証設計

このアプリの認証設計には、次の 3 つが明確にあります。

### 1. ユーザーの識別

- email などでユーザーを特定する
- DB から対応する user を見つける

### 2. 難読化された秘密情報

- パスワードは平文で保存しない
- hash で比較する

### 3. request ごとの真偽確認

- token を検証する
- DB と照合する
- 有効なユーザーか確認する

この 3 つが揃って初めて、"実際に安全な認証" が成立します。

---

## 9. 1つの認証フローを全体図で見る

```text
ユーザー登録
  Client -> POST /api/auth/register
  -> email + password を受け取る
  -> パスワードをハッシュ化
  -> DB に保存

ログイン
  Client -> POST /api/auth/login
  -> email + password を受け取る
  -> DB からユーザーを探す
  -> パスワードを検証
  -> JWT を発行
  -> access_token を返す

保護 API
  Client -> GET /api/todos
  -> Header: Authorization: Bearer <token>
  -> FastAPI が token を抽出
  -> JWT を検証
  -> DB からユーザーを照合
  -> endpoint 実行
```

この図は、認証が単独の処理ではなく、登録・ログイン・保護 API の連携で成り立っていることを示しています。

---

## 10. 深い理解のための見方

初心者向けに一番わかりやすい見方は、次のように考えることです。

> 認証は「本人確認」そのものではなく、
> 「その人が本当に今このアプリに入れる権利があるか」を継続的に確認している仕組みである

つまり、認証は 1 回きりの処理ではなく、

- 登録時
- ログイン時
- API リクエスト時

のたびに検証されます。

この「毎回確認する」という姿勢が、Web アプリのセキュリティの骨格です。

---

## 11. 次に読むべきテーマ

次の章では、JWT の発行と検証を詳細に見ます。

- [02-jwt-token-flow.md](02-jwt-token-flow.md)

ここでは、

- `create_access_token()`
- `verify_token()`
- `Authorization` header
- `sub` と `exp`

の実際の意味を掘り下げていきます。

---

## 12. まとめ

この章の一番大事なポイントは、認証が「ただのログイン画面」ではなく、

- ユーザーを認識する
- パスワードを安全に扱う
- その人が今アクセスしてよいかを毎回確認する

というシステム設計であるということです。

この見方ができると、FastAPI の `Depends()` や JWT、DB 照会が全部つながって見えます。

認証は、単なる機能ではなく、アプリ全体のセキュリティの基盤です。
