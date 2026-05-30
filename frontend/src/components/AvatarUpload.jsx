import { useEffect, useRef, useState } from 'react';
import { useAppShell } from '../contexts/AppShellContext';
import { getAuthToken } from '../services/authStorage';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_DIM = 1024;

const LOG_PREFIX = '[AvatarUpload]';

function getExtension(filename) {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx).toLowerCase() : '';
}

function validateFile(file, t) {
  if (!file) return t('avatar.chooseFile');

  const ext = getExtension(file.name);
  console.log(LOG_PREFIX, 'validating file:', file.name, 'ext:', ext, 'type:', file.type, 'size:', file.size);

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return t('avatar.unsupportedType');
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return t('avatar.unsupportedFormat');
  }

  if (file.size > MAX_FILE_SIZE) {
    return t('avatar.fileTooLarge', { size: (file.size / 1024 / 1024).toFixed(1) });
  }

  return null;
}

function resizeImage(file, t) {
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
            reject(new Error(t('avatar.imageProcessFailed')));
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
      reject(new Error(t('avatar.imageLoadFailed')));
    };

    img.src = url;
  });
}

export default function AvatarUpload({ currentUrl, username, onUploaded }) {
  const { t } = useAppShell();
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
    const err = validateFile(file, t);
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
      const resized = await resizeImage(modalFile, t);

      const formData = new FormData();
      formData.append('file', resized);

      const token = getAuthToken();
      console.log(LOG_PREFIX, 'uploading to /api/upload');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t('avatar.uploadFailed'));
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

  return (
    <div>
      <div className="flex items-center gap-4">
        {preview ? (
          <img
            src={preview}
            alt={t('settings.avatar')}
            className="h-20 w-20 cursor-pointer rounded-full border-2 border-[color:var(--surface-border)] object-cover transition hover:border-[color:var(--accent-border)]"
            onClick={openModal}
            title={t('avatar.changeAvatar')}
          />
        ) : (
          <div
            className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-full text-xl font-semibold text-white transition hover:ring-2 hover:ring-sky-400/40"
            style={{
              background: `linear-gradient(135deg, hsl(${avatarHue}, 60%, 45%), hsl(${(avatarHue + 30) % 360}, 60%, 35%))`,
            }}
            onClick={openModal}
            title={t('avatar.uploadAvatar')}
          >
            {avatarLetter}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={openModal}
            className="rounded-lg border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 py-1.5 text-xs text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
          >
            {preview ? t('avatar.changeAvatar') : t('avatar.uploadAvatar')}
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-6 shadow-[var(--surface-shadow)] backdrop-blur-xl">
            <h3 className="mb-4 text-lg font-semibold text-[color:var(--text-primary)]" style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}>
              {t('avatar.modalTitle')}
            </h3>

            <div className="mb-4 flex justify-center">
              {modalPreview ? (
                <img src={modalPreview} alt={t('avatar.previewAlt')} className="h-32 w-32 rounded-full border-2 border-[color:var(--surface-border)] object-cover" />
              ) : preview ? (
                <img src={preview} alt={t('avatar.currentAvatarAlt')} className="h-32 w-32 rounded-full border-2 border-[color:var(--surface-border)] object-cover" />
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
              className="mb-3 w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-2.5 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
            >
              {modalFile ? t('avatar.reselect') : t('avatar.selectImage')}
            </button>

            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp"
              className="hidden"
              onChange={handleFileChange}
            />

            {error && (
              <p className="mb-3 text-xs text-[color:var(--danger-text)]">{error}</p>
            )}

            <p className="mb-4 text-xs text-[color:var(--text-faint)]">{t('avatar.supportHint')}</p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] py-2.5 text-sm text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!modalFile || uploading}
                className="flex-1 rounded-xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] py-2.5 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40"
              >
                {uploading ? t('avatar.uploading') : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
