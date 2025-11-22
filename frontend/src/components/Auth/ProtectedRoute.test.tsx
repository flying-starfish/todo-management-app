import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth, User } from '../../contexts/AuthContext';

// 依存関係をモック化
jest.mock('../../contexts/AuthContext');

// react-router-domのモック
const mockLocationValue = {
  pathname: '/dashboard',
  search: '',
  hash: '',
  state: null,
  key: 'default',
};

jest.mock('react-router-dom', () => ({
  Navigate: ({ to, state }: { to: string; state?: any }) => (
    <div data-testid="navigate" data-to={to} data-state={JSON.stringify(state)}>
      Navigate to {to}
    </div>
  ),
  useLocation: () => mockLocationValue,
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// テスト用のユーザーデータ
const createMockUser = (): User => ({
  id: 1,
  email: 'test@example.com',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
});

// テスト用の子コンポーネント
const TestChild = () => <div data-testid="protected-content">Protected Content</div>;

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ローディング状態', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        token: null,
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
        refreshUserInfo: jest.fn(),
        isAuthenticated: false,
        isLoading: true,
      });
    });

    test('ローディング中はローディングスピナーが表示される', () => {
      render(
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      );

      expect(screen.getByText('認証状態を確認中...')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    test('ローディング中はスピナー要素が表示される', () => {
      render(
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      );

      expect(screen.getByText('認証状態を確認中...')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toHaveClass('spinner');
    });
  });

  describe('未認証状態', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        token: null,
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
        refreshUserInfo: jest.fn(),
        isAuthenticated: false,
        isLoading: false,
      });
    });

    test('未認証の場合はログインページにリダイレクトされる', () => {
      render(
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      );

      const navigate = screen.getByTestId('navigate');
      expect(navigate).toBeInTheDocument();
      expect(navigate).toHaveAttribute('data-to', '/auth');
    });

    test('リダイレクト時に現在のロケーションがstateとして保存される', () => {
      render(
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      );

      const navigate = screen.getByTestId('navigate');
      const state = JSON.parse(navigate.getAttribute('data-state') || '{}');
      expect(state.from).toEqual(mockLocationValue);
    });

    test('未認証の場合は子コンポーネントが表示されない', () => {
      render(
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('認証済み状態', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: createMockUser(),
        token: 'mock-token',
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
        refreshUserInfo: jest.fn(),
        isAuthenticated: true,
        isLoading: false,
      });
    });

    test('認証済みの場合は子コンポーネントが表示される', () => {
      render(
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('認証済みの場合はローディング表示されない', () => {
      render(
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      );

      expect(screen.queryByText('認証状態を確認中...')).not.toBeInTheDocument();
    });

    test('認証済みの場合はリダイレクトされない', () => {
      render(
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      );

      expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });

    test('複数の子要素を正しくレンダリングできる', () => {
      render(
        <ProtectedRoute>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <div data-testid="child-3">Child 3</div>
        </ProtectedRoute>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });
  });
});
