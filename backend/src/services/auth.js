import crypto from 'crypto';

const DEFAULT_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEYLEN = 64;
const PASSWORD_DIGEST = 'sha512';
const EMAIL_CODE_LENGTH = 6;
const API_KEY_PREFIX = 'xntk_';

function getAuthSecret() {
  const secret = process.env.CHAT_AUTH_SECRET;
  if (!secret) {
    throw new Error('CHAT_AUTH_SECRET environment variable is required');
  }
  return secret;
}

function base64urlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64urlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf-8');
}

function signPayload(encodedPayload) {
  return crypto
    .createHmac('sha256', getAuthSecret())
    .update(encodedPayload)
    .digest('base64url');
}

export function createAuthToken(username) {
  const expiresInMs = Number(process.env.CHAT_AUTH_TOKEN_TTL_MS || DEFAULT_TOKEN_TTL_MS);
  const payload = {
    username,
    exp: Date.now() + expiresInMs,
  };
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAuthToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return null;
  }

  const [encodedPayload, providedSignature] = token.split('.');
  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64urlDecode(encodedPayload));
    if (!payload?.username || !payload?.exp || payload.exp <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function readBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  return token;
}

function scryptAsync(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, PASSWORD_KEYLEN, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey.toString('hex'));
    });
  });
}

export async function hashPassword(password) {
  const t0 = Date.now();
  const salt = crypto.randomBytes(PASSWORD_SALT_BYTES).toString('hex');
  const hash = await scryptAsync(password, salt);
  console.log('[auth] hashPassword elapsed_ms=', Date.now() - t0);
  return `scrypt:${PASSWORD_DIGEST}:${salt}:${hash}`;
}

export async function verifyPassword(password, passwordHash) {
  if (!passwordHash || typeof passwordHash !== 'string') {
    return false;
  }

  const [algorithm, digest, salt, storedHash] = passwordHash.split(':');
  if (algorithm !== 'scrypt' || digest !== PASSWORD_DIGEST || !salt || !storedHash) {
    return false;
  }

  const computedHash = await scryptAsync(password, salt);
  const providedBuffer = Buffer.from(storedHash, 'hex');
  const computedBuffer = Buffer.from(computedHash, 'hex');

  if (providedBuffer.length !== computedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, computedBuffer);
}

export function generateEmailVerificationCode() {
  const max = 10 ** EMAIL_CODE_LENGTH;
  const value = crypto.randomInt(0, max);
  return String(value).padStart(EMAIL_CODE_LENGTH, '0');
}

export function generateApiKey() {
  return `${API_KEY_PREFIX}${crypto.randomBytes(24).toString('base64url')}`;
}

export function hashApiKey(apiKey) {
  return crypto
    .createHash('sha256')
    .update(String(apiKey || ''))
    .digest('hex');
}

export function verifyApiKey(apiKey, apiKeyHash) {
  if (!apiKey || !apiKeyHash || typeof apiKeyHash !== 'string') {
    return false;
  }

  const providedBuffer = Buffer.from(hashApiKey(apiKey), 'hex');
  const expectedBuffer = Buffer.from(apiKeyHash, 'hex');

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

export function readApiKey(req) {
  const headerApiKey = String(req.headers['x-api-key'] || '').trim();
  if (headerApiKey) {
    return headerApiKey;
  }

  const bearerToken = readBearerToken(req);
  if (bearerToken && bearerToken.startsWith(API_KEY_PREFIX)) {
    return bearerToken;
  }

  return null;
}

export function buildApiKeyPreview(apiKey) {
  const normalized = String(apiKey || '').trim();
  if (!normalized) {
    return '';
  }

  if (normalized.length <= 12) {
    return normalized;
  }

  return `${normalized.slice(0, 8)}...${normalized.slice(-4)}`;
}