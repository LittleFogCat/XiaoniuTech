// Auth storage layer.
//
// Two coexisting token schemes:
//   - Legacy v1: single long-lived token stored under AUTH_TOKEN_KEY (read-only here).
//   - v2 (current): accessToken + refreshToken pair, both required for protected APIs.
//
// New code must use the v2 helpers below. The legacy v1 helpers are kept exported
// only so existing call sites continue to work during the migration.

export const AUTH_TOKEN_KEY = 'auth_token';
export const AUTH_MODE_KEY = 'auth_mode';
export const AUTH_LOGGED_IN_KEY = 'isLoggedIn';
export const AUTH_CHANGE_EVENT = 'xn-auth-changed';

// v2 storage keys
const AUTH_ACCESS_TOKEN_KEY = 'auth_access_token';
const AUTH_REFRESH_TOKEN_KEY = 'auth_refresh_token';
const AUTH_DEVICE_ID_KEY = 'auth_device_id';
const AUTH_CACHED_USERNAME_KEY = 'auth_cached_username';

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

// --- Legacy v1 token helpers (read-only transition support) ----------------

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

export function getUsernameFromV1Token() {
  return decodeStoredAuthPayload()?.username || null;
}

// --- v2 token helpers --------------------------------------------------------

export function getAccessToken() {
  return readStorageItem(AUTH_ACCESS_TOKEN_KEY);
}

export function setAccessToken(token) {
  if (token) {
    writeStorageItem(AUTH_ACCESS_TOKEN_KEY, token);
    return;
  }
  removeStorageItem(AUTH_ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return readStorageItem(AUTH_REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token) {
  if (token) {
    writeStorageItem(AUTH_REFRESH_TOKEN_KEY, token);
    return;
  }
  removeStorageItem(AUTH_REFRESH_TOKEN_KEY);
}

// Persistent client-generated device identifier. Lazily created once and
// reused across logins so the same refresh-token row is bound to the same
// deviceId. The v2 backend requires deviceId length >= 8, so we use a UUIDv4
// (36 chars) which is always safe.
export function getDeviceId() {
  const existing = readStorageItem(AUTH_DEVICE_ID_KEY);
  if (existing && existing.length >= 8 && existing.length <= 128) {
    return existing;
  }
  let next;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    next = crypto.randomUUID();
  } else {
    // Fallback for very old environments (should not occur in this app).
    next = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
  }
  writeStorageItem(AUTH_DEVICE_ID_KEY, next);
  return next;
}

export function getCachedUsername() {
  return readStorageItem(AUTH_CACHED_USERNAME_KEY);
}

export function setCachedUsername(value) {
  if (value) {
    writeStorageItem(AUTH_CACHED_USERNAME_KEY, value);
    return;
  }
  removeStorageItem(AUTH_CACHED_USERNAME_KEY);
}

// --- Session bookkeeping -----------------------------------------------------

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

export function hasV2Session() {
  return !!getAccessToken() && !!getRefreshToken();
}

// Clear the v2 session: tokens, cached username, logged-in flag. deviceId is
// intentionally preserved so the next login on this device binds to the same
// refresh token row.
export function clearAuthSessionV2() {
  removeStorageItem(AUTH_ACCESS_TOKEN_KEY);
  removeStorageItem(AUTH_REFRESH_TOKEN_KEY);
  removeStorageItem(AUTH_CACHED_USERNAME_KEY);
  removeStorageItem(AUTH_LOGGED_IN_KEY);
  removeStorageItem(AUTH_MODE_KEY);
}

// Legacy alias used by existing call sites; clears both v1 and v2 state.
export function clearAuthSession() {
  removeStorageItem(AUTH_TOKEN_KEY);
  removeStorageItem(AUTH_MODE_KEY);
  removeStorageItem(AUTH_LOGGED_IN_KEY);
  removeStorageItem(AUTH_ACCESS_TOKEN_KEY);
  removeStorageItem(AUTH_REFRESH_TOKEN_KEY);
  removeStorageItem(AUTH_CACHED_USERNAME_KEY);
}

export function getUsernameFromToken() {
  // v2 token has no username field; prefer the cached profile username.
  return getCachedUsername() || getUsernameFromV1Token() || null;
}

export function emitAuthChange() {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

// --- Legacy v1 migration -----------------------------------------------------

// Called once at app boot. If the user has a v1 token but no v2 session, try
// to validate the v1 token by calling /api/user/profile. On success, cache
// the username and drop the v1 token so subsequent code uses v2. On failure,
// just clear the v1 token (the user will be prompted to log in again).
export async function migrateLegacyV1Token({ fetchProfile }) {
  const legacyToken = getAuthToken();
  if (!legacyToken || hasV2Session()) {
    return { migrated: false };
  }
  try {
    const user = await fetchProfile({ bearerToken: legacyToken });
    const username = user?.email || user?.nickname || user?.username || '';
    if (username) {
      setCachedUsername(username);
    }
    return { migrated: true, username };
  } catch (error) {
    return { migrated: false, reason: error?.message || 'invalid' };
  } finally {
    // Always drop the v1 token after the migration attempt, success or fail.
    removeStorageItem(AUTH_TOKEN_KEY);
  }
}
