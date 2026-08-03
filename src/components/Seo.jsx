import { useEffect } from 'react';

const SITE_NAME = 'UmrahMarket';
const DEFAULT_TITLE = 'UmrahMarket - Verified Umrah & Hajj Packages in Kenya';
const DEFAULT_DESCRIPTION = 'Compare verified Umrah and Hajj packages from trusted travel agents in Kenya. Browse licensed agents, package details, and guidance you can trust.';
const DEFAULT_IMAGE = '/umramarket1.png';

const getAbsoluteUrl = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (typeof window === 'undefined') return value;
  return new URL(value, window.location.origin).toString();
};

const ensureMetaTag = (selector, createAttrs = {}) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    Object.entries(createAttrs).forEach(([key, value]) => {
      if (value !== undefined) element.setAttribute(key, value);
    });
    document.head.appendChild(element);
  }
  return element;
};

const ensureLinkTag = (selector, createAttrs = {}) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('link');
    Object.entries(createAttrs).forEach(([key, value]) => {
      if (value !== undefined) element.setAttribute(key, value);
    });
    document.head.appendChild(element);
  }
  return element;
};

const ensureScriptTag = (id) => {
  let element = document.head.querySelector(`#${id}`);
  if (!element) {
    element = document.createElement('script');
    element.id = id;
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }
  return element;
};

const Seo = ({
  title,
  description,
  canonical,
  image,
  type = 'website',
  noindex = false,
  jsonLd = null,
}) => {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const resolvedTitle = title || DEFAULT_TITLE;
    const resolvedDescription = description || DEFAULT_DESCRIPTION;
    const resolvedImage = getAbsoluteUrl(image || DEFAULT_IMAGE);
    const resolvedCanonical = getAbsoluteUrl(canonical || `${window.location.pathname}${window.location.search}`);

    document.title = resolvedTitle;

    const descriptionTag = ensureMetaTag('meta[name="description"]', { name: 'description' });
    descriptionTag.setAttribute('content', resolvedDescription);

    const robotsTag = ensureMetaTag('meta[name="robots"]', { name: 'robots' });
    robotsTag.setAttribute('content', noindex ? 'noindex, nofollow' : 'index, follow');

    const ogTypeTag = ensureMetaTag('meta[property="og:type"]', { property: 'og:type' });
    ogTypeTag.setAttribute('content', type);

    const ogSiteNameTag = ensureMetaTag('meta[property="og:site_name"]', { property: 'og:site_name' });
    ogSiteNameTag.setAttribute('content', SITE_NAME);

    const ogTitleTag = ensureMetaTag('meta[property="og:title"]', { property: 'og:title' });
    ogTitleTag.setAttribute('content', resolvedTitle);

    const ogDescriptionTag = ensureMetaTag('meta[property="og:description"]', { property: 'og:description' });
    ogDescriptionTag.setAttribute('content', resolvedDescription);

    const ogImageTag = ensureMetaTag('meta[property="og:image"]', { property: 'og:image' });
    ogImageTag.setAttribute('content', resolvedImage);

    const ogUrlTag = ensureMetaTag('meta[property="og:url"]', { property: 'og:url' });
    ogUrlTag.setAttribute('content', resolvedCanonical);

    const twitterCardTag = ensureMetaTag('meta[name="twitter:card"]', { name: 'twitter:card' });
    twitterCardTag.setAttribute('content', 'summary_large_image');

    const twitterTitleTag = ensureMetaTag('meta[name="twitter:title"]', { name: 'twitter:title' });
    twitterTitleTag.setAttribute('content', resolvedTitle);

    const twitterDescriptionTag = ensureMetaTag('meta[name="twitter:description"]', { name: 'twitter:description' });
    twitterDescriptionTag.setAttribute('content', resolvedDescription);

    const twitterImageTag = ensureMetaTag('meta[name="twitter:image"]', { name: 'twitter:image' });
    twitterImageTag.setAttribute('content', resolvedImage);

    const canonicalTag = ensureLinkTag('link[rel="canonical"]', { rel: 'canonical' });
    canonicalTag.setAttribute('href', resolvedCanonical);

    const ldScriptId = 'seo-json-ld';
    if (jsonLd) {
      const script = ensureScriptTag(ldScriptId);
      script.textContent = JSON.stringify(jsonLd);
    } else {
      const existingScript = document.head.querySelector(`#${ldScriptId}`);
      if (existingScript) existingScript.remove();
    }

    return undefined;
  }, [title, description, canonical, image, type, noindex, jsonLd]);

  return null;
};

export default Seo;
export { SITE_NAME, DEFAULT_TITLE, DEFAULT_DESCRIPTION, DEFAULT_IMAGE };