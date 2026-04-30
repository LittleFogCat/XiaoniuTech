import { useState, useEffect, useRef } from 'react';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import ModelSelect from './components/ModelSelect';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import { fetchModels, streamChat, fetchChats, fetchChat, createChat, updateChat, deleteChat } from './services/api';
import * as mock from './services/mock';

const USE_MOCK = false;
const GUEST_MODE = 'guest';
const AUTH_MODE_KEY = 'auth_mode';
const GUEST_CHAT_STORAGE_KEY = 'guest_chat_records';
const GUEST_CHAT_LIMIT = 10;

function is404Error(error) {
  return error instanceof Error && /\b404\b/.test(error.message);
}

function loadGuestChats() {
  try {
    const raw = localStorage.getItem(GUEST_CHAT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch (error) {
    return [];
  }
}

function saveGuestChats(chats) {
  localStorage.setItem(GUEST_CHAT_STORAGE_KEY, JSON.stringify(chats));
}

function normalizeModelId(modelId, models, fallback = '') {
  if (!modelId) {
    return fallback;
  }

  const exact = models.find(model => model.id === modelId);
  if (exact) {
    return exact.id;
  }

  const providerMatch = models.find(model => model.provider === modelId);
  if (providerMatch) {
    return providerMatch.id;
  }

  const legacySuffixMatch = models.find(model => model.id.endsWith(`/${modelId}`));
  if (legacySuffixMatch) {
    return legacySuffixMatch.id;
  }

  return fallback || modelId;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState('user');
  const [hasCheckedLogin, setHasCheckedLogin] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [guestLimitNotice, setGuestLimitNotice] = useState('');
  const messagesEndRef = useRef(null);
  const safeMessages = Array.isArray(currentChat?.messages) ? currentChat.messages : [];
  const isGuest = authMode === GUEST_MODE;

  const handleLogin = (mode = 'user') => {
    setAuthMode(mode);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem(AUTH_MODE_KEY);
    setIsLoggedIn(false);
    setAuthMode('user');
    setChats([]);
    setCurrentChat(null);
    setGuestLimitNotice('');
  };

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const savedMode = localStorage.getItem(AUTH_MODE_KEY) || 'user';
    setIsLoggedIn(loggedIn);
    setAuthMode(savedMode);
    setHasCheckedLogin(true);
  }, []);

  useEffect(() => {
    if (!hasCheckedLogin || !isLoggedIn) return;
    
    setLoadError(null);
    setGuestLimitNotice('');
    
    if (USE_MOCK) {
      setModels(mock.getModels());
      const loadedChats = mock.getChats();
      setChats(loadedChats);
      const current = mock.getCurrentChat();
      if (current) {
        setCurrentChat(current);
        setSelectedModel(current.model);
      } else if (loadedChats.length > 0) {
        mock.setCurrentChat(loadedChats[0].id);
        setCurrentChat(loadedChats[0]);
        setSelectedModel(loadedChats[0].model);
      }
    } else {
      const modelPromise = fetchModels();
      const chatPromise = isGuest ? Promise.resolve(loadGuestChats()) : fetchChats();
      Promise.all([modelPromise, chatPromise]).then(([modelData, chatList]) => {
        const models = modelData.models;
        const defaultModel = modelData.defaultModel;
        const fallbackModel = defaultModel || models[0]?.id || '';
        const normalizedChats = chatList.map(chat => ({
          ...chat,
          model: normalizeModelId(chat.model, models, fallbackModel),
        }));

        setModels(models);
        setChats(normalizedChats);
        if (normalizedChats.length > 0) {
          const firstChat = normalizedChats[0];
          setCurrentChat({ ...firstChat, messages: Array.isArray(firstChat.messages) ? firstChat.messages : [] });
          setSelectedModel(firstChat.model);
        } else {
          setSelectedModel(fallbackModel);
        }
      }).catch((err) => {
        console.error('Failed to load data:', err);
        setLoadError(err.message);
      });
    }
  }, [hasCheckedLogin, isLoggedIn, isGuest]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages]);

  const upsertGuestChat = (chatId, payload) => {
    const now = Date.now();
    const existing = chats.find(c => c.id === chatId);
    let nextChats;
    if (existing) {
      nextChats = chats.map(c => (
        c.id === chatId
          ? { ...c, ...payload, updatedAt: now }
          : c
      ));
    } else {
      const created = {
        id: chatId,
        title: payload.title || '新对话',
        model: payload.model || selectedModel || 'glm-5.1',
        messages: payload.messages || [],
        createdAt: now,
        updatedAt: now,
      };
      nextChats = [created, ...chats];
    }
    nextChats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    setChats(nextChats);
    saveGuestChats(nextChats);
    return nextChats.find(c => c.id === chatId) || null;
  };

  const handleNewChat = async () => {
    if (USE_MOCK) {
      const chat = mock.createChat();
      setChats(mock.getChats());
      setCurrentChat(chat);
      setSelectedModel(normalizeModelId(chat.model, models, chat.model));
    } else if (isGuest) {
      if (chats.length >= GUEST_CHAT_LIMIT) {
        setGuestLimitNotice('游客聊天记录已达到 10 条上限，请登录后继续创建新会话。');
        return;
      }
      const now = Date.now();
      const chat = {
        id: `guest_${now}`,
        title: '新对话',
        model: selectedModel || models[0]?.id || 'glm-5.1',
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      const nextChats = [chat, ...chats].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setChats(nextChats);
      setCurrentChat(chat);
      setSelectedModel(chat.model);
      setGuestLimitNotice('');
      saveGuestChats(nextChats);
    } else {
      const chat = await createChat({ model: selectedModel });
      setChats(prev => [chat, ...prev]);
      setCurrentChat(chat);
      setSelectedModel(normalizeModelId(chat.model, models, selectedModel));
    }
  };

  const handleSelectChat = async (chatId) => {
    if (USE_MOCK) {
      mock.setCurrentChat(chatId);
      const chat = mock.getChats().find(c => c.id === chatId);
      setCurrentChat(chat);
      setSelectedModel(normalizeModelId(chat?.model, models, models[0]?.id || ''));
    } else if (isGuest) {
      const chat = chats.find(c => c.id === chatId) || null;
      setCurrentChat(chat);
      setSelectedModel(normalizeModelId(chat?.model, models, models[0]?.id || ''));
    } else {
      const chat = await fetchChat(chatId);
      const normalizedModel = normalizeModelId(chat?.model, models, models[0]?.id || '');
      setCurrentChat({ ...chat, model: normalizedModel, messages: Array.isArray(chat?.messages) ? chat.messages : [] });
      setSelectedModel(normalizedModel);
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (USE_MOCK) {
      mock.deleteChat(chatId);
      setChats(mock.getChats());
      const current = mock.getCurrentChat();
      if (current) {
        setCurrentChat(current);
        setSelectedModel(current.model);
      } else {
        setCurrentChat(null);
      }
    } else if (isGuest) {
      const nextChats = chats.filter(c => c.id !== chatId);
      setChats(nextChats);
      saveGuestChats(nextChats);
      if (currentChat?.id === chatId) {
        const nextCurrent = nextChats[0] || null;
        setCurrentChat(nextCurrent);
        setSelectedModel(normalizeModelId(nextCurrent?.model, models, models[0]?.id || ''));
      }
    } else {
      await deleteChat(chatId);
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (currentChat?.id === chatId) {
        const newChats = chats.filter(c => c.id !== chatId);
        setCurrentChat(newChats[0] || null);
        setSelectedModel(normalizeModelId(newChats[0]?.model, models, models[0]?.id || ''));
      }
    }
  };

  const handleSend = async (content) => {
    const effectiveModel = normalizeModelId(selectedModel, models, selectedModel);

    if (!effectiveModel || isLoading) return;
    if (isGuest && !currentChat && chats.length >= GUEST_CHAT_LIMIT) {
      setGuestLimitNotice('游客聊天记录已达到 10 条上限，请登录后继续。');
      return;
    }
    if (isGuest && currentChat && !chats.some(c => c.id === currentChat.id) && chats.length >= GUEST_CHAT_LIMIT) {
      setGuestLimitNotice('游客聊天记录已达到 10 条上限，请登录后继续。');
      return;
    }

    const userMessage = { role: 'user', content };
    const newMessages = [...safeMessages, userMessage];
    const waitingAssistant = { role: 'assistant', content: '', thinking: true };

    setCurrentChat(prev => (
      prev
        ? { ...prev, messages: [...newMessages, waitingAssistant] }
        : { messages: [...newMessages, waitingAssistant], model: effectiveModel }
    ));
    setGuestLimitNotice('');
    setIsLoading(true);

    try {
      let fullContent = '';
      const streamFn = USE_MOCK 
        ? () => mock.streamChatMock(effectiveModel, newMessages)
        : () => streamChat(effectiveModel, newMessages);

      for await (const chunk of streamFn()) {
        fullContent += chunk;
        setCurrentChat(prev => {
          if (!prev) return prev;
          const msgs = [...prev.messages];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.content = fullContent;
            lastMsg.thinking = false;
          } else {
            msgs.push({ role: 'assistant', content: fullContent, thinking: false });
          }
          return { ...prev, messages: msgs };
        });
      }
      setCurrentChat(prev => {
        if (!prev) return prev;
        const msgs = [...prev.messages];
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.thinking = false;
        }
        return { ...prev, messages: msgs };
      });

      if (USE_MOCK) {
        const chatId = currentChat?.id || mock.getChats()[0]?.id;
        const title = content.slice(0, 20) + (content.length > 20 ? '...' : '');
        mock.updateChat(chatId, { 
          title: currentChat?.title || title,
          messages: [...newMessages, { role: 'assistant', content: fullContent }],
          model: effectiveModel,
        });
        setChats(mock.getChats());
        setCurrentChat(mock.getCurrentChat());
      } else if (isGuest) {
        const title = content.slice(0, 20) + (content.length > 20 ? '...' : '');
        let chatId = currentChat?.id;
        const finalMessages = [...newMessages, { role: 'assistant', content: fullContent }];
        if (!chatId) {
          if (chats.length >= GUEST_CHAT_LIMIT) {
            setGuestLimitNotice('游客聊天记录已达到 10 条上限，请登录后继续。');
          } else {
            chatId = `guest_${Date.now()}`;
            const created = upsertGuestChat(chatId, {
              title,
              model: effectiveModel,
              messages: finalMessages,
            });
            setCurrentChat(created);
          }
        } else {
          const updated = upsertGuestChat(chatId, {
            title: currentChat?.title || title,
            model: effectiveModel,
            messages: finalMessages,
          });
          if (updated) setCurrentChat(updated);
        }
      } else {
        const title = content.slice(0, 20) + (content.length > 20 ? '...' : '');
        let chatId = currentChat?.id;
        if (!chatId) {
          const finalMessages = [...newMessages, { role: 'assistant', content: fullContent }];
          const newChat = await createChat({ title, model: effectiveModel, messages: finalMessages });
          chatId = newChat.id;
          setChats(prev => [newChat, ...prev]);
          setCurrentChat(newChat);
        } else {
          const updatedMessages = [...newMessages, { role: 'assistant', content: fullContent }];
          try {
            await updateChat(chatId, {
              title: currentChat?.title || title,
              messages: updatedMessages,
              model: effectiveModel,
            });
            const updatedChat = { ...currentChat, title: currentChat?.title || title, messages: updatedMessages, model: effectiveModel };
            setCurrentChat(updatedChat);
            setChats(prev => prev.map(c => c.id === chatId ? { ...c, title: updatedChat.title } : c));
          } catch (error) {
            if (!is404Error(error)) {
              throw error;
            }
            // Backend chat memory may be cleared after restart; recreate and continue.
            const recreatedChat = await createChat({
              title: currentChat?.title || title,
              model: effectiveModel,
              messages: updatedMessages,
            });
            setChats(prev => [recreatedChat, ...prev.filter(c => c.id !== chatId)]);
            setCurrentChat(recreatedChat);
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setCurrentChat(prev => {
        if (!prev) return prev;
        const msgs = [...prev.messages];
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.content = `错误: ${error.message}`;
        } else {
          msgs.push({ role: 'assistant', content: `错误: ${error.message}` });
        }
        return { ...prev, messages: msgs };
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelChange = async (modelId) => {
    const normalizedModelId = normalizeModelId(modelId, models, modelId);

    setSelectedModel(normalizedModelId);
    setGuestLimitNotice('');
    if (USE_MOCK && currentChat) {
      mock.updateChat(currentChat.id, { model: normalizedModelId });
    } else if (isGuest && currentChat) {
      const updated = upsertGuestChat(currentChat.id, {
        model: normalizedModelId,
        title: currentChat.title,
        messages: currentChat.messages || [],
      });
      if (updated) setCurrentChat(updated);
    } else if (currentChat) {
      try {
        await updateChat(currentChat.id, { model: normalizedModelId });
        setCurrentChat(prev => prev ? { ...prev, model: normalizedModelId } : prev);
        setChats(prev => prev.map(c => c.id === currentChat.id ? { ...c, model: normalizedModelId } : c));
      } catch (error) {
        if (!is404Error(error)) {
          throw error;
        }
        const recreatedChat = await createChat({
          title: currentChat.title || '新对话',
          model: normalizedModelId,
          messages: currentChat.messages || [],
        });
        setChats(prev => [recreatedChat, ...prev.filter(c => c.id !== currentChat.id)]);
        setCurrentChat(recreatedChat);
      }
    }
  };

  const handleRegenerate = async (assistantIndex) => {
    if (!currentChat || isLoading) return;
    const effectiveModel = normalizeModelId(selectedModel, models, selectedModel);
    const userMessageIndex = assistantIndex - 1;
    if (userMessageIndex < 0 || currentChat.messages[userMessageIndex].role !== 'user') return;
    
    const userMessage = currentChat.messages[userMessageIndex];
    const msgs = currentChat.messages.slice(0, assistantIndex);
    const waitingAssistant = { role: 'assistant', content: '', thinking: true };
    setCurrentChat({ ...currentChat, messages: [...msgs, waitingAssistant] });
    setIsLoading(true);

    try {
      let fullContent = '';
      const newMessages = msgs;
      const streamFn = USE_MOCK 
        ? () => mock.streamChatMock(effectiveModel, newMessages)
        : () => streamChat(effectiveModel, newMessages);

      for await (const chunk of streamFn()) {
        fullContent += chunk;
        setCurrentChat(prev => {
          if (!prev) return prev;
          const msgs = [...prev.messages];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.content = fullContent;
            lastMsg.thinking = false;
          } else {
            msgs.push({ role: 'assistant', content: fullContent, thinking: false });
          }
          return { ...prev, messages: msgs };
        });
      }
      setCurrentChat(prev => {
        if (!prev) return prev;
        const msgs = [...prev.messages];
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.thinking = false;
        }
        return { ...prev, messages: msgs };
      });

      if (USE_MOCK) {
        mock.updateChat(currentChat.id, { 
          messages: [...msgs, { role: 'assistant', content: fullContent }],
        });
      } else if (isGuest) {
        const updatedMessages = [...msgs, { role: 'assistant', content: fullContent }];
        const updated = upsertGuestChat(currentChat.id, {
          title: currentChat.title || '新对话',
          model: effectiveModel,
          messages: updatedMessages,
        });
        if (updated) setCurrentChat(updated);
      } else {
        const updatedMessages = [...msgs, { role: 'assistant', content: fullContent }];
        try {
          await updateChat(currentChat.id, {
            messages: updatedMessages,
          });
        } catch (error) {
          if (!is404Error(error)) {
            throw error;
          }
          const recreatedChat = await createChat({
            title: currentChat.title || '新对话',
            model: effectiveModel,
            messages: updatedMessages,
          });
          setChats(prev => [recreatedChat, ...prev.filter(c => c.id !== currentChat.id)]);
          setCurrentChat(recreatedChat);
        }
      }
    } catch (error) {
      console.error('Regenerate error:', error);
    } finally {
      setIsLoading(false);
    }
};
  
  if (!hasCheckedLogin) {
    return (
      <div className="min-h-screen bg-[#343541] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#19c37d] border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }
  
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#343541]">
      <Sidebar
        chats={chats}
        currentChatId={currentChat?.id}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-[#3e3f4a] bg-[#202123] px-3 py-3 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[#ececf1] hover:bg-[#2a2b30] md:hidden"
              title="打开聊天记录"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h1 className="truncate text-base font-semibold text-[#ececf1] sm:text-lg">XN Chat</h1>
            <button
              onClick={handleLogout}
              className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-md text-sm text-[#8e8ea0] transition-colors hover:bg-[#2a2b30] hover:text-[#ececf1] sm:h-auto sm:w-auto sm:px-3 sm:py-1.5"
              title={isGuest ? '退出游客模式' : '退出登录'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto sm:flex-none sm:gap-3">
            {isGuest && (
              <span className="shrink-0 rounded-md border border-amber-500/40 bg-amber-500/20 px-2 py-1 text-xs text-amber-300">
                游客模式
              </span>
            )}
            {models.length > 0 && (
              <div className="min-w-0 flex-1 sm:flex-none">
                <ModelSelect
                  models={models}
                  value={selectedModel}
                  onChange={handleModelChange}
                />
              </div>
            )}
          </div>
        </header>
        {guestLimitNotice && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 sm:px-4">
            {guestLimitNotice}
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-[#343541]">
          {loadError ? (
            <div className="flex h-full items-center justify-center px-4">
              <div className="text-center text-[#f85149] max-w-md px-4">
                <div className="mb-4">
                  <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-lg font-medium mb-2">加载失败</p>
                <p className="text-sm text-[#8e8ea0]">{loadError}</p>
              </div>
            </div>
          ) : models.length === 0 ? (
            <div className="flex h-full items-center justify-center px-4">
              <div className="text-center text-[#8e8ea0]">
                <div className="mb-4">
                  <svg className="animate-spin h-8 w-8 mx-auto text-[#19c37d]" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <p className="text-lg">加载中...</p>
              </div>
            </div>
          ) : !currentChat || safeMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6">
              <div className="text-center text-[#8e8ea0]">
                <p className="mb-3 text-2xl font-medium sm:text-3xl">你好，我是 AI 助手</p>
                <p className="text-base sm:text-lg">有什么可以帮助你的吗？</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-4xl pb-4">
              {safeMessages.map((msg, i) => (
                <ChatMessage 
                  key={i} 
                  role={msg.role} 
                  content={msg.content}
                  isThinking={msg.role === 'assistant' && msg.thinking}
                  onRegenerate={msg.role === 'assistant' && !msg.thinking ? () => handleRegenerate(i) : null}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        <ChatInput onSend={handleSend} disabled={isLoading || !selectedModel} />
      </div>
    </div>
  );
}