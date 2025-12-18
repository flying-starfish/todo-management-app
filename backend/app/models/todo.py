from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict
from sqlalchemy import Boolean, Column, DateTime, Integer, String

from app.core.database import Base  # database.py から Base をインポート


class Todo(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    completed = Column(Boolean, default=False)
    position = Column(Integer, default=0)  # ドラッグ&ドロップの順序を管理
    priority = Column(Integer, default=1)  # 優先度: 0=高, 1=中, 2=低
    due_date = Column(DateTime, nullable=True)  # 期限日（新規追加）


class TodoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str]
    completed: bool
    position: int
    priority: int
    due_date: Optional[datetime]
