"""
認証エンドポイントのテスト
"""
import pytest
from app.models.user import User
from app.core.security import get_password_hash


class TestAuthEndpoints:
    """認証関連のエンドポイントのテストクラス"""

    def test_register_user(self, client):
        """新しいユーザーを登録できることを確認"""
        user_data = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "password123",
        }
        response = client.post("/api/auth/register", json=user_data)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "newuser"
        assert data["email"] == "newuser@example.com"
        assert "id" in data
        assert "hashed_password" not in data  # パスワードは返されない

    def test_register_duplicate_username(self, client, test_user):
        """重複したユーザー名で登録が失敗することを確認"""
        user_data = {
            "username": "testuser",  # 既存のユーザー名
            "email": "another@example.com",
            "password": "password123",
        }
        response = client.post("/api/auth/register", json=user_data)
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    def test_register_duplicate_email(self, client, test_user):
        """重複したメールアドレスで登録が失敗することを確認"""
        user_data = {
            "username": "anotheruser",
            "email": "test@example.com",  # 既存のメールアドレス
            "password": "password123",
        }
        response = client.post("/api/auth/register", json=user_data)
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    def test_register_invalid_email(self, client):
        """無効なメールアドレスで登録が失敗することを確認"""
        user_data = {
            "username": "newuser",
            "email": "invalid-email",
            "password": "password123",
        }
        response = client.post("/api/auth/register", json=user_data)
        assert response.status_code == 422  # バリデーションエラー

    def test_login_success(self, client, test_user):
        """正しい認証情報でログインできることを確認"""
        response = client.post(
            "/api/auth/login",
            data={"username": "testuser", "password": "testpassword"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, test_user):
        """間違ったパスワードでログインが失敗することを確認"""
        response = client.post(
            "/api/auth/login",
            data={"username": "testuser", "password": "wrongpassword"},
        )
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    def test_login_nonexistent_user(self, client):
        """存在しないユーザーでログインが失敗することを確認"""
        response = client.post(
            "/api/auth/login",
            data={"username": "nonexistent", "password": "password123"},
        )
        assert response.status_code == 401

    def test_login_inactive_user(self, client, db_session):
        """非アクティブなユーザーでログインが失敗することを確認"""
        user = User(
            username="inactiveuser",
            email="inactive@example.com",
            hashed_password=get_password_hash("password123"),
            is_active=False,
        )
        db_session.add(user)
        db_session.commit()

        response = client.post(
            "/api/auth/login",
            data={"username": "inactiveuser", "password": "password123"},
        )
        assert response.status_code == 400
        assert "inactive" in response.json()["detail"].lower()

    def test_get_current_user(self, client, auth_headers):
        """認証済みユーザーの情報を取得できることを確認"""
        response = client.get("/api/auth/users/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"
        assert data["is_active"] is True

    def test_get_current_user_without_auth(self, client):
        """認証なしでユーザー情報の取得が失敗することを確認"""
        response = client.get("/api/auth/users/me")
        assert response.status_code == 401

    def test_get_current_user_invalid_token(self, client):
        """無効なトークンでユーザー情報の取得が失敗することを確認"""
        headers = {"Authorization": "Bearer invalid_token_here"}
        response = client.get("/api/auth/users/me", headers=headers)
        assert response.status_code == 401

    def test_token_contains_user_info(self, client, test_user):
        """トークンに正しいユーザー情報が含まれていることを確認"""
        response = client.post(
            "/api/auth/login",
            data={"username": "testuser", "password": "testpassword"},
        )
        token = response.json()["access_token"]
        
        # トークンを使ってユーザー情報を取得
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/auth/users/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"

    def test_password_is_hashed(self, client):
        """パスワードがハッシュ化されて保存されることを確認"""
        user_data = {
            "username": "hashtest",
            "email": "hashtest@example.com",
            "password": "plainpassword",
        }
        response = client.post("/api/auth/register", json=user_data)
        assert response.status_code == 200
        
        # 平文パスワードでログインできることを確認
        response = client.post(
            "/api/auth/login",
            data={"username": "hashtest", "password": "plainpassword"},
        )
        assert response.status_code == 200
