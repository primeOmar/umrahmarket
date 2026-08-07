// api/sitemap.js
//
// Dynamic sitemap — implements the TODO left in the static sitemap.xml
// comment ("When ready, generate those from Supabase..."). Isolated Vercel
// serverless function, same shape/spirit as the existing api/package-meta.js
// OG-image function: read-only, additive, and cannot affect any other route.
//
// Uses the same plain fetch() approach as pages/+data.js (not an SDK import)
// so it stays consistent with the one other server-side data loader already
// in this codebase, and needs no new dependencies.
//
// Safety: every dynamic section (packages, agents) is wrapped in its own
// try/catch. If the Render backend is slow or down, that section is simply
// skipped — the function still returns 200 with whatever static + dynamic
// URLs it *did* manage to gather. It never throws, never 500s, and never
// blocks a request waiting past a short timeout.

const _apiBase = process.env.VITE_API_BASE || process.env.VITE_API_URL || 'http://localhost:5000';
const BASE_API = _apiBase.endsWith('/api') ? _apiBase : `${_apiBase}/api`;
const SITE_ORIGIN = 'https://www.umrahmarket.net';

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
        // NOTE: uses the simple /package/:id form, which App.jsx already
        // routes correctly. If you want sitemap URLs to exactly match the
        // slug-based canonical (createPackagePath, used in +Head.jsx),
        // swap this for that same helper — Google will still index either
        // way since the canonical tag on the page itself is authoritative.
        path: `/package/${p.id}`,
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