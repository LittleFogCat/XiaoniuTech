export const AUTH_TOKEN_KEY = 'auth_token';
export const AUTH_MODE_KEY = 'auth_mode';
export const AUTH_LOGGED_IN_KEY = 'isLoggedIn';
export const AUTH_CHANGE_EVENT = 'xn-auth-changed';

function hasLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readStorageItem(key) {
  if (!hasLocalStorage()) {
    return null;
  }

  return window.localStorage.getItem(key);
}

function writeStorageItem(key, value) {
  if (!hasLocalStorage()) {
    return;
  }

  window.localStorage.setItem(key, value);
}

function removeStorageItem(key) {
  if (!hasLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(key);
}

export function getAuthToken() {
  return readStorageItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token) {
  if (token) {
    writeStorageItem(AUTH_TOKEN_KEY, token);
    return;
  }

  removeStorageItem(AUTH_TOKEN_KEY);
}

export function getAuthMode() {
  return readStorageItem(AUTH_MODE_KEY);
}

export function setAuthMode(mode) {
  if (mode) {
    writeStorageItem(AUTH_MODE_KEY, mode);
    return;
  }

  removeStorageItem(AUTH_MODE_KEY);
}

export function isStoredLoggedIn() {
  return readStorageItem(AUTH_LOGGED_IN_KEY) === 'true';
}

export function setStoredLoggedIn(isLoggedIn) {
  if (isLoggedIn) {
    writeStorageItem(AUTH_LOGGED_IN_KEY, 'true');
    return;
  }

  removeStorageItem(AUTH_LOGGED_IN_KEY);
}

export function clearAuthSession() {
  removeStorageItem(AUTH_TOKEN_KEY);
  removeStorageItem(AUTH_MODE_KEY);
  removeStorageItem(AUTH_LOGGED_IN_KEY);
}

export function decodeStoredAuthPayload() {
  const token = getAuthToken();
  if (!token || typeof atob !== 'function') {
    return null;
  }

  try {
    const base64Url = token.split('.')[0] || '';
    const normalized = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function getUsernameFromToken() {
  return decodeStoredAuthPayload()?.username || null;
}

export function emitAuthChange() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}