// services/packagesApi.js
// Match api.js: prefer VITE_API_BASE, fall back to VITE_API_URL.
// If neither is set BASE_URL is undefined and every fetch will silently fail.
const BASE_URL = (import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || 'http://localhost:5000')
  .replace(/\/api$/, ''); // strip trailing /api — we add it explicitly in each path

// ─────────────────────────────────────────────
// TOKEN HELPERS — key matches api.js tokenStore
// ─────────────────────────────────────────────

const getAccessToken = () => localStorage.getItem('access_token');
const setAccessToken = (token) => localStorage.setItem('access_token', token);
const clearAccessToken = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
};

/**
 * Silently refresh the access token using the refresh token cookie.
 * Mirrors the /api/auth/refresh call in api.js
 */
const refreshAccessToken = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = await res.json();
    const newToken = data.data?.accessToken || data.accessToken;
    if (newToken) {
      setAccessToken(newToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

// ─────────────────────────────────────────────
// CORE FETCH WRAPPER
// ─────────────────────────────────────────────

const apiFetch = async (path, { headers = {}, ...options } = {}, _retry = true) => {
  const token = getAccessToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  // Only attempt refresh when:
  //   1. We had a token to begin with (guests never refresh)
  //   2. This is the first attempt
  //   3. Server explicitly signals token is expired
  if (res.status === 401 && _retry && token) {
    let body = {};
    try { body = await res.clone().json(); } catch { /* ignore */ }

    if (body.code === 'TOKEN_EXPIRED') {
      const refreshed = await refreshAccessToken();
      if (refreshed) return apiFetch(path, { headers, ...options }, false);
      // Refresh truly failed — token is dead
      clearAccessToken();
    }
    // Any other 401 (wrong role, bad perms) — don't clear token
  }

  return res;
};
// ─────────────────────────────────────────────
// RESPONSE HANDLER
// ─────────────────────────────────────────────

const handleResponse = async (res) => {
  if (!res.ok) {
    let err = {};
    try { err = await res.json(); } catch { /* ignore */ }
    const message = err.message || err.error || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    error.data = err;
    throw error;
  }
  return res.json();
};

// ─────────────────────────────────────────────
// FORM DATA BUILDER
// ─────────────────────────────────────────────

const PACKAGE_SCALARS = [
  'name', 'type', 'location', 'description',
  'price', 'original_price', 'discount', 'duration',
  'available_from', 'available_to', 'max_group_size', 'min_group_size',
  'makkah_hotel_name', 'makkah_hotel_rating', 'makkah_hotel_distance',
  'makkah_hotel_address', 'makkah_check_in_date', 'makkah_check_out_date',
  'madinah_hotel_name', 'madinah_hotel_rating', 'madinah_hotel_distance',
  'madinah_hotel_address', 'madinah_check_in_date', 'madinah_check_out_date',
];

const buildFormData = (formData, imageFiles = []) => {
  const body = new FormData();
  PACKAGE_SCALARS.forEach((k) => {
    if (formData[k] != null && formData[k] !== '') body.append(k, formData[k]);
  });
  body.append('highlights', JSON.stringify(formData.highlights ?? []));
  body.append('inclusions',  JSON.stringify(formData.inclusions  ?? []));
  body.append('exclusions',  JSON.stringify(formData.exclusions  ?? []));
  imageFiles.forEach((file) => body.append('images', file));
  return body;
};

// ─────────────────────────────────────────────
// API METHODS
// ─────────────────────────────────────────────

export const getAllActivePackages = async () => {
  // Public route — bypass auth wrapper when there's no token so a
  // guest user never triggers the refresh flow or gets a 401.
  const token = getAccessToken();
  const res = token
    ? await apiFetch('/api/packages/all-active')
    : await fetch(`${BASE_URL}/api/packages/all-active`, { credentials: 'include' });
  return handleResponse(res);
};
export const getAgentPackages = async () => {
  const res = await apiFetch('/api/packages/getagentpackages');
  return handleResponse(res);
};

export const createPackage = async (formData, imageFiles = []) => {
  const body = buildFormData(formData, imageFiles);
  const res  = await apiFetch('/api/packages/create-packages', {
    method: 'POST',
    body,
  });
  return handleResponse(res);
};

export const getPackageById = async (id) => {
  const res = await apiFetch(`/api/packages/${id}`);
  return handleResponse(res);
};

export const updatePackage = async (id, formData, imageFiles = []) => {
  const body = buildFormData(formData, imageFiles);
  const res  = await apiFetch(`/api/packages/${id}`, {
    method: 'PUT',
    body,
  });
  return handleResponse(res);
};

export const deletePackage = async (id) => {
  const res = await apiFetch(`/api/packages/${id}`, { method: 'DELETE' });
  return handleResponse(res);
};

export const toggleFavourite = async (packageId) => {
  const res = await apiFetch('/api/favourites/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packageId }),
  });
  return handleResponse(res);
};

export const getFavourites = async () => {
  const res = await apiFetch('/api/favourites');
  return handleResponse(res);
};

export const getItinerary = async (packageId) => {
  const res = await apiFetch(`/api/packages/${packageId}/itinerary`);
  return handleResponse(res);
};

export const saveItinerary = async (packageId, days) => {
  const res = await apiFetch(`/api/packages/${packageId}/itinerary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ days }),
  });
  return handleResponse(res);
};

export const normalise = (pkg) => {
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
    distance: pkg.makkah_hotel_distance
      ? `${Number(pkg.makkah_hotel_distance).toLocaleString()}m from Haram`
      : pkg.distance || '',
    image:  coverImage,
    images: imageUrls ?? [coverImage],   // ← always an array for the gallery
    price: Number(pkg.price ?? 0),
    duration: Number(pkg.duration ?? 7),
    discount: Number(pkg.discount ?? 0),
    rating: Number(pkg.makkah_hotel_rating ?? pkg.rating ?? 4.5),
    includes:   Array.isArray(pkg.inclusions)  ? pkg.inclusions  : Array.isArray(pkg.includes)  ? pkg.includes  : [],
    excludes:   Array.isArray(pkg.exclusions)  ? pkg.exclusions  : Array.isArray(pkg.excludes)  ? pkg.excludes  : [],
    highlights: Array.isArray(pkg.highlights)  ? pkg.highlights  : [],
    location: pkg.location || pkg.destination || 'Makkah & Madinah',
    type: pkg.type || (pkg.is_hajj ? 'hajj' : 'umrah'),
    agency_name: pkg.agency_name || pkg.agency || 'Premium Travel',
  };
};