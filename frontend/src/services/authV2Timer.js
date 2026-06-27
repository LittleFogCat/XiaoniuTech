// Background timer that proactively refreshes the v2 access token before it
// expires. The goal is to avoid surprising the user with a 401 mid-session.
//
// Uses setTimeout (recursive), not setInterval, so that background tabs are
// not penalized by browser throttling and the next access check still goes
// through the httpClient interceptor as a fallback.

import { getAccessToken, getRefreshToken } from './authStorage';
import { refreshAccessToken } from './api.js';

const SAFETY_WINDOW_MS = 5 * 60 * 1000; // refresh 5 minutes before expiry
const MIN_INTERVAL_MS = 30 * 1000; // never re-arm faster than every 30s
const MAX_INTERVAL_MS = 24 * 60 * 60 * 1000; // cap at 24h in case of clock skew

let timerHandle = null;
let nextFireAt = 0;

function clearTimer() {
  if (timerHandle !== null) {
    clearTimeout(timerHandle);
    timerHandle = null;
  }
  nextFireAt = 0;
}

function computeDelayMs(expiresIn) {
  if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
    return MAX_INTERVAL_MS;
  }
  const target = (expiresIn * 1000) - SAFETY_WINDOW_MS;
  return Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, target));
}

async function tick() {
  timerHandle = null;
  // Skip if the session was cleared while we were waiting.
  if (!getAccessToken() || !getRefreshToken()) {
    return;
  }
  try {
    const result = await refreshAccessToken();
    if (result?.expiresIn) {
      scheduleTokenRefresh(result.expiresIn);
    }
  } catch (error) {
    // Silent: the next API call will surface 401 → httpClient interceptor
    // → clearAuthSessionV2 → scheduleTokenRefresh cancelled via cancelTokenRefresh.
    cancelTokenRefresh();
  }
}

export function scheduleTokenRefresh(expiresIn) {
  clearTimer();
  const delay = computeDelayMs(expiresIn);
  nextFireAt = Date.now() + delay;
  timerHandle = setTimeout(tick, delay);
}

export function cancelTokenRefresh() {
  clearTimer();
}

export function getNextRefreshAt() {
  return nextFireAt;
}

// Listen for cross-tab logouts / refreshes via the storage event.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (!event.key) return;
    // Any change to the v2 token keys in another tab invalidates our schedule.
    if (
      event.key === 'auth_access_token' ||
      event.key === 'auth_refresh_token' ||
      event.key === 'isLoggedIn'
    ) {
      cancelTokenRefresh();
    }
  });
}