"""
Todo エンドポイントのテスト
"""

import pytest

from app.models.todo import Todo


class TestTodoEndpoints:
    """Todo関連のエンドポイントのテストクラス"""

    def test_get_todos_empty(self, client, auth_headers):
        """初期状態でTodoリストが空であることを確認"""
        response = client.get("/api/todos", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["data"] == []
        assert data["total"] == 0
        assert data["page"] == 1

    def test_create_todo(self, client, auth_headers):
        """新しいTodoを作成できることを確認"""
        todo_data = {
            "title": "Test Todo",
            "description": "Test Description",
            "completed": False,
            "priority": 1,
        }
        response = client.post("/api/todos", json=todo_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Todo"
        assert data["description"] == "Test Description"
        assert data["completed"] is False
        assert data["priority"] == 1
        assert "id" in data
        assert "position" in data

    def test_create_todo_without_description(self, client, auth_headers):
        """descriptionなしでTodoを作成できることを確認"""
        todo_data = {
            "title": "Test Todo",
            "completed": False,
        }
        response = client.post("/api/todos", json=todo_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Todo"
        assert data["description"] is None

    def test_create_todo_without_auth(self, client):
        """認証なしでTodo作成が失敗することを確認"""
        todo_data = {"title": "Test Todo"}
        response = client.post("/api/todos", json=todo_data)
        assert response.status_code == 401

    def test_get_todos_with_data(self, client, auth_headers, db_session):
        """Todoが存在する場合に取得できることを確認"""
        # テストデータを作成
        todos = [
            Todo(title=f"Todo {i}", description=f"Desc {i}", completed=False, position=i, priority=1) for i in range(3)
        ]
        for todo in todos:
            db_session.add(todo)
        db_session.commit()

        response = client.get("/api/todos", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 3
        assert data["total"] == 3

    def test_get_todos_pagination(self, client, auth_headers, db_session):
        """ページネーションが正しく動作することを確認"""
        # 15個のTodoを作成
        todos = [Todo(title=f"Todo {i}", completed=False, position=i, priority=1) for i in range(15)]
        for todo in todos:
            db_session.add(todo)
        db_session.commit()

        # 1ページ目（5件）
        response = client.get("/api/todos?page=1&limit=5", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 5
        assert data["total"] == 15
        assert data["page"] == 1
        assert data["total_pages"] == 3

        # 2ページ目（5件）
        response = client.get("/api/todos?page=2&limit=5", headers=auth_headers)
        data = response.json()
        assert len(data["data"]) == 5
        assert data["page"] == 2

    def test_get_todos_search_filter(self, client, auth_headers, db_session):
        """検索フィルタが正しく動作することを確認"""
        todos = [
            Todo(title="Buy groceries", completed=False, position=0, priority=1),
            Todo(title="Write report", completed=False, position=1, priority=1),
            Todo(title="Buy tickets", completed=False, position=2, priority=1),
        ]
        for todo in todos:
            db_session.add(todo)
        db_session.commit()

        response = client.get("/api/todos?search=buy", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 2
        assert all("buy" in todo["title"].lower() for todo in data["data"])

    def test_get_todos_status_filter(self, client, auth_headers, db_session):
        """ステータスフィルタが正しく動作することを確認"""
        todos = [
            Todo(title="Todo 1", completed=True, position=0, priority=1),
            Todo(title="Todo 2", completed=False, position=1, priority=1),
            Todo(title="Todo 3", completed=True, position=2, priority=1),
        ]
        for todo in todos:
            db_session.add(todo)
        db_session.commit()

        # 完了済みのみ
        response = client.get("/api/todos?status=completed", headers=auth_headers)
        data = response.json()
        assert len(data["data"]) == 2
        assert all(todo["completed"] for todo in data["data"])

        # 未完了のみ
        response = client.get("/api/todos?status=incomplete", headers=auth_headers)
        data = response.json()
        assert len(data["data"]) == 1
        assert not data["data"][0]["completed"]

    def test_get_todos_priority_filter(self, client, auth_headers, db_session):
        """優先度フィルタが正しく動作することを確認"""
        todos = [
            Todo(title="High", completed=False, position=0, priority=0),
            Todo(title="Medium", completed=False, position=1, priority=1),
            Todo(title="Low", completed=False, position=2, priority=2),
        ]
        for todo in todos:
            db_session.add(todo)
        db_session.commit()

        response = client.get("/api/todos?priority=0", headers=auth_headers)
        data = response.json()
        assert len(data["data"]) == 1
        assert data["data"][0]["priority"] == 0

    def test_get_todos_sort_by_priority(self, client, auth_headers, db_session):
        """優先度ソートが正しく動作することを確認"""
        todos = [
            Todo(title="Low", completed=False, position=0, priority=2),
            Todo(title="High", completed=False, position=1, priority=0),
            Todo(title="Medium", completed=False, position=2, priority=1),
        ]
        for todo in todos:
            db_session.add(todo)
        db_session.commit()

        # 昇順
        response = client.get("/api/todos?sort_by=asc", headers=auth_headers)
        data = response.json()
        priorities = [todo["priority"] for todo in data["data"]]
        assert priorities == [0, 1, 2]

        # 降順
        response = client.get("/api/todos?sort_by=desc", headers=auth_headers)
        data = response.json()
        priorities = [todo["priority"] for todo in data["data"]]
        assert priorities == [2, 1, 0]

    def test_update_todo(self, client, auth_headers, db_session):
        """Todoを更新できることを確認"""
        todo = Todo(title="Original", description="Original desc", completed=False, position=0, priority=1)
        db_session.add(todo)
        db_session.commit()
        db_session.refresh(todo)

        update_data = {
            "title": "Updated",
            "description": "Updated desc",
            "completed": True,
            "priority": 0,
        }
        response = client.put(f"/api/todos/{todo.id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated"
        assert data["description"] == "Updated desc"
        assert data["completed"] is True
        assert data["priority"] == 0

    def test_update_nonexistent_todo(self, client, auth_headers):
        """存在しないTodoの更新が失敗することを確認"""
        update_data = {"title": "Updated"}
        response = client.put("/api/todos/999", json=update_data, headers=auth_headers)
        assert response.status_code == 404

    def test_delete_todo(self, client, auth_headers, db_session):
        """Todoを削除できることを確認"""
        todo = Todo(title="To be deleted", completed=False, position=0, priority=1)
        db_session.add(todo)
        db_session.commit()
        db_session.refresh(todo)

        response = client.delete(f"/api/todos/{todo.id}", headers=auth_headers)
        assert response.status_code == 200

        # 削除されたことを確認
        response = client.get("/api/todos", headers=auth_headers)
        data = response.json()
        assert len(data["data"]) == 0

    def test_delete_nonexistent_todo(self, client, auth_headers):
        """存在しないTodoの削除が失敗することを確認"""
        response = client.delete("/api/todos/999", headers=auth_headers)
        assert response.status_code == 404

    def test_bulk_complete_todos(self, client, auth_headers, db_session):
        """一括完了操作が正しく動作することを確認"""
        todos = [Todo(title=f"Todo {i}", completed=False, position=i, priority=1) for i in range(3)]
        for todo in todos:
            db_session.add(todo)
        db_session.commit()

        todo_ids = [todo.id for todo in todos]
        response = client.put(
            "/api/todos/bulk", json={"todo_ids": todo_ids, "action": "complete"}, headers=auth_headers
        )
        assert response.status_code == 200

        # すべて完了状態になっていることを確認
        response = client.get("/api/todos", headers=auth_headers)
        data = response.json()
        assert all(todo["completed"] for todo in data["data"])

    def test_bulk_delete_todos(self, client, auth_headers, db_session):
        """一括削除操作が正しく動作することを確認"""
        todos = [Todo(title=f"Todo {i}", completed=False, position=i, priority=1) for i in range(3)]
        for todo in todos:
            db_session.add(todo)
        db_session.commit()

        todo_ids = [todo.id for todo in todos]
        response = client.put("/api/todos/bulk", json={"todo_ids": todo_ids, "action": "delete"}, headers=auth_headers)
        assert response.status_code == 200

        # すべて削除されていることを確認
        response = client.get("/api/todos", headers=auth_headers)
        data = response.json()
        assert len(data["data"]) == 0

    def test_reorder_todos(self, client, auth_headers, db_session):
        """Todoの並び替えが正しく動作することを確認"""
        todos = [
            Todo(title="First", completed=False, position=0, priority=1),
            Todo(title="Second", completed=False, position=1, priority=1),
            Todo(title="Third", completed=False, position=2, priority=1),
        ]
        for todo in todos:
            db_session.add(todo)
        db_session.commit()

        # 順序を逆にする
        todo_ids = [todos[2].id, todos[1].id, todos[0].id]
        response = client.put("/api/todos/reorder", json={"todo_ids": todo_ids}, headers=auth_headers)
        assert response.status_code == 200
