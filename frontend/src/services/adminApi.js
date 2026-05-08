const API_BASE = '/api';
const AUTH_TOKEN_KEY = 'auth_token';
const STATISTICS_CID_KEY = 'statistics_cid';

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

async function readJsonSafely(res) {
  return res.json().catch(() => ({}));
}

async function throwRequestError(res, fallbackMessage) {
  const data = await readJsonSafely(res);
  throw new Error(data.error || `${fallbackMessage}: ${res.status}`);
}

export function getStatisticsCid() {
  const existing = localStorage.getItem(STATISTICS_CID_KEY);
  if (existing) {
    return existing;
  }

  const generated = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `cid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(STATISTICS_CID_KEY, generated);
  return generated;
}

export async function fetchPermissionMe() {
  const res = await fetch(`${API_BASE}/perm/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to fetch permission info');
  }
  return res.json();
}

export async function fetchUserGroupsOverview() {
  const res = await fetch(`${API_BASE}/perm/usergroup`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to fetch user groups');
  }
  return res.json();
}

export async function createUserGroup(data) {
  const res = await fetch(`${API_BASE}/perm/usergroup`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to create user group');
  }
  return res.json();
}

export async function updateUserGroup(groupId, data) {
  const res = await fetch(`${API_BASE}/perm/usergroup/${groupId}`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to update user group');
  }
  return res.json();
}

export async function updateUserGroupPermissions(groupId, permissions) {
  const res = await fetch(`${API_BASE}/perm/usergroup/${groupId}/perm`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ permissions }),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to update user group permissions');
  }
  return res.json();
}

export async function deleteUserGroup(groupId) {
  const res = await fetch(`${API_BASE}/perm/usergroup/${groupId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to delete user group');
  }
  return res.json();
}

export async function fetchBlacklistEntries() {
  const res = await fetch(`${API_BASE}/blacklist`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to fetch blacklist');
  }
  return res.json();
}

export async function addBlacklistEntry(userId, blockReason) {
  const res = await fetch(`${API_BASE}/blacklist/${userId}`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ blockReason }),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to add blacklist entry');
  }
  return res.json();
}

export async function removeBlacklistEntry(userId) {
  const res = await fetch(`${API_BASE}/blacklist/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to remove blacklist entry');
  }
  return res.json();
}

export async function fetchChatManagementModels() {
  const res = await fetch(`${API_BASE}/chat-management/models`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to fetch chat management models');
  }
  return res.json();
}

export async function createChatManagementModel(data) {
  const res = await fetch(`${API_BASE}/chat-management/models`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to create chat management model');
  }
  return res.json();
}

export async function updateChatManagementModel(modelId, data) {
  const res = await fetch(`${API_BASE}/chat-management/models/${encodeURIComponent(modelId)}`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to update chat management model');
  }
  return res.json();
}

export async function deleteChatManagementModel(modelId) {
  const res = await fetch(`${API_BASE}/chat-management/models/${encodeURIComponent(modelId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to delete chat management model');
  }
  return res.json();
}

export async function fetchChatManagementAgents() {
  const res = await fetch(`${API_BASE}/chat-management/agents`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to fetch chat management agents');
  }
  return res.json();
}

export async function createChatManagementAgent(data) {
  const res = await fetch(`${API_BASE}/chat-management/agents`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to create chat management agent');
  }
  return res.json();
}

export async function updateChatManagementAgent(agentId, data) {
  const res = await fetch(`${API_BASE}/chat-management/agents/${encodeURIComponent(agentId)}`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to update chat management agent');
  }
  return res.json();
}

export async function deleteChatManagementAgent(agentId) {
  const res = await fetch(`${API_BASE}/chat-management/agents/${encodeURIComponent(agentId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to delete chat management agent');
  }
  return res.json();
}

export async function reportStatisticsEnter(data) {
  const res = await fetch(`${API_BASE}/statistics/enter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    keepalive: true,
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to report statistics enter');
  }
  return res.json();
}

export async function reportStatisticsExit(data) {
  const res = await fetch(`${API_BASE}/statistics/exit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    keepalive: true,
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to report statistics exit');
  }
  return res.json();
}

export function sendStatisticsExitBeacon(data) {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
    return false;
  }

  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  return navigator.sendBeacon(`${API_BASE}/statistics/exit`, blob);
}

export async function fetchStatisticsOverview(sub = 'overview', range = 'today') {
  const params = new URLSearchParams({ sub, range });
  const res = await fetch(`${API_BASE}/statistics/overview?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    await throwRequestError(res, 'Failed to fetch statistics overview');
  }
  return res.json();
}

export function getStatisticsExportUrl(range = 'today') {
  const params = new URLSearchParams({ range });
  return `${API_BASE}/statistics/export?${params.toString()}`;
}