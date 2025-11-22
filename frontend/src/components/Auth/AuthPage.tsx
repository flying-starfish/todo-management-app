import { useState } from 'react';
import Login from './Login';
import Register from './Register';

export const AuthPage = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);

  const switchToLogin = () => setIsLoginMode(true);
  const switchToRegister = () => setIsLoginMode(false);

  return (
    <>
      {isLoginMode ? (
        <Login onSwitchToRegister={switchToRegister} />
      ) : (
        <Register onSwitchToLogin={switchToLogin} />
      )}
    </>
  );
};

export default AuthPage;
