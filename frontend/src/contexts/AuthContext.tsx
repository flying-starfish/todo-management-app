import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import axios from 'axios';
import { setLogoutCallback } from '../utils/apiClient';

// ユーザー情報の型定義
export interface User {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ログイン資格情報の型定義
export interface LoginCredentials {
  email: string;
  password: string;
}

// 登録データの型定義
export interface RegisterData {
  email: string;
  password: string;
}

// 認証状態の型定義
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// AuthContextの型定義
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUserInfo: () => Promise<void>;
}

// AuthContextの作成
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// LocalStorageのキー
const TOKEN_KEY = 'jwt_token';
const USER_KEY = 'user_info';

// AuthProviderのProps型定義
interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider コンポーネント
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // APIのベースURL
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // トークンの有効性を確認
  const validateToken = useCallback(async (token: string): Promise<void> => {
    const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }, [API_BASE_URL]);

  // 初期化時にローカルストレージからトークンとユーザー情報を復元
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedToken = localStorage.getItem(TOKEN_KEY);
        const savedUser = localStorage.getItem(USER_KEY);

        if (savedToken && savedUser) {
          const user = JSON.parse(savedUser);
          
          // トークンが有効かどうかを確認
          await validateToken(savedToken);
          
          setAuthState({
            user,
            token: savedToken,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('認証の初期化に失敗しました:', error);
        // 無効なトークンの場合はクリア
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    // ログアウトコールバックを設定
    setLogoutCallback(logout);

    initializeAuth();
  }, []); // 依存配列を空にして初期化時のみ実行

  // ログイン処理
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // フォームデータとして送信
      const formData = new FormData();
      formData.append('username', credentials.email);
      formData.append('password', credentials.password);

      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { access_token } = response.data;

      // ユーザー情報を取得
      const userResponse = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const user = userResponse.data;

      // ローカルストレージに保存
      localStorage.setItem(TOKEN_KEY, access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      setAuthState({
        user,
        token: access_token,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false,
        user: null,
        token: null,
        isAuthenticated: false 
      }));
      throw error;
    }
  };

  // 新規登録処理
  const register = async (data: RegisterData): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      await axios.post(`${API_BASE_URL}/api/auth/register`, data);

      // 登録後に自動ログイン
      await login({ email: data.email, password: data.password });
    } catch (error) {
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false,
        user: null,
        token: null,
        isAuthenticated: false 
      }));
      throw error;
    }
  };

  // ログアウト処理
  const logout = useCallback((): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAuthState({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  // ユーザー情報の再取得
  const refreshUserInfo = async (): Promise<void> => {
    if (!authState.token) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authState.token}` },
      });

      const user = response.data;
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      setAuthState(prev => ({ ...prev, user }));
    } catch (error) {
      console.error('ユーザー情報の取得に失敗しました:', error);
      logout();
    }
  };

  const contextValue: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    refreshUserInfo,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// useAuth フック
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthはAuthProvider内で使用する必要があります');
  }
  return context;
};

export default AuthContext;