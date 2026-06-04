import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import IdentityAvatar from '../components/IdentityAvatar';
import ManagementPageLayout from '../components/layout/ManagementPageLayout';
import { useAppShell } from '../contexts/AppShellContext';
import { useAuthState } from '../contexts/AuthContext';
import usePageSeo from '../hooks/usePageSeo';
import { createStockReview, deleteStockReview, fetchStockReview, updateStockReview } from '../services/stockApi';
import { processMarkdown } from '../utils/markdown';

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function splitLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitPipeColumns(line, minimumColumns = 0) {
  const parts = String(line || '')
    .split('|')
    .map((item) => item.trim());

  while (parts.length < minimumColumns) {
    parts.push('');
  }

  return parts;
}

function hasAnyValue(values) {
  return values.some((value) => String(value ?? '').trim() !== '');
}

function createEmptyMarketIndex() {
  return { code: '', name: '', close: '', changePercent: '', reason: '' };
}

function createEmptyHotSector({ includeReason = true } = {}) {
  if (!includeReason) {
    return { name: '', changePercent: '', stocksText: '' };
  }

  return { name: '', changePercent: '', reason: '', stocksText: '' };
}

function createEmptyNewsSection() {
  return { title: '', contentText: '' };
}

function createEmptyFocusSector() {
  return { name: '', reason: '' };
}

function createEmptyFocusStockGroup() {
  return { sector: '', stocksText: '' };
}

function serializeHotStocks(stocks = []) {
  return stocks
    .map((item) => [item.code, item.name, item.changePercent].map((part) => String(part ?? '').trim()).join(' | '))
    .join('\n');
}

function serializeFocusStocks(stocks = []) {
  return stocks
    .map((item) => [item.code, item.name, item.reason].map((part) => String(part ?? '').trim()).join(' | '))
    .join('\n');
}

function createEmptyDraft() {
  return {
    date: todayString(),
    markets: {
      summary: '',
      volume: '',
      indices: [createEmptyMarketIndex()],
    },
    todayHot: {
      topSectors: [createEmptyHotSector()],
      concepts: [createEmptyHotSector({ includeReason: false })],
      fallingSectors: [createEmptyHotSector()],
      summary: '',
    },
    news: [createEmptyNewsSection()],
    focusSectors: [createEmptyFocusSector()],
    focusStocks: [createEmptyFocusStockGroup()],
  };
}

function mapHotSection(items = [], { includeReason = true } = {}) {
  if (!items.length) {
    return [createEmptyHotSector({ includeReason })];
  }

  return items.map((item) => ({
    name: item.name || '',
    changePercent: item.changePercent == null ? '' : String(item.changePercent),
    ...(includeReason ? { reason: item.reason || '' } : {}),
    stocksText: serializeHotStocks(item.stocks || []),
  }));
}

function toDraft(review) {
  return {
    date: review?.date || todayString(),
    markets: {
      summary: review?.markets?.summary || '',
      volume: review?.markets?.volume || '',
      indices: (review?.markets?.indices || []).length
        ? review.markets.indices.map((item) => ({
            code: item.code || '',
            name: item.name || '',
            close: item.close == null ? '' : String(item.close),
            changePercent: item.changePercent == null ? '' : String(item.changePercent),
            reason: item.reason || '',
          }))
        : [createEmptyMarketIndex()],
    },
    todayHot: {
      topSectors: mapHotSection(review?.todayHot?.topSectors || []),
      concepts: mapHotSection(review?.todayHot?.concepts || [], { includeReason: false }),
      fallingSectors: mapHotSection(review?.todayHot?.fallingSectors || []),
      summary: review?.todayHot?.summary || '',
    },
    news: (review?.news || []).length
      ? review.news.map((item) => ({
          title: item.title || '',
          contentText: Array.isArray(item.content) ? item.content.join('\n') : '',
        }))
      : [createEmptyNewsSection()],
    focusSectors: (review?.focusSectors || []).length
      ? review.focusSectors.map((item) => ({ name: item.name || '', reason: item.reason || '' }))
      : [createEmptyFocusSector()],
    focusStocks: (review?.focusStocks || []).length
      ? review.focusStocks.map((item) => ({
          sector: item.sector || '',
          stocksText: serializeFocusStocks(item.stocks || []),
        }))
      : [createEmptyFocusStockGroup()],
  };
}

function parseHotStocksText(value) {
  return splitLines(value).map((line) => {
    const [code = '', name = '', changePercent = ''] = splitPipeColumns(line, 3);
    return { code, name, changePercent };
  });
}

function parseFocusStocksText(value) {
  return splitLines(value).map((line) => {
    const parts = splitPipeColumns(line, 3);
    return {
      code: parts[0] || '',
      name: parts[1] || '',
      reason: parts.slice(2).join(' | ').trim(),
    };
  });
}

function toPayload(draft) {
  return {
    date: draft.date,
    markets: {
      summary: draft.markets.summary,
      volume: draft.markets.volume,
      indices: (draft.markets.indices || [])
        .filter((item) => hasAnyValue([item.code, item.name, item.close, item.changePercent, item.reason]))
        .map((item) => ({
          code: item.code,
          name: item.name,
          close: item.close,
          changePercent: item.changePercent,
          reason: item.reason,
        })),
    },
    todayHot: {
      topSectors: (draft.todayHot.topSectors || [])
        .filter((item) => hasAnyValue([item.name, item.changePercent, item.reason, item.stocksText]))
        .map((item) => ({
          name: item.name,
          changePercent: item.changePercent,
          reason: item.reason,
          stocks: parseHotStocksText(item.stocksText),
        })),
      concepts: (draft.todayHot.concepts || [])
        .filter((item) => hasAnyValue([item.name, item.changePercent, item.stocksText]))
        .map((item) => ({
          name: item.name,
          changePercent: item.changePercent,
          stocks: parseHotStocksText(item.stocksText),
        })),
      fallingSectors: (draft.todayHot.fallingSectors || [])
        .filter((item) => hasAnyValue([item.name, item.changePercent, item.reason, item.stocksText]))
        .map((item) => ({
          name: item.name,
          changePercent: item.changePercent,
          reason: item.reason,
          stocks: parseHotStocksText(item.stocksText),
        })),
      summary: draft.todayHot.summary,
    },
    news: (draft.news || [])
      .filter((item) => hasAnyValue([item.title, item.contentText]))
      .map((item) => ({
        title: item.title,
        content: splitLines(item.contentText),
      })),
    focusSectors: (draft.focusSectors || [])
      .filter((item) => hasAnyValue([item.name, item.reason]))
      .map((item) => ({ name: item.name, reason: item.reason })),
    focusStocks: (draft.focusStocks || [])
      .filter((item) => hasAnyValue([item.sector, item.stocksText]))
      .map((item) => ({
        sector: item.sector,
        stocks: parseFocusStocksText(item.stocksText),
      })),
  };
}

function stripMarkdownForSeo(content) {
  return String(content || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~\-|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function SectionTitle({ eyebrow, title, description }) {
  return (
    <div className="mb-4">
      {eyebrow ? <div className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--accent-solid)]">{eyebrow}</div> : null}
      <h2 className="mt-1 text-xl font-semibold text-[color:var(--text-primary)]">{title}</h2>
      {description ? <p className="mt-1 text-sm text-[color:var(--text-muted)]">{description}</p> : null}
    </div>
  );
}

function EditorSection({ eyebrow, title, description, children }) {
  return (
    <section className="rounded-[24px] border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-5 shadow-[var(--surface-shadow)] backdrop-blur-sm">
      <SectionTitle eyebrow={eyebrow} title={title} description={description} />
      {children}
    </section>
  );
}

function SubsectionTitle({ title }) {
  return <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--text-faint)]">{title}</h3>;
}

export default function StockReviewDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { reviewId } = useParams();
  const [searchParams] = useSearchParams();
  const { formatDate, t } = useAppShell();
  const { hasSession, profile, profileLoaded, profileError } = useAuthState();
  const [review, setReview] = useState(null);
  const [editorDraft, setEditorDraft] = useState(createEmptyDraft());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const isCreateMode = location.pathname === '/stock/review/new';
  const isEditMode = isCreateMode || searchParams.get('mode') === 'edit';
  const canCreate = profile?.permissions?.includes('stock:review:create');
  const canUpdate = profile?.permissions?.includes('stock:review:update');
  const canDelete = profile?.permissions?.includes('stock:review:delete');
  const returnTo = location.state?.from || '/stock/review';
  const redirectTarget = `${location.pathname}${location.search}`;
  const articleTitle = useMemo(() => review?.title || t('stock.articleTitle', { date: review?.date || '--' }), [review?.date, review?.title, t]);
  const reviewMeta = useMemo(() => {
    if (!review || isEditMode) {
      return null;
    }

    const creatorName = review.creator?.nickname || t('stock.creatorUnknown');
    const createdAtLabel = review.createdAt
      ? formatDate(review.createdAt, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : t('stock.timeUnknown');

    return {
      creatorName,
      creatorAvatar: review.creator?.avatar || '',
      createdAtLabel,
    };
  }, [formatDate, isEditMode, review, t]);
  const seoDescription = useMemo(() => {
    if (isEditMode) {
      return t('stock.editorDescription');
    }

    const excerpt = stripMarkdownForSeo(review?.content || '');
    return (excerpt || t('stock.detailDescription')).slice(0, 140);
  }, [isEditMode, review?.content, t]);

  usePageSeo({
    title: isCreateMode
      ? t('stock.editorCreateTitle')
      : isEditMode
        ? t('stock.editorEditTitle')
        : review?.title
          ? `${review.title} - XiaoNiu Tech`
          : t('stock.detailPageTitle', { date: review?.date || '--' }),
    description: seoDescription,
    canonicalPath: isCreateMode ? '/stock/review/new' : `/stock/review/${encodeURIComponent(reviewId || '')}`,
    robots: 'noindex, nofollow',
  });

  useEffect(() => {
    let cancelled = false;

    if (isCreateMode) {
      if (!hasSession) {
        navigate(`/login?redirect=${encodeURIComponent(redirectTarget)}`, { replace: true });
        return undefined;
      }
      if (!profileLoaded) {
        setLoading(true);
        return undefined;
      }
      if (profileError) {
        setLoading(false);
        setError(profileError);
        return undefined;
      }
      if (!canCreate) {
        setLoading(false);
        setError(t('stock.noCreatePermission'));
        return undefined;
      }

      setError('');
      setReview(null);
      setEditorDraft(createEmptyDraft());
      setLoading(false);
      return undefined;
    }

    if (!reviewId) {
      setReview(null);
      setLoading(false);
      return undefined;
    }

    if (isEditMode) {
      if (!hasSession) {
        navigate(`/login?redirect=${encodeURIComponent(redirectTarget)}`, { replace: true });
        return undefined;
      }
      if (!profileLoaded) {
        setLoading(true);
        return undefined;
      }
      if (profileError) {
        setLoading(false);
        setError(profileError);
        return undefined;
      }
      if (!canUpdate) {
        setLoading(false);
        setError(t('stock.noUpdatePermission'));
        return undefined;
      }
    }

    setLoading(true);
    setError('');

    fetchStockReview(reviewId)
      .then((nextReview) => {
        if (cancelled) {
          return;
        }
        setReview(nextReview);
        if (isEditMode) {
          setEditorDraft(toDraft(nextReview));
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError.message || t('stock.loadDetailFailed'));
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
  }, [canCreate, canUpdate, hasSession, isCreateMode, isEditMode, navigate, profileError, profileLoaded, redirectTarget, reviewId, t]);

  function updateDraftDate(value) {
    setEditorDraft((current) => ({ ...current, date: value }));
  }

  function updateMarketsField(field, value) {
    setEditorDraft((current) => ({
      ...current,
      markets: { ...current.markets, [field]: value },
    }));
  }

  function updateMarketIndex(index, field, value) {
    setEditorDraft((current) => ({
      ...current,
      markets: {
        ...current.markets,
        indices: current.markets.indices.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
      },
    }));
  }

  function addMarketIndex() {
    setEditorDraft((current) => ({
      ...current,
      markets: {
        ...current.markets,
        indices: [...current.markets.indices, createEmptyMarketIndex()],
      },
    }));
  }

  function removeMarketIndex(index) {
    setEditorDraft((current) => ({
      ...current,
      markets: {
        ...current.markets,
        indices: current.markets.indices.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  }

  function updateTodayHotItem(group, index, field, value) {
    setEditorDraft((current) => ({
      ...current,
      todayHot: {
        ...current.todayHot,
        [group]: current.todayHot[group].map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
      },
    }));
  }

  function addTodayHotItem(group) {
    const includeReason = group !== 'concepts';
    setEditorDraft((current) => ({
      ...current,
      todayHot: {
        ...current.todayHot,
        [group]: [...current.todayHot[group], createEmptyHotSector({ includeReason })],
      },
    }));
  }

  function removeTodayHotItem(group, index) {
    setEditorDraft((current) => ({
      ...current,
      todayHot: {
        ...current.todayHot,
        [group]: current.todayHot[group].filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  }

  function updateTodayHotSummary(value) {
    setEditorDraft((current) => ({
      ...current,
      todayHot: {
        ...current.todayHot,
        summary: value,
      },
    }));
  }

  function updateNewsItem(index, field, value) {
    setEditorDraft((current) => ({
      ...current,
      news: current.news.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  }

  function addNewsItem() {
    setEditorDraft((current) => ({
      ...current,
      news: [...current.news, createEmptyNewsSection()],
    }));
  }

  function removeNewsItem(index) {
    setEditorDraft((current) => ({
      ...current,
      news: current.news.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function updateFocusSectorItem(index, field, value) {
    setEditorDraft((current) => ({
      ...current,
      focusSectors: current.focusSectors.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  }

  function addFocusSectorItem() {
    setEditorDraft((current) => ({
      ...current,
      focusSectors: [...current.focusSectors, createEmptyFocusSector()],
    }));
  }

  function removeFocusSectorItem(index) {
    setEditorDraft((current) => ({
      ...current,
      focusSectors: current.focusSectors.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function updateFocusStockGroup(index, field, value) {
    setEditorDraft((current) => ({
      ...current,
      focusStocks: current.focusStocks.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  }

  function addFocusStockGroup() {
    setEditorDraft((current) => ({
      ...current,
      focusStocks: [...current.focusStocks, createEmptyFocusStockGroup()],
    }));
  }

  function removeFocusStockGroup(index) {
    setEditorDraft((current) => ({
      ...current,
      focusStocks: current.focusStocks.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const payload = toPayload(editorDraft);
      const nextReview = isCreateMode
        ? await createStockReview(payload)
        : await updateStockReview(reviewId, payload);

      setMessage(isCreateMode ? t('stock.created') : t('stock.updated'));
      navigate(`/stock/review/${nextReview._id}`, {
        replace: true,
        state: { from: returnTo },
      });
    } catch (nextError) {
      setError(nextError.message || t('stock.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!reviewId || !canDelete) {
      return;
    }

    if (!window.confirm(t('stock.deleteConfirm'))) {
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      await deleteStockReview(reviewId);
      navigate(returnTo, { replace: true });
    } catch (nextError) {
      setError(nextError.message || t('stock.deleteFailed'));
    } finally {
      setSaving(false);
    }
  }

  function renderHotGroup(group, title, { showReason = true } = {}) {
    return (
      <div className="grid gap-4">
        <SubsectionTitle title={title} />
        {editorDraft.todayHot[group].map((item, index) => (
          <div key={`${group}-${index}`} className="rounded-[20px] border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-[color:var(--text-primary)]">{t('stock.sectionHotItem', { index: index + 1 })}</div>
              <button type="button" onClick={() => removeTodayHotItem(group, index)} className="text-xs text-[color:var(--text-faint)] transition hover:text-[color:var(--danger-text)]">{t('stock.removeItem')}</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
              <input value={item.name} onChange={(event) => updateTodayHotItem(group, index, 'name', event.target.value)} placeholder={t('stock.fieldSectorName')} className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)]" />
              <input value={item.changePercent} onChange={(event) => updateTodayHotItem(group, index, 'changePercent', event.target.value)} placeholder={t('stock.fieldChangePercent')} className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)]" />
            </div>
            {showReason ? <textarea value={item.reason} onChange={(event) => updateTodayHotItem(group, index, 'reason', event.target.value)} placeholder={t('stock.fieldReason')} rows={3} className="mt-3 w-full rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)]" /> : null}
            <textarea value={item.stocksText} onChange={(event) => updateTodayHotItem(group, index, 'stocksText', event.target.value)} placeholder={t('stock.fieldTopStocks')} rows={4} className="mt-3 w-full rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)]" />
          </div>
        ))}
        <button type="button" onClick={() => addTodayHotItem(group)} className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]">{t('stock.addItem')}</button>
      </div>
    );
  }

  return (
    <ManagementPageLayout
      eyebrow={t('stock.heroEyebrow')}
      title={isEditMode ? t('stock.editMode') : t('stock.detailTitle')}
      rootClassName="relative min-h-screen overflow-hidden bg-[var(--page-bg)] text-[color:var(--text-primary)]"
      background={(
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_82%_16%,rgba(14,165,233,0.10),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(148,163,184,0.08),transparent_38%)]" />
        </div>
      )}
      headerContainerClassName="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6"
      mainClassName="relative z-10 mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8"
      eyebrowClassName="text-[11px] uppercase tracking-[0.28em] text-[color:var(--accent-solid)]"
      titleClassName="text-lg font-semibold text-[color:var(--text-primary)]"
      showUserAccountMenu={hasSession}
    >
        <section className="rounded-[28px] border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-6 shadow-[var(--surface-shadow)] backdrop-blur-xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <div className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--accent-solid)]">{isEditMode ? t('common.edit') : t('stock.heroEyebrow')}</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--text-primary)] sm:text-4xl" style={{ fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif" }}>
                {isCreateMode ? t('stock.createMode') : isEditMode ? t('stock.editMode') : articleTitle}
              </h1>
              {reviewMeta ? (
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[color:var(--text-faint)] sm:text-sm">
                  <div className="flex items-center gap-2">
                    <IdentityAvatar name={reviewMeta.creatorName} avatarUrl={reviewMeta.creatorAvatar} size="sm" className="h-8 w-8 rounded-full text-xs ring-[color:var(--surface-border)]" />
                    <span className="font-medium text-[color:var(--text-secondary)]">{reviewMeta.creatorName}</span>
                  </div>
                  <span className="hidden h-1 w-1 rounded-full bg-[color:var(--text-faint)] sm:inline-block" aria-hidden="true" />
                  <span>{reviewMeta.createdAtLabel}</span>
                </div>
              ) : null}
              <p className="mt-3 max-w-xl text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">
                {isEditMode ? t('stock.editorDescription') : t('stock.articleLead')}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to={returnTo} className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-2.5 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]">
                {t('stock.backToList')}
              </Link>
              {!isEditMode && canUpdate && review ? (
                <button type="button" onClick={() => navigate(`/stock/review/${reviewId}?mode=edit`, { state: { from: returnTo } })} className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-2.5 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]">
                  {t('common.edit')}
                </button>
              ) : null}
              {!isEditMode && canDelete && review ? (
                <button type="button" onClick={handleDelete} disabled={saving} className="rounded-2xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-2.5 text-sm text-[color:var(--danger-text)] transition hover:opacity-90 disabled:opacity-40">
                  {t('common.delete')}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {message ? <div className="rounded-2xl border border-[color:var(--success-border)] bg-[var(--success-soft)] px-4 py-3 text-sm text-[color:var(--success-text)]">{message}</div> : null}
        {error ? <div className="rounded-2xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[color:var(--danger-text)]">{error}</div> : null}

        {loading ? <div className="rounded-2xl border border-dashed border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-10 text-center text-sm text-[color:var(--text-faint)]">{t('common.loading')}</div> : null}

        {!loading && isEditMode ? (
          <form onSubmit={handleSave} className="grid gap-5">
            <section className="rounded-[24px] border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-5 shadow-[var(--surface-shadow)] backdrop-blur-sm">
              <SectionTitle eyebrow={t('stock.editorDateEyebrow')} title={t('stock.editorDateTitle')} description={t('stock.editorDateDescription')} />
              <input
                type="date"
                value={editorDraft.date}
                onChange={(event) => updateDraftDate(event.target.value)}
                className="w-full max-w-xs rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)]"
              />
            </section>

            <EditorSection eyebrow={t('stock.marketsEyebrow')} title={t('stock.marketsTitle')} description={t('stock.marketsDescription')}>
              <div className="grid gap-4">
                <textarea value={editorDraft.markets.summary} onChange={(event) => updateMarketsField('summary', event.target.value)} placeholder={t('stock.fieldMarketSummary')} rows={4} className="w-full rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)]" />
                <textarea value={editorDraft.markets.volume} onChange={(event) => updateMarketsField('volume', event.target.value)} placeholder={t('stock.fieldMarketVolume')} rows={3} className="w-full rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)]" />

                <div className="grid gap-4">
                  <SubsectionTitle title={t('stock.indicesTitle')} />
                  {editorDraft.markets.indices.map((item, index) => (
                    <div key={`index-${index}`} className="rounded-[20px] border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-[color:var(--text-primary)]">{t('stock.sectionIndexItem', { index: index + 1 })}</div>
                        <button type="button" onClick={() => removeMarketIndex(index)} className="text-xs text-[color:var(--text-faint)] transition hover:text-[color:var(--danger-text)]">{t('stock.removeItem')}</button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <input value={item.code} onChange={(event) => updateMarketIndex(index, 'code', event.target.value)} placeholder={t('stock.fieldIndexCode')} className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)]" />
                        <input value={item.name} onChange={(event) => updateMarketIndex(index, 'name', event.target.value)} placeholder={t('stock.fieldIndexName')} className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)]" />
                        <input value={item.close} onChange={(event) => updateMarketIndex(index, 'close', event.target.value)} placeholder={t('stock.fieldClosePrice')} className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)]" />
                        <input value={item.changePercent} onChange={(event) => updateMarketIndex(index, 'changePercent', event.target.value)} placeholder={t('stock.fieldChangePercent')} className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)]" />
                      </div>
                      <textarea value={item.reason} onChange={(event) => updateMarketIndex(index, 'reason', event.target.value)} placeholder={t('stock.fieldReason')} rows={3} className="mt-3 w-full rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)]" />
                    </div>
                  ))}
                  <button type="button" onClick={addMarketIndex} className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]">{t('stock.addItem')}</button>
                </div>
              </div>
            </EditorSection>

            <EditorSection eyebrow={t('stock.topSectorsEyebrow')} title={t('stock.topSectorsTitle')} description={t('stock.topSectorsDescription')}>
              <div className="grid gap-5">
                {renderHotGroup('topSectors', t('stock.topSectorsTitle'))}
                {renderHotGroup('concepts', t('stock.conceptsTitle'), { showReason: false })}
                {renderHotGroup('fallingSectors', t('stock.fallingSectorsTitle'))}
                <textarea value={editorDraft.todayHot.summary} onChange={(event) => updateTodayHotSummary(event.target.value)} placeholder={t('stock.todayHotSummaryLabel')} rows={4} className="w-full rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)]" />
              </div>
            </EditorSection>

            <EditorSection eyebrow={t('stock.newsEyebrow')} title={t('stock.newsTitle')} description={t('stock.newsDescription')}>
              <div className="grid gap-4">
                {editorDraft.news.map((item, index) => (
                  <div key={`news-${index}`} className="rounded-[20px] border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-[color:var(--text-primary)]">{t('stock.sectionNewsItem', { index: index + 1 })}</div>
                      <button type="button" onClick={() => removeNewsItem(index)} className="text-xs text-[color:var(--text-faint)] transition hover:text-[color:var(--danger-text)]">{t('stock.removeItem')}</button>
                    </div>
                    <div className="grid gap-3">
                      <input value={item.title} onChange={(event) => updateNewsItem(index, 'title', event.target.value)} placeholder={t('stock.fieldNewsTitle')} className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)]" />
                      <textarea value={item.contentText} onChange={(event) => updateNewsItem(index, 'contentText', event.target.value)} placeholder={t('stock.fieldNewsDetail')} rows={5} className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)]" />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addNewsItem} className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]">{t('stock.addItem')}</button>
              </div>
            </EditorSection>

            <EditorSection eyebrow={t('stock.focusSectorsEyebrow')} title={t('stock.focusSectorsTitle')} description={t('stock.focusSectorsDescription')}>
              <div className="grid gap-4">
                {editorDraft.focusSectors.map((item, index) => (
                  <div key={`focus-sector-${index}`} className="rounded-[20px] border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-[color:var(--text-primary)]">{t('stock.sectionFocusSectorItem', { index: index + 1 })}</div>
                      <button type="button" onClick={() => removeFocusSectorItem(index)} className="text-xs text-[color:var(--text-faint)] transition hover:text-[color:var(--danger-text)]">{t('stock.removeItem')}</button>
                    </div>
                    <input value={item.name} onChange={(event) => updateFocusSectorItem(index, 'name', event.target.value)} placeholder={t('stock.fieldSectorName')} className="w-full rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)]" />
                    <textarea value={item.reason} onChange={(event) => updateFocusSectorItem(index, 'reason', event.target.value)} placeholder={t('stock.fieldReason')} rows={3} className="mt-3 w-full rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)]" />
                  </div>
                ))}
                <button type="button" onClick={addFocusSectorItem} className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]">{t('stock.addItem')}</button>
              </div>
            </EditorSection>

            <EditorSection eyebrow={t('stock.focusStocksEyebrow')} title={t('stock.focusStocksTitle')} description={t('stock.focusStocksDescription')}>
              <div className="grid gap-4">
                {editorDraft.focusStocks.map((item, index) => (
                  <div key={`focus-stock-${index}`} className="rounded-[20px] border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-[color:var(--text-primary)]">{t('stock.sectionFocusStockItem', { index: index + 1 })}</div>
                      <button type="button" onClick={() => removeFocusStockGroup(index)} className="text-xs text-[color:var(--text-faint)] transition hover:text-[color:var(--danger-text)]">{t('stock.removeItem')}</button>
                    </div>
                    <input value={item.sector} onChange={(event) => updateFocusStockGroup(index, 'sector', event.target.value)} placeholder={t('stock.fieldSectorName')} className="w-full rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)]" />
                    <textarea value={item.stocksText} onChange={(event) => updateFocusStockGroup(index, 'stocksText', event.target.value)} placeholder={t('stock.fieldFocusStocksLines')} rows={5} className="mt-3 w-full rounded-2xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-border)] focus:bg-[var(--input-bg-focus)]" />
                  </div>
                ))}
                <button type="button" onClick={addFocusStockGroup} className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-3 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]">{t('stock.addItem')}</button>
              </div>
            </EditorSection>

            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => navigate(isCreateMode ? returnTo : `/stock/review/${reviewId}`, { replace: true, state: { from: returnTo } })} className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-2.5 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]">
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={saving} className="rounded-2xl border border-transparent bg-[var(--accent-solid)] px-4 py-2.5 text-sm font-medium text-[var(--accent-solid-text)] transition hover:opacity-90 disabled:opacity-40">
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>
        ) : null}

        {!loading && !isEditMode && !review ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-10 text-center text-sm text-[color:var(--text-faint)]">
            {t('stock.emptyDetail')}
          </div>
        ) : null}

        {!loading && !isEditMode && review ? (
          <section className="rounded-[24px] border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-6 shadow-[var(--surface-shadow)] backdrop-blur-sm">
            <div className="mb-6 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.22em] text-[color:var(--accent-solid)]">
              <span>{review.date}</span>
              <span>{t('stock.detailTitle')}</span>
            </div>
            <article className="md-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{processMarkdown(review.content || '')}</ReactMarkdown>
            </article>
          </section>
        ) : null}
    </ManagementPageLayout>
  );
}