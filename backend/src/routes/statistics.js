import { Router } from 'express';
import { requirePermission } from '../middleware/auth.js';
import { exportStatisticsCsv, getStatisticsOverview, recordVisitEnter, recordVisitExit } from '../services/statisticsStore.js';

const router = Router();

function getStatusCode(error, fallback = 500) {
  return error?.statusCode || fallback;
}

function getClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket?.remoteAddress || '';
}

router.post('/statistics/enter', async (req, res) => {
  try {
    const result = await recordVisitEnter({
      cid: req.body?.cid,
      path: req.body?.path,
      referer: req.body?.referer || req.headers.referer || '',
      ua: req.headers['user-agent'] || req.body?.ua || '',
      ip: getClientIp(req),
      enterTime: req.body?.enterTime,
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.post('/statistics/exit', async (req, res) => {
  try {
    const result = await recordVisitExit({
      visitId: req.body?.visitId,
      cid: req.body?.cid,
      path: req.body?.path,
      exitTime: req.body?.exitTime,
      duration: req.body?.duration,
    });
    res.json(result);
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.get('/statistics/overview', requirePermission('statistics:view'), async (req, res) => {
  try {
    const sub = String(req.query.sub || 'overview');
    const range = String(req.query.range || 'today');
    res.json(await getStatisticsOverview(sub, range));
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.get('/statistics/export', requirePermission('statistics:export'), async (req, res) => {
  try {
    const range = String(req.query.range || 'today');
    const csv = await exportStatisticsCsv(range);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="statistics_${range}.csv"`);
    res.send(`\uFEFF${csv}`);
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

export default router;