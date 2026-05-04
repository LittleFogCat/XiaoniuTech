import { readBearerToken, verifyAuthToken } from '../services/auth.js';

export function requireAuth(req, res, next) {
  const token = readBearerToken(req);
  const payload = verifyAuthToken(token);

  if (!payload) {
    return res.status(401).json({ error: '未登录或登录已失效' });
  }

  req.user = {
    username: payload.username,
  };
  return next();
}
