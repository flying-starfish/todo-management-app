import { FormEvent, useMemo, useState } from 'react';

import { useWebSocketContext } from '../../contexts/WebSocketContext';
import './WebSocketPanel.css';

const statusLabel: Record<string, string> = {
  idle: '待機中',
  connecting: '接続中',
  connected: '接続済み',
  closed: '切断',
  error: 'エラー',
};

const statusClass: Record<string, string> = {
  idle: 'ws-status idle',
  connecting: 'ws-status connecting',
  connected: 'ws-status connected',
  closed: 'ws-status closed',
  error: 'ws-status error',
};

const WebSocketPanel = () => {
  const { status, lastMessage, messages, isConnected, sendMessage, error } = useWebSocketContext();
  const [input, setInput] = useState('hello');
  const [feedback, setFeedback] = useState<string | null>(null);

  const recentMessages = useMemo(() => messages.slice(0, 5), [messages]);

  const handleSend = (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    const ok = sendMessage(input.trim());
    setFeedback(ok ? '送信しました' : '送信できませんでした (未接続)');
    if (ok) {
      setInput('');
    }
  };

  return (
    <section className="ws-panel">
      <div className="ws-panel__header">
        <div className="ws-panel__title">Realtime (WebSocket)</div>
        <div className={statusClass[status] || 'ws-status'}>
          <span className="ws-status__dot" />
          <span className="ws-status__label">{statusLabel[status] ?? status}</span>
        </div>
      </div>

      <p className="ws-panel__hint">バックエンドの /ws に接続し、エコー応答を確認できます。</p>

      <form className="ws-panel__form" onSubmit={handleSend}>
        <label className="ws-panel__label" htmlFor="ws-message">
          送信メッセージ
        </label>
        <div className="ws-panel__input-row">
          <input
            id="ws-message"
            name="ws-message"
            className="ws-panel__input"
            placeholder="メッセージを入力"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!isConnected}
          />
          <button type="submit" className="ws-panel__button" disabled={!isConnected}>
            送信
          </button>
        </div>
        <div className="ws-panel__feedback">
          {feedback && <span>{feedback}</span>}
          {error && <span className="ws-panel__error">{error}</span>}
        </div>
      </form>

      <div className="ws-panel__messages">
        <div className="ws-panel__messages-header">受信ログ (最新5件)</div>
        {recentMessages.length === 0 ? (
          <div className="ws-panel__message ws-panel__message--empty">まだメッセージはありません</div>
        ) : (
          recentMessages.map((msg, idx) => (
            <div key={`${msg}-${idx}`} className="ws-panel__message">
              {msg}
            </div>
          ))
        )}
        {lastMessage && (
          <div className="ws-panel__last">最後のメッセージ: {lastMessage}</div>
        )}
      </div>
    </section>
  );
};

export default WebSocketPanel;
