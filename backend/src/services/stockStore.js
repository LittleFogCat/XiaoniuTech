import mongoose from 'mongoose';
import StockReview from '../models/StockReview.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function ensurePlainObject(value, fallbackMessage) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createHttpError(fallbackMessage);
  }
}

function normalizeTrimmedString(value, fieldLabel, { allowEmpty = false } = {}) {
  if (value == null) {
    throw createHttpError(`${fieldLabel}不能为空`);
  }

  const normalized = String(value).trim();
  if (!normalized && !allowEmpty) {
    throw createHttpError(`${fieldLabel}不能为空`);
  }

  return normalized;
}

function normalizeOptionalString(value) {
  if (value == null) {
    return '';
  }
  return String(value).trim();
}

function normalizeDateString(value, fieldLabel = '复盘日期') {
  const normalized = normalizeTrimmedString(value, fieldLabel);
  if (!DATE_PATTERN.test(normalized)) {
    throw createHttpError(`${fieldLabel}格式必须为 YYYY-MM-DD`);
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw createHttpError(`${fieldLabel}不是有效日期`);
  }

  return normalized;
}

function normalizeFiniteNumber(value, fieldLabel) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    throw createHttpError(`${fieldLabel}必须为数字`);
  }
  return normalized;
}

function normalizeOrderedStringArray(value, fieldLabel) {
  if (!Array.isArray(value)) {
    throw createHttpError(`${fieldLabel}必须为数组`);
  }

  return value.map((item, index) => normalizeTrimmedString(item, `${fieldLabel}第 ${index + 1} 项`));
}

function normalizeMarketIndices(value) {
  if (!Array.isArray(value)) {
    throw createHttpError('市场指数必须为数组');
  }

  return value.map((item, index) => {
    ensurePlainObject(item, `市场指数第 ${index + 1} 项格式错误`);
    return {
      code: normalizeTrimmedString(item.code, `市场指数第 ${index + 1} 项代码`),
      close: normalizeFiniteNumber(item.close, `市场指数第 ${index + 1} 项收盘价`),
      changePercent: normalizeFiniteNumber(item.changePercent, `市场指数第 ${index + 1} 项涨跌幅`),
      name: normalizeTrimmedString(item.name, `市场指数第 ${index + 1} 项名称`),
      reason: normalizeTrimmedString(item.reason, `市场指数第 ${index + 1} 项评价`),
    };
  });
}

function normalizeMarkets(value) {
  ensurePlainObject(value, '市场总览格式错误');
  return {
    summary: normalizeTrimmedString(value.summary, '市场总览摘要'),
    indices: normalizeMarketIndices(value.indices || []),
    volume: normalizeTrimmedString(value.volume, '量能数据'),
  };
}

function normalizeSectorStocks(value, fieldLabel) {
  if (!Array.isArray(value)) {
    throw createHttpError(`${fieldLabel}必须为数组`);
  }

  return value.map((item, index) => {
    ensurePlainObject(item, `${fieldLabel}第 ${index + 1} 项格式错误`);
    return {
      code: normalizeTrimmedString(item.code, `${fieldLabel}第 ${index + 1} 项代码`),
      name: normalizeTrimmedString(item.name, `${fieldLabel}第 ${index + 1} 项名称`),
      changePercent: normalizeFiniteNumber(item.changePercent, `${fieldLabel}第 ${index + 1} 项涨跌幅`),
    };
  });
}

function normalizeHotSectorList(value, fieldLabel, { requireReason = true } = {}) {
  if (!Array.isArray(value)) {
    throw createHttpError(`${fieldLabel}必须为数组`);
  }

  return value.map((item, index) => {
    ensurePlainObject(item, `${fieldLabel}第 ${index + 1} 项格式错误`);
    const normalized = {
      name: normalizeTrimmedString(item.name, `${fieldLabel}第 ${index + 1} 项板块名称`),
      changePercent: normalizeFiniteNumber(item.changePercent, `${fieldLabel}第 ${index + 1} 项涨跌幅`),
      stocks: normalizeSectorStocks(item.stocks || [], `${fieldLabel}第 ${index + 1} 项龙头个股`),
    };

    if (requireReason) {
      normalized.reason = normalizeTrimmedString(item.reason, `${fieldLabel}第 ${index + 1} 项原因`);
    }

    return normalized;
  });
}

function normalizeTodayHot(value) {
  ensurePlainObject(value, '今日热点格式错误');
  return {
    topSectors: normalizeHotSectorList(value.topSectors || [], '热点行业'),
    concepts: normalizeHotSectorList(value.concepts || [], '热点概念', { requireReason: false }),
    fallingSectors: normalizeHotSectorList(value.fallingSectors || [], '领跌板块'),
    summary: normalizeTrimmedString(value.summary, '今日热点总结'),
  };
}

function normalizeNewsItems(value) {
  if (!Array.isArray(value)) {
    throw createHttpError('消息面必须为数组');
  }

  return value.map((item, index) => {
    ensurePlainObject(item, `消息面第 ${index + 1} 项格式错误`);
    return {
      title: normalizeTrimmedString(item.title, `消息面第 ${index + 1} 项标题`),
      content: normalizeOrderedStringArray(item.content || [], `消息面第 ${index + 1} 项内容`),
    };
  });
}

function normalizeFocusSectors(value) {
  if (!Array.isArray(value)) {
    throw createHttpError('关注板块必须为数组');
  }

  return value.map((item, index) => {
    ensurePlainObject(item, `关注板块第 ${index + 1} 项格式错误`);
    return {
      name: normalizeTrimmedString(item.name, `关注板块第 ${index + 1} 项板块名称`),
      reason: normalizeTrimmedString(item.reason, `关注板块第 ${index + 1} 项理由`),
    };
  });
}

function normalizeFocusStockEntries(value, fieldLabel) {
  if (!Array.isArray(value)) {
    throw createHttpError(`${fieldLabel}必须为数组`);
  }

  return value.map((item, index) => {
    ensurePlainObject(item, `${fieldLabel}第 ${index + 1} 项格式错误`);
    return {
      code: normalizeTrimmedString(item.code, `${fieldLabel}第 ${index + 1} 项代码`),
      name: normalizeTrimmedString(item.name, `${fieldLabel}第 ${index + 1} 项名称`),
      reason: normalizeTrimmedString(item.reason, `${fieldLabel}第 ${index + 1} 项理由`),
    };
  });
}

function normalizeFocusStocks(value) {
  if (!Array.isArray(value)) {
    throw createHttpError('明日关注个股必须为数组');
  }

  return value.map((item, index) => {
    ensurePlainObject(item, `明日关注个股第 ${index + 1} 项格式错误`);
    return {
      sector: normalizeTrimmedString(item.sector, `明日关注个股第 ${index + 1} 项所属板块`),
      summary: normalizeOptionalString(item.summary),
      stocks: normalizeFocusStockEntries(item.stocks || [], `明日关注个股第 ${index + 1} 项个股`),
    };
  });
}

function normalizeCreatorMetadata(value) {
  ensurePlainObject(value, '创建者信息缺失');

  return {
    id: normalizeTrimmedString(value.id, '创建者 ID'),
    nickname: normalizeTrimmedString(value.nickname, '创建者昵称'),
    avatar: normalizeOptionalString(value.avatar),
  };
}

function normalizeType(value) {
  if (value === undefined || value === null || value === 0) {
    return resolveReviewType();
  }
  const num = Number(value);
  if (num !== 1 && num !== 2) {
    throw createHttpError('type 字段必须为 0（自动）、1（早盘快报）或 2（今日复盘）');
  }
  return num;
}

function normalizeReviewInput(payload, { partial = false } = {}) {
  ensurePlainObject(payload, '请求数据格式错误');

  const nextValue = {};

  if (!partial || payload.date !== undefined) {
    nextValue.date = normalizeDateString(payload.date);
  }

  if (!partial || payload.type !== undefined) {
    nextValue.type = normalizeType(payload.type);
  }

  // Declares whether the incoming payload carries a non-empty content string.
  // Only used by the create (!partial) branch below to decide whether the
  // markets / todayHot requirement can be relaxed.
  const hasContent = !partial || payload.content !== undefined
    ? !isBlankText(payload.content)
    : false;

  if (!partial || payload.markets !== undefined) {
    if (payload.markets !== undefined && payload.markets !== null) {
      nextValue.markets = normalizeMarkets(payload.markets);
    } else if (!partial && !hasContent) {
      throw createHttpError('未提供文章内容时，市场总览不能为空');
    }
  }

  if (!partial || payload.todayHot !== undefined) {
    if (payload.todayHot !== undefined && payload.todayHot !== null) {
      nextValue.todayHot = normalizeTodayHot(payload.todayHot);
    } else if (!partial && !hasContent) {
      throw createHttpError('未提供文章内容时，今日热点不能为空');
    }
  }
  if (!partial || payload.news !== undefined) {
    nextValue.news = normalizeNewsItems(payload.news || []);
  }
  if (!partial || payload.focusSectors !== undefined) {
    nextValue.focusSectors = normalizeFocusSectors(payload.focusSectors || []);
  }
  if (!partial || payload.focusStocks !== undefined) {
    nextValue.focusStocks = normalizeFocusStocks(payload.focusStocks || payload.focusStoks || []);
  }
  if (!partial || payload.title !== undefined) {
    nextValue.title = normalizeOptionalString(payload.title);
  }
  if (!partial || payload.content !== undefined) {
    nextValue.content = normalizeOptionalString(payload.content);
  }

  if (partial && Object.keys(nextValue).length === 0) {
    throw createHttpError('未提供可更新字段');
  }

  return nextValue;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pushOrCondition(andConditions, conditions) {
  if (conditions.length > 0) {
    andConditions.push({ $or: conditions });
  }
}

function buildListQuery(filters = {}) {
  const andConditions = [];
  const { search, dateFrom, dateTo, sector, stockCode } = filters;

  if (dateFrom || dateTo) {
    const dateCondition = {};
    if (dateFrom) {
      dateCondition.$gte = normalizeDateString(dateFrom, '开始日期');
    }
    if (dateTo) {
      dateCondition.$lte = normalizeDateString(dateTo, '结束日期');
    }
    andConditions.push({ date: dateCondition });
  }

  if (search) {
    const regex = new RegExp(escapeRegex(String(search).trim()), 'i');
    pushOrCondition(andConditions, [
      { date: regex },
      { title: regex },
      { content: regex },
      { 'markets.summary': regex },
      { 'markets.volume': regex },
      { 'markets.indices.code': regex },
      { 'markets.indices.name': regex },
      { 'todayHot.topSectors.name': regex },
      { 'todayHot.topSectors.reason': regex },
      { 'todayHot.topSectors.stocks.code': regex },
      { 'todayHot.topSectors.stocks.name': regex },
      { 'todayHot.concepts.name': regex },
      { 'todayHot.fallingSectors.name': regex },
      { 'todayHot.fallingSectors.reason': regex },
      { 'todayHot.summary': regex },
      { 'news.title': regex },
      { 'news.content': regex },
      { 'news.summary': regex },
      { 'focusSectors.name': regex },
      { 'focusSectors.reason': regex },
      { 'focusStocks.sector': regex },
      { 'focusStocks.summary': regex },
      { 'focusStocks.stocks.code': regex },
      { 'focusStocks.stocks.name': regex },
      { 'focusStocks.stocks.reason': regex },
      { 'topSectors.name': regex },
      { 'topSectors.topStocks': regex },
      { 'focusStocks.code': regex },
      { 'focusStocks.name': regex },
      { 'focusStocks.reason': regex },
    ]);
  }

  if (sector) {
    const regex = new RegExp(escapeRegex(String(sector).trim()), 'i');
    pushOrCondition(andConditions, [
      { 'todayHot.topSectors.name': regex },
      { 'todayHot.concepts.name': regex },
      { 'todayHot.fallingSectors.name': regex },
      { 'focusSectors.name': regex },
      { 'focusStocks.sector': regex },
      { 'topSectors.name': regex },
      { 'news.impactSectors': regex },
    ]);
  }

  if (stockCode) {
    const regex = new RegExp(escapeRegex(String(stockCode).trim()), 'i');
    pushOrCondition(andConditions, [
      { 'todayHot.topSectors.stocks.code': regex },
      { 'todayHot.concepts.stocks.code': regex },
      { 'todayHot.fallingSectors.stocks.code': regex },
      { 'focusStocks.stocks.code': regex },
      { 'topSectors.topStocks': regex },
      { 'focusStocks.code': regex },
    ]);
  }

  if (andConditions.length === 0) {
    return {};
  }
  if (andConditions.length === 1) {
    return andConditions[0];
  }
  return { $and: andConditions };
}

function normalizePersistenceError(error) {
  if (error?.code === 11000) {
    return createHttpError('复盘记录保存失败', 500);
  }
  if (error?.name === 'ValidationError') {
    return createHttpError(error.message, 400);
  }
  return error;
}

export async function ensureStockReviewIndexes() {
  try {
    await StockReview.createCollection();
  } catch (error) {
    if (error?.code !== 48 && error?.codeName !== 'NamespaceExists') {
      throw error;
    }
  }

  await StockReview.syncIndexes();
}

function isBlankText(value) {
  return value == null || String(value).trim() === '';
}

function resolveReviewType(type) {
  if (type === 1) return 1;
  if (type === 2) return 2;
  // Auto-detect based on current time: morning → early briefing, afternoon → daily review
  const now = new Date();
  return now.getHours() < 12 ? 1 : 2;
}

function isLegacyNewsItem(item) {
  return item && typeof item === 'object' && !Array.isArray(item) && Object.prototype.hasOwnProperty.call(item, 'summary');
}

function isLegacyFlatFocusStocks(value) {
  return Array.isArray(value) && value.some((item) => item && typeof item === 'object' && !Array.isArray(item) && Object.prototype.hasOwnProperty.call(item, 'code') && !Object.prototype.hasOwnProperty.call(item, 'stocks'));
}

function hasMalformedFocusStockGroups(value) {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.some((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return true;
    }

    const sector = String(item.sector || '').trim();
    return !sector || !Array.isArray(item.stocks);
  });
}

function normalizeLegacyTopSectors(review) {
  if (!Array.isArray(review.topSectors)) {
    return [];
  }

  return review.topSectors
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      name: String(item.name || '').trim(),
      changePercent: Number.isFinite(Number(item.changePercent)) ? Number(item.changePercent) : 0,
      reason: '由旧版复盘记录迁移，建议补充板块原因。',
      stocks: Array.isArray(item.topStocks)
        ? item.topStocks
            .map((code) => String(code || '').trim())
            .filter(Boolean)
            .map((code) => ({
              code,
              name: code,
              changePercent: 0,
            }))
        : [],
    }))
    .filter((item) => item.name);
}

function normalizeLegacyNews(review) {
  if (!Array.isArray(review.news)) {
    return [];
  }

  return review.news
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      if (Array.isArray(item.content)) {
        return {
          title: String(item.title || '').trim(),
          content: item.content.map((entry) => String(entry || '').trim()).filter(Boolean),
        };
      }

      const content = [
        item.summary,
        item.detail ? `详情：${item.detail}` : '',
        item.source ? `来源：${item.source}` : '',
        item.publishTime ? `发布时间：${item.publishTime}` : '',
        Array.isArray(item.impactSectors) && item.impactSectors.length ? `影响板块：${item.impactSectors.join('、')}` : '',
      ]
        .map((entry) => String(entry || '').trim())
        .filter(Boolean);

      return {
        title: String(item.title || '').trim(),
        content,
      };
    })
    .filter((item) => item.title || item.content.length > 0);
}

function normalizeLegacyFocusSectors(review) {
  if (!Array.isArray(review.focusSectors)) {
    return [];
  }

  return review.focusSectors
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      name: String(item.name || '').trim(),
      reason: String(item.reason || '').trim(),
    }))
    .filter((item) => item.name || item.reason);
}

function normalizeLegacyFocusStocks(review) {
  if (Array.isArray(review.focusStocks) && review.focusStocks.some((item) => item && typeof item === 'object' && Array.isArray(item.stocks))) {
    return review.focusStocks
      .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
      .map((item) => ({
        sector: String(item.sector || '').trim() || '未分组',
        summary: String(item.summary || '').trim(),
        stocks: Array.isArray(item.stocks)
          ? item.stocks
              .filter((stock) => stock && typeof stock === 'object' && !Array.isArray(stock))
              .map((stock) => ({
                code: String(stock.code || '').trim(),
                name: String(stock.name || '').trim(),
                reason: String(stock.reason || '').trim(),
              }))
              .filter((stock) => stock.code || stock.name || stock.reason)
          : [],
      }))
      .filter((group) => group.sector || group.stocks.length > 0);
  }
  if (!isLegacyFlatFocusStocks(review.focusStocks)) {
    return [];
  }

  const stocks = review.focusStocks
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      code: String(item.code || '').trim(),
      name: String(item.name || '').trim(),
      reason: String(item.reason || '').trim(),
    }))
    .filter((item) => item.code || item.name || item.reason);

  if (stocks.length === 0) {
    return [];
  }

  return [
    {
      sector: '未分组',
      summary: '',
      stocks,
    },
  ];
}

function buildLegacyHotSummary(review, topSectors, focusSectors) {
  if (typeof review.todayHot?.summary === 'string' && review.todayHot.summary.trim()) {
    return review.todayHot.summary.trim();
  }
  if (focusSectors.length > 0) {
    return focusSectors.map((item) => `${item.name}${item.reason ? `：${item.reason}` : ''}`).join('；');
  }
  if (topSectors.length > 0) {
    return topSectors.map((item) => `${item.name} ${formatPercentText(item.changePercent)}`).join('、');
  }
  return '暂无热点总结';
}

function normalizeLegacyReviewShape(review) {
  const topSectors = normalizeLegacyTopSectors(review);
  const focusSectors = normalizeLegacyFocusSectors(review);
  const normalizedNews = normalizeLegacyNews(review);
  const focusStocks = normalizeLegacyFocusStocks(review);

  // Only fill fallback markets/todayHot for records that lack their own content
  const needsFallback = isBlankText(review.content);

  return {
    ...review,
    markets: review.markets || (needsFallback ? {
      summary: normalizedNews[0]?.content?.[0] || '暂无市场摘要',
      indices: [],
      volume: '暂无量能数据',
    } : undefined),
    todayHot: review.todayHot || (needsFallback ? {
      topSectors,
      concepts: [],
      fallingSectors: [],
      summary: buildLegacyHotSummary(review, topSectors, focusSectors),
    } : undefined),
    news: normalizedNews,
    focusSectors,
    focusStocks,
  };
}

function buildReviewTitle(date, type) {
  const d = normalizeDateString(date);
  const parsed = new Date(`${d}T00:00:00.000Z`);
  const weekday = getWeekdayLabel(d);
  const y = parsed.getUTCFullYear();
  const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  const dateStr = `${y}年${m}月${day}日（${weekday}）`;

  const effectiveType = type == null ? 2 : resolveReviewType(type);
  if (effectiveType === 1) {
    return `${dateStr}早盘快报`;
  }
  return `${dateStr}A股复盘`;
}

function getWeekdayLabel(date) {
  const normalized = normalizeDateString(date);
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  return WEEKDAY_LABELS[parsed.getUTCDay()];
}

function formatNumberText(value) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    return '--';
  }
  if (Number.isInteger(normalized)) {
    return normalized.toFixed(0);
  }

  return normalized
    .toFixed(2)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '');
}

function formatPercentText(value) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    return '--';
  }
  const prefix = normalized > 0 ? '+' : '';
  return `${prefix}${formatNumberText(normalized)}%`;
}

function buildSectorStockLine(stocks) {
  if (!Array.isArray(stocks) || stocks.length === 0) {
    return '暂无关注个股';
  }

  return stocks
    .map((item) => `**${item.name} ${formatPercentText(item.changePercent)}**`)
    .join('、');
}

function pushMarkdownListSection(lines, title, items, formatter) {
  lines.push(title);
  lines.push('');

  if (!Array.isArray(items) || items.length === 0) {
    lines.push('暂无数据');
    lines.push('');
    return;
  }

  items.slice(0, 5).forEach((item, index) => {
    const formatted = formatter(item, index);
    if (Array.isArray(formatted)) {
      lines.push(...formatted);
    } else {
      lines.push(formatted);
    }
  });
  lines.push('');
}

function buildReviewContent(review) {
  ensurePlainObject(review, '复盘数据格式错误');
  ensurePlainObject(review.markets, '市场总览格式错误');
  ensurePlainObject(review.todayHot, '今日热点格式错误');

  const date = normalizeDateString(review.date);
  const marketSummary = normalizeTrimmedString(review.markets.summary, '市场总览摘要');
  const marketVolume = normalizeTrimmedString(review.markets.volume, '量能数据');
  const hotSummary = normalizeTrimmedString(review.todayHot.summary, '今日热点总结');
  const indices = Array.isArray(review.markets.indices) ? review.markets.indices : [];
  const topSectors = Array.isArray(review.todayHot.topSectors) ? review.todayHot.topSectors : [];
  const concepts = Array.isArray(review.todayHot.concepts) ? review.todayHot.concepts : [];
  const fallingSectors = Array.isArray(review.todayHot.fallingSectors) ? review.todayHot.fallingSectors : [];
  const news = Array.isArray(review.news) ? review.news : [];
  const focusSectors = Array.isArray(review.focusSectors) ? review.focusSectors : [];
  const focusStocks = Array.isArray(review.focusStocks) ? review.focusStocks : [];
  const lines = [];

  lines.push('# 今日盘面');
  lines.push(`**复盘日期：${date}（${getWeekdayLabel(date)}）**`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 今日大盘');
  lines.push(marketSummary);
  lines.push('');
  lines.push('| 指数 | 收盘价 | 涨跌幅 | 评价 |');
  lines.push('| --- | --- | :---: | --- |');

  if (indices.length === 0) {
    lines.push('| 暂无数据 | -- | -- | -- |');
  } else {
    indices.forEach((item) => {
      lines.push(`| ${item.name} | ${formatNumberText(item.close)} | ${formatPercentText(item.changePercent)} | ${item.reason} |`);
    });
  }

  lines.push('');
  lines.push(marketVolume);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 今日热点');
  lines.push('');

  pushMarkdownListSection(lines, '### 行业板块涨幅 TOP5', topSectors, (item, index) => {
    const block = [`${index + 1}. **${item.name}：** ${formatPercentText(item.changePercent)} — ${item.reason}`];
    if ((item.stocks || []).length > 0) {
      block.push(`   关注：${buildSectorStockLine(item.stocks)}`);
    }
    block.push('');
    return block;
  });

  pushMarkdownListSection(lines, '### 概念板块涨幅 TOP5', concepts, (item, index) => {
    const block = [`${index + 1}. **${item.name}：** ${formatPercentText(item.changePercent)}${item.reason ? ` — ${item.reason}` : ''}`];
    if ((item.stocks || []).length > 0) {
      block.push(`   关注：${buildSectorStockLine(item.stocks)}`);
    }
    block.push('');
    return block;
  });

  lines.push('### 领跌板块 TOP5');
  lines.push('');
  lines.push('| 板块 | 跌幅 | 逻辑 |');
  lines.push('| --- | :---: | --- |');
  if (fallingSectors.length === 0) {
    lines.push('| 暂无数据 | -- | -- |');
  } else {
    fallingSectors.slice(0, 5).forEach((item) => {
      lines.push(`| ${item.name} | ${formatPercentText(item.changePercent)} | ${item.reason} |`);
    });
  }
  lines.push('');
  lines.push('### 龙头板块梳理');
  lines.push('');
  lines.push(hotSummary);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 消息面');

  if (news.length === 0) {
    lines.push('');
    lines.push('暂无消息面内容');
  } else {
    news.forEach((item) => {
      lines.push('');
      lines.push(`### ${item.title}`);
      if (!Array.isArray(item.content) || item.content.length === 0) {
        lines.push('+ 暂无内容');
        return;
      }
      item.content.forEach((entry) => {
        lines.push(`+ ${entry}`);
      });
    });
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 明日关注板块');
  lines.push('');

  if (focusSectors.length === 0) {
    lines.push('+ 暂无关注板块');
  } else {
    focusSectors.forEach((item) => {
      lines.push(`+ **${item.name}：** ${item.reason}`);
    });
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 明日关注个股');

  if (focusStocks.length === 0) {
    lines.push('');
    lines.push('+ 暂无关注个股');
  } else {
    focusStocks.forEach((group) => {
      lines.push('');
      lines.push(`**${group.sector}：**`);
      if (group.summary) {
        lines.push('');
        lines.push(group.summary);
      }
      lines.push('');
      if (!Array.isArray(group.stocks) || group.stocks.length === 0) {
        lines.push('+ 暂无个股');
      } else {
        group.stocks.forEach((item) => {
          lines.push(`+ ${item.name}（${item.code}）：${item.reason}`);
        });
      }
    });
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function generateMissingReviewFields(review) {
  const normalizedReview = normalizeLegacyReviewShape(review);
  const generated = {};

  if (isBlankText(normalizedReview.title)) {
    generated.title = buildReviewTitle(normalizedReview.date, normalizedReview.type);
  }
  if (isBlankText(normalizedReview.content) && normalizedReview.markets && normalizedReview.todayHot) {
    generated.content = buildReviewContent(normalizedReview);
  }

  return generated;
}

async function ensureGeneratedReviewDocument(review) {
  const current = review.toObject();
  const normalized = normalizeLegacyReviewShape(current);
  const generated = generateMissingReviewFields(normalized);
  const updates = {
    ...generated,
  };

  if (!current.markets && normalized.markets) {
    // Only auto-fill markets for legacy docs that have no content
    if (isBlankText(current.content)) {
      updates.markets = normalized.markets;
    }
  }
  if (!current.todayHot && normalized.todayHot) {
    if (isBlankText(current.content)) {
      updates.todayHot = normalized.todayHot;
    }
  }
  if (Array.isArray(current.news) && current.news.some((item) => isLegacyNewsItem(item))) {
    updates.news = normalized.news;
  }
  if (isLegacyFlatFocusStocks(current.focusStocks) || hasMalformedFocusStockGroups(current.focusStocks)) {
    updates.focusStocks = normalized.focusStocks;
  }

  if (current.type == null) {
    // Existing docs created before the 'type' field was introduced default to
    // type 2 (A-share daily review).  Writing this back keeps the query filter
    // working and avoids title being re-calculated on every subsequent read.
    updates.type = 2;
  }

  if (Object.keys(updates).length === 0) {
    return normalized;
  }

  review.set(updates);
  await review.save();
  return review.toObject();
}

async function requireExistingReview(reviewId) {
  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    throw createHttpError('复盘记录不存在', 404);
  }

  const review = await StockReview.findById(reviewId);
  if (!review) {
    throw createHttpError('复盘记录不存在', 404);
  }
  return review;
}

export async function listStockReviews({
  page = 1,
  limit = 20,
  search,
  dateFrom,
  dateTo,
  impactLevel,
  sector,
  stockCode,
  paginate = true,
} = {}) {
  void impactLevel;

  const query = buildListQuery({ search, dateFrom, dateTo, sector, stockCode });
  const baseQuery = StockReview.find(query).sort({ date: -1, createdAt: -1 });

  if (!paginate) {
    const reviewDocs = await baseQuery;
    const reviews = await Promise.all(reviewDocs.map((review) => ensureGeneratedReviewDocument(review)));
    return {
      reviews,
      total: reviews.length,
    };
  }

  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;

  const [reviewDocs, total] = await Promise.all([
    baseQuery.skip(skip).limit(safeLimit),
    StockReview.countDocuments(query),
  ]);
  const reviews = await Promise.all(reviewDocs.map((review) => ensureGeneratedReviewDocument(review)));

  return {
    reviews,
    total,
    page: safePage,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}

export async function getStockReviewById(reviewId) {
  const review = await requireExistingReview(reviewId);
  return ensureGeneratedReviewDocument(review);
}

export async function createStockReview(payload, { creator } = {}) {
  const input = normalizeReviewInput(payload);
  input.creator = normalizeCreatorMetadata(creator);

  if (isBlankText(input.content) && (!input.markets || !input.todayHot)) {
    if (!input.markets) throw createHttpError('未提供文章内容时，市场总览不能为空');
    if (!input.todayHot) throw createHttpError('未提供文章内容时，今日热点不能为空');
  }

  Object.assign(input, generateMissingReviewFields(input));

  try {
    const review = await StockReview.create(input);
    return review.toObject();
  } catch (error) {
    throw normalizePersistenceError(error);
  }
}

export async function updateStockReview(reviewId, payload) {
  const review = await requireExistingReview(reviewId);
  const updates = normalizeReviewInput(payload, { partial: true });

  Object.assign(review, updates);
  Object.assign(review, generateMissingReviewFields(review.toObject()));

  try {
    await review.save();
    return review.toObject();
  } catch (error) {
    throw normalizePersistenceError(error);
  }
}

export async function deleteStockReview(reviewId) {
  const review = await requireExistingReview(reviewId);
  await review.deleteOne();
  return {
    success: true,
    id: String(review._id),
  };
}