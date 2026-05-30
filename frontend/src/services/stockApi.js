import { requestJson } from './httpClient';

const API_BASE = '/api/stock';

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

  return requestJson(`${API_BASE}/reviews?${params.toString()}`, {
    fallbackMessage: 'Failed to fetch stock reviews',
    unwrapData: true,
  });
}

export async function fetchAllStockReviews(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value != null && value !== '') {
      params.set(key, value);
    }
  });

  return requestJson(`${API_BASE}/reviews/all?${params.toString()}`, {
    fallbackMessage: 'Failed to fetch all stock reviews',
    unwrapData: true,
  });
}

export async function fetchStockReview(reviewId) {
  return requestJson(`${API_BASE}/reviews/${reviewId}`, {
    fallbackMessage: 'Failed to fetch stock review',
    unwrapData: true,
  });
}

export async function createStockReview(data) {
  return requestJson(`${API_BASE}/reviews`, {
    method: 'POST',
    fallbackMessage: 'Failed to create stock review',
    unwrapData: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateStockReview(reviewId, data) {
  return requestJson(`${API_BASE}/reviews/${reviewId}`, {
    method: 'PUT',
    fallbackMessage: 'Failed to update stock review',
    unwrapData: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteStockReview(reviewId) {
  return requestJson(`${API_BASE}/reviews/${reviewId}`, {
    method: 'DELETE',
    fallbackMessage: 'Failed to delete stock review',
    unwrapData: true,
  });
}