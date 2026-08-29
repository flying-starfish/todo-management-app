# 04. `Depends()` を使った認可の実装

FastAPI の強みの一つは、認証や認可を `Depends()` で自然に組み込めることです。

このプロジェクトでは、認証の依存がフックのように連なっています。

## 1. 一般的な流れ

```python
def get_todos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
```

この定義を読むと、

- `get_db` でセッションを作る
- `get_current_active_user` で認証済みユーザーを取得する
- その user を使って業務ロジックを進める

というリクエスト処理の流れを表しています。

## 2. 依存の連鎖

[backend/app/core/dependencies.py](../../../backend/app/core/dependencies.py) では、実際に次のような依存連鎖が起こります。

```python
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    ...


def get_current_active_user(current_user: User = Depends(get_current_user)):
    ...
```

以下の順で実行されます。

```text
endpoint
  -> get_current_active_user
      -> get_current_user
          -> oauth2_scheme
          -> get_db
```

つまり、認証は単独の関数ではなく、

- トークン抽出
- JWT 検証
- DB 照会
- ユーザーの有効性確認

の複数ステップで構成されます。

## 3. `Depends()` の本質

`Depends()` は、関数の引数に「依存先」を宣言する仕組みです。

これは単なる Python の引数ではなく、

- どの依存関数を先に実行するか
- 依存結果をどう受け取るか
- 例外が起きたときにどう扱うか

を FastAPI が自動で管理する仕組みです。

## 4. 認可という観点

`get_current_active_user()` は、ただのユーザー取得ではなく、

```python
if not current_user.is_active:
    raise HTTPException(status_code=400, detail="無効なユーザーです")
```

のように、"このユーザーは利用可能か" も確認しています。

これは認可の判断です。

## 5. endpoint での活用

[backend/app/endpoints/todo.py](../../../backend/app/endpoints/todo.py) では、以下のようにして認証済みユーザーを利用しています。

```python
def get_todos(
    ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
```

このときの設計思想は、

- endpoint では業務ロジックに集中する
- 認証や権限判定は依存に任せる
- 途中で失敗したら 401 や 400 を返す

というものです。

## 6. なぜ `Depends()` が強いのか

依存注入の利点は、共通処理の重複を減らせる点です。

このアプリでは、次のような共通処理が依存にまとめられています。

- DB セッションの作成と破棄
- JWT 検証
- 認証済みユーザーの取得
- アクティブ判定

重複コードを endpoit に書くのではなく、依存として分離することで

- コードの見通しが良くなる
- テストしやすくなる
- セキュリティロジックを一箇所に集約できる

という利点があります。

## 7. 例外と status code の考え方

認証失敗時は `HTTPException` を使って 401 を投げています。

```python
credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="認証情報が無効です",
    headers={"WWW-Authenticate": "Bearer"},
)
```

これは、

- 認証に失敗したときはログインが必要
- その状態を HTTP の形式で返す

という設計です。

## 8. まとめ

`Depends()` は、ただの引数の便利な書き方ではなく、

- 依存の解決
- 実行順序の管理
- 例外時の整形
- 認証と認可の共通化

を一手に担う仕組みです。

このプロジェクトのような FastAPI アプリでは、

> 認証や DB などの共通ロジックを endpoint から切り離す

ために `Depends()` が非常に有効です。

これを理解すると、FastAPI のコードを読む視点が大きく変わります。
