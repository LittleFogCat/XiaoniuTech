import crypto from 'crypto';
import BlogPost from '../models/BlogPost.js';
import BlogComment from '../models/BlogComment.js';
import User from '../models/User.js';

const HASH_BYTES = 8;

function generateHash() {
  return crypto.randomBytes(HASH_BYTES).toString('hex');
}

function generateExcerpt(content, maxLength = 200) {
  const text = content.replace(/[#*`>\[\]()!\-|]/g, '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}

function countWords(content) {
  const chineseChars = (content.match(/[一-鿿]/g) || []).length;
  const englishWords = (content.match(/[a-zA-Z]+/g) || []).length;
  return chineseChars + englishWords;
}

function notTrashed(query) {
  query.trashed = { $ne: true };
}

export async function listPosts({ page = 1, limit = 20, search, tag, author } = {}) {
  const query = {};

  if (author) {
    query.$or = [{ published: true }, { author, trashed: { $ne: true } }];
  } else {
    query.published = true;
  }
  notTrashed(query);

  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const searchQuery = [{ title: regex }, { content: regex }];
    query.$and = query.$and || [];
    query.$and.push({ $or: searchQuery });
  }

  if (tag) {
    query.tags = tag;
  }

  const total = await BlogPost.countDocuments(query);
  const posts = await BlogPost.find(query)
    .select('-content')
    .sort({ publishedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    posts,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function listManagePosts(author) {
  return BlogPost.find({ author, trashed: { $ne: true } })
    .select('-content')
    .sort({ updatedAt: -1 })
    .lean();
}

export async function listTrashedPosts(author) {
  return BlogPost.find({ author, trashed: true })
    .select('-content')
    .sort({ trashedAt: -1 })
    .lean();
}

export async function getPostBySlug(slug) {
  const query = { slug, published: true, trashed: { $ne: true } };
  return BlogPost.findOne(query).lean();
}

export async function getPostBySlugUnpublished(slug, author) {
  return BlogPost.findOne({ slug, author, trashed: { $ne: true } }).lean();
}

export async function incrementViewCount(slug) {
  await BlogPost.findOneAndUpdate(
    { slug, published: true, trashed: { $ne: true } },
    { $inc: { viewCount: 1 } }
  );
}

export async function createPost(author, data) {
  const { title, content, tags = [], published = false } = data;

  if (!title || !title.trim()) {
    const error = new Error('标题不能为空');
    error.statusCode = 400;
    throw error;
  }

  if (!content || !content.trim()) {
    const error = new Error('内容不能为空');
    error.statusCode = 400;
    throw error;
  }

  let slug;
  for (let i = 0; i < 5; i++) {
    slug = generateHash();
    const exists = await BlogPost.findOne({ slug }).select('_id').lean();
    if (!exists) break;
  }

  const excerpt = generateExcerpt(content);
  const wordCount = countWords(title) + countWords(content);

  const post = await BlogPost.create({
    title: title.trim(),
    slug,
    content,
    excerpt,
    tags,
    author,
    published,
    publishedAt: published ? new Date() : null,
    wordCount,
  });

  return post.toObject();
}

export async function updatePost(slug, author, data) {
  const post = await BlogPost.findOne({ slug, trashed: { $ne: true } });

  if (!post) {
    const error = new Error('文章不存在');
    error.statusCode = 404;
    throw error;
  }

  if (post.author !== author) {
    const error = new Error('仅文章作者可编辑');
    error.statusCode = 403;
    throw error;
  }

  const { title, content, tags, published } = data;

  if (title !== undefined) {
    post.title = title.trim();
  }

  if (content !== undefined) {
    post.content = content;
    post.excerpt = generateExcerpt(content);
  }

  if (title !== undefined || content !== undefined) {
    post.wordCount = countWords(post.title) + countWords(post.content);
  }

  if (tags !== undefined) {
    post.tags = tags;
  }

  if (published !== undefined && published !== post.published) {
    post.published = published;
    post.publishedAt = published ? new Date() : null;
  }

  await post.save();
  return post.toObject();
}

export async function trashPost(slug, author) {
  const post = await BlogPost.findOne({ slug, trashed: { $ne: true } });

  if (!post) {
    const error = new Error('文章不存在');
    error.statusCode = 404;
    throw error;
  }

  if (post.author !== author) {
    const error = new Error('仅文章作者可操作');
    error.statusCode = 403;
    throw error;
  }

  post.trashed = true;
  post.trashedAt = new Date();
  post.published = false;
  await post.save();
  return { success: true };
}

export async function restorePost(slug, author) {
  const post = await BlogPost.findOne({ slug, trashed: true });

  if (!post) {
    const error = new Error('文章不存在');
    error.statusCode = 404;
    throw error;
  }

  if (post.author !== author) {
    const error = new Error('仅文章作者可操作');
    error.statusCode = 403;
    throw error;
  }

  post.trashed = false;
  post.trashedAt = null;
  await post.save();
  return { success: true };
}

export async function permanentDeletePost(slug, author) {
  const post = await BlogPost.findOne({ slug, trashed: true });

  if (!post) {
    const error = new Error('文章不存在');
    error.statusCode = 404;
    throw error;
  }

  if (post.author !== author) {
    const error = new Error('仅文章作者可操作');
    error.statusCode = 403;
    throw error;
  }

  await BlogComment.deleteMany({ postId: post._id });
  await post.deleteOne();
  return { success: true };
}

export async function likePost(slug) {
  const post = await BlogPost.findOneAndUpdate(
    { slug, published: true, trashed: { $ne: true } },
    { $inc: { likes: 1 } },
    { new: true }
  ).select('likes').lean();

  if (!post) {
    const error = new Error('文章不存在');
    error.statusCode = 404;
    throw error;
  }

  return { likes: post.likes };
}

export async function unlikePost(slug) {
  const post = await BlogPost.findOneAndUpdate(
    { slug, published: true, trashed: { $ne: true }, likes: { $gt: 0 } },
    { $inc: { likes: -1 } },
    { new: true }
  ).select('likes').lean();

  if (!post) {
    const error = new Error('文章不存在');
    error.statusCode = 404;
    throw error;
  }

  return { likes: post.likes };
}

export async function getTags() {
  const result = await BlogPost.aggregate([
    { $match: { published: true, trashed: { $ne: true } } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return result.map(({ _id, count }) => ({ name: _id, count }));
}

export async function getStats() {
  const result = await BlogPost.aggregate([
    { $match: { published: true, trashed: { $ne: true } } },
    {
      $group: {
        _id: null,
        totalPosts: { $sum: 1 },
        totalWords: { $sum: '$wordCount' },
      },
    },
  ]);

  const stats = result[0] || { totalPosts: 0, totalWords: 0 };
  return {
    totalPosts: stats.totalPosts,
    totalWords: stats.totalWords,
  };
}

export async function listComments(postId, { page = 1, limit = 50 } = {}) {
  const post = await BlogPost.findOne({ slug: postId, trashed: { $ne: true } }).select('_id').lean();

  if (!post) {
    const error = new Error('文章不存在');
    error.statusCode = 404;
    throw error;
  }

  const total = await BlogComment.countDocuments({ postId: post._id });
  const comments = await BlogComment.find({ postId: post._id })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const authorEmails = [...new Set(comments.map((c) => c.author))];
  const users = await User.find({ email: { $in: authorEmails } })
    .select('email nickname avatarFileId')
    .lean();

  const userMap = {};
  for (const u of users) {
    userMap[u.email] = {
      nickname: u.nickname || u.email,
      avatarUrl: u.avatarFileId ? `/api/files/${u.avatarFileId}` : '',
    };
  }

  const enriched = comments.map((c) => ({
    ...c,
    authorProfile: userMap[c.author] || { nickname: c.author, avatarUrl: '' },
  }));

  return {
    comments: enriched,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function listPostsByAuthor(authorEmail, { page = 1, limit = 20 } = {}) {
  const query = { author: authorEmail, published: true, trashed: { $ne: true } };
  const [total, totalWordsResult] = await Promise.all([
    BlogPost.countDocuments(query),
    BlogPost.aggregate([
      { $match: { author: authorEmail, published: true, trashed: { $ne: true } } },
      { $group: { _id: null, totalWords: { $sum: '$wordCount' } } },
    ]),
  ]);

  const totalWords = totalWordsResult[0]?.totalWords || 0;

  const posts = await BlogPost.find(query)
    .select('-content')
    .sort({ publishedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    posts,
    total,
    totalWords,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function addComment(postId, author, content) {
  if (!content || !content.trim()) {
    const error = new Error('评论内容不能为空');
    error.statusCode = 400;
    throw error;
  }

  const post = await BlogPost.findOne({ slug: postId, published: true, trashed: { $ne: true } }).select('_id').lean();

  if (!post) {
    const error = new Error('文章不存在');
    error.statusCode = 404;
    throw error;
  }

  const comment = await BlogComment.create({
    postId: post._id,
    author,
    content: content.trim(),
  });

  await BlogPost.findByIdAndUpdate(post._id, { $inc: { commentCount: 1 } });

  return comment.toObject();
}
