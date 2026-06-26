import crypto from 'crypto';
import { base64urlDecode, base64urlEncode, signPayload } from './auth.js';

const DEFAULT_ACCESS_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const DEFAULT_REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const REFRESH_TOKEN_BYTES = 40;

function getAccessTtlMs() {
  const raw = process.env.CHAT_AUTH_V2_ACCESS_TTL_MS;
  if (raw === undefined || raw === '') {
    return DEFAULT_ACCESS_TTL_MS;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_ACCESS_TTL_MS;
  }
  return parsed;
}

function getRefreshTtlMs() {
  const raw = process.env.CHAT_AUTH_V2_REFRESH_TTL_MS;
  if (raw === undefined || raw === '') {
    return DEFAULT_REFRESH_TTL_MS;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_REFRESH_TTL_MS;
  }
  return parsed;
}

export function getAccessTokenTtlSeconds() {
  return Math.floor(getAccessTtlMs() / 1000);
}

export function createAccessToken(userId) {
  if (!userId) {
    throw new Error('createAccessToken requires a userId');
  }
  const ttlMs = getAccessTtlMs();
  const payload = {
    sub: String(userId),
    exp: Date.now() + ttlMs,
  };
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAccessToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { ok: false, reason: 'malformed' };
  }
  const [encodedPayload, providedSignature] = token.split('.');
  if (!encodedPayload || !providedSignature) {
    return { ok: false, reason: 'malformed' };
  }
  const expectedSignature = signPayload(encodedPayload);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return { ok: false, reason: 'invalid_signature' };
  }
  let payload;
  try {
    payload = JSON.parse(base64urlDecode(encodedPayload));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (!payload?.sub || !payload?.exp) {
    return { ok: false, reason: 'malformed' };
  }
  if (payload.exp <= Date.now()) {
    return { ok: false, reason: 'expired', payload };
  }
  return { ok: true, payload };
}

export function generateRefreshTokenValue() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

export function getRefreshTokenExpiry() {
  return new Date(Date.now() + getRefreshTtlMs());
}
