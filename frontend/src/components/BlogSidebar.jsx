import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTags, fetchStats } from '../services/blogApi';

export default function BlogSidebar() {
  const [tags, setTags] = useState([]);
  const [stats, setStats] = useState({ totalPosts: 0, totalWords: 0 });

  useEffect(() => {
    fetchTags().then(setTags).catch(() => {});
    fetchStats().then(setStats).catch(() => {});
  }, []);

  return (
    <aside className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-700/50 bg-[rgba(15,23,42,0.6)] p-5 backdrop-blur-sm">
        <div className="mb-4 text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}>
          XiaoNiu
        </div>
        <p className="text-xs leading-relaxed text-slate-400 sm:text-sm">
          全栈开发者，专注于 Web 技术与 AI 应用。
        </p>
        <div className="mt-4 flex gap-4 text-xs text-slate-400">
          <div>
            <span className="block text-base font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {stats.totalPosts}
            </span>
            <span>文章</span>
          </div>
          <div>
            <span className="block text-base font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {stats.totalWords.toLocaleString()}
            </span>
            <span>总字数</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/50 bg-[rgba(15,23,42,0.6)] p-5 backdrop-blur-sm">
        <h3 className="mb-3 text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}>
          标签合集
        </h3>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.name}
                to={`/blog?tag=${encodeURIComponent(tag.name)}`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-600/40 bg-slate-800/40 px-2.5 py-1 text-xs text-slate-300 transition hover:border-sky-500/40 hover:text-sky-200"
              >
                {tag.name}
                <span className="text-slate-500">{tag.count}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">暂无标签</p>
        )}
      </div>
    </aside>
  );
}
