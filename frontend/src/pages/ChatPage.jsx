import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import ModelSelect from '../components/ModelSelect';
import Sidebar from '../components/Sidebar';
import Login from '../components/Login';
import IdentityAvatar from '../components/IdentityAvatar';
import IdentityPicker from '../components/IdentityPicker';
import LanguageThemeControls from '../components/LanguageThemeControls';
import UserAccountMenu from '../components/UserAccountMenu';
import useTransientScrollbar from '../hooks/useTransientScrollbar';
import usePageSeo from '../hooks/usePageSeo';
import { useAppShell } from '../contexts/AppShellContext';
import { useAuthState } from '../contexts/AuthContext';
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
const GUEST_CHAT_STORAGE_KEY = 'guest_chat_records';
const GUEST_CHAT_LIMIT = 10;
const CHAT_VIEW = {
  conversation: 'conversation',
  identities: 'identities',
};
const CHAT_THEME_COLOR = '#162033';
const STREAM_UI_UPDATE_INTERVAL_MS = 100;
const SCROLL_BOTTOM_THRESHOLD_PX = 48;
const SCROLL_POSITION_EPSILON_PX = 0.5;
const PAID_CONTACT_MESSAGE = '当前资源需要联系站长开通后使用。请通过首页底部微信或邮件 littlefogcat@foxmail.com 联系站长。';
const EMPTY_PERMISSIONS = [];

function setNamedMetaContent(name, content) {
  let meta = document.querySelector(`meta[name="${name}"]`);
  const created = !meta;

  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }

  const previousContent = meta.getAttribute('content');
  meta.setAttribute('content', content);

  return () => {
    if (previousContent === null) {
      if (created) {
        meta.remove();
      } else {
        meta.removeAttribute('content');
      }
      return;
    }

    meta.setAttribute('content', previousContent);
  };
}

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

function hasAnyPermission(permissions = [], candidates = []) {
  return candidates.some((permission) => permissions.includes(permission));
}

function canUseModel(model, permissions, isGuest) {
  if (!model) {
    return false;
  }

  if (model.free) {
    return isGuest || hasAnyPermission(permissions, ['chat:chat_free', 'chat:chat_paid']);
  }

  return !isGuest && permissions.includes('chat:chat_paid');
}

function canUseIdentity(identity, permissions, isGuest) {
  if (!identity) {
    return false;
  }

  if (identity.free) {
    return isGuest || hasAnyPermission(permissions, ['chat:agent_free', 'chat:agent_paid']);
  }

  return !isGuest && permissions.includes('chat:agent_paid');
}

function pickInitialModel(models, preferredModelId, permissions, isGuest) {
  const normalizedPreferred = normalizeModelId(preferredModelId, models, '');
  const preferredModel = models.find((model) => model.id === normalizedPreferred) || null;
  if (preferredModel && canUseModel(preferredModel, permissions, isGuest)) {
    return preferredModel.id;
  }

  const firstAllowedModel = models.find((model) => canUseModel(model, permissions, isGuest));
  return firstAllowedModel?.id || normalizedPreferred || models[0]?.id || '';
}

function resolveIdentityMeta(chat, identities, t) {
  if (chat?.chatTarget?.type !== 'identity') {
    return null;
  }

  return identities.find(identity => identity.id === chat.chatTarget.id) || {
    id: chat.chatTarget.id,
    name: chat.title || t('common.agentName'),
    description: '',
    avatarUrl: '',
  };
}

function buildChatTitle(content, chat, identityMeta, t) {
  if (chat?.chatTarget?.type === 'identity') {
    return identityMeta?.name || chat.title || t('common.agentConversation');
  }
  return content.slice(0, 20) + (content.length > 20 ? '...' : '');
}

function formatChatError(error, t) {
  return t('chat.errorPrefix', { message: error.message });
}

function isPersistedChat(chat) {
  if (chat?.chatTarget?.type === 'identity') return true;
  if (!Array.isArray(chat?.messages)) return true;
  return chat.messages.length > 0;
}

function buildAssistantMessage(content, options = {}) {
  const {
    thinking = false,
    reasoningContent = '',
    reasoningDurationMs,
  } = options;

  return {
    role: 'assistant',
    content,
    thinking,
    reasoningContent,
    ...(reasoningDurationMs !== undefined ? { reasoningDurationMs } : {}),
  };
}

function upsertAssistantMessage(messages, content, options = {}) {
  const { thinking = false, reasoningContent = '', reasoningDurationMs } = options;
  const nextMessages = Array.isArray(messages) ? [...messages] : [];
  const lastMessage = nextMessages[nextMessages.length - 1];

  if (lastMessage && lastMessage.role === 'assistant') {
    nextMessages[nextMessages.length - 1] = {
      ...lastMessage,
      content,
      thinking,
      reasoningContent,
      ...(reasoningDurationMs !== undefined ? { reasoningDurationMs } : {}),
    };
    return nextMessages;
  }

  nextMessages.push(buildAssistantMessage(content, options));
  return nextMessages;
}

function normalizeStreamChunk(chunk) {
  if (typeof chunk === 'string') {
    return {
      content: chunk,
      reasoningContent: '',
    };
  }

  return {
    content: typeof chunk?.content === 'string' ? chunk.content : '',
    reasoningContent: typeof chunk?.reasoningContent === 'string' ? chunk.reasoningContent : '',
  };
}

function buildThinkingOption(modelId, models) {
  const modelMeta = Array.isArray(models)
    ? models.find((model) => model.id === modelId)
    : null;

  if (!modelMeta?.reasoning) {
    return undefined;
  }

  return { type: 'enabled' };
}

function resolveReasoningDurationMs(startedAt, reasoningContent, currentDurationMs) {
  if (!reasoningContent) {
    return undefined;
  }

  if (Number.isFinite(currentDurationMs) && currentDurationMs >= 0) {
    return currentDurationMs;
  }

  return Math.max(0, Date.now() - startedAt);
}

export default function ChatPage() {
  const { t, theme } = useAppShell();
  const {
    hasSession: hasAuthSession,
    isGuestMode,
    isLoggedIn,
    profile,
    profileLoaded,
    profileError,
    logout,
  } = useAuthState();
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
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const chatScrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mobileActionsRef = useRef(null);
  const isPinnedToBottomRef = useRef(true);
  const { isScrollbarVisible: isChatScrollbarVisible, markScrollbarVisible: markChatScrollbarVisible } = useTransientScrollbar();
  const safeMessages = Array.isArray(currentChat?.messages) ? currentChat.messages : [];
  const isGuest = isGuestMode;
  const viewerPermissions = isGuest
    ? EMPTY_PERMISSIONS
    : (Array.isArray(profile?.permissions) ? profile.permissions : EMPTY_PERMISSIONS);
  const activeIdentity = resolveIdentityMeta(currentChat, identities, t);
  const hasConversationStarted = safeMessages.length > 0;
  const showCenteredComposer = viewMode === CHAT_VIEW.conversation && models.length > 0 && (!currentChat || !hasConversationStarted);
  const hasAccountSession = hasAuthSession && !isGuest;
  const assistantName = activeIdentity?.name || t('common.assistantName');
  const assistantAvatarUrl = activeIdentity?.avatarUrl || '';
  const activeIdentityLabel = activeIdentity ? [activeIdentity.role, activeIdentity.name].filter(Boolean).join(' · ') : '';
  const selectedModelMeta = models.find((model) => model.id === selectedModel) || null;
  const authActionLabel = isGuest ? t('common.login') : t('common.logout');
  const authActionTitle = isGuest ? t('chat.authLoginTitle') : t('chat.authLogoutTitle');
  const chatThemeColor = theme === 'light' ? '#f3f6fb' : CHAT_THEME_COLOR;

  usePageSeo({
    title: viewMode === CHAT_VIEW.identities
      ? `${t('chat.selectIdentityTitle')} - ${t('common.siteName')}`
      : activeIdentity?.name
        ? `${activeIdentity.name} - ${t('common.chatName')}`
        : `${t('chat.pageTitle')} - ${t('common.siteName')}`,
    description: activeIdentity?.description || t('chat.heroDesc'),
    image: activeIdentity?.avatarUrl || '/image/niu.jpg',
    robots: 'noindex, nofollow',
  });

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const restoreThemeColor = setNamedMetaContent('theme-color', chatThemeColor);

    html.classList.add('chat-page-active');
    body.classList.add('chat-page-active');

    return () => {
      restoreThemeColor();
      html.classList.remove('chat-page-active');
      body.classList.remove('chat-page-active');
    };
  }, [chatThemeColor]);

  useEffect(() => {
    if (!mobileActionsOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (event.target instanceof Element && event.target.closest('[data-model-select-content="true"]')) {
        return;
      }

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

  const handleLogin = () => {
    setViewMode(CHAT_VIEW.conversation);
  };

  const handleLogout = () => {
    logout();
    setChats([]);
    setCurrentChat(null);
    setViewMode(CHAT_VIEW.conversation);
    setGuestLimitNotice('');
  };

  const showUnavailableMessage = (resourceType, isFree) => {
    if (isFree) {
      window.alert(resourceType === 'model' ? '当前账号没有免费模型使用权限。' : '当前账号没有免费智能体使用权限。');
      return;
    }

    window.alert(PAID_CONTACT_MESSAGE);
  };

  const ensureModelAvailable = (modelId) => {
    const nextModel = models.find((item) => item.id === normalizeModelId(modelId, models, modelId));
    if (!nextModel) {
      return false;
    }

    if (canUseModel(nextModel, viewerPermissions, isGuest)) {
      return true;
    }

    showUnavailableMessage('model', nextModel.free);
    return false;
  };

  const ensureIdentityAvailable = (identity) => {
    if (canUseIdentity(identity, viewerPermissions, isGuest)) {
      return true;
    }

    showUnavailableMessage('identity', identity?.free);
    return false;
  };

  const handleOpenIdentities = () => {
    setMobileActionsOpen(false);
    setViewMode(CHAT_VIEW.identities);
  };

  const handleAuthAction = () => {
    setMobileActionsOpen(false);
    handleLogout();
  };

  const scrollToLatest = () => {
    const container = chatScrollRef.current;
    if (!container) {
      return;
    }

    const targetScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    if (Math.abs(container.scrollTop - targetScrollTop) > SCROLL_POSITION_EPSILON_PX) {
      container.scrollTop = targetScrollTop;
    }
    isPinnedToBottomRef.current = true;
    setShowScrollToBottom(false);
  };

  const syncScrollState = () => {
    const container = chatScrollRef.current;
    if (!container) {
      return;
    }

    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isAtBottom = distanceToBottom <= SCROLL_BOTTOM_THRESHOLD_PX;
    isPinnedToBottomRef.current = isAtBottom;
    setShowScrollToBottom((previous) => {
      const nextValue = !isAtBottom;
      return previous === nextValue ? previous : nextValue;
    });
  };

  const handleChatScroll = () => {
    syncScrollState();
    markChatScrollbarVisible();
  };

  const commitAssistantPreview = (content, options = {}) => {
    setCurrentChat((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        messages: upsertAssistantMessage(prev.messages, content, options),
      };
    });
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    if (!isGuest && !profileLoaded) return;

    if (!isGuest && profileError) {
      if (/\b401\b/.test(profileError)) {
        handleLogout();
        return;
      }

      setLoadError(profileError);
      return;
    }

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
        const permissions = isGuest ? [] : viewerPermissions;
        const fallbackModel = pickInitialModel(availableModels, defaultModel, permissions, isGuest);
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

        if (!fallbackModel) {
          setLoadError('当前账号没有可用模型，请联系站长开通。');
        }
      })
      .catch((err) => {
        console.error('Failed to load data:', err);
        if (!isGuest && /\b401\b/.test(err.message)) {
          handleLogout();
          return;
        }
        setLoadError(err.message);
      });
  }, [isGuest, isLoggedIn, profileError, profileLoaded, viewerPermissions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useLayoutEffect(() => {
    if (viewMode !== CHAT_VIEW.conversation || !currentChat) {
      return undefined;
    }

    scrollToLatest();
    return undefined;
  }, [currentChat?.id, viewMode]);

  useLayoutEffect(() => {
    if (viewMode !== CHAT_VIEW.conversation || !currentChat?.messages || !isPinnedToBottomRef.current) {
      return undefined;
    }

    scrollToLatest();
    return undefined;
  }, [currentChat?.messages, currentChat?.id, viewMode]);

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
        title: payload.title || t('common.untitledChat'),
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
    if (!ensureIdentityAvailable(identity)) {
      return;
    }

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
        setGuestLimitNotice(t('chat.guestLimitCreate', { limit: GUEST_CHAT_LIMIT }));
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
    const thinking = buildThinkingOption(effectiveModel, models);
    const activeChatTarget = currentChat?.chatTarget || null;
    const activeChatIdentity = identities.find((identity) => identity.id === activeChatTarget?.id) || null;
    const title = buildChatTitle(content, currentChat, activeIdentity, t);
    const persistedTitle = currentChat?.title || title;
    let chatId = currentChat?.id || null;
    let draftChat = currentChat;

    if (!effectiveModel || isLoading) return;
    if (!ensureModelAvailable(effectiveModel)) {
      return;
    }
    if (activeChatIdentity && !ensureIdentityAvailable(activeChatIdentity)) {
      return;
    }
    if (isGuest && !currentChat && chats.length >= GUEST_CHAT_LIMIT) {
      setGuestLimitNotice(t('chat.guestLimitContinue', { limit: GUEST_CHAT_LIMIT }));
      return;
    }
    if (isGuest && currentChat && !chats.some(chat => chat.id === currentChat.id) && chats.length >= GUEST_CHAT_LIMIT) {
      setGuestLimitNotice(t('chat.guestLimitContinue', { limit: GUEST_CHAT_LIMIT }));
      return;
    }

    const userMessage = { role: 'user', content };
    const newMessages = [...safeMessages, userMessage];
    const waitingAssistant = buildAssistantMessage('', {
      thinking: true,
      reasoningContent: '',
    });
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
      let fullReasoningContent = '';
      const thinkingStartedAt = Date.now();
      let reasoningDurationMs;
      let lastUiUpdateAt = 0;
      const streamFn = USE_MOCK
        ? () => mock.streamChatMock(effectiveModel, newMessages)
        : () => streamChat(effectiveModel, newMessages, {
          chatTarget: activeChatTarget,
          ...(thinking ? { thinking } : {}),
        });

      for await (const chunk of streamFn()) {
        const normalizedChunk = normalizeStreamChunk(chunk);
        if (!normalizedChunk.content && !normalizedChunk.reasoningContent) {
          continue;
        }

        fullContent += normalizedChunk.content;
        fullReasoningContent += normalizedChunk.reasoningContent;
        const now = Date.now();

        if (!Number.isFinite(reasoningDurationMs) && fullContent && fullReasoningContent) {
          reasoningDurationMs = Math.max(0, now - thinkingStartedAt);
        }

        if (now - lastUiUpdateAt < STREAM_UI_UPDATE_INTERVAL_MS) {
          continue;
        }

        lastUiUpdateAt = now;
        commitAssistantPreview(fullContent, {
          thinking: fullContent.length === 0,
          reasoningContent: fullReasoningContent,
          reasoningDurationMs,
        });
      }

      reasoningDurationMs = resolveReasoningDurationMs(
        thinkingStartedAt,
        fullReasoningContent,
        reasoningDurationMs,
      );

      commitAssistantPreview(fullContent, {
        thinking: false,
        reasoningContent: fullReasoningContent,
        reasoningDurationMs,
      });

      const finalAssistantMessage = buildAssistantMessage(fullContent, {
        thinking: false,
        reasoningContent: fullReasoningContent,
        reasoningDurationMs,
      });
      const finalDisplayMessages = [...newMessages, finalAssistantMessage];
      const persistedMessages = [...newMessages, { role: 'assistant', content: fullContent }];

      if (USE_MOCK) {
        const updatedChat = chatId
          ? mock.updateChat(chatId, {
            title: persistedTitle,
            messages: finalDisplayMessages,
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
            messages: finalDisplayMessages,
          });
          if (updated) setCurrentChat(updated);
        }
      } else {
        if (chatId) {
          try {
            const updatedResponse = await updateChat(chatId, {
              title: persistedTitle,
              messages: persistedMessages,
              model: effectiveModel,
            });
            const updatedChat = {
              ...(draftChat || currentChat || {}),
              ...(updatedResponse || {}),
              title: updatedResponse?.title || persistedTitle,
              messages: finalDisplayMessages,
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
              messages: persistedMessages,
            });
            const recreatedDisplayChat = {
              ...recreatedChat,
              model: normalizeModelId(recreatedChat.model || effectiveModel, models, effectiveModel),
              chatTarget: recreatedChat.chatTarget || activeChatTarget,
              messages: finalDisplayMessages,
            };
            setChats(prev => sortChatsByUpdatedAt([recreatedDisplayChat, ...prev.filter(chat => chat.id !== chatId)]));
            setCurrentChat(recreatedDisplayChat);
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorText = formatChatError(error, t);
      const errorMessages = [...newMessages, { role: 'assistant', content: errorText }];
      setCurrentChat(prev => {
        if (!prev) return prev;
        const nextMessages = [...prev.messages];
        const lastMessage = nextMessages[nextMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content = errorText;
          lastMessage.thinking = false;
          lastMessage.reasoningContent = '';
        } else {
          nextMessages.push({ role: 'assistant', content: errorText });
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

    if (!ensureModelAvailable(normalizedModelId)) {
      return;
    }

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
          title: currentChat.title || t('common.untitledChat'),
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
    const thinking = buildThinkingOption(effectiveModel, models);
    const userMessageIndex = assistantIndex - 1;
    if (userMessageIndex < 0 || currentChat.messages[userMessageIndex].role !== 'user') return;

    const nextMessages = currentChat.messages.slice(0, assistantIndex);
    const waitingAssistant = buildAssistantMessage('', {
      thinking: true,
      reasoningContent: '',
    });
    setCurrentChat({ ...currentChat, messages: [...nextMessages, waitingAssistant] });
    setIsLoading(true);

    try {
      let fullContent = '';
      let fullReasoningContent = '';
      const thinkingStartedAt = Date.now();
      let reasoningDurationMs;
      let lastUiUpdateAt = 0;
      const streamFn = USE_MOCK
        ? () => mock.streamChatMock(effectiveModel, nextMessages)
        : () => streamChat(effectiveModel, nextMessages, {
          chatTarget: currentChat.chatTarget || null,
          ...(thinking ? { thinking } : {}),
        });

      for await (const chunk of streamFn()) {
        const normalizedChunk = normalizeStreamChunk(chunk);
        if (!normalizedChunk.content && !normalizedChunk.reasoningContent) {
          continue;
        }

        fullContent += normalizedChunk.content;
        fullReasoningContent += normalizedChunk.reasoningContent;
        const now = Date.now();

        if (!Number.isFinite(reasoningDurationMs) && fullContent && fullReasoningContent) {
          reasoningDurationMs = Math.max(0, now - thinkingStartedAt);
        }

        if (now - lastUiUpdateAt < STREAM_UI_UPDATE_INTERVAL_MS) {
          continue;
        }

        lastUiUpdateAt = now;
        commitAssistantPreview(fullContent, {
          thinking: fullContent.length === 0,
          reasoningContent: fullReasoningContent,
          reasoningDurationMs,
        });
      }

      reasoningDurationMs = resolveReasoningDurationMs(
        thinkingStartedAt,
        fullReasoningContent,
        reasoningDurationMs,
      );

      commitAssistantPreview(fullContent, {
        thinking: false,
        reasoningContent: fullReasoningContent,
        reasoningDurationMs,
      });

      const finalAssistantMessage = buildAssistantMessage(fullContent, {
        thinking: false,
        reasoningContent: fullReasoningContent,
        reasoningDurationMs,
      });
      const finalDisplayMessages = [...nextMessages, finalAssistantMessage];
      const persistedMessages = [...nextMessages, { role: 'assistant', content: fullContent }];

      if (USE_MOCK) {
        mock.updateChat(currentChat.id, {
          messages: finalDisplayMessages,
        });
      } else if (isGuest) {
        const updated = upsertGuestChat(currentChat.id, {
          title: currentChat.title || t('common.untitledChat'),
          model: effectiveModel,
          chatTarget: currentChat.chatTarget || null,
          messages: finalDisplayMessages,
        });
        if (updated) setCurrentChat(updated);
      } else {
        try {
          await updateChat(currentChat.id, {
            messages: persistedMessages,
          });
          setCurrentChat(prev => (prev ? { ...prev, messages: finalDisplayMessages } : prev));
        } catch (error) {
          if (!is404Error(error)) {
            throw error;
          }
          const recreatedChat = await createChat({
            title: currentChat.title || t('common.untitledChat'),
            model: effectiveModel,
            chatTarget: currentChat.chatTarget || null,
            messages: persistedMessages,
          });
          const recreatedDisplayChat = {
            ...recreatedChat,
            model: normalizeModelId(recreatedChat.model || effectiveModel, models, effectiveModel),
            chatTarget: recreatedChat.chatTarget || currentChat.chatTarget || null,
            messages: finalDisplayMessages,
          };
          setChats(prev => sortChatsByUpdatedAt([recreatedDisplayChat, ...prev.filter(chat => chat.id !== currentChat.id)]));
          setCurrentChat(recreatedDisplayChat);
        }
      }
    } catch (error) {
      console.error('Regenerate error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="relative flex h-[100dvh] min-h-[100svh] overflow-hidden bg-[var(--page-bg-chat)] text-[color:var(--text-primary)] [overscroll-behavior-y:none]">
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

      <div className="relative z-10 flex min-w-0 flex-1 flex-col p-0 sm:p-3">
        <header className="relative z-30 flex items-center gap-2.5 border-b border-[color:var(--surface-border)] bg-[var(--header-bg)] px-2.5 py-2.5 backdrop-blur-lg sm:gap-3 sm:rounded-[28px] sm:border sm:px-4 sm:py-3.5 sm:shadow-[var(--surface-shadow)]">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            <Link
              to="/"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
              title={t('common.backHome')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </Link>
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] md:hidden"
              title={t('chat.openHistory')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold text-[color:var(--text-primary)] sm:text-lg">{t('common.chatName')}</div>
              <div className="mt-0.5 truncate text-[11px] text-[color:var(--text-faint)] sm:text-xs">
                <span className="sm:hidden">
                  {activeIdentity ? t('chat.currentCompact', { name: activeIdentityLabel || activeIdentity.name }) : t('chat.multiModelWorkbench')}
                </span>
                <span className="hidden sm:inline">
                  {activeIdentity ? t('chat.currentSession', { name: activeIdentityLabel || activeIdentity.name }) : t('chat.streamWorkbench')}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden min-w-0 items-center justify-end gap-2 md:flex md:w-auto md:flex-none md:gap-3">
            <LanguageThemeControls />
            {isGuest && (
              <span className="shrink-0 rounded-full border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-2.5 py-1 text-[11px] text-[color:var(--warning-text)] sm:px-3 sm:text-xs">
                {t('common.guestMode')}
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
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition sm:h-11 sm:rounded-2xl sm:px-4 ${viewMode === CHAT_VIEW.identities ? 'border-[color:var(--accent-border)] bg-[var(--accent-soft)] text-[color:var(--text-primary)]' : 'border-[color:var(--surface-border)] bg-[var(--surface-bg)] text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}
            >
              <span className="text-[15px] leading-none sm:text-base">+</span>
              <span>{t('chat.addAgent')}</span>
            </button>
            {hasAccountSession ? (
              <UserAccountMenu onLogout={handleLogout} />
            ) : (
              <button
                onClick={handleAuthAction}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 text-sm font-medium text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)] sm:h-11 sm:rounded-2xl sm:px-4"
                title={authActionTitle}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>{authActionLabel}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {hasAccountSession && <UserAccountMenu onLogout={handleLogout} />}

            <div ref={mobileActionsRef} className="relative z-40">
              <button
                type="button"
                onClick={() => setMobileActionsOpen(open => !open)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
                title={t('chat.openActions')}
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
                <div className="absolute right-0 top-[calc(100%+0.55rem)] z-50 w-[min(18rem,calc(100vw-1rem))] rounded-[24px] border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-3 shadow-[var(--surface-shadow)] backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-3 border-b border-[color:var(--surface-border)] pb-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--accent-solid)]">{t('chat.actionsLabel')}</div>
                      <div className="mt-1 text-sm font-medium text-[color:var(--text-primary)]">{t('chat.actionsTitle')}</div>
                    </div>
                    {isGuest && (
                      <span className="shrink-0 rounded-full border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-2.5 py-1 text-[11px] text-[color:var(--warning-text)]">
                        {t('common.guestMode')}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-3">
                    <LanguageThemeControls />

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
                      className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition ${viewMode === CHAT_VIEW.identities ? 'border-[color:var(--accent-border)] bg-[var(--accent-soft)] text-[color:var(--text-primary)]' : 'border-[color:var(--surface-border)] bg-[var(--surface-bg)] text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}
                    >
                      <span className="text-[15px] leading-none">+</span>
                      <span>{t('chat.addAgent')}</span>
                    </button>

                    {!hasAccountSession && (
                      <button
                        type="button"
                        onClick={handleAuthAction}
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 text-sm font-medium text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
                        title={authActionTitle}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span>{authActionLabel}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {guestLimitNotice && (
          <div className="mt-2 rounded-2xl border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-3 py-2.5 text-sm text-[color:var(--warning-text)] sm:mt-3 sm:px-4 sm:py-3">
            {guestLimitNotice}
          </div>
        )}

        <div className="relative z-0 mt-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0 bg-[var(--surface-bg)] shadow-none backdrop-blur-lg sm:mt-3 sm:rounded-[30px] sm:border sm:border-[color:var(--surface-border)] sm:shadow-[var(--surface-shadow)]">
          {viewMode === CHAT_VIEW.identities ? (
            <IdentityPicker
              identities={identities}
              chats={chats}
              onSelectIdentity={handleCreateIdentityChat}
              onBack={() => setViewMode(CHAT_VIEW.conversation)}
            />
          ) : (
            <>
              <main
                ref={chatScrollRef}
                onScroll={handleChatScroll}
                className={`scrollbar-auto-hide relative flex-1 overflow-y-auto px-2.5 py-3 [overflow-anchor:none] [overscroll-behavior-y:contain] sm:px-6 sm:py-6 ${isChatScrollbarVisible ? 'scrollbar-active' : ''}`}
              >
                {loadError ? (
                  <div className="flex h-full items-center justify-center px-4">
                    <div className="max-w-md px-4 text-center text-[color:var(--danger-text)]">
                      <div className="mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <p className="mb-2 text-lg font-medium">{t('chat.loadFailed')}</p>
                      <p className="text-sm text-[color:var(--text-muted)]">{loadError}</p>
                    </div>
                  </div>
                ) : models.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-4">
                    <div className="text-center text-[color:var(--text-muted)]">
                      <div className="mb-4">
                        <svg className="mx-auto h-8 w-8 animate-spin text-sky-200/70" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                      <p className="text-lg">{t('chat.loadingModels')}</p>
                    </div>
                  </div>
                ) : showCenteredComposer ? (
                  <div className="mx-auto flex min-h-full w-full max-w-5xl items-center justify-center">
                    <div className="w-full max-w-4xl py-8">
                      <div className="mb-8 text-center">
                        {activeIdentity ? (
                          <div className="mx-auto flex max-w-2xl flex-col items-center rounded-[30px] border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] px-6 py-7 shadow-[var(--surface-shadow)]">
                            <IdentityAvatar name={activeIdentity.name} avatarUrl={activeIdentity.avatarUrl} size="xl" />
                            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                              <span className="rounded-full border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--accent-solid)]">
                                {t('chat.linkedAgent')}
                              </span>
                              {activeIdentity.role && (
                                <span className="rounded-full border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 py-1 text-xs font-medium text-[color:var(--text-secondary)]">
                                  {activeIdentity.role}
                                </span>
                              )}
                            </div>
                            <h2 className="mt-4 text-3xl font-semibold text-[color:var(--text-primary)] sm:text-4xl">{t('chat.startConversationWith', { name: activeIdentity.name })}</h2>
                            <p className="mt-3 max-w-xl text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">
                              {activeIdentity.description || t('chat.linkedAgentDescription')}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <span className="rounded-full border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--accent-solid)]">
                              {t('chat.neuralConsole')}
                            </span>
                            <h2 className="mt-4 text-3xl font-semibold text-[color:var(--text-primary)] sm:text-5xl">{t('chat.heroTitle')}</h2>
                            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">
                              {t('chat.heroDesc')}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mx-auto w-full max-w-3xl">
                        <ChatInput
                          onSend={handleSend}
                          disabled={isLoading || !selectedModel}
                          layout="centered"
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
                        reasoningContent={msg.reasoningContent || ''}
                        reasoningDurationMs={msg.reasoningDurationMs}
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
                  <div className="relative px-2 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-1.5 sm:px-6 sm:pb-4 sm:pt-2">
                  <button
                    type="button"
                    onClick={scrollToLatest}
                    className={`absolute bottom-[calc(100%+50px)] right-4 z-20 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--accent-border)] bg-[var(--surface-bg-strong)] text-[color:var(--accent-solid)] shadow-[var(--surface-shadow)] backdrop-blur-xl transition-all duration-200 sm:right-6 ${showScrollToBottom ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-[200px] opacity-0'}`}
                    title={t('chat.backBottom')}
                    aria-hidden={!showScrollToBottom}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 13l5 5 5-5" />
                      <path d="M7 6l5 5 5-5" />
                    </svg>
                  </button>
                  <div className="mx-auto w-full max-w-5xl">
                    <ChatInput onSend={handleSend} disabled={isLoading || !selectedModel} />
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
