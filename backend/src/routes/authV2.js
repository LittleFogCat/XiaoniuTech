import { Router } from 'express';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { verifyPassword } from '../services/auth.js';
import {
  createAccessToken,
  generateRefreshTokenValue,
  hashToken,
  getAccessTokenTtlSeconds,
  getRefreshTokenExpiry,
} from '../services/authV2.js';
import { requireAccessToken } from '../middleware/authV2.js';
import { getUserAccessById } from '../services/permissionStore.js';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_DEVICE_ID_LENGTH = 8;
const MAX_DEVICE_ID_LENGTH = 128;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return EMAIL_REGEX.test(email);
}

function isValidDeviceId(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length >= MIN_DEVICE_ID_LENGTH && trimmed.length <= MAX_DEVICE_ID_LENGTH;
}

async function findUserByEmail(email) {
  return User.findOne({ email: normalizeEmail(email) }).lean();
}

async function issueSession({ user, deviceId, deviceName }) {
  const accessToken = createAccessToken(user._id);
  const refreshTokenValue = generateRefreshTokenValue();
  const expiresAt = getRefreshTokenExpiry();

  // Single source of truth for the device identifiers we persist: trim once
  // here so callers don't have to (and don't risk diverging).
  const normalizedDeviceId = String(deviceId || '').trim();
  const normalizedDeviceName = typeof deviceName === 'string'
    ? deviceName.trim().slice(0, 100)
    : '';

  await RefreshToken.create({
    userId: user._id,
    token: hashToken(refreshTokenValue),
    deviceId: normalizedDeviceId,
    deviceName: normalizedDeviceName,
    expiresAt,
    lastUsedAt: new Date(),
  });

  return {
    accessToken,
    refreshToken: refreshTokenValue,
    expiresIn: getAccessTokenTtlSeconds(),
  };
}

function buildUserResponse(user) {
  return {
    username: user.nickname || user.email,
    email: user.email,
  };
}

router.post('/login-v2', async (req, res) => {
  const { email, password, deviceId, deviceName } = req.body || {};

  if (!isValidEmail(email)) {
    return res.status(400).json({ code: 'invalid_request', error: '请输入有效的邮箱地址' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ code: 'invalid_request', error: '密码不能为空' });
  }
  if (!isValidDeviceId(deviceId)) {
    return res.status(400).json({ code: 'invalid_request', error: `deviceId 长度需为 ${MIN_DEVICE_ID_LENGTH} 到 ${MAX_DEVICE_ID_LENGTH} 个字符` });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ code: 'invalid_credentials', error: '邮箱或密码错误' });
    }

    const session = await issueSession({ user, deviceId, deviceName });
    return res.json({
      success: true,
      ...session,
      user: buildUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ code: 'server_error', error: error.message || '登录失败' });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken, deviceId } = req.body || {};

  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ code: 'invalid_request', error: 'refreshToken 必填' });
  }
  if (!isValidDeviceId(deviceId)) {
    return res.status(400).json({ code: 'invalid_request', error: `deviceId 长度需为 ${MIN_DEVICE_ID_LENGTH} 到 ${MAX_DEVICE_ID_LENGTH} 个字符` });
  }

  try {
    const tokenHash = hashToken(refreshToken);
    const record = await RefreshToken.findOne({ token: tokenHash, deviceId: deviceId.trim() });
    if (!record) {
      return res.status(401).json({ code: 'invalid_token', error: 'refresh token 无效' });
    }
    if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
      await RefreshToken.deleteOne({ _id: record._id }).catch(() => {});
      return res.status(401).json({ code: 'invalid_token', error: 'refresh token 已过期' });
    }

    const access = await getUserAccessById(record.userId);
    if (!access) {
      await RefreshToken.deleteOne({ _id: record._id }).catch(() => {});
      return res.status(401).json({ code: 'invalid_token', error: '用户不存在或已失效' });
    }
    if (access.isBlacklisted) {
      // Revoke the refresh token immediately for a blacklisted user so the
      // session can't be reused even if the access token is still in flight.
      await RefreshToken.deleteOne({ _id: record._id }).catch(() => {});
      return res.status(403).json({
        code: 'user_blacklisted',
        error: access.blacklist?.reason || '当前账号已被加入黑名单',
      });
    }
    const user = { _id: access.userId, email: access.email, nickname: access.nickname || '' };

    // Create new session first, then delete the consumed token to avoid
    // leaving the user without a valid refresh token on failure.
    const session = await issueSession({ user, deviceId, deviceName: record.deviceName });
    await RefreshToken.deleteOne({ _id: record._id });

    return res.json({
      success: true,
      ...session,
      user: buildUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ code: 'server_error', error: error.message || '刷新失败' });
  }
});

router.post('/logout-v2', requireAccessToken, async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ code: 'invalid_request', error: 'refreshToken 必填' });
  }

  try {
    await RefreshToken.deleteOne({ token: hashToken(refreshToken), userId: req.userId });
    return res.json({ success: true, message: '已登出' });
  } catch (error) {
    return res.status(500).json({ code: 'server_error', error: error.message || '登出失败' });
  }
});

export default router;
