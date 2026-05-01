const API_BASE = '/api';
const AUTH_TOKEN_KEY = 'auth_token';

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
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Login failed: ${res.status}`);
  }

  return {
    token: data.token,
    user: data.user,
  };
}

export async function fetchModels() {
  const res = await fetch(`${API_BASE}/models`);
  if (!res.ok) {
    throw new Error(`Failed to fetch models: ${res.status}`);
  }
  const data = await res.json();
  return { models: data.models, defaultModel: data.defaultModel };
}

export async function fetchChats() {
  const res = await fetch(`${API_BASE}/chats`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch chats: ${res.status}`);
  }
  const data = await res.json();
  return data.chats;
}

export async function fetchChat(chatId) {
  const res = await fetch(`${API_BASE}/chats/${chatId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch chat: ${res.status}`);
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
    throw new Error(`Failed to create chat: ${res.status}`);
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
    throw new Error(`Failed to update chat: ${res.status}`);
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
    throw new Error(`Failed to delete chat: ${res.status}`);
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
      ...options,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `Chat failed: ${res.status}`);
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