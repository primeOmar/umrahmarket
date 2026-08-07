// Runs server-side only (Vike's default for +data.js). Deliberately does NOT
// import anything from api.js / packagesApi.js — api.js reads
// localStorage.getItem('access_token') at module top-level, which throws
// immediately in Node (no localStorage there). Kept as a plain, dependency-free
// fetch() instead, hitting the same public endpoint packagesApi.js uses.

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

export default async function data(pageContext) {
  const pathname = pageContext.urlPathname || '/';
  const packageId = getPathPackageId(pathname);

  // Detail pages get a single package SSR payload so the head tags and first
  // paint can reflect the exact package the user requested.
  if (packageId) {
    try {
      const res = await fetch(`${BASE_API}/packages/${packageId}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Package fetch failed: ${res.status}`);
      const json = await res.json();
      const raw = json?.package || json?.data?.package || json?.data || json;
      return { packages: [normalise(raw)], package: normalise(raw) };
    } catch (err) {
      console.error('[+data.js] SSR package fetch failed:', err.message);
      return { packages: null, package: null };
    }
  }

  if (pathname !== '/') {
    return { packages: null, package: null };
  }

  try {
    const res = await fetch(`${BASE_API}/packages/all-active`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Packages fetch failed: ${res.status}`);
    const json = await res.json();
    const list = Array.isArray(json) ? json : (json.packages ?? json.data ?? []);
    return { packages: list.map(normalise), package: null };
  } catch (err) {
    // Fail soft: if the Render backend is slow/down during a crawler's
    // request, fall back to null so App.jsx just does its normal
    // client-side fetch instead of failing the whole page render.
    console.error('[+data.js] SSR package fetch failed, falling back to client fetch:', err.message);
    return { packages: null, package: null };
  }
}
