import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AvatarUpload from '../components/AvatarUpload';
import { fetchUserProfile, updateUserProfile, isLoggedIn, getUsernameFromToken } from '../services/blogApi';

const LOG_PREFIX = '[SettingsPage]';

export default function SettingsPage() {
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

  useEffect(() => {
    console.log(LOG_PREFIX, 'page mounted');
    document.title = '用户设置 - XN Blog';
    if (!isLoggedIn()) {
      console.log(LOG_PREFIX, 'not logged in, redirecting to chat');
      navigate('/chat', { replace: true });
      return;
    }
    console.log(LOG_PREFIX, 'fetching user profile');
    fetchUserProfile()
      .then((user) => {
        console.log(LOG_PREFIX, 'profile loaded:', user);
        setForm((prev) => ({
          ...prev,
          email: user.email || '',
          nickname: user.nickname || '',
          bio: user.bio || '',
        }));
        setAvatarFileId(user.avatarFileId || null);
        setAvatarUrl(user.avatarUrl || '');
        console.log(LOG_PREFIX, 'avatarFileId:', user.avatarFileId, 'avatarUrl:', user.avatarUrl);
      })
      .catch((err) => {
        console.error(LOG_PREFIX, 'failed to load profile:', err);
        setMessage({ type: 'error', text: '加载用户信息失败' });
      })
      .finally(() => setLoading(false));
  }, [navigate]);

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
      await updateUserProfile({ avatarFileId: fileId });
      console.log(LOG_PREFIX, 'avatar persisted successfully');
      setMessage({ type: 'success', text: '头像已更新' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(LOG_PREFIX, 'failed to persist avatar:', err);
      setMessage({ type: 'error', text: '头像保存失败：' + err.message });
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
          setMessage({ type: 'error', text: '修改密码需要输入当前密码' });
          setSaving(false);
          return;
        }
        data.currentPassword = form.currentPassword;
        data.newPassword = form.newPassword;
      }

      console.log(LOG_PREFIX, 'saving profile:', data);
      const result = await updateUserProfile(data);
      console.log(LOG_PREFIX, 'save result:', result);
      setForm((prev) => ({ ...prev, currentPassword: '', newPassword: '' }));
      setMessage({ type: 'success', text: '保存成功' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(LOG_PREFIX, 'save failed:', err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-slate-600/60 bg-slate-800/50 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-sky-500/50 sm:text-base";
  const labelClass = "mb-1.5 block text-sm font-medium text-slate-300";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050816' }}>
        <p className="text-slate-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#050816' }}>
      <header className="sticky top-0 z-30 border-b border-slate-700/60 bg-[linear-gradient(180deg,rgba(8,10,22,0.94),rgba(5,8,22,0.92))] backdrop-blur-lg">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-600/70 bg-slate-800/35 text-slate-100 transition hover:border-slate-500/80 hover:bg-slate-700/55"
            title="返回前页"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1
            className="text-lg font-bold text-white sm:text-xl"
            style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}
          >
            用户设置
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {message && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                message.type === 'success'
                  ? 'border-green-500/30 bg-green-500/10 text-green-200'
                  : 'border-red-500/30 bg-red-500/10 text-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <div>
            <label className={labelClass}>头像</label>
            <AvatarUpload currentUrl={avatarUrl} username={getUsernameFromToken() || form.email} onUploaded={handleAvatarUploaded} />
          </div>

          <div>
            <label className={labelClass} htmlFor="email">邮箱</label>
            <input
              id="email"
              type="email"
              value={form.email}
              disabled
              className={`${inputClass} opacity-50 cursor-not-allowed`}
            />
            <p className="mt-1 text-xs text-slate-500">邮箱不可更改</p>
          </div>

          <div>
            <label className={labelClass} htmlFor="nickname">昵称</label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              value={form.nickname}
              onChange={handleChange}
              placeholder="设置昵称"
              maxLength={32}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="bio">简介</label>
            <textarea
              id="bio"
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="写一段个人简介..."
              maxLength={200}
              rows={3}
              className={`${inputClass} resize-none`}
            />
            <p className="mt-1 text-xs text-slate-500">{form.bio.length}/200</p>
          </div>

          <hr className="border-slate-700/60" />

          <div>
            <label className={labelClass} htmlFor="currentPassword">当前密码</label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={form.currentPassword}
              onChange={handleChange}
              placeholder="如需修改密码，请输入当前密码"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="newPassword">新密码</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={form.newPassword}
              onChange={handleChange}
              placeholder="输入新密码（至少 8 位字符）"
              minLength={8}
              maxLength={128}
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-6 py-2.5 text-sm text-sky-100 transition hover:border-sky-400/50 hover:bg-sky-500/20 disabled:opacity-40"
            >
              {saving ? '保存中...' : '保存'}
            </button>
            <Link
              to="/blog"
              className="rounded-xl border border-slate-600/60 bg-slate-800/40 px-4 py-2.5 text-sm text-slate-300 transition hover:border-slate-500/80"
            >
              取消
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
