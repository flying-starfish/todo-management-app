import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Loading.css';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // 認証状態の確認中はローディング表示
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner" data-testid="loading-spinner"></div>
          <p>認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  // 未認証の場合はログイン画面にリダイレクト
  // 現在のパスを state として保存し、ログイン後に元のページに戻れるようにする
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // 認証済みの場合は子コンポーネントを表示
  return <>{children}</>;
};

export default ProtectedRoute;
