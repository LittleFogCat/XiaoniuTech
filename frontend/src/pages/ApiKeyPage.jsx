import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ManagementPageLayout from '../components/layout/ManagementPageLayout';
import { useAppShell } from '../contexts/AppShellContext';
import { useAuthState } from '../contexts/AuthContext';
import usePageSeo from '../hooks/usePageSeo';
import { createUserApiKey, deleteUserApiKey, fetchUserApiKeyState } from '../services/blogApi';

function formatDateTime(value) {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleString();
}

export default function ApiKeyPage() {
  const navigate = useNavigate();
  const { t } = useAppShell();
  const { hasSession, profileLoaded, profileError } = useAuthState();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [apiKeyState, setApiKeyState] = useState(null);
  const [generatedValue, setGeneratedValue] = useState('');

  usePageSeo({
    title: t('apiKey.pageTitle'),
    description: t('apiKey.description'),
    robots: 'noindex, nofollow',
  });

  useEffect(() => {
    if (!hasSession) {
      navigate('/chat', { replace: true });
      return;
    }

    if (!profileLoaded) {
      return;
    }

    if (profileError) {
      setMessage({ type: 'error', text: profileError || t('apiKey.loadFailed') });
      setLoading(false);
      return;
    }

    let active = true;

    fetchUserApiKeyState()
      .then((data) => {
        if (!active) {
          return;
        }
        setApiKeyState(data);
        setLoading(false);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setMessage({ type: 'error', text: error.message || t('apiKey.loadFailed') });
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [hasSession, navigate, profileError, profileLoaded, t]);

  const hasApiKey = Boolean(apiKeyState?.hasApiKey);
  const statusToneClass = hasApiKey
    ? 'border-[color:var(--success-border)] bg-[var(--success-soft)] text-[color:var(--success-text)]'
    : 'border-[color:var(--surface-border)] bg-[var(--surface-bg)] text-[color:var(--text-muted)]';

  const usageExamples = useMemo(() => ({
    header: `X-API-Key: ${generatedValue || '<your-api-key>'}`,
    bearer: `Authorization: Bearer ${generatedValue || '<your-api-key>'}`,
  }), [generatedValue]);

  async function handleGenerate() {
    setSaving(true);
    setMessage(null);

    try {
      const nextState = await createUserApiKey();
      setApiKeyState(nextState);
      setGeneratedValue(nextState.value || '');
      setMessage({ type: 'success', text: t('apiKey.generateSuccess') });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || t('apiKey.loadFailed') });
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke() {
    setSaving(true);
    setMessage(null);

    try {
      const nextState = await deleteUserApiKey();
      setApiKeyState(nextState);
      setGeneratedValue('');
      setMessage({ type: 'success', text: t('apiKey.revokeSuccess') });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || t('apiKey.loadFailed') });
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    if (!generatedValue) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedValue);
      setMessage({ type: 'success', text: t('apiKey.copySuccess') });
    } catch {
      setMessage({ type: 'error', text: t('apiKey.copyFailed') });
    }
  }

  if (loading) {
    return (
      <ManagementPageLayout eyebrow={t('apiKey.eyebrow')} title={t('apiKey.title')} showUserAccountMenu={hasSession}>
        <div className="rounded-[24px] border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-6 text-sm text-[color:var(--text-muted)] shadow-[var(--surface-shadow)]">
          {t('common.loading')}
        </div>
      </ManagementPageLayout>
    );
  }

  return (
    <ManagementPageLayout eyebrow={t('apiKey.eyebrow')} title={t('apiKey.title')} showUserAccountMenu={hasSession}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="rounded-[28px] border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-6 shadow-[var(--surface-shadow)]">
          <p className="max-w-2xl text-sm leading-6 text-[color:var(--text-muted)]">{t('apiKey.description')}</p>

          {message ? (
            <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${message.type === 'success' ? 'border-[color:var(--success-border)] bg-[var(--success-soft)] text-[color:var(--success-text)]' : 'border-[color:var(--danger-border)] bg-[var(--danger-soft)] text-[color:var(--danger-text)]'}`}>
              {message.text}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-faint)]">{t('apiKey.statusLabel')}</div>
              <div className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-medium ${statusToneClass}`}>
                {hasApiKey ? t('apiKey.active') : t('apiKey.inactive')}
              </div>
              <div className="mt-4 text-sm text-[color:var(--text-muted)]">{t('apiKey.scopeHint')}</div>
            </div>

            <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-faint)]">{t('apiKey.createdAtLabel')}</div>
              <div className="mt-3 text-sm font-medium text-[color:var(--text-primary)]">{formatDateTime(apiKeyState?.apiKeyCreatedAt)}</div>
              <div className="mt-4 text-sm text-[color:var(--text-muted)]">{t('apiKey.noExpiry')}</div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-4">
            <div className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-faint)]">API Key Preview</div>
            <div className="mt-3 break-all font-mono text-sm text-[color:var(--text-primary)]">{apiKeyState?.apiKeyPreview || '--'}</div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={saving}
              className="rounded-2xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-5 py-2.5 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-50"
            >
              {saving ? t('common.loading') : hasApiKey ? t('apiKey.regenerate') : t('apiKey.generate')}
            </button>
            <button
              type="button"
              onClick={handleRevoke}
              disabled={saving || !hasApiKey}
              className="rounded-2xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-5 py-2.5 text-sm font-medium text-[color:var(--danger-text)] transition hover:opacity-90 disabled:opacity-40"
            >
              {t('apiKey.revoke')}
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-4">
            <div className="text-sm font-medium text-[color:var(--text-primary)]">{t('apiKey.generatedValueTitle')}</div>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">{generatedValue ? t('apiKey.generatedValueHint') : t('apiKey.emptyState')}</p>
            <textarea
              readOnly
              value={generatedValue}
              placeholder="xntk_********************************"
              className="mt-4 min-h-28 w-full resize-none rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 font-mono text-sm text-[color:var(--text-primary)] outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              disabled={!generatedValue}
              className="mt-4 rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-2 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40"
            >
              {t('chat.copy')}
            </button>
          </div>
        </section>

        <aside className="rounded-[28px] border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-6 shadow-[var(--surface-shadow)]">
          <div className="text-xs uppercase tracking-[0.28em] text-[color:var(--accent-solid)]">Usage</div>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--text-primary)]">{t('apiKey.usageTitle')}</h2>
          <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">{t('apiKey.usageDescription')}</p>

          <div className="mt-5 rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-4">
            <div className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-faint)]">{t('apiKey.usageHeaderLabel')}</div>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-[var(--surface-bg)] p-3 text-xs text-[color:var(--text-primary)]">{usageExamples.header}</pre>
          </div>

          <div className="mt-4 rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-4">
            <div className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-faint)]">{t('apiKey.usageBearerLabel')}</div>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-[var(--surface-bg)] p-3 text-xs text-[color:var(--text-primary)]">{usageExamples.bearer}</pre>
          </div>
        </aside>
      </div>
    </ManagementPageLayout>
  );
}