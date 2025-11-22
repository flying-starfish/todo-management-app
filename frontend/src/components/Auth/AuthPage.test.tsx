import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, type Mock } from 'vitest';
import { AuthPage } from './AuthPage';
import { useAuth } from '../../contexts/AuthContext';

// 依存コンポーネントとContextをモック化
vi.mock('./Login', () => ({
  __esModule: true,
  default: ({ onSwitchToRegister }: { onSwitchToRegister: () => void }) => (
    <div data-testid="login-component">
      Login Component
      <button onClick={onSwitchToRegister}>Switch to Register</button>
    </div>
  ),
}));

vi.mock('./Register', () => ({
  __esModule: true,
  default: ({ onSwitchToLogin }: { onSwitchToLogin: () => void }) => (
    <div data-testid="register-component">
      Register Component
      <button onClick={onSwitchToLogin}>Switch to Login</button>
    </div>
  ),
}));

vi.mock('../../contexts/AuthContext');
vi.mock('react-toastify');

const mockUseAuth = useAuth as Mock<typeof useAuth>;

describe('AuthPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのAuthContext設定
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      refreshUserInfo: vi.fn(),
      isAuthenticated: false,
      isLoading: false,
    });
  });

  describe('初期表示', () => {
    test('デフォルトでLoginコンポーネントが表示される', () => {
      render(<AuthPage />);

      expect(screen.getByTestId('login-component')).toBeInTheDocument();
      expect(screen.getByText('Login Component')).toBeInTheDocument();
    });

    test('初期状態でRegisterコンポーネントは表示されない', () => {
      render(<AuthPage />);

      expect(screen.queryByTestId('register-component')).not.toBeInTheDocument();
    });
  });

  describe('コンポーネントの切り替え', () => {
    test('「Switch to Register」ボタンをクリックするとRegisterコンポーネントが表示される', () => {
      render(<AuthPage />);

      // 初期状態: Login表示
      expect(screen.getByTestId('login-component')).toBeInTheDocument();

      // Register切り替えボタンをクリック
      const switchButton = screen.getByText('Switch to Register');
      fireEvent.click(switchButton);

      // Register表示、Login非表示
      expect(screen.getByTestId('register-component')).toBeInTheDocument();
      expect(screen.queryByTestId('login-component')).not.toBeInTheDocument();
    });

    test('「Switch to Login」ボタンをクリックするとLoginコンポーネントが表示される', () => {
      render(<AuthPage />);

      // Registerに切り替え
      const switchToRegisterButton = screen.getByText('Switch to Register');
      fireEvent.click(switchToRegisterButton);

      // Register表示確認
      expect(screen.getByTestId('register-component')).toBeInTheDocument();

      // Loginに戻す
      const switchToLoginButton = screen.getByText('Switch to Login');
      fireEvent.click(switchToLoginButton);

      // Login表示、Register非表示
      expect(screen.getByTestId('login-component')).toBeInTheDocument();
      expect(screen.queryByTestId('register-component')).not.toBeInTheDocument();
    });

    test('LoginとRegisterを複数回切り替えることができる', () => {
      render(<AuthPage />);

      // Login → Register
      fireEvent.click(screen.getByText('Switch to Register'));
      expect(screen.getByTestId('register-component')).toBeInTheDocument();

      // Register → Login
      fireEvent.click(screen.getByText('Switch to Login'));
      expect(screen.getByTestId('login-component')).toBeInTheDocument();

      // Login → Register (再度)
      fireEvent.click(screen.getByText('Switch to Register'));
      expect(screen.getByTestId('register-component')).toBeInTheDocument();

      // Register → Login (再度)
      fireEvent.click(screen.getByText('Switch to Login'));
      expect(screen.getByTestId('login-component')).toBeInTheDocument();
    });
  });

  describe('コンポーネントへのプロパティ渡し', () => {
    test('Loginコンポーネントに正しいプロパティが渡される', () => {
      render(<AuthPage />);

      // Loginが表示されており、switchボタンが機能する
      expect(screen.getByTestId('login-component')).toBeInTheDocument();

      // onSwitchToRegister関数が正しく動作することを確認
      fireEvent.click(screen.getByText('Switch to Register'));
      expect(screen.getByTestId('register-component')).toBeInTheDocument();
    });

    test('Registerコンポーネントに正しいプロパティが渡される', () => {
      render(<AuthPage />);

      // Registerに切り替え
      fireEvent.click(screen.getByText('Switch to Register'));
      expect(screen.getByTestId('register-component')).toBeInTheDocument();

      // onSwitchToLogin関数が正しく動作することを確認
      fireEvent.click(screen.getByText('Switch to Login'));
      expect(screen.getByTestId('login-component')).toBeInTheDocument();
    });
  });
});
