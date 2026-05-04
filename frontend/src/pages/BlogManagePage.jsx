import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BlogHeader from '../components/BlogHeader';
import { fetchManagePosts, trashPost, restorePost, deletePostPermanently, isLoggedIn, updatePost } from '../services/blogApi';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function BlogManagePage() {
  const [posts, setPosts] = useState([]);
  const [trashed, setTrashed] = useState([]);
  const [selectedByTab, setSelectedByTab] = useState({ posts: [], trashed: [] });
  const [batchModeByTab, setBatchModeByTab] = useState({ posts: false, trashed: false });
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
      const nextPosts = data.posts || [];
      const nextTrashed = data.trashed || [];
      setPosts(nextPosts);
      setTrashed(nextTrashed);
      setSelectedByTab((prev) => ({
        posts: prev.posts.filter((slug) => nextPosts.some((post) => post.slug === slug)),
        trashed: prev.trashed.filter((slug) => nextTrashed.some((post) => post.slug === slug)),
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function updateSelection(updater) {
    setSelectedByTab((prev) => ({
      ...prev,
      [tab]: updater(prev[tab]),
    }));
  }

  function toggleSelection(slug) {
    updateSelection((current) => (
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug]
    ));
  }

  function toggleSelectAllCurrent() {
    updateSelection((current) => (
      current.length === currentList.length ? [] : currentList.map((post) => post.slug)
    ));
  }

  function clearCurrentSelection() {
    updateSelection(() => []);
  }

  function setCurrentBatchMode(enabled) {
    setBatchModeByTab((prev) => ({
      ...prev,
      [tab]: enabled,
    }));

    if (!enabled) {
      clearCurrentSelection();
    }
  }

  async function runBulkAction({
    loadingKey,
    confirmMessage,
    successMessage,
    emptyMessage,
    slugs,
    mutate,
  }) {
    if (slugs.length === 0) {
      window.alert(emptyMessage);
      return;
    }

    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    setActionLoading(loadingKey);
    try {
      const results = await Promise.allSettled(slugs.map((slug) => mutate(slug)));
      const failed = results.filter((result) => result.status === 'rejected');

      if (failed.length > 0) {
        throw new Error(failed[0].reason?.message || '批量操作失败');
      }

      clearCurrentSelection();
      await loadData();

      if (successMessage) {
        window.alert(successMessage.replace('{count}', String(slugs.length)));
      }
    } catch (err) {
      window.alert(err.message || '批量操作失败');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleTrash(slug) {
    await runBulkAction({
      loadingKey: `trash:${slug}`,
      confirmMessage: '确定要删除这篇文章吗？它将移入垃圾桶。',
      successMessage: '已将 {count} 篇文章移入垃圾桶。',
      emptyMessage: '未选择要删除的文章。',
      slugs: [slug],
      mutate: trashPost,
    });
  }

  async function handleRestore(slug) {
    await runBulkAction({
      loadingKey: `restore:${slug}`,
      successMessage: '已恢复 {count} 篇文章。',
      emptyMessage: '未选择要恢复的文章。',
      slugs: [slug],
      mutate: restorePost,
    });
  }

  async function handlePermanentDelete(slug) {
    await runBulkAction({
      loadingKey: `permanent-delete:${slug}`,
      confirmMessage: '此操作不可撤销，确定要永久删除这篇文章及其所有评论吗？',
      successMessage: '已永久删除 {count} 篇文章。',
      emptyMessage: '未选择要永久删除的文章。',
      slugs: [slug],
      mutate: deletePostPermanently,
    });
  }

  const currentList = tab === 'posts' ? posts : trashed;
  const trashCount = trashed.length;
  const batchMode = batchModeByTab[tab];
  const selectedSlugs = selectedByTab[tab];
  const selectedSet = new Set(selectedSlugs);
  const allCurrentSelected = currentList.length > 0 && currentList.every((post) => selectedSet.has(post.slug));
  const selectedDraftSlugs = posts.filter((post) => selectedSet.has(post.slug) && !post.published).map((post) => post.slug);
  const selectedPublishedSlugs = posts.filter((post) => selectedSet.has(post.slug) && post.published).map((post) => post.slug);

  async function handleBulkPublish() {
    await runBulkAction({
      loadingKey: 'bulk-publish',
      successMessage: '已发布 {count} 篇文章。',
      emptyMessage: '请选择至少一篇草稿文章。',
      slugs: selectedDraftSlugs,
      mutate: (slug) => updatePost(slug, { published: true }),
    });
  }

  async function handleBulkUnpublish() {
    await runBulkAction({
      loadingKey: 'bulk-unpublish',
      successMessage: '已将 {count} 篇文章撤回为草稿。',
      emptyMessage: '请选择至少一篇已发布文章。',
      slugs: selectedPublishedSlugs,
      mutate: (slug) => updatePost(slug, { published: false }),
    });
  }

  async function handleBulkTrash() {
    await runBulkAction({
      loadingKey: 'bulk-trash',
      confirmMessage: `确定要将选中的 ${selectedSlugs.length} 篇文章移入垃圾桶吗？`,
      successMessage: '已将 {count} 篇文章移入垃圾桶。',
      emptyMessage: '请选择至少一篇文章。',
      slugs: selectedSlugs,
      mutate: trashPost,
    });
  }

  async function handleBulkRestore() {
    await runBulkAction({
      loadingKey: 'bulk-restore',
      successMessage: '已恢复 {count} 篇文章。',
      emptyMessage: '请选择至少一篇垃圾桶中的文章。',
      slugs: selectedSlugs,
      mutate: restorePost,
    });
  }

  async function handleBulkPermanentDelete() {
    await runBulkAction({
      loadingKey: 'bulk-permanent-delete',
      confirmMessage: `此操作不可撤销，确定要永久删除选中的 ${selectedSlugs.length} 篇文章及其评论吗？`,
      successMessage: '已永久删除 {count} 篇文章。',
      emptyMessage: '请选择至少一篇垃圾桶中的文章。',
      slugs: selectedSlugs,
      mutate: deletePostPermanently,
    });
  }

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

        <div className="mb-6 flex items-end justify-between gap-4 border-b border-slate-700/60">
          <div className="flex gap-3">
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

          {currentList.length > 0 && (
            <button
              type="button"
              onClick={() => setCurrentBatchMode(!batchMode)}
              className={`mb-2 rounded-lg border px-3 py-1.5 text-xs transition sm:text-sm ${
                batchMode
                  ? 'border-slate-500/70 bg-slate-700/45 text-slate-100 hover:border-slate-400/80'
                  : 'border-sky-500/30 bg-sky-500/10 text-sky-100 hover:border-sky-400/50 hover:bg-sky-500/20'
              }`}
            >
              {batchMode ? '完成批量管理' : '批量管理'}
            </button>
          )}
        </div>

        {!loading && currentList.length > 0 && batchMode && (
          <div className="mb-5 rounded-2xl border border-slate-700/60 bg-[rgba(15,23,42,0.45)] p-4 backdrop-blur-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={allCurrentSelected}
                    onChange={toggleSelectAllCurrent}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900/70 text-sky-400 focus:ring-sky-500/40"
                  />
                  <span>全选当前列表</span>
                </label>
                <span className="text-slate-400">已选 {selectedSlugs.length} 篇</span>
                {selectedSlugs.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCurrentSelection}
                    className="text-sm text-slate-400 transition hover:text-slate-200"
                  >
                    清空选择
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {tab === 'posts' ? (
                  <>
                    <button
                      type="button"
                      disabled={Boolean(actionLoading) || selectedDraftSlugs.length === 0}
                      onClick={handleBulkPublish}
                      className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-100 transition hover:border-sky-400/50 hover:bg-sky-500/20 disabled:opacity-40 sm:text-sm"
                    >
                      批量发布
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(actionLoading) || selectedPublishedSlugs.length === 0}
                      onClick={handleBulkUnpublish}
                      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-100 transition hover:border-amber-400/50 hover:bg-amber-500/20 disabled:opacity-40 sm:text-sm"
                    >
                      批量撤回
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(actionLoading) || selectedSlugs.length === 0}
                      onClick={handleBulkTrash}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 transition hover:border-red-400/50 hover:bg-red-500/20 disabled:opacity-40 sm:text-sm"
                    >
                      批量删除
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={Boolean(actionLoading) || selectedSlugs.length === 0}
                      onClick={handleBulkRestore}
                      className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs text-green-200 transition hover:border-green-400/50 hover:bg-green-500/20 disabled:opacity-40 sm:text-sm"
                    >
                      批量恢复
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(actionLoading) || selectedSlugs.length === 0}
                      onClick={handleBulkPermanentDelete}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 transition hover:border-red-400/50 hover:bg-red-500/20 disabled:opacity-40 sm:text-sm"
                    >
                      批量永久删除
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

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
                {batchMode && (
                  <label className="inline-flex shrink-0 items-center justify-center self-start pt-1">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(post.slug)}
                      onChange={() => toggleSelection(post.slug)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900/70 text-sky-400 focus:ring-sky-500/40"
                    />
                  </label>
                )}

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
                        disabled={Boolean(actionLoading)}
                        className="rounded-lg border border-slate-600/60 bg-slate-800/40 px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:border-slate-500/80 sm:text-xs"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleTrash(post.slug)}
                        disabled={Boolean(actionLoading)}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-200 transition hover:border-red-400/50 hover:bg-red-500/20 disabled:opacity-40 sm:text-xs"
                      >
                        删除
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRestore(post.slug)}
                        disabled={Boolean(actionLoading)}
                        className="rounded-lg border border-green-500/30 bg-green-500/10 px-2.5 py-1.5 text-[11px] text-green-200 transition hover:border-green-400/50 hover:bg-green-500/20 disabled:opacity-40 sm:text-xs"
                      >
                        恢复
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(post.slug)}
                        disabled={Boolean(actionLoading)}
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
