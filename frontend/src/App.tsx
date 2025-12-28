import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import AuthPage from './components/Auth/AuthPage';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import TodoList from './components/Todo/TodoList';
import Header from './components/Layout/Header';
import WebSocketPanel from './components/WebSocket/WebSocketPanel';

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <WebSocketProvider>
          <div className="app">
            <Routes>
              {/* パブリックルート: 認証画面 */}
              <Route path="/auth" element={<AuthPage />} />

              {/* プライベートルート: 認証が必要 */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <div className="app-layout">
                      <Header />
                      <main className="main-content">
                        <WebSocketPanel />
                        <TodoList />
                      </main>
                    </div>
                  </ProtectedRoute>
                }
              />

              {/* その他のパスは / にリダイレクト */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Toast通知のコンテナ */}
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
          </div>
        </WebSocketProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
