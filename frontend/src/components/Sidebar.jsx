import { useState } from 'react';

export default function Sidebar({ chats, currentChatId, onSelectChat, onNewChat, onDeleteChat, collapsed, onToggleCollapse, mobileOpen = false, onClose }) {
  const [hoveredChat, setHoveredChat] = useState(null);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

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
    <div className="flex-1 overflow-y-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {chats.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-400/70">
          还没有会话，先开始一段新的对话。
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
                  ? 'border-sky-500/30 bg-sky-500/10 text-white'
                  : 'border-slate-700/55 bg-slate-900/20 text-slate-300/85 hover:border-slate-600/70 hover:bg-slate-800/35 hover:text-white'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{chat.title}</span>
                  {isIdentityChat && (
                    <span className="shrink-0 rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200/85">
                      Agent
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-slate-400/70">{formatTime(chat.updatedAt)}</div>
              </div>
              {(isMobile || hoveredChat === chat.id) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                  title="删除会话"
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
        <div className="flex h-full w-full flex-col rounded-[28px] border border-slate-700/60 bg-[linear-gradient(180deg,rgba(30,41,59,0.92),rgba(15,23,42,0.94))] shadow-[0_20px_46px_rgba(15,23,42,0.2)] backdrop-blur-xl">
          <div className={`flex items-center border-b border-slate-700/60 ${collapsed ? 'justify-center px-3 py-3' : 'justify-between gap-3 px-4 py-4'}`}>
            {!collapsed && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-200/70">Workspace</div>
                <div className="mt-1 text-sm font-medium text-white">聊天记录</div>
              </div>
            )}
            <button
              onClick={onToggleCollapse}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-600/70 bg-slate-800/40 text-slate-200 transition hover:border-slate-500/80 hover:bg-slate-700/60"
              title={collapsed ? '展开侧边栏' : '收起侧边栏'}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                {collapsed ? <path d="M6 4.5L11.5 9 6 13.5" /> : <path d="M12 4.5L6.5 9 12 13.5" />}
              </svg>
            </button>
          </div>

          <div className="px-3 py-3">
            <button
              onClick={() => handleNew(false)}
              className={`inline-flex h-12 items-center justify-center rounded-2xl border border-sky-500/25 bg-sky-500/12 font-semibold text-sky-100 transition hover:bg-sky-500/18 ${collapsed ? 'w-full' : 'w-full gap-2 px-4'}`}
            >
              <span className="text-lg leading-none">+</span>
              {!collapsed && <span>新建聊天</span>}
            </button>
          </div>

          {!collapsed ? renderChatItems(false) : null}
        </div>
      </aside>

      <div className={`fixed inset-0 z-40 md:hidden ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <button
          onClick={onClose}
          className={`absolute inset-0 bg-[#020617]/65 transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          aria-label="关闭聊天记录"
        />
        <aside className={`absolute inset-y-0 left-0 flex w-[86vw] max-w-xs transform flex-col rounded-r-[28px] border-r border-slate-700/60 bg-[linear-gradient(180deg,rgba(30,41,59,0.96),rgba(15,23,42,0.96))] shadow-[0_24px_60px_rgba(15,23,42,0.32)] backdrop-blur-xl transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between border-b border-slate-700/60 px-4 py-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-200/70">Workspace</div>
              <div className="mt-1 text-sm font-medium text-white">聊天记录</div>
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-600/70 bg-slate-800/40 text-slate-200 transition hover:border-slate-500/80 hover:bg-slate-700/60"
              title="关闭聊天记录"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </button>
          </div>
          <div className="px-3 py-3">
            <button
              onClick={() => handleNew(true)}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-sky-500/25 bg-sky-500/12 px-4 font-semibold text-sky-100 transition hover:bg-sky-500/18"
            >
              <span className="text-lg leading-none">+</span>
              <span>新建聊天</span>
            </button>
          </div>
          {renderChatItems(true)}
        </aside>
      </div>
    </>
  );
}