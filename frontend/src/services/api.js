import { fetchWithAuth, requestJson, throwRequestError } from './httpClient';
import {
  getAccessToken,
  getDeviceId,
  getRefreshToken,
  setAccessToken,
  setAuthMode,
  setCachedUsername,
  setRefreshToken,
  setStoredLoggedIn,
} from './authStorage';
import { scheduleTokenRefresh } from './authV2Timer.js';

const API_BASE = '/api';

export async function login(email, password) {
  const deviceId = getDeviceId();
  const data = await requestJson(`${API_BASE}/login-v2`, {
    method: 'POST',
    auth: false,
    fallbackMessage: 'Login failed',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      deviceId,
      deviceName: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 100) : undefined,
    }),
  });

  setAccessToken(data.accessToken);
  setRefreshToken(data.refreshToken);
  setStoredLoggedIn(true);
  setAuthMode('user');
  if (data.user) {
    setCachedUsername(data.user.email || data.user.username || '');
  }
  if (data.expiresIn) {
    scheduleTokenRefresh(data.expiresIn);
  }
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
    user: data.user,
  };
}

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  const deviceId = getDeviceId();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  const data = await requestJson(`${API_BASE}/refresh`, {
    method: 'POST',
    auth: false,
    fallbackMessage: 'Token refresh failed',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken, deviceId }),
  });
  setAccessToken(data.accessToken);
  setRefreshToken(data.refreshToken);
  if (data.user) {
    setCachedUsername(data.user.email || data.user.username || '');
  }
  if (data.expiresIn) {
    scheduleTokenRefresh(data.expiresIn);
  }
  return data;
}

export async function logoutV2() {
  // Pure server-side revoke. Local cleanup is the caller's responsibility so
  // that a top-level logout helper (blogApi.logout) can coordinate everything
  // (clear v2 storage, cancel timer, emit auth change) in one place. If you
  // call logoutV2() directly, remember to clearAuthSessionV2() yourself.
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  if (!accessToken || !refreshToken) {
    return { success: true };
  }
  await requestJson(`${API_BASE}/logout-v2`, {
    method: 'POST',
    auth: false,
    fallbackMessage: 'Logout failed',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refreshToken }),
  });
  return { success: true };
}

export async function fetchRegisterCaptcha() {
  return requestJson(`${API_BASE}/register/captcha`, {
    auth: false,
    fallbackMessage: 'Failed to fetch captcha',
  });
}

export async function requestRegistration(email, password, captchaId, captchaAnswer) {
  return requestJson(`${API_BASE}/register/request`, {
    method: 'POST',
    auth: false,
    fallbackMessage: 'Registration request failed',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, captchaId, captchaAnswer }),
  });
}

export async function verifyRegistration(email, code) {
  const data = await requestJson(`${API_BASE}/register/verify`, {
    method: 'POST',
    auth: false,
    fallbackMessage: 'Registration verification failed',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });

  return {
    token: data.token,
    user: data.user,
  };
}

export async function fetchModels() {
  const data = await requestJson(`${API_BASE}/chat/models`, {
    fallbackMessage: 'Failed to fetch models',
  });
  return { models: data.models, defaultModel: data.defaultModel };
}

export async function fetchIdentities() {
  const data = await requestJson(`${API_BASE}/chat/agents`, {
    fallbackMessage: 'Failed to fetch identities',
  });
  return data.identities || [];
}

export async function fetchChats() {
  const data = await requestJson(`${API_BASE}/chats`, {
    fallbackMessage: 'Failed to fetch chats',
  });
  return data.chats;
}

export async function fetchChat(chatId) {
  const data = await requestJson(`${API_BASE}/chats/${chatId}`, {
    fallbackMessage: 'Failed to fetch chat',
  });
  return data.chat;
}

export async function createChat(data = {}) {
  const result = await requestJson(`${API_BASE}/chats`, {
    method: 'POST',
    fallbackMessage: 'Failed to create chat',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return result.chat;
}

export async function updateChat(chatId, data = {}) {
  const result = await requestJson(`${API_BASE}/chats/${chatId}`, {
    method: 'PUT',
    fallbackMessage: 'Failed to update chat',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return result.chat;
}

export async function deleteChat(chatId) {
  await requestJson(`${API_BASE}/chats/${chatId}`, {
    method: 'DELETE',
    fallbackMessage: 'Failed to delete chat',
  });
  return true;
}

export async function* streamChat(model, messages, options = {}) {
  const res = await fetchWithAuth(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      chatTarget: options.chatTarget || null,
      ...options,
    }),
  });

  if (!res.ok) {
    await throwRequestError(res, 'Chat failed');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;

      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') {
        return;
      }

      let obj;
      try {
        obj = JSON.parse(data);
      } catch (e) {
        continue;
      }

      if (obj.error) {
        throw new Error(obj.error);
      }

      const content = typeof obj.content === 'string' ? obj.content : '';
      const reasoningContent = typeof obj.reasoning_content === 'string' ? obj.reasoning_content : '';

      if (content || reasoningContent) {
        yield { content, reasoningContent };
      }
    }
  }
}