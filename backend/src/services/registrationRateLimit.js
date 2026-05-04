const RESEND_COOLDOWN_MS = 60 * 1000;
const HOURLY_WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_IP_PER_HOUR = 5;

const ipSendHistory = new Map();
const resendCooldowns = new Map();

function pruneIpHistory(ip, now = Date.now()) {
  const history = ipSendHistory.get(ip) || [];
  const nextHistory = history.filter(timestamp => now - timestamp < HOURLY_WINDOW_MS);
  if (nextHistory.length > 0) {
    ipSendHistory.set(ip, nextHistory);
  } else {
    ipSendHistory.delete(ip);
  }
  return nextHistory;
}

function getCooldownKey(ip, email) {
  return `${ip}:${email}`;
}

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export function checkRegistrationSendAllowance({ ip, email }) {
  const now = Date.now();
  const history = pruneIpHistory(ip, now);

  if (history.length >= MAX_SENDS_PER_IP_PER_HOUR) {
    const retryAfterMs = Math.max(0, HOURLY_WINDOW_MS - (now - history[0]));
    return {
      allowed: false,
      limitType: 'ip_hourly',
      retryAfterMs,
      remainingThisHour: 0,
    };
  }

  const cooldownKey = getCooldownKey(ip, email);
  const nextAllowedAt = resendCooldowns.get(cooldownKey) || 0;
  if (nextAllowedAt > now) {
    return {
      allowed: false,
      limitType: 'resend_cooldown',
      retryAfterMs: nextAllowedAt - now,
      remainingThisHour: MAX_SENDS_PER_IP_PER_HOUR - history.length,
    };
  }

  if (nextAllowedAt > 0) {
    resendCooldowns.delete(cooldownKey);
  }

  return {
    allowed: true,
    limitType: null,
    retryAfterMs: 0,
    remainingThisHour: MAX_SENDS_PER_IP_PER_HOUR - history.length,
  };
}

export function recordRegistrationSend({ ip, email }) {
  const now = Date.now();
  const history = pruneIpHistory(ip, now);
  history.push(now);
  ipSendHistory.set(ip, history);
  resendCooldowns.set(getCooldownKey(ip, email), now + RESEND_COOLDOWN_MS);

  return {
    cooldownMs: RESEND_COOLDOWN_MS,
    remainingThisHour: Math.max(0, MAX_SENDS_PER_IP_PER_HOUR - history.length),
  };
}