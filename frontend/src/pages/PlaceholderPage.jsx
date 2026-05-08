import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppShell } from '../contexts/AppShellContext';
import usePageSeo from '../hooks/usePageSeo';

export default function PlaceholderPage({ titleKey, descriptionKey }) {
  const { t } = useAppShell();
  const title = t(titleKey);
  const description = t(descriptionKey);

  usePageSeo({
    title: `${title} - ${t('common.siteName')}`,
    description,
    robots: 'noindex, nofollow',
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-6 py-12 text-[color:var(--text-primary)]">
      <div className="w-full max-w-2xl rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-8 shadow-[var(--surface-shadow)] backdrop-blur-xl sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-solid)]">{t('placeholder.comingSoon')}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-5 text-base leading-7 text-[color:var(--text-muted)] sm:text-lg">{description}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-xl bg-[var(--accent-solid)] px-5 py-3 text-sm font-semibold text-[var(--accent-solid-text)] transition hover:opacity-90" to="/">
            {t('placeholder.backHome')}
          </Link>
          <Link className="rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-5 py-3 text-sm font-semibold text-[color:var(--text-primary)] transition hover:border-[color:var(--accent-border)]" to="/chat">
            {t('placeholder.enterChat')}
          </Link>
        </div>
      </div>
    </main>
  );
}