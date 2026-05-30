import { useEffect, useState } from 'react';
import {
  fetchRegisterCaptcha,
  login,
  requestRegistration,
  verifyRegistration,
} from '../services/api';
import {
  emitAuthChange,
  setAuthMode,
  setAuthToken,
  setStoredLoggedIn,
} from '../services/authStorage';
import LanguageThemeControls from './LanguageThemeControls';
import { useAppShell } from '../contexts/AppShellContext';

const LOGIN_IDENTITY_KEY = 'login_username';
const REGISTER_COOLDOWN_KEY = 'register_cooldown_until';
const FIELD_LABEL_CLASS = 'mb-2 block text-sm font-medium text-[color:var(--text-secondary)]';
const INPUT_CLASS = 'w-full rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-[color:var(--text-primary)] placeholder:text-[color:var(--text-faint)] outline-none transition-all focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)]';
const ERROR_CLASS = 'rounded-2xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3';
const PRIMARY_BUTTON_CLASS = 'flex w-full items-center justify-center gap-2 rounded-2xl border border-transparent bg-[var(--accent-solid)] py-3 font-medium text-[var(--accent-solid-text)] transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45';
const SECONDARY_BUTTON_CLASS = 'w-full rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] py-3 font-medium text-[color:var(--text-primary)] transition-all duration-200 hover:bg-[var(--surface-hover)]';
const TABS_CONTAINER_CLASS = 'mb-6 grid grid-cols-2 rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-1';

function getStoredIdentity() {
  return localStorage.getItem(LOGIN_IDENTITY_KEY) || '';
}

function getStoredCooldownUntil() {
  const raw = Number(localStorage.getItem(REGISTER_COOLDOWN_KEY) || 0);
  return Number.isFinite(raw) && raw > Date.now() ? raw : 0;
}

export default function Login({ onLogin, onBack, initialMode = 'login' }) {
  const { t } = useAppShell();
  const [mode, setMode] = useState(initialMode === 'register' ? 'register' : 'login');
  const [registerStep, setRegisterStep] = useState('form');
  const [email, setEmail] = useState(() => getStoredIdentity());
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(() => getStoredCooldownUntil());
  const [cooldownSeconds, setCooldownSeconds] = useState(() => {
    const initial = getStoredCooldownUntil();
    return initial ? Math.max(0, Math.ceil((initial - Date.now()) / 1000)) : 0;
  });

  const isRegisterMode = mode === 'register';

  useEffect(() => {
    if (getStoredIdentity()) {
      setEmail(getStoredIdentity());
    }
  }, []);

  useEffect(() => {
    setMode(initialMode === 'register' ? 'register' : 'login');
  }, [initialMode]);

  useEffect(() => {
    if (isRegisterMode && registerStep === 'form' && !captcha) {
      void loadCaptcha();
    }
  }, [isRegisterMode, registerStep, captcha]);

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownSeconds(0);
      localStorage.removeItem(REGISTER_COOLDOWN_KEY);
      return undefined;
    }

    const tick = () => {
      const nextSeconds = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownSeconds(nextSeconds);
      if (nextSeconds === 0) {
        setCooldownUntil(0);
        localStorage.removeItem(REGISTER_COOLDOWN_KEY);
      }
    };

    localStorage.setItem(REGISTER_COOLDOWN_KEY, String(cooldownUntil));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const isCooldownActive = cooldownSeconds > 0;

  const applyCooldown = (seconds) => {
    if (!seconds || seconds <= 0) {
      setCooldownUntil(0);
      return;
    }
    setCooldownUntil(Date.now() + seconds * 1000);
  };

  const loadCaptcha = async () => {
    try {
      const nextCaptcha = await fetchRegisterCaptcha();
      setCaptcha(nextCaptcha);
      setCaptchaAnswer('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.loadCaptchaFailed'));
    }
  };

  const persistAuthenticatedUser = ({ user, token, fallbackIdentity }) => {
    setStoredLoggedIn(true);
    setAuthMode('user');
    setAuthToken(token);
    localStorage.setItem(LOGIN_IDENTITY_KEY, user?.email || user?.username || fallbackIdentity);
    emitAuthChange();
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
      setError(err instanceof Error ? err.message : t('login.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestRegistration = async (e) => {
    e.preventDefault();
    if (isCooldownActive) {
      return;
    }
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
      applyCooldown(result.retryAfterSeconds || 60);
      setRegisterStep('verify');
      setVerificationCode('');
      setNotice(
        t('login.codeSentNotice', { email: result.email })
        + (result.retryAfterSeconds ? t('login.codeResendNotice', { seconds: result.retryAfterSeconds }) : '')
      );
    } catch (err) {
      applyCooldown(err?.retryAfterSeconds || 0);
      setError(err instanceof Error ? err.message : t('login.sendCodeFailed'));
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
      setError(err instanceof Error ? err.message : t('login.verifyFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestAccess = () => {
    setStoredLoggedIn(true);
    setAuthMode('guest');
    setAuthToken(null);
    localStorage.removeItem(LOGIN_IDENTITY_KEY);
    emitAuthChange();
    onLogin('guest');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--page-bg-chat)] p-4 text-[color:var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_82%_14%,rgba(99,102,241,0.10),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(30,41,59,0.24),transparent_36%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <LanguageThemeControls />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-[30px] border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-8 shadow-[var(--surface-shadow)] backdrop-blur-xl">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mb-4 -ml-2 inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              {t('login.back')}
            </button>
          )}
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-[color:var(--text-primary)]">{t('login.title')}</h1>
            <p className="text-[color:var(--text-muted)]">{isRegisterMode ? t('login.registerIntro') : t('login.welcomeBack')}</p>
          </div>

          <div className={TABS_CONTAINER_CLASS}>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${!isRegisterMode ? 'bg-[var(--accent-solid)] text-[var(--accent-solid-text)] shadow-[0_10px_24px_rgba(14,165,233,0.18)]' : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]'}`}
            >
              {t('login.loginTab')}
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${isRegisterMode ? 'bg-[var(--accent-solid)] text-[var(--accent-solid-text)] shadow-[0_10px_24px_rgba(14,165,233,0.18)]' : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]'}`}
            >
              {t('login.registerTab')}
            </button>
          </div>

          {!isRegisterMode && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={FIELD_LABEL_CLASS}>
                  {t('common.email')}
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder={t('login.emailPlaceholder')}
                  autoComplete="email"
                />
              </div>

              <div>
                <label className={FIELD_LABEL_CLASS}>
                  {t('common.password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder={t('login.passwordPlaceholder')}
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className={ERROR_CLASS}>
                  <p className="text-sm text-[color:var(--danger-text)]">{error}</p>
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
                    <span>{t('login.loginLoading')}</span>
                  </>
                ) : (
                  <span>{t('login.loginTab')}</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleGuestAccess}
                className={SECONDARY_BUTTON_CLASS}
              >
                {t('login.guestAccess')}
              </button>
            </form>
          )}

          {isRegisterMode && registerStep === 'form' && (
            <form onSubmit={handleRequestRegistration} className="space-y-5">
              <div>
                <label className={FIELD_LABEL_CLASS}>
                  {t('common.email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder={t('login.emailPlaceholder')}
                  autoComplete="email"
                />
              </div>

              <div>
                <label className={FIELD_LABEL_CLASS}>
                  {t('common.password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder={t('login.newPasswordPlaceholder')}
                  autoComplete="new-password"
                />
              </div>

              <div className="rounded-[24px] border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[color:var(--text-primary)]">{t('login.captchaTitle')}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">{t('login.captchaDescription')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={loadCaptcha}
                    className="text-sm text-[color:var(--accent-solid)] transition hover:opacity-80"
                  >
                    {t('login.captchaRefresh')}
                  </button>
                </div>
                <div className="mb-3 rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] px-4 py-3 text-center text-lg font-semibold tracking-wide text-[color:var(--text-primary)]">
                  {captcha?.question || t('login.captchaLoading')}
                </div>
                <input
                  type="text"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder={t('login.captchaAnswerPlaceholder')}
                />
              </div>

              {error && (
                <div className={ERROR_CLASS}>
                  <p className="text-sm text-[color:var(--danger-text)]">{error}</p>
                </div>
              )}

              {isCooldownActive && (
                <div className="rounded-2xl border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[color:var(--warning-text)]">
                  {t('login.resendIn', { seconds: cooldownSeconds })}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !captcha?.challengeId || isCooldownActive}
                className={PRIMARY_BUTTON_CLASS}
              >
                {isLoading ? t('login.sendCodeLoading') : isCooldownActive ? t('login.resendIn', { seconds: cooldownSeconds }) : t('login.sendCode')}
              </button>
            </form>
          )}

          {isRegisterMode && registerStep === 'verify' && (
            <form onSubmit={handleVerifyRegistration} className="space-y-5">
              <div className="rounded-2xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[color:var(--text-primary)]">
                {notice || t('login.codeSentNotice', { email })}
              </div>

              {isCooldownActive && (
                <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-3 text-sm text-[color:var(--text-secondary)]">
                  {t('login.resendIn', { seconds: cooldownSeconds })}
                </div>
              )}

              <div>
                <label className={FIELD_LABEL_CLASS}>
                  {t('login.codePlaceholder')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${INPUT_CLASS} text-center tracking-[0.35em]`}
                  placeholder={t('login.codePlaceholder')}
                />
              </div>

              {error && (
                <div className={ERROR_CLASS}>
                  <p className="text-sm text-[color:var(--danger-text)]">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || verificationCode.length !== 6}
                className={PRIMARY_BUTTON_CLASS}
              >
                {isLoading ? t('login.verifyLoading') : t('login.verifyAndLogin')}
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
                {t('login.switchToLogin')}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-[color:var(--text-faint)]">
          © 2026 XiaoNiu Tech. All rights reserved.
        </p>
      </div>
    </div>
  );
}
