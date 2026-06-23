import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  buildApiKeyPreview,
  createAuthToken,
  generateEmailVerificationCode,
  generateApiKey,
  hashApiKey,
  hashPassword,
  verifyPassword,
} from '../services/auth.js';
import { createCaptchaChallenge, consumeCaptchaChallenge } from '../services/captchaStore.js';
import {
  checkRegistrationSendAllowance,
  getClientIp,
  recordRegistrationSend,
} from '../services/registrationRateLimit.js';
import { sendRegistrationCodeEmail } from '../services/mail.js';
import { syncFileReferencesForBiz } from '../services/fileReferenceStore.js';
import PendingRegistration from '../models/PendingRegistration.js';
import User from '../models/User.js';
import UserGroup from '../models/UserGroup.js';
import File from '../models/File.js';

const router = Router();
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH && password.length <= 128;
}

function buildUserResponse(identity) {
  const email = identity.includes('@') ? identity : null;
  return {
    username: identity,
    email,
  };
}

function isDuplicateKeyError(error) {
  return Boolean(error && typeof error === 'object' && error.code === 11000);
}

router.get('/register/captcha', (req, res) => {
  res.json(createCaptchaChallenge());
});

router.post('/register/request', async (req, res) => {
  const t0 = Date.now();
  try {
    console.log('[register/request] step=start email=', req.body?.email);

    const ip = getClientIp(req);
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const captchaId = String(req.body?.captchaId || '');
    const captchaAnswer = String(req.body?.captchaAnswer || '');

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: '请输入有效的邮箱地址' });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ error: `密码长度需为 ${MIN_PASSWORD_LENGTH} 到 128 个字符` });
    }

    const allowance = checkRegistrationSendAllowance({ ip, email });
    if (!allowance.allowed) {
      return res.status(429).json({
        error: allowance.limitType === 'ip_hourly'
          ? '当前 IP 在 1 小时内最多只能发送 5 次验证码，请稍后再试'
          : '验证码发送过于频繁，请 1 分钟后再试',
        limitType: allowance.limitType,
        retryAfterSeconds: Math.max(1, Math.ceil(allowance.retryAfterMs / 1000)),
        remainingThisHour: allowance.remainingThisHour,
      });
    }

    if (!captchaId || !captchaAnswer || !consumeCaptchaChallenge(captchaId, captchaAnswer)) {
      return res.status(400).json({ error: '人机验证失败，请刷新后重试' });
    }

    console.log('[register/request] step=validation_passed elapsed_ms=', Date.now() - t0);

    const existingUser = await User.findOne({ email }).select('_id').lean();
    if (existingUser) {
      return res.status(409).json({ error: '该邮箱已注册' });
    }

    console.log('[register/request] step=user_check_done elapsed_ms=', Date.now() - t0);

    const [passwordHash, verificationCode] = await Promise.all([
      hashPassword(password),
      Promise.resolve(generateEmailVerificationCode()),
    ]);
    console.log('[register/request] step=password_hashed elapsed_ms=', Date.now() - t0);

    const verificationCodeHash = await hashPassword(verificationCode);
    console.log('[register/request] step=code_hashed elapsed_ms=', Date.now() - t0);

    const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MS);

    await PendingRegistration.findOneAndUpdate(
      { email },
      {
        email,
        passwordHash,
        verificationCodeHash,
        expiresAt,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    const rateLimitState = recordRegistrationSend({ ip, email });

    console.log('[register/request] step=pending_saved elapsed_ms=', Date.now() - t0);

    res.json({
      success: true,
      email,
      expiresInMs: EMAIL_CODE_TTL_MS,
      retryAfterSeconds: Math.ceil(rateLimitState.cooldownMs / 1000),
      remainingThisHour: rateLimitState.remainingThisHour,
    });

    console.log('[register/request] step=sending_email background smtp_host=', process.env.ALIYUN_SMTP_HOST || process.env.SMTP_HOST || 'unset');
    sendRegistrationCodeEmail(email, verificationCode)
      .then(() => console.log('[register/request] step=email_sent background elapsed_ms=', Date.now() - t0))
      .catch((err) => console.error('[register/request] background email failed:', err.message));
    return;
  } catch (error) {
    console.error('[register/request] step=error elapsed_ms=', Date.now() - t0, 'message=', error.message);
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ error: '该邮箱已注册' });
    }
    return res.status(500).json({ error: error.message || '发送验证码失败' });
  }
});

router.post('/register/verify', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || '').trim();

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: '请输入有效的邮箱地址' });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: '请输入 6 位邮箱验证码' });
    }

    const pendingRegistration = await PendingRegistration.findOne({ email }).lean();
    if (!pendingRegistration) {
      return res.status(400).json({ error: '验证码不存在或已失效，请重新注册' });
    }

    if (!pendingRegistration.expiresAt || new Date(pendingRegistration.expiresAt).getTime() <= Date.now()) {
      await PendingRegistration.deleteOne({ email });
      return res.status(400).json({ error: '验证码已过期，请重新注册' });
    }

    const isCodeValid = await verifyPassword(code, pendingRegistration.verificationCodeHash);
    if (!isCodeValid) {
      return res.status(400).json({ error: '验证码错误' });
    }

    const existingUser = await User.findOne({ email }).select('_id').lean();
    if (existingUser) {
      await PendingRegistration.deleteOne({ email });
      return res.status(409).json({ error: '该邮箱已注册' });
    }

    const defaultGroup = await UserGroup.findOne({ key: 'user' }).select('_id').lean();
    const user = await User.create({
      email,
      nickname: email,
      passwordHash: pendingRegistration.passwordHash,
      emailVerifiedAt: new Date(),
      groups: defaultGroup ? [defaultGroup._id] : [],
    });

    await PendingRegistration.deleteOne({ email });

    return res.json({
      success: true,
      token: createAuthToken(user.email),
      user: buildUserResponse(user.email),
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ error: '该邮箱已注册' });
    }
    return res.status(500).json({ error: error.message || '注册失败' });
  }
});

router.post('/login', (req, res) => {
  const { username = '', email = '', password = '' } = req.body || {};
  const identity = String(email || username || '').trim();

  if (!identity || !password) {
    return res.status(400).json({ error: '邮箱和密码不能为空' });
  }

  return User.findOne({ email: normalizeEmail(identity) })
    .lean()
    .then(async (user) => {
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return res.status(401).json({ error: '邮箱或密码错误' });
      }

      return res.json({
        success: true,
        token: createAuthToken(user.email),
        user: buildUserResponse(user.email),
      });
    })
    .catch(error => res.status(500).json({ error: error.message || '登录失败' }));
});

function buildAvatarUrl(avatarFileId) {
  return avatarFileId ? `/api/files/${avatarFileId}` : '';
}

function buildApiKeyState(user) {
  return {
    hasApiKey: Boolean(user?.apiKeyHash),
    apiKeyPreview: user?.apiKeyPrefix || '',
    apiKeyCreatedAt: user?.apiKeyCreatedAt || null,
    expiresAt: null,
  };
}

router.get('/user/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.username })
      .select('email nickname avatarFileId bio createdAt apiKeyHash apiKeyPrefix apiKeyCreatedAt')
      .lean();

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({
      user: {
        email: user.email,
        nickname: user.nickname,
        avatarUrl: buildAvatarUrl(user.avatarFileId),
        avatarFileId: user.avatarFileId,
        bio: user.bio,
        createdAt: user.createdAt,
        ...buildApiKeyState(user),
        groups: req.user.groups,
        permissions: req.user.permissions,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message || '获取用户信息失败' });
  }
});

router.put('/user/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.username });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const { nickname, avatarFileId, bio, currentPassword, newPassword } = req.body || {};

    if (nickname !== undefined) {
      const trimmed = String(nickname).trim();
      if (!trimmed || trimmed.length > 32) {
        return res.status(400).json({ error: '昵称长度需为 1 到 32 个字符' });
      }
      if (!/^[a-zA-Z0-9一-鿿]+$/.test(trimmed)) {
        return res.status(400).json({ error: '昵称只允许英文、数字和中文，不允许符号及其他字符' });
      }
      const reserved = ['post', 'new', 'edit', 'manage'];
      if (reserved.includes(trimmed.toLowerCase())) {
        return res.status(400).json({ error: '该昵称已被系统保留，请使用其他昵称' });
      }
      if (trimmed !== user.nickname) {
        const existing = await User.findOne({ nickname: trimmed }).select('_id').lean();
        if (existing) {
          return res.status(409).json({ error: '该昵称已被使用' });
        }
      }
      user.nickname = trimmed;
    }

    if (avatarFileId !== undefined) {
      if (avatarFileId === null || avatarFileId === '') {
        user.avatarFileId = null;
      } else {
        const file = await File.findById(avatarFileId).select('_id').lean();
        if (!file) {
          return res.status(400).json({ error: '头像文件无效' });
        }
        user.avatarFileId = file._id;
      }
    }

    if (bio !== undefined) {
      user.bio = String(bio).trim().slice(0, 200);
    }

    if (newPassword !== undefined && newPassword !== '') {
      if (!currentPassword || !(await verifyPassword(currentPassword, user.passwordHash))) {
        return res.status(400).json({ error: '当前密码错误' });
      }

      if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > 128) {
        return res.status(400).json({ error: `新密码长度需为 ${MIN_PASSWORD_LENGTH} 到 128 个字符` });
      }

      user.passwordHash = await hashPassword(newPassword);
    }

    await user.save();
    await syncFileReferencesForBiz({
      bizType: 'user_avatar',
      bizId: String(user._id),
      fileIds: user.avatarFileId ? [user.avatarFileId] : [],
    });

    res.json({
      user: {
        email: user.email,
        nickname: user.nickname,
        avatarUrl: buildAvatarUrl(user.avatarFileId),
        avatarFileId: user.avatarFileId,
        bio: user.bio,
        createdAt: user.createdAt,
        ...buildApiKeyState(user),
        groups: req.user.groups,
        permissions: req.user.permissions,
      },
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ error: '操作冲突' });
    }
    res.status(500).json({ error: error.message || '更新用户信息失败' });
  }
});

router.get('/user/api-key', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.username })
      .select('apiKeyHash apiKeyPrefix apiKeyCreatedAt')
      .lean();

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    return res.json({
      apiKey: buildApiKeyState(user),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || '获取 API Key 状态失败' });
  }
});

router.post('/user/api-key', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.username });
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const apiKey = generateApiKey();
    user.apiKeyHash = hashApiKey(apiKey);
    user.apiKeyPrefix = buildApiKeyPreview(apiKey);
    user.apiKeyCreatedAt = new Date();
    await user.save();

    return res.json({
      apiKey: {
        ...buildApiKeyState(user),
        value: apiKey,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || '生成 API Key 失败' });
  }
});

router.delete('/user/api-key', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.username });
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    user.apiKeyHash = null;
    user.apiKeyPrefix = '';
    user.apiKeyCreatedAt = null;
    await user.save();

    return res.json({
      apiKey: buildApiKeyState(user),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || '废弃 API Key 失败' });
  }
});

router.get('/users/:nickname', async (req, res) => {
  try {
    const user = await User.findOne({ nickname: req.params.nickname })
      .select('nickname bio avatarFileId')
      .lean();

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({
      user: {
        nickname: user.nickname,
        bio: user.bio,
        avatarUrl: buildAvatarUrl(user.avatarFileId),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message || '获取用户信息失败' });
  }
});

export default router;
