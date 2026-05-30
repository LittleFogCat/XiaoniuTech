const API_BASE = '/api/stock';

function getAuthToken() {
  return localStorage.getItem('auth_token');
}

function getAuthHeaders(extraHeaders = {}) {
  const token = getAuthToken();
  return token
    ? { ...extraHeaders, Authorization: `Bearer ${token}` }
    : extraHeaders;
}

async function readJsonSafely(res) {
  return res.json().catch(() => ({}));
}

async function readEnvelopeData(res, fallbackMessage) {
  const payload = await readJsonSafely(res);

  if (!res.ok) {
    throw new Error(payload?.msg || payload?.error || `${fallbackMessage}: ${res.status}`);
  }

  if (payload?.success === false) {
    throw new Error(payload?.msg || fallbackMessage);
  }

  if (payload && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data;
  }

  return payload;
}

export async function fetchStockReviews({
  page = 1,
  limit = 12,
  search,
  dateFrom,
  dateTo,
  sector,
  impactLevel,
  stockCode,
} = {}) {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set('search', search);
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  if (sector) params.set('sector', sector);
  if (impactLevel) params.set('impactLevel', impactLevel);
  if (stockCode) params.set('stockCode', stockCode);

  const res = await fetch(`${API_BASE}/reviews?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  return readEnvelopeData(res, 'Failed to fetch stock reviews');
}

export async function fetchAllStockReviews(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value != null && value !== '') {
      params.set(key, value);
    }
  });

  const res = await fetch(`${API_BASE}/reviews/all?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  return readEnvelopeData(res, 'Failed to fetch all stock reviews');
}

export async function fetchStockReview(reviewId) {
  const res = await fetch(`${API_BASE}/reviews/${reviewId}`, {
    headers: getAuthHeaders(),
  });
  return readEnvelopeData(res, 'Failed to fetch stock review');
}

export async function createStockReview(data) {
  const res = await fetch(`${API_BASE}/reviews`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return readEnvelopeData(res, 'Failed to create stock review');
}

export async function updateStockReview(reviewId, data) {
  const res = await fetch(`${API_BASE}/reviews/${reviewId}`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return readEnvelopeData(res, 'Failed to update stock review');
}

export async function deleteStockReview(reviewId) {
  const res = await fetch(`${API_BASE}/reviews/${reviewId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return readEnvelopeData(res, 'Failed to delete stock review');
}