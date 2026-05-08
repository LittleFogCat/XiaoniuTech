import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DEFAULT_SITE_NAME = 'XiaoNiu Tech';
const DEFAULT_DESCRIPTION = 'XiaoNiu Tech，聚合 AI 对话、技术文章和个人工具的数字工作台。';
const DEFAULT_IMAGE = '/image/niu.jpg';
const JSON_LD_SCRIPT_ID = 'page-seo-jsonld';

function toAbsoluteUrl(value, origin) {
  if (!value) {
    return '';
  }

  try {
    return new URL(value, origin).toString();
  } catch {
    return value;
  }
}

function upsertMeta(selector, attributes, content) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function updateJsonLd(jsonLd) {
  const previous = document.getElementById(JSON_LD_SCRIPT_ID);
  if (!jsonLd) {
    previous?.remove();
    return;
  }

  const script = previous || document.createElement('script');
  script.id = JSON_LD_SCRIPT_ID;
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(jsonLd);
  if (!previous) {
    document.head.appendChild(script);
  }
}

export default function usePageSeo({
  title,
  description,
  canonicalPath,
  image = DEFAULT_IMAGE,
  robots = 'index, follow',
  ogType = 'website',
  jsonLd = null,
}) {
  const location = useLocation();

  useEffect(() => {
    const origin = window.location.origin;
    const resolvedTitle = title || DEFAULT_SITE_NAME;
    const resolvedDescription = (description || DEFAULT_DESCRIPTION).slice(0, 120);
    const canonicalUrl = toAbsoluteUrl(canonicalPath || `${location.pathname}${location.search}`, origin);
    const imageUrl = toAbsoluteUrl(image, origin);

    document.title = resolvedTitle;
    upsertMeta('meta[name="description"]', { name: 'description' }, resolvedDescription);
    upsertMeta('meta[name="robots"]', { name: 'robots' }, robots);
    upsertMeta('meta[property="og:type"]', { property: 'og:type' }, ogType);
    upsertMeta('meta[property="og:title"]', { property: 'og:title' }, resolvedTitle);
    upsertMeta('meta[property="og:description"]', { property: 'og:description' }, resolvedDescription);
    upsertMeta('meta[property="og:image"]', { property: 'og:image' }, imageUrl);
    upsertMeta('meta[property="og:url"]', { property: 'og:url' }, canonicalUrl);
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, resolvedTitle);
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, resolvedDescription);
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, imageUrl);
    upsertCanonical(canonicalUrl);
    updateJsonLd(jsonLd);
  }, [title, description, canonicalPath, image, robots, ogType, jsonLd, location.pathname, location.search]);
}