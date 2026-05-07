import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTags, fetchStats } from '../services/blogApi';
import { useAppShell } from '../contexts/AppShellContext';

export default function BlogSidebar() {
  const { t, formatNumber } = useAppShell();
  const [tags, setTags] = useState([]);
  const [stats, setStats] = useState({ totalPosts: 0, totalWords: 0 });

  useEffect(() => {
    fetchTags().then(setTags).catch(() => {});
    fetchStats().then(setStats).catch(() => {});
  }, []);

  return (
    <aside className="flex flex-col gap-6">
      <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-5 backdrop-blur-sm">
        <div className="mb-4 text-sm font-semibold text-[color:var(--text-primary)]" style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}>
          XiaoNiu
        </div>
        <p className="text-xs leading-relaxed text-[color:var(--text-muted)] sm:text-sm">
          {t('blog.sidebarIntro')}
        </p>
        <div className="mt-4 flex gap-4 text-xs text-[color:var(--text-muted)]">
          <div>
            <span className="block text-base font-semibold text-[color:var(--text-primary)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {formatNumber(stats.totalPosts)}
            </span>
            <span>{t('common.articles')}</span>
          </div>
          <div>
            <span className="block text-base font-semibold text-[color:var(--text-primary)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {formatNumber(stats.totalWords)}
            </span>
            <span>{t('blog.totalWords')}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-5 backdrop-blur-sm">
        <h3 className="mb-3 text-sm font-semibold text-[color:var(--text-primary)]" style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}>
          {t('blog.tagCollection')}
        </h3>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.name}
                to={`/blog?tag=${encodeURIComponent(tag.name)}`}
                className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] px-2.5 py-1 text-xs text-[color:var(--text-secondary)] transition hover:border-[color:var(--accent-border)] hover:text-[color:var(--text-primary)]"
              >
                {tag.name}
                <span className="text-[color:var(--text-faint)]">{formatNumber(tag.count)}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[color:var(--text-faint)]">{t('blog.noTags')}</p>
        )}
      </div>
    </aside>
  );
}
