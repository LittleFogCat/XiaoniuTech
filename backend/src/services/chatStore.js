import Chat from '../models/Chat.js';
import { getIdentityById } from './identityStore.js';

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toChatResponse(doc) {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    title: doc.title,
    model: doc.model,
    chatTarget: doc.chatTarget ?? null,
    messages: doc.messages ?? [],
    createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).getTime() : null,
  };
}

function toChatSummary(doc) {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    title: doc.title,
    model: doc.model,
    chatTarget: doc.chatTarget ?? null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).getTime() : null,
  };
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }
  return messages
    .filter(m => m && typeof m.role === 'string')
    .map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : '',
    }));
}

async function resolveChatTarget(chatTarget) {
  if (chatTarget === undefined) {
    return undefined;
  }

  if (chatTarget === null || chatTarget === '') {
    return { chatTarget: null, identity: null };
  }

  if (typeof chatTarget !== 'object') {
    throw createHttpError(400, 'chatTarget 格式无效');
  }

  const type = String(chatTarget.type || '').trim();
  const id = String(chatTarget.id || '').trim();

  if (!type && !id) {
    return { chatTarget: null, identity: null };
  }

  if (type !== 'identity' || !id) {
    throw createHttpError(400, '暂不支持该聊天对象');
  }

  const identity = await getIdentityById(id);
  if (!identity) {
    throw createHttpError(400, '所选智能体不存在');
  }

  return {
    chatTarget: {
      type: 'identity',
      id: identity.id,
    },
    identity,
  };
}

async function ensureChatTargetAvailability(userId, chatTarget, excludeChatId = null) {
  if (!chatTarget || chatTarget.type !== 'identity') {
    return;
  }

  const query = {
    userId,
    'chatTarget.type': 'identity',
    'chatTarget.id': chatTarget.id,
  };

  if (excludeChatId) {
    query._id = { $ne: excludeChatId };
  }

  const existing = await Chat.findOne(query).select('_id').lean();
  if (existing) {
    throw createHttpError(409, '该智能体对话已存在');
  }
}

export async function listChats(userId) {
  const docs = await Chat.find({ userId })
    .sort({ updatedAt: -1 })
    .select('title model chatTarget createdAt updatedAt')
    .lean();
  return docs.map(toChatSummary);
}

export async function getChatById(id, userId) {
  const doc = await Chat.findOne({ _id: id, userId }).lean();
  return doc ? toChatResponse(doc) : null;
}

export async function createChat(userId, payload = {}) {
  const resolvedChatTarget = await resolveChatTarget(payload.chatTarget);
  const chatTarget = resolvedChatTarget?.chatTarget ?? null;
  const identity = resolvedChatTarget?.identity ?? null;

  await ensureChatTargetAvailability(userId, chatTarget);

  const doc = await Chat.create({
    userId,
    title: payload.title || identity?.name || '新对话',
    model: payload.model || 'glm-5.1',
    messages: normalizeMessages(payload.messages),
    chatTarget,
  });
  return toChatResponse(doc.toObject());
}

export async function updateChat(id, userId, payload = {}) {
  const update = {};
  const resolvedChatTarget = await resolveChatTarget(payload.chatTarget);
  if (resolvedChatTarget !== undefined) {
    update.chatTarget = resolvedChatTarget.chatTarget;
    await ensureChatTargetAvailability(userId, resolvedChatTarget.chatTarget, id);
    if (payload.title === undefined) {
      update.title = resolvedChatTarget.identity?.name || '新对话';
    }
  }
  if (payload.title !== undefined) update.title = payload.title || resolvedChatTarget?.identity?.name || '新对话';
  if (payload.model !== undefined) update.model = payload.model || 'glm-5.1';
  if (payload.messages !== undefined) update.messages = normalizeMessages(payload.messages);

  const doc = await Chat.findOneAndUpdate({ _id: id, userId }, update, { new: true }).lean();
  return doc ? toChatResponse(doc) : null;
}

export async function deleteChat(id, userId) {
  const result = await Chat.findOneAndDelete({ _id: id, userId }).lean();
  return Boolean(result);
}

