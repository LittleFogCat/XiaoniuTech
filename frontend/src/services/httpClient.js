import { getAuthToken } from './authStorage';

export function getAuthHeaders(extraHeaders = {}) {
  const token = getAuthToken();

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

export function fetchWithAuth(url, { auth = true, headers = {}, ...init } = {}) {
  return fetch(url, {
    ...init,
    headers: auth ? getAuthHeaders(headers) : headers,
  });
}

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
  const payload = await readJsonSafely(res);

  if (!res.ok || payload?.success === false) {
    throw createRequestError(res, payload, fallbackMessage);
  }

  if (unwrapData && payload && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data;
  }

  return payload;
}