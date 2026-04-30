import { useState, useEffect } from 'react';

export default function Sidebar({ chats, currentChatId, onSelectChat, onNewChat, onDeleteChat, collapsed, onToggleCollapse }) {
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

  if (collapsed) {
    return (
      <div className="w-12 bg-[#202123] border-r border-[#3e3f4a] flex flex-col items-center py-2">
        <button
          onClick={onToggleCollapse}
          className="p-2 text-[#ececf1] hover:bg-[#2a2b30] rounded-md"
          title="展开侧边栏"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7.5 4.5l5 5.5-5 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 bg-[#202123] border-r border-[#3e3f4a] flex flex-col">
      <div className="flex items-center justify-between px-3 py-3 border-b border-[#3e3f4a]">
        <span className="text-sm font-medium text-[#ececf1]">聊天记录</span>
        <button
          onClick={onToggleCollapse}
          className="p-1 text-[#8e8ea0] hover:text-[#ececf1] hover:bg-[#2a2b30] rounded"
          title="收起侧边栏"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12.5 4.5l-5 3.5 5 3.5" />
          </svg>
        </button>
      </div>

      <button
        onClick={onNewChat}
        className="m-3 px-3 py-2 text-sm bg-[#19c37d] text-white rounded-md hover:opacity-90 transition-opacity"
      >
        + 新建聊天
      </button>

      <div className="flex-1 overflow-y-auto px-2">
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            onMouseEnter={() => setHoveredChat(chat.id)}
            onMouseLeave={() => setHoveredChat(null)}
            className={`group flex items-center justify-between px-3 py-2 mb-1 rounded-md cursor-pointer transition-colors ${
              currentChatId === chat.id
                ? 'bg-[#343541] text-[#ececf1]'
                : 'text-[#8e8ea0] hover:bg-[#2a2b30] hover:text-[#ececf1]'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{chat.title}</div>
              <div className="text-xs text-[#8e8ea0]">{formatTime(chat.updatedAt)}</div>
            </div>
            {hoveredChat === chat.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
                className="p-1 text-[#8e8ea0] hover:text-[#f85149] rounded"
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
}