import React, { useEffect, useState } from 'react';
import './TodoList.css'; // CSS をインポート
import { toast, ToastContainer } from 'react-toastify'; // トースト通知をインポート
import 'react-toastify/dist/ReactToastify.css'; // トースト通知のスタイルをインポート

interface Todo {
    id: number;
    title: string;
    description?: string;
    completed: boolean;
}

const TodoList: React.FC = () => {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [newTodo, setNewTodo] = useState({ title: '', description: '' });
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'incomplete'>('all');

    // ページネーション用の状態
    const [currentPage, setCurrentPage] = useState(1); // 現在のページ番号
    const [itemsPerPage, setItemsPerPage] = useState(10); // 1ページあたりのアイテム数
    const [totalPages, setTotalPages] = useState(1); // 総ページ数を管理

    useEffect(() => {
        const queryParams = new URLSearchParams({
            page: currentPage.toString(),
            limit: itemsPerPage.toString(),
            ...(searchQuery && { search: searchQuery }),
            ...(filterStatus !== 'all' && { status: filterStatus }),
        });
    
        fetch(`http://127.0.0.1:8000/api/todos?${queryParams.toString()}`)
            .then((response) => response.json())
            .then((data) => {
                console.log('Fetched todos:', data);
                setTodos(data.data); // サーバーから取得したデータをセット
                setTotalPages(data.total_pages); // 総ページ数をセット
                setCurrentPage(data.page); // サーバーから返されたページ番号を使用
            })
            .catch((error) => console.error('Error fetching todos:', error));
    }, [currentPage, itemsPerPage, searchQuery, filterStatus]);

    const goToNextPage = () => {
        setCurrentPage((prevPage) => prevPage + 1);
    };

    const goToPreviousPage = () => {
        setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
    };

    const goToPage = (page: number) => {
        setCurrentPage(page);
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
        fetch('http://127.0.0.1:8000/api/todos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: newTodo.title,
                description: newTodo.description,
                completed: false,
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                setTodos([...todos, data]); // Add the new todo to the list
                setNewTodo({ title: '', description: '' }); // Reset the form
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
        fetch(`http://127.0.0.1:8000/api/todos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...todoToUpdate, completed: !todoToUpdate.completed }),
        })
            .then((response) => response.json())
            .then((updatedTodo) => {
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
        fetch(`http://127.0.0.1:8000/api/todos/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to delete todo with id ${id}`);
                }
                return response.status === 204 ? null : response.json();
            })
            .then(() => {
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

    // 検索とフィルタリングを適用した ToDo リスト
    // const filteredTodos = todos.filter((todo) => {
    //     const matchesSearch = todo.title.toLowerCase().includes(searchQuery.toLowerCase());
    //     const matchesFilter =
    //         filterStatus === 'all' ||
    //         (filterStatus === 'completed' && todo.completed) ||
    //         (filterStatus === 'incomplete' && !todo.completed);
    //     return matchesSearch && matchesFilter;
    // });

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

            {/* フィルタリングボタン */}
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
                <button type="submit">Add Todo</button>
                {error && <p style={{ color: 'red' }}>{error}</p>}
            </form>

            {todos.length > 0 ? (
                <>
                <ul className="todo-list">
                    {todos.map((todo) => (
                        <li
                            key={todo.id}
                            className={`todo-item ${todo.completed ? 'completed' : ''}`}
                        >
                            <div>
                                <h3>{todo.title}</h3>
                                <p>{todo.description}</p>
                                <p>Status: {todo.completed ? 'Completed' : 'Incomplete'}</p>
                            </div>
                            <div>
                                <button
                                    className="complete-btn"
                                    onClick={() => handleToggleComplete(todo.id)}
                                >
                                    {todo.completed ? 'Mark as Incomplete' : 'Mark as Complete'}
                                </button>
                                <button
                                    className="delete-btn"
                                    onClick={() => handleDeleteTodo(todo.id)}
                                >
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
                <div>
                <button onClick={goToPreviousPage} disabled={currentPage === 1}>
                    Previous
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button onClick={goToNextPage} disabled={currentPage === totalPages}>
                    Next
                </button>
            </div>
            </>
            ) : (
                <p>No todos match your criteria!</p>
            )}
            {/* トースト通知を表示するコンテナ */}
            <ToastContainer />
        </div>
    );
};

export default TodoList;