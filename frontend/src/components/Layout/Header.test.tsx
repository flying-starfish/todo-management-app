import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, type Mock } from 'vitest';
import { Header } from './Header';
import { useAuth, User } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

// AuthContextとtoastをモック化
vi.mock('../../contexts/AuthContext');
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

const mockUseAuth = useAuth as Mock<typeof useAuth>;

// テスト用のユーザーデータを作成するヘルパー関数
const createMockUser = (email: string): User => ({
  id: 1,
  email,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
});

describe('Header Component', () => {
  const mockLogout = vi.fn();
  const mockLogin = vi.fn();
  const mockRegister = vi.fn();
  const mockRefreshUserInfo = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ユーザーがログインしていない場合', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        token: null,
        login: mockLogin,
        logout: mockLogout,
        register: mockRegister,
        refreshUserInfo: mockRefreshUserInfo,
        isAuthenticated: false,
        isLoading: false,
      });
    });

    test('タイトルが表示される', () => {
      render(<Header />);
      expect(screen.getByText('Todo Management')).toBeInTheDocument();
    });

    test('ユーザーメニューが表示されない', () => {
      render(<Header />);
      expect(screen.queryByRole('button', { name: /user-menu/i })).not.toBeInTheDocument();
    });
  });

  describe('ユーザーがログインしている場合', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: createMockUser('test@example.com'),
        token: 'mock-token',
        login: mockLogin,
        logout: mockLogout,
        register: mockRegister,
        refreshUserInfo: mockRefreshUserInfo,
        isAuthenticated: true,
        isLoading: false,
      });
    });

    test('タイトルが表示される', () => {
      render(<Header />);
      expect(screen.getByText('Todo Management')).toBeInTheDocument();
    });

    test('ユーザーのイニシャルが表示される', () => {
      render(<Header />);
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    test('ユーザーのメールアドレスが表示される', () => {
      render(<Header />);
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    test('ドロップダウンメニューをクリックで開閉できる', () => {
      render(<Header />);

      const userButton = screen.getByRole('button', { name: /user menu button/i });

      // ドロップダウンが最初は閉じていることを確認（ログアウトボタンが表示されていない）
      expect(screen.queryByRole('button', { name: /ログアウト/i })).not.toBeInTheDocument();

      // クリックして開く
      fireEvent.click(userButton);

      // ログアウトボタンが表示される
      expect(screen.getByRole('button', { name: /ログアウト/i })).toBeInTheDocument();
    });

    test('ログアウトボタンをクリックするとログアウト処理が実行される', async () => {
      render(<Header />);

      const userButton = screen.getByRole('button', { name: /user menu button/i });
      fireEvent.click(userButton);

      const logoutButton = screen.getByRole('button', { name: /ログアウト/i });
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledWith('ログアウトしました');
      });
    });

    test('ドロップダウンの外側をクリックするとメニューが閉じる', async () => {
      render(<Header />);

      const userButton = screen.getByRole('button', { name: /user menu button/i });
      fireEvent.click(userButton);

      // ドロップダウンが開いていることを確認
      expect(screen.getByRole('button', { name: /ログアウト/i })).toBeInTheDocument();

      // 外側をクリック
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /ログアウト/i })).not.toBeInTheDocument();
      });
    });

    test('異なるメールアドレスでも正しいイニシャルが表示される', () => {
      mockUseAuth.mockReturnValue({
        user: createMockUser('alice@example.com'),
        token: 'mock-token',
        login: mockLogin,
        logout: mockLogout,
        register: mockRegister,
        refreshUserInfo: mockRefreshUserInfo,
        isAuthenticated: true,
        isLoading: false,
      });

      render(<Header />);
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    });
  });
});
