import { Router } from 'express';
import { requirePermission } from '../middleware/auth.js';
import { deleteAgent, listManageAgents, upsertAgent } from '../services/agentStore.js';
import { deleteChatModel, listManageChatModels, upsertChatModel } from '../services/modelStore.js';

const router = Router();

function getStatusCode(error, fallback = 500) {
  return error?.statusCode || fallback;
}

router.get('/chat/management/models', requirePermission('chat:manage_model'), async (req, res) => {
  try {
    res.json({ models: await listManageChatModels() });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.post('/chat/management/models', requirePermission('chat:manage_model'), async (req, res) => {
  try {
    res.status(201).json({ model: await upsertChatModel(req.body || {}) });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.put('/chat/management/models/:id', requirePermission('chat:manage_model'), async (req, res) => {
  try {
    res.json({ model: await upsertChatModel(req.body || {}, req.params.id) });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.delete('/chat/management/models/:id', requirePermission('chat:manage_model'), async (req, res) => {
  try {
    res.json(await deleteChatModel(req.params.id));
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.get('/chat/management/agents', requirePermission('chat:manage_agent'), async (req, res) => {
  try {
    res.json({ agents: await listManageAgents() });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.post('/chat/management/agents', requirePermission('chat:manage_agent'), async (req, res) => {
  try {
    res.status(201).json({ agent: await upsertAgent(req.body || {}) });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.put('/chat/management/agents/:id', requirePermission('chat:manage_agent'), async (req, res) => {
  try {
    res.json({ agent: await upsertAgent(req.body || {}, req.params.id) });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.delete('/chat/management/agents/:id', requirePermission('chat:manage_agent'), async (req, res) => {
  try {
    res.json(await deleteAgent(req.params.id));
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

export default router;