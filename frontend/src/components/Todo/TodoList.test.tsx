import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TodoList from './TodoList';
import { apiClient } from '../../utils/apiClient';
import { toast } from 'react-toastify';

// 依存関係をモック化
jest.mock('../../utils/apiClient');
jest.mock('react-toastify');

// TodoEditPanelをモック化
jest.mock('./TodoEditPanel', () => {
  return function MockTodoEditPanel({ isOpen, onClose, onSave, todo }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="edit-panel">
        <h3>Edit Panel</h3>
        <button onClick={onClose}>Close Panel</button>
        <button onClick={() => onSave(todo.id, { title: 'Updated Title' })}>Save Changes</button>
      </div>
    );
  };
});

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockToast = toast as jest.Mocked<typeof toast>;

// モックデータ
const mockTodos = [
  {
    id: 1,
    title: 'Test Todo 1',
    description: 'Description 1',
    completed: false,
    position: 0,
    priority: 0,
  },
  {
    id: 2,
    title: 'Test Todo 2',
    description: 'Description 2',
    completed: true,
    position: 1,
    priority: 1,
  },
  {
    id: 3,
    title: 'Test Todo 3',
    description: 'Description 3',
    completed: false,
    position: 2,
    priority: 2,
  },
];

describe('TodoList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // デフォルトのAPIレスポンス
    mockApiClient.get.mockResolvedValue({
      data: {
        data: mockTodos,
        page: 1,
        total_pages: 1,
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    mockToast.success = jest.fn();
    mockToast.error = jest.fn();
    mockToast.warning = jest.fn();
  });

  describe('初期表示', () => {
    test('Todoリストが表示される', async () => {
      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
        expect(screen.getByText('Test Todo 2')).toBeInTheDocument();
        expect(screen.getByText('Test Todo 3')).toBeInTheDocument();
      });
    });

    test('APIからTodoを取得する', async () => {
      render(<TodoList />);

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(expect.stringContaining('/api/todos'));
      });
    });

    test('新規Todo追加フォームが表示される', () => {
      render(<TodoList />);

      expect(screen.getByPlaceholderText('Enter a title (required)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter a description (optional)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add Todo' })).toBeInTheDocument();
    });

    test('フィルターボタンが表示される', () => {
      render(<TodoList />);

      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Completed' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Incomplete' })).toBeInTheDocument();
    });

    test('Todoが存在しない場合、メッセージが表示される', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        data: {
          data: [],
          page: 1,
          total_pages: 1,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('No todos match your criteria!')).toBeInTheDocument();
      });
    });
  });

  describe('Todo追加', () => {
    test('新しいTodoを追加できる', async () => {
      const newTodo = {
        id: 4,
        title: 'New Todo',
        description: 'New Description',
        completed: false,
        position: 3,
        priority: 1,
      };

      mockApiClient.post.mockResolvedValueOnce({
        data: newTodo,
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      });

      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
      });

      const titleInput = screen.getByPlaceholderText('Enter a title (required)');
      const descriptionInput = screen.getByPlaceholderText('Enter a description (optional)');
      const addButton = screen.getByRole('button', { name: 'Add Todo' });

      fireEvent.change(titleInput, { target: { value: 'New Todo' } });
      fireEvent.change(descriptionInput, { target: { value: 'New Description' } });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith('/api/todos', {
          title: 'New Todo',
          description: 'New Description',
          completed: false,
          priority: 1,
        });
        expect(mockToast.success).toHaveBeenCalledWith('Todo added successfully!');
      });
    });

    test('タイトルが空の場合、エラーメッセージが表示される', async () => {
      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: 'Add Todo' });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Title is required.')).toBeInTheDocument();
      });

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    test('Todo追加に失敗した場合、エラートーストが表示される', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Network error'));

      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
      });

      const titleInput = screen.getByPlaceholderText('Enter a title (required)');
      const addButton = screen.getByRole('button', { name: 'Add Todo' });

      fireEvent.change(titleInput, { target: { value: 'New Todo' } });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to add todo.');
      });
    });
  });

  describe('Todo削除', () => {
    test('Todoを削除できる', async () => {
      mockApiClient.delete.mockResolvedValueOnce({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockApiClient.delete).toHaveBeenCalledWith('/api/todos/1');
        expect(mockToast.success).toHaveBeenCalledWith('Todo deleted successfully!');
      });
    });

    test('Todo削除に失敗した場合、エラートーストが表示される', async () => {
      mockApiClient.delete.mockRejectedValueOnce(new Error('Network error'));

      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to delete todo.');
      });
    });
  });

  describe('Todo完了状態の切り替え', () => {
    test('Todoを完了にできる', async () => {
      const updatedTodo = { ...mockTodos[0], completed: true };
      mockApiClient.put.mockResolvedValueOnce({
        data: updatedTodo,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
      });

      const completeButtons = screen.getAllByRole('button', { name: 'Mark as Complete' });
      fireEvent.click(completeButtons[0]);

      await waitFor(() => {
        expect(mockApiClient.put).toHaveBeenCalledWith(
          '/api/todos/1',
          expect.objectContaining({ completed: true })
        );
      });
    });

    test('完了済みTodoを未完了にできる', async () => {
      const updatedTodo = { ...mockTodos[1], completed: false };
      mockApiClient.put.mockResolvedValueOnce({
        data: updatedTodo,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 2')).toBeInTheDocument();
      });

      const incompleteButton = screen.getByRole('button', { name: 'Mark as Incomplete' });
      fireEvent.click(incompleteButton);

      await waitFor(() => {
        expect(mockApiClient.put).toHaveBeenCalledWith(
          '/api/todos/2',
          expect.objectContaining({ completed: false })
        );
      });
    });
  });

  describe('検索機能', () => {
    test('検索クエリを入力できる', async () => {
      render(<TodoList />);

      const searchInput = screen.getByPlaceholderText('Search todos...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      expect(searchInput).toHaveValue('Test');
    });

    test('検索クエリでAPIが呼ばれる', async () => {
      render(<TodoList />);

      const searchInput = screen.getByPlaceholderText('Search todos...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(expect.stringContaining('search=Test'));
      });
    });
  });

  describe('フィルター機能', () => {
    test('完了フィルターをクリックできる', async () => {
      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
      });

      const completedButton = screen.getByRole('button', { name: 'Completed' });
      fireEvent.click(completedButton);

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(expect.stringContaining('status=completed'));
      });
    });

    test('未完了フィルターをクリックできる', async () => {
      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
      });

      const incompleteButton = screen.getByRole('button', { name: 'Incomplete' });
      fireEvent.click(incompleteButton);

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('status=incomplete')
        );
      });
    });

    test('優先度フィルターをクリックできる', async () => {
      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
      });

      const highButton = screen.getByRole('button', { name: 'High' });
      fireEvent.click(highButton);

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(expect.stringContaining('priority=0'));
      });
    });
  });

  describe('ページネーション', () => {
    test('次のページに移動できる', async () => {
      mockApiClient.get.mockResolvedValue({
        data: {
          data: mockTodos,
          page: 1,
          total_pages: 3,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: 'Next' });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(expect.stringContaining('page=2'));
      });
    });

    test('前のページに移動できる', async () => {
      mockApiClient.get.mockResolvedValue({
        data: {
          data: mockTodos,
          page: 2,
          total_pages: 3,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
      });

      const prevButton = screen.getByRole('button', { name: 'Previous' });
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(expect.stringContaining('page=1'));
      });
    });

    test('最初のページでは前ボタンが無効化される', async () => {
      render(<TodoList />);

      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: 'Previous' });
        expect(prevButton).toBeDisabled();
      });
    });

    test('最後のページでは次ボタンが無効化される', async () => {
      mockApiClient.get.mockResolvedValue({
        data: {
          data: mockTodos,
          page: 1,
          total_pages: 1,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      render(<TodoList />);

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: 'Next' });
        expect(nextButton).toBeDisabled();
      });
    });
  });

  describe('一括操作', () => {
    test('Todoを選択できる', async () => {
      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      // 最初のチェックボックスは「Select All」なので、2番目から
      fireEvent.click(checkboxes[1]);

      await waitFor(() => {
        expect(checkboxes[1]).toBeChecked();
      });
    });

    test('全選択ができる', async () => {
      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText(/Select All/i);
      fireEvent.click(selectAllCheckbox);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        checkboxes.forEach((checkbox) => {
          expect(checkbox).toBeChecked();
        });
      });
    });

    test('選択されたTodoを一括完了できる', async () => {
      mockApiClient.put.mockResolvedValueOnce({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
      });

      // 1つ目のTodoを選択
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);

      await waitFor(() => {
        // 一括操作ボタンを取得（bulk-btn クラスを持つもの）
        const bulkCompleteButtons = screen.getAllByRole('button', { name: 'Mark as Complete' });
        const bulkCompleteButton = bulkCompleteButtons.find((btn) =>
          btn.classList.contains('bulk-btn')
        );
        expect(bulkCompleteButton).toBeDefined();
        fireEvent.click(bulkCompleteButton!);
      });

      await waitFor(() => {
        expect(mockApiClient.put).toHaveBeenCalledWith(
          '/api/todos/bulk',
          expect.objectContaining({
            todo_ids: [1],
            action: 'complete',
          })
        );
        expect(mockToast.success).toHaveBeenCalledWith('Updated 1 todos successfully!');
      });
    });

    test('選択されたTodoを一括削除できる', async () => {
      mockApiClient.put.mockResolvedValueOnce({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
      });

      // 1つ目のTodoを選択
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);

      await waitFor(() => {
        const bulkDeleteButton = screen.getByRole('button', { name: 'Delete Selected' });
        fireEvent.click(bulkDeleteButton);
      });

      await waitFor(() => {
        expect(mockApiClient.put).toHaveBeenCalledWith(
          '/api/todos/bulk',
          expect.objectContaining({
            todo_ids: [1],
            action: 'delete',
          })
        );
        expect(mockToast.success).toHaveBeenCalledWith('Deleted 1 todos successfully!');
      });
    });

    test('選択数が表示される', async () => {
      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
      });

      // 初期状態では「Select All」が表示される
      expect(screen.getByLabelText(/Select All/i)).toBeInTheDocument();

      // 1つ選択すると選択数が表示される
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);

      await waitFor(() => {
        expect(screen.getByText('1 selected')).toBeInTheDocument();
      });
    });
  });

  describe('編集機能', () => {
    test('編集ボタンをクリックすると編集パネルが開く', async () => {
      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('edit-panel')).toBeInTheDocument();
      });
    });

    test('編集パネルで変更を保存できる', async () => {
      mockApiClient.put.mockResolvedValueOnce({
        data: { ...mockTodos[0], title: 'Updated Title' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: 'Save Changes' });
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(mockApiClient.put).toHaveBeenCalledWith(
          '/api/todos/1',
          expect.objectContaining({ title: 'Updated Title' })
        );
        expect(mockToast.success).toHaveBeenCalledWith('Todo updated successfully!');
      });
    });

    test('編集パネルを閉じることができる', async () => {
      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('edit-panel')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: 'Close Panel' });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('edit-panel')).not.toBeInTheDocument();
      });
    });
  });

  describe('ソート機能', () => {
    test('優先度でソートできる', async () => {
      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
      });

      const sortButton = screen.getByRole('button', { name: /Sort by Priority/i });
      fireEvent.click(sortButton);

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(expect.stringContaining('sort_by=asc'));
      });
    });

    test('ソート順を切り替えられる（None → Asc → Desc → None）', async () => {
      render(<TodoList />);

      await waitFor(() => {
        expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
      });

      const sortButton = screen.getByRole('button', { name: /Sort by Priority: None/i });

      // None → Asc
      fireEvent.click(sortButton);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Sort by Priority: Ascending/i })
        ).toBeInTheDocument();
      });

      // Asc → Desc
      fireEvent.click(sortButton);
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Sort by Priority: Descending/i })
        ).toBeInTheDocument();
      });

      // Desc → None
      fireEvent.click(sortButton);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Sort by Priority: None/i })).toBeInTheDocument();
      });
    });
  });
});
