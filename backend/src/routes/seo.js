import { Router } from 'express';
import User from '../models/User.js';
import { getPostBySlug, listPublishedPostSeoEntries } from '../services/blogStore.js';

const router = Router();

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildSiteOrigin(req) {
  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = forwardedProto || req.protocol;
  return `${protocol}://${req.get('host')}`;
}

function stripMarkdown(content) {
  return String(content || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderInlineMarkdown(content) {
  return escapeHtml(content)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>');
}

function renderMarkdownToHtml(markdown) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let listItems = [];
  let inCodeBlock = false;
  let codeLines = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(`<p>${renderInlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(`<ul>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</ul>`);
    listItems = [];
  };

  const flushCode = () => {
    if (codeLines.length === 0) return;
    blocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    codeLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim().startsWith('```')) {
      flushParagraph();
      flushList();
      if (inCodeBlock) {
        flushCode();
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${renderInlineMarkdown(headingMatch[2].trim())}</h${level}>`);
      continue;
    }

    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1].trim());
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushCode();

  return blocks.join('\n');
}

function buildRobotsTxt(siteOrigin) {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /statistics',
    'Disallow: /chat',
    `Sitemap: ${siteOrigin}/sitemap.xml`,
    '',
  ].join('\n');
}

function buildSitemapXml(siteOrigin, posts) {
  const urls = [
    { loc: `${siteOrigin}/`, lastmod: new Date().toISOString() },
    ...posts.map((post) => ({
      loc: `${siteOrigin}/blog/post/${encodeURIComponent(post.slug)}`,
      lastmod: new Date(post.updatedAt || post.publishedAt || Date.now()).toISOString(),
    })),
  ];

  const items = urls.map((entry) => [
    '  <url>',
    `    <loc>${escapeHtml(entry.loc)}</loc>`,
    `    <lastmod>${escapeHtml(entry.lastmod)}</lastmod>`,
    '  </url>',
  ].join('\n')).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    items,
    '</urlset>',
  ].join('\n');
}

function renderBlogPostHtml({ siteOrigin, post, authorName }) {
  const canonicalUrl = `${siteOrigin}/blog/post/${encodeURIComponent(post.slug)}`;
  const description = escapeHtml((post.excerpt || stripMarkdown(post.content)).slice(0, 120));
  const title = escapeHtml(`${post.title} - XN Blog`);
  const articleSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: (post.excerpt || stripMarkdown(post.content)).slice(0, 120),
    image: `${siteOrigin}/image/niu.jpg`,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    mainEntityOfPage: canonicalUrl,
  });

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${escapeHtml(`${siteOrigin}/image/niu.jpg`)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <script type="application/ld+json">${articleSchema}</script>
    <style>
      :root { color-scheme: light dark; }
      body { margin: 0; font-family: "Noto Sans SC", "Segoe UI", sans-serif; background: #0b1220; color: #e5eefc; }
      .wrap { max-width: 820px; margin: 0 auto; padding: 40px 20px 72px; }
      .back { display: inline-block; margin-bottom: 20px; color: #8ab4ff; text-decoration: none; }
      .meta { color: #92a0b8; font-size: 14px; margin-top: 10px; }
      article { margin-top: 28px; line-height: 1.8; }
      h1, h2, h3, h4, h5, h6 { color: #f8fbff; line-height: 1.3; }
      a { color: #8ab4ff; }
      pre { overflow: auto; padding: 16px; border-radius: 12px; background: rgba(15, 23, 42, 0.9); }
      code { font-family: "IBM Plex Mono", Consolas, monospace; }
      ul { padding-left: 20px; }
      .tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
      .tag { padding: 4px 10px; border-radius: 999px; background: rgba(138, 180, 255, 0.12); color: #cbdcf7; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <a class="back" href="/blog">返回博客首页</a>
      <header>
        <h1>${escapeHtml(post.title)}</h1>
        <div class="meta">${escapeHtml(authorName)} · ${escapeHtml(new Date(post.publishedAt || post.updatedAt || Date.now()).toLocaleString('zh-CN'))}</div>
        ${Array.isArray(post.tags) && post.tags.length > 0 ? `<div class="tags">${post.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
      </header>
      <article>
        ${renderMarkdownToHtml(post.content)}
      </article>
    </div>
  </body>
</html>`;
}

router.get('/robots.txt', (req, res) => {
  const siteOrigin = buildSiteOrigin(req);
  res.type('text/plain; charset=utf-8').send(buildRobotsTxt(siteOrigin));
});

router.get('/sitemap.xml', async (req, res) => {
  try {
    const siteOrigin = buildSiteOrigin(req);
    const posts = await listPublishedPostSeoEntries();
    res.type('application/xml; charset=utf-8').send(buildSitemapXml(siteOrigin, posts));
  } catch (error) {
    res.status(500).type('text/plain; charset=utf-8').send(error.message || 'Failed to build sitemap');
  }
});

router.get('/blog/post/:slug', async (req, res) => {
  try {
    const post = await getPostBySlug(req.params.slug);
    if (!post) {
      return res.status(404).type('text/html; charset=utf-8').send('<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>文章不存在 - XN Blog</title></head><body><h1>文章不存在</h1></body></html>');
    }

    const author = await User.findOne({ email: post.author }).select('nickname email').lean();
    const authorName = author?.nickname || author?.email || post.author || 'XiaoNiu';
    const siteOrigin = buildSiteOrigin(req);
    return res.type('text/html; charset=utf-8').send(renderBlogPostHtml({ siteOrigin, post, authorName }));
  } catch (error) {
    return res.status(500).type('text/plain; charset=utf-8').send(error.message || 'Failed to render blog post');
  }
});

export default router;