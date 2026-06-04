import { Router } from 'express';
import { resolveUserFromRequest } from '../middleware/auth.js';
import { hasPermission } from '../services/permissionStore.js';
import {
  createStockReview,
  deleteStockReview,
  getStockReviewById,
  listStockReviews,
  updateStockReview,
} from '../services/stockStore.js';

const router = Router();

function sendApiResponse(res, { code = 200, success = true, msg = null, data = null }) {
  return res.status(200).json({ code, success, msg, data });
}

function sendApiError(res, error, fallbackCode = 500, fallbackMessage = '请求失败') {
  return sendApiResponse(res, {
    code: error?.statusCode || fallbackCode,
    success: false,
    msg: error?.message || fallbackMessage,
    data: null,
  });
}

async function ensurePermission(req, res, permission) {
  try {
    const user = await resolveUserFromRequest(req);
    if (!user) {
      sendApiResponse(res, {
        code: 401,
        success: false,
        msg: '未登录或登录已失效',
        data: null,
      });
      return null;
    }

    if (user.isBlacklisted) {
      sendApiResponse(res, {
        code: 403,
        success: false,
        msg: user.blacklist?.reason || '当前账号已被加入黑名单',
        data: null,
      });
      return null;
    }

    if (!hasPermission(user, permission)) {
      sendApiResponse(res, {
        code: 403,
        success: false,
        msg: '没有权限执行该操作',
        data: null,
      });
      return null;
    }

    return user;
  } catch (error) {
    sendApiError(res, error, 500, '权限校验失败');
    return null;
  }
}

router.get('/reviews', async (req, res) => {
  try {
    const result = await listStockReviews({
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      impactLevel: req.query.impactLevel,
      sector: req.query.sector,
      stockCode: req.query.stockCode,
      paginate: true,
    });
    return sendApiResponse(res, { data: result });
  } catch (error) {
    return sendApiError(res, error, 500, '加载股市复盘列表失败');
  }
});

router.get('/reviews/all', async (req, res) => {
  const user = await ensurePermission(req, res, 'stock:review:view_all');
  if (!user) {
    return;
  }

  try {
    const result = await listStockReviews({
      search: req.query.search,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      impactLevel: req.query.impactLevel,
      sector: req.query.sector,
      stockCode: req.query.stockCode,
      paginate: false,
    });
    return sendApiResponse(res, { data: result });
  } catch (error) {
    return sendApiError(res, error, 500, '加载股市复盘列表失败');
  }
});

router.get('/reviews/:id', async (req, res) => {
  try {
    const review = await getStockReviewById(req.params.id);
    return sendApiResponse(res, { data: review });
  } catch (error) {
    return sendApiError(res, error, 500, '加载股市复盘详情失败');
  }
});

router.post('/reviews', async (req, res) => {
  const user = await ensurePermission(req, res, 'stock:review:create');
  if (!user) {
    return;
  }

  try {
    const review = await createStockReview(req.body || {}, {
      creator: {
        id: user.userId,
        nickname: user.nickname || user.email,
        avatar: user.avatarUrl || '',
      },
    });
    return sendApiResponse(res, { data: review });
  } catch (error) {
    return sendApiError(res, error, 500, '创建股市复盘失败');
  }
});

router.put('/reviews/:id', async (req, res) => {
  const user = await ensurePermission(req, res, 'stock:review:update');
  if (!user) {
    return;
  }

  try {
    const review = await updateStockReview(req.params.id, req.body || {});
    return sendApiResponse(res, { data: review });
  } catch (error) {
    return sendApiError(res, error, 500, '更新股市复盘失败');
  }
});

router.delete('/reviews/:id', async (req, res) => {
  const user = await ensurePermission(req, res, 'stock:review:delete');
  if (!user) {
    return;
  }

  try {
    const result = await deleteStockReview(req.params.id);
    return sendApiResponse(res, { data: result });
  } catch (error) {
    return sendApiError(res, error, 500, '删除股市复盘失败');
  }
});

export default router;