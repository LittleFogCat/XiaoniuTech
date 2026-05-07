import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { processMarkdown } from '../utils/markdown';
import { useAppShell } from '../contexts/AppShellContext';

export default function MarkdownEditor({ initialTitle = '', initialContent = '', initialTags = [], onSave, onCancel }) {
  const { t } = useAppShell();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState(initialTags.join(', '));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(initialTitle);
    setContent(initialContent);
    setTags(initialTags.join(', '));
  }, [initialTitle, initialContent, initialTags]);

  function parseTags() {
    return tags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }

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
