import { createContext, ReactNode, useContext, useMemo } from 'react';

import { useAuth } from './AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';

// WebSocket コンテキストが外部に提供する値の型
interface WebSocketContextValue {
  status: 'idle' | 'connecting' | 'connected' | 'closed' | 'error';
  messages: string[];
  lastMessage: string | null;
  error: string | null;
  isConnected: boolean;
  sendMessage: (message: string) => boolean;
  disconnect: () => void;
}

// 実際のコンテキスト本体（初期値は undefined）
const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

// 認証トークンなどから WebSocket 用の接続 URL を組み立てる
// - VITE_WS_URL があればそれを優先
// - なければ VITE_API_URL から ws / wss に変換
// - 必要であれば token をクエリ文字列として付与
const buildWebSocketUrl = (token?: string | null) => {
  const baseUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const protocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
  const host = baseUrl.replace(/^https?:\/\//, '');
  const path = '/ws';
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${protocol}://${host}${path}${query}`;
};

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  // 認証状態とトークンを取得（未ログインなら接続しない）
  const { isAuthenticated, token } = useAuth();

  // ログイン状態やトークンが変わったときだけ WebSocket の接続先 URL を再計算
  const wsUrl = useMemo(() => (isAuthenticated ? buildWebSocketUrl(token) : null), [isAuthenticated, token]);

  // 実際の WebSocket 接続処理はカスタムフックに委譲
  const { status, messages, lastMessage, error, isConnected, sendMessage, disconnect } = useWebSocket(wsUrl);

  // コンテキストで配布する値をメモ化（不要な再レンダーを抑制）
  const value = useMemo(
    () => ({ status, messages, lastMessage, error, isConnected, sendMessage, disconnect }),
    [status, messages, lastMessage, error, isConnected, sendMessage, disconnect]
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export const useWebSocketContext = () => {
  // コンテキストから現在の WebSocket 状態を取得するためのフック
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};
