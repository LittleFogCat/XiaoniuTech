import { useAppShell } from '../contexts/AppShellContext';

export default function LanguageThemeControls({ className = '' }) {
  const { locale, localeOptions, setLocale, theme, toggleTheme, t } = useAppShell();

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <div className="inline-flex items-center rounded-full border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-1 shadow-[var(--surface-shadow)] backdrop-blur-xl">
        {localeOptions.map((option) => {
          const isActive = option.code === locale;
          return (
            <button
              key={option.code}
              type="button"
              onClick={() => setLocale(option.code)}
              aria-pressed={isActive}
              title={option.label}
              className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2.5 text-xs font-semibold transition ${
                isActive
                  ? 'bg-[var(--accent-solid)] text-[var(--accent-solid-text)] shadow-[0_10px_24px_rgba(14,165,233,0.22)]'
                  : 'text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[color:var(--text-primary)]'
              }`}
            >
              {option.shortLabel}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        title={t('common.theme')}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] text-[color:var(--text-primary)] shadow-[var(--surface-shadow)] backdrop-blur-xl transition hover:bg-[var(--surface-hover)]"
      >
        {theme === 'dark' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a6.75 6.75 0 0 0 9 9A9 9 0 1 1 12 3z" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="M4.93 4.93l1.41 1.41" />
            <path d="M17.66 17.66l1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="M6.34 17.66l-1.41 1.41" />
            <path d="M19.07 4.93l-1.41 1.41" />
          </svg>
        )}
      </button>
    </div>
  );
}