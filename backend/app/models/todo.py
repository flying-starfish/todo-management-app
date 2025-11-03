from sqlalchemy import Column, Integer, String, Boolean
from pydantic import BaseModel
from typing import Optional
from app.core.database import Base  # database.py から Base をインポート

class Todo(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)  
    completed = Column(Boolean, default=False)
    position = Column(Integer, default=0)  # ドラッグ&ドロップの順序を管理

class TodoResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    completed: bool
    position: int

    class Config:
        orm_mode = True  # SQLAlchemy モデルを Pydantic モデルに変換可能にする
        from_attributes = True  # Pydantic v2.x 以降で必要