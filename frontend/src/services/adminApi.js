import { requestJson } from './httpClient';

const API_BASE = '/api';
const STATISTICS_CID_KEY = 'statistics_cid';

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
  return requestJson(`${API_BASE}/perm/me`, {
    fallbackMessage: 'Failed to fetch permission info',
  });
}

export async function fetchUserGroupsOverview() {
  return requestJson(`${API_BASE}/perm/usergroup`, {
    fallbackMessage: 'Failed to fetch user groups',
  });
}

export async function createUserGroup(data) {
  return requestJson(`${API_BASE}/perm/usergroup`, {
    method: 'POST',
    fallbackMessage: 'Failed to create user group',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateUserGroup(groupId, data) {
  return requestJson(`${API_BASE}/perm/usergroup/${groupId}`, {
    method: 'PUT',
    fallbackMessage: 'Failed to update user group',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateUserGroupPermissions(groupId, permissions) {
  return requestJson(`${API_BASE}/perm/usergroup/${groupId}/perm`, {
    method: 'PUT',
    fallbackMessage: 'Failed to update user group permissions',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissions }),
  });
}

export async function deleteUserGroup(groupId) {
  return requestJson(`${API_BASE}/perm/usergroup/${groupId}`, {
    method: 'DELETE',
    fallbackMessage: 'Failed to delete user group',
  });
}

export async function fetchBlacklistEntries() {
  return requestJson(`${API_BASE}/blacklist`, {
    fallbackMessage: 'Failed to fetch blacklist',
  });
}

export async function addBlacklistEntry(userId, blockReason) {
  return requestJson(`${API_BASE}/blacklist/${userId}`, {
    method: 'POST',
    fallbackMessage: 'Failed to add blacklist entry',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blockReason }),
  });
}

export async function removeBlacklistEntry(userId) {
  return requestJson(`${API_BASE}/blacklist/${userId}`, {
    method: 'DELETE',
    fallbackMessage: 'Failed to remove blacklist entry',
  });
}

export async function fetchChatManagementModels() {
  return requestJson(`${API_BASE}/chat/management/models`, {
    fallbackMessage: 'Failed to fetch chat management models',
  });
}

export async function createChatManagementModel(data) {
  return requestJson(`${API_BASE}/chat/management/models`, {
    method: 'POST',
    fallbackMessage: 'Failed to create chat management model',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateChatManagementModel(modelId, data) {
  return requestJson(`${API_BASE}/chat/management/models/${encodeURIComponent(modelId)}`, {
    method: 'PUT',
    fallbackMessage: 'Failed to update chat management model',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteChatManagementModel(modelId) {
  return requestJson(`${API_BASE}/chat/management/models/${encodeURIComponent(modelId)}`, {
    method: 'DELETE',
    fallbackMessage: 'Failed to delete chat management model',
  });
}

export async function copyChatManagementModel(modelId) {
  return requestJson(`${API_BASE}/chat/management/models/${encodeURIComponent(modelId)}/copy`, {
    method: 'POST',
    fallbackMessage: 'Failed to copy chat management model',
  });
}

export async function fetchChatManagementAgents() {
  return requestJson(`${API_BASE}/chat/management/agents`, {
    fallbackMessage: 'Failed to fetch chat management agents',
  });
}

export async function createChatManagementAgent(data) {
  return requestJson(`${API_BASE}/chat/management/agents`, {
    method: 'POST',
    fallbackMessage: 'Failed to create chat management agent',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateChatManagementAgent(agentId, data) {
  return requestJson(`${API_BASE}/chat/management/agents/${encodeURIComponent(agentId)}`, {
    method: 'PUT',
    fallbackMessage: 'Failed to update chat management agent',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteChatManagementAgent(agentId) {
  return requestJson(`${API_BASE}/chat/management/agents/${encodeURIComponent(agentId)}`, {
    method: 'DELETE',
    fallbackMessage: 'Failed to delete chat management agent',
  });
}

export async function reportStatisticsEnter(data) {
  return requestJson(`${API_BASE}/statistics/enter`, {
    method: 'POST',
    auth: false,
    fallbackMessage: 'Failed to report statistics enter',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    keepalive: true,
  });
}

export async function reportStatisticsExit(data) {
  return requestJson(`${API_BASE}/statistics/exit`, {
    method: 'POST',
    auth: false,
    fallbackMessage: 'Failed to report statistics exit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    keepalive: true,
  });
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
  return requestJson(`${API_BASE}/statistics/overview?${params.toString()}`, {
    fallbackMessage: 'Failed to fetch statistics overview',
  });
}

export function getStatisticsExportUrl(range = 'today') {
  const params = new URLSearchParams({ range });
  return `${API_BASE}/statistics/export?${params.toString()}`;
}