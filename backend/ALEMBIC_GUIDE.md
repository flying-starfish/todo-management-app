# Alembic データベースマイグレーションガイド

このドキュメントでは、Alembicを使用したデータベーススキーマの管理方法について説明します。

## 📋 目次

1. [Alembicとは](#alembicとは)
2. [なぜAlembicを使うのか](#なぜalembicを使うのか)
3. [新規プロジェクトでの設計フロー](#新規プロジェクトでの設計フロー)
4. [セットアップ](#セットアップ)
5. [基本的な使い方](#基本的な使い方)
6. [開発時のワークフロー](#開発時のワークフロー)
7. [本番デプロイ時のワークフロー](#本番デプロイ時のワークフロー)
8. [よく使うコマンド](#よく使うコマンド)
9. [注意点とベストプラクティス](#注意点とベストプラクティス)
10. [トラブルシューティング](#トラブルシューティング)

---

## Alembicとは

Alembicは、SQLAlchemyのためのデータベースマイグレーションツールです。データベーススキーマの変更をバージョン管理し、安全に適用・ロールバックできます。

### 従来の方法との比較

```python
# 従来の方法（create_all）
Base.metadata.create_all(bind=engine)
```

| 機能 | create_all() | Alembic |
|------|-------------|---------|
| 新規テーブル作成 | ✅ | ✅ |
| カラム追加 | ❌ 不可 | ✅ 可能 |
| カラム変更 | ❌ 不可 | ✅ 可能 |
| カラム削除 | ❌ 不可 | ✅ 可能 |
| 変更履歴 | ❌ なし | ✅ あり |
| ロールバック | ❌ 不可 | ✅ 可能 |
| チーム共有 | ❌ 困難 | ✅ 容易 |

---

## なぜAlembicを使うのか

### 1. データを失わずにスキーマ変更ができる

**Alembicなし（危険）**:
```bash
# スキーマを変更するにはデータベースを削除する必要がある
rm todos.db
python -c "from app.core.database import init_db; init_db()"
# → 既存データがすべて消える！
```

**Alembicあり（安全）**:
```bash
# 既存データを保持したままスキーマ変更
alembic upgrade head
# → データは保持される！
```

### 2. 変更履歴が残る

```bash
$ alembic history

4c0d65a0799b -> 8a02a02a6a5d (head), Add due_date to todos table
<base> -> 4c0d65a0799b, Initial migration: users and todos tables
```

### 3. 問題が起きたらロールバックできる

```bash
# 最新の変更を取り消す
alembic downgrade -1
```

### 4. チーム開発で同じスキーマを共有できる

```bash
# 他の開発者の変更を取得
git pull

# マイグレーションを適用
alembic upgrade head
# → 全員が同じDBスキーマになる
```

### 5. SQLite/PostgreSQL両方で動作

同じマイグレーションファイルが、開発環境（SQLite）でも本番環境（PostgreSQL）でも動作します。

---

## 新規プロジェクトでの設計フロー

### Alembicの役割を理解する

**重要**: Alembic自体でスキーマを設計するわけではありません。

```
設計フェーズ                    実装フェーズ
    │                              │
    ▼                              ▼
モデルを定義              →    Alembicでマイグレーション生成
(app/models/)                  (自動検出)
```

- **設計**: Pythonのモデルファイル（`app/models/`）で行う
- **Alembicの役割**: モデルの変更を検出し、マイグレーションを生成する

### 新規プロジェクトの推奨ワークフロー

```
1. 要件定義
   │
   ▼
2. モデル設計（app/models/）← ここが「設計」
   │  - テーブル構造を決める
   │  - リレーションを定義
   │  - インデックスを設定
   │
   ▼
3. Alembic初期化
   │  alembic init alembic
   │
   ▼
4. 初回マイグレーション生成
   │  alembic revision --autogenerate -m "Initial"
   │
   ▼
5. マイグレーション適用
   │  alembic upgrade head
   │
   ▼
6. 開発中に変更が必要になったら
   │  - モデルを変更
   │  - alembic revision --autogenerate -m "変更内容"
   │  - alembic upgrade head
   │
   ▼
7. 本番デプロイ時
      alembic upgrade head
```

### Step 1: モデルを設計・定義する

まずPythonでモデルを定義します。これが「設計」にあたります。

```python
# app/models/user.py
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# app/models/todo.py
class Todo(Base):
    __tablename__ = "todos"
    
    id = Column(Integer, primary_key=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    completed = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"))  # リレーション
```

### Step 2: Alembicを初期化

```bash
cd backend
alembic init alembic
# → alembic/ ディレクトリと alembic.ini が作成される
```

### Step 3: 初回マイグレーション生成（自動検出）

```bash
alembic revision --autogenerate -m "Initial: Create users and todos tables"
```

Alembicがモデルを読み取り、自動でマイグレーションを生成します：

```python
# alembic/versions/xxx_initial.py（自動生成）
def upgrade() -> None:
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('hashed_password', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    
    op.create_table('todos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=True),
        # ...
    )
```

### Step 4: データベースに適用

```bash
alembic upgrade head
# → テーブルが作成される
```

### 2つのアプローチの比較

| アプローチ | 用途 | 特徴 |
|-----------|------|------|
| **create_all()** | プロトタイプ、学習、PoC | 最速だが履歴なし、本番不向き |
| **Alembic** | 本番プロジェクト、チーム開発 | 履歴管理可能、ロールバック可能 |

### ER図は必要か？

現代的なCode-Firstアプローチでは、必ずしもER図は必要ありません。

| 状況 | ER図 |
|------|------|
| 小〜中規模アプリ | 不要（モデルが設計図） |
| 大規模・複雑なリレーション | あると便利 |
| 非エンジニアとの共有 | あると便利 |
| ドキュメント要件がある | 必要 |

必要な場合は、モデルからER図を自動生成するツール（ERAlchemy等）を使用できます。

---

## セットアップ

### ディレクトリ構成

```
backend/
├── alembic/
│   ├── versions/           # マイグレーションファイル
│   │   ├── 4c0d65a0799b_initial_migration.py
│   │   └── 8a02a02a6a5d_add_due_date.py
│   ├── env.py             # Alembic環境設定
│   ├── script.py.mako     # マイグレーションテンプレート
│   └── README
├── alembic.ini            # Alembic設定ファイル
└── app/
    └── models/            # SQLAlchemyモデル
```

### 環境変数

`DATABASE_URL`環境変数でデータベース接続先を指定します：

```bash
# 開発環境（.env）
DATABASE_URL=sqlite:///./db/todos.db

# 本番環境（.env.production）
DATABASE_URL=postgresql://user:password@localhost:5432/todo_db
```

---

## 基本的な使い方

### 1. モデルを変更する

```python
# app/models/todo.py

class Todo(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    completed = Column(Boolean, default=False)
    due_date = Column(DateTime, nullable=True)  # ← 新規追加
```

### 2. マイグレーションファイルを生成

```bash
cd backend
alembic revision --autogenerate -m "Add due_date to todos table"
```

**出力例**:
```
INFO  [alembic.autogenerate.compare] Detected added column 'todos.due_date'
Generating .../versions/8a02a02a6a5d_add_due_date_to_todos_table.py ...  done
```

### 3. 生成されたファイルを確認

```python
# alembic/versions/8a02a02a6a5d_add_due_date_to_todos_table.py

def upgrade() -> None:
    op.add_column('todos', sa.Column('due_date', sa.DateTime(), nullable=True))

def downgrade() -> None:
    op.drop_column('todos', 'due_date')
```

### 4. マイグレーションを適用

```bash
alembic upgrade head
```

---

## 開発時のワークフロー

### 新機能開発時

```bash
# 1. featureブランチを作成
git checkout -b feature/add-due-date

# 2. モデルを変更
# app/models/todo.py を編集

# 3. マイグレーション生成
alembic revision --autogenerate -m "Add due_date to todos"

# 4. 生成されたファイルを確認・必要なら編集
# alembic/versions/xxx.py を確認

# 5. マイグレーション適用
alembic upgrade head

# 6. アプリケーションをテスト
pytest

# 7. コミット
git add app/models/todo.py
git add alembic/versions/xxx.py
git commit -m "feat: Add due_date to todos"

# 8. プルリクエスト作成
git push origin feature/add-due-date
```

### 他の開発者の変更を取得した時

```bash
# 1. 最新コードを取得
git pull origin main

# 2. 新しいマイグレーションがあれば適用
alembic upgrade head

# 3. 現在の状態を確認
alembic current
```

### スキーマ変更をやり直したい時

```bash
# 1. マイグレーションをロールバック
alembic downgrade -1

# 2. マイグレーションファイルを削除
rm alembic/versions/xxx_add_due_date.py

# 3. モデルを修正
# app/models/todo.py を編集

# 4. マイグレーションを再生成
alembic revision --autogenerate -m "Add due_date to todos"

# 5. マイグレーションを適用
alembic upgrade head
```

---

## 本番デプロイ時のワークフロー

### 基本的な手順

```bash
# 1. 本番サーバーにSSH接続
ssh user@production-server

# 2. アプリケーションディレクトリに移動
cd /var/www/todo-app/backend

# 3. 最新コードを取得
git pull origin main

# 4. 仮想環境をアクティベート
source venv/bin/activate

# 5. 依存パッケージを更新
pip install -r requirements.txt

# 6. 現在のマイグレーション状態を確認
alembic current

# 7. マイグレーションを適用
alembic upgrade head

# 8. アプリケーションを再起動
sudo systemctl restart todo-backend
```

### Docker環境の場合

```bash
# docker-compose.prod.yml を使用

# 1. コンテナを停止せずにマイグレーションを実行
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# または、起動時に自動実行するようにentrypoint.shを設定
```

### Railway/Renderなどのクラウドプラットフォーム

`Procfile`または起動コマンドにマイグレーションを含める：

```bash
# Procfile
release: alembic upgrade head
web: gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
```

### 本番デプロイ前のチェックリスト

- [ ] 開発環境でマイグレーションが正常に動作することを確認
- [ ] ロールバック（downgrade）が正常に動作することを確認
- [ ] データ損失がないことを確認
- [ ] 本番DBのバックアップを取得
- [ ] マイグレーションファイルがGitにコミットされていることを確認

---

## よく使うコマンド

### マイグレーション操作

```bash
# マイグレーションファイルを自動生成
alembic revision --autogenerate -m "説明メッセージ"

# 空のマイグレーションファイルを作成（手動で書く場合）
alembic revision -m "説明メッセージ"

# 最新まで適用
alembic upgrade head

# 1つ進める
alembic upgrade +1

# 特定のリビジョンまで適用
alembic upgrade <revision_id>

# 1つ戻す
alembic downgrade -1

# 特定のリビジョンまで戻す
alembic downgrade <revision_id>

# 最初まで戻す（全マイグレーション取り消し）
alembic downgrade base
```

### 状態確認

```bash
# 現在適用されているリビジョン
alembic current

# マイグレーション履歴
alembic history

# 詳細な履歴
alembic history --verbose

# 適用されていないマイグレーション
alembic heads
```

### デバッグ

```bash
# 実際に実行されるSQLを表示（適用はしない）
alembic upgrade head --sql

# 特定のマイグレーションのSQLを表示
alembic upgrade <revision_id> --sql
```

---

## 注意点とベストプラクティス

### ✅ やるべきこと

#### 1. マイグレーションファイルはGit管理する

```bash
# コミットに含める
git add alembic/versions/xxx.py
git commit -m "Add migration for due_date"
```

#### 2. 本番デプロイ前に必ずバックアップを取る

```bash
# PostgreSQLの場合
pg_dump -U todouser todo_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### 3. 生成されたファイルを必ず確認する

```python
# 自動生成されたファイルをレビュー
def upgrade() -> None:
    # 意図した変更か確認
    op.add_column('todos', sa.Column('due_date', sa.DateTime(), nullable=True))
```

#### 4. downgrade()も必ず確認する

```python
def downgrade() -> None:
    # ロールバックが正しく動作するか確認
    op.drop_column('todos', 'due_date')
```

#### 5. 説明的なメッセージを書く

```bash
# ✅ 良い例
alembic revision --autogenerate -m "Add due_date column to todos for deadline tracking"

# ❌ 悪い例
alembic revision --autogenerate -m "update"
```

### ❌ やってはいけないこと

#### 1. 本番適用済みのマイグレーションを編集・削除しない

```bash
# ❌ 絶対にやらない
rm alembic/versions/xxx_already_applied.py
```

既に本番に適用されたマイグレーションを変更すると、環境間で不整合が発生します。

#### 2. マイグレーションをスキップしない

```bash
# ❌ 手動でDBを変更してマイグレーションをスキップ
# → 他の環境で問題が発生する
```

#### 3. データ削除を伴う変更は慎重に

```python
# ⚠️ 注意が必要
def upgrade() -> None:
    op.drop_column('todos', 'old_column')  # データが消える！
```

必要なら、データを別カラムに移行してから削除：

```python
def upgrade() -> None:
    # 1. 新カラムを追加
    op.add_column('todos', sa.Column('new_column', sa.String()))
    
    # 2. データを移行
    op.execute("UPDATE todos SET new_column = old_column")
    
    # 3. 古いカラムを削除
    op.drop_column('todos', 'old_column')
```

---

## トラブルシューティング

### エラー: "Target database is not up to date"

**原因**: まだ適用していないマイグレーションがある

**解決策**:
```bash
# 最新まで適用してから新しいマイグレーションを生成
alembic upgrade head
alembic revision --autogenerate -m "New changes"
```

### エラー: "Can't locate revision identified by 'xxx'"

**原因**: マイグレーションファイルが見つからない（削除された等）

**解決策**:
```bash
# 現在の状態を確認
alembic current

# alembic_versionテーブルを直接修正（最終手段）
# SQLite:
sqlite3 db/todos.db "UPDATE alembic_version SET version_num = 'correct_revision_id'"

# PostgreSQL:
psql -U todouser -d todo_db -c "UPDATE alembic_version SET version_num = 'correct_revision_id'"
```

### エラー: "Detected changes but no migration generated"

**原因**: モデルがenv.pyでインポートされていない

**解決策**:
```python
# alembic/env.py
from app.models.todo import Todo  # noqa: F401
from app.models.user import User  # noqa: F401
```

### 複数の開発者が同時にマイグレーションを作成した場合

**問題**: 同じdown_revisionを持つマイグレーションが複数存在

**解決策**:
```bash
# 1. 片方のマイグレーションをロールバック
alembic downgrade -1

# 2. そのマイグレーションファイルを削除
rm alembic/versions/conflicting_migration.py

# 3. 最新をpull
git pull

# 4. 最新まで適用
alembic upgrade head

# 5. 変更を再度マイグレーション化
alembic revision --autogenerate -m "My changes"
```

---

## 参考リンク

- [Alembic公式ドキュメント](https://alembic.sqlalchemy.org/)
- [SQLAlchemy公式ドキュメント](https://docs.sqlalchemy.org/)
- [Alembic Tutorial](https://alembic.sqlalchemy.org/en/latest/tutorial.html)

---

## クイックリファレンス

```bash
# 日常的に使うコマンド
alembic revision --autogenerate -m "説明"  # マイグレーション生成
alembic upgrade head                        # 最新まで適用
alembic downgrade -1                        # 1つ戻す
alembic current                             # 現在の状態
alembic history                             # 履歴表示
```
