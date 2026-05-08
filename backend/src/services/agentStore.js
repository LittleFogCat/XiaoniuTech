import Agent from '../models/Agent.js';
import File from '../models/File.js';
import { loadSeedIdentities } from '../config/identities.js';

function buildAvatarUrl(doc) {
  if (doc.avatarFileId) {
    return `/api/files/${doc.avatarFileId}`;
  }
  return doc.avatarUrl || '';
}

function normalizePublicAgent(doc) {
  if (!doc) {
    return null;
  }

  return {
    id: doc._id,
    name: doc.name,
    role: doc.role || '',
    description: doc.description || '',
    avatarUrl: buildAvatarUrl(doc),
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
    avatarUrl: buildAvatarUrl(doc),
    avatarFileId: doc.avatarFileId || null,
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
  const docs = await Agent.find({ deleted: { $ne: true } }).sort({ name: 1 }).lean();
  return docs.map(normalizePublicAgent);
}

export async function listManageAgents() {
  const docs = await Agent.find({ deleted: { $ne: true } }).sort({ name: 1 }).lean();
  return docs.map(normalizeManageAgent);
}

export async function getAgentById(id) {
  const doc = await Agent.findOne({ _id: String(id || ''), deleted: { $ne: true } }).lean();
  return doc ? normalizeManageAgent(doc) : null;
}

export async function upsertAgent(payload = {}, currentId = '') {
  const agentId = String(currentId || payload.id || '').trim();
  if (!agentId) {
    const error = new Error('智能体 ID 不能为空');
    error.statusCode = 400;
    throw error;
  }

  let avatarFileId = null;
  if (payload.avatarFileId !== undefined && payload.avatarFileId !== '' && payload.avatarFileId !== null) {
    const file = await File.findById(payload.avatarFileId).select('_id').lean();
    if (!file) {
      const error = new Error('头像文件无效');
      error.statusCode = 400;
      throw error;
    }
    avatarFileId = file._id;
  }

  const $set = {
    name: String(payload.name || agentId).trim(),
    role: String(payload.role || '').trim(),
    description: String(payload.description || '').trim(),
    avatarFileId,
    personaDefinition: String(payload.personaDefinition || '').trim(),
    systemPrompt: String(payload.systemPrompt || '').trim(),
    free: payload.free !== false,
    source: payload.source === 'seed' ? 'seed' : 'manual',
    seedFile: String(payload.seedFile || '').trim(),
    deleted: false,
  };

  if (payload.avatarUrl !== undefined) {
    $set.avatarUrl = String(payload.avatarUrl || '').trim();
  }

  const doc = await Agent.findOneAndUpdate(
    { _id: agentId },
    {
      $set,
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
  const result = await Agent.updateOne({ _id: String(agentId || '') }, { $set: { deleted: true } });
  return { success: result.modifiedCount > 0 };
}