import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listPosts,
  listManagePosts,
  listTrashedPosts,
  listPostsByAuthor,
  getPostBySlug,
  getPostBySlugUnpublished,
  incrementViewCount,
  likePost,
  unlikePost,
  createPost,
  updatePost,
  trashPost,
  restorePost,
  permanentDeletePost,
  getTags,
  getStats,
  listComments,
  addComment,
} from '../services/blogStore.js';
import { readBearerToken, verifyAuthToken } from '../services/auth.js';
import User from '../models/User.js';

const router = Router();

function getStatusCode(error, fallback = 500) {
  return error?.statusCode || fallback;
}

function getOptionalUsername(req) {
  const token = readBearerToken(req);
  if (!token) return null;
  const payload = verifyAuthToken(token);
  return payload?.username || null;
}

router.get('/posts', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const { search, tag } = req.query;
    const author = getOptionalUsername(req);

    const result = await listPosts({ page, limit, search, tag, author });
    res.json(result);
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.get('/users/:nickname/posts', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const { nickname } = req.params;

    const user = await User.findOne({ nickname }).select('email').lean();
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const result = await listPostsByAuthor(user.email, { page, limit });
    res.json(result);
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.get('/posts/manage', requireAuth, async (req, res) => {
  try {
    const [posts, trashed] = await Promise.all([
      listManagePosts(req.user.username),
      listTrashedPosts(req.user.username),
    ]);
    res.json({ posts, trashed });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.get('/tags', async (req, res) => {
  try {
    res.json({ tags: await getTags() });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    res.json(await getStats());
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.get('/posts/:slug', async (req, res) => {
  try {
    let post = await getPostBySlug(req.params.slug);

    if (!post) {
      const username = getOptionalUsername(req);
      if (username) {
        post = await getPostBySlugUnpublished(req.params.slug, username);
      }
    }

    if (!post) {
      return res.status(404).json({ error: '文章不存在' });
    }
    res.json({ post });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.post('/posts/:slug/view', async (req, res) => {
  try {
    await incrementViewCount(req.params.slug);
    res.json({ success: true });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.post('/posts/:slug/like', async (req, res) => {
  try {
    const result = await likePost(req.params.slug);
    res.json(result);
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.delete('/posts/:slug/like', async (req, res) => {
  try {
    const result = await unlikePost(req.params.slug);
    res.json(result);
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.get('/posts/:slug/unpublished', requireAuth, async (req, res) => {
  try {
    const post = await getPostBySlugUnpublished(req.params.slug, req.user.username);
    if (!post) {
      return res.status(404).json({ error: '文章不存在' });
    }
    res.json({ post });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.post('/posts', requireAuth, async (req, res) => {
  try {
    const post = await createPost(req.user.username, req.body || {});
    res.status(201).json({ post });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.put('/posts/:slug', requireAuth, async (req, res) => {
  try {
    const post = await updatePost(req.params.slug, req.user.username, req.body || {});
    res.json({ post });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.put('/posts/:slug/trash', requireAuth, async (req, res) => {
  try {
    const result = await trashPost(req.params.slug, req.user.username);
    res.json(result);
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.put('/posts/:slug/restore', requireAuth, async (req, res) => {
  try {
    const result = await restorePost(req.params.slug, req.user.username);
    res.json(result);
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.delete('/posts/:slug', requireAuth, async (req, res) => {
  try {
    const result = await permanentDeletePost(req.params.slug, req.user.username);
    res.json(result);
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.get('/posts/:slug/comments', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const result = await listComments(req.params.slug, { page, limit });
    res.json(result);
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.post('/posts/:slug/comments', requireAuth, async (req, res) => {
  try {
    const comment = await addComment(req.params.slug, req.user.username, req.body?.content || '');
    res.status(201).json({ comment });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

export default router;
