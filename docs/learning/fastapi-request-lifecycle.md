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

## 17. 実際のリクエストがどのように流れるかを、今のプロジェクトで見てみる

ここからは、今回のコードを例にして、1 回のリクエストがどの順番で通るかを整理します。

### 例: Todo 一覧を取得する

[backend/app/endpoints/todo.py](../../backend/app/endpoints/todo.py) には、次のようなエンドポイントがあります。

```python
@router.get("/todos", response_model=dict)
def get_todos(
    page: int = Query(1, ge=1),
    limit: int = Query(5, ge=1),
    search: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
```

この関数が呼ばれる流れは、概念的には次の通りです。

```text
ブラウザ or API Client
      ↓
GET /api/todos?page=1&limit=5
      ↓
FastAPI が URL を照合
      ↓
get_todos 関数を選択
      ↓
FastAPI が Depends(get_db) を実行
      ↓
DB セッションを作成
      ↓
query parameter を読み取る
      ↓
SQLAlchemy で DB を検索
      ↓
結果を dict に整形して返す
      ↓
HTTP レスポンスとして返却
```

ここで重要なのは、

- 関数の引数 `page`, `limit`, `search` は URL から読み込まれる
- `db` は `Depends(get_db)` によって自動的に注入される
- `current_user` は JWT 認証の依存関数によって自動的に引かれる

という点です。

---

## 18. 1 回のリクエストにおける3つの視点

リクエストを理解するときは、次の 3 つを分けて見るとわかりやすいです。

### 1. 誰が起動するのか

- `uvicorn` や FastAPI のアプリが待機している
- リクエストが来ると、その URL に対応する関数が起動する

### 2. 何を受け取るのか

- URL の path
- query parameter
- JSON body
- headers
- cookies
- file

### 3. 何を返すのか

- dict
- JSON
- Pydantic モデル
- HTTP status code
- error response

この 3 つを意識すると、関数の定義が「何のためのものか」が見えやすくなります。

---

## 19. 目で見るとわかりやすい全体図

```text
Client
  │
  │ HTTP request
  ▼
FastAPI app
  │
  ├─ URL で path を照合
  ├─ path parameter / query parameter を読込
  ├─ request body を Pydantic で検証
  ├─ Depends(...) を実行
  │    ├─ get_db() で Session を作成
  │    └─ get_current_active_user() で認証確認
  │
  ├─ DB へアクセス
  ├─ 処理結果を返却データに整形
  └─ HTTP response を返す
```

この図で大切なのは、

- URL の照合
- データの解析
- DB へのアクセス
- レスポンスの整形

が、順番に行われるということです。

---

## 20. よくある誤解と正しい見方

### 誤解 1: main.py 全体が毎回実行される

違います。

- `main.py` のトップレベルコードは起動時に実行される
- ルート関数だけがリクエスト時に毎回動く

### 誤解 2: 引数が何でも受け取れる

違います。

- `todo: TodoCreate` は JSON body を期待する
- `page: int = Query(...)` は query parameter を期待する
- `file: UploadFile = File(...)` はファイルを期待する

### 誤解 3: DB 接続コードがリクエストごとにファイル自体を読む

違います。

- DB の接続設定は起動時に作る
- 実際のセッションはリクエストごとに作る

---

## 21. 学習時に見るべき観点チェックリスト

コードを読むときは、次の順番で見ると理解しやすくなります。

1. これは起動時か、リクエスト時か
2. どの URL と結びついているか
3. 引数は何を期待しているか
4. どこで DB を使っているか
5. どこで認証や依存注入が入るか
6. 最後に何を返しているか

この順番で見ると、FastAPI の構造がかなり見えやすくなります。

---

## 22. 最後に：この資料の狙い

この資料は、単に「コードの意味」を説明するためだけではなく、

- どのコードが起動時に動くのか
- どのコードがリクエストごとに動くのか
- どこで URL と関数が結びつくのか
- どこで入力チェックされるのか
- どこで DB や認証が介在するのか

を、実際のプロジェクトコードを通して学ぶためのものです。

この視点が身につくと、FastAPI だけでなく、他の Web フレームワークも読みやすくなります。

---

## 23. まとめ

FastAPI を読み解くときの基本は、次の 1 文に集約できます。

> 「起動時にアプリを組み立て、リクエスト時に URL に対応する関数を呼び、関数の引数がそのリクエストの形を定義する」

これがこの資料の中心です。

---

## 24. さらに深く見る：FastAPI は「ASGI アプリ」である

ここまでの理解をもう一段踏み込むと、FastAPI はただの関数呼び出しではなく、ASGI というイベント駆動のインターフェースの上で動いていることが見えてきます。

ASGI は、Web サーバーとアプリケーションの間で、次のようなイベントをやり取りする仕組みです。

```text
Client
  ↓
uvicorn / ASGI server
  ↓
FastAPI app
  ↓
request handler
  ↓
response
```

重要なのは、FastAPI が「HTTP リクエストごとに新しい OS スレッドを作る」わけではなく、

- 1 つのプロセス内でイベントループが動いている
- I/O 待ちのときは別の処理へ切り替える
- その結果として複数リクエストを効率的に扱える

という点です。

つまり、`async def` は「ブロックしないで待てる」という意味で、DB や HTTP 通信のような待ち時間がある処理に向いています。

このプロジェクトでは、エンドポイントの実装は `def` で書かれているものもありますが、そこでも FastAPI は依存注入や Pydantic の処理を裏で管理しています。実際に「その関数が同期処理か非同期処理か」で全部が決まるわけではなく、FastAPI のライブラリ側が適切に扱ってくれます。

---

## 25. ミドルウェアはどこで動くのか

[backend/app/main.py](../../backend/app/main.py) には次のようなコードがあります。

```python
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response
```

これは、リクエストが実際の endpoint に到達する前後で処理を挟む仕組みです。

### 実行順序のイメージ

```text
リクエスト受信
  ↓
middleware A
  ↓
middleware B
  ↓
endpoint
  ↓
middleware B の後処理
  ↓
middleware A の後処理
  ↓
レスポンス返却
```

このプロジェクトでは、

- セキュリティヘッダーの追加
- ログ出力
- CORS 設定

がすべてミドルウェアとして挿入されています。

これは「エンドポイントごとにロジックを毎回書く」のではなく、共通の横断的処理を一箇所で管理できる設計です。

### 重要な視点

ミドルウェアは、

- リクエストの前処理
- 認可・監査ログ
- 例外の吸収
- HTTP ヘッダーの付与
- レスポンスの加工

に使われます。

エンドポイント関数だけを見ると本当の処理の全体像が見えにくくなるため、FastAPI のコードを読むときは、`main.py` のミドルウェアとエンドポイントの両方を見るのが重要です。

---

## 26. `Depends()` は単なる引数ではない

依存注入は、FastAPI で非常に重要な概念です。

たとえば [backend/app/core/dependencies.py](../../backend/app/core/dependencies.py) には次のようなコードがあります。

```python
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    email = verify_token(token)
    user = db.query(User).filter(User.email == email).first()
    return user
```

これは「この関数が必要とする依存関係」を宣言しているだけでなく、FastAPI がそれらを自動的に解決して実行順を管理する仕組みです。

### 実際の呼び出し関係

```text
get_todos()
  → Depends(get_current_active_user)
      → Depends(get_current_user)
          → Depends(oauth2_scheme)
          → Depends(get_db)
```

このように、依存はネストできます。

- `oauth2_scheme` は Authorization ヘッダーから token を抽出
- `get_db` は DB セッションを作成
- `get_current_user` は token を検証してユーザーをロード
- `get_current_active_user` はユーザーが有効か確認

この chain が、認証済みユーザーの取得の本体です。

### なぜ強力なのか

依存注入により、以下のような共通ロジックを一箇所に集約できます。

- 認証
- DB セッション管理
- パラメータバリデーション
- 監査ログ
- 権限チェック

この設計により、各 endpoint は「何をするか」に集中でき、重複コードを減らせます。

---

## 27. `response_model` と `BaseModel` は何をしているのか

Pydantic は FastAPI の中核です。

例えば、Todo の作成時に `TodoCreate` を受け取り、`TodoResponse` を返す構造があります。

```python
class TodoCreate(BaseModel):
    title: str
    description: Optional[str] = None
    completed: bool = False
```

```python
@router.post("/todos", response_model=TodoResponse)
def create_todo(...):
    ...
```

このとき、FastAPI は次の 2 つを行っています。

1. リクエスト JSON を `TodoCreate` に変換しようとする
2. 変換できない場合は 422 を返す

さらに、`response_model` により、返り値を `TodoResponse` の形に整形します。

つまり、

- 入力は「安全な型」に変換される
- 出力は「一定のスキーマ」に整形される

ということです。

これが FastAPI で API の信頼性が高い理由の一つです。

### 重要な考え方

Pydantic は「型の宣言」を実行時に検証する仕組みです。

```python
title: str
completed: bool
priority: Optional[int]
```

この宣言があることで、

- `title` が文字列でない
- `completed` が bool でない
- `priority` が null や文字列になっている

といった問題を、アプリケーションのロジックへ入る前に弾けます。

---

## 28. なぜ `UploadFile` のような型が必要なのか

画像や PDF などのファイルを扱う場合は、通常の JSON とは違うやり方が必要です。

```python
from fastapi import UploadFile, File

@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    return {"filename": file.filename}
```

ここでは、

- `Content-Type: multipart/form-data`
- 1 つのファイルを受け取る
- そのファイルをストリームとして扱う

という前提が必要です。

### 典型的な違い

- JSON body: `{"title": "買い物"}` のような構造
- form-data: ファイル本体とメタデータが別に存在する
- `UploadFile`: ファイルを安全に読み込み、保存や検証の対象にできる

この違いがあるので、FastAPI は `BaseModel` だけではなく `UploadFile = File(...)` のような入力形式を用意しています。

ファイルをそのまま文字列 JSON で扱うと、画像データが壊れたり、巨大なペイロードになったりするためです。

---

## 29. リクエストオブジェクトは「本体」ではなく「入口」

FastAPI のエンドポイント関数は、通常はデータを型付きで受け取りますが、本当に重要なのは、その前に `Request` オブジェクトがどこにあるかです。

```python
from fastapi import Request

@app.get("/debug")
async def debug(request: Request):
    print(request.method)
    print(request.url)
    print(request.headers)
    return {"ok": True}
```

`Request` は、

- HTTP メソッド
- URL
- headers
- cookies
- client info
- body

などの情報を持つ「リクエストの入口」です。

FastAPI は内部でこの `Request` を正規化し、

- path params
- query params
- body
- file
- headers

といった情報を抽出して、関数に渡します。

つまり、エンドポイント関数の引数は、`Request` の中から必要な情報を取り出す「窓」のような役割を持っています。

---

## 30. 認証と DB 依存は、実際には連鎖した依存関数として動く

このプロジェクトでは、認証の仕組みが依存の連鎖として構成されています。

[backend/app/core/dependencies.py](../../backend/app/core/dependencies.py) のコードを見てみると、次の順番で処理されています。

```python
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    email = verify_token(token)
    user = db.query(User).filter(User.email == email).first()
    return user
```

そして、

```python
def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="無効なユーザーです")
    return current_user
```

このように、

- Authorization header があるか確認
- JWT を検証
- DB からユーザーを検索
- そのユーザーが有効か確認
- 最終的に endpoint に渡す

という流れになります。

### 実務的に重要なこと

この設計では、各 endpoint は「認証済みユーザーを使う」ことを宣言するだけで済みます。

```python
def get_todos(
    ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
```

こうすることで、

- 認証ロジックの重複を減らす
- 例外を一箇所で統一する
- セキュリティ責務を共通化する

といった利点があります。

---

## 31. `init_db()` は何をしているのか

[backend/app/core/database.py](../../backend/app/core/database.py) にある `init_db()` は、アプリ起動時に呼ばれるセットアップ関数です。

```python
def init_db():
    from app.models.todo import Todo
    from app.models.user import User

    Base.metadata.create_all(bind=engine)
```

これは、

- `Todo` モデルをインポート
- `User` モデルをインポート
- SQLAlchemy の metadata に登録されているテーブルを生成

という処理です。

### なぜ必要か

DB にテーブルがなければ、`SELECT` や `INSERT` の対象がありません。

この処理は、Docker やローカル開発環境でアプリを起動したときに、最低限必要なテーブル構造を作る役割を持っています。

### 実はこれも「起動時」と「リクエスト時」の分離

- 起動時: `engine`, `SessionLocal`, `Base`, `init_db()`
- リクエスト時: `get_db()` で DB セッションを作る

この対比が、FastAPI アプリの設計を理解する上で特に重要です。

---

## 32. `SessionLocal` はなぜ request ごとに作るのか

[backend/app/core/database.py](../../backend/app/core/database.py) には次がありました。

```python
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

この `SessionLocal` は、SQLAlchemy の「DB との会話用オブジェクト」を作るための factory です。

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

ここで重要なのは、

- DB セッションは「使い捨て」であること
- 1 リクエストにつき 1 セッションを作ることが多いこと
- 最後に必ず閉じること

です。

### なぜ閉じる必要があるのか

セッションを閉じないと、

- 接続が残る
- 予期しない状態が保持される
- 競合が起きる
- メモリや DB 接続数が枯渇する

といった問題が起こりえます。

FastAPI の `yield` を使った依存関数は、リクエストの終わりで `finally` が実行される構造になっているので、リソースの解放が自然に行われます。

---

## 33. どこまでが「定義」なのか、どこからが「実行」なのか

このテーマは、初学者が最初に躓きやすい部分です。

```python
@app.get("/todos")
def get_todos():
    return {"ok": True}
```

このコードを見たとき、

- `@app.get("/todos")` は「定義」
- `def get_todos():` は「関数の定義」
- 実際に `/todos` にアクセスしたときに初めて処理が実行される

という区別が必要です。

### 典型的な誤解

「python ファイルを起動したら、全部の関数が毎回呼ばれるのでは？」

これは違います。

- 関数本体は定義された瞬間に動かない
- ルート関数はその名前がアプリに登録されるだけ
- 実際に要求が来た後に呼ばれる

### 重要な見方

アプリを起動するときにやることと、リクエストが来たときにやることは分離されています。

- 起動時: `FastAPI()`、ルーティング登録、DB 初期化
- リクエスト時: ルーティングされた関数の実行、`Depends` の解決、DB 参照、レスポンス生成

この分離の意識が、FastAPI を読む上で最も重要です。

---

## 34. 実際のコードを読むときの黄金ルール

FastAPI のコードを読むときは、次の順で読むと読みやすくなります。

### 1. 入口を読む

- [backend/app/main.py](../../backend/app/main.py)
- ここで `FastAPI()` が作られ、router が登録される

### 2. 依存を読む

- [backend/app/core/database.py](../../backend/app/core/database.py)
- [backend/app/core/dependencies.py](../../backend/app/core/dependencies.py)
- ここで DB セッションや認証の仕組みが定義される

### 3. endpoint を読む

- [backend/app/endpoints/todo.py](../../backend/app/endpoints/todo.py)
- [backend/app/endpoints/auth.py](../../backend/app/endpoints/auth.py)
- ここで具体的な API ロジックが書かれる

### 4. モデルを読む

- [backend/app/models](../../backend/app/models)
- ここでデータ構造が定義される

### 5. 実行順を想像する

- リクエストが来る
- 何を受け取るか
- 認証や DB が動くか
- どんなレスポンスが返るか

この順番で見ると、FastAPI の構造が頭の中で自然に繋がります。

---

## 35. 一番重要な理解のまとめ

FastAPI は、ただ「URL と関数を結びつける仕組み」ではなく、次のような層を持つアーキテクチャです。

- HTTP 受信層
- ミドルウェア層
- ルーティング層
- 依存注入層
- バリデーション層
- DB 層
- レスポンス整形層

この層がすべて連携して、1 回の API リクエストが成立します。

つまり、たった 1 つの endpoint 関数を見ても、その背後にある仕組みがすべて存在していることがわかります。

---

## 36. 最後に

この資料は、FastAPI の「表面的な書き方」ではなく、

- どこで何が起きるのか
- なぜその順番で呼ばれるのか
- なぜ `Depends()` が必要なのか
- なぜ `BaseModel` が必要なのか
- なぜ DB セッションを request ごとに作るのか

という本質を理解するためのものです。

この視点を持つと、単純な API のコードが、実は「リクエスト処理の設計図」そのものとして見えてきます。

次の学習では、

- JWT 認証の中身
- SQLAlchemy の transaction と query
- WebSocket の接続とイベント送信
- フロントエンドからの API 呼び出しフロー

を同じ観点で読み解くと、さらに理解が深まります。

---

このドキュメントは、初学者が「何が起こっているのか」を見えるようにするための教材であり、さらに上級者が「設計の意図」を読み解くための資料としても使えるように整理しています。
