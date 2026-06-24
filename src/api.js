/**
 * API Service Layer
 * - Auto-refreshes access token on 401 (token expired)
 * - Queues concurrent requests during refresh (no duplicate refresh calls)
 * - Forces logout + redirects to / if refresh token is also expired
 */
import axios from 'axios';
import { supabase } from './config/supabaseClient';

const _apiBase = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || 'http://localhost:5000';
const BASE_API = _apiBase.endsWith('/api') ? _apiBase : `${_apiBase}/api`;


// ─── Token & user stores ───────────────────────────────────────────────────────
let _accessToken = localStorage.getItem('access_token') || null;

export const tokenStore = {
  get: () => _accessToken,
  set: (token) => {
    _accessToken = token;
    if (token) localStorage.setItem('access_token', token);
    else localStorage.removeItem('access_token');
  },
  clear: () => {
    _accessToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
};

export const userStore = {
  get: () => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  },
  set: (user) => localStorage.setItem('user', JSON.stringify(user)),
  clear: () => localStorage.removeItem('user'),
};

// ─── Session expiry handler ────────────────────────────────────────────────────
// Called when refresh token is also expired — clears state, shows banner, and
// fires a 'session:expired' event that App.jsx can catch to open the auth modal.
const handleSessionExpired = () => {
  tokenStore.clear();
  userStore.clear();

  const banner = document.createElement('div');
  banner.style.cssText = `
    position:fixed;top:0;left:0;right:0;z-index:9999;
    background:#dc2626;color:#fff;text-align:center;
    padding:14px;font-size:14px;font-weight:600;
    box-shadow:0 2px 12px rgba(0,0,0,0.2);
  `;
  banner.textContent = 'Your session has expired. Please sign in again\u2026';
  document.body.appendChild(banner);

  // Let App.jsx know so it can clear currentUser and open the auth modal
  window.dispatchEvent(new CustomEvent('session:expired'));

  setTimeout(() => {
    banner.remove();
    window.location.href = '/';
  }, 2500);
};

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_API,
  withCredentials: true,
});

// ── Request interceptor: attach bearer token and manage headers ─────────────
api.interceptors.request.use((cfg) => {
  const t = tokenStore.get();
  const headers = { ...(cfg.headers || {}) };

  if (t) headers.Authorization = `Bearer ${t}`;

  if (cfg.data instanceof FormData) {
    // Let Axios set the multipart boundary header.
    delete headers['Content-Type'];
    delete headers['content-type'];
    if (headers.common) {
      delete headers.common['Content-Type'];
      delete headers.common['content-type'];
    }
  } else if (cfg.data != null && typeof cfg.data === 'object') {
    headers['Content-Type'] = 'application/json';
  }

  cfg.headers = headers;
  if (import.meta.env.DEV) console.debug('[API]', cfg.method?.toUpperCase(), cfg.url, cfg.headers);
  return cfg;
});

// ── Response interceptor: auto-refresh on 401 ────────────────────────────────
let _isRefreshing = false;
let _refreshQueue = [];

const processQueue = (error, token = null) => {
  _refreshQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  _refreshQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalReq = err.config;
    const is401       = err?.response?.status === 401;
    const isRetry     = originalReq._retry;
    const isRefresh   = originalReq.url?.includes('/auth/refresh');
    const isLogin     = originalReq.url?.includes('/auth/login');

    if (!is401 || isRetry || isRefresh || isLogin) return Promise.reject(err);

    if (_isRefreshing) {
      return new Promise((resolve, reject) => {
        _refreshQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalReq.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalReq);
      });
    }

    originalReq._retry = true;
    _isRefreshing      = true;

    try {
      // Support both standard and superadmin refresh token keys
      const storedRefreshToken = localStorage.getItem('refresh_token') || localStorage.getItem('superadmin_refresh_token');
      if (!storedRefreshToken) throw new Error('No refresh token available');

      const res = await axios.post(
        `${BASE_API}/auth/refresh`,
        { refreshToken: storedRefreshToken },
        { withCredentials: true }
      );

      const newAccessToken = res?.data?.data?.accessToken;
      if (!newAccessToken) throw new Error('Refresh returned no access token');

      tokenStore.set(newAccessToken);
      processQueue(null, newAccessToken);

      originalReq.headers['Authorization'] = `Bearer ${newAccessToken}`;
      return api(originalReq);

    } catch (refreshErr) {
      processQueue(refreshErr, null);
      handleSessionExpired();
      return Promise.reject(refreshErr);
    } finally {
      _isRefreshing = false;
    }
  }
);

// ─── Centralised request wrapper ──────────────────────────────────────────────
export const request = async (config) => {
  try {
    return await api.request(config);
  } catch (err) {
    const serverMsg =
      err?.response?.data?.message ||
      err?.response?.data?.error   ||
      err?.message                 ||
      'Request failed';
    const e = new Error(serverMsg);
    e.response = err.response;
    e.status   = err.response?.status;
    e.data     = err.response?.data;
    e.config   = err.config;
    e.original = err;
    throw e;
  }
};

// ─── Auth endpoints ────────────────────────────────────────────────────────────
export const registerClient = (formData) =>
  request({
    method: 'post',
    url: '/auth/register/client',
    data: {
      email:     formData.email,
      password:  formData.password,
      firstName: formData.firstName,
      lastName:  formData.lastName,
      phone:     formData.phone || undefined,
    },
  });

export const registerAgent = async (data) => {
  const res = await request({ method: 'post', url: '/auth/register/agent', data });
  if (import.meta.env.DEV) console.debug('[registerAgent] accessToken:', res?.data?.accessToken ?? 'NOT IN RESPONSE');
  if (res?.data?.accessToken)  tokenStore.set(res.data.accessToken);
  if (res?.data?.data?.user)   userStore.set(res.data.data.user);
  return res;
};

export const login = async (formData) => {
  const res = await request({
    method: 'post',
    url: '/auth/login',
    data: { email: formData.email, password: formData.password },
  });
  if (res?.data?.data?.accessToken) {
    tokenStore.set(res.data.data.accessToken);
    await supabase.auth.setSession({
      access_token:  res.data.data.accessToken,
      refresh_token: res.data.data.refreshToken || '',
    });
  }
  if (res?.data?.data?.refreshToken) localStorage.setItem('refresh_token', res.data.data.refreshToken);
  if (res?.data?.data?.user) userStore.set(res.data.data.user);
  return res;
};

export const googleLogin = async (idToken) => {
  const res = await request({ method: 'post', url: '/auth/google', data: { idToken } });
  if (res?.data?.data?.accessToken) {
    tokenStore.set(res.data.data.accessToken);
    await supabase.auth.setSession({
      access_token:  res.data.data.accessToken,
      refresh_token: res.data.data.refreshToken || '',
    });
  }
  if (res?.data?.data?.refreshToken) localStorage.setItem('refresh_token', res.data.data.refreshToken);
  if (res?.data?.data?.user) userStore.set(res.data.data.user);
  return res;
};

export const logout = async () => {
  try { await request({ method: 'post', url: '/auth/logout' }); } finally {
    tokenStore.clear();
    userStore.clear();
  }
};

export const refreshToken = async () => {
  const storedRefreshToken = localStorage.getItem('refresh_token') || localStorage.getItem('superadmin_refresh_token');
  const res = await request({
    method: 'post',
    url: '/auth/refresh',
    data: { refreshToken: storedRefreshToken },
  });
  if (res?.data?.data?.accessToken) tokenStore.set(res.data.data.accessToken);
  return res;
};

export const getMe = () => request({ method: 'get', url: '/auth/me' });

export const requestPasswordReset = (email) =>
  request({ method: 'post', url: '/auth/password-reset/request', data: { email } });

// ─── Uploads ──────────────────────────────────────────────────────────────────
// NOTE: DocumentsTab.jsx previously called these endpoints with raw fetch()
// + credentials:'include' (cookie auth), but this backend authenticates via
// Bearer token (see the request-interceptor above) — cookies alone produced
// "Access token required" 401s on every call. Routing through request()
// fixes that automatically, since the interceptor attaches
// `Authorization: Bearer ${tokenStore.get()}` to every request made through it.

// GET /api/documents — existing doc metadata for the current agent.
// agentId is optional; the backend can also derive it from the auth token.
export const getAgentDocuments = (agentId) =>
  request({
    method: 'get',
    url: '/documents',
    params: agentId ? { agentId } : undefined,
  }).then((r) => r.data);

// POST /api/documents — uploads ONE document type per call (matches
// DocumentsTab's per-card upload flow). `file` is a single File for most
// types; for 'office_photo' pass an array of Files (multiple allowed).
export const uploadAgentDocument = (key, file, agentId) => {
  const form = new FormData();
  if (agentId) form.append('agentId', agentId);
  if (key === 'office_photo') {
    const files = Array.isArray(file) ? file : [file];
    files.forEach(f => form.append(key, f));
  } else {
    form.append(key, file);
  }
  return request({ method: 'post', url: '/documents', data: form }).then((r) => r.data);
};

// PATCH /api/documents/office-location — saves the agency's Google Maps
// link alongside the office photo.
export const saveOfficeMapsUrl = (mapsUrl) =>
  request({
    method: 'patch',
    url: '/documents/office-location',
    data: { mapsUrl },
  }).then((r) => r.data);

export const uploadAgentDocuments = (files, agentId) => {
  const form = new FormData();
  if (files.incorporation) form.append('incorporation', files.incorporation);
  if (files.tourism)       form.append('tourism',       files.tourism);
  if (files.krapin)        form.append('krapin',        files.krapin);
  if (files.directorId)    form.append('director_id',   files.directorId);
  // office_photo supports multiple files — append each under the same field
  // name so the backend's multer config (expecting an array) picks them all up.
  if (files.officePhotos) {
    const photos = Array.isArray(files.officePhotos) ? files.officePhotos : [files.officePhotos];
    photos.forEach(photo => form.append('office_photo', photo));
  }
  if (agentId)             form.append('agentId',       agentId);
  return request({
    method: 'post',
    url: '/documents',
    data: form,
  });
};

// ─── Passport verification ──────────────────────────────────────────────────
// Step 1: validate typed details + 6-month rule (no image, server-authoritative)
export const checkPassport = ({ packageId, passportExpiry }) =>
  request({
    method: 'post',
    url: '/passport/check',
    data: { packageId, passportExpiry },
  }).then((r) => r.data);

// Step 2: OCR the photo and confirm it matches the typed details.
// `details` = { packageId, passportNumber, passportCountry, passportExpiry,
//               surname, givenNames, dateOfBirth, nationality }
// `file` = a File/Blob of the passport photo.
export const verifyPassportImage = (details, file) => {
  const form = new FormData();
  Object.entries(details).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') form.append(k, v);
  });
  form.append('passport', file, file.name || 'passport.jpg');
  return request({
    method: 'post',
    url: '/passport/verify-image',
    data: form,
  }).then((r) => r.data);
};

// Latest verification status for a (user, package).
export const getPassportStatus = (packageId) =>
  request({
    method: 'get',
    url: '/passport/status',
    params: { packageId },
  }).then((r) => r.data);

// ─── Agent document verification (per-item, agent-facing) ───────────────────
// Drives the AgentDashboard "you're not verified yet" gate. Tells the
// frontend exactly which of the 5 document types are uploaded vs missing,
// and the individual approve/pending/rejected status of each — not just one
// flat bundle status.
export const getAgentVerificationStatus = () =>
  request({ method: 'get', url: '/agent-documents/status' }).then((r) => r.data);

// "Fast-track" button: only valid once all required documents are uploaded.
// Does not re-upload anything — just flags the bundle for priority review.
export const requestDocumentReview = () =>
  request({ method: 'post', url: '/agent-documents/request-review' }).then((r) => r.data);

export default {
  registerClient, registerAgent, login, googleLogin,
  logout, refreshToken, getMe, requestPasswordReset,
  uploadAgentDocuments, getAgentDocuments, uploadAgentDocument, saveOfficeMapsUrl,
  tokenStore, userStore,
  checkPassport, verifyPassportImage, getPassportStatus,
  getAgentVerificationStatus, requestDocumentReview,
};