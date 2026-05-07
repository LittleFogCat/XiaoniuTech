import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const BACKEND_ROOT = path.resolve(__dirname, '../..');
const BACKEND_CONFIG_DIR = '/app/config';
const IDENTITIES_JSON_FILE = 'identities.json';
const PERSONA_DIR_NAME = 'persona';

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

  const bundledDir = path.resolve(PROJECT_ROOT, 'conf', 'backend', 'identities');
  if (fs.existsSync(bundledDir)) {
    return bundledDir;
  }

  return configuredDir;
}

function resolveIdentityConfigFiles(identitiesDir) {
  return {
    identitiesDir,
    catalogPath: path.join(identitiesDir, IDENTITIES_JSON_FILE),
    personaDir: path.join(identitiesDir, PERSONA_DIR_NAME),
  };
}

function ensureMarkdownExtension(fileName = '') {
  const trimmed = String(fileName).trim();
  if (!trimmed) {
    return '';
  }

  return path.extname(trimmed) ? trimmed : `${trimmed}.md`;
}

function readMarkdownFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8').trim();
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

function parseLegacyIdentityFile(filePath) {
  const markdown = readMarkdownFile(filePath);
  const sections = extractSections(markdown);
  const fallbackId = path.parse(filePath).name;
  const name = pickSection(sections, SECTION_ALIASES.name) || fallbackId;
  const role = '';
  const description = pickSection(sections, SECTION_ALIASES.description);
  const avatarUrl = pickSection(sections, SECTION_ALIASES.avatarUrl);
  const personaDefinition = pickSection(sections, SECTION_ALIASES.personaDefinition) || markdown.trim();

  if (!personaDefinition) {
    throw new Error(`Identity ${fallbackId} is missing persona definition`);
  }

  return {
    id: fallbackId,
    name: name.trim(),
    role,
    description: description.trim(),
    avatarUrl: avatarUrl.trim(),
    personaDefinition: personaDefinition.trim(),
    seedFile: path.basename(filePath),
  };
}

function readPersonaDefinition(filePath) {
  const markdown = readMarkdownFile(filePath);
  if (!markdown) {
    throw new Error(`Identity persona file ${path.basename(filePath)} is empty`);
  }

  const isPersonaFile = path.basename(path.dirname(filePath)) === PERSONA_DIR_NAME;
  if (isPersonaFile) {
    return markdown;
  }

  const sections = extractSections(markdown);
  return pickSection(sections, SECTION_ALIASES.personaDefinition) || markdown;
}

function resolvePersonaCandidatePaths(entry, configFiles) {
  const candidates = [];
  const seen = new Set();

  const addCandidate = (baseDir, value) => {
    const resolvedName = ensureMarkdownExtension(value);
    if (!resolvedName) {
      return;
    }

    const resolvedPath = path.isAbsolute(resolvedName)
      ? resolvedName
      : path.join(baseDir, resolvedName);
    const normalizedPath = path.normalize(resolvedPath);
    if (!seen.has(normalizedPath)) {
      seen.add(normalizedPath);
      candidates.push(resolvedPath);
    }
  };

  const personaRef = typeof entry.persona === 'string' ? entry.persona.trim() : '';
  const id = typeof entry.id === 'string' ? entry.id.trim() : '';

  addCandidate(configFiles.personaDir, personaRef);
  addCandidate(configFiles.identitiesDir, personaRef);

  if (id && id !== personaRef) {
    addCandidate(configFiles.personaDir, id);
    addCandidate(configFiles.identitiesDir, id);
  }

  return candidates;
}

function parseJsonIdentityEntry(entry, configFiles) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error('Each identity entry in identities.json must be an object');
  }

  const fallbackId = String(entry.id || entry.persona || entry.name || '').trim();
  if (!fallbackId) {
    throw new Error('Identity entry is missing id/name/persona');
  }

  const id = fallbackId;
  const name = String(entry.name || id).trim();
  const role = String(entry.role || '').trim();
  const description = String(entry.description ?? entry.desc ?? '').trim();
  const avatarUrl = String(entry.avatarUrl ?? entry.avatar ?? '').trim();
  const personaPath = resolvePersonaCandidatePaths(entry, configFiles).find(candidate => fs.existsSync(candidate));

  if (!personaPath) {
    throw new Error(`Identity ${id} persona file not found`);
  }

  const personaDefinition = readPersonaDefinition(personaPath).trim();
  if (!personaDefinition) {
    throw new Error(`Identity ${id} is missing persona definition`);
  }

  return {
    id,
    name,
    role,
    description,
    avatarUrl,
    personaDefinition,
    seedFile: path.relative(configFiles.identitiesDir, personaPath).replace(/\\/g, '/'),
  };
}

function loadSeedIdentitiesFromJson(configFiles) {
  if (!fs.existsSync(configFiles.catalogPath)) {
    return null;
  }

  const raw = fs.readFileSync(configFiles.catalogPath, 'utf-8').trim();
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('identities.json must export an array of identity entries');
  }

  return parsed
    .map(entry => parseJsonIdentityEntry(entry, configFiles))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
}

function loadSeedIdentitiesFromLegacyMarkdown(identitiesDir) {
  return fs.readdirSync(identitiesDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && /\.md$/i.test(entry.name))
    .map(entry => parseLegacyIdentityFile(path.join(identitiesDir, entry.name)))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
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

export function toPublicIdentity(identity) {
  const id = identity?.id || identity?._id?.toString?.() || String(identity?._id || '');
  return {
    id,
    name: identity.name,
    role: identity.role || '',
    description: identity.description,
    avatarUrl: identity.avatarUrl,
  };
}

export function loadSeedIdentities() {
  const identitiesDir = resolveExistingIdentitiesDir();
  if (!fs.existsSync(identitiesDir)) {
    return [];
  }

  const configFiles = resolveIdentityConfigFiles(identitiesDir);
  const identities = loadSeedIdentitiesFromJson(configFiles) ?? loadSeedIdentitiesFromLegacyMarkdown(identitiesDir);

  assertUniqueIdentityNames(identities);
  return identities;
}

export default {
  loadSeedIdentities,
  toPublicIdentity,
  resolveExistingIdentitiesDir,
  resolveIdentitiesDirPath,
};