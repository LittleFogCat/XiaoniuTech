import { useEffect, useState } from 'react';
import { fetchComments, addComment, isLoggedIn } from '../services/blogApi';
import { Link } from 'react-router-dom';
import { useAppShell } from '../contexts/AppShellContext';

function CommentAvatar({ authorProfile }) {
  const nickname = authorProfile?.nickname || '?';
  const avatarUrl = authorProfile?.avatarUrl || '';
  const hue = nickname.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  const avatarEl = avatarUrl ? (
    <img src={avatarUrl} alt={nickname} className="h-full w-full rounded-full object-cover" />
  ) : (
    <span className="text-xs font-semibold text-white">{nickname.charAt(0).toUpperCase()}</span>
  );

  return (
    <Link
      to={`/blog/${encodeURIComponent(nickname)}`}
      className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full sm:h-9 sm:w-9"
      style={avatarUrl ? {} : { background: `linear-gradient(135deg, hsl(${hue}, 60%, 45%), hsl(${hue + 30}, 60%, 35%))` }}
    >
      {avatarEl}
    </Link>
  );
}

export default function BlogComment({ slug }) {
  const { t, formatDate, formatNumber } = useAppShell();
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const loggedIn = isLoggedIn();

  useEffect(() => {
    fetchComments(slug, { page }).then((data) => {
      setComments(data.comments || []);
      setTotal(data.total || 0);
    }).catch(() => {});
  }, [slug, page]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      const comment = await addComment(slug, content.trim());
      setComments((prev) => [comment, ...prev]);
      setTotal((t) => t + 1);
      setContent('');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="mt-8 border-t border-[color:var(--surface-border)] pt-6">
      <h3 className="mb-4 text-base font-semibold text-[color:var(--text-primary)] sm:text-lg" style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}>
        {t('blog.commentsTitle', { count: formatNumber(total) })}
      </h3>

      {loggedIn ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('blog.commentPlaceholder')}
            rows={3}
            className="w-full resize-none rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-faint)] outline-none transition focus:border-[color:var(--accent-border)] sm:text-base"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className="rounded-lg border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-4 py-1.5 text-xs text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40 sm:text-sm"
            >
              {submitting ? t('blog.commentSubmitting') : t('blog.submitComment')}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6 rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-4 text-center text-sm text-[color:var(--text-muted)]">
          <Link to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`} className="text-[color:var(--accent-solid)] underline transition hover:opacity-80">
            {t('blog.loginToComment')}
          </Link>
        </div>
      )}

      {comments.length === 0 && (
        <p className="py-4 text-center text-sm text-[color:var(--text-faint)]">{t('blog.noComments')}</p>
      )}

      <div className="flex flex-col gap-4">
        {comments.map((comment) => (
          <div key={comment._id} className="flex gap-3">
            <CommentAvatar authorProfile={comment.authorProfile} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  to={`/blog/${encodeURIComponent(comment.authorProfile?.nickname || comment.author)}`}
                  className="text-sm font-medium text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)]"
                >
                  {comment.authorProfile?.nickname || comment.author}
                </Link>
                <span className="text-xs text-[color:var(--text-faint)]">{formatDate(comment.createdAt, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-[color:var(--text-secondary)]">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 py-1.5 text-xs text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40"
          >
            {t('common.previousPage')}
          </button>
          <span className="text-xs text-[color:var(--text-muted)]">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 py-1.5 text-xs text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40"
          >
            {t('common.nextPage')}
          </button>
        </div>
      )}
    </div>
  );
}
