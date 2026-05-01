import { Router } from 'express';
import { getAllModels, getDefaultModel } from '../config/models.js';
import { streamCompletions } from '../services/provider.js';
import { createAuthToken, readBearerToken, verifyAuthToken } from '../services/auth.js';
import {
  listChats,
  getChatById,
  createChat,
  updateChat as updateChatById,
  deleteChat as deleteChatById,
} from '../services/chatStore.js';

const router = Router();

function getLoginCredentials() {
  return {
    username: process.env.CHAT_ADMIN_USERNAME || 'admin',
    password: process.env.CHAT_ADMIN_PASSWORD || 'a.1?b',
  };
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

router.post('/login', (req, res) => {
  const { username = '', password = '' } = req.body || {};
  const credentials = getLoginCredentials();

  if (username !== credentials.username || password !== credentials.password) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  return res.json({
    success: true,
    token: createAuthToken(credentials.username),
    user: {
      username: credentials.username,
    },
  });
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

router.post('/chat', async (req, res) => {
  try {
    const { model, messages, max_tokens, temperature, top_p } = req.body;

    if (!model) {
      return res.status(400).json({ error: 'model is required' });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages is required and must be non-empty array' });
    }

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
    for await (const chunk of streamCompletions(model, messages, options)) {
      fullContent += chunk;
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

export default router;