const _apiBase = process.env.VITE_API_BASE || process.env.VITE_API_URL || 'http://localhost:5000';
const BASE_API = _apiBase.endsWith('/api') ? _apiBase : `${_apiBase}/api`;
const SITE_ORIGIN = 'https://www.umrahmarket.net';

// Verbatim copy of package-meta.js's toSlug(), duplicated on purpose rather
// than imported — same reasoning as +data.js's duplicated normalise():
// this function runs in an isolated Vercel serverless function and should
// not depend on src/utils/packageSeo.js in case that module ever picks up
// a browser-only dependency. If you change slug generation in
// packageSeo.js's createPackagePath(), mirror the change here too.
const toSlug = (value = '') => {
  const text = String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return text || 'umrah-package';
};

// Matches createPackagePath()'s output (used as the canonical URL in
// +Head.jsx) so sitemap entries never diverge from the page's own
// canonical tag — no wasted crawl budget on a redirect/canonicalization hop.
const buildPackagePath = (pkg) => {
  const title = pkg.name || pkg.title || 'Umrah Package';
  return `/umra-package/${toSlug(title)}/${pkg.id}`;
};

// Static routes — mirrors the existing sitemap.xml exactly.
const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/agents', changefreq: 'daily', priority: '0.9' },
  { path: '/guidance', changefreq: 'monthly', priority: '0.7' },
  { path: '/experiences', changefreq: 'monthly', priority: '0.6' },
  { path: '/verified', changefreq: 'monthly', priority: '0.6' },
];

const withTimeout = (ms) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
};

const fetchPackageUrls = async () => {
  const { signal, clear } = withTimeout(5000);
  try {
    const res = await fetch(`${BASE_API}/packages/all-active`, {
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!res.ok) throw new Error(`Packages fetch failed: ${res.status}`);
    const json = await res.json();
    const list = Array.isArray(json) ? json : (json.packages ?? json.data ?? []);
    return list
      .filter((p) => p && p.id)
      .map((p) => ({
        path: buildPackagePath(p),
        changefreq: 'weekly',
        priority: '0.8',
        lastmod: p.updated_at || p.created_at || null,
      }));
  } catch (err) {
    console.error('[api/sitemap] package fetch skipped:', err.message);
    return [];
  } finally {
    clear();
  }
};

const fetchAgentUrls = async () => {
  const { signal, clear } = withTimeout(5000);
  try {
    const res = await fetch(`${BASE_API}/agents`, {
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!res.ok) throw new Error(`Agents fetch failed: ${res.status}`);
    const json = await res.json();
    const list = Array.isArray(json) ? json : (json.agents ?? json.data ?? []);
    return list
      // Same verified-only filter AgentsPage.jsx already applies client-side
      // — keeps the sitemap consistent with what's actually shown/linked.
      .filter((a) => a && a.id && (a.verificationStatus === 'verified' || a.verificationStatus === 'approved'))
      .map((a) => ({
        path: `/agents/${a.id}`,
        changefreq: 'weekly',
        priority: '0.7',
        lastmod: null,
      }));
  } catch (err) {
    console.error('[api/sitemap] agent fetch skipped:', err.message);
    return [];
  } finally {
    clear();
  }
};

const escapeXml = (str) => String(str).replace(/[<>&'"]/g, (c) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
}[c]));

const toUrlEntry = ({ path, changefreq, priority, lastmod }) => {
  const loc = `${SITE_ORIGIN}${path}`;
  const lastmodTag = lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : '';
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    ${lastmodTag}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
};

export default async function handler(req, res) {
  const [packageEntries, agentEntries] = await Promise.all([
    fetchPackageUrls(),
    fetchAgentUrls(),
  ]);

  const allEntries = [...STATIC_ROUTES, ...packageEntries, ...agentEntries];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${allEntries.map(toUrlEntry).join('\n')}\n</urlset>\n`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  // Cached at the edge for an hour so crawler traffic doesn't hammer the
  // Render backend on every request; stale-while-revalidate keeps it fast.
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}