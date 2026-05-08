import Agent from '../models/Agent.js';
import { loadSeedIdentities } from '../config/identities.js';

function normalizePublicAgent(doc) {
  if (!doc) {
    return null;
  }

  return {
    id: doc._id,
    name: doc.name,
    role: doc.role || '',
    description: doc.description || '',
    avatarUrl: doc.avatarUrl || '',
    free: Boolean(doc.free),
  };
}

function normalizeManageAgent(doc) {
  if (!doc) {
    return null;
  }

  return {
    id: doc._id,
    name: doc.name,
    role: doc.role || '',
    description: doc.description || '',
    avatarUrl: doc.avatarUrl || '',
    personaDefinition: doc.personaDefinition || '',
    systemPrompt: doc.systemPrompt || '',
    free: Boolean(doc.free),
    source: doc.source || 'manual',
    seedFile: doc.seedFile || '',
    createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).getTime() : null,
  };
}

export async function initializeAgentCatalog() {
  const seedAgents = loadSeedIdentities();
  for (const agent of seedAgents) {
    await Agent.updateOne(
      { _id: agent.id },
      {
        $setOnInsert: {
          _id: agent.id,
          source: 'seed',
          name: agent.name,
          role: agent.role || '',
          description: agent.description || '',
          avatarUrl: agent.avatarUrl || '',
          personaDefinition: agent.personaDefinition,
          systemPrompt: '',
          free: agent.free === undefined ? true : Boolean(agent.free),
          seedFile: agent.seedFile || `${agent.id}.md`,
        },
      },
      { upsert: true }
    );
  }

  return {
    totalCount: await Agent.countDocuments(),
  };
}

export async function listPublicAgents() {
  const docs = await Agent.find({}).sort({ name: 1 }).lean();
  return docs.map(normalizePublicAgent);
}

export async function listManageAgents() {
  const docs = await Agent.find({}).sort({ name: 1 }).lean();
  return docs.map(normalizeManageAgent);
}

export async function getAgentById(id) {
  const doc = await Agent.findById(String(id || '')).lean();
  return doc ? normalizeManageAgent(doc) : null;
}

export async function upsertAgent(payload = {}, currentId = '') {
  const agentId = String(currentId || payload.id || '').trim();
  if (!agentId) {
    const error = new Error('智能体 ID 不能为空');
    error.statusCode = 400;
    throw error;
  }

  const doc = await Agent.findOneAndUpdate(
    { _id: agentId },
    {
      $set: {
        name: String(payload.name || agentId).trim(),
        role: String(payload.role || '').trim(),
        description: String(payload.description || '').trim(),
        avatarUrl: String(payload.avatarUrl || '').trim(),
        personaDefinition: String(payload.personaDefinition || '').trim(),
        systemPrompt: String(payload.systemPrompt || '').trim(),
        free: payload.free !== false,
        source: payload.source === 'seed' ? 'seed' : 'manual',
        seedFile: String(payload.seedFile || '').trim(),
      },
      $setOnInsert: {
        _id: agentId,
      },
    },
    {
      new: true,
      upsert: true,
    }
  ).lean();

  return normalizeManageAgent(doc);
}

export async function deleteAgent(agentId) {
  const result = await Agent.deleteOne({ _id: String(agentId || '') });
  return { success: result.deletedCount > 0 };
}