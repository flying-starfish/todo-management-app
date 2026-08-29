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

## 8. `Depends()` は「コードの重複」を減らすだけでなく、責務を切り分ける

このプロジェクトの認証設計では、`Depends()` により処理が次のように分離されています。

- `oauth2_scheme`: どのトークンを受け取るか
- `get_db`: DB 接続とセッション管理
- `get_current_user`: JWT を検証して user を返す
- `get_current_active_user`: user の状態を確認する
- endpoint: 実際の業務ロジックのみを書く

この分離があることで、1 つの endpoint が 100 行以上になる代わりに、

- 認証の責務
- DB の責務
- 業務ロジックの責務

がはっきり分かれます。

これは、実際の API 設計において極めて重要な設計思想です。

---

## 9. 依存の実行順序は「安全な境界」を作る

FastAPI は、関数の依存関係を自動的に解決します。

```python
def get_todos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
```

ここでの実行順序は、概念的には次のようになります。

```text
HTTP リクエスト受信
  ↓
FastAPI が route に対応する関数を決定
  ↓
依存を再帰的に解決
  ↓
get_current_active_user
    → get_current_user
        → oauth2_scheme
        → get_db
  ↓
最終的に current_user が endpoint に渡る
  ↓
業務ロジックを実行
  ↓
response を返す
```

この順序があるからこそ、endpoint の内部では「認証済みの user がすでにある」前提でロジックを書くことができます。

---

## 10. 認可の設計では、条件付きで拒否することが重要

このアプリでは、

```python
if not current_user.is_active:
    raise HTTPException(status_code=400, detail="無効なユーザーです")
```

として、ユーザーが無効化されている場合に処理を止めています。

これは、認証済みであっても次のような状態を許してはいけないからです。

- アカウント停止中のユーザー
- 退職したユーザー
- 一時無効化中のユーザー

このような条件を、認可層で明示的に拒否すること自体が、セキュリティ設計の中核です。

---

## 11. 例外設計も「認可設計」の一部

HTTP での認証失敗は `401 Unauthorized` です。

```python
credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="認証情報が無効です",
    headers={"WWW-Authenticate": "Bearer"},
)
```

ここでポイントは、

- 何が失敗したかを伝える
- HTTP の標準ステータスを使う
- クライアントが認証を再試行しやすくする

ということです。

つまり、認可の設計は単なる if 文ではなく、

- どのレベルで失敗するか
- その失敗が何の意味を持つか
- クライアントへどう返すか

まで含めて考える必要があります。

---

## 12. endpoint は「業務の入口」であり、認証ではない

認証と認可の設計を理解すると、endpoint の役割がより明確になります。

endpoint は、最終的にこのような責務を持ちます。

- 入力値の処理
- DB への読み書き
- response の整形
- 事業ロジックの実行

それ以外の認証チェックや DB セッション管理は、依存側に委譲するのが良い設計です。

### なぜこの方針がいいのか

- endpoint が長くなりすぎない
- 認証ロジックの変更が広範囲に影響しない
- 責務が明確になる
- テストがしやすくなる

これは、実際の企業開発でも重要な設計指針です。

---

## 13. `Depends()` は本当に「便利」だけではない

ここまで理解すると、`Depends()` は単なる便利な構文ではなく、

- 処理の分離
- セキュリティ境界の明確化
- 再利用可能な共通ロジック
- 依存の明示

を実現する設計手段だと見えます。

それゆえ、FastAPI を読むときには、

- endpoint の本体だけを見るのではなく
- どの依存が上流にあるのかを見る

ことが重要です。

---

## 14. 実装を深く理解するための質問例

認証・認可のコードを読むときは、次の質問が有効です。

1. この関数が誰のための依存なのか
2. どの情報が endpoint に渡されるのか
3. 何が失敗したら 401 になるのか
4. `active` や `exists` の判定はどこでやっているのか
5. DB との関係は何か
6. このパターンを別の endpoint でも使えるか

この質問を持って読むと、単なる「コード読み」ではなく、設計の意図を読む力が養われます。

---

## 15. まとめ

この章で最も重要なのは、

> `Depends()` は認証ロジックの再利用と責務分離を実現し、endpoint に安全な前提を持って入るための設計手段である

ということです。

このプロジェクトでは、

- `get_db` が DB の寿命を管理
- `get_current_user` が JWT を検証
- `get_current_active_user` が state を確認
- endpoint が業務ロジックだけを持つ

という構成になっています。

この構造を理解できると、FastAPI の認証・認可設計が非常に見えやすくなります。

次のステップとしては、WebSocket や Todo の権限管理、DB の transaction を見ていくと、さらに実際の API 設計が肌感覚として理解しやすくなります。
