import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarUpload from '../components/AvatarUpload';
import usePageSeo from '../hooks/usePageSeo';
import { updateUserProfile } from '../services/blogApi';
import { useAppShell } from '../contexts/AppShellContext';
import { useAuthState } from '../contexts/AuthContext';

const LOG_PREFIX = '[SettingsPage]';

export default function SettingsPage() {
  const { t } = useAppShell();
  const { hasSession, username, profile, profileLoaded, profileError, refreshProfile } = useAuthState();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({
    email: '',
    nickname: '',
    bio: '',
    currentPassword: '',
    newPassword: '',
  });
  const [avatarFileId, setAvatarFileId] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [hydratedUsername, setHydratedUsername] = useState('');

  usePageSeo({
    title: t('settings.pageTitle'),
    description: '管理账号昵称、简介、头像与密码设置。',
    robots: 'noindex, nofollow',
  });

  useEffect(() => {
    if (!hasSession) {
      console.log(LOG_PREFIX, 'not logged in, redirecting to chat');
      navigate('/chat', { replace: true });
      return;
    }

    if (!profileLoaded) {
      return;
    }

    if (profileError) {
      console.error(LOG_PREFIX, 'failed to load profile:', profileError);
      setMessage({ type: 'error', text: profileError || t('settings.profileLoadingFailed') });
      setLoading(false);
      return;
    }

    if (!profile) {
      setLoading(false);
      return;
    }

    if (hydratedUsername === username) {
      setLoading(false);
      return;
    }

    console.log(LOG_PREFIX, 'profile loaded:', profile);
    setForm((prev) => ({
      ...prev,
      email: profile.email || '',
      nickname: profile.nickname || '',
      bio: profile.bio || '',
      currentPassword: '',
      newPassword: '',
    }));
    setAvatarFileId(profile.avatarFileId || null);
    setAvatarUrl(profile.avatarUrl || '');
    setHydratedUsername(username || '');
    setLoading(false);
    console.log(LOG_PREFIX, 'avatarFileId:', profile.avatarFileId, 'avatarUrl:', profile.avatarUrl);
  }, [hasSession, hydratedUsername, navigate, profile, profileError, profileLoaded, t, username]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAvatarUploaded(fileId, url) {
    console.log(LOG_PREFIX, 'avatar uploaded, fileId:', fileId, 'url:', url);
    setAvatarFileId(fileId);
    setAvatarUrl(url);

    try {
      console.log(LOG_PREFIX, 'persisting avatar to profile');
      const nextProfile = await updateUserProfile({ avatarFileId: fileId });
      setAvatarFileId(nextProfile.avatarFileId || fileId);
      setAvatarUrl(nextProfile.avatarUrl || url);
      refreshProfile();
      console.log(LOG_PREFIX, 'avatar persisted successfully');
      setMessage({ type: 'success', text: t('settings.avatarUpdated') });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(LOG_PREFIX, 'failed to persist avatar:', err);
      setMessage({ type: 'error', text: t('settings.avatarSaveFailed', { message: err.message }) });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    console.log(LOG_PREFIX, 'submitting form, avatarFileId:', avatarFileId);
    setSaving(true);
    setMessage(null);

    try {
      const data = {
        nickname: form.nickname,
        bio: form.bio,
        avatarFileId: avatarFileId,
      };

      if (form.newPassword) {
        if (!form.currentPassword) {
          setMessage({ type: 'error', text: t('settings.currentPasswordRequired') });
          setSaving(false);
          return;
        }
        data.currentPassword = form.currentPassword;
        data.newPassword = form.newPassword;
      }

      console.log(LOG_PREFIX, 'saving profile:', data);
      const nextProfile = await updateUserProfile(data);
      console.log(LOG_PREFIX, 'save result:', nextProfile);
      setForm((prev) => ({
        ...prev,
        email: nextProfile.email || prev.email,
        nickname: nextProfile.nickname || '',
        bio: nextProfile.bio || '',
        currentPassword: '',
        newPassword: '',
      }));
      setAvatarFileId(nextProfile.avatarFileId || null);
      setAvatarUrl(nextProfile.avatarUrl || '');
      refreshProfile();
      setMessage(null);
      setShowSuccessDialog(true);
    } catch (err) {
      console.error(LOG_PREFIX, 'save failed:', err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-faint)] outline-none transition focus:border-[color:var(--accent-border)] sm:text-base';
  const labelClass = 'mb-1.5 block text-sm font-medium text-[color:var(--text-secondary)]';

  function handleCloseSuccessDialog() {
    setShowSuccessDialog(false);
    navigate(-1);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)]">
        <p className="text-[color:var(--text-muted)]">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[color:var(--text-primary)]">
      <header className="sticky top-0 z-30 border-b border-[color:var(--surface-border)] bg-[var(--header-bg)] backdrop-blur-lg">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
            title={t('settings.backPrevious')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1
            className="text-lg font-bold text-[color:var(--text-primary)] sm:text-xl"
            style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}
          >
            {t('settings.title')}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {message && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                message.type === 'success'
                  ? 'border-[color:var(--success-border)] bg-[var(--success-soft)] text-[color:var(--success-text)]'
                  : 'border-[color:var(--danger-border)] bg-[var(--danger-soft)] text-[color:var(--danger-text)]'
              }`}
            >
              {message.text}
            </div>
          )}

          <div>
            <label className={labelClass}>{t('settings.avatar')}</label>
            <AvatarUpload currentUrl={avatarUrl} username={username || form.email} onUploaded={handleAvatarUploaded} />
          </div>

          <div>
            <label className={labelClass} htmlFor="email">{t('common.email')}</label>
            <input
              id="email"
              type="email"
              value={form.email}
              disabled
              className={`${inputClass} cursor-not-allowed opacity-50`}
            />
            <p className="mt-1 text-xs text-[color:var(--text-faint)]">{t('settings.emailReadonly')}</p>
          </div>

          <div>
            <label className={labelClass} htmlFor="nickname">{t('common.nickname')}</label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              value={form.nickname}
              onChange={handleChange}
              placeholder={t('settings.nicknamePlaceholder')}
              maxLength={32}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="bio">{t('common.bio')}</label>
            <textarea
              id="bio"
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder={t('settings.bioPlaceholder')}
              maxLength={200}
              rows={3}
              className={`${inputClass} resize-none`}
            />
            <p className="mt-1 text-xs text-[color:var(--text-faint)]">{form.bio.length}/200</p>
          </div>

          <hr className="border-[color:var(--surface-border)]" />

          <div>
            <label className={labelClass} htmlFor="currentPassword">{t('common.password')}</label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={form.currentPassword}
              onChange={handleChange}
              placeholder={t('settings.currentPasswordPlaceholder')}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="newPassword">{t('settings.newPasswordPlaceholder')}</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={form.newPassword}
              onChange={handleChange}
              placeholder={t('settings.newPasswordPlaceholder')}
              minLength={8}
              maxLength={128}
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-6 py-2.5 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40"
            >
              {saving ? t('settings.saving') : t('common.save')}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-2.5 text-sm text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </main>

      {showSuccessDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCloseSuccessDialog} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-6 shadow-[var(--surface-shadow)]">
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]" style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}>
              {t('settings.saveSuccess')}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
              {t('settings.saveSuccessHint')}
            </p>
            <button
              type="button"
              onClick={handleCloseSuccessDialog}
              className="mt-5 w-full rounded-xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-4 py-2.5 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
