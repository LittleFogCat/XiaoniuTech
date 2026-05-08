const API_BASE = '/api/blog';

function getAuthToken() {
  return localStorage.getItem('auth_token');
}

function getAuthHeaders(extraHeaders = {}) {
  const token = getAuthToken();
  return token
    ? { ...extraHeaders, Authorization: `Bearer ${token}` }
    : extraHeaders;
}

function isLoggedIn() {
  return localStorage.getItem('isLoggedIn') === 'true' && !!getAuthToken();
}

export { isLoggedIn };

export function getUsernameFromToken() {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const base64Url = token.split('.')[0];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const payload = JSON.parse(json);
    return payload.username || null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('auth_mode');
}

export async function fetchUserProfile() {
  const res = await fetch('/api/user/profile', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) await throwRequestError(res, 'Failed to fetch profile');
  const data = await res.json();
  return data.user;
}

export async function updateUserProfile(data) {
  const res = await fetch('/api/user/profile', {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwRequestError(res, 'Failed to update profile');
  const result = await res.json();
  return result.user;
}

async function readJsonSafely(res) {
  return res.json().catch(() => ({}));
}

async function throwRequestError(res, fallbackMessage) {
  const data = await readJsonSafely(res);
  throw new Error(data.error || `${fallbackMessage}: ${res.status}`);
}

export async function fetchPosts({ page = 1, limit = 20, search, tag } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set('search', search);
  if (tag) params.set('tag', tag);

  const res = await fetch(`${API_BASE}/posts?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) await throwRequestError(res, 'Failed to fetch posts');
  return res.json();
}

export async function fetchPost(slug) {
  const res = await fetch(`${API_BASE}/posts/${slug}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) await throwRequestError(res, 'Failed to fetch post');
  const data = await res.json();
  return data.post;
}

export async function incrementViewCount(slug) {
  fetch(`${API_BASE}/posts/${slug}/view`, { method: 'POST' }).catch(() => {});
}

export async function fetchPostUnpublished(slug) {
  const res = await fetch(`${API_BASE}/posts/${slug}/unpublished`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) await throwRequestError(res, 'Failed to fetch post');
  const data = await res.json();
  return data.post;
}

export async function createPost(data) {
  const res = await fetch(`${API_BASE}/posts`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwRequestError(res, 'Failed to create post');
  const result = await res.json();
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

  const res = await fetch(`${API_BASE}/import`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ articles }),
  });

  if (!res.ok) {
    await throwRequestError(res, 'Failed to import markdown articles');
  }

  return res.json();
}

export async function updatePost(slug, data) {
  const res = await fetch(`${API_BASE}/posts/${slug}`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwRequestError(res, 'Failed to update post');
  const result = await res.json();
  return result.post;
}

export async function autosavePost(slug, data) {
  const res = await fetch(`${API_BASE}/posts/${slug}/autosave`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwRequestError(res, 'Failed to autosave post');
  const result = await res.json();
  return result.autosave;
}

export async function fetchManagePosts() {
  const res = await fetch(`${API_BASE}/posts/manage`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) await throwRequestError(res, 'Failed to fetch manage posts');
  return res.json();
}

export async function trashPost(slug) {
  const res = await fetch(`${API_BASE}/posts/${slug}/trash`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  if (!res.ok) await throwRequestError(res, 'Failed to trash post');
  return true;
}

export async function restorePost(slug) {
  const res = await fetch(`${API_BASE}/posts/${slug}/restore`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  if (!res.ok) await throwRequestError(res, 'Failed to restore post');
  return true;
}

export async function deletePostPermanently(slug) {
  const res = await fetch(`${API_BASE}/posts/${slug}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) await throwRequestError(res, 'Failed to delete post');
  return true;
}

export async function fetchTags() {
  const res = await fetch(`${API_BASE}/tags`);
  if (!res.ok) await throwRequestError(res, 'Failed to fetch tags');
  const data = await res.json();
  return data.tags || [];
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) await throwRequestError(res, 'Failed to fetch stats');
  return res.json();
}

export async function fetchComments(slug, { page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  const res = await fetch(`${API_BASE}/posts/${slug}/comments?${params}`);
  if (!res.ok) await throwRequestError(res, 'Failed to fetch comments');
  return res.json();
}

export async function addComment(slug, content) {
  const res = await fetch(`${API_BASE}/posts/${slug}/comments`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) await throwRequestError(res, 'Failed to add comment');
  const data = await res.json();
  return data.comment;
}

export async function likePost(slug) {
  const res = await fetch(`${API_BASE}/posts/${slug}/like`, { method: 'POST' });
  if (!res.ok) await throwRequestError(res, 'Failed to like post');
  const data = await res.json();
  return data.likes;
}

export async function unlikePost(slug) {
  const res = await fetch(`${API_BASE}/posts/${slug}/like`, { method: 'DELETE' });
  if (!res.ok) await throwRequestError(res, 'Failed to unlike post');
  const data = await res.json();
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
