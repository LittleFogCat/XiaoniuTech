import Chat from '../models/Chat.js';

function toChatResponse(doc) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    model: doc.model,
    messages: doc.messages ?? [],
    createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).getTime() : null,
  };
}

function toChatSummary(doc) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    model: doc.model,
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

export async function listChats() {
  const docs = await Chat.find({})
    .sort({ updatedAt: -1 })
    .select('title model createdAt updatedAt')
    .lean();
  return docs.map(toChatSummary);
}

export async function getChatById(id) {
  const doc = await Chat.findById(id).lean();
  return doc ? toChatResponse(doc) : null;
}

export async function createChat(payload = {}) {
  const doc = await Chat.create({
    title: payload.title || '新对话',
    model: payload.model || 'glm-5.1',
    messages: normalizeMessages(payload.messages),
  });
  return toChatResponse(doc.toObject());
}

export async function updateChat(id, payload = {}) {
  const update = {};
  if (payload.title !== undefined) update.title = payload.title || '新对话';
  if (payload.model !== undefined) update.model = payload.model || 'glm-5.1';
  if (payload.messages !== undefined) update.messages = normalizeMessages(payload.messages);

  const doc = await Chat.findByIdAndUpdate(id, update, { new: true }).lean();
  return doc ? toChatResponse(doc) : null;
}

export async function deleteChat(id) {
  const result = await Chat.findByIdAndDelete(id).lean();
  return Boolean(result);
}

