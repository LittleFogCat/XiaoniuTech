import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { processMarkdown } from '../utils/markdown';

export default function MarkdownEditor({ initialTitle = '', initialContent = '', initialTags = [], onSave, onCancel }) {
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
      <div className="flex min-h-0 flex-1 flex-col border-r border-slate-700/40">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="文章标题..."
          className="w-full border-b border-slate-700/40 bg-transparent px-4 py-3 text-xl font-semibold text-white placeholder-slate-500 outline-none transition focus:border-sky-500/60 sm:px-6 sm:text-2xl"
          style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}
        />

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-700/40 px-4 py-2.5 sm:px-6">
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="标签，用逗号分隔..."
            className="min-w-0 flex-1 bg-transparent text-xs text-slate-300 placeholder-slate-500 outline-none sm:text-sm"
          />
          {onCancel && (
            <button
              onClick={onCancel}
              className="rounded-lg border border-slate-600/60 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500/80 sm:text-sm"
            >
              取消
            </button>
          )}
          <button
            onClick={handleDraft}
            disabled={saving || !title.trim() || !content.trim()}
            className="rounded-lg border border-slate-600/60 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500/80 disabled:opacity-40 sm:text-sm"
          >
            存草稿
          </button>
          <button
            onClick={handlePublish}
            disabled={saving || !title.trim() || !content.trim()}
            className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-100 transition hover:border-sky-400/50 hover:bg-sky-500/20 disabled:opacity-40 sm:text-sm"
          >
            {saving ? '发布中...' : '发布'}
          </button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="使用 Markdown 编写内容..."
          className="min-h-0 flex-1 resize-none bg-transparent px-4 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none sm:px-6 sm:text-base"
          style={{ fontFamily: "'IBM Plex Mono', 'Noto Sans SC', monospace" }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-3">预览</div>
        {title && (
          <h1 className="mb-4 text-xl font-bold text-white sm:text-2xl" style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}>
            {title}
          </h1>
        )}
        <div className="md-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {processMarkdown(content || '*暂无内容*')}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
