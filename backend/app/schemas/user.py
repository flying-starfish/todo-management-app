from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime

# ユーザー登録用のスキーマ
class UserCreate(BaseModel):
    email: EmailStr
    password: str

# ログイン用のスキーマ
class UserLogin(BaseModel):
    email: str
    password: str

# ユーザー情報レスポンス用のスキーマ
class User(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    email: str
    is_active: bool
    created_at: datetime

# トークンレスポンス用のスキーマ
class Token(BaseModel):
    access_token: str
    token_type: str

# トークンデータ用のスキーマ
class TokenData(BaseModel):
    email: Optional[str] = None