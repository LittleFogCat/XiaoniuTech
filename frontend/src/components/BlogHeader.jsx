import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isLoggedIn, getUsernameFromToken, logout, fetchUserProfile } from '../services/blogApi';

export default function BlogHeader({ onSearch, hideBackButton = false, contentWidth = 'max-w-6xl' }) {
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  const closeTimer = useRef(null);

  useEffect(() => {
    if (loggedIn) {
      fetchUserProfile()
        .then((user) => setProfile(user))
        .catch(() => {});
    }
  }, [loggedIn]);

  const username = getUsernameFromToken();
  const avatarLetter = (profile?.nickname || username || '?').charAt(0).toUpperCase();
  const displayName = profile?.nickname || username || '用户';
  const displayEmail = profile?.email || username || '';
  const avatarUrl = profile?.avatarUrl || '';
  const avatarHue = username
    ? username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
    : 0;

  function handleSubmit(e) {
    e.preventDefault();
    if (onSearch) {
      onSearch(query.trim());
    }
  }

  function handleChange(e) {
    setQuery(e.target.value);
    if (e.target.value === '' && onSearch) {
      onSearch('');
    }
  }

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate('/blog');
  }

  function openMenu() {
    clearTimeout(closeTimer.current);
    setMenuOpen(true);
  }

  function closeMenu() {
    closeTimer.current = setTimeout(() => setMenuOpen(false), 150);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-700/60 bg-[linear-gradient(180deg,rgba(8,10,22,0.94),rgba(5,8,22,0.92))] backdrop-blur-lg">
      <div className={`relative mx-auto flex ${contentWidth} items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4`}>
        {!hideBackButton && (
          <Link
            to="/"
            className="absolute left-[-3rem] top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-xl border border-slate-600/70 bg-slate-800/35 text-slate-100 transition hover:border-slate-500/80 hover:bg-slate-700/55 lg:inline-flex h-10 w-10"
            title="返回主页"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </Link>
        )}

        <Link
          to="/blog"
          className="shrink-0 text-lg font-bold text-white transition hover:text-sky-300 sm:text-xl"
          style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}
        >
          XN Blog
        </Link>

        <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 justify-center">
          <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="搜索文章..."
            className="w-full max-w-sm rounded-xl border border-slate-600/60 bg-slate-800/50 px-3.5 py-2 text-sm text-white placeholder-slate-400 outline-none transition focus:border-sky-500/50 focus:bg-slate-800/80 sm:text-base"
          />
        </form>

        <div className="flex items-center gap-2 sm:gap-3">
          {loggedIn && (
            <>
              <button
                onClick={() => navigate('/blog/manage')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600/60 bg-slate-800/40 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500/80 hover:bg-slate-700/50 sm:px-4 sm:text-sm"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
                <span>管理文章</span>
              </button>
              <button
                onClick={() => navigate('/blog/new')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-100 transition hover:border-sky-400/50 hover:bg-sky-500/20 sm:px-4 sm:text-sm"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>写博客</span>
              </button>
            </>
          )}

          {loggedIn ? (
            <div className="relative shrink-0" onMouseEnter={openMenu} onMouseLeave={closeMenu}>
              <button
                onClick={() => navigate(`/blog/${encodeURIComponent(displayName)}`)}
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white transition hover:ring-2 hover:ring-sky-400/40"
                style={avatarUrl ? {} : {
                  background: `linear-gradient(135deg, hsl(${avatarHue}, 60%, 45%), hsl(${(avatarHue + 30) % 360}, 60%, 35%))`,
                }}
                title={displayName}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  avatarLetter
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 overflow-hidden rounded-xl border border-slate-700/70 bg-[linear-gradient(180deg,rgba(30,41,59,0.98),rgba(15,23,42,0.99))] shadow-[0_18px_40px_rgba(15,23,42,0.28)] backdrop-blur-xl">
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white"
                      style={avatarUrl ? {} : {
                        background: `linear-gradient(135deg, hsl(${avatarHue}, 60%, 45%), hsl(${(avatarHue + 30) % 360}, 60%, 35%))`,
                      }}
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        avatarLetter
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white">{displayName}</div>
                      <div className="truncate text-xs text-slate-400">{displayEmail}</div>
                    </div>
                  </div>

                  <div className="border-t border-slate-700/60" />

                  <div className="py-1">
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-slate-700/50"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                      </svg>
                      设置
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-slate-700/50"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      登出
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600/60 bg-slate-800/40 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500/80 hover:bg-slate-700/50 sm:px-4 sm:text-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              <span>登录/注册</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
