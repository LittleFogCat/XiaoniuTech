import { Router } from 'express';
import fs from 'fs/promises';
import multer from 'multer';
import sharp from 'sharp';
import { requireAuth } from '../middleware/auth.js';
import FileModel from '../models/File.js';
import { ALLOWED_IMAGE_MIMETYPES, storeFileBuffer } from '../services/fileStore.js';

const router = Router();
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(req, file, cb) {
    if (!ALLOWED_IMAGE_MIMETYPES.includes(file.mimetype)) {
      const error = new Error('不支持的文件类型，仅允许 JPEG、PNG、GIF、WebP');
      error.statusCode = 400;
      return cb(error);
    }
    cb(null, true);
  },
});

async function resizeImage(buffer, mimetype) {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  const maxDim = 1024;
  const longEdge = Math.max(metadata.width || 0, metadata.height || 0);

  if (longEdge <= maxDim) {
    return image.toBuffer();
  }

  const format = mimetype === 'image/png' ? 'png' : 'jpeg';
  const resizeOptions = longEdge === (metadata.width || 0)
    ? { width: maxDim }
    : { height: maxDim };

  return image
    .resize({ ...resizeOptions, withoutEnlargement: true, fit: 'inside' })
    .toFormat(format, { quality: 85 })
    .toBuffer();
}

router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择文件' });
    }

    const processed = await resizeImage(req.file.buffer, req.file.mimetype);
    const { file, created } = await storeFileBuffer({
      buffer: processed,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
    });

    res.status(created ? 201 : 200).json({
      file: {
        id: file._id,
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
        mimetype: file.mimetype,
        md5: file.md5,
        createdAt: file.createdAt,
      },
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message || '上传失败' });
  }
});

router.get('/files/:id', async (req, res) => {
  try {
    const file = await FileModel.findById(req.params.id).lean();
    if (!file) {
      return res.status(404).json({ error: '文件不存在' });
    }

    try {
      await fs.access(file.path);
    } catch {
      return res.status(404).json({ error: '文件已被删除' });
    }

    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(file.path);
  } catch (error) {
    res.status(500).json({ error: error.message || '获取文件失败' });
  }
});

export default router;
