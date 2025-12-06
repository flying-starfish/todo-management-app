import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker  # 新しいインポート先

# 環境変数からDATABASE_URLを取得、デフォルトはローカル用
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./todos.db")

# SQLiteの場合のみcheck_same_threadを設定
connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    # すべてのモデルをインポート（テーブル作成に必要）
    from app.models.todo import Todo  # noqa: F401
    from app.models.user import User  # noqa: F401

    Base.metadata.create_all(bind=engine)
