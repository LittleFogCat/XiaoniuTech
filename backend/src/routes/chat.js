import { Router } from 'express';
import { getAllModels, getDefaultModel } from '../config/models.js';
import { getIdentityById, listPublicIdentities } from '../services/identityStore.js';
import { streamCompletions } from '../services/provider.js';
import {
  createAuthToken,
  generateEmailVerificationCode,
  hashPassword,
  readBearerToken,
  verifyAuthToken,
  verifyPassword,
} from '../services/auth.js';
import { createCaptchaChallenge, consumeCaptchaChallenge } from '../services/captchaStore.js';
import { sendRegistrationCodeEmail } from '../services/mail.js';
import PendingRegistration from '../models/PendingRegistration.js';
import User from '../models/User.js';
import {
  listChats,
  getChatById,
  createChat,
  updateChat as updateChatById,
  deleteChat as deleteChatById,
} from '../services/chatStore.js';

const router = Router();
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;

function getStatusCode(error, fallback = 500) {
  return error?.statusCode || fallback;
}

async function resolveChatTarget(chatTarget) {
  if (!chatTarget) {
    return null;
  }

  if (typeof chatTarget !== 'object') {
    const error = new Error('chatTarget 格式无效');
    error.statusCode = 400;
    throw error;
  }

  const type = String(chatTarget.type || '').trim();
  const id = String(chatTarget.id || '').trim();

  if (!type && !id) {
    return null;
  }

  if (type !== 'identity' || !id) {
    const error = new Error('暂不支持该聊天对象');
    error.statusCode = 400;
    throw error;
  }

  const identity = await getIdentityById(id);
  if (!identity) {
    const error = new Error('所选智能体不存在');
    error.statusCode = 400;
    throw error;
  }

  return {
    type: 'identity',
    id: identity.id,
    identity,
  };
}

function buildCompletionMessages(messages, chatTarget) {
  if (!chatTarget || chatTarget.type !== 'identity') {
    return messages;
  }

  return [
    {
      role: 'system',
      content: `以下是当前智能体的人格设定，请严格遵循。\n\n${chatTarget.identity.personaDefinition}`,
    },
    ...messages,
  ];
}

// Admin account removed — no default admin credentials supported.

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

function requireAuth(req, res, next) {
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

router.get('/register/captcha', (req, res) => {
  res.json(createCaptchaChallenge());
});

router.post('/register/request', async (req, res) => {
  try {
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

    if (!captchaId || !captchaAnswer || !consumeCaptchaChallenge(captchaId, captchaAnswer)) {
      return res.status(400).json({ error: '人机验证失败，请刷新后重试' });
    }

    const existingUser = await User.findOne({ email }).select('_id').lean();
    if (existingUser) {
      return res.status(409).json({ error: '该邮箱已注册' });
    }

    const passwordHash = await hashPassword(password);
    const verificationCode = generateEmailVerificationCode();
    const verificationCodeHash = await hashPassword(verificationCode);
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

    await sendRegistrationCodeEmail(email, verificationCode);

    return res.json({
      success: true,
      email,
      expiresInMs: EMAIL_CODE_TTL_MS,
    });
  } catch (error) {
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

    const user = await User.create({
      email,
      passwordHash: pendingRegistration.passwordHash,
      emailVerifiedAt: new Date(),
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

router.get('/chats', requireAuth, async (req, res) => {
  try {
    const chats = await listChats(req.user.username);
    res.json({ chats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/chats/current', requireAuth, async (req, res) => {
  try {
    const { id } = req.query;
    if (id) {
      const chat = await getChatById(id, req.user.username);
      return res.json({ chat });
    }
    const chats = await listChats(req.user.username);
    if (!chats.length) {
      return res.json({ chat: null });
    }
    const chat = await getChatById(chats[0].id, req.user.username);
    return res.json({ chat });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/chats/:id', requireAuth, async (req, res) => {
  try {
    const chat = await getChatById(req.params.id, req.user.username);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    res.json({ chat });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/chats', requireAuth, async (req, res) => {
  try {
    const chat = await createChat(req.user.username, req.body || {});
    res.json({ chat });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/chats/:id', requireAuth, async (req, res) => {
  try {
    const chat = await updateChatById(req.params.id, req.user.username, req.body || {});
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    res.json({ chat });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/chats/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await deleteChatById(req.params.id, req.user.username);
    if (!deleted) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/models', (req, res) => {
  try {
    const models = getAllModels();
    const defaultModel = getDefaultModel();
    res.json({ models, defaultModel });
  } catch (error) {
    console.error('Error getting models:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/identities', async (req, res) => {
  try {
    res.json({ identities: await listPublicIdentities() });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { model, messages, max_tokens, temperature, top_p, chatTarget } = req.body;

    if (!model) {
      return res.status(400).json({ error: 'model is required' });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages is required and must be non-empty array' });
    }

    const resolvedChatTarget = await resolveChatTarget(chatTarget);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const options = {
      max_tokens: max_tokens || 4096,
      temperature: temperature ?? 0.7,
      top_p: top_p ?? 1.0,
      stream: true,
    };

    let fullContent = '';
    const completionMessages = buildCompletionMessages(messages, resolvedChatTarget);
    for await (const chunk of streamCompletions(model, completionMessages, options)) {
      fullContent += chunk;
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Chat error:', error);
    if (!res.headersSent) {
      res.status(getStatusCode(error)).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

export default router;