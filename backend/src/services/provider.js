import { findProviderAndModel } from '../config/models.js';

const PROVIDER_API_KEY_ENV_VARS = {
  longcat: 'LONGCAT_API_KEY',
  zai: 'ZAI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
};

function resolveApiKey(provider, providerConfig) {
  const envVarName = PROVIDER_API_KEY_ENV_VARS[provider];
  const apiKey = envVarName ? process.env[envVarName] : undefined;

  return {
    apiKey: apiKey || providerConfig.apiKey,
    envVarName,
  };
}

function buildUrl(baseUrl) {
  baseUrl = baseUrl.replace(/\/$/, '');
  if (baseUrl.endsWith('/openai/v1')) {
    return baseUrl + '/chat/completions';
  }
  return baseUrl + '/chat/completions';
}

function buildPayload(modelConfig, messages, options = {}) {
  const payload = {
    model: modelConfig.id,
    messages: messages,
  };

  const maxTokensField = modelConfig.compat?.maxTokensField || 'max_tokens';

  if (options.max_tokens) {
    payload[maxTokensField] = options.max_tokens;
  } else if (modelConfig.maxTokens) {
    payload[maxTokensField] = modelConfig.maxTokens;
  }

  if (options.temperature !== undefined) {
    payload.temperature = options.temperature;
  } else {
    payload.temperature = 0.7;
  }

  if (options.top_p !== undefined) {
    payload.top_p = options.top_p;
  } else {
    payload.top_p = 1.0;
  }

  if (options.stream !== false) {
    payload.stream = true;
  }

  return payload;
}

function buildHeaders(provider, providerConfig) {
  const headers = {
    'Content-Type': 'application/json',
  };

  const authHeader = providerConfig.authHeader ?? true;
  const { apiKey, envVarName } = resolveApiKey(provider, providerConfig);

  if (authHeader && !apiKey) {
    const configHint = envVarName
      ? ` Set ${envVarName} in the environment.`
      : '';
    throw new Error(`Missing API key for provider ${provider}.${configHint}`);
  }

  if (apiKey && authHeader) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  return headers;
}

function parseChunk(chunk) {
  const lines = chunk.split('\n');
  let content = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) {
      continue;
    }

    const data = trimmed.slice(5).trim();
    if (data === '[DONE]') {
      return { done: true, content: '' };
    }

    try {
      const obj = JSON.parse(data);
      const choice = obj.choices?.[0];

      if (choice?.delta?.content) {
        content += choice.delta.content;
      } else if (choice?.message?.content) {
        content += choice.message.content;
      } else if (choice?.text) {
        content += choice.text;
      }
    } catch (e) {
    }
  }

  return { done: false, content };
}

export async function* streamCompletions(modelId, messages, options = {}) {
  const result = findProviderAndModel(modelId);
  if (!result) {
    throw new Error(`Model ${modelId} not found`);
  }

  const { provider, config: providerConfig, model: modelConfig } = result;
  const url = buildUrl(providerConfig.baseUrl);
  const payload = buildPayload(modelConfig, messages, options);
  const headers = buildHeaders(provider, providerConfig);

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorBody}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        if (buffer) {
          const parsed = parseChunk(buffer);
          if (parsed.content) {
            yield parsed.content;
          }
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const parsed = parseChunk(line);
        if (parsed.done) {
          return;
        }
        if (parsed.content) {
          yield parsed.content;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function completions(modelId, messages, options = {}) {
  let fullContent = '';
  for await (const chunk of streamCompletions(modelId, messages, options)) {
    fullContent += chunk;
  }
  return fullContent;
}

export default {
  streamCompletions,
  completions,
};