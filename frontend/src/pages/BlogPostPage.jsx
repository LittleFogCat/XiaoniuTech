import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import BlogHeader from '../components/BlogHeader';
import BlogComment from '../components/BlogComment';
import { fetchPost, incrementViewCount, isLoggedIn, likePost, unlikePost, isPostLiked, markPostLiked, markPostUnliked } from '../services/blogApi';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastViewIncrement = useRef(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchPost(slug)
      .then((p) => {
        setPost(p);
        document.title = p ? `${p.title} - XN Blog` : 'XN Blog';
        setLiked(isPostLiked(slug));
        setLikeCount(p?.likes || 0);
        if (p && p.published && lastViewIncrement.current !== slug) {
          lastViewIncrement.current = slug;
          incrementViewCount(slug);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleLike = useCallback(async () => {
    if (!slug || likeLoading) return;
    setLikeLoading(true);
    try {
      if (liked) {
        const count = await unlikePost(slug);
        markPostUnliked(slug);
        setLiked(false);
        setLikeCount(count);
      } else {
        const count = await likePost(slug);
        markPostLiked(slug);
        setLiked(true);
        setLikeCount(count);
      }
    } catch (err) {
      console.error('Like error:', err);
    } finally {
      setLikeLoading(false);
    }
  }, [slug, liked, likeLoading]);

  const loggedIn = isLoggedIn();
  const isAuthor = loggedIn && post && localStorage.getItem('auth_token');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050816' }}>
        <p className="text-slate-500">加载中...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen" style={{ background: '#050816' }}>
        <BlogHeader hideBackButton contentWidth="max-w-4xl" />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-white">文章不存在</h1>
          <p className="mt-2 text-slate-400">{error || '该文章未找到或已被删除'}</p>
          <Link to="/blog" className="mt-4 inline-block text-sky-300 underline">返回博客首页</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#050816' }}>
      <BlogHeader hideBackButton contentWidth="max-w-4xl" />

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <article>
          <header className="mb-6">
            <div className="flex items-start gap-3">
              <h1
                className="text-2xl font-bold text-white sm:text-3xl"
                style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}
              >
                {post.title}
              </h1>
              {!post.published && (
                <span className="shrink-0 rounded bg-green-600/80 px-1.5 py-0.5 text-[11px] font-medium text-white">草稿</span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-400">
              <span>{formatDate(post.publishedAt)}</span>
              <span>{post.viewCount} 次阅读</span>
              <span>{post.likes ?? likeCount} 次点赞</span>
              {post.tags && post.tags.length > 0 && post.tags.map((t) => (
                <Link
                  key={t}
                  to={`/blog?tag=${encodeURIComponent(t)}`}
                  className="rounded-md border border-slate-600/40 bg-slate-800/40 px-2 py-0.5 text-xs text-slate-400 transition hover:border-sky-500/40 hover:text-sky-200"
                >
                  {t}
                </Link>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {post.published && (
                <button
                  onClick={handleLike}
                  disabled={likeLoading}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition disabled:opacity-40 sm:text-sm ${
                    liked
                      ? 'border-red-500/30 bg-red-500/10 text-red-200 hover:border-red-400/50'
                      : 'border-slate-600/60 bg-slate-800/40 text-slate-200 hover:border-slate-500/80'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {liked ? '已赞' : '点赞'} ({likeCount})
                </button>
              )}
              {isAuthor && (
                <button
                  onClick={() => navigate(`/blog/edit/${post.slug}`)}
                  className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-100 transition hover:border-sky-400/50 hover:bg-sky-500/20"
                >
                  编辑文章
                </button>
              )}
            </div>
          </header>

          <div className="md-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>
        </article>

        {post.published && <BlogComment slug={slug} />}
      </main>
    </div>
  );
}
