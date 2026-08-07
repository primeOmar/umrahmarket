

const API_BASE  = (process.env.API_BASE || 'https://api.umrahmarket.net').replace(/\/$/, '');
const SITE_URL  = 'https://www.umrahmarket.net';
const FALLBACK_IMAGE = `${SITE_URL}/og-default.jpg`;

// Minimal last-resort shell — only used if even the live-homepage fetch below
// fails (e.g. transient network blip). Real visitors following this link
// still land on a working page: the root div + real bundle script tags from
// the homepage fetch are what normally provide that, this is just a safety
// net so the function never hard-500s.
const EMERGENCY_SHELL = '<!doctype html><html><head></head><body><div id="root"></div></body></html>';

function toSlug(value = '') {
  const text = String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return text || 'umrah-package';
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Mirrors the shape produced by src/.../services/packagesApi.js normalise(),
// applied to the RAW package object returned by GET /api/packages/:id
function buildMeta(pkg, id) {
  const title = pkg.name || pkg.title || 'Umrah Package';
  const slug = toSlug(title);

  const price = pkg.price ? `$${Number(pkg.price).toLocaleString('en-US')}` : '';
  const distance = pkg.makkah_hotel_distance
    ? `${Number(pkg.makkah_hotel_distance).toLocaleString()}m from Haram`
    : (pkg.distance || '');
  const hotelStars = pkg.makkah_hotel_rating ? `${pkg.makkah_hotel_rating}★ Hotel` : '';
  const agent = pkg.agent_name || pkg.agency_name || pkg.agency || null;

  const metaBits = [
    pkg.duration ? `${pkg.duration}d` : null,
    distance || null,
    hotelStars || null,
  ].filter(Boolean).join(' · ');

  const description = [
    metaBits,
    agent ? `by ${agent}` : null,
    pkg.description || null,
  ].filter(Boolean).join(' · ').slice(0, 200);

  const imageUrls = Array.isArray(pkg.image_urls) && pkg.image_urls.length
    ? pkg.image_urls
    : Array.isArray(pkg.images) && pkg.images.length
      ? pkg.images
      : null;
  const image = imageUrls?.[0] || pkg.image || FALLBACK_IMAGE;

  return {
    title: price ? `${title} — from ${price}/person` : title,
    description: description || 'Compare verified Umrah and Hajj packages from trusted travel agents.',
    image,
    url: `${SITE_URL}/umra-package/${slug}/${id}`,
  };
}

export default async function handler(req, res) {
  const id = req.query.id
    || req.url.split('/package/')[1]?.split(/[?#]/)[0]
    || req.url.split('/umra-package/')[1]?.split('/')[1]?.split(/[?#]/)[0];

  let html;
  try {
    // Fetch '/' itself rather than any path under /package or /umra-package —
    // those are the ones vercel.json rewrites to THIS function, so fetching
    // them here would just call this same function again (infinite loop).
    // '/' is never rewritten, so it always reaches the real Vike-rendered
    // shell — correct script/asset tags, whatever the current build produced.
    const shellRes = await fetch(`${SITE_URL}/`, { headers: { Accept: 'text/html' } });
    if (!shellRes.ok) throw new Error(`Shell fetch failed: ${shellRes.status}`);
    html = await shellRes.text();
  } catch (err) {
    html = EMERGENCY_SHELL;
  }

  let meta = {
    title: 'UmrahMarket — Verified Umrah & Hajj Packages',
    description: 'Compare verified Umrah and Hajj packages from trusted travel agents.',
    image: FALLBACK_IMAGE,
    url: `${SITE_URL}${id ? `/umra-package/umrah-package/${id}` : ''}`,
  };

  if (id) {
    try {
      const r = await fetch(`${API_BASE}/api/packages/${id}`, {
        headers: { Accept: 'application/json' },
      });

      if (!r.ok) {
        // Log the exact reason — check Vercel → Deployments → Functions → Logs
        const bodyText = await r.text().catch(() => '');
        
      } else {
        const data = await r.json();
        // Try every response shape we've seen: {package}, {data:{package}}, or bare object
        const pkg = data?.package || data?.data?.package || data?.data || data;
        if (pkg && (pkg.name || pkg.title)) {
          meta = buildMeta(pkg, id);
        } else {
          
        }
      }
    } catch (err) {
      
      // Fall through to generic defaults — the link still works and opens
      // the app correctly, it just won't have a custom preview this time.
    }
  } else {
    
  }

  const metaTags = `
    <title>${escapeHtml(meta.title)}</title>
    <meta name="description" content="${escapeHtml(meta.description)}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="UmrahMarket" />
    <meta property="og:title" content="${escapeHtml(meta.title)}" />
    <meta property="og:description" content="${escapeHtml(meta.description)}" />
    <meta property="og:image" content="${escapeHtml(meta.image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${escapeHtml(meta.url)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
    <meta name="twitter:description" content="${escapeHtml(meta.description)}" />
    <meta name="twitter:image" content="${escapeHtml(meta.image)}" />
  `;

  html = html
    .replace(/<title>.*?<\/title>/i, '')
    .replace(/<meta\s+name=["']description["'][^>]*>/i, '')
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '')
    .replace('</head>', `${metaTags}\n</head>`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Cache at the CDN edge for 10 min, serve stale for up to an hour while revalidating —
  // keeps crawler + first-load latency low without hammering your Render backend.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600');
  res.status(200).send(html);
}