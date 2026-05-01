import { useEffect, useState } from 'react';
import {
  fetchRegisterCaptcha,
  login,
  requestRegistration,
  verifyRegistration,
} from '../services/api';

const LOGIN_IDENTITY_KEY = 'login_username';
const FIELD_LABEL_CLASS = 'mb-2 block text-sm font-medium text-slate-300/85';
const INPUT_CLASS = 'w-full rounded-2xl border border-slate-600/60 bg-slate-800/55 px-4 py-3 text-slate-50 placeholder:text-slate-400/70 outline-none transition-all focus:border-sky-500/50 focus:bg-slate-800/75';
const ERROR_CLASS = 'rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3';
const PRIMARY_BUTTON_CLASS = 'flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-400/20 bg-sky-500/90 py-3 font-medium text-white transition-all duration-200 hover:bg-sky-400 disabled:cursor-not-allowed disabled:border-sky-500/10 disabled:bg-sky-500/45';
const SECONDARY_BUTTON_CLASS = 'w-full rounded-2xl border border-slate-600/60 bg-slate-800/50 py-3 font-medium text-slate-100 transition-all duration-200 hover:bg-slate-700/65';
const TABS_CONTAINER_CLASS = 'mb-6 grid grid-cols-2 rounded-2xl border border-slate-700/60 bg-slate-900/35 p-1';

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#162033] p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_82%_14%,rgba(99,102,241,0.10),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(30,41,59,0.24),transparent_36%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-[30px] border border-slate-700/60 bg-[linear-gradient(180deg,rgba(30,41,59,0.92),rgba(15,23,42,0.94))] p-8 shadow-[0_24px_60px_rgba(15,23,42,0.22)] backdrop-blur-xl">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-slate-50">XN Chat</h1>
            <p className="text-slate-300/70">{isRegisterMode ? '注册新账号并完成邮箱验证' : '欢迎回来，请登录'}</p>
          </div>

          <div className={TABS_CONTAINER_CLASS}>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${!isRegisterMode ? 'bg-sky-500/90 text-white shadow-[0_10px_24px_rgba(56,189,248,0.18)]' : 'text-slate-400 hover:text-slate-100'}`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${isRegisterMode ? 'bg-sky-500/90 text-white shadow-[0_10px_24px_rgba(56,189,248,0.18)]' : 'text-slate-400 hover:text-slate-100'}`}
            >
              注册
            </button>
          </div>

          {!isRegisterMode && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={FIELD_LABEL_CLASS}>
                  邮箱
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="请输入邮箱"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className={FIELD_LABEL_CLASS}>
                  密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className={ERROR_CLASS}>
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={PRIMARY_BUTTON_CLASS}
              >
                {isLoading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
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
                className={SECONDARY_BUTTON_CLASS}
              >
                游客访问
              </button>
            </form>
          )}

          {isRegisterMode && registerStep === 'form' && (
            <form onSubmit={handleRequestRegistration} className="space-y-5">
              <div>
                <label className={FIELD_LABEL_CLASS}>
                  邮箱
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="请输入邮箱"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className={FIELD_LABEL_CLASS}>
                  密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="请设置密码，至少 8 位"
                  autoComplete="new-password"
                />
              </div>

              <div className="rounded-[24px] border border-slate-700/60 bg-slate-900/30 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-100">人机验证</p>
                    <p className="text-xs text-slate-400/80">请回答下面的算术题</p>
                  </div>
                  <button
                    type="button"
                    onClick={loadCaptcha}
                    className="text-sm text-sky-300 transition hover:text-sky-200"
                  >
                    换一题
                  </button>
                </div>
                <div className="mb-3 rounded-2xl border border-slate-700/60 bg-slate-800/45 px-4 py-3 text-center text-lg font-semibold tracking-wide text-slate-50">
                  {captcha?.question || '加载中...'}
                </div>
                <input
                  type="text"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="请输入答案"
                />
              </div>

              {error && (
                <div className={ERROR_CLASS}>
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !captcha?.challengeId}
                className={PRIMARY_BUTTON_CLASS}
              >
                {isLoading ? '发送中...' : '发送邮箱验证码'}
              </button>
            </form>
          )}

          {isRegisterMode && registerStep === 'verify' && (
            <form onSubmit={handleVerifyRegistration} className="space-y-5">
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                {notice || `验证码已发送到 ${email}`}
              </div>

              <div>
                <label className={FIELD_LABEL_CLASS}>
                  邮箱验证码
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${INPUT_CLASS} text-center tracking-[0.35em]`}
                  placeholder="请输入 6 位验证码"
                />
              </div>

              {error && (
                <div className={ERROR_CLASS}>
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || verificationCode.length !== 6}
                className={PRIMARY_BUTTON_CLASS}
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
                className={SECONDARY_BUTTON_CLASS}
              >
                返回重新填写
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-400/60">
          © 2026 XN Chat. All rights reserved.
        </p>
      </div>
    </div>
  );
}
