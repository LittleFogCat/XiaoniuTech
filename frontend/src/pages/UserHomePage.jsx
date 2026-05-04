import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BlogHeader from '../components/BlogHeader';
import { fetchPosts } from '../services/blogApi';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function UserHomePage({ nickname: propNickname }) {
  const { nickname: paramNickname } = useParams();
  const nickname = propNickname || paramNickname;
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = nickname ? `${nickname} - XN Blog` : 'XN Blog';
  }, [nickname]);

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
    <div className="min-h-screen" style={{ background: '#050816' }}>
      <BlogHeader contentWidth="max-w-4xl" />

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        {loading ? (
          <div className="py-12 text-center text-slate-500">加载中...</div>
        ) : !profile ? (
          <div className="py-12 text-center">
            <h1 className="text-2xl font-bold text-white">用户不存在</h1>
            <Link to="/blog" className="mt-4 inline-block text-sky-300 underline">返回博客首页</Link>
          </div>
        ) : (
          <>
            <div className="mb-8 rounded-2xl border border-slate-700/50 bg-[rgba(15,23,42,0.6)] p-6 backdrop-blur-sm">
              <div className="flex items-center gap-5">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.nickname} className="h-20 w-20 rounded-full border-2 border-slate-600/60 object-cover" />
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
                    className="text-xl font-bold text-white sm:text-2xl"
                    style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}
                  >
                    {profile.nickname}
                  </h1>
                  {profile.bio && (
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{profile.bio}</p>
                  )}
                  <div className="mt-3 flex gap-4 text-xs text-slate-500">
                    <span>{total} 篇文章</span>
                    <span>{totalWords.toLocaleString()} 字</span>
                  </div>
                </div>
              </div>
            </div>

            <h2 className="mb-4 text-lg font-semibold text-white" style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}>
              文章
            </h2>

            {posts.length === 0 ? (
              <div className="py-8 text-center text-slate-500">暂无文章</div>
            ) : (
              <div className="flex flex-col gap-4">
                {posts.map((post) => (
                  <Link
                    key={post._id}
                    to={`/blog/post/${post.slug}`}
                    className="block rounded-2xl border border-slate-700/50 bg-[rgba(15,23,42,0.5)] p-5 backdrop-blur-sm transition hover:border-sky-500/30 sm:p-6"
                  >
                    <h3 className="text-lg font-semibold text-white sm:text-xl" style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}>
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-400">{post.excerpt}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-500">{formatDate(post.publishedAt)}</span>
                      {post.tags.map((t) => (
                        <span key={t} className="rounded-md border border-slate-600/40 bg-slate-800/40 px-2 py-0.5 text-[11px] text-slate-400">{t}</span>
                      ))}
                      <span className="text-xs text-slate-600">{post.viewCount} 阅读 · {post.likes || 0} 赞 · {post.commentCount || 0} 评论</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-600/60 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500/80 disabled:opacity-40">上一页</button>
                <span className="text-xs text-slate-400">{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-600/60 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500/80 disabled:opacity-40">下一页</button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
