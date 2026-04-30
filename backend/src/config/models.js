import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '../..');

let modelsConfig = null;

function resolveModelsConfigPath() {
  const configuredPath = process.env.MODELS_FILE_PATH;
  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(BACKEND_ROOT, configuredPath);
  }
  return path.join(BACKEND_ROOT, 'files', 'models.json');
}

export function loadModelsConfig() {
  if (modelsConfig) {
    return modelsConfig;
  }

  const configPath = resolveModelsConfigPath();
  const content = fs.readFileSync(configPath, 'utf-8');
  modelsConfig = JSON.parse(content);
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
        config: providerConfig,
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