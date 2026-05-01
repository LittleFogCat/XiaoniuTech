const API_BASE = '/api';
const AUTH_TOKEN_KEY = 'auth_token';

async function readJsonSafely(res) {
  return res.json().catch(() => ({}));
}

async function throwRequestError(res, fallbackMessage) {
  const data = await readJsonSafely(res);
  throw new Error(data.error || `${fallbackMessage}: ${res.status}`);
}

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getAuthHeaders(extraHeaders = {}) {
  const token = getAuthToken();
  return token
    ? {
        ...extraHeaders,
        Authorization: `Bearer ${token}`,
      }
    : extraHeaders;
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: username, password }),
  });

  const data = await readJsonSafely(res);
  if (!res.ok) {
    throw new Error(data.error || `Login failed: ${res.status}`);
  }

  return {
    token: data.token,
    user: data.user,
  };
}

export async function fetchRegisterCaptcha() {
  const res = await fetch(`${API_BASE}/register/captcha`);
  const data = await readJsonSafely(res);
  if (!res.ok) {
    throw new Error(data.error || `Failed to fetch captcha: ${res.status}`);
  }
  return data;
}

export async function requestRegistration(email, password, captchaId, captchaAnswer) {
  const res = await fetch(`${API_BASE}/register/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, captchaId, captchaAnswer }),
  });

  const data = await readJsonSafely(res);
  if (!res.ok) {
    throw new Error(data.error || `Registration request failed: ${res.status}`);
  }

  return data;
}

export async function verifyRegistration(email, code) {
  const res = await fetch(`${API_BASE}/register/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });

  const data = await readJsonSafely(res);
  if (!res.ok) {
    throw new Error(data.error || `Registration verification failed: ${res.status}`);
  }

  return {
    token: data.token,
    user: data.user,
  };
}

export async function fetchModels() {
  const res = await fetch(`${API_BASE}/models`);
  if (!res.ok) {
    await throwRequestError(res, 'Failed to fetch models');
  }
  const data = await res.json();
  return { models: data.models, defaultModel: data.defaultModel };
}

export async function fetchIdentities() {
  const res = await fetch(`${API_BASE}/identities`);
  if (!res.ok) {
    await throwRequestError(res, 'Failed to fetch identities');
  }
  const data = await res.json();
  return data.identities || [];
}

export async function fetchChats() {
  const res = await fetch(`${API_BASE}/chats`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to fetch chats');
  }
  const data = await res.json();
  return data.chats;
}

export async function fetchChat(chatId) {
  const res = await fetch(`${API_BASE}/chats/${chatId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to fetch chat');
  }
  const data = await res.json();
  return data.chat;
}

export async function createChat(data = {}) {
  const res = await fetch(`${API_BASE}/chats`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to create chat');
  }
  const result = await res.json();
  return result.chat;
}

export async function updateChat(chatId, data = {}) {
  const res = await fetch(`${API_BASE}/chats/${chatId}`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to update chat');
  }
  const result = await res.json();
  return result.chat;
}

export async function deleteChat(chatId) {
  const res = await fetch(`${API_BASE}/chats/${chatId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to delete chat');
  }
  return true;
}

export async function* streamChat(model, messages, options = {}) {
  const res = await fetch(`${API_BASE}/chat`, {
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

      try {
        const obj = JSON.parse(data);
        if (obj.content) {
          yield obj.content;
        }
      } catch (e) {
      }
    }
  }
}