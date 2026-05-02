import { useEffect, useRef, useState } from 'react';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import ModelSelect from '../components/ModelSelect';
import Sidebar from '../components/Sidebar';
import Login from '../components/Login';
import IdentityAvatar from '../components/IdentityAvatar';
import IdentityPicker from '../components/IdentityPicker';
import {
  fetchModels,
  fetchIdentities,
  streamChat,
  fetchChats,
  fetchChat,
  createChat,
  updateChat,
  deleteChat,
} from '../services/api';
import * as mock from '../services/mock';

const USE_MOCK = false;
const GUEST_MODE = 'guest';
const AUTH_MODE_KEY = 'auth_mode';
const AUTH_TOKEN_KEY = 'auth_token';
const GUEST_CHAT_STORAGE_KEY = 'guest_chat_records';
const GUEST_CHAT_LIMIT = 10;
const CHAT_VIEW = {
  conversation: 'conversation',
  identities: 'identities',
};
const DEFAULT_ASSISTANT_NAME = 'AI 助手';

function is404Error(error) {
  return error instanceof Error && /\b404\b/.test(error.message);
}

function loadGuestChats() {
  try {
    const raw = localStorage.getItem(GUEST_CHAT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const filtered = parsed.filter(isPersistedChat);
    if (filtered.length !== parsed.length) {
      saveGuestChats(filtered);
    }
    return filtered.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch (error) {
    return [];
  }
}

function saveGuestChats(chats) {
  localStorage.setItem(GUEST_CHAT_STORAGE_KEY, JSON.stringify(chats));
}

function sortChatsByUpdatedAt(chatList) {
  return [...chatList].sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0));
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

function resolveIdentityMeta(chat, identities) {
  if (chat?.chatTarget?.type !== 'identity') {
    return null;
  }

  return identities.find(identity => identity.id === chat.chatTarget.id) || {
    id: chat.chatTarget.id,
    name: chat.title || '智能体',
    description: '',
    avatarUrl: '',
  };
}

function buildChatTitle(content, chat, identityMeta) {
  if (chat?.chatTarget?.type === 'identity') {
    return identityMeta?.name || chat.title || '智能体对话';
  }
  return content.slice(0, 20) + (content.length > 20 ? '...' : '');
}

function isPersistedChat(chat) {
  return chat?.chatTarget?.type === 'identity' || (Array.isArray(chat?.messages) && chat.messages.length > 0);
}

export default function ChatPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState('user');
  const [hasCheckedLogin, setHasCheckedLogin] = useState(false);
  const [models, setModels] = useState([]);
  const [identities, setIdentities] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [viewMode, setViewMode] = useState(CHAT_VIEW.conversation);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [guestLimitNotice, setGuestLimitNotice] = useState('');
  const messagesEndRef = useRef(null);
  const mobileActionsRef = useRef(null);
  const safeMessages = Array.isArray(currentChat?.messages) ? currentChat.messages : [];
  const isGuest = authMode === GUEST_MODE;
  const activeIdentity = resolveIdentityMeta(currentChat, identities);
  const hasConversationStarted = safeMessages.length > 0;
  const showCenteredComposer = viewMode === CHAT_VIEW.conversation && models.length > 0 && (!currentChat || !hasConversationStarted);
  const assistantName = activeIdentity?.name || DEFAULT_ASSISTANT_NAME;
  const assistantAvatarUrl = activeIdentity?.avatarUrl || '';
  const authActionLabel = isGuest ? '登录' : '退出';
  const authActionTitle = isGuest ? '返回登录页' : '退出登录';

  useEffect(() => {
    if (viewMode === CHAT_VIEW.identities) {
      document.title = '选择智能体 | XN Chat';
      return;
    }

    document.title = activeIdentity?.name ? `${activeIdentity.name} | XN Chat` : 'XN Chat';
  }, [viewMode, activeIdentity?.name]);

  useEffect(() => {
    if (!mobileActionsOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (mobileActionsRef.current && !mobileActionsRef.current.contains(event.target)) {
        setMobileActionsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileActionsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileActionsOpen]);

  useEffect(() => {
    setMobileActionsOpen(false);
  }, [viewMode, currentChat?.id, mobileSidebarOpen]);

  const handleLogin = (mode = 'user') => {
    setAuthMode(mode);
    setIsLoggedIn(true);
    setViewMode(CHAT_VIEW.conversation);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem(AUTH_MODE_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setIsLoggedIn(false);
    setAuthMode('user');
    setChats([]);
    setCurrentChat(null);
    setViewMode(CHAT_VIEW.conversation);
    setGuestLimitNotice('');
  };

  const handleOpenIdentities = () => {
    setMobileActionsOpen(false);
    setViewMode(CHAT_VIEW.identities);
  };

  const handleAuthAction = () => {
    setMobileActionsOpen(false);
    handleLogout();
  };

  useEffect(() => {
    const savedMode = localStorage.getItem(AUTH_MODE_KEY) || 'user';
    const hasToken = Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(savedMode === GUEST_MODE ? loggedIn : loggedIn && hasToken);
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
      setIdentities([]);
      setCurrentChat(null);
      setSelectedModel(loadedChats[0]?.model || '');
      setViewMode(CHAT_VIEW.conversation);
      return;
    }

    const modelPromise = fetchModels();
    const chatPromise = isGuest ? Promise.resolve(loadGuestChats()) : fetchChats();
    const identityPromise = fetchIdentities().catch((error) => {
      console.error('Failed to load identities:', error);
      return [];
    });

    Promise.all([modelPromise, chatPromise, identityPromise])
      .then(([modelData, chatList, identityList]) => {
        const availableModels = modelData.models;
        const defaultModel = modelData.defaultModel;
        const fallbackModel = defaultModel || availableModels[0]?.id || '';
        const normalizedChats = chatList
          .map(chat => ({
            ...chat,
            model: normalizeModelId(chat.model, availableModels, fallbackModel),
            chatTarget: chat.chatTarget || null,
          }))
          .filter(isPersistedChat);

        setModels(availableModels);
        setIdentities(identityList);
        setChats(sortChatsByUpdatedAt(normalizedChats));
        setCurrentChat(null);
        setSelectedModel(fallbackModel);
        setViewMode(CHAT_VIEW.conversation);
      })
      .catch((err) => {
        console.error('Failed to load data:', err);
        if (!isGuest && /\b401\b/.test(err.message)) {
          handleLogout();
          return;
        }
        setLoadError(err.message);
      });
  }, [hasCheckedLogin, isLoggedIn, isGuest]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages]);

  const upsertGuestChat = (chatId, payload) => {
    const now = Date.now();
    const existing = chats.find(chat => chat.id === chatId);
    let nextChats;

    if (existing) {
      nextChats = chats.map(chat => (
        chat.id === chatId
          ? { ...chat, ...payload, chatTarget: payload.chatTarget ?? chat.chatTarget ?? null, updatedAt: now }
          : chat
      ));
    } else {
      const created = {
        id: chatId,
        title: payload.title || '新对话',
        model: payload.model || selectedModel || 'glm-5.1',
        chatTarget: payload.chatTarget ?? null,
        messages: payload.messages || [],
        createdAt: now,
        updatedAt: now,
      };
      nextChats = [created, ...chats];
    }

    nextChats = sortChatsByUpdatedAt(nextChats);
    setChats(nextChats);
    saveGuestChats(nextChats);
    return nextChats.find(chat => chat.id === chatId) || null;
  };

  const handleNewChat = async () => {
    setViewMode(CHAT_VIEW.conversation);
    setGuestLimitNotice('');

    if (USE_MOCK) {
      mock.setCurrentChat(null);
      setCurrentChat(null);
      return;
    }

    if (isGuest) {
      setCurrentChat(null);
      return;
    }

    setCurrentChat(null);
  };

  const handleCreateIdentityChat = async (identity) => {
    const existing = chats.find(chat => chat?.chatTarget?.type === 'identity' && chat.chatTarget.id === identity.id);
    if (existing) {
      setGuestLimitNotice('');
      await handleSelectChat(existing.id);
      return;
    }

    const effectiveModel = normalizeModelId(selectedModel, models, selectedModel) || models[0]?.id || '';
    if (!effectiveModel) {
      return;
    }

    const chatTarget = { type: 'identity', id: identity.id };
    setGuestLimitNotice('');

    if (isGuest) {
      if (chats.length >= GUEST_CHAT_LIMIT) {
        setGuestLimitNotice('游客聊天记录已达到 10 条上限，请登录后继续创建新会话。');
        return;
      }

      const now = Date.now();
      const chat = {
        id: `guest_${now}`,
        title: identity.name,
        model: effectiveModel,
        chatTarget,
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      const nextChats = sortChatsByUpdatedAt([chat, ...chats]);
      setChats(nextChats);
      setCurrentChat(chat);
      setSelectedModel(effectiveModel);
      setViewMode(CHAT_VIEW.conversation);
      saveGuestChats(nextChats);
      return;
    }

    const chat = await createChat({
      title: identity.name,
      model: effectiveModel,
      messages: [],
      chatTarget,
    });
    setChats(prev => sortChatsByUpdatedAt([chat, ...prev]));
    setCurrentChat(chat);
    setSelectedModel(normalizeModelId(chat.model, models, effectiveModel));
    setViewMode(CHAT_VIEW.conversation);
  };

  const handleSelectChat = async (chatId) => {
    setViewMode(CHAT_VIEW.conversation);
    setGuestLimitNotice('');

    if (USE_MOCK) {
      mock.setCurrentChat(chatId);
      const chat = mock.getChats().find(item => item.id === chatId);
      setCurrentChat(chat);
      setSelectedModel(normalizeModelId(chat?.model, models, models[0]?.id || ''));
      return;
    }

    if (isGuest) {
      const chat = chats.find(item => item.id === chatId) || null;
      setCurrentChat(chat);
      setSelectedModel(normalizeModelId(chat?.model, models, models[0]?.id || ''));
      return;
    }

    const chat = await fetchChat(chatId);
    const normalizedModel = normalizeModelId(chat?.model, models, models[0]?.id || '');
    setCurrentChat({
      ...chat,
      model: normalizedModel,
      chatTarget: chat.chatTarget || null,
      messages: Array.isArray(chat?.messages) ? chat.messages : [],
    });
    setSelectedModel(normalizeModelId(chat.model, models, models[0]?.id || ''));
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
      return;
    }

    if (isGuest) {
      const nextChats = chats.filter(chat => chat.id !== chatId);
      setChats(nextChats);
      saveGuestChats(nextChats);
      if (currentChat?.id === chatId) {
        const nextCurrent = nextChats[0] || null;
        setCurrentChat(nextCurrent);
        setSelectedModel(normalizeModelId(nextCurrent?.model, models, models[0]?.id || ''));
      }
      return;
    }

    await deleteChat(chatId);
    const nextChats = chats.filter(chat => chat.id !== chatId);
    setChats(nextChats);
    if (currentChat?.id === chatId) {
      setCurrentChat(nextChats[0] || null);
      setSelectedModel(normalizeModelId(nextChats[0]?.model, models, models[0]?.id || ''));
    }
  };

  const handleSend = async (content) => {
    const effectiveModel = normalizeModelId(selectedModel, models, selectedModel);
    const activeChatTarget = currentChat?.chatTarget || null;
    const title = buildChatTitle(content, currentChat, activeIdentity);
    const persistedTitle = currentChat?.title || title;
    let chatId = currentChat?.id || null;
    let draftChat = currentChat;

    if (!effectiveModel || isLoading) return;
    if (isGuest && !currentChat && chats.length >= GUEST_CHAT_LIMIT) {
      setGuestLimitNotice('游客聊天记录已达到 10 条上限，请登录后继续。');
      return;
    }
    if (isGuest && currentChat && !chats.some(chat => chat.id === currentChat.id) && chats.length >= GUEST_CHAT_LIMIT) {
      setGuestLimitNotice('游客聊天记录已达到 10 条上限，请登录后继续。');
      return;
    }

    const userMessage = { role: 'user', content };
    const newMessages = [...safeMessages, userMessage];
    const waitingAssistant = { role: 'assistant', content: '', thinking: true };
    setGuestLimitNotice('');
    setIsLoading(true);

    try {
      if (!chatId) {
        if (USE_MOCK) {
          const created = mock.createChat(title);
          chatId = created.id;
          draftChat = mock.updateChat(chatId, {
            title,
            model: effectiveModel,
            chatTarget: activeChatTarget,
            messages: newMessages,
          }) || {
            ...created,
            title,
            model: effectiveModel,
            chatTarget: activeChatTarget,
            messages: newMessages,
          };
          setChats(mock.getChats());
          setCurrentChat({ ...draftChat, messages: [...newMessages, waitingAssistant] });
        } else if (isGuest) {
          chatId = `guest_${Date.now()}`;
          draftChat = upsertGuestChat(chatId, {
            title,
            model: effectiveModel,
            chatTarget: activeChatTarget,
            messages: newMessages,
          });
          setCurrentChat(
            draftChat
              ? { ...draftChat, messages: [...newMessages, waitingAssistant] }
              : { title, model: effectiveModel, chatTarget: activeChatTarget, messages: [...newMessages, waitingAssistant] }
          );
        } else {
          const created = await createChat({
            title,
            model: effectiveModel,
            messages: newMessages,
            chatTarget: activeChatTarget,
          });
          chatId = created.id;
          draftChat = {
            ...created,
            title: created.title || title,
            model: normalizeModelId(created.model, models, effectiveModel),
            chatTarget: created.chatTarget || activeChatTarget,
            messages: newMessages,
          };
          setChats(prev => sortChatsByUpdatedAt([draftChat, ...prev.filter(chat => chat.id !== chatId)]));
          setCurrentChat({ ...draftChat, messages: [...newMessages, waitingAssistant] });
        }
      } else {
        setCurrentChat(prev => (
          prev
            ? { ...prev, messages: [...newMessages, waitingAssistant] }
            : { title: persistedTitle, model: effectiveModel, chatTarget: activeChatTarget, messages: [...newMessages, waitingAssistant] }
        ));
      }

      let fullContent = '';
      const streamFn = USE_MOCK
        ? () => mock.streamChatMock(effectiveModel, newMessages)
        : () => streamChat(effectiveModel, newMessages, { chatTarget: activeChatTarget });

      for await (const chunk of streamFn()) {
        fullContent += chunk;
        setCurrentChat(prev => {
          if (!prev) return prev;
          const nextMessages = [...prev.messages];
          const lastMessage = nextMessages[nextMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content = fullContent;
            lastMessage.thinking = false;
          } else {
            nextMessages.push({ role: 'assistant', content: fullContent, thinking: false });
          }
          return { ...prev, messages: nextMessages };
        });
      }

      setCurrentChat(prev => {
        if (!prev) return prev;
        const nextMessages = [...prev.messages];
        const lastMessage = nextMessages[nextMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.thinking = false;
        }
        return { ...prev, messages: nextMessages };
      });

      const finalMessages = [...newMessages, { role: 'assistant', content: fullContent }];

      if (USE_MOCK) {
        const updatedChat = chatId
          ? mock.updateChat(chatId, {
            title: persistedTitle,
            messages: finalMessages,
            model: effectiveModel,
            chatTarget: activeChatTarget,
          })
          : null;
        setChats(mock.getChats());
        setCurrentChat(updatedChat ? { ...updatedChat, chatTarget: updatedChat.chatTarget || activeChatTarget } : mock.getCurrentChat());
      } else if (isGuest) {
        if (chatId) {
          const updated = upsertGuestChat(chatId, {
            title: persistedTitle,
          model: effectiveModel,
            chatTarget: activeChatTarget,
            messages: finalMessages,
          });
          if (updated) setCurrentChat(updated);
        }
      } else {
        if (chatId) {
          const updatedMessages = [...newMessages, { role: 'assistant', content: fullContent }];
          try {
            const updatedResponse = await updateChat(chatId, {
              title: persistedTitle,
              messages: updatedMessages,
              model: effectiveModel,
            });
            const updatedChat = {
              ...(draftChat || currentChat || {}),
              ...(updatedResponse || {}),
              title: updatedResponse?.title || persistedTitle,
              messages: Array.isArray(updatedResponse?.messages) ? updatedResponse.messages : updatedMessages,
              model: normalizeModelId(updatedResponse?.model || effectiveModel, models, effectiveModel),
              chatTarget: updatedResponse?.chatTarget || activeChatTarget,
            };
            setCurrentChat(updatedChat);
            setChats(prev => sortChatsByUpdatedAt([updatedChat, ...prev.filter(chat => chat.id !== chatId)]));
          } catch (error) {
            if (!is404Error(error)) {
              throw error;
            }
            const recreatedChat = await createChat({
              title: persistedTitle,
              model: effectiveModel,
              chatTarget: activeChatTarget,
              messages: updatedMessages,
            });
            setChats(prev => sortChatsByUpdatedAt([recreatedChat, ...prev.filter(chat => chat.id !== chatId)]));
            setCurrentChat(recreatedChat);
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessages = [...newMessages, { role: 'assistant', content: `错误: ${error.message}` }];
      setCurrentChat(prev => {
        if (!prev) return prev;
        const nextMessages = [...prev.messages];
        const lastMessage = nextMessages[nextMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content = `错误: ${error.message}`;
          lastMessage.thinking = false;
        } else {
          nextMessages.push({ role: 'assistant', content: `错误: ${error.message}` });
        }
        return { ...prev, messages: nextMessages };
      });

      if (chatId) {
        if (USE_MOCK) {
          const updatedChat = mock.updateChat(chatId, {
            title: persistedTitle,
            model: effectiveModel,
            chatTarget: activeChatTarget,
            messages: errorMessages,
          });
          setChats(mock.getChats());
          if (updatedChat) {
            setCurrentChat({ ...updatedChat, chatTarget: updatedChat.chatTarget || activeChatTarget });
          }
        } else if (isGuest) {
          const updated = upsertGuestChat(chatId, {
            title: persistedTitle,
            model: effectiveModel,
            chatTarget: activeChatTarget,
            messages: errorMessages,
          });
          if (updated) setCurrentChat(updated);
        } else {
          try {
            const updatedResponse = await updateChat(chatId, {
              title: persistedTitle,
              messages: errorMessages,
              model: effectiveModel,
            });
            const updatedChat = {
              ...(draftChat || currentChat || {}),
              ...(updatedResponse || {}),
              title: updatedResponse?.title || persistedTitle,
              messages: Array.isArray(updatedResponse?.messages) ? updatedResponse.messages : errorMessages,
              model: normalizeModelId(updatedResponse?.model || effectiveModel, models, effectiveModel),
              chatTarget: updatedResponse?.chatTarget || activeChatTarget,
            };
            setCurrentChat(updatedChat);
            setChats(prev => sortChatsByUpdatedAt([updatedChat, ...prev.filter(chat => chat.id !== chatId)]));
          } catch (persistError) {
            if (is404Error(persistError)) {
              const recreatedChat = await createChat({
                title: persistedTitle,
                model: effectiveModel,
                chatTarget: activeChatTarget,
                messages: errorMessages,
              });
              setChats(prev => sortChatsByUpdatedAt([recreatedChat, ...prev.filter(chat => chat.id !== chatId)]));
              setCurrentChat(recreatedChat);
            }
          }
        }
      }
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
      return;
    }

    if (isGuest && currentChat) {
      const updated = upsertGuestChat(currentChat.id, {
        model: normalizedModelId,
        title: currentChat.title,
        chatTarget: currentChat.chatTarget || null,
        messages: currentChat.messages || [],
      });
      if (updated) setCurrentChat(updated);
      return;
    }

    if (currentChat) {
      try {
        await updateChat(currentChat.id, { model: normalizedModelId });
        setCurrentChat(prev => (prev ? { ...prev, model: normalizedModelId } : prev));
        setChats(prev => prev.map(chat => (chat.id === currentChat.id ? { ...chat, model: normalizedModelId } : chat)));
      } catch (error) {
        if (!is404Error(error)) {
          throw error;
        }
        const recreatedChat = await createChat({
          title: currentChat.title || '新对话',
          model: normalizedModelId,
          chatTarget: currentChat.chatTarget || null,
          messages: currentChat.messages || [],
        });
        setChats(prev => sortChatsByUpdatedAt([recreatedChat, ...prev.filter(chat => chat.id !== currentChat.id)]));
        setCurrentChat(recreatedChat);
      }
    }
  };

  const handleRegenerate = async (assistantIndex) => {
    if (!currentChat || isLoading) return;

    const effectiveModel = normalizeModelId(selectedModel, models, selectedModel);
    const userMessageIndex = assistantIndex - 1;
    if (userMessageIndex < 0 || currentChat.messages[userMessageIndex].role !== 'user') return;

    const nextMessages = currentChat.messages.slice(0, assistantIndex);
    const waitingAssistant = { role: 'assistant', content: '', thinking: true };
    setCurrentChat({ ...currentChat, messages: [...nextMessages, waitingAssistant] });
    setIsLoading(true);

    try {
      let fullContent = '';
      const streamFn = USE_MOCK
        ? () => mock.streamChatMock(effectiveModel, nextMessages)
        : () => streamChat(effectiveModel, nextMessages, { chatTarget: currentChat.chatTarget || null });

      for await (const chunk of streamFn()) {
        fullContent += chunk;
        setCurrentChat(prev => {
          if (!prev) return prev;
          const regeneratedMessages = [...prev.messages];
          const lastMessage = regeneratedMessages[regeneratedMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content = fullContent;
            lastMessage.thinking = false;
          } else {
            regeneratedMessages.push({ role: 'assistant', content: fullContent, thinking: false });
          }
          return { ...prev, messages: regeneratedMessages };
        });
      }

      setCurrentChat(prev => {
        if (!prev) return prev;
        const regeneratedMessages = [...prev.messages];
        const lastMessage = regeneratedMessages[regeneratedMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.thinking = false;
        }
        return { ...prev, messages: regeneratedMessages };
      });

      if (USE_MOCK) {
        mock.updateChat(currentChat.id, {
          messages: [...nextMessages, { role: 'assistant', content: fullContent }],
        });
      } else if (isGuest) {
        const updatedMessages = [...nextMessages, { role: 'assistant', content: fullContent }];
        const updated = upsertGuestChat(currentChat.id, {
          title: currentChat.title || '新对话',
          model: effectiveModel,
          chatTarget: currentChat.chatTarget || null,
          messages: updatedMessages,
        });
        if (updated) setCurrentChat(updated);
      } else {
        const updatedMessages = [...nextMessages, { role: 'assistant', content: fullContent }];
        try {
          await updateChat(currentChat.id, {
            messages: updatedMessages,
          });
          setCurrentChat(prev => (prev ? { ...prev, messages: updatedMessages } : prev));
        } catch (error) {
          if (!is404Error(error)) {
            throw error;
          }
          const recreatedChat = await createChat({
            title: currentChat.title || '新对话',
            model: effectiveModel,
            chatTarget: currentChat.chatTarget || null,
            messages: updatedMessages,
          });
          setChats(prev => sortChatsByUpdatedAt([recreatedChat, ...prev.filter(chat => chat.id !== currentChat.id)]));
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
      <div className="flex min-h-screen items-center justify-center bg-[#162033]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-300/60 border-t-transparent" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="relative flex h-[100dvh] overflow-hidden bg-[#162033] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.10),transparent_28%),radial-gradient(circle_at_80%_16%,rgba(99,102,241,0.08),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(30,41,59,0.22),transparent_34%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

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

      <div className="relative z-10 flex min-w-0 flex-1 flex-col p-1.5 sm:p-3">
        <header className="relative z-30 flex items-center gap-2.5 rounded-[24px] border border-slate-700/60 bg-[linear-gradient(180deg,rgba(30,41,59,0.82),rgba(17,24,39,0.82))] px-2.5 py-2.5 shadow-[0_12px_28px_rgba(15,23,42,0.16)] backdrop-blur-lg sm:gap-3 sm:rounded-[28px] sm:px-4 sm:py-3.5 sm:shadow-[0_16px_38px_rgba(15,23,42,0.18)]">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-600/70 bg-slate-800/35 text-slate-100 transition hover:border-slate-500/80 hover:bg-slate-700/55 md:hidden"
              title="打开聊天记录"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold text-white sm:text-lg">XN Chat</div>
              <div className="mt-0.5 truncate text-[11px] text-slate-400/75 sm:text-xs">
                <span className="sm:hidden">
                  {activeIdentity ? `当前：${activeIdentity.name}` : '多模型对话工作台'}
                </span>
                <span className="hidden sm:inline">
                  {activeIdentity ? `当前会话：${activeIdentity.name}` : '多模型流式聊天工作台'}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden min-w-0 items-center justify-end gap-2 md:flex md:w-auto md:flex-none md:gap-3">
            {isGuest && (
              <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-200 sm:px-3 sm:text-xs">
                游客模式
              </span>
            )}
            {models.length > 0 && (
              <div className="min-w-[210px] flex-none">
                <ModelSelect
                  models={models}
                  value={selectedModel}
                  onChange={handleModelChange}
                />
              </div>
            )}
            <button
              onClick={handleOpenIdentities}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition sm:h-11 sm:rounded-2xl sm:px-4 ${viewMode === CHAT_VIEW.identities ? 'border-sky-500/30 bg-sky-500/10 text-sky-100' : 'border-slate-600/70 bg-slate-800/35 text-slate-100 hover:border-slate-500/80 hover:bg-slate-700/55'}`}
            >
              <span className="text-[15px] leading-none sm:text-base">+</span>
              <span>添加智能体</span>
            </button>
            <button
              onClick={handleAuthAction}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-600/70 bg-slate-800/35 px-3 text-sm font-medium text-slate-100 transition hover:border-slate-500/80 hover:bg-slate-700/55 sm:h-11 sm:rounded-2xl sm:px-4"
              title={authActionTitle}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>{authActionLabel}</span>
            </button>
          </div>

          <div ref={mobileActionsRef} className="relative z-40 md:hidden">
            <button
              type="button"
              onClick={() => setMobileActionsOpen(open => !open)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-600/70 bg-slate-800/35 text-slate-100 transition hover:border-slate-500/80 hover:bg-slate-700/55"
              title="打开操作菜单"
              aria-expanded={mobileActionsOpen}
              aria-haspopup="menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>

            {mobileActionsOpen && (
              <div className="absolute right-0 top-[calc(100%+0.55rem)] z-50 w-[min(18rem,calc(100vw-1rem))] rounded-[24px] border border-slate-700/70 bg-[linear-gradient(180deg,rgba(30,41,59,0.96),rgba(15,23,42,0.98))] p-3 shadow-[0_18px_40px_rgba(15,23,42,0.28)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200/75">Actions</div>
                    <div className="mt-1 text-sm font-medium text-white">聊天操作</div>
                  </div>
                  {isGuest && (
                    <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-200">
                      游客模式
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-3">
                  {models.length > 0 && (
                    <ModelSelect
                      models={models}
                      value={selectedModel}
                      onChange={(modelId) => {
                        handleModelChange(modelId);
                        setMobileActionsOpen(false);
                      }}
                    />
                  )}

                  <button
                    type="button"
                    onClick={handleOpenIdentities}
                    className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition ${viewMode === CHAT_VIEW.identities ? 'border-sky-500/30 bg-sky-500/10 text-sky-100' : 'border-slate-600/70 bg-slate-800/35 text-slate-100 hover:border-slate-500/80 hover:bg-slate-700/55'}`}
                  >
                    <span className="text-[15px] leading-none">+</span>
                    <span>添加智能体</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAuthAction}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-600/70 bg-slate-800/35 px-3 text-sm font-medium text-slate-100 transition hover:border-slate-500/80 hover:bg-slate-700/55"
                    title={authActionTitle}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>{authActionLabel}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {guestLimitNotice && (
          <div className="mt-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200 sm:mt-3 sm:px-4 sm:py-3">
            {guestLimitNotice}
          </div>
        )}

        <div className="relative z-0 mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[26px] border border-slate-700/60 bg-[linear-gradient(180deg,rgba(30,41,59,0.72),rgba(15,23,42,0.76))] shadow-[0_12px_30px_rgba(15,23,42,0.16)] backdrop-blur-lg sm:mt-3 sm:rounded-[30px] sm:shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
          {viewMode === CHAT_VIEW.identities ? (
            <IdentityPicker
              identities={identities}
              chats={chats}
              onSelectIdentity={handleCreateIdentityChat}
              onBack={() => setViewMode(CHAT_VIEW.conversation)}
            />
          ) : (
            <>
              <main className="relative flex-1 overflow-y-auto px-2.5 py-3 sm:px-6 sm:py-6">
                {loadError ? (
                  <div className="flex h-full items-center justify-center px-4">
                    <div className="max-w-md px-4 text-center text-rose-300">
                      <div className="mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <p className="mb-2 text-lg font-medium">加载失败</p>
                      <p className="text-sm text-slate-400">{loadError}</p>
                    </div>
                  </div>
                ) : models.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-4">
                    <div className="text-center text-slate-300/80">
                      <div className="mb-4">
                        <svg className="mx-auto h-8 w-8 animate-spin text-sky-200/70" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                      <p className="text-lg">加载中...</p>
                    </div>
                  </div>
                ) : showCenteredComposer ? (
                  <div className="mx-auto flex min-h-full w-full max-w-5xl items-center justify-center">
                    <div className="w-full max-w-4xl py-8">
                      <div className="mb-8 text-center">
                        {activeIdentity ? (
                          <div className="mx-auto flex max-w-2xl flex-col items-center rounded-[30px] border border-slate-700/60 bg-[linear-gradient(180deg,rgba(30,41,59,0.46),rgba(15,23,42,0.58))] px-6 py-7 shadow-[0_18px_42px_rgba(15,23,42,0.16)]">
                            <IdentityAvatar name={activeIdentity.name} avatarUrl={activeIdentity.avatarUrl} size="xl" />
                            <span className="mt-4 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-sky-100/90">
                              Agent Linked
                            </span>
                            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">和 {activeIdentity.name} 开始一段新对话</h2>
                            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300/75 sm:text-base">
                              {activeIdentity.description || '这个智能体已经绑定到当前会话，发送第一条消息后，对话会自动切换到底部输入模式。'}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-sky-100/90">
                              Neural Console
                            </span>
                            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-5xl">在这里开始下一段高效对话</h2>
                            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300/75 sm:text-base">
                              支持多模型、流式回复和智能体人设。新建会话时输入框会停留在视觉焦点区，第一条消息发出后自动贴底。
                            </p>
                            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-300/70">
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">流式回复</span>
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">移动端适配</span>
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">智能体绑定</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mx-auto w-full max-w-3xl">
                        <ChatInput
                          onSend={handleSend}
                          disabled={isLoading || !selectedModel}
                          layout="centered"
                          autoFocus
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto w-full max-w-5xl pb-4">
                    {safeMessages.map((msg, index) => (
                      <ChatMessage
                        key={index}
                        role={msg.role}
                        content={msg.content}
                        isThinking={msg.role === 'assistant' && msg.thinking}
                        onRegenerate={msg.role === 'assistant' && !msg.thinking ? () => handleRegenerate(index) : null}
                        assistantName={assistantName}
                        assistantAvatarUrl={assistantAvatarUrl}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </main>

              {!showCenteredComposer && !loadError && models.length > 0 && (
                  <div className="px-2 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-1.5 sm:px-6 sm:pb-4 sm:pt-2">
                  <div className="mx-auto w-full max-w-5xl">
                    <ChatInput onSend={handleSend} disabled={isLoading || !selectedModel} autoFocus />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
