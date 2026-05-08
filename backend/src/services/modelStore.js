import ChatModel from '../models/ChatModel.js';
import { loadModelsConfig } from '../config/models.js';

function resolveEnvVars(value) {
  if (typeof value === 'string') {
    return value.replace(/\$\{(\w+)\}/g, (_, name) => process.env[name] || '');
  }
  if (Array.isArray(value)) {
    return value.map(resolveEnvVars);
  }
  if (value && typeof value === 'object') {
    const resolved = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      resolved[key] = resolveEnvVars(nestedValue);
    }
    return resolved;
  }
  return value;
}

function normalizePublicModel(doc) {
  if (!doc) {
    return null;
  }

  return {
    id: doc._id,
    name: doc.name,
    provider: doc.provider,
    free: Boolean(doc.free),
    reasoning: Boolean(doc.reasoning),
    contextWindow: doc.contextWindow ?? null,
    maxTokens: doc.maxTokens ?? null,
  };
}

function normalizeManageModel(doc) {
  if (!doc) {
    return null;
  }

  return {
    id: doc._id,
    provider: doc.provider,
    modelId: doc.modelId,
    name: doc.name,
    free: Boolean(doc.free),
    reasoning: Boolean(doc.reasoning),
    input: doc.input || ['text'],
    contextWindow: doc.contextWindow ?? null,
    maxTokens: doc.maxTokens ?? null,
    compat: doc.compat || {},
    providerConfig: doc.providerConfig || {},
    isDefault: Boolean(doc.isDefault),
    source: doc.source || 'manual',
    createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).getTime() : null,
  };
}

function buildStoredModelId(provider, modelId) {
  return `${provider}/${modelId}`;
}

export async function initializeModelCatalog() {
  const config = loadModelsConfig();
  const defaultModelId = String(config.default || '').trim();
  const seenIds = [];

  for (const [provider, providerConfig] of Object.entries(config)) {
    if (provider === 'default' || !Array.isArray(providerConfig?.models)) {
      continue;
    }

    for (const model of providerConfig.models) {
      const storedId = buildStoredModelId(provider, model.id);
      seenIds.push(storedId);

      await ChatModel.updateOne(
        { _id: storedId },
        {
          $setOnInsert: {
            _id: storedId,
            source: 'seed',
            provider,
            modelId: model.id,
            name: model.name || model.id,
            free: model.free === undefined ? true : Boolean(model.free),
            reasoning: Boolean(model.reasoning),
            input: Array.isArray(model.input) ? model.input : ['text'],
            contextWindow: model.contextWindow ?? null,
            maxTokens: model.maxTokens ?? null,
            compat: model.compat || {},
            providerConfig: {
              baseUrl: providerConfig.baseUrl || '',
              api: providerConfig.api || 'openai-completions',
              apiKey: providerConfig.apiKey || '',
              authHeader: providerConfig.authHeader !== false,
            },
            isDefault: storedId === defaultModelId,
          },
        },
        { upsert: true }
      );
    }
  }

  if (defaultModelId && !seenIds.includes(defaultModelId)) {
    await ChatModel.updateMany({}, { $set: { isDefault: false } });
  }

  return {
    totalCount: await ChatModel.countDocuments(),
  };
}

export async function listPublicChatModels() {
  const docs = await ChatModel.find({ deleted: { $ne: true } }).sort({ provider: 1, name: 1 }).lean();
  return docs.map(normalizePublicModel);
}

export async function listManageChatModels() {
  const docs = await ChatModel.find({ deleted: { $ne: true } }).sort({ provider: 1, name: 1 }).lean();
  return docs.map(normalizeManageModel);
}

export async function getDefaultChatModelId() {
  const defaultDoc = await ChatModel.findOne({ isDefault: true, deleted: { $ne: true } }).select('_id').lean();
  if (defaultDoc?._id) {
    return defaultDoc._id;
  }

  const firstDoc = await ChatModel.findOne({ deleted: { $ne: true } }).sort({ provider: 1, name: 1 }).select('_id').lean();
  return firstDoc?._id || null;
}

export async function findChatModelById(modelId) {
  const normalizedId = String(modelId || '').trim();
  if (!normalizedId) {
    return null;
  }

  const doc = await ChatModel.findOne({
    $or: [
      { _id: normalizedId },
      { modelId: normalizedId },
    ],
    deleted: { $ne: true },
  }).lean();

  if (!doc) {
    return null;
  }

  return {
    ...normalizeManageModel(doc),
    providerConfig: resolveEnvVars(doc.providerConfig || {}),
  };
}

export async function upsertChatModel(payload = {}, currentId = '') {
  const provider = String(payload.provider || '').trim();
  const modelId = String(payload.modelId || '').trim();
  const storedId = currentId || buildStoredModelId(provider, modelId);

  if (!provider || !modelId) {
    const error = new Error('provider 和 modelId 不能为空');
    error.statusCode = 400;
    throw error;
  }

  if (payload.isDefault) {
    await ChatModel.updateMany({}, { $set: { isDefault: false } });
  }

  const update = {
    provider,
    modelId,
    name: String(payload.name || modelId).trim(),
    free: payload.free !== false,
    reasoning: Boolean(payload.reasoning),
    input: Array.isArray(payload.input) && payload.input.length > 0 ? payload.input : ['text'],
    contextWindow: payload.contextWindow ? Number(payload.contextWindow) : null,
    maxTokens: payload.maxTokens ? Number(payload.maxTokens) : null,
    compat: payload.compat && typeof payload.compat === 'object' ? payload.compat : {},
    providerConfig: payload.providerConfig && typeof payload.providerConfig === 'object' ? payload.providerConfig : {},
    isDefault: Boolean(payload.isDefault),
    source: payload.source === 'seed' ? 'seed' : 'manual',
    deleted: false,
  };

  const doc = await ChatModel.findOneAndUpdate(
    { _id: storedId },
    {
      $set: update,
      $setOnInsert: {
        _id: storedId,
      },
    },
    {
      new: true,
      upsert: true,
    }
  ).lean();

  return normalizeManageModel(doc);
}

export async function deleteChatModel(modelId) {
  const result = await ChatModel.updateOne({ _id: String(modelId || '') }, { $set: { deleted: true } });
  return { success: result.modifiedCount > 0 };
}

export async function copyChatModel(modelId) {
  const source = await ChatModel.findById(String(modelId || '')).lean();
  if (!source) {
    const error = new Error('模型不存在');
    error.statusCode = 404;
    throw error;
  }

  const copyId = `${source._id}-copy`;
  const copyName = `${source.name}-copy`;

  const doc = await ChatModel.findOneAndUpdate(
    { _id: copyId },
    {
      $set: { deleted: false },
      $setOnInsert: {
        _id: copyId,
        provider: source.provider,
        modelId: `${source.modelId}-copy`,
        name: copyName,
        free: source.free,
        reasoning: source.reasoning,
        input: source.input || ['text'],
        contextWindow: source.contextWindow,
        maxTokens: source.maxTokens,
        compat: source.compat || {},
        providerConfig: source.providerConfig || {},
        isDefault: false,
        source: 'manual',
      },
    },
    { new: true, upsert: true }
  ).lean();

  return normalizeManageModel(doc);
}