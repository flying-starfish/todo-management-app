# 01. 認証の全体像

認証は、単に「ログインできるか」を扱うだけではなく、

- 誰がアクセスしているのか
- その人に権限があるのか
- どの API にアクセスしてよいのか

といった判断を行う仕組みです。

このプロジェクトでは、認証のコードは主に次の場所に分かれています。

- [backend/app/endpoints/auth.py](../../../backend/app/endpoints/auth.py)  
  ログイン、登録、ユーザー情報取得の endpoint
- [backend/app/core/dependencies.py](../../../backend/app/core/dependencies.py)  
  認証済みユーザーを取り出す依存関数
- [backend/app/core/security.py](../../../backend/app/core/security.py)  
  JWT とパスワードハッシュのロジック
- [backend/app/models/user.py](../../../backend/app/models/user.py)  
  User モデル

## まず大事な区別

### 認証と認可の違い

- 認証: 「この人は誰か」
- 認可: 「この人はこの操作をしてよいか」

このアプリでは、認証が成功すると `current_user` が特定され、
そのユーザーが有効なアカウントかどうかを確認してから endpoint に進みます。

## 実際の入口

[backend/app/endpoints/auth.py](../../../backend/app/endpoints/auth.py) では、ユーザー登録とログインが定義されています。

```python
@router.post("/register", response_model=UserSchema)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
```

```python
@router.post("/login", response_model=Token)
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
```

ここから分かるのは、

- 登録時はユーザー入力を受け取る
- ログイン時はフォーム形式の入力を受け取る
- DB を使ってユーザーの存在や情報を確認する

ということです。

## 登録の流れ

```text
Client -> POST /api/auth/register
  -> UserCreate を受け取る
  -> DB でメール重複チェック
  -> パスワードをハッシュ化
  -> User を保存
  -> 返却
```

このとき、平文パスワードをそのまま DB に保存してはいけません。

そのため、[backend/app/core/security.py](../../../backend/app/core/security.py) の `get_password_hash()` が使われます。

## ログインの流れ

```text
Client -> POST /api/auth/login
  -> username/password を受け取る
  -> email でユーザー検索
  -> パスワード検証
  -> ユーザーが有効か確認
  -> JWT を作成
  -> access_token を返す
```

ここで返る token は、次回の API リクエスト時の「身分証明書」になります。

## 認証済みユーザーの取得

認証済みユーザーは、依存関数 `get_current_user()` で決まります。

```python
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
```

この関数の役目は、

- Authorization ヘッダーから token を取得する
- JWT を検証する
- token に含まれる email を取り出す
- DB から対応するユーザーを探す
- 見つからなければ 401 を返す

です。

## 重要な原理

認証実装には必ず以下の 3 つの要素が必要です。

### 1. 秘密情報の保管

- パスワードは平文にしない
- ハッシュ化したものだけを保存する

### 2. 署名付きトークン

- クライアントが持つ token は改ざんされていないか確認する
- JWT は署名があることでその確認が可能

### 3. request ごとの照合

- API ごとに「そのユーザーが本当に存在するか」を確認する
- DB を使って再確認する

これが、API を安全に動かす原理です。

## 結論

このプロジェクトでは認証がただのログイン処理ではなく、

- 登録時のユーザー作成
- ログイン時の token 発行
- 以後の request での token 認証
- 有効ユーザー判定
- endpoint へのアクセス制御

という連鎖として構成されています。

次の章では、この流れを JWT の具体的な発行・検証フローで見ます。
