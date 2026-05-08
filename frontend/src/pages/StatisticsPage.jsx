import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import BackHomeButton from '../components/BackHomeButton';
import LanguageThemeControls from '../components/LanguageThemeControls';
import UserAccountMenu from '../components/UserAccountMenu';
import usePageSeo from '../hooks/usePageSeo';
import { fetchPermissionMe, fetchStatisticsOverview, getStatisticsExportUrl } from '../services/adminApi';
import { isLoggedIn } from '../services/blogApi';
import { useAppShell } from '../contexts/AppShellContext';

const SUB_PAGES = [
  { key: 'overview', label: '统计概览' },
  { key: 'access_trend', label: '访问趋势' },
  { key: 'sources', label: '访问来源' },
  { key: 'pages', label: '受访页面' },
  { key: 'visitors', label: '访客统计' },
  { key: 'regions', label: '地域分布' },
];

const RANGE_OPTIONS = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'year', label: '本年' },
];

const METRIC_OPTIONS = [
  { key: 'pv', label: 'PV' },
  { key: 'uv', label: 'UV' },
  { key: 'bounceRate', label: '跳出率' },
  { key: 'avgDuration', label: '平均访问时长' },
  { key: 'avgPagesPerVisit', label: '平均访问页数' },
];

function getMetricValue(row, metric) {
  return Number(row?.[metric] || 0);
}

function formatMetric(metric, value, formatNumber) {
  if (metric === 'bounceRate') {
    return `${value}%`;
  }
  if (metric === 'avgDuration') {
    return `${formatNumber(Math.round(value))} 秒`;
  }
  return formatNumber(value);
}

function TrendChart({ rows, metric, formatNumber }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const chart = useMemo(() => {
    if (!rows.length) return null;
    const width = 560;
    const height = 180;
    const margin = { top: 10, right: 12, bottom: 28, left: 48 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const values = rows.map((row) => getMetricValue(row, metric));
    const max = Math.max(...values, 1);
    const coords = values.map((value, index) => {
      const x = rows.length === 1 ? margin.left + innerWidth / 2 : margin.left + (index / (rows.length - 1)) * innerWidth;
      const y = margin.top + (1 - (value / max)) * innerHeight;
      return { x, y, value, label: rows[index].label };
    });
    const polyline = coords.map((p) => `${p.x},${p.y}`).join(' ');
    return { width, height, margin, innerWidth, innerHeight, coords, polyline, max };
  }, [rows, metric]);

  if (!rows.length) {
    return <div className="rounded-2xl border border-dashed border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-10 text-center text-sm text-[color:var(--text-muted)]">暂无趋势数据</div>;
  }

  const handleMouseMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgP = pt.matrixTransform(ctm.inverse());
    const { margin, innerWidth } = chart;
    const x = svgP.x;
    let idx = 0;
    if (rows.length === 1) {
      idx = 0;
    } else {
      idx = Math.round(((x - margin.left) / innerWidth) * (rows.length - 1));
      idx = Math.max(0, Math.min(rows.length - 1, idx));
    }
    setHoveredIndex(idx);
  };

  const handleMouseLeave = () => setHoveredIndex(null);

  const { width, height, margin, innerHeight, coords, polyline, max } = chart;

  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const val = Math.round((max * i) / tickCount);
    const y = margin.top + (1 - (val / max)) * innerHeight;
    return { val, y };
  });

  const activePoint = hoveredIndex !== null ? coords[hoveredIndex] : null;
  const activeRow = hoveredIndex !== null ? rows[hoveredIndex] : null;
  const containerWidth = containerRef.current?.clientWidth || width;
  const containerHeight = containerRef.current?.clientHeight || height;
  const tooltipWidth = 168;
  const tooltipHeight = 58;
  const tooltipLeft = activePoint
    ? Math.max(8, Math.min(containerWidth - tooltipWidth - 8, ((activePoint.x / width) * containerWidth) - tooltipWidth / 2))
    : 0;
  const rawTooltipTop = activePoint
    ? ((activePoint.y / height) * containerHeight) - tooltipHeight - 12
    : 0;
  const tooltipTop = activePoint
    ? (rawTooltipTop >= 8 ? rawTooltipTop : Math.min(containerHeight - tooltipHeight - 8, ((activePoint.y / height) * containerHeight) + 12))
    : 0;

  return (
    <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm text-[color:var(--text-muted)]">
        <span>当前指标：{METRIC_OPTIONS.find((item) => item.key === metric)?.label || metric}</span>
        <span>峰值：{formatMetric(metric, Math.max(...rows.map((row) => getMetricValue(row, metric))), formatNumber)}</span>
      </div>

      <div className="relative overflow-visible pt-2" ref={containerRef}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="h-48 w-full text-[color:var(--accent-solid)]"
          preserveAspectRatio="none"
          onPointerMove={handleMouseMove}
          onPointerLeave={handleMouseLeave}
        >
          <g>
            <line x1={margin.left} x2={margin.left} y1={margin.top} y2={height - margin.bottom} stroke="currentColor" strokeOpacity="0.08" />
            {ticks.map((t, i) => (
              <g key={i}>
                <line x1={margin.left - 6} x2={margin.left} y1={t.y} y2={t.y} stroke="currentColor" strokeOpacity="0.08" />
                <text x={margin.left - 8} y={t.y + 4} fontSize="10" textAnchor="end" fill="var(--text-muted)">{formatMetric(metric, t.val, formatNumber)}</text>
              </g>
            ))}
          </g>

          <polyline fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={polyline} />

          {activePoint && (() => {
            const p = activePoint;
            return (
              <g key={`hover-${hoveredIndex}`}>
                <line x1={p.x} x2={p.x} y1={margin.top} y2={height - margin.bottom} stroke="currentColor" strokeWidth="1" strokeOpacity="0.12" />
                <circle cx={p.x} cy={p.y} r="4" fill="currentColor" />
              </g>
            );
          })()}
        </svg>

        {activePoint && activeRow && (
          <div
            style={{
              position: 'absolute',
              left: tooltipLeft,
              top: tooltipTop,
              width: tooltipWidth,
              pointerEvents: 'none',
              background: 'var(--surface-bg-strong)',
              border: '1px solid var(--surface-border)',
              padding: '8px 10px',
              borderRadius: 10,
              boxShadow: '0 10px 28px rgba(0,0,0,0.12)',
              fontSize: 12,
              zIndex: 10,
            }}
          >
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{activeRow.label}</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: 4 }}>{formatMetric(metric, getMetricValue(activeRow, metric), formatNumber)}</div>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[color:var(--text-faint)] sm:grid-cols-6">
        {rows.slice(0, 6).map((row) => (
          <div key={row.label} className="rounded-xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] px-2 py-2">
            <div>{row.label}</div>
            <div className="mt-1 text-[color:var(--text-primary)]">{formatMetric(metric, getMetricValue(row, metric), formatNumber)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCards({ summary, formatNumber }) {
  const items = [
    { label: '浏览量 PV', value: formatNumber(summary?.pv || 0) },
    { label: '访问量 UV', value: formatNumber(summary?.uv || 0) },
    { label: '跳出率', value: `${summary?.bounceRate || 0}%` },
    { label: '平均访问时长', value: `${formatNumber(Math.round(summary?.avgDuration || 0))} 秒` },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-4">
          <div className="text-sm text-[color:var(--text-muted)]">{item.label}</div>
          <div className="mt-3 text-2xl font-semibold text-[color:var(--text-primary)]">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function DataTable({ columns, rows, formatNumber, rawIpVisible, onToggleIp }) {
  if (!rows.length) {
    return <div className="rounded-2xl border border-dashed border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-10 text-center text-sm text-[color:var(--text-muted)]">暂无数据</div>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[color:var(--surface-border)] text-sm">
          <thead className="bg-[var(--surface-bg-strong)] text-left text-[color:var(--text-muted)]">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-medium">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--surface-border)] text-[color:var(--text-secondary)]">
            {rows.map((row, rowIndex) => (
              <tr key={row.id || row.label || rowIndex}>
                {columns.map((column) => {
                  if (column.key === 'ip') {
                    return (
                      <td key={column.key} className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => onToggleIp?.(row.id || String(rowIndex))}
                          className="inline-flex items-center gap-2 text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)]"
                        >
                          <span>{rawIpVisible?.has(row.id || String(rowIndex)) ? row.ip : row.maskedIp}</span>
                          <span className="text-xs text-[color:var(--text-faint)]">查看</span>
                        </button>
                      </td>
                    );
                  }
                  const value = row[column.key];
                  return <td key={column.key} className="px-4 py-3">{column.render ? column.render(value, row, formatNumber) : value}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function StatisticsPage() {
  const { formatDate, formatNumber } = useAppShell();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const hasSession = isLoggedIn();
  const [access, setAccess] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metric, setMetric] = useState('pv');
  const [rawIpVisible, setRawIpVisible] = useState(new Set());

  const sub = searchParams.get('sub') || 'overview';
  const range = searchParams.get('range') || 'today';
  const subLabel = SUB_PAGES.find((item) => item.key === sub)?.label || '访问统计';

  usePageSeo({
    title: sub === 'overview' ? '访问统计 - XiaoNiu Tech' : `${subLabel} - 访问统计 - XiaoNiu Tech`,
    description: `${subLabel}数据分析与访问趋势后台页。`,
    robots: 'noindex, nofollow',
  });

  useEffect(() => {
    if (!hasSession) {
      navigate('/login?redirect=%2Fstatistics', { replace: true });
    }
  }, [navigate, hasSession]);

  useEffect(() => {
    if (!hasSession) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const me = await fetchPermissionMe();
        if (cancelled) {
          return;
        }
        setAccess(me.access);
        if (!me.access?.permissions?.includes('statistics:view')) {
          setError('当前账号没有访问统计模块权限');
          setLoading(false);
          return;
        }
        const nextData = await fetchStatisticsOverview(sub, range);
        if (!cancelled) {
          setData(nextData);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError.message || '加载访问统计失败');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [range, sub, hasSession]);

  function updateSearch(nextSub, nextRange = range) {
    const params = new URLSearchParams();
    params.set('sub', nextSub);
    params.set('range', nextRange);
    setSearchParams(params, { replace: true });
  }

  function toggleIpVisibility(rowId) {
    setRawIpVisible((previous) => {
      const next = new Set(previous);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }

  const exportAllowed = access?.permissions?.includes('statistics:export');

  const commonTableColumns = [
    { key: 'label', label: '名称' },
    { key: 'pv', label: 'PV' },
    { key: 'uv', label: 'UV' },
    { key: 'bounceRate', label: '跳出率', render: (value) => `${value}%` },
    { key: 'avgDuration', label: '平均访问时长', render: (value, row, nextFormatNumber) => `${nextFormatNumber(Math.round(value || 0))} 秒` },
    { key: 'avgPagesPerVisit', label: '平均访问页数' },
  ];

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[color:var(--text-primary)]">
      <header className="sticky top-0 z-30 border-b border-[color:var(--surface-border)] bg-[var(--header-bg)] backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <BackHomeButton iconOnly />
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-[color:var(--accent-solid)]">Statistics</div>
              <h1 className="text-xl font-semibold">访问统计</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageThemeControls compact />
            <UserAccountMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-3">
            {SUB_PAGES.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => updateSearch(item.key)}
                className={`mb-2 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${sub === item.key ? 'bg-[var(--accent-soft)] text-[color:var(--text-primary)]' : 'text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}
              >
                <span>{item.label}</span>
                <span className="text-xs text-[color:var(--text-faint)]">{item.key}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0 flex-1 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-4">
            <div className="flex flex-wrap gap-2">
              {SUB_PAGES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => updateSearch(item.key)}
                  className={`rounded-xl px-3 py-2 text-sm transition lg:hidden ${sub === item.key ? 'bg-[var(--accent-soft)] text-[color:var(--text-primary)]' : 'bg-[var(--surface-bg)] text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {RANGE_OPTIONS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => updateSearch(sub, item.key)}
                  className={`rounded-xl px-3 py-2 text-sm transition ${range === item.key ? 'bg-[var(--accent-soft)] text-[color:var(--text-primary)]' : 'bg-[var(--surface-bg)] text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}
                >
                  {item.label}
                </button>
              ))}
              {exportAllowed && (
                <a
                  href={getStatisticsExportUrl(range)}
                  className="rounded-xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
                >
                  导出 CSV
                </a>
              )}
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-12 text-center text-[color:var(--text-muted)]">加载统计数据中...</div>
          ) : error ? (
            <div className="rounded-3xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-8 text-[color:var(--danger-text)]">{error}</div>
          ) : (
            <>
              <SummaryCards summary={data?.summary} formatNumber={formatNumber} />

              {(sub === 'overview' || sub === 'access_trend') && (
                <div className="space-y-4 rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">访问趋势</h2>
                    <div className="flex flex-wrap gap-2">
                      {METRIC_OPTIONS.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setMetric(item.key)}
                          className={`rounded-xl px-3 py-2 text-sm transition ${metric === item.key ? 'bg-[var(--accent-soft)] text-[color:var(--text-primary)]' : 'bg-[var(--surface-bg)] text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <TrendChart rows={sub === 'overview' ? (data?.cards?.accessTrend || []) : (data?.rows || [])} metric={metric} formatNumber={formatNumber} />
                  {sub !== 'overview' && (
                    <DataTable
                      columns={[
                        { key: 'label', label: '时间' },
                        { key: 'pv', label: 'PV' },
                        { key: 'uv', label: 'UV' },
                        { key: 'bounceRate', label: '跳出率', render: (value) => `${value}%` },
                        { key: 'avgDuration', label: '平均访问时长', render: (value, row, nextFormatNumber) => `${nextFormatNumber(Math.round(value || 0))} 秒` },
                        { key: 'avgPagesPerVisit', label: '平均访问页数' },
                      ]}
                      rows={data?.rows || []}
                      formatNumber={formatNumber}
                    />
                  )}
                </div>
              )}

              {sub === 'overview' && (
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-lg font-semibold">访问来源 Top 10</h2>
                      <Link className="text-sm text-[color:var(--accent-solid)]" to="/statistics?sub=sources&range=today">查看详情</Link>
                    </div>
                    <DataTable columns={commonTableColumns} rows={data?.cards?.sources || []} formatNumber={formatNumber} />
                  </div>
                  <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-lg font-semibold">受访页面 Top 10</h2>
                      <Link className="text-sm text-[color:var(--accent-solid)]" to="/statistics?sub=pages&range=today">查看详情</Link>
                    </div>
                    <DataTable columns={commonTableColumns} rows={data?.cards?.pages || []} formatNumber={formatNumber} />
                  </div>
                  <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-lg font-semibold">访客统计</h2>
                      <Link className="text-sm text-[color:var(--accent-solid)]" to="/statistics?sub=visitors&range=today">查看详情</Link>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-4">
                        <div className="text-sm text-[color:var(--text-muted)]">新访客</div>
                        <div className="mt-2 text-xl font-semibold">{formatNumber(data?.cards?.visitors?.visitorSummary?.newVisitor?.uv || 0)}</div>
                      </div>
                      <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-4">
                        <div className="text-sm text-[color:var(--text-muted)]">老访客</div>
                        <div className="mt-2 text-xl font-semibold">{formatNumber(data?.cards?.visitors?.visitorSummary?.returningVisitor?.uv || 0)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-lg font-semibold">地域分布 Top 10</h2>
                      <Link className="text-sm text-[color:var(--accent-solid)]" to="/statistics?sub=regions&range=today">查看详情</Link>
                    </div>
                    <DataTable columns={commonTableColumns} rows={data?.cards?.regions || []} formatNumber={formatNumber} />
                  </div>
                </div>
              )}

              {sub === 'sources' && <DataTable columns={commonTableColumns} rows={data?.rows || []} formatNumber={formatNumber} />}
              {sub === 'pages' && <DataTable columns={commonTableColumns} rows={data?.rows || []} formatNumber={formatNumber} />}
              {sub === 'regions' && <DataTable columns={commonTableColumns} rows={data?.rows || []} formatNumber={formatNumber} />}

              {sub === 'visitors' && (
                <div className="space-y-4 rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-4">
                      <div className="text-sm text-[color:var(--text-muted)]">新访客概览</div>
                      <div className="mt-3 space-y-2 text-sm text-[color:var(--text-secondary)]">
                        <div>PV：{formatNumber(data?.visitorSummary?.newVisitor?.pv || 0)}</div>
                        <div>UV：{formatNumber(data?.visitorSummary?.newVisitor?.uv || 0)}</div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-4">
                      <div className="text-sm text-[color:var(--text-muted)]">老访客概览</div>
                      <div className="mt-3 space-y-2 text-sm text-[color:var(--text-secondary)]">
                        <div>PV：{formatNumber(data?.visitorSummary?.returningVisitor?.pv || 0)}</div>
                        <div>UV：{formatNumber(data?.visitorSummary?.returningVisitor?.uv || 0)}</div>
                      </div>
                    </div>
                  </div>
                  <DataTable
                    columns={[
                      { key: 'time', label: '时间', render: (value) => formatDate(value) },
                      { key: 'ip', label: 'IP 地址' },
                      { key: 'pv', label: '浏览量' },
                      { key: 'source', label: '访问来源' },
                      { key: 'visitorType', label: '访客类型', render: (value) => value === 'new' ? '新访客' : '老访客' },
                    ]}
                    rows={data?.details || []}
                    formatNumber={formatNumber}
                    rawIpVisible={rawIpVisible}
                    onToggleIp={toggleIpVisibility}
                  />
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}