import { Link } from 'react-router-dom';
import { useAppShell } from '../contexts/AppShellContext';

export default function BackHomeButton({ iconOnly = false }) {
  const { t } = useAppShell();
  const label = t('common.backHome');

  if (iconOnly) {
    return (
      <Link
        to="/"
        aria-label={label}
        title={label}
        className="inline-flex items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-2 text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
          <path d="M9.5 21v-6h5v6" />
        </svg>
      </Link>
    );
  }

  return (
    <Link
      to="/"
      aria-label={label}
      title={label}
      className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 py-2.5 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5.5 9.5V21h13V9.5" />
        <path d="M9.5 21v-6h5v6" />
      </svg>
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
}