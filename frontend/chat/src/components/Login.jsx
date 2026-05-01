import { useState, useEffect } from 'react';
import { login } from '../services/api';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState(() => localStorage.getItem('login_username') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('login_username')) {
      setUsername(localStorage.getItem('login_username'));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { user, token } = await login(username, password);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('auth_mode', 'user');
      localStorage.setItem('auth_token', token);
      localStorage.setItem('login_username', user?.username || username);
      onLogin('user');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestAccess = () => {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('auth_mode', 'guest');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('login_username');
    onLogin('guest');
  };

  return (
    <div className="min-h-screen bg-[#343541] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#202123] rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#ececf1] mb-2">XN Chat</h1>
            <p className="text-[#8e8ea0]">欢迎回来，请登录</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#8e8ea0] mb-2">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-[#343541] border border-[#3e3f4a] rounded-lg text-[#ececf1] placeholder-[#565869] focus:outline-none focus:border-[#19c37d] focus:ring-1 focus:ring-[#19c37d] transition-all"
                placeholder="请输入用户名"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#8e8ea0] mb-2">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#343541] border border-[#3e3f4a] rounded-lg text-[#ececf1] placeholder-[#565869] focus:outline-none focus:border-[#19c37d] focus:ring-1 focus:ring-[#19c37d] transition-all"
                placeholder="请输入密码"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#19c37d] hover:bg-[#18a86d] disabled:bg-[#19c37d]/50 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>登录中...</span>
                </>
              ) : (
                <span>登录</span>
              )}
            </button>
            <button
              type="button"
              onClick={handleGuestAccess}
              className="w-full py-3 bg-[#343541] hover:bg-[#3e3f4a] text-[#ececf1] font-medium rounded-lg transition-all duration-200 border border-[#4e4f56]"
            >
              游客访问
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-[#565869] text-sm">
          © 2026 XN Chat. All rights reserved.
        </p>
      </div>
    </div>
  );
}
