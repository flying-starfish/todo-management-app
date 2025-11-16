import React, { useState, useEffect } from 'react';
import './TodoEditPanel.css';

interface Todo {
    id: number;
    title: string;
    description?: string;
    completed: boolean;
    position: number;
    priority: number;
}

interface TodoEditPanelProps {
    todo: Todo;
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: number, updatedTodo: Partial<Todo>) => void;
}

const TodoEditPanel: React.FC<TodoEditPanelProps> = ({ todo, isOpen, onClose, onSave }) => {
    const [editedTodo, setEditedTodo] = useState<Todo>(todo);
    const [error, setError] = useState<string | null>(null);

    // todoが変更されたら編集中のデータも更新
    useEffect(() => {
        setEditedTodo(todo);
        setError(null);
    }, [todo]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditedTodo({ ...editedTodo, [name]: name === 'priority' ? parseInt(value) : value });

        // リアルタイムバリデーション
        if (name === 'title' && value.trim() === '') {
            setError('Title is required.');
        } else {
            setError(null);
        }
    };

    const handleSave = () => {
        if (editedTodo.title.trim() === '') {
            setError('Title is required.');
            return;
        }

        onSave(todo.id, {
            title: editedTodo.title,
            description: editedTodo.description,
            priority: editedTodo.priority,
        });
        setError(null);
    };

    const handleCancel = () => {
        setEditedTodo(todo); // 変更を破棄
        setError(null);
        onClose();
    };

    // ESCキーでパネルを閉じる
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                handleCancel();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, todo]);

    return (
        <>
            {/* オーバーレイ */}
            <div 
                className={`edit-panel-overlay ${isOpen ? 'open' : ''}`}
                onClick={handleCancel}
            />

            {/* サイドパネル */}
            <div className={`edit-panel ${isOpen ? 'open' : ''}`}>
                <div className="edit-panel-header">
                    <h2>Edit Todo</h2>
                    <button className="close-btn" onClick={handleCancel} aria-label="Close">
                        ✕
                    </button>
                </div>

                <div className="edit-panel-content">
                    <div className="form-group">
                        <label htmlFor="edit-title">Title *</label>
                        <input
                            id="edit-title"
                            type="text"
                            name="title"
                            value={editedTodo.title}
                            onChange={handleInputChange}
                            className={error ? 'error' : ''}
                            placeholder="Enter todo title"
                            autoFocus
                        />
                        {error && <span className="error-message">{error}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="edit-description">Description</label>
                        <textarea
                            id="edit-description"
                            name="description"
                            value={editedTodo.description || ''}
                            onChange={handleInputChange}
                            placeholder="Enter todo description (optional)"
                            rows={4}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="edit-priority">Priority</label>
                        <select
                            id="edit-priority"
                            name="priority"
                            value={editedTodo.priority}
                            onChange={handleInputChange}
                        >
                            <option value={0}>High</option>
                            <option value={1}>Medium</option>
                            <option value={2}>Low</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Status</label>
                        <div className="status-badge">
                            {editedTodo.completed ? '✓ Completed' : '○ Incomplete'}
                        </div>
                    </div>
                </div>

                <div className="edit-panel-footer">
                    <button className="cancel-btn" onClick={handleCancel}>
                        Cancel
                    </button>
                    <button className="save-btn" onClick={handleSave} disabled={!!error}>
                        Save Changes
                    </button>
                </div>
            </div>
        </>
    );
};

export default TodoEditPanel;
