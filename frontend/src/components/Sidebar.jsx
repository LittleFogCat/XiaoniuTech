import { useState, useEffect } from 'react';

export default function Sidebar({ chats, currentChatId, onSelectChat, onNewChat, onDeleteChat, collapsed, onToggleCollapse, mobileOpen = false, onClose }) {
  const [hoveredChat, setHoveredChat] = useState(null);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
    
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

  const renderExpandedSidebar = (isMobile = false) => (
    <div className={`${isMobile ? 'relative z-10 flex h-full w-[86vw] max-w-xs shadow-2xl' : 'hidden md:flex md:w-64'} flex-col border-r border-[#3e3f4a] bg-[#202123]`}>
      <div className="flex items-center justify-between border-b border-[#3e3f4a] px-3 py-3">
        <span className="text-sm font-medium text-[#ececf1]">聊天记录</span>
        {isMobile ? (
          <button
            onClick={onClose}
            className="rounded p-1 text-[#8e8ea0] hover:bg-[#2a2b30] hover:text-[#ececf1]"
            title="关闭聊天记录"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </button>
        ) : (
          <button
            onClick={onToggleCollapse}
            className="rounded p-1 text-[#8e8ea0] hover:bg-[#2a2b30] hover:text-[#ececf1]"
            title="收起侧边栏"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12.5 4.5l-5 3.5 5 3.5" />
            </svg>
          </button>
        )}
      </div>

      <button
        onClick={() => handleNew(isMobile)}
        className="mx-3 my-3 rounded-md bg-[#19c37d] px-3 py-2 text-sm text-white transition-opacity hover:opacity-90"
      >
        + 新建聊天
      </button>

      <div className="flex-1 overflow-y-auto px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => handleSelect(chat.id, isMobile)}
            onMouseEnter={() => setHoveredChat(chat.id)}
            onMouseLeave={() => setHoveredChat(null)}
            className={`group mb-1 flex touch-manipulation items-center justify-between rounded-md px-3 py-3 transition-colors ${
              currentChatId === chat.id
                ? 'bg-[#343541] text-[#ececf1]'
                : 'text-[#8e8ea0] hover:bg-[#2a2b30] hover:text-[#ececf1]'
            }`}
          >
            <div className="min-w-0 flex-1 pr-2">
              <div className="truncate text-sm">{chat.title}</div>
              <div className="text-xs text-[#8e8ea0]">{formatTime(chat.updatedAt)}</div>
            </div>
            {(isMobile || hoveredChat === chat.id) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
                className="rounded p-1 text-[#8e8ea0] hover:text-[#f85149]"
                title="删除会话"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (collapsed) {
    return (
      <>
        <div className="hidden w-12 flex-col items-center border-r border-[#3e3f4a] bg-[#202123] py-2 md:flex">
          <button
            onClick={onToggleCollapse}
            className="rounded-md p-2 text-[#ececf1] hover:bg-[#2a2b30]"
            title="展开侧边栏"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7.5 4.5l5 5.5-5 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </button>
        </div>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <button
              onClick={onClose}
              className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
              aria-label="关闭聊天记录"
            />
            {renderExpandedSidebar(true)}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {renderExpandedSidebar(false)}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            onClick={onClose}
            className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
            aria-label="关闭聊天记录"
          />
          {renderExpandedSidebar(true)}
        </div>
      )}
    </>
  );
}