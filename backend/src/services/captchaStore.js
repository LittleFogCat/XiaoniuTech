import crypto from 'crypto';

const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const captchaStore = new Map();

function cleanupExpiredCaptchas() {
  const now = Date.now();
  for (const [challengeId, challenge] of captchaStore.entries()) {
    if (challenge.expiresAt <= now) {
      captchaStore.delete(challengeId);
    }
  }
}

function createMathChallenge() {
  const operators = ['+', '-'];
  const operator = operators[crypto.randomInt(0, operators.length)];
  let left = crypto.randomInt(1, 10);
  let right = crypto.randomInt(1, 10);

  if (operator === '-' && right > left) {
    [left, right] = [right, left];
  }

  return {
    question: `${left} ${operator} ${right} = ?`,
    answer: operator === '+' ? String(left + right) : String(left - right),
  };
}

export function createCaptchaChallenge() {
  cleanupExpiredCaptchas();
  const challengeId = crypto.randomUUID();
  const challenge = createMathChallenge();

  captchaStore.set(challengeId, {
    answer: challenge.answer,
    expiresAt: Date.now() + CAPTCHA_TTL_MS,
  });

  return {
    challengeId,
    question: challenge.question,
    expiresInMs: CAPTCHA_TTL_MS,
  };
}

export function consumeCaptchaChallenge(challengeId, answer) {
  cleanupExpiredCaptchas();

  const challenge = captchaStore.get(challengeId);
  if (!challenge) {
    return false;
  }

  captchaStore.delete(challengeId);
  return String(answer || '').trim() === challenge.answer;
}