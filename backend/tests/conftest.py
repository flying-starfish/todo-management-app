"""
テスト用の共通設定とフィクスチャ
"""

print(">>> conftest.py がimportされた")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.main import app
from app.models.user import User

# テスト用のインメモリSQLiteデータベース
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """
    各テスト関数ごとに新しいデータベースセッションを提供
    テスト後にテーブルをクリーンアップ
    """
    print("4. db_session フィクスチャが実行された（setup）")
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
        print("8. db_session フィクスチャの後処理が実行される（teardown）")
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """
    FastAPIのTestClientを提供（依存性注入でテストDBを使用）
    """
    print("5. client フィクスチャが実行された（db_sessionに依存）")

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        print("6. TestClient が作成され、テスト関数に渡される直前")
        yield test_client
        print("9. client フィクスチャの後処理が実行される")
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_user(db_session):
    """
    テスト用のユーザーを作成
    """
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("testpassword"),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def auth_headers(client, test_user):
    """
    認証済みユーザーのヘッダーを取得
    """
    response = client.post(
        "/api/auth/login",
        data={"username": "test@example.com", "password": "testpassword"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
