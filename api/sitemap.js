// api/sitemap.js
// ─────────────────────────────────────────────────────────────────────────────
// Vercel serverless function. Your vercel.json already rewrites
// /sitemap.xml -> /api/sitemap, so this file just needs to exist at
// api/sitemap.js in your project root (same convention as api/ssr.js) and
// it's live — no other config or Render deployment needed.
//
// Replaces the old committed static sitemap.xml, which is how the 7
// landing pages in src/seo/landingPagesConfig.js silently fell out of the
// live sitemap while package/agent URLs kept getting added by hand. This
// builds fresh on every request (cached briefly) from:
//   1. FIXED_ROUTES        — small static list
//   2. LANDING_PAGES        — imported live from landingPagesConfig.js
//   3. Active packages      — from Supabase "packages" table
//   4. Verified agents      — from Supabase "profiles" table
//      (role = 'agent' AND approved = true AND verification_status = 'approved')
//      There is no separate "agents" table — agents are rows in "profiles".
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';
import { LANDING_PAGES } from '../src/seo/landingPagesConfig.js';

const SITE_ORIGIN = 'https://www.umrahmarket.net';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // service role — this runs server-side only
);

const FIXED_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/agents', changefreq: 'daily', priority: '0.9' },
  { path: '/guidance', changefreq: 'monthly', priority: '0.7' },
  { path: '/experiences', changefreq: 'monthly', priority: '0.6' },
  { path: '/verified', changefreq: 'monthly', priority: '0.6' },
];

// Simple in-memory cache. Serverless functions can cold-start and lose
// this between invocations, which is fine — worst case is an extra
// Supabase query on a cold start, not a stale sitemap.
let cache = { xml: null, expiresAt: 0 };
const CACHE_TTL_MS = 15 * 60 * 1000;

function slugify(name) {
  return String(name || 'package')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function urlEntry(loc, changefreq, priority, lastmod) {
  return `  <url>
    <loc>${loc}</loc>
${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

async function buildSitemapXml() {
  const entries = [];

  // 1. Fixed static routes
  for (const r of FIXED_ROUTES) {
    entries.push(urlEntry(`${SITE_ORIGIN}${r.path}`, r.changefreq, r.priority));
  }

  // 2. Programmatic landing pages — reads landingPagesConfig.js live, so a
  //    newly added landing page shows up here on the next request with no
  //    extra step.
  for (const entry of LANDING_PAGES) {
    entries.push(urlEntry(`${SITE_ORIGIN}${entry.path}`, 'weekly', '0.8'));
  }

  // 3. Live active packages
  const { data: packages, error: pkgError } = await supabase
    .from('packages')
    .select('id, name, status, updated_at')
    .eq('status', 'Active'); // exact casing as stored in the DB

  if (pkgError) {
    console.error('[sitemap] failed to fetch packages:', pkgError.message);
  } else {
    for (const pkg of packages || []) {
      const slug = slugify(pkg.name);
      const lastmod = pkg.updated_at ? new Date(pkg.updated_at).toISOString().slice(0, 10) : null;
      entries.push(
        urlEntry(`${SITE_ORIGIN}/umra-package/${slug}/${pkg.id}`, 'weekly', '0.8', lastmod),
      );
    }
  }

  // 4. Verified agents — these are "profiles" rows with role='agent',
  //    not a separate agents table.
  const { data: agents, error: agentError } = await supabase
    .from('profiles')
    .select('id, updated_at, role, approved, verification_status')
    .eq('role', 'agent')
    .eq('approved', true)
    .eq('verification_status', 'approved');

  if (agentError) {
    console.error('[sitemap] failed to fetch agent profiles:', agentError.message);
  } else {
    for (const agent of agents || []) {
      const lastmod = agent.updated_at ? new Date(agent.updated_at).toISOString().slice(0, 10) : null;
      entries.push(urlEntry(`${SITE_ORIGIN}/agents/${agent.id}`, 'weekly', '0.7', lastmod));
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  Dynamic sitemap for umrahmarket.net, served via Vercel serverless
  function (api/sitemap.js) through the existing /sitemap.xml -> /api/sitemap
  rewrite in vercel.json. Built live on each request (cached
  ${CACHE_TTL_MS / 60000} min) from fixed routes, landingPagesConfig.js,
  active Supabase packages, and verified agent profiles.
  Do not reintroduce a committed static sitemap.xml file — that's what
  caused the 7 landing pages to silently disappear from the live sitemap
  before.
-->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;
}

export default async function handler(req, res) {
  try {
    const now = Date.now();
    if (!cache.xml || cache.expiresAt < now) {
      cache.xml = await buildSitemapXml();
      cache.expiresAt = now + CACHE_TTL_MS;
    }
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(cache.xml);
  } catch (err) {
    console.error('[sitemap] fatal error building sitemap:', err);
    res.status(500).send('Error generating sitemap');
  }
}