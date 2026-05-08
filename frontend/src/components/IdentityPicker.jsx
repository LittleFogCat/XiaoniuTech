import IdentityAvatar from './IdentityAvatar';
import useTransientScrollbar from '../hooks/useTransientScrollbar';
import { useAppShell } from '../contexts/AppShellContext';

export default function IdentityPicker({ identities, chats, onSelectIdentity, onBack }) {
  const { t } = useAppShell();
  const { isScrollbarVisible, markScrollbarVisible } = useTransientScrollbar();
  const usedIdentityIds = new Set(
    chats
      .filter(chat => chat?.chatTarget?.type === 'identity')
      .map(chat => chat.chatTarget.id)
  );

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-[color:var(--surface-border)] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--accent-solid)]">{t('chat.identityLab')}</p>
            <h2 className="mt-2 text-2xl font-semibold text-[color:var(--text-primary)] sm:text-3xl">{t('chat.chooseAgentStart')}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-muted)] sm:text-base">
              {t('chat.identityLabDesc')}
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-3 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
          >
            {t('chat.backToChat')}
          </button>
        </div>
      </div>

      <div
        onScroll={markScrollbarVisible}
        className={`scrollbar-auto-hide flex-1 overflow-y-auto px-5 py-5 sm:px-6 ${isScrollbarVisible ? 'scrollbar-active' : ''}`}
      >
        {identities.length === 0 ? (
          <div className="flex h-full min-h-[280px] items-center justify-center rounded-[28px] border border-dashed border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-6 text-center text-[color:var(--text-muted)]">
            {t('chat.noIdentityAvailable')}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {identities.map((identity, index) => {
              const isUsed = usedIdentityIds.has(identity.id);
              return (
                <article
                  key={identity.id}
                  className="group relative overflow-hidden rounded-[28px] border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-5 shadow-[var(--surface-shadow)] transition duration-300 hover:-translate-y-1 hover:border-[color:var(--accent-border)]"
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/35 to-transparent" />
                  <div className="flex items-start gap-4">
                    <IdentityAvatar name={identity.name} avatarUrl={identity.avatarUrl} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--accent-solid)]">
                          {t('chat.agentIndex', { index: String(index + 1).padStart(2, '0') })}
                        </span>
                        {identity.role && (
                          <span className="rounded-full border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--text-secondary)]">
                            {identity.role}
                          </span>
                        )}
                        {identity.free && (
                          <span className="rounded-full border border-[color:var(--success-border)] bg-[var(--success-soft)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--success-text)]">
                            free
                          </span>
                        )}
                        {isUsed && (
                          <span className="rounded-full border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--warning-text)]">
                            {t('chat.identityUsed')}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 truncate text-xl font-semibold text-[color:var(--text-primary)]">{identity.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                        {identity.description || t('chat.noDescription')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-3 text-xs text-[color:var(--text-muted)]">
                    <span>{t('chat.identityBinding')}</span>
                    <button
                      type="button"
                      onClick={() => onSelectIdentity(identity)}
                      className={`inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition ${isUsed ? 'border-[color:var(--warning-border)] bg-[var(--warning-soft)] text-[color:var(--warning-text)] hover:opacity-85' : 'border-[color:var(--accent-border)] bg-[var(--accent-soft)] text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)]'}`}
                    >
                      {isUsed ? t('chat.enterConversation') : t('chat.createConversation')}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}