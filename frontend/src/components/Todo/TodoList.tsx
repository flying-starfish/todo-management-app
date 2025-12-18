import React, { useEffect, useState } from 'react';
import './TodoList.css'; // CSS をインポート
import { toast, ToastContainer } from 'react-toastify'; // トースト通知をインポート
import 'react-toastify/dist/ReactToastify.css'; // トースト通知のスタイルをインポート
import { apiClient } from '../../utils/apiClient'; // 認証付きAPIクライアントをインポート
import TodoEditPanel from './TodoEditPanel'; // 編集パネルをインポート
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Todo {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  position: number;
  priority: number;
  due_date?: string;
}

interface TodoListProps {
  todo: Todo;
  onToggleComplete: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
  onUpdateTitle: (id: number, newTitle: string) => void;
  isSelected: boolean;
  onSelect: (id: number, selected: boolean) => void;
  isDraggable: boolean;
}

// ソート可能なTodoアイテムコンポーネント
const SortableTodoItem = ({
  todo,
  onToggleComplete,
  onDelete,
  onEdit,
  onUpdateTitle,
  isSelected,
  onSelect,
  isDraggable,
}: TodoListProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(todo.title);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // タイトルのダブルクリックでインライン編集モードに
  const handleTitleDoubleClick = () => {
    setIsEditingTitle(true);
  };

  // インライン編集の保存
  const handleTitleSave = () => {
    if (editedTitle.trim() === '') {
      setEditedTitle(todo.title); // 空の場合は元に戻す
    } else if (editedTitle !== todo.title) {
      // タイトルが変更された場合のみデータベースを更新
      onUpdateTitle(todo.id, editedTitle);
    }
    setIsEditingTitle(false);
  };

  // Enterキーで保存、Escapeでキャンセル
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditedTitle(todo.title);
      setIsEditingTitle(false);
    }
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`todo-item ${todo.completed ? 'completed' : ''} ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''} priority-${todo.priority}`}
      {...attributes}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => onSelect(todo.id, e.target.checked)}
        className="todo-checkbox"
      />
      <div className={`drag-handle ${!isDraggable ? 'disabled' : ''}`} {...listeners}>
        ⋮⋮
      </div>
      <div className="todo-content">
        {isEditingTitle ? (
          <input
            type="text"
            className="inline-edit-input"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            autoFocus
          />
        ) : (
          <h3 onDoubleClick={handleTitleDoubleClick} className="editable-title">
            {todo.title}
          </h3>
        )}
        <p>{todo.description}</p>
        <p>Status: {todo.completed ? 'Completed' : 'Incomplete'}</p>
        <p>Priority: {todo.priority === 0 ? 'High' : todo.priority === 1 ? 'Medium' : 'Low'}</p>
        {todo.due_date && <p>Due Date: {new Date(todo.due_date).toLocaleDateString()}</p>}
      </div>
      <div className="todo-actions">
        <button className="edit-btn" onClick={() => onEdit(todo.id)} title="Edit todo details">
          Edit
        </button>
        <button className="complete-btn" onClick={() => onToggleComplete(todo.id)}>
          {todo.completed ? 'Mark as Incomplete' : 'Mark as Complete'}
        </button>
        <button className="delete-btn" onClick={() => onDelete(todo.id)}>
          Delete
        </button>
      </div>
    </li>
  );
};

const TodoList = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState({ title: '', description: '', priority: 1, due_date: '' });
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'incomplete'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  // sortOrder状態を追加
  const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none');
  const isDraggable = sortOrder === 'none';

  // ページネーション用の状態
  const [currentPage, setCurrentPage] = useState(1); // 現在のページ番号
  const [itemsPerPage, _setItemsPerPage] = useState(10); // 1ページあたりのアイテム数
  const [totalPages, setTotalPages] = useState(1); // 総ページ数を管理

  // 一括操作用の状態
  const [selectedTodos, setSelectedTodos] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // 編集パネル用の状態
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);

  // ドラッグ&ドロップのセンサー
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const queryParams = new URLSearchParams({
      page: currentPage.toString(),
      limit: itemsPerPage.toString(),
      ...(searchQuery && { search: searchQuery }),
      ...(filterStatus !== 'all' && { status: filterStatus }),
      sort_by: sortOrder,
    });
    // 優先度フィルタを追加
    if (filterPriority !== 'all') {
      const priorityMap = { high: 0, medium: 1, low: 2 };
      queryParams.append('priority', priorityMap[filterPriority].toString());
    }
    const url = `/api/todos?${queryParams.toString()}`;
    console.log('Fetching todos from:', url);

    apiClient
      .get(url)
      .then((response) => {
        console.log('Response status:', response.status);
        const data = response.data;
        console.log('Fetched todos:', data);
        console.log('Setting todos to:', data.data);
        setTodos(data.data); // サーバーから取得したデータをセット
        setTotalPages(data.total_pages); // 総ページ数をセット
        setCurrentPage(data.page); // サーバーから返されたページ番号を使用

        // ページが変わったときに選択状態をリセット
        setSelectedTodos(new Set());
        setSelectAll(false);
      })
      .catch((error) => {
        console.error('Error fetching todos:', error);
        setError(`Failed to fetch todos: ${error.message}`);
      });
  }, [currentPage, itemsPerPage, searchQuery, filterStatus, filterPriority, sortOrder]);

  const goToNextPage = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  const goToPreviousPage = () => {
    setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
  };

  // TODO: ページ番号指定での移動機能（将来実装予定）
  // const goToPage = (page: number) => {
  //   setCurrentPage(page);
  // };

  // ドラッグ終了時の処理
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTodos((todos) => {
        const oldIndex = todos.findIndex((todo) => todo.id === active.id);
        const newIndex = todos.findIndex((todo) => todo.id === over.id);

        const newTodos = arrayMove(todos, oldIndex, newIndex);

        // バックエンドに新しい順序を送信
        const todoIds = newTodos.map((todo) => todo.id);
        console.log('Sending todo IDs:', todoIds); // デバッグ用ログ追加

        apiClient
          .put('/api/todos/reorder', { todo_ids: todoIds })
          .then((_response) => {
            toast.success('Todos reordered successfully!');
          })
          .catch((error) => {
            console.error('Error reordering todos:', error);
            toast.error('Failed to reorder todos.');
          });

        return newTodos;
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewTodo({ ...newTodo, [name]: value });

    // リアルタイムバリデーション
    if (name === 'title' && value.trim() === '') {
      setError('Title is required.');
    } else {
      setError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーションチェック
    if (newTodo.title.trim() === '') {
      setError('Title is required.');
      return;
    }

    // Send POST request to FastAPI to create a new todo
    apiClient
      .post('/api/todos', {
        title: newTodo.title,
        description: newTodo.description,
        completed: false,
        priority: newTodo.priority,
        due_date: newTodo.due_date,
      })
      .then((response) => {
        const data = response.data;
        setTodos([...todos, data]); // Add the new todo to the list
        setNewTodo({ title: '', description: '', priority: 1, due_date: '' }); // Reset the form
        setError(null); // エラーをリセット

        // トースト通知を表示
        toast.success('Todo added successfully!');
      })
      .catch((error) => {
        console.error('Error creating todo:', error);
        toast.error('Failed to add todo.');
      });
  };

  const handleToggleComplete = (id: number) => {
    const todoToUpdate = todos.find((todo) => todo.id === id);
    if (!todoToUpdate) return;

    // Send PUT request to FastAPI to update the todo
    apiClient
      .put(`/api/todos/${id}`, { ...todoToUpdate, completed: !todoToUpdate.completed })
      .then((response) => {
        const updatedTodo = response.data;
        // Update the todos state with the updated todo
        setTodos(todos.map((todo) => (todo.id === id ? updatedTodo : todo)));
      })
      .catch((error) => console.error('Error updating todo:', error));
  };

  const handleDeleteTodo = (id: number) => {
    const todoToDelete = todos.find((todo) => todo.id === id);
    if (!todoToDelete) return;

    console.log(`Deleting todo with id: ${id}`);

    // Send DELETE request to FastAPI to delete the todo
    apiClient
      .delete(`/api/todos/${id}`)
      .then((_response) => {
        // Remove the deleted todo from the todos state
        setTodos(todos.filter((todo) => todo.id !== id));

        // トースト通知を表示
        toast.success('Todo deleted successfully!');
      })
      .catch((error) => {
        console.error('Error deleting todo:', error);
        toast.error('Failed to delete todo.');
      });
  };

  // 一括操作のハンドラー関数
  const handleSelectTodo = (id: number, selected: boolean) => {
    const newSelected = new Set(selectedTodos);
    if (selected) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedTodos(newSelected);
    setSelectAll(newSelected.size === todos.length && todos.length > 0);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedTodos(new Set(todos.map((todo) => todo.id)));
    } else {
      setSelectedTodos(new Set());
    }
    setSelectAll(selected);
  };

  const handleBulkAction = (action: 'complete' | 'incomplete' | 'delete') => {
    console.log('handleBulkAction called with action:', action);

    if (selectedTodos.size === 0) {
      toast.warning('Please select at least one todo.');
      return;
    }

    const todoIds = Array.from(selectedTodos);
    const requestBody = {
      todo_ids: todoIds,
      action: action,
    };

    console.log('Request body:', JSON.stringify(requestBody));

    apiClient
      .put('/api/todos/bulk', requestBody)
      .then(() => {
        // const data = response.data; // 現在未使用
        if (action === 'delete') {
          // 削除の場合は該当のtodoを配列から除去
          setTodos(todos.filter((todo) => !selectedTodos.has(todo.id)));
          toast.success(`Deleted ${selectedTodos.size} todos successfully!`);
        } else {
          // 完了状態更新の場合は該当のtodoの状態を更新
          const completed = action === 'complete';
          setTodos(
            todos.map((todo) => (selectedTodos.has(todo.id) ? { ...todo, completed } : todo))
          );
          toast.success(`Updated ${selectedTodos.size} todos successfully!`);
        }

        // 選択をリセット
        setSelectedTodos(new Set());
        setSelectAll(false);
      })
      .catch((error) => {
        console.error('Error performing bulk action:', error);
        toast.error('Failed to perform bulk action.');
      });
  };

  // 編集ボタンがクリックされた時の処理
  const handleEditTodo = (id: number) => {
    const todoToEdit = todos.find((todo) => todo.id === id);
    if (todoToEdit) {
      setEditingTodo(todoToEdit);
      setIsEditPanelOpen(true);
    }
  };

  // サイドパネルでの保存処理
  const handleSaveTodo = (id: number, updatedFields: Partial<Todo>) => {
    const todoToUpdate = todos.find((todo) => todo.id === id);
    if (!todoToUpdate) return;

    // 既存のTodoデータとマージして完全なデータを送信
    const fullTodoData = {
      title: updatedFields.title ?? todoToUpdate.title,
      description: updatedFields.description ?? todoToUpdate.description,
      completed: updatedFields.completed ?? todoToUpdate.completed,
      position: todoToUpdate.position, // positionは保持
      priority: updatedFields.priority ?? todoToUpdate.priority,
      due_date: updatedFields.due_date ?? todoToUpdate.due_date,
    };

    apiClient
      .put(`/api/todos/${id}`, fullTodoData)
      .then((response) => {
        const updatedTodo = response.data;
        setTodos(todos.map((todo) => (todo.id === id ? updatedTodo : todo)));
        setIsEditPanelOpen(false);
        toast.success('Todo updated successfully!');
      })
      .catch((error) => {
        console.error('Error updating todo:', error);
        toast.error('Failed to update todo.');
      });
  };

  // インライン編集でタイトルのみを更新
  const handleUpdateTitle = (id: number, newTitle: string) => {
    const todoToUpdate = todos.find((todo) => todo.id === id);
    if (!todoToUpdate) return;

    // タイトルのみを変更して完全なデータを送信
    const fullTodoData = {
      title: newTitle,
      description: todoToUpdate.description,
      completed: todoToUpdate.completed,
      position: todoToUpdate.position,
      priority: todoToUpdate.priority,
      due_date: todoToUpdate.due_date,
    };

    apiClient
      .put(`/api/todos/${id}`, fullTodoData)
      .then((response) => {
        const updatedTodo = response.data;
        setTodos(todos.map((todo) => (todo.id === id ? updatedTodo : todo)));
        toast.success('Title updated successfully!');
      })
      .catch((error) => {
        console.error('Error updating title:', error);
        toast.error('Failed to update title.');
      });
  };

  return (
    <div>
      <h2>Todo List</h2>

      {/* 検索バー */}
      <input
        type="text"
        placeholder="Search todos..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ marginBottom: '10px', display: 'block' }}
      />

      {/* 完了状態フィルタリングボタン */}
      <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
        <button
          className="filter-btn"
          onClick={() => setFilterStatus('all')}
          disabled={filterStatus === 'all'}
        >
          All
        </button>
        <button
          className="filter-btn"
          onClick={() => setFilterStatus('completed')}
          disabled={filterStatus === 'completed'}
        >
          Completed
        </button>
        <button
          className="filter-btn"
          onClick={() => setFilterStatus('incomplete')}
          disabled={filterStatus === 'incomplete'}
        >
          Incomplete
        </button>
      </div>

      {/* 優先度フィルタリングボタン */}
      <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
        <button
          className="filter-btn"
          onClick={() => setFilterPriority('all')}
          disabled={filterPriority === 'all'}
        >
          All Priorities
        </button>
        <button
          className="filter-btn"
          onClick={() => setFilterPriority('high')}
          disabled={filterPriority === 'high'}
        >
          High
        </button>
        <button
          className="filter-btn"
          onClick={() => setFilterPriority('medium')}
          disabled={filterPriority === 'medium'}
        >
          Medium
        </button>
        <button
          className="filter-btn"
          onClick={() => setFilterPriority('low')}
          disabled={filterPriority === 'low'}
        >
          Low
        </button>
      </div>

      {/* 新規Todo追加フォーム */}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="title"
          placeholder="Enter a title (required)"
          value={newTodo.title}
          onChange={handleInputChange}
          className={error ? 'error' : ''} // エラー時にクラスを追加
        />
        <input
          type="text"
          name="description"
          placeholder="Enter a description (optional)"
          value={newTodo.description}
          onChange={handleInputChange}
        />
        {/* 優先度選択フィールドを追加 */}
        <select
          name="priority"
          value={newTodo.priority}
          onChange={(e) => setNewTodo({ ...newTodo, priority: parseInt(e.target.value) })}
        >
          <option value={0}>High</option>
          <option value={1}>Medium</option>
          <option value={2}>Low</option>
        </select>
        {/* 期限日フィールドを追加 */}
        <input
          type="date"
          name="due_date"
          value={newTodo.due_date}
          onChange={(e) => setNewTodo({ ...newTodo, due_date: e.target.value })}
        />
        <button type="submit">Add Todo</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>

      {todos.length > 0 ? (
        <>
          {/* 一括操作コントロール */}
          <div className="bulk-actions">
            <div className="select-all">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={(e) => handleSelectAll(e.target.checked)}
                id="select-all"
              />
              <label htmlFor="select-all">
                {selectedTodos.size > 0 ? `${selectedTodos.size} selected` : 'Select All'}
              </label>
            </div>

            {selectedTodos.size > 0 && (
              <div className="bulk-action-buttons">
                <button
                  className="bulk-btn complete-btn"
                  onClick={() => handleBulkAction('complete')}
                >
                  Mark as Complete
                </button>
                <button
                  className="bulk-btn incomplete-btn"
                  onClick={() => handleBulkAction('incomplete')}
                >
                  Mark as Incomplete
                </button>
                <button className="bulk-btn delete-btn" onClick={() => handleBulkAction('delete')}>
                  Delete Selected
                </button>
              </div>
            )}
          </div>
          {/* 優先度によるソートボタン */}
          <div style={{ marginBottom: '10px' }}>
            <button
              className="sort-btn"
              onClick={() => {
                if (sortOrder === 'none') {
                  setSortOrder('asc');
                } else if (sortOrder === 'asc') {
                  setSortOrder('desc');
                } else {
                  setSortOrder('none');
                }
              }}
            >
              Sort by Priority:{' '}
              {sortOrder === 'none' ? 'None' : sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </button>
          </div>

          {/* DndContextをソート時は無効化 */}
          {isDraggable ? (
            // ソート有効時のドラッグ&ドロップ表示
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={todos.map((todo) => todo.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="todo-list">
                  {todos.map((todo) => (
                    <SortableTodoItem
                      key={todo.id}
                      todo={todo}
                      onToggleComplete={handleToggleComplete}
                      onDelete={handleDeleteTodo}
                      onEdit={handleEditTodo}
                      onUpdateTitle={handleUpdateTitle}
                      isSelected={selectedTodos.has(todo.id)}
                      onSelect={handleSelectTodo}
                      isDraggable={isDraggable}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          ) : (
            // ソート無効時の通常表示
            <>
              <div
                className="sort-notice"
                style={{
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  padding: '10px',
                  marginBottom: '10px',
                  borderRadius: '5px',
                  textAlign: 'center',
                }}
              >
                ⚠️ 優先度でソート中です。手動で並び替えるには「None」に戻してください。
              </div>

              <div>
                <ul className="todo-list">
                  {todos.map((todo) => (
                    <SortableTodoItem
                      key={todo.id}
                      todo={todo}
                      onToggleComplete={handleToggleComplete}
                      onDelete={handleDeleteTodo}
                      onEdit={handleEditTodo}
                      onUpdateTitle={handleUpdateTitle}
                      isSelected={selectedTodos.has(todo.id)}
                      onSelect={handleSelectTodo}
                      isDraggable={isDraggable}
                    />
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* ページネーションコントロール */}
          <div>
            <button onClick={goToPreviousPage} disabled={currentPage === 1}>
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button onClick={goToNextPage} disabled={currentPage === totalPages}>
              Next
            </button>
          </div>
        </>
      ) : (
        <p>No todos match your criteria!</p>
      )}

      {/* 編集パネル */}
      {editingTodo && (
        <TodoEditPanel
          todo={editingTodo}
          isOpen={isEditPanelOpen}
          onClose={() => setIsEditPanelOpen(false)}
          onSave={handleSaveTodo}
        />
      )}

      {/* トースト通知を表示するコンテナ */}
      <ToastContainer />
    </div>
  );
};

export default TodoList;
