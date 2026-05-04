import { useEffect, useState } from 'react';
import { fetchComments, addComment, isLoggedIn } from '../services/blogApi';
import { Link } from 'react-router-dom';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

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
    <div className="mt-8 border-t border-slate-700/60 pt-6">
      <h3 className="mb-4 text-base font-semibold text-white sm:text-lg" style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}>
        评论 ({total})
      </h3>

      {loggedIn ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你的评论..."
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-600/60 bg-slate-800/50 px-3.5 py-2.5 text-sm text-white placeholder-slate-400 outline-none transition focus:border-sky-500/50 sm:text-base"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs text-sky-100 transition hover:border-sky-400/50 hover:bg-sky-500/20 disabled:opacity-40 sm:text-sm"
            >
              {submitting ? '提交中...' : '发表评论'}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 text-center text-sm text-slate-400">
          <Link to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`} className="text-sky-300 underline transition hover:text-sky-200">
            登录
          </Link>
          {' 后即可发表评论'}
        </div>
      )}

      {comments.length === 0 && (
        <p className="py-4 text-center text-sm text-slate-500">暂无评论</p>
      )}

      <div className="flex flex-col gap-4">
        {comments.map((comment) => (
          <div key={comment._id} className="flex gap-3">
            <CommentAvatar authorProfile={comment.authorProfile} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  to={`/blog/${encodeURIComponent(comment.authorProfile?.nickname || comment.author)}`}
                  className="text-sm font-medium text-slate-200 transition hover:text-sky-200"
                >
                  {comment.authorProfile?.nickname || comment.author}
                </Link>
                <span className="text-xs text-slate-500">{formatDate(comment.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-slate-600/60 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500/80 disabled:opacity-40"
          >
            上一页
          </button>
          <span className="text-xs text-slate-400">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-600/60 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500/80 disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
