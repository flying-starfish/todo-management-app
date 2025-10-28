from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.models.todo import Todo as TodoModel, TodoResponse

router = APIRouter()

class TodoCreate(BaseModel):
    title: str
    description: Optional[str] = None
    completed: bool = False

@router.get("/todos", response_model=dict)
def get_todos(
    page: int = Query(1, ge=1),
    limit: int = Query(5, ge=1),
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    ページネーションとフィルタリング対応の ToDo リスト取得エンドポイント
    """
    query = db.query(TodoModel)

    # フィルタリング処理
    if search:
        query = query.filter(TodoModel.title.ilike(f"%{search}%"))
    if status == "completed":
        query = query.filter(TodoModel.completed.is_(True))
    elif status == "incomplete":
        query = query.filter(TodoModel.completed.is_(False))

    # 総アイテム数を取得
    total = query.count()

    # ページネーション処理
    todos = query.offset((page - 1) * limit).limit(limit).all()

    # 総ページ数を計算
    total_pages = (total + limit - 1) // limit

    # Pydantic モデルに変換して返す
    return {
        "data": [TodoResponse.from_orm(todo) for todo in todos],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }

@router.post("/todos", response_model=TodoResponse)
def create_todo(todo: TodoCreate, db: Session = Depends(get_db)):
    """
    新しい ToDo を作成するエンドポイント
    """
    db_todo = TodoModel(**todo.dict())
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return TodoResponse.from_orm(db_todo)  # Pydantic モデルに変換して返す

@router.put("/todos/{id}", response_model=TodoResponse)
def update_todo(id: int, todo: TodoCreate, db: Session = Depends(get_db)):
    """
    ToDo を更新するエンドポイント
    """
    db_todo = db.query(TodoModel).filter(TodoModel.id == id).first()
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    for key, value in todo.dict().items():
        setattr(db_todo, key, value)

    db.commit()
    db.refresh(db_todo)
    return TodoResponse.from_orm(db_todo)  # Pydantic モデルに変換して返す

@router.delete("/todos/{id}", response_model=TodoResponse)
def delete_todo(id: int, db: Session = Depends(get_db)):
    """
    ToDo を削除するエンドポイント
    """
    db_todo = db.query(TodoModel).filter(TodoModel.id == id).first()
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    db.delete(db_todo)
    db.commit()
    return TodoResponse.from_orm(db_todo)  # Pydantic モデルに変換して返す
