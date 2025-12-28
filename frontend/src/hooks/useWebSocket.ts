import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// WebSocket 接続の状態を表す型
type WebSocketStatus = 'idle' | 'connecting' | 'connected' | 'closed' | 'error';

// メモリ使用量を抑えるために保持する最大メッセージ数
const MAX_MESSAGES = 20;

// 指定された URL に対して WebSocket 接続を管理するカスタムフック
// - 接続状態
// - 受信メッセージ履歴
// - エラー状態
// - メッセージ送信関数
// などをまとめて提供する
export const useWebSocket = (url: string | null) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('idle');
  const [messages, setMessages] = useState<string[]>([]);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 現在の WebSocket 接続を閉じてクリーンアップする
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setStatus('closed');
  }, []);

  // 新しく WebSocket 接続を張る（既存接続があれば閉じる）
  const connect = useCallback(() => {
    if (!url) {
      disconnect();
      setStatus('idle');
      return;
    }

    if (socketRef.current) {
      socketRef.current.close();
    }

    setStatus('connecting');
    const socket = new WebSocket(url);
    socketRef.current = socket;

    // 接続確立時のコールバック
    socket.onopen = () => {
      setStatus('connected');
      setError(null);
    };

    // メッセージ受信時のコールバック
    socket.onmessage = (event: MessageEvent) => {
      const data = typeof event.data === 'string' ? event.data : '';
      setLastMessage(data);
      setMessages((prev) => [data, ...prev].slice(0, MAX_MESSAGES));
    };

    // エラー発生時のコールバック
    socket.onerror = () => {
      setStatus('error');
      setError('WebSocket error occurred');
    };

    // 接続が閉じられたときのコールバック
    socket.onclose = () => {
      setStatus('closed');
    };
  }, [disconnect, url]);

  // 現在の接続がオープンであればメッセージを送信する
  // 送信できた場合は true を返す
  const sendMessage = useCallback((message: string) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(message);
      return true;
    }
    return false;
  }, []);

  // URL 変更などのタイミングで再接続し、アンマウント時に切断する
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // 接続状態を boolean で扱いやすくした派生値
  const isConnected = useMemo(() => status === 'connected', [status]);

  return { status, messages, lastMessage, error, isConnected, sendMessage, disconnect };
};

export default useWebSocket;
