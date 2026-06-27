import { readApiKey, readBearerToken, verifyAuthToken } from '../services/auth.js';
import { verifyAccessToken } from '../services/authV2.js';
import { getUserAccessByApiKey, getUserAccessByEmail, getUserAccessById, hasPermission } from '../services/permissionStore.js';

async function resolveUserFromRequest(req) {
  if (req.user?.username) {
    return req.user;
  }

  const token = readBearerToken(req);
  if (!token) {
    return null;
  }

  // Try v1 token first (payload uses { username, exp }).
  const v1Payload = verifyAuthToken(token);
  if (v1Payload?.username) {
    const access = await getUserAccessByEmail(v1Payload.username);
    if (access) {
      req.user = access;
      return access;
    }
  }

  // Fallback to v2 token (payload uses { sub: userId, exp }).
  const v2Result = verifyAccessToken(token);
  if (v2Result.ok) {
    const access = await getUserAccessById(v2Result.payload.sub);
    if (access) {
      // Normalize so downstream code (which checks req.user.username) keeps working.
      req.user = access;
      return access;
    }
  }

  return null;
}

export { resolveUserFromRequest };

export async function requireAuth(req, res, next) {
  try {
    const user = await resolveUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: '未登录或登录已失效' });
    }
    if (user.isBlacklisted) {
      return res.status(403).json({ error: user.blacklist?.reason || '当前账号已被加入黑名单' });
    }
    return next();
  } catch (error) {
    return res.status(error?.statusCode || 500).json({ error: error.message || '鉴权失败' });
  }
}

export function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      const user = await resolveUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: '未登录或登录已失效' });
      }
      if (user.isBlacklisted) {
        return res.status(403).json({ error: user.blacklist?.reason || '当前账号已被加入黑名单' });
      }
      if (!hasPermission(user, permission)) {
        return res.status(403).json({ error: '没有权限执行该操作' });
      }
      return next();
    } catch (error) {
      return res.status(error?.statusCode || 500).json({ error: error.message || '权限校验失败' });
    }
  };
}

export async function resolveUserFromApiKey(req) {
  const apiKey = readApiKey(req);
  if (!apiKey) {
    return null;
  }

  const access = await getUserAccessByApiKey(apiKey);
  if (!access) {
    return null;
  }

  req.user = access;
  return access;
}
