import { useEffect, useState } from 'react';
import {
  fetchRegisterCaptcha,
  login,
  requestRegistration,
  verifyRegistration,
} from '../services/api';

const LOGIN_IDENTITY_KEY = 'login_username';

function getStoredIdentity() {
  return localStorage.getItem(LOGIN_IDENTITY_KEY) || '';
}

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [registerStep, setRegisterStep] = useState('form');
  const [email, setEmail] = useState(() => getStoredIdentity());
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isRegisterMode = mode === 'register';

  useEffect(() => {
    if (getStoredIdentity()) {
      setEmail(getStoredIdentity());
    }
  }, []);

  useEffect(() => {
    if (isRegisterMode && registerStep === 'form' && !captcha) {
      void loadCaptcha();
    }
  }, [isRegisterMode, registerStep, captcha]);

  const loadCaptcha = async () => {
    try {
      const nextCaptcha = await fetchRegisterCaptcha();
      setCaptcha(nextCaptcha);
      setCaptchaAnswer('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载人机验证失败');
    }
  };

  const persistAuthenticatedUser = ({ user, token, fallbackIdentity }) => {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('auth_mode', 'user');
    localStorage.setItem('auth_token', token);
    localStorage.setItem(LOGIN_IDENTITY_KEY, user?.email || user?.username || fallbackIdentity);
    onLogin('user');
  };

  const resetRegisterState = () => {
    setRegisterStep('form');
    setVerificationCode('');
    setCaptcha(null);
    setCaptchaAnswer('');
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setNotice('');
    setPassword('');
    if (nextMode === 'register') {
      resetRegisterState();
    } else {
      setVerificationCode('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setIsLoading(true);

    try {
      const { user, token } = await login(email, password);
      persistAuthenticatedUser({ user, token, fallbackIdentity: email });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestRegistration = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setIsLoading(true);

    try {
      const result = await requestRegistration(
        email,
        password,
        captcha?.challengeId,
        captchaAnswer,
      );
      setRegisterStep('verify');
      setVerificationCode('');
      setNotice(`验证码已发送至 ${result.email}，10 分钟内有效。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送验证码失败');
      await loadCaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyRegistration = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setIsLoading(true);

    try {
      const { user, token } = await verifyRegistration(email, verificationCode);
      persistAuthenticatedUser({ user, token, fallbackIdentity: email });
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestAccess = () => {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('auth_mode', 'guest');
    localStorage.removeItem('auth_token');
    localStorage.removeItem(LOGIN_IDENTITY_KEY);
    onLogin('guest');
  };

  return (
    <div className="min-h-screen bg-[#343541] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#202123] rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#ececf1] mb-2">XN Chat</h1>
            <p className="text-[#8e8ea0]">{isRegisterMode ? '注册新账号并完成邮箱验证' : '欢迎回来，请登录'}</p>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-lg bg-[#343541] p-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${!isRegisterMode ? 'bg-[#19c37d] text-white' : 'text-[#8e8ea0] hover:text-[#ececf1]'}`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${isRegisterMode ? 'bg-[#19c37d] text-white' : 'text-[#8e8ea0] hover:text-[#ececf1]'}`}
            >
              注册
            </button>
          </div>

          {!isRegisterMode && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#8e8ea0] mb-2">
                  邮箱
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#343541] border border-[#3e3f4a] rounded-lg text-[#ececf1] placeholder-[#565869] focus:outline-none focus:border-[#19c37d] focus:ring-1 focus:ring-[#19c37d] transition-all"
                  placeholder="请输入邮箱"
                  autoComplete="email"
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
                  autoComplete="current-password"
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
          )}

          {isRegisterMode && registerStep === 'form' && (
            <form onSubmit={handleRequestRegistration} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#8e8ea0] mb-2">
                  邮箱
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#343541] border border-[#3e3f4a] rounded-lg text-[#ececf1] placeholder-[#565869] focus:outline-none focus:border-[#19c37d] focus:ring-1 focus:ring-[#19c37d] transition-all"
                  placeholder="请输入邮箱"
                  autoComplete="email"
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
                  placeholder="请设置密码，至少 8 位"
                  autoComplete="new-password"
                />
              </div>

              <div className="rounded-lg border border-[#3e3f4a] bg-[#343541] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#ececf1]">人机验证</p>
                    <p className="text-xs text-[#8e8ea0]">请回答下面的算术题</p>
                  </div>
                  <button
                    type="button"
                    onClick={loadCaptcha}
                    className="text-sm text-[#19c37d] hover:text-[#33d18f]"
                  >
                    换一题
                  </button>
                </div>
                <div className="mb-3 rounded-md bg-[#202123] px-4 py-3 text-center text-lg font-semibold tracking-wide text-[#ececf1]">
                  {captcha?.question || '加载中...'}
                </div>
                <input
                  type="text"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  className="w-full px-4 py-3 bg-[#202123] border border-[#3e3f4a] rounded-lg text-[#ececf1] placeholder-[#565869] focus:outline-none focus:border-[#19c37d] focus:ring-1 focus:ring-[#19c37d] transition-all"
                  placeholder="请输入答案"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg px-4 py-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !captcha?.challengeId}
                className="w-full py-3 bg-[#19c37d] hover:bg-[#18a86d] disabled:bg-[#19c37d]/50 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isLoading ? '发送中...' : '发送邮箱验证码'}
              </button>
            </form>
          )}

          {isRegisterMode && registerStep === 'verify' && (
            <form onSubmit={handleVerifyRegistration} className="space-y-5">
              <div className="rounded-lg border border-[#19c37d]/30 bg-[#19c37d]/10 px-4 py-3 text-sm text-[#b8f2d6]">
                {notice || `验证码已发送到 ${email}`}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8e8ea0] mb-2">
                  邮箱验证码
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 bg-[#343541] border border-[#3e3f4a] rounded-lg text-[#ececf1] placeholder-[#565869] focus:outline-none focus:border-[#19c37d] focus:ring-1 focus:ring-[#19c37d] transition-all tracking-[0.35em] text-center"
                  placeholder="请输入 6 位验证码"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg px-4 py-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || verificationCode.length !== 6}
                className="w-full py-3 bg-[#19c37d] hover:bg-[#18a86d] disabled:bg-[#19c37d]/50 text-white font-medium rounded-lg transition-all duration-200"
              >
                {isLoading ? '验证中...' : '完成注册'}
              </button>

              <button
                type="button"
                onClick={() => {
                  resetRegisterState();
                  setNotice('');
                  setError('');
                }}
                className="w-full py-3 bg-[#343541] hover:bg-[#3e3f4a] text-[#ececf1] font-medium rounded-lg transition-all duration-200 border border-[#4e4f56]"
              >
                返回重新填写
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-[#565869] text-sm">
          © 2026 XN Chat. All rights reserved.
        </p>
      </div>
    </div>
  );
}
