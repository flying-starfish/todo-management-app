import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { toast } from 'react-toastify';

// APIのベースURL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// LocalStorageのキー
const TOKEN_KEY = 'jwt_token';

// Axiosインスタンスの作成
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10秒のタイムアウト
  headers: {
    'Content-Type': 'application/json',
  },
});

// ログアウト関数のタイプ定義
type LogoutFunction = () => void;

// ログアウト関数を保存する変数
let logoutCallback: LogoutFunction | null = null;

// ログアウト関数を設定する関数
export const setLogoutCallback = (callback: LogoutFunction): void => {
  logoutCallback = callback;
};

// リクエストインターセプター: 全てのリクエストにJWTトークンを自動付与
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター: エラーハンドリング
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // 401エラー（認証エラー）の場合
    if (error.response?.status === 401) {
      // トークンをクリア
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('user_info');

      // ログアウト処理を実行
      if (logoutCallback) {
        logoutCallback();
      }

      // エラーメッセージを表示
      toast.error('セッションが期限切れです。再度ログインしてください');
    } else if (error.response?.status === 403) {
      // 403エラー（権限なし）
      toast.error('この操作を実行する権限がありません');
    } else if (error.response?.status === 404) {
      // 404エラー（見つからない）
      toast.error('リクエストされたリソースが見つかりません');
    } else if (error.response?.status === 500) {
      // 500エラー（内部サーバーエラー）
      toast.error('サーバーエラーが発生しました。しばらく後に再試行してください');
    } else if (error.code === 'ECONNABORTED') {
      // タイムアウトエラー
      toast.error('リクエストがタイムアウトしました');
    } else if (!error.response) {
      // ネットワークエラー
      toast.error('ネットワークエラーが発生しました。接続を確認してください');
    }

    return Promise.reject(error);
  }
);

// API呼び出し用のヘルパー関数

// GET リクエスト
export const apiGet = async <T = any>(url: string): Promise<T> => {
  const response = await apiClient.get<T>(url);
  return response.data;
};

// POST リクエスト
export const apiPost = async <T = any>(url: string, data?: any): Promise<T> => {
  const response = await apiClient.post<T>(url, data);
  return response.data;
};

// PUT リクエスト
export const apiPut = async <T = any>(url: string, data?: any): Promise<T> => {
  const response = await apiClient.put<T>(url, data);
  return response.data;
};

// DELETE リクエスト
export const apiDelete = async <T = any>(url: string): Promise<T> => {
  const response = await apiClient.delete<T>(url);
  return response.data;
};

// PATCH リクエスト
export const apiPatch = async <T = any>(url: string, data?: any): Promise<T> => {
  const response = await apiClient.patch<T>(url, data);
  return response.data;
};

export default apiClient;
