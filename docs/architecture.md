# アーキテクチャ・ディレクトリ構成ガイド

このドキュメントは「どこに何があるか」だけでなく、「なぜそこに置いたか」「その層はどんな役割を担っているか」を解説します。
コードを読む前にここを読むと、全体像を把握しやすくなります。

---

## 全体構成

```
todo-management-app/
├── backend/          # FastAPI による API サーバー
│   ├── app/          # アプリケーション本体
│   ├── alembic/      # DB マイグレーション管理
│   └── tests/        # テストコード
├── frontend/         # React + Vite による SPA
│   └── src/          # アプリケーション本体
├── docs/             # ドキュメント
├── nginx/            # 本番用リバースプロキシ設定
├── docker-compose.yml          # 開発用 Compose
└── docker-compose.prod.yml     # 本番シミュレート用 Compose
```

---

## バックエンド構成（`backend/app/`）

### ディレクトリツリー

```
app/
├── main.py                   # アプリケーションエントリーポイント
├── core/                     # アプリ全体で使う横断的な基盤
│   ├── config.py             # 環境変数・設定管理
│   ├── database.py           # DB 接続とセッション管理
│   ├── dependencies.py       # 認証ミドルウェア（DI）
│   ├── security.py           # パスワード・JWT トークン処理
│   └── connection_manager.py # WebSocket 接続管理
├── endpoints/                # API エンドポイント（HTTP/WS）
│   ├── auth.py               # 認証（登録・ログイン）
│   ├── todo.py               # Todo CRUD
│   └── websocket.py          # リアルタイム通信
├── models/                   # DB テーブル定義（SQLAlchemy）
│   ├── user.py               # users テーブル
│   └── todo.py               # todos テーブル
└── schemas/                  # API 入出力の型定義（Pydantic）
    └── user.py               # ユーザー関連スキーマ
```

---

### 各層の役割と設計理由

#### `main.py` — エントリーポイント

FastAPI アプリのインスタンス生成、ミドルウェア設定、ルーター登録を行う1ファイルです。

- ここに業務ロジックは書かない
- 「どのルーターを、どのプレフィックスで登録するか」という配線だけを担う

**なぜ1ファイルにまとめるか**: アプリの起動設定を1か所に集約することで、全体の構成が俯瞰しやすくなります。

---

#### `core/` — 横断的な基盤層

複数のエンドポイントや機能から共通で利用されるコードを置く層です。
業務ロジックではなく、「インフラ的な関心」を集めた場所です。

| ファイル | 役割 |
|----------|------|
| `config.py` | 環境変数を読み込んで設定オブジェクトを提供する。`ENVIRONMENT`, `SECRET_KEY`, CORS 設定, CSP 設定などを管理する |
| `database.py` | SQLAlchemy の DB エンジンとセッションを生成する。DATABASE_URL の `postgres://` → `postgresql://` 変換など、接続の差異を吸収する役割も担う |
| `dependencies.py` | エンドポイントが `Depends(get_current_user)` と書くだけで認証チェックを挟める仕組みを提供する。FastAPI の依存性注入（DI）を活用した認証ミドルウェア |
| `security.py` | パスワードのハッシュ化（Argon2）・検証、JWT トークンの生成・検証を担う。`endpoints/` に混ぜず分離することで、ロジックの再利用とテストがしやすい |
| `connection_manager.py` | WebSocket 接続の管理（接続登録、切断、ユーザー別配信）を担う。HTTP エンドポイントと WebSocket エンドポイントの両方から使えるよう、グローバルなシングルトンとして提供する |

**なぜ `core/` に分けるか**: セキュリティ・DB・設定といった横断関心をエンドポイントに混在させると、変更時の影響範囲が見えにくくなります。`core/` に分離することで「業務処理はどこか」「インフラ処理はどこか」が明確になります。

---

#### `endpoints/` — API エンドポイント層

HTTP リクエストを受け取り、レスポンスを返す層です。
ここには「何のルートが存在するか」「どの操作を受け付けるか」を書きます。

| ファイル | 役割 |
|----------|------|
| `auth.py` | ユーザー登録（`/register`）とログイン（`/login`）を提供する。パスワード検証や JWT 発行は `core/security.py` に委譲する |
| `todo.py` | Todo の取得・作成・更新・削除・並び替え・一括操作を提供する。認証済みユーザーのみアクセス可能。操作後 WebSocket で変更を配信する |
| `websocket.py` | `/ws` エンドポイントで WebSocket 接続を確立する。JWT 認証必須。接続管理は `connection_manager.py` に委譲する |

**なぜルートごとにファイルを分けるか**: すべてを1ファイルに書くと、変更時のコンフリクトや検索コストが増えます。認証・Todo・WebSocket のように責務で分割することで、どこを変更すべきかが自明になります。

---

#### `models/` — データベーステーブル定義層

SQLAlchemy の ORM モデルを置く層です。
Python のクラスとして DB テーブルの構造を表現します。

| ファイル | 役割 |
|----------|------|
| `user.py` | `users` テーブルの定義。`id`, `email`, `hashed_password`, `is_active`, `created_at`, `updated_at` を持つ |
| `todo.py` | `todos` テーブルの定義。`id`, `title`, `description`, `completed`, `position`, `priority`, `due_date` を持つ。`TodoResponse`（Pydantic モデル）もここで定義している |

**なぜ `models/` を分けるか**: モデルは DB テーブルという永続的な構造を表します。エンドポイントや業務ロジックとは変更タイミングが異なるため、独立させることでスキーマ管理がしやすくなります。

---

#### `schemas/` — API 入出力スキーマ層

Pydantic モデルで API の入力バリデーションとレスポンス形式を定義する層です。

| ファイル | 役割 |
|----------|------|
| `user.py` | ユーザー登録入力（`UserCreate`）、ログイン入力（`UserLogin`）、レスポンス（`User`）、トークン（`Token`）を定義する |

**`models/` と `schemas/` を分ける理由**: モデル（DB テーブルの定義）とスキーマ（API の入出力形式）は関心が異なります。

- `models/` は「DB に何が保存されているか」を表す
- `schemas/` は「API が何を受け取り、何を返すか」を表す

これを混在させると、「DB の都合」で API の形が変わったり、「API の変更」が DB 定義に影響したりして、変更時の影響範囲が広がります。分離することで、それぞれ独立して変更できます。

---

### バックエンドの層の流れ

```
HTTP リクエスト
    │
    ▼
endpoints/    ← ルーティング・リクエスト受け取り
    │
    ├── core/dependencies.py で認証チェック
    │
    ├── schemas/ でリクエストデータを検証・型変換
    │
    ├── models/ を通じて DB を操作
    │
    └── core/connection_manager.py 経由でイベント配信（WebSocket）
```

---

## フロントエンド構成（`frontend/src/`）

### ディレクトリツリー

```
src/
├── App.tsx                   # ルーティング定義・プロバイダー配置
├── index.tsx                 # アプリの起動エントリーポイント
├── index.css                 # グローバルスタイル
├── components/               # UI コンポーネント（表示責務）
│   ├── Auth/                 # 認証画面関連
│   │   ├── AuthPage.tsx      # ログイン・登録の切り替えページ
│   │   ├── Login.tsx         # ログインフォーム
│   │   ├── Register.tsx      # 登録フォーム
│   │   ├── ProtectedRoute.tsx# 認証が必要なルートの保護
│   │   └── Loading.css       # ローディング表示スタイル
│   ├── Todo/                 # Todo 操作 UI
│   │   ├── TodoList.tsx      # Todo 一覧・フィルタ・操作
│   │   └── TodoEditPanel.tsx # Todo 編集パネル
│   ├── Layout/               # 共通レイアウト
│   │   └── Header.tsx        # ヘッダー（ユーザー名・ログアウト）
│   └── WebSocket/            # リアルタイム接続状態表示
│       └── WebSocketPanel.tsx# 接続状態とメッセージ確認パネル
├── contexts/                 # アプリ全体の横断状態管理
│   ├── AuthContext.tsx        # 認証状態・トークン管理
│   └── WebSocketContext.tsx   # WebSocket 接続管理
├── hooks/                    # 再利用可能なカスタムフック
│   └── useWebSocket.ts       # WebSocket 接続ロジックのカプセル化
└── utils/                    # 汎用ユーティリティ
    └── apiClient.ts          # Axios インスタンスと共通処理
```

---

### 各層の役割と設計理由

#### `App.tsx` — ルーティングと全体構造

アプリ全体のルーティング定義と、Context プロバイダーの配置を担います。

```tsx
<AuthProvider>          ← 認証状態をアプリ全体に提供
  <WebSocketProvider>   ← WebSocket 状態をアプリ全体に提供
    <Routes>
      <Route path="/auth"  ...>  // 未認証ユーザー向け
      <Route path="/"     ...>  // 認証済みユーザー向け（ProtectedRoute で保護）
    </Routes>
  </WebSocketProvider>
</AuthProvider>
```

**設計のポイント**: プロバイダーをネストして配置することで、どの子コンポーネントからでも認証状態や WebSocket 状態を参照できます。ルーティングも1か所で定義するため、アプリの画面遷移の全体像が把握しやすいです。

---

#### `components/` — UI コンポーネント層

画面の「見た目と操作」を担う層です。
業務ロジックや API 呼び出しはなるべくここに書かず、Context やカスタムフックに委ねます。

| ディレクトリ | 役割 |
|-------------|------|
| `Auth/` | ログイン・登録画面と、認証が必要なルートの保護。`ProtectedRoute.tsx` は未認証ユーザーを `/auth` にリダイレクトする |
| `Todo/` | Todo の表示・追加・編集・削除・並び替え・フィルタリング。操作は `apiClient` を通じてバックエンドに送る |
| `Layout/` | ヘッダーなど複数画面で共有する共通 UI。ユーザー名表示とログアウトボタンを提供する |
| `WebSocket/` | WebSocket の接続状態と受信メッセージを表示するパネル。実装と表示の分離のため、接続ロジックは持たず Context から状態を受け取るだけ |

**なぜ機能別にサブディレクトリを分けるか**: コンポーネントが増えると `components/` 直下に並べるだけでは何がどこにあるかわかりにくくなります。関連するファイルを1か所にまとめることで、変更時に迷わずに済みます。

---

#### `contexts/` — 横断状態管理層

アプリ全体、または複数のコンポーネントをまたいで使われる状態を管理する層です。
React の Context API を使い、props のバケツリレーを避けます。

| ファイル | 役割 |
|----------|------|
| `AuthContext.tsx` | ログイン・ログアウト処理、JWT トークンの保持と更新、ユーザー情報の管理。localStorage への保存・復元も担う |
| `WebSocketContext.tsx` | WebSocket の接続状態・受信メッセージ・送信関数を提供する。認証トークンを元に接続 URL を組み立て、ログイン状態に応じて接続・切断を制御する |

**なぜ Context を使うか**: 認証状態は Header（ユーザー名表示）、ProtectedRoute（ルート保護）、API 呼び出し（トークン付与）など多くの場所から参照されます。props で渡し続けると、関係ないコンポーネントまで受け渡しの中継地点になります（prop drilling）。Context に集約することで、必要な場所だけが参照できます。

---

#### `hooks/` — カスタムフック層

UI コンポーネントから切り離せる「処理の塊」を関数として抽出する層です。
テストしやすく、複数のコンポーネントから再利用できます。

| ファイル | 役割 |
|----------|------|
| `useWebSocket.ts` | WebSocket 接続の確立・切断・再接続、メッセージ送受信、エラーハンドリングをカプセル化する。接続 URL が変われば自動で再接続する仕組みも持つ |

**なぜ hooks/ に分けるか**: WebSocket の接続管理ロジックをコンポーネントの中に直接書くと、UI の変更と通信ロジックの変更が混在してテストや修正が難しくなります。フックに切り出すことで「UI が担う部分」と「処理ロジックが担う部分」が明確になります。

---

#### `utils/` — 汎用ユーティリティ層

複数の場所から使う共通処理を置く層です。
特定のコンポーネントや Context に属さない処理が対象です。

| ファイル | 役割 |
|----------|------|
| `apiClient.ts` | Axios インスタンスを生成し、リクエストインターセプター（トークン自動付与）とレスポンスインターセプター（401 時の自動ログアウト）を設定する |

**apiClient に集約する理由**: API の認証処理・エラーハンドリングを各コンポーネントで個別に書くと、仕様変更時に全箇所を修正する必要が出てきます。`apiClient.ts` に集約することで1か所の変更で済み、API 呼び出しの共通挙動を統一できます。

---

### フロントエンドのデータフロー

```
ユーザー操作
    │
    ▼
components/   ← 操作を受け取り、Context や utils を呼び出す
    │
    ├── utils/apiClient.ts 経由でバックエンド API へ
    │       （認証トークンは自動付与）
    │
    ├── contexts/AuthContext.tsx から認証状態を参照・更新
    │
    └── contexts/WebSocketContext.tsx から
            hooks/useWebSocket.ts 経由でリアルタイムイベントを受信
```

---

## 設計思想まとめ

このプロジェクト全体で共通して意識している設計思想は次の3つです。

### 1. 関心の分離

「何を受け取るか」「どう処理するか」「どこに保存するか」「どう表示するか」を分けて配置することで、変更時の影響範囲を小さくします。

### 2. 依存の方向を一方向に保つ

- `endpoints/` は `core/` に依存するが、`core/` は `endpoints/` に依存しない
- `components/` は `contexts/` や `utils/` に依存するが、逆は原則しない

この方向性を守ることで、ある層を変更しても別の層への波及が予測しやすくなります。

### 3. 変更理由が同じものを近くに置く

認証に関するコードは `core/security.py` と `contexts/AuthContext.tsx`、Todo の操作は `endpoints/todo.py` と `components/Todo/` というように、関連するコードを集めます。「どこを変えれば何が影響するか」が直感的にわかる構成を目指しています。
