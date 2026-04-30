import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '../..');

const DEFAULT_BACKEND_CONFIG = {
  printLog: false,
};

function resolveBackendConfigPath() {
  const configuredPath = process.env.BACKEND_CONFIG_PATH;
  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(BACKEND_ROOT, configuredPath);
  }

  return path.resolve(BACKEND_ROOT, '../conf/backend.conf');
}

function parseConfigValue(rawValue) {
  const value = rawValue.trim();

  if (/^(true|false)$/i.test(value)) {
    return value.toLowerCase() === 'true';
  }

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  return value;
}

export function loadBackendConfig() {
  const configPath = resolveBackendConfigPath();
  const config = { ...DEFAULT_BACKEND_CONFIG };

  if (!fs.existsSync(configPath)) {
    return config;
  }

  const content = fs.readFileSync(configPath, 'utf-8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1);
    if (!key) {
      continue;
    }

    config[key] = parseConfigValue(value);
  }

  return config;
}

export function shouldPrintProviderLog() {
  return Boolean(loadBackendConfig().printLog);
}

export default {
  loadBackendConfig,
  shouldPrintProviderLog,
};