import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const BACKEND_ROOT = path.resolve(__dirname, '../..');
const BACKEND_CONFIG_DIR = '/app/config';

const SECTION_ALIASES = {
  name: ['名称', 'name'],
  description: ['描述', 'description'],
  avatarUrl: ['头像url', '头像', 'avatarurl', 'avatar'],
  personaDefinition: ['人格定义', '人设', 'persona', 'personadefinition', 'systemprompt'],
};

function normalizeHeadingKey(heading = '') {
  return String(heading)
    .trim()
    .toLowerCase()
    .replace(/[：:]/g, '')
    .replace(/\s+/g, '');
}

function resolveIdentitiesDirPath() {
  const configuredPath = process.env.IDENTITIES_DIR_PATH;
  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(BACKEND_ROOT, configuredPath);
  }
  return path.join(BACKEND_CONFIG_DIR, 'identities');
}

function resolveExistingIdentitiesDir() {
  const configuredDir = resolveIdentitiesDirPath();
  if (fs.existsSync(configuredDir)) {
    return configuredDir;
  }

  const bundledDir = path.resolve(PROJECT_ROOT, 'conf', 'identities');
  if (fs.existsSync(bundledDir)) {
    return bundledDir;
  }

  return configuredDir;
}

function extractSections(markdown = '') {
  const headingRegex = /^#{1,6}\s*(.+?)\s*$/gm;
  const matches = [...markdown.matchAll(headingRegex)];

  if (!matches.length) {
    return new Map([['content', markdown.trim()]]);
  }

  const sections = new Map();
  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const next = matches[index + 1];
    const key = normalizeHeadingKey(current[1]);
    const start = current.index + current[0].length;
    const end = next ? next.index : markdown.length;
    const value = markdown.slice(start, end).trim();
    if (key) {
      sections.set(key, value);
    }
  }

  return sections;
}

function pickSection(sections, aliases) {
  for (const alias of aliases) {
    const value = sections.get(normalizeHeadingKey(alias));
    if (value) {
      return value.trim();
    }
  }
  return '';
}

function parseIdentityFile(filePath) {
  const markdown = fs.readFileSync(filePath, 'utf-8');
  const sections = extractSections(markdown);
  const fallbackId = path.parse(filePath).name;
  const name = pickSection(sections, SECTION_ALIASES.name) || fallbackId;
  const description = pickSection(sections, SECTION_ALIASES.description);
  const avatarUrl = pickSection(sections, SECTION_ALIASES.avatarUrl);
  const personaDefinition = pickSection(sections, SECTION_ALIASES.personaDefinition) || markdown.trim();

  if (!personaDefinition) {
    throw new Error(`Identity ${fallbackId} is missing persona definition`);
  }

  return {
    id: fallbackId,
    name: name.trim(),
    description: description.trim(),
    avatarUrl: avatarUrl.trim(),
    personaDefinition: personaDefinition.trim(),
  };
}

function assertUniqueIdentityNames(identities) {
  const nameToId = new Map();
  for (const identity of identities) {
    const existingId = nameToId.get(identity.name);
    if (existingId && existingId !== identity.id) {
      throw new Error(`Duplicate identity name detected: ${identity.name}`);
    }
    nameToId.set(identity.name, identity.id);
  }
}

function toPublicIdentity(identity) {
  return {
    id: identity.id,
    name: identity.name,
    description: identity.description,
    avatarUrl: identity.avatarUrl,
  };
}

export function getAllIdentities() {
  const identitiesDir = resolveExistingIdentitiesDir();
  if (!fs.existsSync(identitiesDir)) {
    return [];
  }

  const identities = fs.readdirSync(identitiesDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && /\.md$/i.test(entry.name))
    .map(entry => parseIdentityFile(path.join(identitiesDir, entry.name)))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));

  assertUniqueIdentityNames(identities);
  return identities;
}

export function getPublicIdentities() {
  return getAllIdentities().map(toPublicIdentity);
}

export function getIdentityById(id) {
  if (!id) {
    return null;
  }

  return getAllIdentities().find(identity => identity.id === id) || null;
}

export default {
  getAllIdentities,
  getPublicIdentities,
  getIdentityById,
};