import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import ManagementPageLayout from '../components/layout/ManagementPageLayout';
import { useAppShell } from '../contexts/AppShellContext';
import { useAuthState } from '../contexts/AuthContext';
import usePageSeo from '../hooks/usePageSeo';
import { fetchStockReviews } from '../services/stockApi';

function readFilters(searchParams) {
  return {
    search: searchParams.get('search') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    sector: searchParams.get('sector') || '',
  };
}

function patchSearchParams(searchParams, setSearchParams, updates) {
  const nextParams = new URLSearchParams(searchParams);
  Object.entries(updates).forEach(([key, value]) => {
    if (value == null || value === '') {
      nextParams.delete(key);
    } else {
      nextParams.set(key, String(value));
    }
  });
  setSearchParams(nextParams, { replace: true });
}

function stripMarkdownText(value) {
  return String(value || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~\-|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildReviewSummary(review, t) {
  if (review?.markets?.summary) {
    return review.markets.summary;
  }

  if (review?.content) {
    const summary = stripMarkdownText(review.content);
    if (summary) {
      return summary.slice(0, 140);
    }
  }

  if (review?.focusSectors?.length) {
    return `${t('stock.summaryFromFocus')}: ${review.focusSectors
      .slice(0, 2)
      .map((item) => `${item.name}${item.reason ? ` · ${item.reason}` : ''}`)
      .join('；')}`;
  }

  if (review?.todayHot?.topSectors?.length) {
    return `${t('stock.summaryFromHot')}: ${review.todayHot.topSectors
      .slice(0, 3)
      .map((item) => `${item.name}${Number.isFinite(Number(item.changePercent)) ? ` ${Number(item.changePercent).toFixed(1)}%` : ''}`)
      .join('、')}`;
  }

  return t('stock.emptySummary');
}

function StatChip({ label, value }) {
  return (
    <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-3 shadow-[var(--surface-shadow)] backdrop-blur-sm">
      <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--text-faint)]">{label}</div>
      <div className="mt-2 text-lg font-semibold text-[color:var(--text-primary)]">{value}</div>
    </div>
  );
}

export default function StockReviewPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { formatNumber, t } = useAppShell();
  const { hasSession, profile } = useAuthState();
  const [filters, setFilters] = useState(() => readFilters(searchParams));
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageInfo, setPageInfo] = useState({ total: 0, totalPages: 1 });

  const page = Math.max(1, Number.parseInt(searchParams.get('page'), 10) || 1);
  const canCreate = profile?.permissions?.includes('stock:review:create');
  const redirectTarget = `${location.pathname}${location.search}`;
  const latestDate = useMemo(() => reviews[0]?.date || '--', [reviews]);

  usePageSeo({
    title: t('stock.listPageTitle'),
    description: t('stock.listDescription'),
    canonicalPath: '/stock/review',
    robots: 'noindex, nofollow',
  });

  useEffect(() => {
    setFilters(readFilters(searchParams));
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchStockReviews({
      page,
      limit: 12,
      search: filters.search || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      sector: filters.sector || undefined,
    })
      .then((result) => {
        if (cancelled) {
          return;
        }
        setReviews(result.reviews || []);
        setPageInfo({ total: result.total || 0, totalPages: result.totalPages || 1 });
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError.message || t('stock.loadListFailed'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filters.dateFrom, filters.dateTo, filters.search, filters.sector, page, t]);

  function handleFilterSubmit(event) {
    event.preventDefault();
    patchSearchParams(searchParams, setSearchParams, {
      page: 1,
      search: filters.search,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      sector: filters.sector,
    });
  }

  function handleFilterReset() {
    setFilters({ search: '', dateFrom: '', dateTo: '', sector: '' });
    patchSearchParams(searchParams, setSearchParams, {
      page: null,
      search: null,
      dateFrom: null,
      dateTo: null,
      sector: null,
    });
  }

  return (
    <ManagementPageLayout
      eyebrow={t('stock.heroEyebrow')}
      title={t('stock.heroTitle')}
      rootClassName="relative min-h-screen overflow-hidden bg-[var(--page-bg)] text-[color:var(--text-primary)]"
      background={(
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_82%_16%,rgba(14,165,233,0.12),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(148,163,184,0.08),transparent_38%)]" />
        </div>
      )}
      headerContainerClassName="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6"
      mainClassName="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8"
      eyebrowClassName="text-[11px] uppercase tracking-[0.28em] text-[color:var(--accent-solid)]"
      titleClassName="text-lg font-semibold text-[color:var(--text-primary)]"
      showUserAccountMenu={hasSession}
    >
        <section className="rounded-[28px] border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-6 shadow-[var(--surface-shadow)] backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--accent-solid)]">{t('stock.heroEyebrow')}</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--text-primary)] sm:text-4xl" style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}>
                {t('stock.heroTitle')}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">
                {t('stock.heroSubtitle')}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[24rem]">
              <StatChip label={t('stock.statsTotal')} value={formatNumber(pageInfo.total)} />
              <StatChip label={t('stock.statsCurrentPage')} value={formatNumber(page)} />
              <StatChip label={t('stock.statsLatestDate')} value={latestDate} />
            </div>
          </div>
        </section>

        {error ? <div className="rounded-2xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[color:var(--danger-text)]">{error}</div> : null}

        <section className="rounded-[28px] border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-5 shadow-[var(--surface-shadow)] backdrop-blur-xl sm:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--accent-solid)]">{t('common.search')}</div>
              <h2 className="mt-1 text-xl font-semibold text-[color:var(--text-primary)]">{t('stock.filtersTitle')}</h2>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">{t('stock.filtersDescription')}</p>
            </div>
            {canCreate ? (
              <Link to="/stock/review/new" state={{ from: redirectTarget }} className="rounded-2xl border border-transparent bg-[var(--accent-solid)] px-4 py-2.5 text-sm font-medium text-[var(--accent-solid-text)] transition hover:opacity-90">
                {t('stock.createReview')}
              </Link>
            ) : null}
          </div>

          <form onSubmit={handleFilterSubmit} className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
            <input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder={t('stock.searchPlaceholder')}
              className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)]"
            />
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
              className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)]"
            />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
              className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)]"
            />
            <input
              value={filters.sector}
              onChange={(event) => setFilters((current) => ({ ...current, sector: event.target.value }))}
              placeholder={t('stock.sectorPlaceholder')}
              className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)]"
            />
            <div className="flex gap-3 lg:col-span-full">
              <button type="submit" className="rounded-2xl border border-transparent bg-[var(--accent-solid)] px-4 py-2.5 text-sm font-medium text-[var(--accent-solid-text)] transition hover:opacity-90">{t('stock.applyFilters')}</button>
              <button type="button" onClick={handleFilterReset} className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-2.5 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]">{t('stock.resetFilters')}</button>
            </div>
          </form>
        </section>

        <section className="rounded-[28px] border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-5 shadow-[var(--surface-shadow)] backdrop-blur-xl sm:p-6">
          <div className="mb-5">
            <div className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--accent-solid)]">{t('stock.listTitle')}</div>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">{t('stock.listDescriptionShort')}</p>
          </div>

          {loading ? <div className="rounded-2xl border border-dashed border-[color:var(--surface-border)] px-4 py-10 text-center text-sm text-[color:var(--text-faint)]">{t('stock.loadingList')}</div> : null}
          {!loading && reviews.length === 0 ? <div className="rounded-2xl border border-dashed border-[color:var(--surface-border)] px-4 py-10 text-center text-sm text-[color:var(--text-faint)]">{t('stock.noReviews')}</div> : null}

          {!loading && reviews.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {reviews.map((review) => (
                <Link
                  key={review._id}
                  to={`/stock/review/${review._id}`}
                  state={{ from: redirectTarget }}
                  className="group rounded-[24px] border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-5 shadow-[var(--surface-shadow)] backdrop-blur-sm transition hover:border-[color:var(--accent-border)] hover:bg-[var(--surface-hover)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--accent-solid)]">{review.date}</div>
                      <h3 className="mt-2 text-xl font-semibold text-[color:var(--text-primary)] transition group-hover:text-[color:var(--accent-solid)]" style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}>
                        {review.title || t('stock.articleTitle', { date: review.date })}
                      </h3>
                    </div>
                    <span className="rounded-full border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] px-2.5 py-1 text-[11px] text-[color:var(--text-muted)]">
                      {t('stock.newsCount', { count: formatNumber(review.news?.length || 0) })}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(review.todayHot?.topSectors || []).slice(0, 3).map((sector) => (
                      <span key={`${review._id}_${sector.name}`} className="rounded-full border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] px-2.5 py-1 text-[11px] text-[color:var(--text-secondary)]">{sector.name}</span>
                    ))}
                  </div>

                  <p className="mt-4 line-clamp-3 text-sm leading-7 text-[color:var(--text-muted)]">
                    {buildReviewSummary(review, t)}
                  </p>
                </Link>
              ))}
            </div>
          ) : null}

          {pageInfo.totalPages > 1 ? (
            <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-3 text-sm text-[color:var(--text-secondary)]">
              <button type="button" disabled={page <= 1} onClick={() => patchSearchParams(searchParams, setSearchParams, { page: page - 1 })} className="rounded-xl border border-[color:var(--surface-border)] px-3 py-1.5 transition hover:bg-[var(--surface-hover)] disabled:opacity-40">{t('common.previousPage')}</button>
              <span>{page} / {pageInfo.totalPages}</span>
              <button type="button" disabled={page >= pageInfo.totalPages} onClick={() => patchSearchParams(searchParams, setSearchParams, { page: page + 1 })} className="rounded-xl border border-[color:var(--surface-border)] px-3 py-1.5 transition hover:bg-[var(--surface-hover)] disabled:opacity-40">{t('common.nextPage')}</button>
            </div>
          ) : null}
        </section>
    </ManagementPageLayout>
  );
}