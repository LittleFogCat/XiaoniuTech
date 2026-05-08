import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { processMarkdown } from '../utils/markdown';
import BlogHeader from '../components/BlogHeader';
import BlogComment from '../components/BlogComment';
import usePageSeo from '../hooks/usePageSeo';
import { fetchPost, incrementViewCount, isLoggedIn, likePost, unlikePost, isPostLiked, markPostLiked, markPostUnliked } from '../services/blogApi';
import { useAppShell } from '../contexts/AppShellContext';

function stripMarkdownForSeo(content) {
  return String(content || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function BlogPostPage() {
  const { t, formatDate, formatNumber } = useAppShell();
  const { slug } = useParams();
  const siteOrigin = typeof window === 'undefined' ? '' : window.location.origin;
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastViewIncrement = useRef(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const seoDescription = (post?.excerpt || stripMarkdownForSeo(post?.content || '') || t('blog.postMissing')).slice(0, 120);

  usePageSeo({
    title: post ? `${post.title} - ${t('common.blogName')}` : `文章 - ${t('common.blogName')}`,
    description: seoDescription,
    canonicalPath: slug ? `/blog/post/${encodeURIComponent(slug)}` : '/blog',
    image: '/image/niu.jpg',
    ogType: post?.published ? 'article' : 'website',
    jsonLd: post && siteOrigin
      ? {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: seoDescription,
          image: `${siteOrigin}/image/niu.jpg`,
          datePublished: post.publishedAt,
          dateModified: post.updatedAt || post.publishedAt,
          author: {
            '@type': 'Person',
            name: post.author || 'XiaoNiu',
          },
          mainEntityOfPage: `${siteOrigin}/blog/post/${encodeURIComponent(post.slug || slug || '')}`,
        }
      : null,
  });

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchPost(slug)
      .then((p) => {
        setPost(p);
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
        <p className="text-[color:var(--text-faint)]">{t('common.loading')}</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] text-[color:var(--text-primary)]">
        <BlogHeader hideBackButton contentWidth="max-w-4xl" />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">{t('blog.postNotFound')}</h1>
          <p className="mt-2 text-[color:var(--text-muted)]">{error || t('blog.postMissing')}</p>
          <Link to="/blog" className="mt-4 inline-block text-[color:var(--accent-solid)] underline">{t('blog.backToBlog')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[color:var(--text-primary)]">
      <BlogHeader hideBackButton contentWidth="max-w-4xl" />

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <article>
          <header className="mb-6">
            <div className="flex items-start gap-3">
              <h1
                className="text-2xl font-bold text-[color:var(--text-primary)] sm:text-3xl"
                style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}
              >
                {post.title}
              </h1>
              {!post.published && (
                <span className="shrink-0 rounded bg-[var(--success-text)] px-1.5 py-0.5 text-[11px] font-medium text-white">{t('common.draft')}</span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[color:var(--text-muted)]">
              <span>{formatDate(post.publishedAt)}</span>
              <span>{t('blog.readCountLong', { count: formatNumber(post.viewCount) })}</span>
              <span>{t('blog.likeCountLong', { count: formatNumber(post.likes ?? likeCount) })}</span>
              {post.tags && post.tags.length > 0 && post.tags.map((t) => (
                <Link
                  key={t}
                  to={`/blog?tag=${encodeURIComponent(t)}`}
                  className="rounded-md border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] px-2 py-0.5 text-xs text-[color:var(--text-muted)] transition hover:border-[color:var(--accent-border)] hover:text-[color:var(--text-primary)]"
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
                      ? 'border-[color:var(--danger-border)] bg-[var(--danger-soft)] text-[color:var(--danger-text)] hover:opacity-85'
                      : 'border-[color:var(--surface-border)] bg-[var(--surface-bg)] text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {liked ? t('blog.liked') : t('blog.like')} ({formatNumber(likeCount)})
                </button>
              )}
              {isAuthor && (
                <button
                  onClick={() => navigate(`/blog/edit/${post.slug}`)}
                  className="rounded-lg border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1.5 text-xs text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
                >
                  {t('blog.editPost')}
                </button>
              )}
            </div>
          </header>

          <div className="md-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {processMarkdown(post.content)}
            </ReactMarkdown>
          </div>
        </article>

        {post.published && <BlogComment slug={slug} />}
      </main>
    </div>
  );
}
