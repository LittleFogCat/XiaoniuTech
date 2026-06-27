import {
  AUTH_CHANGE_EVENT,
  clearAuthSession,
  emitAuthChange,
  getAuthToken,
  getUsernameFromToken as getStoredUsernameFromToken,
  hasV2Session,
  isStoredLoggedIn,
} from './authStorage';
import { requestJson } from './httpClient';
import { logoutV2 } from './api.js';

const API_BASE = '/api/blog';

function isLoggedIn() {
  // v2 users: both v2 tokens present + loggedIn flag set by login().
  if (hasV2Session() && isStoredLoggedIn()) {
    return true;
  }
  // Legacy v1 fallback: still allows pages that only check isLoggedIn() to
  // recognize a v1 token while migration is in progress.
  return isStoredLoggedIn() && !!getAuthToken();
}

export { isLoggedIn };
export { AUTH_CHANGE_EVENT, emitAuthChange };

export function getUsernameFromToken() {
  return getStoredUsernameFromToken();
}

export async function logout() {
  // Best-effort: revoke the v2 refresh token on the server, then clear local
  // state. If the v2 call fails (e.g. network down), still wipe local so the
  // user is logged out client-side.
  try {
    await logoutV2();
  } catch (error) {
    // ignore — fall through to local clear
  }
  clearAuthSession();
  emitAuthChange();
}

export async function fetchUserProfile(options = {}) {
  // Optional bearerToken override (used by legacy v1 migration).
  const headers = {};
  if (options?.bearerToken) {
    headers.Authorization = `Bearer ${options.bearerToken}`;
  }
  const data = await requestJson('/api/user/profile', {
    fallbackMessage: 'Failed to fetch profile',
    headers,
  });
  return data.user;
}

export async function updateUserProfile(data) {
  const result = await requestJson('/api/user/profile', {
    method: 'PUT',
    fallbackMessage: 'Failed to update profile',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return result.user;
}

export async function fetchUserApiKeyState() {
  const result = await requestJson('/api/user/api-key', {
    fallbackMessage: 'Failed to fetch API key state',
  });
  return result.apiKey;
}

export async function createUserApiKey() {
  const result = await requestJson('/api/user/api-key', {
    method: 'POST',
    fallbackMessage: 'Failed to create API key',
  });
  return result.apiKey;
}

export async function deleteUserApiKey() {
  const result = await requestJson('/api/user/api-key', {
    method: 'DELETE',
    fallbackMessage: 'Failed to delete API key',
  });
  return result.apiKey;
}

export async function fetchPosts({ page = 1, limit = 20, search, tag } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set('search', search);
  if (tag) params.set('tag', tag);

  return requestJson(`${API_BASE}/posts?${params.toString()}`, {
    fallbackMessage: 'Failed to fetch posts',
  });
}

export async function fetchPost(slug) {
  const data = await requestJson(`${API_BASE}/posts/${slug}`, {
    fallbackMessage: 'Failed to fetch post',
  });
  return data.post;
}

export async function incrementViewCount(slug) {
  requestJson(`${API_BASE}/posts/${slug}/view`, {
    method: 'POST',
    auth: false,
    fallbackMessage: 'Failed to increment view count',
  }).catch(() => {});
}

export async function fetchPostUnpublished(slug) {
  const data = await requestJson(`${API_BASE}/posts/${slug}/unpublished`, {
    fallbackMessage: 'Failed to fetch post',
  });
  return data.post;
}

export async function createPost(data) {
  const result = await requestJson(`${API_BASE}/posts`, {
    method: 'POST',
    fallbackMessage: 'Failed to create post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return result.post;
}

export async function importMarkdownArticles(fileList) {
  const files = Array.from(fileList || []).filter((file) => /\.md$/i.test(file.name));
  if (files.length === 0) {
    throw new Error('请选择至少一个 .md 文件');
  }

  const articles = await Promise.all(files.map(async (file) => ({
    name: file.name,
    relativePath: file.webkitRelativePath || file.name,
    content: await file.text(),
  })));

  return requestJson(`${API_BASE}/import`, {
    method: 'POST',
    fallbackMessage: 'Failed to import markdown articles',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ articles }),
  });
}

export async function updatePost(slug, data) {
  const result = await requestJson(`${API_BASE}/posts/${slug}`, {
    method: 'PUT',
    fallbackMessage: 'Failed to update post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return result.post;
}

export async function autosavePost(slug, data) {
  const result = await requestJson(`${API_BASE}/posts/${slug}/autosave`, {
    method: 'PUT',
    fallbackMessage: 'Failed to autosave post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return result.autosave;
}

export async function fetchManagePosts() {
  return requestJson(`${API_BASE}/posts/manage`, {
    fallbackMessage: 'Failed to fetch manage posts',
  });
}

export async function trashPost(slug) {
  await requestJson(`${API_BASE}/posts/${slug}/trash`, {
    method: 'PUT',
    fallbackMessage: 'Failed to trash post',
  });
  return true;
}

export async function restorePost(slug) {
  await requestJson(`${API_BASE}/posts/${slug}/restore`, {
    method: 'PUT',
    fallbackMessage: 'Failed to restore post',
  });
  return true;
}

export async function deletePostPermanently(slug) {
  await requestJson(`${API_BASE}/posts/${slug}`, {
    method: 'DELETE',
    fallbackMessage: 'Failed to delete post',
  });
  return true;
}

export async function fetchTags() {
  const data = await requestJson(`${API_BASE}/tags`, {
    auth: false,
    fallbackMessage: 'Failed to fetch tags',
  });
  return data.tags || [];
}

export async function fetchStats() {
  return requestJson(`${API_BASE}/stats`, {
    auth: false,
    fallbackMessage: 'Failed to fetch stats',
  });
}

export async function fetchComments(slug, { page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  return requestJson(`${API_BASE}/posts/${slug}/comments?${params.toString()}`, {
    auth: false,
    fallbackMessage: 'Failed to fetch comments',
  });
}

export async function addComment(slug, content) {
  const data = await requestJson(`${API_BASE}/posts/${slug}/comments`, {
    method: 'POST',
    fallbackMessage: 'Failed to add comment',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return data.comment;
}

export async function likePost(slug) {
  const data = await requestJson(`${API_BASE}/posts/${slug}/like`, {
    method: 'POST',
    auth: false,
    fallbackMessage: 'Failed to like post',
  });
  return data.likes;
}

export async function unlikePost(slug) {
  const data = await requestJson(`${API_BASE}/posts/${slug}/like`, {
    method: 'DELETE',
    auth: false,
    fallbackMessage: 'Failed to unlike post',
  });
  return data.likes;
}

const LIKED_POSTS_KEY = 'blog_liked_posts';

export function isPostLiked(slug) {
  try {
    const liked = JSON.parse(localStorage.getItem(LIKED_POSTS_KEY) || '[]');
    return liked.includes(slug);
  } catch {
    return false;
  }
}

export function markPostLiked(slug) {
  try {
    const liked = JSON.parse(localStorage.getItem(LIKED_POSTS_KEY) || '[]');
    if (!liked.includes(slug)) {
      liked.push(slug);
      localStorage.setItem(LIKED_POSTS_KEY, JSON.stringify(liked));
    }
  } catch {}
}

export function markPostUnliked(slug) {
  try {
    const liked = JSON.parse(localStorage.getItem(LIKED_POSTS_KEY) || '[]');
    const idx = liked.indexOf(slug);
    if (idx >= 0) {
      liked.splice(idx, 1);
      localStorage.setItem(LIKED_POSTS_KEY, JSON.stringify(liked));
    }
  } catch {}
}
