// services/packagesApi.js
const BASE_URL = import.meta.env.VITE_API_URL;

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

  // Token expired — refresh once and retry
  if (res.status === 401 && _retry) {
    let body = {};
    try { body = await res.clone().json(); } catch { /* ignore */ }

    if (body.code === 'TOKEN_EXPIRED') {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return apiFetch(path, { headers, ...options }, false);
      }
    }

    // Hard 401 — clear stale token
    clearAccessToken();
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
  const res = await apiFetch('/api/packages/all-active');
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