import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BlogHeader from '../components/BlogHeader';
import BlogSidebar from '../components/BlogSidebar';
import usePageSeo from '../hooks/usePageSeo';
import { fetchPosts, isLoggedIn } from '../services/blogApi';
import { useAppShell } from '../contexts/AppShellContext';

export default function BlogListPage() {
  const { t, formatDate, formatNumber } = useAppShell();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
  const tag = searchParams.get('tag') || '';
  const [search, setSearch] = useState('');

  usePageSeo({
    title: t('blog.pageTitle'),
    description: '技术文章、标签筛选与博客归档列表。',
    canonicalPath: tag ? `/blog?tag=${encodeURIComponent(tag)}` : '/blog',
  });

  useEffect(() => {
    setLoading(true);
    fetchPosts({ page, limit: 20, search: search || undefined, tag: tag || undefined })
      .then((data) => {
        setPosts(data.posts || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search, tag]);

  function handleSearch(query) {
    setSearch(query);
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    setSearchParams(params, { replace: true });
  }

  const handlePageChange = useCallback(
    (newPage) => {
      const params = new URLSearchParams(searchParams);
      if (newPage <= 1) {
        params.delete('page');
      } else {
        params.set('page', newPage);
      }
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[color:var(--text-primary)]">
      <BlogHeader onSearch={handleSearch} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <div className="min-w-0 flex-1">
            {tag && (
              <div className="mb-4 text-sm text-[color:var(--text-muted)]">
                {t('blog.tagFilter')} <span className="text-[color:var(--accent-solid)]">{tag}</span>
                {' '}
                <button onClick={() => setSearchParams({})} className="text-[color:var(--text-faint)] underline transition hover:text-[color:var(--text-primary)]">
                  {t('common.clear')}
                </button>
              </div>
            )}

            {loading ? (
              <div className="py-12 text-center text-[color:var(--text-faint)]">{t('common.loading')}</div>
            ) : posts.length === 0 ? (
              <div className="py-12 text-center text-[color:var(--text-faint)]">
                {search ? t('blog.noMatchedPosts') : t('blog.noPosts')}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {posts.map((post) => (
                  <Link
                    key={post._id}
                    to={`/blog/post/${post.slug}`}
                    className="block rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-5 backdrop-blur-sm transition hover:border-[color:var(--accent-border)] sm:p-6"
                  >
                    <div className="flex items-start gap-2">
                      <h2
                        className="text-lg font-semibold text-[color:var(--text-primary)] transition group-hover:text-[color:var(--accent-solid)] sm:text-xl"
                        style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}
                      >
                        {post.title}
                      </h2>
                      {!post.published && (
                        <span className="shrink-0 rounded bg-[var(--success-text)] px-1.5 py-0.5 text-[11px] font-medium text-white">{t('common.draft')}</span>
                      )}
                    </div>
                    {post.excerpt && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[color:var(--text-muted)]">{post.excerpt}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[color:var(--text-faint)]">{formatDate(post.publishedAt)}</span>
                      {post.tags.map((t) => (
                        <span key={t} className="rounded-md border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] px-2 py-0.5 text-[11px] text-[color:var(--text-muted)]">
                          {t}
                        </span>
                      ))}
                      <span className="text-xs text-[color:var(--text-faint)]">{t('blog.readCount', { count: formatNumber(post.viewCount) })}</span>
                      <span className="text-xs text-[color:var(--text-faint)]">{t('blog.likeCount', { count: formatNumber(post.likes || 0) })}</span>
                      <span className="text-xs text-[color:var(--text-faint)]">{t('blog.commentCount', { count: formatNumber(post.commentCount || 0) })}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                  className="rounded-lg border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 py-1.5 text-xs text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40 sm:text-sm"
                >
                  {t('common.previousPage')}
                </button>
                <span className="text-xs text-[color:var(--text-muted)]">{page} / {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(page + 1)}
                  className="rounded-lg border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 py-1.5 text-xs text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40 sm:text-sm"
                >
                  {t('common.nextPage')}
                </button>
              </div>
            )}
          </div>

          <div className="w-full lg:w-72 lg:shrink-0">
            <BlogSidebar />
          </div>
        </div>
      </main>
    </div>
  );
}
