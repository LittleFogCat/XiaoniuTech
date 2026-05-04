import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BlogHeader from '../components/BlogHeader';
import BlogSidebar from '../components/BlogSidebar';
import { fetchPosts, isLoggedIn } from '../services/blogApi';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function BlogListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
  const tag = searchParams.get('tag') || '';
  const [search, setSearch] = useState('');

  useEffect(() => {
    document.title = 'XN Blog';
  }, []);

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
    <div className="min-h-screen" style={{ background: '#050816' }}>
      <BlogHeader onSearch={handleSearch} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <div className="min-w-0 flex-1">
            {tag && (
              <div className="mb-4 text-sm text-slate-400">
                标签：<span className="text-sky-300">{tag}</span>
                {' '}
                <button onClick={() => setSearchParams({})} className="text-slate-500 underline transition hover:text-slate-300">
                  清除
                </button>
              </div>
            )}

            {loading ? (
              <div className="py-12 text-center text-slate-500">加载中...</div>
            ) : posts.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                {search ? '未找到匹配的文章' : '暂无文章'}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {posts.map((post) => (
                  <Link
                    key={post._id}
                    to={`/blog/post/${post.slug}`}
                    className="block rounded-2xl border border-slate-700/50 bg-[rgba(15,23,42,0.5)] p-5 backdrop-blur-sm transition hover:border-sky-500/30 sm:p-6"
                  >
                    <div className="flex items-start gap-2">
                      <h2
                        className="text-lg font-semibold text-white transition group-hover:text-sky-200 sm:text-xl"
                        style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}
                      >
                        {post.title}
                      </h2>
                      {!post.published && (
                        <span className="shrink-0 rounded bg-green-600/80 px-1.5 py-0.5 text-[11px] font-medium text-white">草稿</span>
                      )}
                    </div>
                    {post.excerpt && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-400">{post.excerpt}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-500">{formatDate(post.publishedAt)}</span>
                      {post.tags.map((t) => (
                        <span key={t} className="rounded-md border border-slate-600/40 bg-slate-800/40 px-2 py-0.5 text-[11px] text-slate-400">
                          {t}
                        </span>
                      ))}
                      <span className="text-xs text-slate-600">{post.viewCount} 阅读</span>
                      <span className="text-xs text-slate-600">{post.likes || 0} 赞</span>
                      <span className="text-xs text-slate-600">{post.commentCount || 0} 评论</span>
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
                  className="rounded-lg border border-slate-600/60 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500/80 disabled:opacity-40 sm:text-sm"
                >
                  上一页
                </button>
                <span className="text-xs text-slate-400">{page} / {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(page + 1)}
                  className="rounded-lg border border-slate-600/60 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500/80 disabled:opacity-40 sm:text-sm"
                >
                  下一页
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
