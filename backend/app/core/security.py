from datetime import datetime, timedelta
from typing import Optional, Tuple

import bcrypt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from jose import JWTError, jwt

# JWT設定
SECRET_KEY = "your-secret-key-here-change-in-production"  # 本番環境では環境変数で設定
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Argon2ハッシャー（新規ハッシュ用）
ph = PasswordHasher()


def _is_argon2_hash(hashed_password: str) -> bool:
    """ハッシュがArgon2形式かどうかを判定"""
    return hashed_password.startswith("$argon2")


def _is_bcrypt_hash(hashed_password: str) -> bool:
    """ハッシュがbcrypt形式かどうかを判定"""
    return hashed_password.startswith("$2a$") or hashed_password.startswith("$2b$")


def verify_password(plain_password: str, hashed_password: str) -> Tuple[bool, bool]:
    """
    パスワードの検証
    
    Args:
        plain_password: 平文パスワード
        hashed_password: ハッシュ化されたパスワード
    
    Returns:
        (verification_result, needs_rehash): 
            - verification_result: 検証が成功したかどうか
            - needs_rehash: 再ハッシュが必要かどうか（bcryptの場合True）
    """
    try:
        if _is_argon2_hash(hashed_password):
            # Argon2ハッシュの検証
            ph.verify(hashed_password, plain_password)
            # Argon2パラメータが古い場合も再ハッシュを検討できる
            needs_rehash = ph.check_needs_rehash(hashed_password)
            return True, needs_rehash
        elif _is_bcrypt_hash(hashed_password):
            # bcryptハッシュの検証（レガシー）
            is_valid = bcrypt.checkpw(
                plain_password.encode('utf-8'),
                hashed_password.encode('utf-8')
            )
            # bcryptの場合は常に再ハッシュが必要
            return is_valid, is_valid
        else:
            # 未知のハッシュ形式
            return False, False
    except (VerifyMismatchError, InvalidHashError, ValueError):
        return False, False


def get_password_hash(password: str) -> str:
    """
    パスワードのハッシュ化（Argon2を使用）
    
    Args:
        password: 平文パスワード
    
    Returns:
        Argon2でハッシュ化されたパスワード
    """
    return ph.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """JWTアクセストークンの作成"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[str]:
    """JWTトークンの検証"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        print(f"[DEBUG] Token payload: {payload}")
        if email is None:
            print("[DEBUG] Email is None in payload")
            return None
        return email
    except JWTError as e:
        print(f"[DEBUG] JWT Error: {e}")
        return None
