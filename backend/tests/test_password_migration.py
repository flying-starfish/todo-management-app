"""
パスワードハッシュのbcrypt→Argon2移行テスト
"""
import bcrypt
import pytest

from app.core.security import get_password_hash, verify_password
from app.models.user import User


class TestPasswordMigration:
    """パスワード移行のテスト"""

    def test_hash_detection(self):
        """ハッシュ形式の検出テスト"""
        # bcryptハッシュ
        bcrypt_hash = bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode('utf-8')
        assert bcrypt_hash.startswith("$2")

        # Argon2ハッシュ
        argon2_hash = get_password_hash("password123")
        assert argon2_hash.startswith("$argon2")

    def test_verify_bcrypt_password(self):
        """bcryptハッシュの検証テスト"""
        # bcryptでハッシュ化
        password = "test_password_123"
        bcrypt_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # 検証（bcryptハッシュは再ハッシュが必要と判定される）
        is_valid, needs_rehash = verify_password(password, bcrypt_hash)
        assert is_valid is True
        assert needs_rehash is True  # bcryptは常に再ハッシュが必要

    def test_verify_argon2_password(self):
        """Argon2ハッシュの検証テスト"""
        password = "test_password_456"
        argon2_hash = get_password_hash(password)
        
        # 検証（Argon2は再ハッシュ不要）
        is_valid, needs_rehash = verify_password(password, argon2_hash)
        assert is_valid is True
        assert needs_rehash is False  # Argon2は通常再ハッシュ不要

    def test_new_user_uses_argon2(self, client, db_session):
        """新規ユーザー登録でArgon2が使用されることを確認"""
        response = client.post(
            "/api/auth/register",
            json={"email": "newuser@example.com", "password": "newpassword123"}
        )
        assert response.status_code == 200

        # データベースから取得
        user = db_session.query(User).filter(User.email == "newuser@example.com").first()
        assert user is not None
        assert user.hashed_password.startswith("$argon2")

    def test_bcrypt_to_argon2_migration_on_login(self, client, db_session):
        """ログイン時にbcryptからArgon2へ移行されることを確認"""
        # 1. bcryptハッシュで既存ユーザーを作成
        password = "legacy_password_123"
        bcrypt_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        legacy_user = User(
            email="legacy@example.com",
            hashed_password=bcrypt_hash,
            is_active=True
        )
        db_session.add(legacy_user)
        db_session.commit()
        db_session.refresh(legacy_user)
        user_id = legacy_user.id
        
        # bcryptハッシュであることを確認
        assert legacy_user.hashed_password.startswith("$2")

        # 2. ログイン（移行が発生するはず）
        response = client.post(
            "/api/auth/login",
            data={"username": "legacy@example.com", "password": password}
        )
        assert response.status_code == 200
        assert "access_token" in response.json()

        # 3. ハッシュがArgon2に変換されたことを確認
        db_session.expire_all()  # キャッシュをクリア
        migrated_user = db_session.query(User).filter(User.id == user_id).first()
        assert migrated_user is not None
        assert migrated_user.hashed_password.startswith("$argon2")

        # 4. 再度ログインして、Argon2ハッシュで認証できることを確認
        response2 = client.post(
            "/api/auth/login",
            data={"username": "legacy@example.com", "password": password}
        )
        assert response2.status_code == 200
        assert "access_token" in response2.json()

    def test_wrong_password_does_not_trigger_migration(self, client, db_session):
        """間違ったパスワードでは移行が発生しないことを確認"""
        # 1. bcryptハッシュでユーザーを作成
        password = "correct_password"
        bcrypt_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        user = User(
            email="nomigrate@example.com",
            hashed_password=bcrypt_hash,
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        original_hash = user.hashed_password
        user_id = user.id

        # 2. 間違ったパスワードでログイン試行
        response = client.post(
            "/api/auth/login",
            data={"username": "nomigrate@example.com", "password": "wrong_password"}
        )
        assert response.status_code == 401

        # 3. ハッシュが変更されていないことを確認
        db_session.expire_all()  # キャッシュをクリア
        unchanged_user = db_session.query(User).filter(User.id == user_id).first()
        assert unchanged_user.hashed_password == original_hash
        assert unchanged_user.hashed_password.startswith("$2")  # まだbcrypt
