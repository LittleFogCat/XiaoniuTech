import { useEffect, useRef, useState } from 'react';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_DIM = 1024;

const LOG_PREFIX = '[AvatarUpload]';

function getExtension(filename) {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx).toLowerCase() : '';
}

function validateFile(file) {
  if (!file) return '请选择文件';

  const ext = getExtension(file.name);
  console.log(LOG_PREFIX, 'validating file:', file.name, 'ext:', ext, 'type:', file.type, 'size:', file.size);

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return '不支持的文件类型，仅允许 JPEG、PNG、GIF、WebP';
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return '不支持的图片格式';
  }

  if (file.size > MAX_FILE_SIZE) {
    return `文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），上限为 5MB`;
  }

  return null;
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    console.log(LOG_PREFIX, 'resizing image...');

    img.onload = () => {
      URL.revokeObjectURL(url);

      const { width, height } = img;
      const longEdge = Math.max(width, height);
      console.log(LOG_PREFIX, 'image dimensions:', width, 'x', height, 'longEdge:', longEdge);

      if (longEdge <= MAX_DIM) {
        console.log(LOG_PREFIX, 'no resize needed');
        resolve(file);
        return;
      }

      const scale = MAX_DIM / longEdge;
      const newWidth = Math.round(width * scale);
      const newHeight = Math.round(height * scale);
      console.log(LOG_PREFIX, 'resizing to:', newWidth, 'x', newHeight);

      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('图片处理失败'));
            return;
          }
          const resized = new File([blob], file.name, { type: file.type });
          console.log(LOG_PREFIX, 'resize complete, new size:', resized.size);
          resolve(resized);
        },
        file.type,
        0.85,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };

    img.src = url;
  });
}

export default function AvatarUpload({ currentUrl, username, onUploaded }) {
  const [preview, setPreview] = useState(currentUrl || '');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFile, setModalFile] = useState(null);
  const [modalPreview, setModalPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    console.log(LOG_PREFIX, 'currentUrl changed:', currentUrl);
    setPreview(currentUrl || '');
  }, [currentUrl]);

  const avatarLetter = username ? username.charAt(0).toUpperCase() : '?';
  const avatarHue = username
    ? username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
    : 0;

  function openModal() {
    console.log(LOG_PREFIX, 'opening modal');
    setModalOpen(true);
    setModalFile(null);
    setModalPreview(null);
    setError(null);
  }

  function closeModal() {
    console.log(LOG_PREFIX, 'closing modal');
    setModalOpen(false);
    setModalFile(null);
    setModalPreview(null);
    setError(null);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log(LOG_PREFIX, 'file selected in modal:', file.name);
    const err = validateFile(file);
    if (err) {
      setError(err);
      setModalFile(null);
      setModalPreview(null);
      return;
    }

    setError(null);
    setModalFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setModalPreview(reader.result);
      console.log(LOG_PREFIX, 'preview generated');
    };
    reader.readAsDataURL(file);
  }

  async function handleConfirm() {
    if (!modalFile) return;

    console.log(LOG_PREFIX, 'confirm upload');
    setUploading(true);
    setError(null);

    try {
      const resized = await resizeImage(modalFile);

      const formData = new FormData();
      formData.append('file', resized);

      const token = localStorage.getItem('auth_token');
      console.log(LOG_PREFIX, 'uploading to /api/upload');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '上传失败');
      }

      const data = await res.json();
      const url = `/api/files/${data.file.id}`;
      console.log(LOG_PREFIX, 'upload success, fileId:', data.file.id, 'url:', url);

      setPreview(url);
      onUploaded(data.file.id, url);
      closeModal();
    } catch (err) {
      console.error(LOG_PREFIX, 'upload failed:', err.message);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    console.log(LOG_PREFIX, 'removing avatar');
    setPreview('');
    onUploaded(null, '');
    setError(null);
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        {preview ? (
          <img
            src={preview}
            alt="头像"
            className="h-20 w-20 cursor-pointer rounded-full border-2 border-slate-600/60 object-cover transition hover:border-sky-400/60"
            onClick={openModal}
            title="点击修改头像"
          />
        ) : (
          <div
            className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-full text-xl font-semibold text-white transition hover:ring-2 hover:ring-sky-400/40"
            style={{
              background: `linear-gradient(135deg, hsl(${avatarHue}, 60%, 45%), hsl(${(avatarHue + 30) % 360}, 60%, 35%))`,
            }}
            onClick={openModal}
            title="点击上传头像"
          >
            {avatarLetter}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={openModal}
            className="rounded-lg border border-slate-600/60 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500/80"
          >
            {preview ? '更换头像' : '上传头像'}
          </button>
          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 transition hover:border-red-400/50"
            >
              移除头像
            </button>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-700/60 bg-[linear-gradient(180deg,rgba(30,41,59,0.96),rgba(15,23,42,0.98))] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.3)] backdrop-blur-xl">
            <h3 className="mb-4 text-lg font-semibold text-white" style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}>
              修改头像
            </h3>

            <div className="mb-4 flex justify-center">
              {modalPreview ? (
                <img src={modalPreview} alt="预览" className="h-32 w-32 rounded-full border-2 border-slate-600/60 object-cover" />
              ) : preview ? (
                <img src={preview} alt="当前头像" className="h-32 w-32 rounded-full border-2 border-slate-600/60 object-cover" />
              ) : (
                <div
                  className="flex h-32 w-32 items-center justify-center rounded-full text-3xl font-semibold text-white"
                  style={{
                    background: `linear-gradient(135deg, hsl(${avatarHue}, 60%, 45%), hsl(${(avatarHue + 30) % 360}, 60%, 35%))`,
                  }}
                >
                  {avatarLetter}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mb-3 w-full rounded-xl border border-slate-600/60 bg-slate-800/40 px-4 py-2.5 text-sm text-slate-200 transition hover:border-slate-500/80"
            >
              {modalFile ? '重新选择' : '选择图片'}
            </button>

            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp"
              className="hidden"
              onChange={handleFileChange}
            />

            {error && (
              <p className="mb-3 text-xs text-red-400">{error}</p>
            )}

            <p className="mb-4 text-xs text-slate-500">支持 JPEG / PNG / GIF / WebP，最大 5MB，长边自动缩放至 1024px</p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 rounded-xl border border-slate-600/60 bg-slate-800/40 py-2.5 text-sm text-slate-300 transition hover:border-slate-500/80"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!modalFile || uploading}
                className="flex-1 rounded-xl border border-sky-500/30 bg-sky-500/10 py-2.5 text-sm text-sky-100 transition hover:border-sky-400/50 hover:bg-sky-500/20 disabled:opacity-40"
              >
                {uploading ? '上传中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
