import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { processMarkdown } from '../utils/markdown';
import { useAppShell } from '../contexts/AppShellContext';

function formatAutosaveStatus(state) {
  switch (state) {
    case 'saving':
      return '自动保存中...';
    case 'saved':
      return '已自动保存';
    case 'error':
      return '自动保存失败';
    default:
      return '';
  }
}

export default function MarkdownEditor({ initialTitle = '', initialContent = '', initialTags = [], onSave, onCancel, onAutosave = null }) {
  const { t } = useAppShell();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState(initialTags.join(', '));
  const [saving, setSaving] = useState(false);
  const [autosaveState, setAutosaveState] = useState('idle');
  const lastSavedSnapshotRef = useRef('');

  const parsedTags = useMemo(
    () => tags
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean),
    [tags]
  );

  const currentSnapshot = useMemo(
    () => JSON.stringify({
      title: title.trim(),
      content,
      tags: parsedTags,
    }),
    [content, parsedTags, title]
  );

  useEffect(() => {
    setTitle(initialTitle);
    setContent(initialContent);
    setTags(initialTags.join(', '));
    lastSavedSnapshotRef.current = JSON.stringify({
      title: initialTitle.trim(),
      content: initialContent,
      tags: initialTags,
    });
    setAutosaveState('idle');
  }, [initialTitle, initialContent, initialTags]);

  function parseTags() {
    return parsedTags;
  }

  useEffect(() => {
    if (!onAutosave) {
      return undefined;
    }

    if (currentSnapshot === lastSavedSnapshotRef.current) {
      return undefined;
    }

    const timerId = window.setTimeout(async () => {
      setAutosaveState('saving');
      try {
        await onAutosave({
          title: title.trim(),
          content,
          tags: parsedTags,
        });
        lastSavedSnapshotRef.current = currentSnapshot;
        setAutosaveState('saved');
      } catch (error) {
        setAutosaveState('error');
      }
    }, 1000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [content, currentSnapshot, onAutosave, parsedTags, title]);

  async function handlePublish() {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), content, tags: parseTags(), published: true });
    } finally {
      setSaving(false);
    }
  }

  async function handleDraft() {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), content, tags: parseTags(), published: false });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0 lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col border-r border-[color:var(--surface-border)]">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('blog.editorTitlePlaceholder')}
          className="w-full border-b border-[color:var(--surface-border)] bg-transparent px-4 py-3 text-xl font-semibold text-[color:var(--text-primary)] placeholder:text-[color:var(--text-faint)] outline-none transition focus:border-[color:var(--accent-border)] sm:px-6 sm:text-2xl"
          style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}
        />

        <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--surface-border)] px-4 py-2.5 sm:px-6">
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={t('blog.editorTagsPlaceholder')}
            className="min-w-0 flex-1 bg-transparent text-xs text-[color:var(--text-secondary)] placeholder:text-[color:var(--text-faint)] outline-none sm:text-sm"
          />
          {onCancel && (
            <button
              onClick={onCancel}
              className="rounded-lg border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 py-1.5 text-xs text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)] sm:text-sm"
            >
              {t('common.cancel')}
            </button>
          )}
          {onAutosave && autosaveState !== 'idle' && (
            <span className="text-xs text-[color:var(--text-faint)] sm:text-sm">{formatAutosaveStatus(autosaveState)}</span>
          )}
          <button
            onClick={handleDraft}
            disabled={saving || !title.trim() || !content.trim()}
            className="rounded-lg border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 py-1.5 text-xs text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40 sm:text-sm"
          >
            {t('blog.saveDraft')}
          </button>
          <button
            onClick={handlePublish}
            disabled={saving || !title.trim() || !content.trim()}
            className="rounded-lg border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1.5 text-xs text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40 sm:text-sm"
          >
            {saving ? t('blog.publishing') : t('blog.publish')}
          </button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('blog.editorContentPlaceholder')}
          className="min-h-0 flex-1 resize-none bg-transparent px-4 py-3 text-sm text-[color:var(--text-secondary)] placeholder:text-[color:var(--text-faint)] outline-none sm:px-6 sm:text-base"
          style={{ fontFamily: "'IBM Plex Mono', 'Noto Sans SC', monospace" }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-[color:var(--text-faint)]">{t('blog.editorPreview')}</div>
        {title && (
          <h1 className="mb-4 text-xl font-bold text-[color:var(--text-primary)] sm:text-2xl" style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}>
            {title}
          </h1>
        )}
        <div className="md-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {processMarkdown(content || t('blog.editorEmptyPreview'))}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
