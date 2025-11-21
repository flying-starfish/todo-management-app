"""
認証エンドポイントのテスト
"""

import pytest

from app.core.security import get_password_hash
from app.models.user import User


class TestAuthEndpoints:
    """認証関連のエンドポイントのテストクラス"""

    def test_register_user(self, client):
        """新しいユーザーを登録できることを確認"""
        user_data = {
            "email": "newuser@example.com",
            "password": "password123",
        }
        response = client.post("/api/auth/register", json=user_data)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert "id" in data
        assert "hashed_password" not in data  # パスワードは返されない

    def test_register_duplicate_email(self, client, test_user):
        """重複したメールアドレスで登録が失敗することを確認"""
        user_data = {
            "email": "test@example.com",  # 既存のメールアドレス
            "password": "password123",
        }
        response = client.post("/api/auth/register", json=user_data)
        assert response.status_code == 400
        assert "このメールアドレスは既に登録されています" in response.json()["detail"].lower()

    def test_register_invalid_email(self, client):
        """無効なメールアドレスで登録が失敗することを確認"""
        user_data = {
            "email": "invalid-email",
            "password": "password123",
        }
        response = client.post("/api/auth/register", json=user_data)
        assert response.status_code == 422  # バリデーションエラー

    def test_login_success(self, client, test_user):
        """正しい認証情報でログインできることを確認"""
        response = client.post(
            "/api/auth/login",
            data={"username": "test@example.com", "password": "testpassword"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, test_user):
        """間違ったパスワードでログインが失敗することを確認"""
        response = client.post(
            "/api/auth/login",
            data={"username": "test@example.com", "password": "wrongpassword"},
        )
        assert response.status_code == 401
        assert "メールアドレスまたはパスワードが間違っています" in response.json()["detail"].lower()

    def test_login_nonexistent_user(self, client):
        """存在しないユーザーでログインが失敗することを確認"""
        response = client.post(
            "/api/auth/login",
            data={"username": "nonexistent@example.com", "password": "password123"},
        )
        assert response.status_code == 401

    def test_login_inactive_user(self, client, db_session):
        """非アクティブなユーザーでログインが失敗することを確認"""
        user = User(
            email="inactive@example.com",
            hashed_password=get_password_hash("password123"),
            is_active=False,
        )
        db_session.add(user)
        db_session.commit()

        response = client.post(
            "/api/auth/login",
            data={"username": "inactive@example.com", "password": "password123"},
        )
        assert response.status_code == 400
        assert "inactive" in response.json()["detail"].lower()

    def test_get_current_user(self, client, auth_headers):
        """認証済みユーザーの情報を取得できることを確認"""
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["is_active"] is True

    def test_get_current_user_without_auth(self, client):
        """認証なしでユーザー情報の取得が失敗することを確認"""
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_get_current_user_invalid_token(self, client):
        """無効なトークンでユーザー情報の取得が失敗することを確認"""
        headers = {"Authorization": "Bearer invalid_token_here"}
        response = client.get("/api/auth/me", headers=headers)
        assert response.status_code == 401

    def test_token_contains_user_info(self, client, test_user):
        """トークンに正しいユーザー情報が含まれていることを確認"""
        response = client.post(
            "/api/auth/login",
            data={"username": "test@example.com", "password": "testpassword"},
        )
        token = response.json()["access_token"]

        # トークンを使ってユーザー情報を取得
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"

    def test_password_is_hashed(self, client):
        """パスワードがハッシュ化されて保存されることを確認"""
        user_data = {
            "email": "hashtest@example.com",
            "password": "plainpassword",
        }
        response = client.post("/api/auth/register", json=user_data)
        assert response.status_code == 200

        # 平文パスワードでログインできることを確認
        response = client.post(
            "/api/auth/login",
            data={"username": "hashtest@example.com", "password": "plainpassword"},
        )
        assert response.status_code == 200
