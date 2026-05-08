import VisitStatistic from '../models/VisitStatistic.js';

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

function toDate(value, fallback = new Date()) {
  const parsed = value ? new Date(value) : fallback;
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function startOfWeek(date) {
  const result = startOfDay(date);
  const day = result.getDay();
  const offset = day === 0 ? 6 : day - 1;
  result.setDate(result.getDate() - offset);
  return result;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function startOfYear(date) {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
}

function resolveRange(range = 'today') {
  const now = new Date();
  switch (String(range || 'today')) {
    case 'week':
      return { start: startOfWeek(now), end: now, key: 'week' };
    case 'month':
      return { start: startOfMonth(now), end: now, key: 'month' };
    case 'year':
      return { start: startOfYear(now), end: now, key: 'year' };
    default:
      return { start: startOfDay(now), end: endOfDay(now), key: 'today' };
  }
}

function normalizePath(path = '/') {
  const text = String(path || '/').trim() || '/';
  try {
    const url = new URL(text, 'https://placeholder.local');
    return url.pathname || '/';
  } catch {
    return text.split('?')[0].split('#')[0] || '/';
  }
}

function normalizeReferer(referer = '') {
  return String(referer || '').trim();
}

function parseSourceLabel(referer = '') {
  if (!referer) {
    return 'Direct';
  }
  try {
    return new URL(referer).host || 'Direct';
  } catch {
    return 'Direct';
  }
}

function resolveRegion(ip = '') {
  const value = String(ip || '').trim();
  if (!value) {
    return '未知';
  }
  if (value === '127.0.0.1' || value === '::1' || value.startsWith('::ffff:127.')) {
    return '本地';
  }
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(value) || value.startsWith('::ffff:192.168.')) {
    return '局域网';
  }
  return '海外/未知';
}

function maskIp(ip = '') {
  const value = String(ip || '').trim();
  if (!value) {
    return '未知';
  }

  const parts = value.replace('::ffff:', '').split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  return value.slice(0, 6) + '***';
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function summarizeVisits(visits = []) {
  const pv = visits.length;
  const visitsByCid = new Map();
  let totalDuration = 0;

  for (const visit of visits) {
    const cid = String(visit.cid || '');
    totalDuration += Number(visit.duration || 0);
    if (!visitsByCid.has(cid)) {
      visitsByCid.set(cid, []);
    }
    visitsByCid.get(cid).push(visit);
  }

  const uv = visitsByCid.size;
  const bounceVisits = [...visitsByCid.values()].filter((items) => items.length === 1).length;
  const bounceRate = uv > 0 ? round((bounceVisits / uv) * 100, 2) : 0;
  const avgDuration = pv > 0 ? round(totalDuration / pv, 2) : 0;
  const avgPagesPerVisit = uv > 0 ? round(pv / uv, 2) : 0;

  return {
    pv,
    uv,
    bounceRate,
    avgDuration,
    avgPagesPerVisit,
  };
}

function buildBuckets(rangeInfo) {
  const buckets = [];
  const labels = [];
  if (rangeInfo.key === 'today') {
    const base = startOfDay(rangeInfo.start);
    for (let hour = 0; hour < 24; hour += 1) {
      const current = new Date(base.getTime() + hour * 60 * 60 * 1000);
      buckets.push({ key: current.toISOString(), label: `${String(hour).padStart(2, '0')}:00`, visits: [] });
      labels.push(current.toISOString());
    }
    return { buckets, labels, mode: 'hour' };
  }

  const start = startOfDay(rangeInfo.start);
  const end = endOfDay(rangeInfo.end);
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const current = new Date(cursor);
    buckets.push({ key: current.toISOString(), label: `${current.getMonth() + 1}/${current.getDate()}`, visits: [] });
    labels.push(current.toISOString());
  }
  return { buckets, labels, mode: 'day' };
}

function assignVisitToBucket(visit, bucketInfo) {
  const targetDate = new Date(visit.enterTime);
  let targetKey;
  if (bucketInfo.mode === 'hour') {
    targetDate.setMinutes(0, 0, 0);
    targetKey = targetDate.toISOString();
  } else {
    targetDate.setHours(0, 0, 0, 0);
    targetKey = targetDate.toISOString();
  }

  const bucket = bucketInfo.buckets.find((item) => item.key === targetKey);
  if (bucket) {
    bucket.visits.push(visit);
  }
}

async function loadRangeVisits(range) {
  const rangeInfo = resolveRange(range);
  const visits = await VisitStatistic.find({
    enterTime: { $gte: rangeInfo.start, $lte: rangeInfo.end },
    isComplete: true,
    exitTime: { $ne: null },
  })
    .sort({ enterTime: 1 })
    .lean();

  return { rangeInfo, visits };
}

function groupVisits(visits, resolveKey) {
  const groups = new Map();
  for (const visit of visits) {
    const key = resolveKey(visit);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(visit);
  }
  return groups;
}

function toMetricRows(groups, limit = 10) {
  return [...groups.entries()]
    .map(([label, visits]) => ({
      label,
      ...summarizeVisits(visits),
    }))
    .sort((left, right) => right.pv - left.pv)
    .slice(0, limit);
}

async function buildVisitorStats(rangeInfo, visits) {
  const currentCids = uniqCids(visits);
  const previousVisits = currentCids.length > 0
    ? await VisitStatistic.find({
        cid: { $in: currentCids },
        enterTime: { $lt: rangeInfo.start },
        isComplete: true,
      })
        .select('cid')
        .lean()
    : [];
  const existingCidSet = new Set(previousVisits.map((item) => item.cid));
  const newVisitorVisits = visits.filter((visit) => !existingCidSet.has(visit.cid));
  const returningVisitorVisits = visits.filter((visit) => existingCidSet.has(visit.cid));

  return {
    visitorSummary: {
      newVisitor: summarizeVisits(newVisitorVisits),
      returningVisitor: summarizeVisits(returningVisitorVisits),
    },
    details: visits
      .slice()
      .sort((left, right) => new Date(right.enterTime) - new Date(left.enterTime))
      .slice(0, 50)
      .map((visit) => ({
        id: String(visit._id),
        time: new Date(visit.enterTime).getTime(),
        ip: visit.ip,
        maskedIp: maskIp(visit.ip),
        pv: 1,
        source: parseSourceLabel(visit.referer),
        visitorType: existingCidSet.has(visit.cid) ? 'returning' : 'new',
      })),
  };
}

function uniqCids(visits = []) {
  return [...new Set(visits.map((visit) => String(visit.cid || '')).filter(Boolean))];
}

export async function recordVisitEnter(payload = {}) {
  const visit = await VisitStatistic.create({
    cid: String(payload.cid || '').trim(),
    ip: String(payload.ip || '').trim(),
    region: resolveRegion(payload.ip),
    path: normalizePath(payload.path),
    referer: normalizeReferer(payload.referer),
    ua: String(payload.ua || '').trim(),
    enterTime: toDate(payload.enterTime),
    isComplete: false,
  });

  return {
    visitId: String(visit._id),
    enterTime: new Date(visit.enterTime).getTime(),
  };
}

export async function recordVisitExit(payload = {}) {
  const visitId = String(payload.visitId || '').trim();
  const cid = String(payload.cid || '').trim();
  const path = normalizePath(payload.path);
  const exitTime = toDate(payload.exitTime);
  const duration = Math.max(0, Number(payload.duration || 0));

  let visit = null;
  if (visitId) {
    visit = await VisitStatistic.findById(visitId);
  }

  if (!visit && cid) {
    visit = await VisitStatistic.findOne({
      cid,
      path,
      isComplete: false,
      enterTime: { $gte: new Date(Date.now() - THIRTY_MINUTES_MS) },
    }).sort({ enterTime: -1 });
  }

  if (!visit) {
    return { success: true, skipped: true };
  }

  visit.exitTime = exitTime;
  visit.duration = duration;
  visit.isComplete = true;
  await visit.save();
  return { success: true, skipped: false };
}

export async function getStatisticsOverview(sub = 'overview', range = 'today') {
  const { rangeInfo, visits } = await loadRangeVisits(range);
  const summary = summarizeVisits(visits);
  const sourceRows = toMetricRows(groupVisits(visits, (visit) => parseSourceLabel(visit.referer)));
  const pageRows = toMetricRows(groupVisits(visits, (visit) => visit.path));
  const regionRows = toMetricRows(groupVisits(visits, (visit) => visit.region || '未知'));
  const trendBucketInfo = buildBuckets(rangeInfo);

  for (const visit of visits) {
    assignVisitToBucket(visit, trendBucketInfo);
  }

  const trendRows = trendBucketInfo.buckets.map((bucket) => ({
    label: bucket.label,
    ...summarizeVisits(bucket.visits),
  }));

  const visitorStats = await buildVisitorStats(rangeInfo, visits);

  switch (String(sub || 'overview')) {
    case 'access_trend':
      return {
        summary,
        range: rangeInfo.key,
        rows: trendRows,
      };
    case 'sources':
      return {
        summary,
        range: rangeInfo.key,
        rows: sourceRows,
      };
    case 'pages':
      return {
        summary,
        range: rangeInfo.key,
        rows: pageRows,
      };
    case 'visitors':
      return {
        summary,
        range: rangeInfo.key,
        ...visitorStats,
      };
    case 'regions':
      return {
        summary,
        range: rangeInfo.key,
        rows: regionRows,
      };
    default:
      return {
        summary,
        range: rangeInfo.key,
        cards: {
          accessTrend: trendRows,
          sources: sourceRows,
          pages: pageRows,
          visitors: visitorStats,
          regions: regionRows,
        },
      };
  }
}

export async function exportStatisticsCsv(range = 'today') {
  const data = await getStatisticsOverview('access_trend', range);
  const header = ['时间', 'PV', 'UV', '跳出率', '平均访问时长', '平均访问页数'];
  const rows = data.rows.map((row) => [
    row.label,
    row.pv,
    row.uv,
    row.bounceRate,
    row.avgDuration,
    row.avgPagesPerVisit,
  ]);
  return [header, ...rows]
    .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}