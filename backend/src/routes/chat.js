import { Router } from 'express';
import { getAllModels, getDefaultModel } from '../config/models.js';
import { streamCompletions } from '../services/provider.js';
import {
  listChats,
  getChatById,
  createChat,
  updateChat as updateChatById,
  deleteChat as deleteChatById,
} from '../services/chatStore.js';

const router = Router();

router.get('/chats', async (req, res) => {
  try {
    const chats = await listChats();
    res.json({ chats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/chats/current', async (req, res) => {
  try {
    const { id } = req.query;
    if (id) {
      const chat = await getChatById(id);
      return res.json({ chat });
    }
    const chats = await listChats();
    if (!chats.length) {
      return res.json({ chat: null });
    }
    const chat = await getChatById(chats[0].id);
    return res.json({ chat });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/chats/:id', async (req, res) => {
  try {
    const chat = await getChatById(req.params.id);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    res.json({ chat });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/chats', async (req, res) => {
  try {
    const chat = await createChat(req.body || {});
    res.json({ chat });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/chats/:id', async (req, res) => {
  try {
    const chat = await updateChatById(req.params.id, req.body || {});
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    res.json({ chat });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/chats/:id', async (req, res) => {
  try {
    const deleted = await deleteChatById(req.params.id);
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