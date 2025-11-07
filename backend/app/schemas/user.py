from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# ユーザー登録用のスキーマ
class UserCreate(BaseModel):
    email: str
    password: str

# ログイン用のスキーマ
class UserLogin(BaseModel):
    email: str
    password: str

# ユーザー情報レスポンス用のスキーマ
class User(BaseModel):
    id: int
    email: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# トークンレスポンス用のスキーマ
class Token(BaseModel):
    access_token: str
    token_type: str

# トークンデータ用のスキーマ
class TokenData(BaseModel):
    email: Optional[str] = None