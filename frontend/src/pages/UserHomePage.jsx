import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BlogPageLayout from '../components/layout/BlogPageLayout';
import usePageSeo from '../hooks/usePageSeo';
import { fetchPosts } from '../services/blogApi';
import { useAppShell } from '../contexts/AppShellContext';

export default function UserHomePage({ nickname: propNickname }) {
  const { t, formatDate, formatNumber } = useAppShell();
  const { nickname: paramNickname } = useParams();
  const nickname = propNickname || paramNickname;
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  usePageSeo({
    title: nickname ? `${nickname} - ${t('common.blogName')}` : t('blog.pageTitle'),
    description: profile?.bio || `${nickname || 'XiaoNiu'} 的技术文章、长期写作与公开发布内容。`,
    canonicalPath: nickname && nickname !== 'XiaoNiu' ? `/blog/${encodeURIComponent(nickname)}` : '/blog',
    image: profile?.avatarUrl || '/image/niu.jpg',
  });

  useEffect(() => {
    if (!nickname) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/users/${encodeURIComponent(nickname)}`).then((r) => r.json()).catch(() => ({ user: null })),
      fetch(`/api/blog/users/${encodeURIComponent(nickname)}/posts?page=${page}&limit=20`).then((r) => r.json()).catch(() => ({ posts: [], total: 0 })),
    ])
      .then(([userData, postsData]) => {
        setProfile(userData.user || null);
        setPosts(postsData.posts || []);
        setTotal(postsData.total || 0);
        setTotalWords(postsData.totalWords || 0);
        setTotalPages(postsData.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [nickname, page]);

  const avatarLetter = (profile?.nickname || nickname || '?').charAt(0).toUpperCase();
  const avatarHue = (profile?.nickname || nickname || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <BlogPageLayout
      headerProps={{ contentWidth: 'max-w-4xl' }}
      mainClassName="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8"
    >
        {loading ? (
          <div className="py-12 text-center text-[color:var(--text-faint)]">{t('common.loading')}</div>
        ) : !profile ? (
          <div className="py-12 text-center">
            <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">{t('blog.userNotFound')}</h1>
            <Link to="/blog" className="mt-4 inline-block text-[color:var(--accent-solid)] underline">{t('blog.backToBlog')}</Link>
          </div>
        ) : (
          <>
            <div className="mb-8 rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-6 backdrop-blur-sm">
              <div className="flex items-center gap-5">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.nickname} className="h-20 w-20 rounded-full border-2 border-[color:var(--surface-border)] object-cover" />
                ) : (
                  <div
                    className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-xl font-semibold text-white"
                    style={{ background: `linear-gradient(135deg, hsl(${avatarHue}, 60%, 45%), hsl(${(avatarHue + 30) % 360}, 60%, 35%))` }}
                  >
                    {avatarLetter}
                  </div>
                )}
                <div>
                  <h1
                    className="text-xl font-bold text-[color:var(--text-primary)] sm:text-2xl"
                    style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}
                  >
                    {profile.nickname}
                  </h1>
                  {profile.bio && (
                    <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--text-muted)]">{profile.bio}</p>
                  )}
                  <div className="mt-3 flex gap-4 text-xs text-[color:var(--text-faint)]">
                    <span>{t('blog.articleCount', { count: formatNumber(total) })}</span>
                    <span>{t('blog.wordCount', { count: formatNumber(totalWords) })}</span>
                  </div>
                </div>
              </div>
            </div>

            <h2 className="mb-4 text-lg font-semibold text-[color:var(--text-primary)]" style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}>
              {t('blog.articlesTitle')}
            </h2>

            {posts.length === 0 ? (
              <div className="py-8 text-center text-[color:var(--text-faint)]">{t('blog.noPosts')}</div>
            ) : (
              <div className="flex flex-col gap-4">
                {posts.map((post) => (
                  <Link
                    key={post._id}
                    to={`/blog/post/${post.slug}`}
                    className="block rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-5 backdrop-blur-sm transition hover:border-[color:var(--accent-border)] sm:p-6"
                  >
                    <h3 className="text-lg font-semibold text-[color:var(--text-primary)] sm:text-xl" style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}>
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[color:var(--text-muted)]">{post.excerpt}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[color:var(--text-faint)]">{formatDate(post.publishedAt)}</span>
                      {post.tags.map((t) => (
                        <span key={t} className="rounded-md border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] px-2 py-0.5 text-[11px] text-[color:var(--text-muted)]">{t}</span>
                      ))}
                      <span className="text-xs text-[color:var(--text-faint)]">{t('blog.mixedStats', { views: formatNumber(post.viewCount), likes: formatNumber(post.likes || 0), comments: formatNumber(post.commentCount || 0) })}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 py-1.5 text-xs text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40">{t('common.previousPage')}</button>
                <span className="text-xs text-[color:var(--text-muted)]">{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-3 py-1.5 text-xs text-[color:var(--text-secondary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40">{t('common.nextPage')}</button>
              </div>
            )}
          </>
        )}
    </BlogPageLayout>
  );
}
