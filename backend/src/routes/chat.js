import { Router } from 'express';
import { readBearerToken, verifyAuthToken } from '../services/auth.js';
import { getAgentById, listPublicAgents } from '../services/agentStore.js';
import { findChatModelById, getDefaultChatModelId, listPublicChatModels } from '../services/modelStore.js';
import { getUserAccessByEmail, hasPermission } from '../services/permissionStore.js';
import { streamCompletions } from '../services/provider.js';
import { requirePermission } from '../middleware/auth.js';
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

async function resolveChatAccess(req) {
  const token = readBearerToken(req);
  const payload = verifyAuthToken(token);

  if (!payload?.username) {
    return null;
  }

  const access = await getUserAccessByEmail(payload.username);
  if (!access) {
    return null;
  }

  if (access.isBlacklisted) {
    const error = new Error('当前账号已被禁用，请联系站长');
    error.statusCode = 403;
    throw error;
  }

  return access;
}

function assertModelAccess(modelConfig, access) {
  if (!modelConfig) {
    const error = new Error('所选模型不存在');
    error.statusCode = 400;
    throw error;
  }

  if (modelConfig.free) {
    if (!access) {
      return;
    }

    if (hasPermission(access, 'chat:chat_free') || hasPermission(access, 'chat:chat_paid')) {
      return;
    }
  } else if (access && hasPermission(access, 'chat:chat_paid')) {
    return;
  }

  const error = new Error(modelConfig.free ? '当前账号没有免费模型使用权限' : '当前模型需要联系站长开通后使用');
  error.statusCode = 403;
  throw error;
}

function assertAgentAccess(chatTarget, access) {
  if (!chatTarget?.identity) {
    return;
  }

  if (chatTarget.identity.free) {
    if (!access) {
      return;
    }

    if (hasPermission(access, 'chat:agent_free') || hasPermission(access, 'chat:agent_paid')) {
      return;
    }
  } else if (access && hasPermission(access, 'chat:agent_paid')) {
    return;
  }

  const error = new Error(chatTarget.identity.free ? '当前账号没有免费智能体使用权限' : '当前智能体需要联系站长开通后使用');
  error.statusCode = 403;
  throw error;
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

  const identity = await getAgentById(id);
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

  const promptParts = [];
  if (chatTarget.identity.systemPrompt) {
    promptParts.push(chatTarget.identity.systemPrompt);
  }
  if (chatTarget.identity.personaDefinition) {
    promptParts.push(`以下是当前智能体的人格设定，请严格遵循。\n\n${chatTarget.identity.personaDefinition}`);
  }

  if (promptParts.length === 0) {
    return messages;
  }

  return [
    {
      role: 'system',
      content: promptParts.join('\n\n'),
    },
    ...messages,
  ];
}

router.get('/chats', requirePermission('chat:view'), async (req, res) => {
  try {
    const chats = await listChats(req.user.username);
    res.json({ chats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/chats/current', requirePermission('chat:view'), async (req, res) => {
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

router.get('/chats/:id', requirePermission('chat:view'), async (req, res) => {
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

router.post('/chats', requirePermission('chat:view'), async (req, res) => {
  try {
    const chat = await createChat(req.user.username, req.body || {});
    res.json({ chat });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/chats/:id', requirePermission('chat:view'), async (req, res) => {
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

router.delete('/chats/:id', requirePermission('chat:view'), async (req, res) => {
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

router.get('/chat/models', async (req, res) => {
  try {
    const [models, defaultModel] = await Promise.all([
      listPublicChatModels(),
      getDefaultChatModelId(),
    ]);
    res.json({ models, defaultModel });
  } catch (error) {
    console.error('Error getting models:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/chat/agents', async (req, res) => {
  try {
    res.json({ identities: await listPublicAgents() });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { model, messages, max_tokens, temperature, top_p, chatTarget, thinking } = req.body || {};

    if (!model) {
      return res.status(400).json({ error: 'model is required' });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages is required and must be non-empty array' });
    }

    const access = await resolveChatAccess(req);
    const modelConfig = await findChatModelById(model);
    assertModelAccess(modelConfig, access);
    const resolvedChatTarget = await resolveChatTarget(chatTarget);
    assertAgentAccess(resolvedChatTarget, access);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const options = {
      max_tokens: max_tokens || modelConfig?.maxTokens || 4096,
      temperature: temperature ?? 0.7,
      top_p: top_p ?? 1.0,
      thinking,
      stream: true,
    };

    const completionMessages = buildCompletionMessages(messages, resolvedChatTarget);
    for await (const chunk of streamCompletions(model, completionMessages, options)) {
      const frame = {};

      if (chunk.reasoningContent) {
        frame.reasoning_content = chunk.reasoningContent;
      }

      if (chunk.content) {
        frame.content = chunk.content;
      }

      if (Object.keys(frame).length > 0) {
        res.write(`data: ${JSON.stringify(frame)}\n\n`);
      }
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
