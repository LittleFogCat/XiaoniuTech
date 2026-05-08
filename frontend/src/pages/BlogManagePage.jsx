import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BlogHeader from '../components/BlogHeader';
import usePageSeo from '../hooks/usePageSeo';
import { fetchManagePosts, trashPost, restorePost, deletePostPermanently, isLoggedIn, updatePost } from '../services/blogApi';
import { useAppShell } from '../contexts/AppShellContext';

export default function BlogManagePage() {
  const { t, formatDate, formatNumber } = useAppShell();
  const [posts, setPosts] = useState([]);
  const [trashed, setTrashed] = useState([]);
  const [selectedByTab, setSelectedByTab] = useState({ posts: [], trashed: [] });
  const [batchModeByTab, setBatchModeByTab] = useState({ posts: false, trashed: false });
  const [tab, setTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const navigate = useNavigate();

  usePageSeo({
    title: t('blog.managePageTitle'),
    description: '博客文章管理、回收站与批量操作后台页。',
    robots: 'noindex, nofollow',
  });

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/chat', { replace: true });
      return;
    }
    loadData();
  }, [navigate, t]);

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
        throw new Error(failed[0].reason?.message || t('blog.bulkActionFailed'));
      }

      clearCurrentSelection();
      await loadData();

      if (successMessage) {
        window.alert(successMessage.replace('{count}', String(slugs.length)));
      }
    } catch (err) {
      window.alert(err.message || t('blog.bulkActionFailed'));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleTrash(slug) {
    await runBulkAction({
      loadingKey: `trash:${slug}`,
      confirmMessage: t('blog.trashConfirmOne'),
      successMessage: t('blog.movedToTrash', { count: '{count}' }),
      emptyMessage: t('blog.emptyDelete'),
      slugs: [slug],
      mutate: trashPost,
    });
  }

  async function handleRestore(slug) {
    await runBulkAction({
      loadingKey: `restore:${slug}`,
      successMessage: t('blog.restoredPosts', { count: '{count}' }),
      emptyMessage: t('blog.emptyRestore'),
      slugs: [slug],
      mutate: restorePost,
    });
  }

  async function handlePermanentDelete(slug) {
    await runBulkAction({
      loadingKey: `permanent-delete:${slug}`,
      confirmMessage: t('blog.permanentDeleteConfirmOne'),
      successMessage: t('blog.permanentlyDeleted', { count: '{count}' }),
      emptyMessage: t('blog.emptyPermanentDelete'),
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
      successMessage: t('blog.publishedPosts', { count: '{count}' }),
      emptyMessage: t('blog.emptyDraftPublish'),
      slugs: selectedDraftSlugs,
      mutate: (slug) => updatePost(slug, { published: true }),
    });
  }

  async function handleBulkUnpublish() {
    await runBulkAction({
      loadingKey: 'bulk-unpublish',
      successMessage: t('blog.unpublishedPosts', { count: '{count}' }),
      emptyMessage: t('blog.emptyPublishedUnpublish'),
      slugs: selectedPublishedSlugs,
      mutate: (slug) => updatePost(slug, { published: false }),
    });
  }

  async function handlePublish(slug) {
    await runBulkAction({
      loadingKey: `publish:${slug}`,
      successMessage: t('blog.publishedPosts', { count: '{count}' }),
      emptyMessage: t('blog.emptyDraftPublish'),
      slugs: [slug],
      mutate: (currentSlug) => updatePost(currentSlug, { published: true }),
    });
  }

  async function handleUnpublish(slug) {
    await runBulkAction({
      loadingKey: `unpublish:${slug}`,
      successMessage: t('blog.unpublishedPosts', { count: '{count}' }),
      emptyMessage: t('blog.emptyPublishedUnpublish'),
      slugs: [slug],
      mutate: (currentSlug) => updatePost(currentSlug, { published: false }),
    });
  }

  async function handleBulkTrash() {
    await runBulkAction({
      loadingKey: 'bulk-trash',
      confirmMessage: t('blog.trashConfirmMany', { count: selectedSlugs.length }),
      successMessage: t('blog.movedToTrash', { count: '{count}' }),
      emptyMessage: t('blog.emptyDelete'),
      slugs: selectedSlugs,
      mutate: trashPost,
    });
  }

  async function handleBulkRestore() {
    await runBulkAction({
      loadingKey: 'bulk-restore',
      successMessage: t('blog.restoredPosts', { count: '{count}' }),
      emptyMessage: t('blog.emptyRestore'),
      slugs: selectedSlugs,
      mutate: restorePost,
    });
  }

  async function handleBulkPermanentDelete() {
    await runBulkAction({
      loadingKey: 'bulk-permanent-delete',
      confirmMessage: t('blog.permanentDeleteConfirmMany', { count: selectedSlugs.length }),
      successMessage: t('blog.permanentlyDeleted', { count: '{count}' }),
      emptyMessage: t('blog.emptyPermanentDelete'),
      slugs: selectedSlugs,
      mutate: deletePostPermanently,
    });
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[color:var(--text-primary)]">
      <BlogHeader hideBackButton contentWidth="max-w-4xl" showSearch={false} />

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <h1
          className="mb-6 text-2xl font-bold text-[color:var(--text-primary)]"
          style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}
        >
          {t('blog.managePageTitle').replace(' - XN Blog', '')}
        </h1>

        <div className="mb-6 flex items-end justify-between gap-4 border-b border-[color:var(--surface-border)]">
          <div className="flex gap-3">
            <button
              onClick={() => setTab('posts')}
              className={`pb-2.5 text-sm font-medium transition ${
                tab === 'posts'
                  ? 'border-b-2 border-[color:var(--accent-border)] text-[color:var(--text-primary)]'
                  : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]'
              }`}
            >
              {t('blog.myPosts', { count: formatNumber(posts.length) })}
            </button>
            <button
              onClick={() => setTab('trashed')}
              className={`pb-2.5 text-sm font-medium transition ${
                tab === 'trashed'
                  ? 'border-b-2 border-[color:var(--accent-border)] text-[color:var(--text-primary)]'
                  : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]'
              }`}
            >
              {t('blog.trashBin', { count: formatNumber(trashCount) })}
            </button>
          </div>

          {currentList.length > 0 && (
            <button
              type="button"
              onClick={() => setCurrentBatchMode(!batchMode)}
              className={`mb-2 rounded-lg border px-3 py-1.5 text-xs transition sm:text-sm ${
                batchMode
                  ? 'border-[color:var(--surface-border)] bg-[var(--surface-hover)] text-[color:var(--text-primary)]'
                  : 'border-[color:var(--accent-border)] bg-[var(--accent-soft)] text-[color:var(--text-primary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              {batchMode ? t('blog.batchModeOff') : t('blog.batchModeOn')}
            </button>
          )}
        </div>

        {!loading && currentList.length > 0 && batchMode && (
          <div className="mb-5 rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-4 backdrop-blur-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3 text-sm text-[color:var(--text-secondary)]">
                <label className="inline-flex items-center gap-2 text-sm text-[color:var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={allCurrentSelected}
                    onChange={toggleSelectAllCurrent}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900/70 text-sky-400 focus:ring-sky-500/40"
                  />
                  <span>{t('blog.selectAllCurrent')}</span>
                </label>
                <span className="text-[color:var(--text-muted)]">{t('blog.selectedCount', { count: formatNumber(selectedSlugs.length) })}</span>
                {selectedSlugs.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCurrentSelection}
                    className="text-sm text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)]"
                  >
                    {t('blog.clearSelection')}
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
                      className="rounded-lg border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1.5 text-xs text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40 sm:text-sm"
                    >
                      {t('blog.bulkPublish')}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(actionLoading) || selectedPublishedSlugs.length === 0}
                      onClick={handleBulkUnpublish}
                      className="rounded-lg border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-3 py-1.5 text-xs text-[color:var(--warning-text)] transition hover:opacity-85 disabled:opacity-40 sm:text-sm"
                    >
                      {t('blog.bulkUnpublish')}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(actionLoading) || selectedSlugs.length === 0}
                      onClick={handleBulkTrash}
                      className="rounded-lg border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-3 py-1.5 text-xs text-[color:var(--danger-text)] transition hover:opacity-85 disabled:opacity-40 sm:text-sm"
                    >
                      {t('blog.bulkDelete')}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={Boolean(actionLoading) || selectedSlugs.length === 0}
                      onClick={handleBulkRestore}
                      className="rounded-lg border border-[color:var(--success-border)] bg-[var(--success-soft)] px-3 py-1.5 text-xs text-[color:var(--success-text)] transition hover:opacity-85 disabled:opacity-40 sm:text-sm"
                    >
                      {t('blog.bulkRestore')}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(actionLoading) || selectedSlugs.length === 0}
                      onClick={handleBulkPermanentDelete}
                      className="rounded-lg border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-3 py-1.5 text-xs text-[color:var(--danger-text)] transition hover:opacity-85 disabled:opacity-40 sm:text-sm"
                    >
                      {t('blog.bulkPermanentDelete')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-[color:var(--text-faint)]">{t('common.loading')}</div>
        ) : currentList.length === 0 ? (
          <div className="py-12 text-center text-[color:var(--text-faint)]">
            {tab === 'posts' ? t('blog.noPosts') : t('blog.trashEmpty')}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {currentList.map((post) => (
              <div
                key={post._id}
                className="flex items-center gap-4 rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-4 backdrop-blur-sm"
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
                      className="truncate text-sm font-medium text-[color:var(--text-primary)] transition hover:text-[color:var(--accent-solid)] sm:text-base"
                    >
                      {post.title}
                    </Link>
                    {!post.published && !post.trashed && (
                      <span className="shrink-0 rounded bg-[var(--success-text)] px-1.5 py-0.5 text-[11px] font-medium text-white">{t('common.draft')}</span>
                    )}
                    {post.trashed && (
                      <span className="shrink-0 rounded bg-[var(--danger-text)] px-1.5 py-0.5 text-[11px] font-medium text-white">{t('common.deleted')}</span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[color:var(--text-faint)]">
                    <span className="break-all text-[11px] text-[color:var(--text-faint)]">{post.slug}</span>
                    {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
                    {post.trashedAt && <span>{t('blog.deletedAt', { date: formatDate(post.trashedAt, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) })}</span>}
                    <span>{t('blog.readCount', { count: formatNumber(post.viewCount) })}</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {tab === 'posts' ? (
                    <>
                      <button
                        onClick={() => navigate(`/blog/edit/${post.slug}`)}
                        disabled={Boolean(actionLoading)}
                        className="rounded-lg border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] px-2.5 py-1.5 text-[11px] text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)] sm:text-xs"
                      >
                        {t('common.edit')}
                      </button>
                      {post.published ? (
                        <button
                          onClick={() => handleUnpublish(post.slug)}
                          disabled={Boolean(actionLoading)}
                          className="rounded-lg border border-[color:var(--warning-border)] bg-[var(--warning-soft)] px-2.5 py-1.5 text-[11px] text-[color:var(--warning-text)] transition hover:opacity-85 disabled:opacity-40 sm:text-xs"
                        >
                          {t('blog.unpublish')}
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePublish(post.slug)}
                          disabled={Boolean(actionLoading)}
                          className="rounded-lg border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-2.5 py-1.5 text-[11px] text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40 sm:text-xs"
                        >
                          {t('blog.publish')}
                        </button>
                      )}
                      <button
                        onClick={() => handleTrash(post.slug)}
                        disabled={Boolean(actionLoading)}
                        className="rounded-lg border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-2.5 py-1.5 text-[11px] text-[color:var(--danger-text)] transition hover:opacity-85 disabled:opacity-40 sm:text-xs"
                      >
                        {t('common.delete')}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRestore(post.slug)}
                        disabled={Boolean(actionLoading)}
                        className="rounded-lg border border-[color:var(--success-border)] bg-[var(--success-soft)] px-2.5 py-1.5 text-[11px] text-[color:var(--success-text)] transition hover:opacity-85 disabled:opacity-40 sm:text-xs"
                      >
                        {t('common.restore')}
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(post.slug)}
                        disabled={Boolean(actionLoading)}
                        className="rounded-lg border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-2.5 py-1.5 text-[11px] text-[color:var(--danger-text)] transition hover:opacity-85 disabled:opacity-40 sm:text-xs"
                      >
                        {t('common.permanentDelete')}
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
