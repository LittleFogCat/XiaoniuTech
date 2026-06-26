import { readBearerToken } from '../services/auth.js';
import { verifyAccessToken } from '../services/authV2.js';
import { getUserAccessById } from '../services/permissionStore.js';

export async function requireAccessToken(req, res, next) {
  const token = readBearerToken(req);
  if (!token) {
    return res.status(401).json({ code: 'token_missing', error: '未提供 access token' });
  }
  const result = verifyAccessToken(token);
  if (!result.ok) {
    if (result.reason === 'expired') {
      return res.status(401).json({ code: 'token_expired', error: 'access token 已过期' });
    }
    return res.status(401).json({ code: 'invalid_token', error: 'access token 无效' });
  }
  const access = await getUserAccessById(result.payload.sub);
  if (!access) {
    return res.status(401).json({ code: 'invalid_token', error: '用户不存在或已失效' });
  }
  if (access.isBlacklisted) {
    return res.status(403).json({ error: access.blacklist?.reason || '当前账号已被加入黑名单' });
  }
  req.userId = access.userId;
  req.userEmail = access.email;
  req.user = access;
  return next();
}
