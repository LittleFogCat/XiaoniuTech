import { clearAuthSessionV2, getAccessToken, getAuthToken, emitAuthChange } from './authStorage';
import { scheduleTokenRefresh } from './authV2Timer.js';

// In-flight refresh: shared across concurrent 401 responses so we only hit
// /api/refresh once per expiry window.
let pendingRefresh = null;

export function getAuthHeaders(extraHeaders = {}) {
  // Prefer v2 accessToken; fall back to v1 token for legacy call sites.
  const token = getAccessToken() || getAuthToken();

  if (!token) {
    return extraHeaders;
  }

  return {
    ...extraHeaders,
    Authorization: `Bearer ${token}`,
  };
}

export async function readJsonSafely(res) {
  return res.json().catch(() => ({}));
}

function getRequestErrorMessage(payload, fallbackMessage, res) {
  return payload?.msg || payload?.error || `${fallbackMessage}: ${res.status}`;
}

export function createRequestError(res, payload, fallbackMessage) {
  const error = new Error(getRequestErrorMessage(payload, fallbackMessage, res));
  error.status = res.status;
  error.statusCode = res.status;
  error.responsePayload = payload;

  if (payload && typeof payload === 'object') {
    Object.assign(error, payload);
  }

  return error;
}

export async function throwRequestError(res, fallbackMessage) {
  const payload = await readJsonSafely(res);
  throw createRequestError(res, payload, fallbackMessage);
}

// Lazy import to avoid the api.js ↔ httpClient.js cycle.
let refreshApi = null;
async function getRefreshApi() {
  if (!refreshApi) {
    refreshApi = await import('./api.js');
  }
  return refreshApi;
}

// Resolve with a fresh accessToken. Rejects if the refresh token is missing
// or the server refuses to rotate. On failure, also clears the local session
// and broadcasts AUTH_CHANGE_EVENT so the UI can redirect to login.
async function getFreshAccessToken() {
  if (pendingRefresh) {
    return pendingRefresh;
  }
  pendingRefresh = (async () => {
    try {
      const api = await getRefreshApi();
      const result = await api.refreshAccessToken();
      if (result?.accessToken) {
        return result;
      }
      throw new Error('Refresh response missing accessToken');
    } catch (error) {
      clearAuthSessionV2();
      emitAuthChange();
      throw error;
    } finally {
      pendingRefresh = null;
    }
  })();
  return pendingRefresh;
}

async function shouldAttemptRefresh(res, payload) {
  if (res.status !== 401) return false;
  // Only the v2 access-token expiry code triggers refresh; other 401s
  // (invalid v1 token, blacklisted, etc.) propagate immediately.
  if (payload?.code === 'token_expired') return true;
  // If the request was sent with a v2 accessToken and got 401, also try refresh.
  if (getAccessToken()) return true;
  return false;
}

export function fetchWithAuth(url, { auth = true, headers = {}, ...init } = {}) {
  return fetch(url, {
    ...init,
    headers: auth ? getAuthHeaders(headers) : headers,
  });
}

// Like requestJson but retries once on 401 token_expired after a silent refresh.
export async function requestJson(
  url,
  {
    auth = true,
    fallbackMessage = 'Request failed',
    unwrapData = false,
    headers = {},
    ...init
  } = {},
) {
  const res = await fetchWithAuth(url, { auth, headers, ...init });
  let payload = await readJsonSafely(res);

  if (!res.ok || payload?.success === false) {
    if (auth && (await shouldAttemptRefresh(res, payload))) {
      try {
        const refreshResult = await getFreshAccessToken();
        if (refreshResult?.expiresIn) {
          scheduleTokenRefresh(refreshResult.expiresIn);
        }
      } catch (refreshError) {
        // Refresh failed → surface original 401 to caller.
        throw createRequestError(res, payload, fallbackMessage);
      }
      const retryRes = await fetchWithAuth(url, { auth, headers, ...init });
      const retryPayload = await readJsonSafely(retryRes);
      if (!retryRes.ok || retryPayload?.success === false) {
        throw createRequestError(retryRes, retryPayload, fallbackMessage);
      }
      if (unwrapData && retryPayload && Object.prototype.hasOwnProperty.call(retryPayload, 'data')) {
        return retryPayload.data;
      }
      return retryPayload;
    }

    throw createRequestError(res, payload, fallbackMessage);
  }

  if (unwrapData && payload && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data;
  }

  return payload;
}

// Test/dev helper: allow the timer module to bypass retry semantics.
export function _resetRefreshState() {
  pendingRefresh = null;
}
