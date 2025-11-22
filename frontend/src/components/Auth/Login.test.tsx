import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, type Mock } from 'vitest';
import { Login } from './Login';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

// 依存関係をモック化
vi.mock('../../contexts/AuthContext');
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// react-router-domのモック
const mockNavigate = vi.fn();
const mockLocation: {
  pathname: string;
  search: string;
  hash: string;
  state: any;
  key: string;
} = {
  pathname: '/auth',
  search: '',
  hash: '',
  state: null,
  key: 'default',
};

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

const mockUseAuth = useAuth as Mock<typeof useAuth>;

describe('Login Component', () => {
  const mockLogin = vi.fn();
  const mockOnSwitchToRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockLocation.state = null;

    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      login: mockLogin,
      logout: vi.fn(),
      register: vi.fn(),
      refreshUserInfo: vi.fn(),
      isAuthenticated: false,
      isLoading: false,
    });

    toast.error = vi.fn();
    toast.success = vi.fn();
  });

  describe('初期表示', () => {
    test('ログインフォームが表示される', () => {
      render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

      expect(screen.getByRole('heading', { name: 'ログイン' })).toBeInTheDocument();
      expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
      expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
    });

    test('新規登録ボタンが表示される', () => {
      render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

      expect(screen.getByText('アカウントをお持ちでない方は')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '新規登録' })).toBeInTheDocument();
    });

    test('入力フィールドが空の状態で表示される', () => {
      render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

      const emailInput = screen.getByLabelText('メールアドレス') as HTMLInputElement;
      const passwordInput = screen.getByLabelText('パスワード') as HTMLInputElement;

      expect(emailInput.value).toBe('');
      expect(passwordInput.value).toBe('');
    });
  });

  describe('フォーム入力', () => {
    test('メールアドレスを入力できる', () => {
      render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

      const emailInput = screen.getByLabelText('メールアドレス') as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      expect(emailInput.value).toBe('test@example.com');
    });

    test('パスワードを入力できる', () => {
      render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

      const passwordInput = screen.getByLabelText('パスワード') as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      expect(passwordInput.value).toBe('password123');
    });

    test('複数のフィールドを同時に入力できる', () => {
      render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

      const emailInput = screen.getByLabelText('メールアドレス') as HTMLInputElement;
      const passwordInput = screen.getByLabelText('パスワード') as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: 'user@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'mypassword' } });

      expect(emailInput.value).toBe('user@test.com');
      expect(passwordInput.value).toBe('mypassword');
    });
  });

  describe('バリデーション', () => {
    test('メールアドレスが空の場合、HTML5バリデーションが機能する', () => {
      render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

      const emailInput = screen.getByLabelText('メールアドレス') as HTMLInputElement;
      const passwordInput = screen.getByLabelText('パスワード');

      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // HTML5のrequired属性が設定されていることを確認
      expect(emailInput).toBeRequired();
      expect(emailInput.validity.valid).toBe(false);
    });

    test('パスワードが空の場合、HTML5バリデーションが機能する', () => {
      render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード') as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      // HTML5のrequired属性が設定されていることを確認
      expect(passwordInput).toBeRequired();
      expect(passwordInput.validity.valid).toBe(false);
    });

    test('両方のフィールドが入力されると、バリデーションが通る', () => {
      render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

      const emailInput = screen.getByLabelText('メールアドレス') as HTMLInputElement;
      const passwordInput = screen.getByLabelText('パスワード') as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // 両方のフィールドが有効であることを確認
      expect(emailInput.validity.valid).toBe(true);
      expect(passwordInput.validity.valid).toBe(true);
    });
  });

  describe('ログイン成功', () => {
    test('正しい情報でログインできる', async () => {
      mockLogin.mockResolvedValueOnce(undefined);

      render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: 'ログイン' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(toast.success).toHaveBeenCalledWith('ログインしました');
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    test('ログイン成功後、元のページにリダイレクトされる', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      mockLocation.state = { from: { pathname: '/dashboard' } };

      render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: 'ログイン' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      });
    });
  });

  describe('ログイン失敗', () => {
    test('401エラーの場合、認証エラーメッセージが表示される', async () => {
      const error = {
        response: {
          status: 401,
        },
      };
      mockLogin.mockRejectedValueOnce(error);

      render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');

      fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

      const submitButton = screen.getByRole('button', { name: 'ログイン' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('メールアドレスまたはパスワードが間違っています');
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('詳細なエラーメッセージがある場合、それが表示される', async () => {
      const error = {
        response: {
          status: 400,
          data: {
            detail: 'アカウントが無効です',
          },
        },
      };
      mockLogin.mockRejectedValueOnce(error);

      render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: 'ログイン' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('アカウントが無効です');
      });
    });

    test('一般的なエラーの場合、デフォルトエラーメッセージが表示される', async () => {
      const error = new Error('Network Error');
      mockLogin.mockRejectedValueOnce(error);

      render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: 'ログイン' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('ログインに失敗しました');
      });
    });
  });

  describe('ローディング状態', () => {
    test('ログイン処理中はローディング状態になる', async () => {
      mockLogin.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: 'ログイン' });
      fireEvent.click(submitButton);

      // ローディング中の表示を確認
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'ログイン中...' })).toBeInTheDocument();
      });

      // 入力フィールドが無効化されていることを確認
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
    });

    test('ローディング中は新規登録ボタンが無効化される', async () => {
      mockLogin.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: 'ログイン' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const switchButton = screen.getByRole('button', { name: '新規登録' });
        expect(switchButton).toBeDisabled();
      });
    });
  });

  describe('新規登録への切り替え', () => {
    test('新規登録ボタンをクリックすると、コールバックが呼ばれる', () => {
      render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

      const switchButton = screen.getByRole('button', { name: '新規登録' });
      fireEvent.click(switchButton);

      expect(mockOnSwitchToRegister).toHaveBeenCalledTimes(1);
    });

    test('ローディング中は新規登録ボタンがクリックできない', async () => {
      mockLogin.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: 'ログイン' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const switchButton = screen.getByRole('button', { name: '新規登録' });
        expect(switchButton).toBeDisabled();
      });

      const switchButton = screen.getByRole('button', { name: '新規登録' });
      fireEvent.click(switchButton);

      expect(mockOnSwitchToRegister).not.toHaveBeenCalled();
    });
  });
});
