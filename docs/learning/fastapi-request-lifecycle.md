# FastAPI の仕組みとリクエストの流れを理解するための整理

この資料は、FastAPI と Python の基本的な動作原理を、実際のプロジェクトコードに合わせて段階的に整理したものです。

対象ファイル:
- [backend/app/main.py](../../backend/app/main.py)
- [backend/app/core/database.py](../../backend/app/core/database.py)
- [backend/app/endpoints/todo.py](../../backend/app/endpoints/todo.py)
- [backend/app/endpoints/auth.py](../../backend/app/endpoints/auth.py)

---

## 1. 最初に結論：何が起動時に実行され、何がリクエスト時に実行されるのか

FastAPI アプリは、基本的に次の流れで動きます。

1. サーバー起動時にアプリを作る
2. URL と関数を登録する
3. リクエストが来ると、その URL に対応する関数を呼ぶ
4. 関数の返り値を HTTP レスポンスとして返す

つまり、

- `app = FastAPI()` のような初期化は起動時
- `@app.get("/api/health")` のようなルーティング定義は起動時
- その下にある関数本体は、リクエスト時に実行される

という分担になります。

---

## 2. Python のモジュールとは何か

Python では、ファイル単位でコードを分割して管理します。

```python
# 例
from app.endpoints.auth import router
```

これは、「`app/endpoints/auth.py` というモジュールを読み込んで、その中の `router` を使う」という意味です。

ここで重要なのは、

- `app` や `endpoints` や `auth` は「ファイルの階層」ではなく、「Python のモジュールの参照名」
- 実際に読み込まれるのは `.py` ファイル

という点です。

たとえばこのプロジェクトでは、たとえば

- [backend/app/main.py](../../backend/app/main.py)
- [backend/app/endpoints/auth.py](../../backend/app/endpoints/auth.py)
- [backend/app/core/database.py](../../backend/app/core/database.py)

のような `.py` ファイルがそれぞれモジュールです。

---

## 3. import は「ファイルを読む」作業であり、トップレベルコードはその時に実行される

Python では、モジュールが import されると、そのファイルのトップレベルから順番に実行されます。

たとえば [backend/app/core/database.py](../../backend/app/core/database.py) の中には、次のようなコードがあります。

```python
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./db/todos.db")
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

これは、モジュールが import されたときに一度だけ実行されます。

つまり、これは「リクエストごとに毎回動くコード」ではなく、「起動時にセットアップするコード」です。

---

## 4. 関数は定義されていても、呼ばれなければ動かない

次のようなコードは定義されているだけです。

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

この関数自体が自動的に動くわけではありません。

この関数が呼ばれるのは、FastAPI の依存注入 `Depends(...)` を介して、あるいはコードから明示的に呼ばれたときです。

そのため、

- `get_db()` の定義は起動時に見える
- でも実際に `db = SessionLocal()` が行われるのは、必要になった時

という区別が重要です。

---

## 5. FastAPI の `main.py` は入口ファイル

[backend/app/main.py](../../backend/app/main.py) を見てみると、最初に以下が行われています。

```python
app = FastAPI()
init_db()
app.include_router(todo_router, prefix="/api", tags=["todos"])
app.include_router(auth_router, prefix="/api/auth", tags=["authentication"])
```

これは、サーバー起動時に行う設定です。

- FastAPI アプリの本体を作る
- DB の初期化を行う
- どのルーターをどの URL プレフィックスで使うかを登録する

この作業が終わると、アプリはリクエストを待機状態になります。

---

## 6. URL と関数の紐づけは decorator で行う

たとえば [backend/app/main.py](../../backend/app/main.py) には、次のような関数があります。

```python
@app.get("/api/health")
async def health_check():
    ...
```

この意味は、

> GET /api/health にリクエストが来たら、この `health_check` 関数を呼ぶ

ということです。

FastAPI は、この decorator を見て、内部のルーティング表を構築します。

このため、リクエスト時の処理は次のようになります。

1. HTTP リクエストが来る
2. FastAPI が URL を見て、対応する関数を探す
3. 対応する関数を呼ぶ
4. 戻り値を JSON などに変換して返す

---

## 7. では「URL と紐づいた関数はリクエストごとに呼ばれる」のか?

はい、関数そのものはリクエストごとに呼ばれます。

ただし、

- ファイル全体が毎回実行されるわけではない
- ルーティング定義は起動時に登録される
- その後、対応する関数だけが実行される

という違いがあります。

この考え方が大事です。

---

## 8. 1つのスレッドで複数リクエストを同時に処理できるのか?

結論から言うと、1つのスレッドだけで複数のリクエストを同時に処理するのは難しく、実際には Web サーバーは複数の方法を使います。

### シングルスレッドのイメージ

```text
処理1が走っている
→ その間に処理2が来ても待つ
```

これは非効率です。

### FastAPI の実際のイメージ

Web サーバーは、通常次のような仕組みを使います。

- 複数のリクエストを受け付ける
- そのリクエストごとに処理の流れを起こす
- 待ち時間があるときは別の作業に切り替える

このような仕組みを「非同期処理」または「同時並行処理」と呼びます。

FastAPI は内部的に `asyncio` / `AnyIO` に基づいて動き、リクエストごとの待ち時間を効率的に扱います。

重要なのは、

- 「スレッドが新しく毎回立つ」と考えるより
- 「リクエストごとに処理の流れが起動される」と考える

方が、FastAPI の実装に近いということです。

---

## 9. `async def` と `def` の違い

FastAPI では、関数は次の 2 パターンがあります。

### 通常の同期関数

```python
def root():
    return {"message": "Hello"}
```

これはブロッキング処理に向いています。

### 非同期関数

```python
async def root():
    return {"message": "Hello"}
```

これは待ち時間（I/O、DB、HTTP など）がある処理に向いています。

FastAPI の公式ドキュメントでも、

- `await` を使うなら `async def`
- DB や HTTP 呼び出しのような待ちがある処理は async にする

という考え方が説明されています。

---

## 10. `database.py` のどこが起動時で、どこがリクエスト時か

[backend/app/core/database.py](../../backend/app/core/database.py) を見ると、次のような区別ができます。

### 起動時

```python
engine = create_engine(...)
SessionLocal = sessionmaker(...)
Base = declarative_base()
```

これはサーバー起動時に作られる接続基盤です。

### 起動時に呼ばれる初期化

```python
def init_db():
    from app.models.todo import Todo
    from app.models.user import User
    Base.metadata.create_all(bind=engine)
```

これはテーブル作成です。通常は起動時に 1 回だけ呼ばれます。

### リクエストごとに使う関数

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

これは、リクエストごとに新しいセッションを作ります。

FastAPI で `Depends(get_db)` を使うと、この関数が依存として呼ばれます。

---

## 11. `Depends(get_db)` は何をしているのか

[backend/app/endpoints/todo.py](../../backend/app/endpoints/todo.py) では、次のように使っています。

```python
def get_todos(
    ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
```

これは「FastAPI に対して、`get_todos` を呼ぶ前に `get_db()` を一度実行して、その戻り値を `db` に渡してね」と伝える仕組みです。

つまり、

- リクエストが来る
- FastAPI が `get_db()` を実行する
- `db` セッションが作られる
- その `db` を使ってクエリを実行する
- その後に DB セッションを閉じる

という流れです。

---

## 12. 関数の引数が「何でも受け取る」のではない

[backend/app/endpoints/todo.py](../../backend/app/endpoints/todo.py) では、次のような定義があります。

```python
class TodoCreate(BaseModel):
    title: str
    description: Optional[str] = None
    completed: bool = False
    priority: Optional[int] = 1
```

```python
def create_todo(
    todo: TodoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
```

ここで `todo: TodoCreate` は、

> 「この endpoint では JSON の body を `TodoCreate` の形として受け取る」

という意味です。

つまり、

- `title` が必要
- `completed` は bool
- `priority` は int

などが期待されます。

これらが合わない場合、FastAPI は 422 Validation Error を返します。

---

## 13. 画像やファイルを送る場合は別の受け取り方が必要

画像をそのまま JSON で送ることはできません。

通常、ファイルは `multipart/form-data` で送られます。

```python
from fastapi import UploadFile, File

@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    return {"filename": file.filename}
```

これが意味するのは、

- `Content-Type: multipart/form-data`
- ファイルを一つ受け取る
- そのファイルを `UploadFile` として扱う

ということです。

このように、FastAPI は引数の型と `Depends(...)` で、受け取る形式を自動的に判断します。

つまり、

- JSON body なら `BaseModel`
- query param なら `page: int = Query(...)`
- file なら `UploadFile = File(...)`

といったように、受け取る「型」に応じて変換されます。

---

## 14. まとめ：この教材で大事な理解ポイント

### 1. Python 的な理解

- `.py` ファイルはモジュール
- import 時にトップレベルコードが実行される
- 関数は呼ばれた時だけ動く

### 2. FastAPI 的な理解

- `app = FastAPI()` がアプリの入口
- `@app.get(...)` が URL と関数の紐付け
- リクエストが来た時に対応する関数が呼ばれる

### 3. DB の理解

- [backend/app/core/database.py](../../backend/app/core/database.py) の `engine` と `SessionLocal` は起動時にセットアップ
- `get_db()` はリクエストごとにセッションを作る依存関数

### 4. 入出力の理解

- `todo: TodoCreate` は JSON body を期待する
- `page: int = Query(...)` はクエリーパラメータを期待する
- `UploadFile = File(...)` はファイルを期待する

### 5. 実務的な理解

- ルーティング定義は起動時に登録される
- 実際の処理はリクエスト時に呼ばれる
- 関数の引数は「受け取るデータの形」を示している
- その形が違えば、FastAPI がバリデーションで弾く

---

## 15. 一番短く言うと

FastAPI の設計は次のように理解するとわかりやすいです。

> アプリ起動時に「どの URL にどの処理を対応させるか」を決め、
> リクエスト時にその対応関数を実行する。
>
> 関数の引数は、そのリクエストの期待形式を表している。

これがこの教材の本質です。

---

## 16. 次に読むとよい資料

- FastAPI 公式: First Steps
  https://fastapi.tiangolo.com/tutorial/first-steps/

- FastAPI 公式: Concurrency and async / await
  https://fastapi.tiangolo.com/async/

- このプロジェクトの入口: [backend/app/main.py](../../backend/app/main.py)
- DB 接続基盤: [backend/app/core/database.py](../../backend/app/core/database.py)
- API 実装: [backend/app/endpoints/todo.py](../../backend/app/endpoints/todo.py)

---

このドキュメントは、「なぜこのコードがそのタイミングで動くのか」を理解するための教材として整理しました。
今後、同じ観点で他のコードを読むときにも、この流れで読むと理解しやすくなります。
