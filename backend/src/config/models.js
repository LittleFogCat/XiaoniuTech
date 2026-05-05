import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const BACKEND_ROOT = path.resolve(__dirname, '../..');
const BACKEND_CONFIG_DIR = '/app/config';

let modelsConfig = null;

function resolveModelsConfigPath() {
  const configuredPath = process.env.MODELS_FILE_PATH;
  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(BACKEND_ROOT, configuredPath);
  }
  return path.join(BACKEND_CONFIG_DIR, 'models.json');
}

function resolveEnvVars(value) {
  if (typeof value === 'string') {
    return value.replace(/\$\{(\w+)\}/g, (_, name) => process.env[name] || '');
  }
  if (Array.isArray(value)) {
    return value.map(resolveEnvVars);
  }
  if (value && typeof value === 'object') {
    const resolved = {};
    for (const [k, v] of Object.entries(value)) {
      resolved[k] = resolveEnvVars(v);
    }
    return resolved;
  }
  return value;
}

export function loadModelsConfig() {
  if (modelsConfig) {
    return modelsConfig;
  }

  const configPath = resolveModelsConfigPath();
  let finalPath = configPath;

  if (!fs.existsSync(finalPath)) {
    // fallback to repository bundled models.json
    const bundled = path.resolve(PROJECT_ROOT, 'conf', 'backend', 'models.json');
    if (fs.existsSync(bundled)) {
      finalPath = bundled;
    }
  }

  const content = fs.readFileSync(finalPath, 'utf-8');
  try {
    modelsConfig = JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to parse models config at ${finalPath}: ${err.message}`);
  }
  return modelsConfig;
}

export function getAllModels() {
  const config = loadModelsConfig();
  const models = [];

  for (const [provider, providerConfig] of Object.entries(config)) {
    if (provider === 'default' || !providerConfig.models) continue;
    for (const model of providerConfig.models) {
      models.push({
        id: `${provider}/${model.id}`,
        name: model.name,
        provider: provider,
        reasoning: model.reasoning ?? false,
        contextWindow: model.contextWindow ?? null,
        maxTokens: model.maxTokens ?? null,
      });
    }
  }

  return models;
}

export function findProviderAndModel(modelId) {
  const config = loadModelsConfig();

  for (const [provider, providerConfig] of Object.entries(config)) {
    if (provider === 'default' || !providerConfig.models) continue;
    const model = providerConfig.models.find(m => m.id === modelId || `${provider}/${m.id}` === modelId);
    if (model) {
      return {
        provider: provider,
        config: resolveEnvVars(providerConfig),
        model: model,
      };
    }
  }

  return null;
}

export function getDefaultModel() {
  const config = loadModelsConfig();
  return config.default || null;
}

export default {
  loadModelsConfig,
  getAllModels,
  findProviderAndModel,
  getDefaultModel,
};