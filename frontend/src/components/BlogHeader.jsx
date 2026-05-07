import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isLoggedIn, getUsernameFromToken, logout, fetchUserProfile, importMarkdownArticles } from '../services/blogApi';
import { useAppShell } from '../contexts/AppShellContext';
import LanguageThemeControls from './LanguageThemeControls';

export default function BlogHeader({ onSearch, hideBackButton = false, contentWidth = 'max-w-6xl', showSearch = true }) {
  const { t } = useAppShell();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [composeMenuOpen, setComposeMenuOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  const closeTimer = useRef(null);
  const composeCloseTimer = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  useEffect(() => {
    if (loggedIn) {
      fetchUserProfile()
        .then((user) => setProfile(user))
        .catch(() => {});
    }
  }, [loggedIn]);

  useEffect(() => () => {
    clearTimeout(closeTimer.current);
    clearTimeout(composeCloseTimer.current);
  }, []);

  const username = getUsernameFromToken();
  const avatarLetter = (profile?.nickname || username || '?').charAt(0).toUpperCase();
  const displayName = profile?.nickname || username || t('common.nickname');
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

  function openComposeMenu() {
    clearTimeout(composeCloseTimer.current);
    setComposeMenuOpen(true);
  }

  function closeComposeMenu() {
    composeCloseTimer.current = setTimeout(() => setComposeMenuOpen(false), 150);
  }

  function openImportDialog() {
    setComposeMenuOpen(false);
    setImportDialogOpen(true);
  }

  function closeImportDialog() {
    if (isImporting) {
      return;
    }
    setImportDialogOpen(false);
  }

  async function handleImportSelection(event) {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';
    if (selectedFiles.length === 0) {
      return;
    }

    setIsImporting(true);
    try {
      const result = await importMarkdownArticles(selectedFiles);
      const successResults = (result.results || []).filter((item) => item.success);
      const failedResults = (result.results || []).filter((item) => !item.success);

      if (successResults.length === 0) {
        throw new Error(failedResults[0]?.error || t('blog.importNothing'));
      }

      const summary = [
        t('blog.importSummarySuccess', { count: successResults.length }),
        failedResults.length > 0 ? t('blog.importSummaryFailed', { count: failedResults.length }) : '',
        failedResults.length > 0 && failedResults[0]?.error ? t('blog.importFirstError', { message: failedResults[0].error }) : '',
      ].filter(Boolean).join(' ');

      window.alert(summary);
      setImportDialogOpen(false);

      if (successResults.length === 1 && failedResults.length === 0) {
        navigate(`/blog/edit/${successResults[0].post.slug}`);
      } else {
        navigate('/blog/manage');
      }
    } catch (error) {
      window.alert(error.message || t('blog.importTitle'));
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <>
    <header className="sticky top-0 z-30 border-b border-[color:var(--surface-border)] bg-[var(--header-bg)] backdrop-blur-lg">
      <div className={`relative mx-auto flex ${contentWidth} items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4`}>
        {!hideBackButton && (
          <Link
            to="/"
            className="absolute left-[-3rem] top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] lg:inline-flex"
            title={t('blog.backHomeTitle')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </Link>
        )}

        <Link
          to="/blog"
          className="shrink-0 text-lg font-bold text-[color:var(--text-primary)] transition hover:text-[color:var(--accent-solid)] sm:text-xl"
          style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}
        >
          {t('common.blogName')}
        </Link>

        {showSearch ? (
          <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 justify-center">
            <input
              type="text"
              value={query}
              onChange={handleChange}
              placeholder={t('blog.searchPlaceholder')}
              className="w-full max-w-sm rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3.5 py-2 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-faint)] outline-none transition focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)] sm:text-base"
            />
          </form>
        ) : (
          <div className="min-w-0 flex-1" aria-hidden="true" />
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageThemeControls compact />

          {loggedIn && (
            <>
              <button
                onClick={() => navigate('/blog/manage')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 py-2 text-xs text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)] sm:px-4 sm:text-sm"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
                <span>{t('blog.managePosts')}</span>
              </button>
              <div className="relative" onMouseEnter={openComposeMenu} onMouseLeave={closeComposeMenu}>
                <button
                  onClick={() => navigate('/blog/new')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-3 py-2 text-xs text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] sm:px-4 sm:text-sm"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>{isImporting ? t('blog.importing') : t('blog.createMenu')}</span>
                </button>

                {composeMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.55rem)] z-50 min-w-40 overflow-hidden rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] shadow-[var(--surface-shadow)] backdrop-blur-xl">
                    <button
                      onClick={() => {
                        setComposeMenuOpen(false);
                        navigate('/blog/new');
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
                    >
                      {t('blog.createPost')}
                    </button>
                    <button
                      onClick={openImportDialog}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
                    >
                      {t('blog.importPosts')}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {loggedIn ? (
            <div className="relative shrink-0" onMouseEnter={openMenu} onMouseLeave={closeMenu}>
              <button
                onClick={() => navigate(`/blog/${encodeURIComponent(displayName)}`)}
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white transition hover:ring-2 hover:ring-[color:var(--accent-border)]"
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
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                      </svg>
                      {t('common.settings')}
                    </button>
                    <button
                      onClick={handleLogout}
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
          ) : (
            <Link
              to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 py-2 text-xs text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)] sm:px-4 sm:text-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              <span>{t('common.loginOrRegister')}</span>
            </Link>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,text/markdown"
        multiple
        className="hidden"
        onChange={handleImportSelection}
      />
      <input
        ref={folderInputRef}
        type="file"
        accept=".md,text/markdown"
        multiple
        webkitdirectory=""
        directory=""
        className="hidden"
        onChange={handleImportSelection}
      />

    </header>

    {importDialogOpen && (
      <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto px-4 py-4 sm:items-center sm:py-8">
        <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={closeImportDialog} />
        <div className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-5 shadow-[var(--surface-shadow)] sm:p-6">
          <h3 className="text-lg font-semibold text-[color:var(--text-primary)]" style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}>
            {t('blog.importTitle')}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--text-muted)]">
            {t('blog.importHint')}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40"
            >
              {t('blog.selectFiles')}
            </button>
            <button
              type="button"
              disabled={isImporting}
              onClick={() => folderInputRef.current?.click()}
              className="rounded-xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40"
            >
              {t('blog.selectFolder')}
            </button>
          </div>

          <button
            type="button"
            disabled={isImporting}
            onClick={closeImportDialog}
            className="mt-4 w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-2.5 text-sm text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40"
          >
            {isImporting ? t('blog.importing') : t('common.cancel')}
          </button>
        </div>
      </div>
    )}
    </>
  );
}
