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
    position: Optional[int] = None

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

    # ページネーション処理（position順でソート）
    todos = query.order_by(TodoModel.position, TodoModel.id).offset((page - 1) * limit).limit(limit).all()

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
    todo_data = todo.dict()
    # positionが指定されていない場合、最大値+1を設定
    if todo_data['position'] is None:
        max_position = db.query(TodoModel).order_by(TodoModel.position.desc()).first()
        todo_data['position'] = (max_position.position + 1) if max_position else 0
    
    db_todo = TodoModel(**todo_data)
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return TodoResponse.from_orm(db_todo)  # Pydantic モデルに変換して返す

class TodoReorderRequest(BaseModel):
    todo_ids: list[int]

@router.put("/todos/reorder")
def reorder_todos(request: TodoReorderRequest, db: Session = Depends(get_db)):
    """
    ToDo の順序を更新するエンドポイント（最適化版）
    """
    print(f"Received todo_ids: {request.todo_ids}")  # デバッグ用ログ
    
    # 1. 並び替え対象のTodoを既存のposition順で取得
    target_todos = db.query(TodoModel).filter(TodoModel.id.in_(request.todo_ids)).order_by(TodoModel.position, TodoModel.id).all()
    
    # 2. 存在チェック
    if len(target_todos) != len(request.todo_ids):
        raise HTTPException(status_code=400, detail="Some todos not found")
    
    # 3. 既存のposition順序を保存
    original_positions = [todo.position for todo in target_todos]
    print(f"Target todos (position order): {[(todo.id, todo.position) for todo in target_todos]}")  # デバッグ用ログ
    print(f"New order request: {request.todo_ids}")  # デバッグ用ログ
    
    # 4. 新しい順序の各IDに対して、既存のposition順の値を割り当て
    position_assignments = []
    for i, todo_id in enumerate(request.todo_ids):
        new_position = original_positions[i]  # 同じ添字のpositionを使用
        position_assignments.append((todo_id, new_position))
    
    print(f"Position assignments: {position_assignments}")  # デバッグ用ログ
    
    # 5. データベースを更新（対象のTodoのみ）
    for todo_id, new_position in position_assignments:
        db_todo = db.query(TodoModel).filter(TodoModel.id == todo_id).first()
        if db_todo:
            old_position = db_todo.position
            db_todo.position = new_position
            print(f"Todo ID {todo_id}: {old_position} -> {new_position}")  # デバッグ用ログ
    
    db.commit()
    return {"message": "Todos reordered successfully"}

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

