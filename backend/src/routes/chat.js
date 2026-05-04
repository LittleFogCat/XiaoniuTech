import { Router } from 'express';
import { getAllModels, getDefaultModel } from '../config/models.js';
import { getIdentityById, listPublicIdentities } from '../services/identityStore.js';
import { streamCompletions } from '../services/provider.js';
import { requireAuth } from '../middleware/auth.js';
import {
  listChats,
  getChatById,
  createChat,
  updateChat as updateChatById,
  deleteChat as deleteChatById,
} from '../services/chatStore.js';

const router = Router();

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
