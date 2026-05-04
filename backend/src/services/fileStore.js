import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import File from '../models/File.js';

export const ALLOWED_IMAGE_MIMETYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const IMAGE_LINK_PATTERN = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const REMOTE_IMAGE_FETCH_TIMEOUT_MS = 15000;

const EXTENSION_BY_MIMETYPE = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const MIMETYPE_BY_EXTENSION = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

const UPLOAD_DIR = (() => {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'xntech', 'images');
  }
  return '/app/files';
})();

let uploadDirReady = false;

function normalizeMimetype(mimetype = '') {
  return String(mimetype).split(';')[0].trim().toLowerCase();
}

function getExtensionFromName(filename = '') {
  const ext = path.extname(filename).toLowerCase();
  return ext || '';
}

function resolveMimetype({ originalName = '', mimetype = '' }) {
  const normalized = normalizeMimetype(mimetype);
  if (normalized) {
    return normalized;
  }
  return MIMETYPE_BY_EXTENSION[getExtensionFromName(originalName)] || 'application/octet-stream';
}

function resolveExtension({ originalName = '', mimetype = '' }) {
  const ext = getExtensionFromName(originalName);
  if (ext) {
    return ext;
  }
  return EXTENSION_BY_MIMETYPE[resolveMimetype({ originalName, mimetype })] || '.bin';
}

function generateFilename({ originalName, mimetype }) {
  const ext = resolveExtension({ originalName, mimetype });
  const hash = crypto.randomBytes(12).toString('hex');
  return `${hash}${ext}`;
}

function buildLocalFileUrl(fileId) {
  return `/api/files/${fileId}`;
}

function extractLocalFileId(url) {
  const match = String(url).match(/\/api\/files\/([a-f\d]{24})(?:[?#/].*)?$/i);
  return match ? match[1] : null;
}

export async function ensureUploadDir() {
  if (!uploadDirReady) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    uploadDirReady = true;
  }
}

export function createFileMd5(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeBufferToNewFile({ buffer, originalName, mimetype, md5 }) {
  await ensureUploadDir();
  const filename = generateFilename({ originalName, mimetype });
  const filepath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(filepath, buffer);

  const file = await File.create({
    filename,
    originalName,
    path: filepath,
    size: buffer.length,
    mimetype,
    md5,
  });

  return file.toObject();
}

export async function storeFileBuffer({ buffer, originalName, mimetype }) {
  const normalizedMimetype = resolveMimetype({ originalName, mimetype });
  const md5 = createFileMd5(buffer);

  const existing = await File.findOne({
    md5,
    size: buffer.length,
    mimetype: normalizedMimetype,
  });

  if (existing) {
    if (await fileExists(existing.path)) {
      return { file: existing.toObject(), created: false };
    }

    const filename = generateFilename({ originalName, mimetype: normalizedMimetype });
    const filepath = path.join(UPLOAD_DIR, filename);
    await ensureUploadDir();
    await fs.writeFile(filepath, buffer);

    existing.filename = filename;
    existing.path = filepath;
    existing.originalName = existing.originalName || originalName;
    existing.md5 = md5;
    await existing.save();
    return { file: existing.toObject(), created: false };
  }

  const file = await writeBufferToNewFile({
    buffer,
    originalName,
    mimetype: normalizedMimetype,
    md5,
  });

  return { file, created: true };
}

function getOriginalNameFromUrl(url, mimetype) {
  try {
    const parsed = new URL(url);
    const filename = path.basename(parsed.pathname);
    if (filename && filename !== '/') {
      return filename;
    }
  } catch {
  }
  return `image${resolveExtension({ mimetype })}`;
}

async function downloadImageFile(url) {
  let response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(REMOTE_IMAGE_FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': 'XiaoniuTechBot/1.0',
      },
    });
  } catch (error) {
    const wrappedError = new Error(`下载图片失败: ${url}`);
    wrappedError.cause = error;
    throw wrappedError;
  }

  if (!response.ok) {
    throw new Error(`下载图片失败: ${url}`);
  }

  const mimetype = resolveMimetype({
    originalName: getOriginalNameFromUrl(url),
    mimetype: response.headers.get('content-type') || '',
  });

  if (!ALLOWED_IMAGE_MIMETYPES.includes(mimetype)) {
    throw new Error(`暂不支持该图片类型: ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const { file } = await storeFileBuffer({
    buffer,
    originalName: getOriginalNameFromUrl(url, mimetype),
    mimetype,
  });

  return file;
}

export async function materializeMarkdownImages(markdown = '') {
  const matches = [...String(markdown).matchAll(IMAGE_LINK_PATTERN)];
  if (matches.length === 0) {
    return { content: markdown, fileIds: [] };
  }

  const replacements = new Map();
  const fileIds = new Set();

  for (const match of matches) {
    const originalUrl = match[1];
    if (!originalUrl) {
      continue;
    }

    const localFileId = extractLocalFileId(originalUrl);
    if (localFileId) {
      fileIds.add(localFileId);
      continue;
    }

    if (!/^https?:\/\//i.test(originalUrl)) {
      continue;
    }

    if (!replacements.has(originalUrl)) {
      try {
        const file = await downloadImageFile(originalUrl);
        replacements.set(originalUrl, buildLocalFileUrl(file._id));
        fileIds.add(String(file._id));
      } catch (error) {
        console.warn('[materialize-markdown-images] skip remote image:', originalUrl, error.message);
      }
    }
  }

  const content = String(markdown).replace(IMAGE_LINK_PATTERN, (fullMatch, url) => {
    const nextUrl = replacements.get(url);
    return nextUrl ? fullMatch.replace(url, nextUrl) : fullMatch;
  });

  return {
    content,
    fileIds: [...fileIds],
  };
}

async function computeFileMd5FromPath(filePath) {
  const buffer = await fs.readFile(filePath);
  return createFileMd5(buffer);
}

export async function backfillFileMd5sInBackground() {
  const cursor = File.find({
    $or: [{ md5: { $exists: false } }, { md5: '' }, { md5: null }],
  }).cursor();

  try {
    for await (const file of cursor) {
      try {
        const md5 = await computeFileMd5FromPath(file.path);
        file.md5 = md5;
        await file.save();
      } catch (error) {
        console.error('[file-md5-backfill] failed for', file._id, error.message);
      }
    }
  } catch (error) {
    console.error('[file-md5-backfill] background task failed:', error.message);
  }
}