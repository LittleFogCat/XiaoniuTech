const STORAGE_KEY = 'chat_mock_data';

const defaultModels = [
  { id: 'glm-5.1', name: 'GLM-5.1', provider: 'zai', reasoning: true, contextWindow: 202800, maxTokens: 131100 },
  { id: 'glm-5', name: 'GLM-5', provider: 'zai', reasoning: true, contextWindow: 202800, maxTokens: 131100 },
  { id: 'glm-5-turbo', name: 'GLM-5 Turbo', provider: 'zai', reasoning: true, contextWindow: 202800, maxTokens: 131100 },
  { id: 'LongCat-Flash-Thinking-2601', name: 'LongCat-Flash-Thinking-2601', provider: 'longcat', reasoning: false, contextWindow: 200000, maxTokens: 8192 },
  { id: 'minimax/minimax-m2.5', name: 'MiniMax M2.5', provider: 'openrouter', reasoning: true, contextWindow: 200000, maxTokens: 32000 },
  { id: 'xiaomi/mimo-v2-pro', name: 'Xiaomi MiMo V2 Pro', provider: 'openrouter', reasoning: true, contextWindow: 128000, maxTokens: 16384 },
  { id: 'z-ai/glm-5.1', name: 'Z-AI GLM-5.1', provider: 'openrouter', reasoning: true, contextWindow: 202800, maxTokens: 131100 },
];

const defaultChats = [
  {
    id: 'chat_1',
    title: '你好，请介绍一下你自己',
    messages: [
      { role: 'user', content: '你好，请介绍一下你自己' },
      { role: 'assistant', content: '你好！我是 GLM-5.1，一个由智谱AI开发的大型语言模型。我基于 GLM-4 系列模型进一步优化升级而来。\n\n我可以帮助你：\n- 回答各种问题\n- 进行对话和聊天\n- 撰写文章、文案\n- 编写代码\n- 翻译\n- 以及更多任务！\n\n有什么我可以帮助你的吗？' },
    ],
    model: 'glm-5.1',
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000,
  },
  {
    id: 'chat_2',
    title: '用 Python 实现冒泡排序',
    messages: [
      { role: 'user', content: '用 Python 实现冒泡排序' },
      { role: 'assistant', content: '好的，以下是 Python 实现的冒泡排序算法：\n\n```python\ndef bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n-i-1):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]\n    return arr\n\n# 测试\narr = [64, 34, 25, 12, 22, 11, 90]\nprint(bubble_sort(arr))\n# 输出: [11, 12, 22, 25, 34, 64, 90]\n```\n\n冒泡排序的时间复杂度是 O(n²)，适合小规模数据排序。' },
    ],
    model: 'glm-5.1',
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 7200000,
  },
];

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load mock data:', e);
  }
  return { models: defaultModels, chats: defaultChats, currentChatId: null };
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save mock data:', e);
  }
}

let mockData = loadData();

export function getModels() {
  return mockData.models;
}

export function getChats() {
  return mockData.chats.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getCurrentChat() {
  if (!mockData.currentChatId) return null;
  return mockData.chats.find(c => c.id === mockData.currentChatId) || null;
}

export function setCurrentChat(chatId) {
  mockData.currentChatId = chatId;
  saveData(mockData);
}

export function createChat(title = '新对话') {
  const chat = {
    id: 'chat_' + Date.now(),
    title,
    messages: [],
    model: mockData.models[0]?.id || 'glm-5.1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  mockData.chats.push(chat);
  mockData.currentChatId = chat.id;
  saveData(mockData);
  return chat;
}

export function updateChat(chatId, updates) {
  const chat = mockData.chats.find(c => c.id === chatId);
  if (chat) {
    Object.assign(chat, updates, { updatedAt: Date.now() });
    saveData(mockData);
  }
  return chat;
}

export function deleteChat(chatId) {
  const index = mockData.chats.findIndex(c => c.id === chatId);
  if (index !== -1) {
    mockData.chats.splice(index, 1);
    if (mockData.currentChatId === chatId) {
      mockData.currentChatId = mockData.chats[0]?.id || null;
    }
    saveData(mockData);
  }
}

export async function* streamChatMock(model, messages, options = {}) {
  const mockResponses = {
    '你好': '你好！有什么可以帮助你的吗？',
    '你是谁': '我是 GLM-5.1，一个由智谱AI开发的大型语言模型。基于 GLM-4 系列进一步优化升级而来。',
    '介绍': '我是 GLM-5.1，一个由智谱AI开发的大型语言模型。基于 GLM-4 系列进一步优化升级而来。我可以回答问题、对话聊天、撰写文章、编写代码等。',
  };

  const lastMessage = messages[messages.length - 1]?.content || '';
  let mockContent = '';

  for (const [key, value] of Object.entries(mockResponses)) {
    if (lastMessage.includes(key)) {
      mockContent = value;
      break;
    }
  }

  if (!mockContent) {
    mockContent = `我收到了你的消息："${lastMessage}"\n\n这是一个模拟响应。在实际环境中，我会根据你的问题给出更有帮助的回答。\n\n你可以尝试问我：\n- 你好\n- 你是谁\n- 介绍`;  }

  const chars = mockContent.split('');
  for (const char of chars) {
    yield char;
    await new Promise(r => setTimeout(r, 30));
  }
}