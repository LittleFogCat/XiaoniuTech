import { useState } from 'react';
import useTransientScrollbar from '../hooks/useTransientScrollbar';
import { useAppShell } from '../contexts/AppShellContext';

export default function Sidebar({ chats, currentChatId, onSelectChat, onNewChat, onDeleteChat, collapsed, onToggleCollapse, mobileOpen = false, onClose }) {
  const { t, formatRelativeTime } = useAppShell();
  const [hoveredChat, setHoveredChat] = useState(null);
  const { isScrollbarVisible, markScrollbarVisible } = useTransientScrollbar();

  const handleSelect = (chatId, isMobile = false) => {
    onSelectChat(chatId);
    if (isMobile) {
      onClose?.();
    }
  };

  const handleNew = (isMobile = false) => {
    onNewChat();
    if (isMobile) {
      onClose?.();
    }
  };

  const renderChatItems = (isMobile = false) => (
    <div
      onScroll={markScrollbarVisible}
      className={`scrollbar-auto-hide flex-1 overflow-y-auto px-3 pb-[max(0.35rem,env(safe-area-inset-bottom))] ${isScrollbarVisible ? 'scrollbar-active' : ''}`}
    >
      {chats.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-5 text-sm text-[color:var(--text-muted)]">
          {t('chat.emptyChats')}
        </div>
      ) : (
        chats.map((chat) => {
          const isActive = currentChatId === chat.id;
          const isIdentityChat = chat?.chatTarget?.type === 'identity';

          return (
            <div
              key={chat.id}
              onClick={() => handleSelect(chat.id, isMobile)}
              onMouseEnter={() => setHoveredChat(chat.id)}
              onMouseLeave={() => setHoveredChat(null)}
              className={`group mb-2 flex cursor-pointer touch-manipulation items-center justify-between gap-3 rounded-2xl border px-3 py-3 transition duration-200 ${
                isActive
                  ? 'border-[color:var(--accent-border)] bg-[var(--accent-soft)] text-[color:var(--text-primary)]'
                  : 'border-[color:var(--surface-border)] bg-[var(--surface-bg)] text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[color:var(--text-primary)]'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{chat.title}</span>
                  {isIdentityChat && (
                    <span className="shrink-0 rounded-full border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-solid)]">
                      Agent
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-[color:var(--text-faint)]">{formatRelativeTime(chat.updatedAt)}</div>
              </div>
              {(isMobile || hoveredChat === chat.id) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-[color:var(--text-faint)] transition hover:bg-[var(--danger-soft)] hover:text-[color:var(--danger-text)]"
                  title={t('chat.deleteChat')}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </svg>
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <>
      <aside className={`relative z-20 hidden shrink-0 overflow-hidden transition-[width] duration-300 ease-out md:flex ${collapsed ? 'w-[5.25rem]' : 'w-[20rem]'}`}>
        <div className="flex h-full w-full flex-col rounded-[28px] border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] shadow-[var(--surface-shadow)] backdrop-blur-xl">
          <div className={`flex items-center border-b border-[color:var(--surface-border)] ${collapsed ? 'justify-center px-3 py-3' : 'justify-between gap-3 px-4 py-4'}`}>
            {!collapsed && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--accent-solid)]">{t('chat.workspaceLabel')}</div>
                <div className="mt-1 text-sm font-medium text-[color:var(--text-primary)]">{t('chat.workspaceTitle')}</div>
              </div>
            )}
            <button
              onClick={onToggleCollapse}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
              title={collapsed ? t('chat.expandSidebar') : t('chat.collapseSidebar')}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                {collapsed ? <path d="M6 4.5L11.5 9 6 13.5" /> : <path d="M12 4.5L6.5 9 12 13.5" />}
              </svg>
            </button>
          </div>

          <div className="px-3 py-3">
            <button
              onClick={() => handleNew(false)}
              className={`inline-flex h-12 items-center justify-center rounded-2xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] font-semibold text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] ${collapsed ? 'w-full' : 'w-full gap-2 px-4'}`}
            >
              <span className="text-lg leading-none">+</span>
              {!collapsed && <span>{t('chat.newChat')}</span>}
            </button>
          </div>

          {!collapsed ? renderChatItems(false) : null}
        </div>
      </aside>

      <div className={`fixed inset-0 z-40 md:hidden ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <button
          onClick={onClose}
          className={`absolute inset-0 bg-[#020617]/65 transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          aria-label={t('chat.closeHistory')}
        />
        <aside className={`absolute inset-y-0 left-0 flex w-[86vw] max-w-xs transform flex-col rounded-r-[28px] border-r border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] shadow-[var(--surface-shadow)] backdrop-blur-xl transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between border-b border-[color:var(--surface-border)] px-4 py-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--accent-solid)]">{t('chat.workspaceLabel')}</div>
              <div className="mt-1 text-sm font-medium text-[color:var(--text-primary)]">{t('chat.workspaceTitle')}</div>
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
              title={t('chat.closeHistory')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </button>
          </div>
          <div className="px-3 py-3">
            <button
              onClick={() => handleNew(true)}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-4 font-semibold text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
            >
              <span className="text-lg leading-none">+</span>
              <span>{t('chat.newChat')}</span>
            </button>
          </div>
          {renderChatItems(true)}
        </aside>
      </div>
    </>
  );
}