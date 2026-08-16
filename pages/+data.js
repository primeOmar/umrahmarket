// Runs server-side only (Vike's default for +data.js). Deliberately does NOT
// import anything from api.js / packagesApi.js — api.js reads
// localStorage.getItem('access_token') at module top-level, which throws
// immediately in Node (no localStorage there). Kept as a plain, dependency-free
// fetch() instead, hitting the same public endpoints packagesApi.js / AgentsPage
// / AgentDetailPage already use client-side.
//
// landingPagesConfig.js is safe to import here too — it's a pure, dependency-
// free module with no browser globals, same constraint this file itself
// follows.
import { getLandingPageByPath, filterPackagesForLandingPage } from '../src/seo/landingPagesConfig.js';

const formatDistanceMeters = (value, label = 'Haram') => {
  const meters = Number(value);
  if (!Number.isFinite(meters) || meters <= 0) return '';
  return `${meters.toLocaleString()}m from ${label}`;
};

const _apiBase = process.env.VITE_API_BASE || process.env.VITE_API_URL || 'http://localhost:5000';
const BASE_API = _apiBase.endsWith('/api') ? _apiBase : `${_apiBase}/api`;

const getPathPackageId = (pathname = '') => {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'umra-package' && parts[2]) return parts[2];
  if (parts[0] === 'package' && parts[1]) return parts[1];
  return null;
};

// '/agents/:id' — but NOT '/agents' itself (list route, no id segment).
const getPathAgentId = (pathname = '') => {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'agents' && parts[1]) return parts[1];
  return null;
};

const isAgentsListPath = (pathname = '') => {
  const parts = pathname.split('/').filter(Boolean);
  return parts.length === 1 && parts[0] === 'agents';
};

const isBlogListPath = (pathname = '') => {
  const parts = pathname.split('/').filter(Boolean);
  return parts.length === 1 && parts[0] === 'blog';
};

// '/blog/:slug' — but NOT '/blog' itself (list route, no slug segment).
const getBlogSlug = (pathname = '') => {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'blog' && parts[1]) return parts[1];
  return null;
};

// Verbatim copy of packagesApi.js's normalise() — duplicated on purpose so
// this file never has to import that module (see note above). If you change
// normalise() in packagesApi.js, mirror the change here too.
const normalise = (pkg) => {
  const imageUrls = Array.isArray(pkg.image_urls) && pkg.image_urls.length
    ? pkg.image_urls
    : Array.isArray(pkg.images) && pkg.images.length
      ? pkg.images
      : null;

  const coverImage = (imageUrls?.[0])
    || pkg.image
    || 'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?auto=format&fit=crop&w=800&q=80';

  return {
    ...pkg,
    title: pkg.name || pkg.title || 'Umrah Package',
    originalPrice: Number(pkg.original_price ?? pkg.price ?? 0),
    hotelRating: pkg.makkah_hotel_rating ? `${pkg.makkah_hotel_rating}★` : '',
    distance: formatDistanceMeters(pkg.makkah_hotel_distance, 'Haram') || pkg.distance || '',
    image:  coverImage,
    images: imageUrls ?? [coverImage],
    price: Number(pkg.price ?? 0),
    priceTiers: {
      adult:       Number(pkg.price_tiers?.adult       ?? pkg.price ?? 0),
      child:       Number(pkg.price_tiers?.child       ?? pkg.price ?? 0),
      minor_child: Number(pkg.price_tiers?.minor_child ?? pkg.price ?? 0),
      infant:      Number(pkg.price_tiers?.infant      ?? pkg.price ?? 0),
    },
    duration: Number(pkg.duration ?? 7),
    discount: Number(pkg.discount ?? 0),
    rating: Number(pkg.makkah_hotel_rating ?? pkg.rating ?? 4.5),
    includes:   Array.isArray(pkg.inclusions)  ? pkg.inclusions  : Array.isArray(pkg.includes)  ? pkg.includes  : [],
    excludes:   Array.isArray(pkg.exclusions)  ? pkg.exclusions  : Array.isArray(pkg.excludes)  ? pkg.excludes  : [],
    highlights: Array.isArray(pkg.highlights)  ? pkg.highlights  : [],
    location: pkg.location || pkg.destination || 'Makkah & Madinah',
    type: pkg.type || (pkg.is_hajj ? 'hajj' : 'umrah'),
    agent_name: pkg.agent_name || pkg.agency_name || pkg.agency || null,
    agency_name: pkg.agency_name || pkg.agency || null,
  };
};

// Every return path always includes all keys (packages, package, agents,
// agent, landingPage, blogPosts, blogPost) — even when a branch only cares
// about one of them — so consumers (+Page.jsx → App.jsx) never have to guess
// which keys exist on a given page.
const EMPTY = { packages: null, package: null, agents: null, agent: null, landingPage: null, blogPosts: null, blogPost: null };

export default async function data(pageContext) {
  const pathname = pageContext.urlPathname || '/';
  const packageId = getPathPackageId(pathname);
  const agentId = getPathAgentId(pathname);

  // ── Package detail pages ──────────────────────────────────────────────
  // (unchanged from before — still the only branch that also seeds
  // `packages` as a single-item array, since PackageDetailPage.jsx reads
  // from the shared `packages` list rather than a dedicated prop.)
  if (packageId) {
    try {
      const res = await fetch(`${BASE_API}/packages/${packageId}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Package fetch failed: ${res.status}`);
      const json = await res.json();
      const raw = json?.package || json?.data?.package || json?.data || json;
      const pkg = normalise(raw);
      return { ...EMPTY, packages: [pkg], package: pkg };
    } catch (err) {
      console.error('[+data.js] SSR package fetch failed:', err.message);
      return EMPTY;
    }
  }

  // ── Agent detail page ─────────────────────────────────────────────────
  if (agentId) {
    try {
      const res = await fetch(`${BASE_API}/agents/${agentId}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Agent fetch failed: ${res.status}`);
      const json = await res.json();
      const agent = json?.agent || json?.data?.agent || json?.data || json;
      return { ...EMPTY, agent };
    } catch (err) {
      // Fail soft — AgentDetailPage.jsx's own useEffect fetch takes over
      // exactly as it does today when no SSR data is present.
      console.error('[+data.js] SSR agent fetch failed, falling back to client fetch:', err.message);
      return EMPTY;
    }
  }

  // ── Agents list page ──────────────────────────────────────────────────
  if (isAgentsListPath(pathname)) {
    try {
      const res = await fetch(`${BASE_API}/agents`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Agents fetch failed: ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.agents ?? json.data ?? []);
      return { ...EMPTY, agents: list };
    } catch (err) {
      console.error('[+data.js] SSR agents fetch failed, falling back to client fetch:', err.message);
      return EMPTY;
    }
  }

  // ── Blog post detail ──────────────────────────────────────────────────
  const blogSlug = getBlogSlug(pathname);
  if (blogSlug) {
    try {
      const res = await fetch(`${BASE_API}/blog/${blogSlug}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Blog post fetch failed: ${res.status}`);
      const json = await res.json();
      const post = json?.data || json?.post || json;
      return { ...EMPTY, blogPost: post };
    } catch (err) {
      // Fail soft — BlogPostPage.jsx's own client fetch takes over exactly
      // as it does today when no SSR data is present.
      console.error('[+data.js] SSR blog post fetch failed, falling back to client fetch:', err.message);
      return EMPTY;
    }
  }

  // ── Blog index ───────────────────────────────────────────────────────
  if (isBlogListPath(pathname)) {
    try {
      const res = await fetch(`${BASE_API}/blog`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Blog posts fetch failed: ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.data ?? json.posts ?? []);
      return { ...EMPTY, blogPosts: list };
    } catch (err) {
      console.error('[+data.js] SSR blog list fetch failed, falling back to client fetch:', err.message);
      return EMPTY;
    }
  }

  // ── Programmatic SEO landing pages ────────────────────────────────────
  // Checked before the agents/homepage branches below. Reuses the exact
  // same /packages/all-active endpoint the homepage already fetches from,
  // then filters server-side using the matching landingPagesConfig entry —
  // so the crawler's very first response already has the real, filtered
  // package list in the HTML, not an empty shell that fills in after
  // hydration.
  const landingPage = getLandingPageByPath(pathname);
  if (landingPage) {
    try {
      const res = await fetch(`${BASE_API}/packages/all-active`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Packages fetch failed: ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.packages ?? json.data ?? []);
      const normalised = list.map(normalise);
      const filtered = filterPackagesForLandingPage(landingPage, normalised);
      return { ...EMPTY, packages: filtered, landingPage: landingPage.path };
    } catch (err) {
      console.error('[+data.js] SSR landing-page fetch failed, falling back to client fetch:', err.message);
      // Still flag which landing page this is even on fetch failure, so
      // +Head.jsx / LandingPage.jsx render the right title/copy instead of
      // silently falling through to a generic 404.
      return { ...EMPTY, landingPage: landingPage.path };
    }
  }

  // ── Homepage ───────────────────────────────────────────────────────────
  if (pathname !== '/') {
    return EMPTY;
  }

  try {
    const res = await fetch(`${BASE_API}/packages/all-active`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Packages fetch failed: ${res.status}`);
    const json = await res.json();
    const list = Array.isArray(json) ? json : (json.packages ?? json.data ?? []);
    if (list.length === 0) {
      // A 200 response that resolves to zero packages is ambiguous: it
      // could be a genuinely empty result set, or the backend responding
      // with a shape this parser doesn't recognize (e.g. { data: { packages
      // : [...] } } instead of { packages: [...] }), silently swallowed by
      // the `?? []` fallback above. Logging the raw shape here turns that
      // silent failure into something visible in server logs instead of
      // just showing up as "no packages" on the live site with no clue why.
      console.error('[+data.js] Homepage SSR fetch returned ZERO packages. Raw response keys:', Object.keys(json || {}), 'isArray:', Array.isArray(json), 'sample:', JSON.stringify(json).slice(0, 500));
    }
    return { ...EMPTY, packages: list.map(normalise) };
  } catch (err) {
    // Fail soft: if the Render backend is slow/down during a crawler's
    // request, fall back to null so App.jsx just does its normal
    // client-side fetch instead of failing the whole page render.
    console.error('[+data.js] SSR package fetch failed, falling back to client fetch:', err.message);
    return EMPTY;
  }
}