import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserProfile, getUsernameFromToken, logout } from '../services/blogApi';
import { useAppShell } from '../contexts/AppShellContext';

export default function UserAccountMenu({ onLogout }) {
  const { t } = useAppShell();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const menuRef = useRef(null);
  const closeTimer = useRef(null);

  useEffect(() => {
    fetchUserProfile()
      .then((user) => setProfile(user))
      .catch(() => {});

    return () => {
      clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const username = getUsernameFromToken();
  const avatarLetter = (profile?.nickname || username || '?').charAt(0).toUpperCase();
  const displayName = profile?.nickname || username || t('common.nickname');
  const displayEmail = profile?.email || username || '';
  const avatarUrl = profile?.avatarUrl || '';
  const avatarHue = username
    ? username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360
    : 0;

  const openMenu = () => {
    clearTimeout(closeTimer.current);
    setMenuOpen(true);
  };

  const closeMenu = () => {
    closeTimer.current = setTimeout(() => setMenuOpen(false), 150);
  };

  const toggleMenu = () => {
    clearTimeout(closeTimer.current);
    setMenuOpen(open => !open);
  };

  const handleMenuLogout = () => {
    logout();
    setMenuOpen(false);
    onLogout?.();
  };

  return (
    <div ref={menuRef} className="relative shrink-0" onMouseEnter={openMenu} onMouseLeave={closeMenu}>
      <button
        type="button"
        onClick={toggleMenu}
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white transition hover:ring-2 hover:ring-[color:var(--accent-border)]"
        style={avatarUrl ? {} : {
          background: `linear-gradient(135deg, hsl(${avatarHue}, 60%, 45%), hsl(${(avatarHue + 30) % 360}, 60%, 35%))`,
        }}
        title={displayName}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          avatarLetter
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 overflow-hidden rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] shadow-[var(--surface-shadow)] backdrop-blur-xl">
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
              <div className="truncate text-sm font-medium text-[color:var(--text-primary)]">{displayName}</div>
              <div className="truncate text-xs text-[color:var(--text-muted)]">{displayEmail}</div>
            </div>
          </div>

          <div className="border-t border-[color:var(--surface-border)]" />

          <div className="py-1">
            {(profile?.permissions?.includes('chat:manage_model') || profile?.permissions?.includes('chat:manage_agent')) && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/chat/manage');
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9l-5 4.87L18.18 22 12 18.56 5.82 22 7 13.87 2 9l6.91-.74L12 2z" />
                </svg>
                聊天管理
              </button>
            )}
            {(profile?.permissions?.includes('perm:view') || profile?.permissions?.includes('blacklist:view')) && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/permissions');
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M7 8h10M7 12h10M7 16h6" />
                </svg>
                权限管理
              </button>
            )}
            {profile?.permissions?.includes('statistics:view') && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/statistics');
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="19" x2="20" y2="19" />
                  <polyline points="6 15 10 11 13 14 18 9" />
                </svg>
                访问统计
              </button>
            )}
            {profile?.permissions?.includes('stock:review:view') && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/stock/review');
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" />
                  <path d="m7 14 3-3 3 2 4-5" />
                  <path d="M17 8h3v3" />
                </svg>
                股市复盘
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                navigate('/settings');
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
              {t('common.settings')}
            </button>
            <button
              type="button"
              onClick={handleMenuLogout}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {t('common.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}