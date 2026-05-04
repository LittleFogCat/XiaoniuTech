import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BlogHeader from '../components/BlogHeader';
import { fetchManagePosts, trashPost, restorePost, deletePostPermanently, isLoggedIn } from '../services/blogApi';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function BlogManagePage() {
  const [posts, setPosts] = useState([]);
  const [trashed, setTrashed] = useState([]);
  const [tab, setTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = '文章管理 - XN Blog';
    if (!isLoggedIn()) {
      navigate('/chat', { replace: true });
      return;
    }
    loadData();
  }, [navigate]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await fetchManagePosts();
      setPosts(data.posts || []);
      setTrashed(data.trashed || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleTrash(slug) {
    if (!confirm('确定要删除这篇文章吗？它将移入垃圾桶。')) return;
    setActionLoading(slug);
    try {
      await trashPost(slug);
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRestore(slug) {
    setActionLoading(slug);
    try {
      await restorePost(slug);
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePermanentDelete(slug) {
    if (!confirm('此操作不可撤销，确定要永久删除这篇文章及其所有评论吗？')) return;
    setActionLoading(slug);
    try {
      await deletePostPermanently(slug);
      await loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  const currentList = tab === 'posts' ? posts : trashed;
  const trashCount = trashed.length;

  return (
    <div className="min-h-screen" style={{ background: '#050816' }}>
      <BlogHeader hideBackButton />

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <h1
          className="mb-6 text-2xl font-bold text-white"
          style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}
        >
          文章管理
        </h1>

        <div className="mb-6 flex gap-3 border-b border-slate-700/60">
          <button
            onClick={() => setTab('posts')}
            className={`pb-2.5 text-sm font-medium transition ${
              tab === 'posts'
                ? 'border-b-2 border-sky-400 text-sky-200'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            我的文章 ({posts.length})
          </button>
          <button
            onClick={() => setTab('trashed')}
            className={`pb-2.5 text-sm font-medium transition ${
              tab === 'trashed'
                ? 'border-b-2 border-sky-400 text-sky-200'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            垃圾桶 ({trashCount})
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500">加载中...</div>
        ) : currentList.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            {tab === 'posts' ? '暂无文章' : '垃圾桶为空'}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {currentList.map((post) => (
              <div
                key={post._id}
                className="flex items-center gap-4 rounded-xl border border-slate-700/50 bg-[rgba(15,23,42,0.5)] p-4 backdrop-blur-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/blog/post/${post.slug}`}
                      className="truncate text-sm font-medium text-white transition hover:text-sky-200 sm:text-base"
                    >
                      {post.title}
                    </Link>
                    {!post.published && !post.trashed && (
                      <span className="shrink-0 rounded bg-green-600/80 px-1.5 py-0.5 text-[11px] font-medium text-white">草稿</span>
                    )}
                    {post.trashed && (
                      <span className="shrink-0 rounded bg-red-600/80 px-1.5 py-0.5 text-[11px] font-medium text-white">已删除</span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="text-[11px] text-slate-600 break-all">{post.slug}</span>
                    {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
                    {post.trashedAt && <span>删除于 {formatDate(post.trashedAt)}</span>}
                    <span>{post.viewCount} 阅读</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {tab === 'posts' ? (
                    <>
                      <button
                        onClick={() => navigate(`/blog/edit/${post.slug}`)}
                        className="rounded-lg border border-slate-600/60 bg-slate-800/40 px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:border-slate-500/80 sm:text-xs"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleTrash(post.slug)}
                        disabled={actionLoading === post.slug}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-200 transition hover:border-red-400/50 hover:bg-red-500/20 disabled:opacity-40 sm:text-xs"
                      >
                        删除
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRestore(post.slug)}
                        disabled={actionLoading === post.slug}
                        className="rounded-lg border border-green-500/30 bg-green-500/10 px-2.5 py-1.5 text-[11px] text-green-200 transition hover:border-green-400/50 hover:bg-green-500/20 disabled:opacity-40 sm:text-xs"
                      >
                        恢复
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(post.slug)}
                        disabled={actionLoading === post.slug}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-200 transition hover:border-red-400/50 hover:bg-red-500/20 disabled:opacity-40 sm:text-xs"
                      >
                        永久删除
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
